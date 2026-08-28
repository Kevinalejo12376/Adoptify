"""Endpoints de pagos online (Stripe).

Flujo:
  POST /api/pagos/checkout             -> crea una Stripe Checkout Session y devuelve redirect_url
  POST /api/pagos/webhook              -> recibe y valida los webhooks de Stripe (idempotente)
  GET  /api/pagos/estado               -> consulta el estado REAL del pago (para la página de resultado)
  GET  /api/pagos/{id}                 -> detalle de un pago propio
  POST /api/pagos/connect/onboarding   -> inicia el onboarding de Stripe Connect de la tienda
  GET  /api/pagos/connect/estado       -> estado de la cuenta conectada de la tienda

El monto SIEMPRE se toma de la base de datos (pedido.total y snapshots de
pedido_items), nunca del frontend.
"""
# pyrefly: ignore [missing-import]
import json
import logging

# pyrefly: ignore [missing-import]
import stripe
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.db.database import get_db
from app.core.security import get_current_user, get_current_tienda
from app.core.lookups import id_por_codigo
from app.core.notificaciones import crear_notificacion
from app.core.config import settings
from app.core.permisos import obtener_tienda_usuario
from app.models.usuario import Usuario
from app.models.pedido import Pedido, PedidoItem, HistorialEstadoPedido
from app.models.pago import Pago
from app.models.tienda import Tienda
from app.models.catalogos import EstadoPedido
from app.schemas.pago import (
    PagoCheckoutRequest,
    PagoResponse,
    PagoEstadoResponse,
    ConnectEstadoResponse,
    ConnectOnboardingResponse,
)
from app.services import stripe_service

router = APIRouter()

# Estados del pedido que impiden iniciar un nuevo cobro.
ESTADOS_PEDIDO_FINALES = ("pagado", "preparando", "enviado", "en_camino", "entregado", "cancelado")

# Eventos de Stripe que se procesan.
EVENTO_PAGO_EXITOSO = "checkout.session.completed"
EVENTO_PAGO_FALLIDO = "payment_intent.payment_failed"
EVENTO_REEMBOLSO = "charge.refunded"


def _registrar_historial(db: Session, pedido_id: int, estado_id: int, notas: str = None):
    """Registra un cambio de estado en historial_estados_pedido (si existe)."""
    try:
        db.add(HistorialEstadoPedido(pedido_id=pedido_id, estado_id=estado_id, notas=notas))
    except Exception as exc:  # noqa: BLE001
        logger.warning("[pagos] No se pudo registrar historial del pedido %s: %s", pedido_id, exc)


def _marcar_pedido_pagado(db: Session, pago: Pago, notas: str = None):
    """Marca el pedido como 'pagado' (idempotente)."""
    pedido = db.query(Pedido).filter(Pedido.id == pago.pedido_id).first()
    if not pedido:
        return
    if pedido.estado is not None and pedido.estado.codigo == "pagado":
        return
    estado_pagado_id = id_por_codigo(db, EstadoPedido, "pagado")
    if estado_pagado_id:
        pedido.estado_id = estado_pagado_id
        _registrar_historial(db, pedido.id, estado_pagado_id, notas or "Pago confirmado por Stripe")
        if pedido.usuario_id:
            numero = f"PED-{pedido.id:05d}"
            try:
                crear_notificacion(
                    db, pedido.usuario_id, "pago_confirmado",
                    f"¡El pago de tu pedido {numero} fue confirmado!",
                    f"/mis-pedidos/{pedido.id}",
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("[pagos] No se pudo notificar pago confirmado: %s", exc)


def _tiendas_del_pedido(db: Session, pedido: Pedido):
    """Devuelve {tienda_id: {"tienda": Tienda, "subtotal_cop": int}} para las
    tiendas que venden productos en el pedido (items con producto.tienda_id).

    El subtotal COP por tienda se calcula con los snapshots de pedido_items
    (fuente de la BD, nunca del frontend). Los productos de refugios no
    generan transferencia (el dinero se queda en Adoptify).
    """
    result = {}
    items = db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido.id).all()
    for it in items:
        tienda_id = it.producto.tienda_id if it.producto else None
        if not tienda_id:
            continue
        if tienda_id not in result:
            tienda = db.query(Tienda).filter(Tienda.id == tienda_id).first()
            result[tienda_id] = {"tienda": tienda, "subtotal_cop": 0}
        result[tienda_id]["subtotal_cop"] += int(it.subtotal or 0)
    return result


def _validar_tiendas_para_cobro(db: Session, pedido: Pedido):
    """Verifica que TODAS las tiendas del pedido tengan Stripe Connect activo.

    Si una tienda aún no está configurada para recibir fondos, se rechaza el
    pago (no se permite cobrar sin destino de fondos válido).
    """
    tiendas = _tiendas_del_pedido(db, pedido)
    sin_connect = []
    for tienda_id, info in tiendas.items():
        tienda = info["tienda"]
        if not tienda or not tienda.stripe_account_id or not tienda.stripe_connect_activa:
            sin_connect.append(tienda.nombre if tienda else f"Tienda #{tienda_id}")
    if sin_connect:
        raise HTTPException(
            status_code=400,
            detail=(
                "No se puede cobrar este pedido: la(s) tienda(s) "
                f"{', '.join(sin_connect)} no está(n) configurada(s) para recibir "
                "pagos con Stripe. Pide al representante que complete el onboarding "
                "de Stripe Connect en la configuración de su tienda."
            ),
        )


def _distribuir_pago(db: Session, pago: Pago, moneda: str):
    """Distribuye el dinero a cada tienda conectada (modelo separate charges
    and transfers). Idempotente: si ya se distribuyó (stripe_transfer_ids),
    no vuelve a crear transferencias.

    Transferencia por tienda = subtotal COP de sus productos convertido a
    centavos de ``moneda`` menos la comisión de la plataforma.
    """
    if pago.stripe_transfer_ids:
        return  # ya distribuido

    pedido = db.query(Pedido).filter(Pedido.id == pago.pedido_id).first()
    if not pedido:
        return

    tasa = float(settings.STRIPE_CONVERSION_RATE or 0)
    fee_pct = float(settings.STRIPE_PLATFORM_FEE_PERCENT or 0)
    tiendas = _tiendas_del_pedido(db, pedido)

    transfer_ids = []
    detalle = []
    comision_total = 0
    monto_distribuido = 0

    for tienda_id, info in tiendas.items():
        tienda = info["tienda"]
        if not tienda or not tienda.stripe_account_id or not tienda.stripe_connect_activa:
            # No debería ocurrir (el checkout lo validó); se omite por seguridad.
            continue
        subtotal_centavos = stripe_service.cop_a_centavos(info["subtotal_cop"], tasa)
        comision_centavos = int(round(subtotal_centavos * fee_pct / 100)) if fee_pct > 0 else 0
        monto_tienda = max(1, subtotal_centavos - comision_centavos)
        try:
            transfer_id = stripe_service.crear_transferencia(
                account_id=tienda.stripe_account_id,
                monto_centavos=monto_tienda,
                moneda=moneda,
                order_id=pago.order_id,
                pedido_id=pedido.id,
                tienda_id=tienda_id,
            )
            transfer_ids.append(transfer_id)
            detalle.append({
                "tienda_id": tienda_id,
                "tienda": tienda.nombre,
                "subtotal_cop": info["subtotal_cop"],
                "subtotal_centavos": subtotal_centavos,
                "comision_centavos": comision_centavos,
                "transferido_centavos": monto_tienda,
                "transfer_id": transfer_id,
            })
            comision_total += comision_centavos
            monto_distribuido += monto_tienda
        except stripe.error.StripeError as exc:
            logger.error(
                "[pagos] No se pudo transferir a tienda %s: %s",
                tienda.nombre, getattr(exc, "user_message", None) or exc,
            )

    pago.comision_plataforma = comision_total if detalle else None
    pago.monto_distribuido = monto_distribuido if detalle else None
    pago.detalle_distribucion = json.dumps(detalle, ensure_ascii=False) if detalle else None
    pago.stripe_transfer_ids = json.dumps(transfer_ids, ensure_ascii=False) if transfer_ids else None


# ============================================================
# POST /api/pagos/checkout
# ============================================================
@router.post("/checkout", response_model=PagoResponse)
def iniciar_checkout(
    payload: PagoCheckoutRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea una Stripe Checkout Session para un pedido y devuelve la URL.

    - Valida propiedad/autorización del pedido.
    - Valida que el pedido no esté en un estado final.
    - Valida que todas las tiendas del pedido tengan Stripe Connect activo.
    - Recalcula el monto desde la BD (pedido.total y pedido_items).
    - Crea el registro de pago y la sesión en Stripe.
    """
    pedido = db.query(Pedido).filter(Pedido.id == payload.pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.usuario_id != current_user.id and current_user.rol_codigo not in ("administrador", "administrador_principal"):
        raise HTTPException(status_code=403, detail="No puedes pagar este pedido")

    estado_actual = pedido.estado.codigo if pedido.estado else None
    if estado_actual in ESTADOS_PEDIDO_FINALES:
        raise HTTPException(status_code=400, detail=f"Este pedido ya no puede pagarse (estado: {estado_actual})")

    # Monto desde la BD (nunca del frontend).
    monto_cop = int(pedido.total or 0)
    if monto_cop <= 0:
        raise HTTPException(status_code=400, detail="El pedido no tiene un monto válido para cobrar")

    # Valida que las tiendas del pedido puedan recibir fondos.
    _validar_tiendas_para_cobro(db, pedido)

    # Idempotencia: si ya existe un cobro pendiente con URL, se reutiliza.
    activo = (
        db.query(Pago)
        .filter(Pago.pedido_id == pedido.id, Pago.estado == "pendiente", Pago.proveedor == "stripe")
        .order_by(Pago.id.desc())
        .first()
    )
    if activo and activo.redirect_url:
        return activo

    order_id = f"ADOPTIFY-PEDIDO-{pedido.id}"
    moneda = settings.STRIPE_CURRENCY
    monto_centavos = stripe_service.cop_a_centavos(monto_cop)

    # Line items de la sesión a partir de los snapshots de la BD.
    items_db = db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido.id).all()
    items = []
    for it in items_db:
        items.append({
            "nombre": it.nombre_producto,
            "cantidad": it.cantidad,
            "precio_centavos": stripe_service.cop_a_centavos(int(it.precio_unitario or 0)),
        })
    items.append({"__email": current_user.email})

    try:
        session = stripe_service.crear_checkout_session(
            pedido=pedido,
            items=items,
            monto_cents=monto_centavos,
            moneda=moneda,
        )
    except stripe_service.StripeConfiguracionError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except stripe.error.StripeError as exc:
        logger.error("[pagos] Stripe rechazó el checkout: %s", getattr(exc, "user_message", None) or exc)
        raise HTTPException(
            status_code=502,
            detail=f"Stripe no pudo crear el pago: {getattr(exc, 'user_message', None) or 'intenta de nuevo'}",
        )

    pago = Pago(
        pedido_id=pedido.id,
        usuario_id=current_user.id,
        proveedor="stripe",
        order_id=order_id,
        estado="pendiente",
        estado_stripe="open",
        monto=monto_cop,
        moneda="COP",
        metodo_pago="stripe",
        redirect_url=session["url"],
        stripe_checkout_session_id=session["id"],
        stripe_payment_intent_id=session.get("payment_intent_id"),
        stripe_amount=monto_centavos,
        stripe_currency=moneda,
        respuesta_stripe=json.dumps(session, ensure_ascii=False),
    )
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return pago


# ============================================================
# POST /api/pagos/webhook
# ============================================================
@router.post("/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    """Recibe los webhooks de Stripe, valida la firma y actualiza pago/pedido.

    - Lee el body RAW y el header Stripe-Signature.
    - Verifica la firma con STRIPE_WEBHOOK_SECRET (rechaza firmas inválidas).
    - Procesa solo los eventos relevantes.
    - Es idempotente: el mismo evento reenviado no duplica ni cambia estados
      incorrectamente.
    """
    raw = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        evento = stripe_service.construir_evento(raw, sig_header)
    except stripe_service.StripeConfiguracionError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except (stripe.error.SignatureVerificationError, ValueError):
        logger.warning("[pagos] Webhook con firma inválida (Stripe-Signature=%s)", sig_header[:40])
        raise HTTPException(status_code=400, detail="Firma inválida")

    tipo = evento["type"]
    data = evento["data"]["object"]
    logger.info("[pagos] Webhook recibido tipo=%s id=%s", tipo, data.get("id"))

    if tipo == EVENTO_PAGO_EXITOSO:
        _procesar_checkout_completado(db, data)
    elif tipo == EVENTO_PAGO_FALLIDO:
        _procesar_pago_fallido(db, data)
    elif tipo == EVENTO_REEMBOLSO:
        _procesar_reembolso(db, data)
    else:
        # Eventos irrelevantes: se reconocen pero no se procesan.
        logger.info("[pagos] Evento ignorado: %s", tipo)

    return {"recibido": True}


def _procesar_checkout_completado(db: Session, session):
    """checkout.session.completed: confirma el pago, marca el pedido pagado y
    distribuye el dinero a las tiendas conectadas. Idempotente."""
    session_id = session.get("id")
    payment_intent_id = session.get("payment_intent")
    amount_total = session.get("amount_total")  # centavos
    currency = session.get("currency")
    metadata = session.get("metadata") or {}
    pedido_id = metadata.get("pedido_id")
    order_id = metadata.get("order_id")

    # Identificar el pago por session_id (o por order_id como respaldo).
    pago = None
    if session_id:
        pago = db.query(Pago).filter(Pago.stripe_checkout_session_id == session_id).first()
    if not pago and order_id:
        pago = (
            db.query(Pago)
            .filter(Pago.order_id == order_id, Pago.proveedor == "stripe")
            .order_by(Pago.id.desc())
            .first()
        )
    if not pago:
        logger.warning("[pagos] checkout.completed sin pago conocido (session=%s)", session_id)
        return

    # Idempotencia: si ya está pagado y confirmado con su PaymentIntent, no-op.
    if pago.estado == "pagado" and pago.stripe_payment_intent_id:
        return

    pago.estado = "pagado"
    pago.estado_stripe = session.get("status") or "complete"
    if payment_intent_id:
        pago.stripe_payment_intent_id = payment_intent_id
    if amount_total is not None:
        pago.stripe_amount = int(amount_total)
    if currency:
        pago.stripe_currency = currency
    pago.notificacion = json.dumps(dict(session), ensure_ascii=False, default=str)

    _marcar_pedido_pagado(db, pago, "Pago confirmado por Stripe (Checkout)")

    # Distribución del dinero a las tiendas conectadas.
    _distribuir_pago(db, pago, currency or settings.STRIPE_CURRENCY)

    db.commit()
    logger.info("[pagos] Pago %s marcado como pagado y distribuido", pago.order_id)


def _procesar_pago_fallido(db: Session, payment_intent):
    """payment_intent.payment_failed: marca el pago como fallido."""
    pi_id = payment_intent.get("id")
    pago = db.query(Pago).filter(Pago.stripe_payment_intent_id == pi_id).first()
    if not pago:
        # Respaldo: buscar por metadata pedido_id.
        metadata = payment_intent.get("metadata") or {}
        if metadata.get("pedido_id"):
            pago = (
                db.query(Pago)
                .filter(Pago.pedido_id == int(metadata["pedido_id"]), Pago.proveedor == "stripe")
                .order_by(Pago.id.desc())
                .first()
            )
    if not pago:
        return
    if pago.estado == "fallido":
        return
    pago.estado = "fallido"
    pago.estado_stripe = payment_intent.get("status") or "requires_payment_method"
    pago.notificacion = json.dumps(dict(payment_intent), ensure_ascii=False, default=str)
    db.commit()


def _procesar_reembolso(db: Session, charge):
    """charge.refunded: marca el pago como reembolsado (idempotente)."""
    pi_id = charge.get("payment_intent")
    if not pi_id:
        return
    pago = db.query(Pago).filter(Pago.stripe_payment_intent_id == pi_id).first()
    if not pago:
        return
    if pago.estado == "reembolsado":
        return
    pago.estado = "reembolsado"
    pago.estado_stripe = "refunded"
    pago.notificacion = json.dumps(dict(charge), ensure_ascii=False, default=str)
    db.commit()


# ============================================================
# GET /api/pagos/estado
# ============================================================
@router.get("/estado", response_model=PagoEstadoResponse)
def estado_pago(
    order_id: str = None,
    pago_id: int = None,
    session_id: str = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Consulta el estado real del pago (usado al volver del checkout).

    El success_url NO es fuente de verdad: aquí se consulta el estado
    persistido (que solo cambia con el webhook de Stripe) y, si el pago aún
    está pendiente, se consulta Stripe para sincronizarlo.
    """
    q = db.query(Pago).filter(Pago.proveedor == "stripe")
    if session_id:
        pago = q.filter(Pago.stripe_checkout_session_id == session_id).first()
    elif pago_id:
        pago = q.filter(Pago.id == pago_id).first()
    elif order_id:
        pago = q.filter(Pago.order_id == order_id).order_by(Pago.id.desc()).first()
    else:
        raise HTTPException(status_code=400, detail="Indica session_id, order_id o pago_id")

    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    if pago.usuario_id and pago.usuario_id != current_user.id and current_user.rol_codigo not in ("administrador", "administrador_principal"):
        raise HTTPException(status_code=403, detail="No puedes consultar este pago")

    # Sincroniza el estado real desde Stripe si la sesión ya tiene resultado.
    if pago.estado == "pendiente" and pago.stripe_checkout_session_id:
        try:
            sesion = stripe_service.obtener_checkout_session(pago.stripe_checkout_session_id)
            if sesion.get("payment_status") == "paid":
                _procesar_checkout_completado(db, sesion)
                db.refresh(pago)
            elif sesion.get("status") == "expired":
                if pago.estado not in ("pagado", "cancelado"):
                    pago.estado = "cancelado"
                    pago.estado_stripe = "expired"
                    db.commit()
                    db.refresh(pago)
        except stripe.error.StripeError as exc:
            logger.warning("[pagos] No se pudo sincronizar estado con Stripe: %s", exc)

    return pago


# ============================================================
# GET /api/pagos/{pago_id}
# ============================================================
@router.get("/{pago_id}", response_model=PagoEstadoResponse)
def detalle_pago(
    pago_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pago = db.query(Pago).filter(Pago.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    if pago.usuario_id and pago.usuario_id != current_user.id and current_user.rol_codigo not in ("administrador", "administrador_principal"):
        raise HTTPException(status_code=403, detail="No puedes ver este pago")
    return pago


# ============================================================
# Stripe Connect (onboarding de tiendas)
# ============================================================
def _mi_tienda(current_user: Usuario, db: Session) -> Tienda:
    """Tienda del usuario autenticado (super admin o admin)."""
    tu = obtener_tienda_usuario(db, current_user)
    if not tu or not tu.activo:
        raise HTTPException(status_code=403, detail="No tienes una tienda activa asociada")
    tienda = db.query(Tienda).filter(Tienda.id == tu.tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="No tienes una tienda asociada")
    return tienda


@router.post("/connect/onboarding", response_model=ConnectOnboardingResponse)
def iniciar_onboarding_connect(
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    """Inicia el onboarding de Stripe Connect para la tienda autenticada.

    Si la tienda aún no tiene cuenta conectada, se crea (tipo express) y se
    devuelve la URL de AccountLink para que el representante complete la
    información requerida en Stripe. La plataforma solo guarda el id de la
    cuenta (nunca claves del vendedor).
    """
    tienda = _mi_tienda(current_user, db)
    representante = tienda.usuario or current_user

    refresh_url = f"{settings.FRONTEND_URL}/tienda/configuracion?seccion=pagos&stripe=refresh"
    return_url = f"{settings.FRONTEND_URL}/tienda/configuracion?seccion=pagos&stripe=ok"

    try:
        if not tienda.stripe_account_id:
            cuenta = stripe_service.crear_cuenta_conectada(
                email=representante.email or "",
                nombre_tienda=tienda.nombre,
                tienda_id=tienda.id,
            )
            tienda.stripe_account_id = cuenta["id"]
            tienda.stripe_account_status = "pendiente_onboarding"
            tienda.stripe_connect_activa = False
            db.commit()
            db.refresh(tienda)

        url = stripe_service.crear_account_link(
            account_id=tienda.stripe_account_id,
            refresh_url=refresh_url,
            return_url=return_url,
        )
    except stripe_service.StripeConfiguracionError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except stripe.error.StripeError as exc:
        logger.error("[pagos] Error creando onboarding Connect: %s", exc)
        raise HTTPException(status_code=502, detail="Stripe no pudo iniciar el onboarding. Intenta de nuevo.")

    return ConnectOnboardingResponse(
        url=url,
        stripe_account_id=tienda.stripe_account_id,
        estado=tienda.stripe_account_status or "pendiente_onboarding",
    )


@router.get("/connect/estado", response_model=ConnectEstadoResponse)
def estado_connect(
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    """Consulta el estado real de la cuenta conectada de la tienda.

    Verifica en Stripe si la cuenta puede recibir fondos y actualiza la BD
    (idempotente). El pedido solo se puede pagar si la tienda está 'lista'.
    """
    tienda = _mi_tienda(current_user, db)

    if not tienda.stripe_account_id:
        return ConnectEstadoResponse(
            stripe_account_id=None,
            estado="no_configurada",
            puede_recibir_fondos=False,
            mensaje="Esta tienda aún no tiene una cuenta de Stripe Connect. Inicia el onboarding para recibir pagos.",
        )

    try:
        cuenta = stripe_service.obtener_cuenta_conectada(tienda.stripe_account_id)
        estado = stripe_service.cuenta_estado_legible(cuenta)
        puede = stripe_service.cuenta_puede_recibir_fondos(cuenta)
        tienda.stripe_account_status = estado
        tienda.stripe_connect_activa = puede
        db.commit()
    except stripe.error.StripeError as exc:
        logger.warning("[pagos] No se pudo consultar cuenta Connect %s: %s", tienda.stripe_account_id, exc)
        return ConnectEstadoResponse(
            stripe_account_id=tienda.stripe_account_id,
            estado=tienda.stripe_account_status or "pendiente_onboarding",
            puede_recibir_fondos=tienda.stripe_connect_activa,
            mensaje="No se pudo verificar el estado en Stripe en este momento.",
        )

    mensaje = (
        "¡Tu tienda puede recibir pagos con Stripe!"
        if puede
        else "El onboarding de Stripe está incompleto. Completa los datos requeridos para recibir pagos."
    )
    return ConnectEstadoResponse(
        stripe_account_id=tienda.stripe_account_id,
        estado=estado,
        puede_recibir_fondos=puede,
        mensaje=mensaje,
    )
