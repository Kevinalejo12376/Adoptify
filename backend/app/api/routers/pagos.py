"""Endpoints de pagos online (dLocal, flujo REDIRECT).

Flujo:
  POST /api/pagos/checkout  -> crea un pago en dLocal (Checkout REDIRECT) y devuelve redirect_url
  POST /api/pagos/webhook   -> recibe y valida las notificaciones de dLocal (idempotente)
  GET  /api/pagos/estado    -> consulta el estado REAL del pago (dLocal + persistido)
  GET  /api/pagos/{id}      -> detalle de un pago propio

El monto SIEMPRE se toma de la base de datos (pedido.total), nunca del frontend.
La confirmación de pago proviene EXCLUSIVAMENTE de dLocal (webhook o consulta
de estado), nunca de la URL de éxito del navegador.
"""
# pyrefly: ignore [missing-import]
import json
import logging

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.db.database import get_db
from app.core.security import get_current_user
from app.core.lookups import id_por_codigo
from app.core.notificaciones import crear_notificacion
from app.core.config import settings
from app.models.usuario import Usuario
from app.models.pedido import Pedido, PedidoItem, HistorialEstadoPedido
from app.models.pago import Pago
from app.models.catalogos import EstadoPedido
from app.schemas.pago import (
    PagoCheckoutRequest,
    PagoResponse,
    PagoEstadoResponse,
)
from app.services import dlocal_service

router = APIRouter()

# Estados del pedido que impiden iniciar un nuevo cobro.
ESTADOS_PEDIDO_FINALES = ("pagado", "preparando", "enviado", "en_camino", "entregado", "cancelado")

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


def _registrar_historial(db: Session, pedido_id: int, estado_id: int, notas: str = None):
    """Registra un cambio de estado en historial_estados_pedido (si existe)."""
    try:
        db.add(HistorialEstadoPedido(pedido_id=pedido_id, estado_id=estado_id, notas=notas))
    except Exception as exc:  # noqa: BLE001
        logger.warning("[pagos] No se pudo registrar historial del pedido %s: %s", pedido_id, exc)


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


# ============================================================
# POST /api/pagos/checkout
# ============================================================
@router.post("/checkout", response_model=PagoResponse)
def iniciar_checkout(
    payload: PagoCheckoutRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea un pago en dLocal (Checkout REDIRECT) para un pedido y devuelve la URL.

    - Valida propiedad/autorización del pedido.
    - Valida que el pedido no esté en un estado final.
    - Recalcula el monto desde la BD (pedido.total) y lo envía a dLocal en COP
      (entero, sin centavos).
    - Guarda el pago en la BD y devuelve la URL del Checkout de dLocal.
    """
    pedido = db.query(Pedido).filter(Pedido.id == payload.pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.usuario_id != current_user.id and current_user.rol_codigo not in ("administrador", "administrador_principal"):
        raise HTTPException(status_code=403, detail="No puedes pagar este pedido")

    estado_actual = pedido.estado.codigo if pedido.estado else None
    if estado_actual in ESTADOS_PEDIDO_FINALES:
        raise HTTPException(status_code=400, detail=f"Este pedido ya no puede pagarse (estado: {estado_actual})")

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
    monto_cop = int(pedido.total or 0)
    if monto_cop <= 0:
        raise HTTPException(status_code=400, detail="El pedido no tiene un monto válido para cobrar")

    # Idempotencia: si ya existe un cobro pendiente con URL, se reutiliza.
    activo = (
        db.query(Pago)
        .filter(Pago.pedido_id == pedido.id, Pago.estado == "pendiente", Pago.proveedor == "dlocal")
        .order_by(Pago.id.desc())
        .first()
    )
    if activo and activo.redirect_url:
        return activo

    order_id = f"ADOPTIFY-PEDIDO-{pedido.id}"
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

    pago = Pago(
        pedido_id=pedido.id,
        usuario_id=current_user.id,
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
    """Consulta el estado real del pago (usado al volver del Checkout de dLocal).

    El redirect_url NO es fuente de verdad: aquí se consulta el estado
    persistido (que solo cambia con el webhook de dLocal) y, si el pago aún
    está pendiente, se consulta dLocal para sincronizarlo.
    """
    q = db.query(Pago).filter(Pago.proveedor == "dlocal")
    if session_id:
        pago = q.filter(Pago.dlocal_payment_id == session_id).first()
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

    # Sincroniza el estado real desde dLocal si el pago aún no está resuelto.
    if pago.estado in ("pendiente", "procesando") and pago.dlocal_payment_id:
        try:
            detalle = dlocal_service.consultar_pago(pago.dlocal_payment_id)
            _aplicar_estado_dlocal(db, pago, detalle)
            db.commit()
            db.refresh(pago)
        except dlocal_service.DlocalApiError as exc:
            logger.warning("[pagos] No se pudo sincronizar estado con dLocal: %s", exc.message)

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
