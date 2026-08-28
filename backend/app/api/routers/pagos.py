<<<<<<< HEAD
"""Endpoints de pagos online (dLocal, flujo REDIRECT).

Flujo:
  POST /api/pagos/checkout  -> crea un pago en dLocal (Checkout REDIRECT) y devuelve redirect_url
  POST /api/pagos/webhook   -> recibe y valida las notificaciones de dLocal (idempotente)
  GET  /api/pagos/estado    -> consulta el estado REAL del pago (dLocal + persistido)
  GET  /api/pagos/{id}      -> detalle de un pago propio

El monto SIEMPRE se toma de la base de datos (pedido.total), nunca del frontend.
La confirmación de pago proviene EXCLUSIVAMENTE de dLocal (webhook o consulta
de estado), nunca de la URL de éxito del navegador.
=======
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
>>>>>>> c445638 (Migración de dLocal a Stripe)
"""
# pyrefly: ignore [missing-import]
import json
import logging

# pyrefly: ignore [missing-import]
<<<<<<< HEAD
=======
import stripe
# pyrefly: ignore [missing-import]
>>>>>>> c445638 (Migración de dLocal a Stripe)
from fastapi import APIRouter, Depends, HTTPException, Request
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.db.database import get_db
<<<<<<< HEAD
from app.core.security import get_current_user
from app.core.lookups import id_por_codigo
from app.core.notificaciones import crear_notificacion
from app.core.config import settings
from app.models.usuario import Usuario
from app.models.pedido import Pedido, PedidoItem, HistorialEstadoPedido
from app.models.pago import Pago
=======
from app.core.security import get_current_user, get_current_tienda
from app.core.lookups import id_por_codigo
from app.core.notificaciones import crear_notificacion
from app.core.config import settings
from app.core.permisos import obtener_tienda_usuario
from app.models.usuario import Usuario
from app.models.pedido import Pedido, PedidoItem, HistorialEstadoPedido
from app.models.pago import Pago
from app.models.tienda import Tienda
>>>>>>> c445638 (Migración de dLocal a Stripe)
from app.models.catalogos import EstadoPedido
from app.schemas.pago import (
    PagoCheckoutRequest,
    PagoResponse,
    PagoEstadoResponse,
<<<<<<< HEAD
)
from app.services import dlocal_service
=======
    ConnectEstadoResponse,
    ConnectOnboardingResponse,
)
from app.services import stripe_service
>>>>>>> c445638 (Migración de dLocal a Stripe)

router = APIRouter()

# Estados del pedido que impiden iniciar un nuevo cobro.
ESTADOS_PEDIDO_FINALES = ("pagado", "preparando", "enviado", "en_camino", "entregado", "cancelado")

<<<<<<< HEAD
# Mapeo de estados crudos de dLocal -> estados internos de Adoptify.
MAPA_ESTADOS_DLOCAL = {
    "PAID": "pagado",
    "SUCCEEDED": "pagado",
    "REJECTED": "fallido",
    "CANCELLED": "cancelado",
    "EXPIRED": "cancelado",
    "REFUNDED": "reembolsado",
    "PARTIALLY_REFUNDED": "reembolsado",
}
# Estados que ya no deben cambiar (finales en Adoptify).
ESTADOS_PAGO_FINALES = ("pagado", "fallido", "cancelado", "reembolsado")
=======
# Eventos de Stripe que se procesan.
EVENTO_PAGO_EXITOSO = "checkout.session.completed"
EVENTO_PAGO_FALLIDO = "payment_intent.payment_failed"
EVENTO_REEMBOLSO = "charge.refunded"
>>>>>>> c445638 (Migración de dLocal a Stripe)


def _registrar_historial(db: Session, pedido_id: int, estado_id: int, notas: str = None):
    """Registra un cambio de estado en historial_estados_pedido (si existe)."""
    try:
        db.add(HistorialEstadoPedido(pedido_id=pedido_id, estado_id=estado_id, notas=notas))
    except Exception as exc:  # noqa: BLE001
        logger.warning("[pagos] No se pudo registrar historial del pedido %s: %s", pedido_id, exc)


<<<<<<< HEAD
def _marcar_pedido_pagado(db: Session, pedido, estado_pagado_id: int, notas: str = None) -> bool:
    """Marca el pedido como 'pagado' (idempotente).

    NUNCA cambia un pedido que ya está en un estado final (pagado, preparando,
    enviado, en_camino, entregado o cancelado). Devuelve True si lo marcó.
    """
    if not pedido:
        return False
    codigo = pedido.estado.codigo if pedido.estado else None
    if codigo in ESTADOS_PEDIDO_FINALES:
        return False
    pedido.estado_id = estado_pagado_id
    _registrar_historial(db, pedido.id, estado_pagado_id, notas or "Pago confirmado por dLocal")
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
    return True


def _buscar_pago_por_notificacion(db: Session, data: dict):
    """Localiza el pago por dlocal_payment_id (o order_id como respaldo)."""
    dlocal_id = data.get("payment_id") or data.get("id")
    order_id = data.get("order_id")
    pago = None
    if dlocal_id:
        pago = db.query(Pago).filter(Pago.dlocal_payment_id == str(dlocal_id)).first()
    if not pago and order_id:
        pago = (
            db.query(Pago)
            .filter(Pago.order_id == str(order_id), Pago.proveedor == "dlocal")
            .order_by(Pago.id.desc())
            .first()
        )
    return pago


def _aplicar_estado_dlocal(db: Session, pago: Pago, data: dict) -> str:
    """Aplica el estado de dLocal al pago/pedido (idempotente). Devuelve el
    estado interno resultante."""
    status = (data.get("status") or "").upper()
    pago.estado_pasarela = status
    pago.notificacion = json.dumps(data, ensure_ascii=False, default=str)
    estado_interno = MAPA_ESTADOS_DLOCAL.get(status)
    if not estado_interno:
        # Estado desconocido: se registra pero no se cambia la lógica de cobro.
        return pago.estado

    if estado_interno == "pagado":
        if pago.estado in ESTADOS_PAGO_FINALES and pago.estado != "pagado":
            return pago.estado
        pago.estado = "pagado"
        pedido = db.query(Pedido).filter(Pedido.id == pago.pedido_id).first()
        estado_pagado_id = id_por_codigo(db, EstadoPedido, "pagado")
        if estado_pagado_id:
            _marcar_pedido_pagado(db, pedido, estado_pagado_id, "Pago confirmado por dLocal (webhook)")
        return "pagado"

    if estado_interno in ("fallido", "cancelado", "reembolsado"):
        if pago.estado == "pagado":
            # Un pago ya confirmado no se degrada por una notificación tardía.
            return pago.estado
        pago.estado = estado_interno
        return estado_interno
    return pago.estado
=======
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
>>>>>>> c445638 (Migración de dLocal a Stripe)


# ============================================================
# POST /api/pagos/checkout
# ============================================================
@router.post("/checkout", response_model=PagoResponse)
def iniciar_checkout(
    payload: PagoCheckoutRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
<<<<<<< HEAD
    """Crea un pago en dLocal (Checkout REDIRECT) para un pedido y devuelve la URL.

    - Valida propiedad/autorización del pedido.
    - Valida que el pedido no esté en un estado final.
    - Recalcula el monto desde la BD (pedido.total) y lo envía a dLocal en COP
      (entero, sin centavos).
    - Guarda el pago en la BD y devuelve la URL del Checkout de dLocal.
=======
    """Crea una Stripe Checkout Session para un pedido y devuelve la URL.

    - Valida propiedad/autorización del pedido.
    - Valida que el pedido no esté en un estado final.
    - Valida que todas las tiendas del pedido tengan Stripe Connect activo.
    - Recalcula el monto desde la BD (pedido.total y pedido_items).
    - Crea el registro de pago y la sesión en Stripe.
>>>>>>> c445638 (Migración de dLocal a Stripe)
    """
    pedido = db.query(Pedido).filter(Pedido.id == payload.pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.usuario_id != current_user.id and current_user.rol_codigo not in ("administrador", "administrador_principal"):
        raise HTTPException(status_code=403, detail="No puedes pagar este pedido")

    estado_actual = pedido.estado.codigo if pedido.estado else None
    if estado_actual in ESTADOS_PEDIDO_FINALES:
        raise HTTPException(status_code=400, detail=f"Este pedido ya no puede pagarse (estado: {estado_actual})")

<<<<<<< HEAD
    # Recalcula el total desde la BD y verifica la consistencia contable:
    # subtotal + envío - descuento == total. Si no coincide, NO se cobra.
    items_db = db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido.id).all()
    subtotal_bd = sum(int(it.subtotal or 0) for it in items_db)
    total_esperado = subtotal_bd + int(pedido.costo_envio or 0) - int(pedido.descuento or 0)
    if total_esperado != int(pedido.total or 0):
        logger.error(
            "[pagos] Inconsistencia de total en pedido %s: subtotal=%s + envio=%s - descuento=%s != total=%s",
            pedido.id, subtotal_bd, int(pedido.costo_envio or 0), int(pedido.descuento or 0), int(pedido.total or 0),
        )
        raise HTTPException(
            status_code=409,
            detail="El pedido tiene un total inconsistente. No se pudo iniciar el pago; contacta a soporte.",
        )

    # Monto desde la BD (nunca del frontend), en COP entero (dLocal no usa centavos).
=======
    # Monto desde la BD (nunca del frontend).
>>>>>>> c445638 (Migración de dLocal a Stripe)
    monto_cop = int(pedido.total or 0)
    if monto_cop <= 0:
        raise HTTPException(status_code=400, detail="El pedido no tiene un monto válido para cobrar")

<<<<<<< HEAD
    # Idempotencia: si ya existe un cobro pendiente con URL, se reutiliza.
    activo = (
        db.query(Pago)
        .filter(Pago.pedido_id == pedido.id, Pago.estado == "pendiente", Pago.proveedor == "dlocal")
=======
    # Valida que las tiendas del pedido puedan recibir fondos.
    _validar_tiendas_para_cobro(db, pedido)

    # Idempotencia: si ya existe un cobro pendiente con URL, se reutiliza.
    activo = (
        db.query(Pago)
        .filter(Pago.pedido_id == pedido.id, Pago.estado == "pendiente", Pago.proveedor == "stripe")
>>>>>>> c445638 (Migración de dLocal a Stripe)
        .order_by(Pago.id.desc())
        .first()
    )
    if activo and activo.redirect_url:
        return activo

    order_id = f"ADOPTIFY-PEDIDO-{pedido.id}"
<<<<<<< HEAD
    success_url = f"{settings.dlocal_success_url}&order_id={order_id}"
    back_url = settings.dlocal_back_url
    notification_url = settings.dlocal_callback_url

    payer = {
        "email": current_user.email or "",
        "name": current_user.nombre or (current_user.username or ""),
    }

    try:
        respuesta = dlocal_service.crear_checkout(
            pedido=pedido,
            monto_cop=monto_cop,
            success_url=success_url,
            back_url=back_url,
            notification_url=notification_url,
            payer=payer,
        )
    except dlocal_service.DlocalConfiguracionError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except dlocal_service.DlocalApiError as exc:
        logger.error("[pagos] dLocal rechazó el checkout: %s", exc.message)
        raise HTTPException(status_code=502, detail="dLocal no pudo crear el pago. Intenta de nuevo.")

    checkout_url = respuesta.get("redirect_url") or ""
    if not checkout_url:
        logger.error("[pagos] dLocal no devolvió redirect_url: %s", respuesta)
        raise HTTPException(status_code=502, detail="No se pudo generar el Checkout de pago.")
=======
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
>>>>>>> c445638 (Migración de dLocal a Stripe)

    pago = Pago(
        pedido_id=pedido.id,
        usuario_id=current_user.id,
<<<<<<< HEAD
        proveedor="dlocal",
        order_id=order_id,
        estado="pendiente",
        estado_pasarela=respuesta.get("status") or "PENDING",
        monto=monto_cop,
        moneda="COP",
        metodo_pago="dlocal",
        redirect_url=checkout_url,
        dlocal_payment_id=str(respuesta.get("id") or ""),
        respuesta_pasarela=json.dumps(respuesta, ensure_ascii=False, default=str),
=======
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
>>>>>>> c445638 (Migración de dLocal a Stripe)
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
<<<<<<< HEAD
    """Recibe las notificaciones de dLocal Go y actualiza pago/pedido.

    - Header Authorization: V2-HMAC-SHA256, Signature: <firma> (HMAC de
      API_KEY + body crudo con DLOCAL_SECRET_KEY).
    - Body: { "payment_id": "..." } (la notificación NO trae el estado).
    - Se consulta GET /v1/payments/{payment_id} para obtener el estado REAL.
    - Idempotente: una notificación repetida no duplica ni degrada estados.
    - Responde 200 cuando se procesó (o el estado ya es definitivo); error si
      la firma es inválida o falta payment_id.
    """
    raw = await request.body()
    auth_header = request.headers.get("Authorization", "")

    try:
        evento = dlocal_service.verificar_webhook(raw, auth_header)
    except dlocal_service.DlocalConfiguracionError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except dlocal_service.DlocalApiError as exc:
        logger.warning("[dlocal] Webhook rechazado: %s", exc.message)
        raise HTTPException(status_code=400, detail="Firma de webhook inválida")

    payment_id = evento.get("payment_id")
    if not payment_id:
        logger.warning("[dlocal] Webhook sin payment_id.")
        raise HTTPException(status_code=400, detail="Falta payment_id en la notificación")

    logger.info("[dlocal] Webhook recibido payment_id=%s", payment_id)
    pago = _buscar_pago_por_notificacion(db, evento)
    if not pago:
        # Notificación de un pago desconocido: se reconoce (200) sin procesar.
        logger.warning("[dlocal] Webhook sin pago conocido (payment_id=%s)", payment_id)
        return {"recibido": True}

    # La notificación solo trae payment_id: se consulta el estado REAL en dLocal Go.
    try:
        detalle = dlocal_service.consultar_pago(str(payment_id))
        _aplicar_estado_dlocal(db, pago, detalle)
        db.commit()
    except dlocal_service.DlocalApiError as exc:
        logger.warning("[dlocal] No se pudo consultar estado de %s: %s", payment_id, exc.message)
    logger.info("[dlocal] Pago %s actualizado a %s", pago.order_id, pago.estado)
    return {"recibido": True}


=======
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


>>>>>>> c445638 (Migración de dLocal a Stripe)
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
<<<<<<< HEAD
    """Consulta el estado real del pago (usado al volver del Checkout de dLocal).

    El redirect_url NO es fuente de verdad: aquí se consulta el estado
    persistido (que solo cambia con el webhook de dLocal) y, si el pago aún
    está pendiente, se consulta dLocal para sincronizarlo.
    """
    q = db.query(Pago).filter(Pago.proveedor == "dlocal")
    if session_id:
        pago = q.filter(Pago.dlocal_payment_id == session_id).first()
=======
    """Consulta el estado real del pago (usado al volver del checkout).

    El success_url NO es fuente de verdad: aquí se consulta el estado
    persistido (que solo cambia con el webhook de Stripe) y, si el pago aún
    está pendiente, se consulta Stripe para sincronizarlo.
    """
    q = db.query(Pago).filter(Pago.proveedor == "stripe")
    if session_id:
        pago = q.filter(Pago.stripe_checkout_session_id == session_id).first()
>>>>>>> c445638 (Migración de dLocal a Stripe)
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

<<<<<<< HEAD
    # Sincroniza el estado real desde dLocal si el pago aún no está resuelto.
    if pago.estado in ("pendiente", "procesando") and pago.dlocal_payment_id:
        try:
            detalle = dlocal_service.consultar_pago(pago.dlocal_payment_id)
            _aplicar_estado_dlocal(db, pago, detalle)
            db.commit()
            db.refresh(pago)
        except dlocal_service.DlocalApiError as exc:
            logger.warning("[pagos] No se pudo sincronizar estado con dLocal: %s", exc.message)
=======
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
>>>>>>> c445638 (Migración de dLocal a Stripe)

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
<<<<<<< HEAD
=======


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
>>>>>>> c445638 (Migración de dLocal a Stripe)
