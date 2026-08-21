"""Notificaciones del usuario autenticado (sirve para usuario, refugio y admin)."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.soporte import Notificacion

router = APIRouter()


TIPO_TITULOS = {
    "pedido_realizado": "Pedido Realizado",
    "pago_confirmado": "Pago Confirmado",
    "pedido_enviado": "Pedido Enviado",
    "pedido_entregado": "Pedido Entregado",
    "pedido_cancelado": "Pedido Cancelado",
    "reembolso": "Reembolso",
    "pedido_actualizado": "Pedido Actualizado",
    "nueva_solicitud": "Nueva Solicitud de Adopción",
    "solicitud_enviada": "Solicitud de Adopción",
    "solicitud_aceptada": "Solicitud Aceptada",
    "solicitud_rechazada": "Solicitud Rechazada",
    "actualizacion_refugio": "Actualización del Refugio",
    "cambio_password": "Cambio de Contraseña",
    "nuevo_login": "Nuevo Inicio de Sesión",
    "actualizacion_perfil": "Actualización de Perfil",
    "nueva_publicacion": "Nueva Publicación",
    "nuevo_evento": "Nuevo Evento",
    "nueva_mascota": "Nueva Mascota Disponible",
    "respuesta_foro": "Respuesta en Publicación",
    "comentario": "Nuevo Comentario",
    "reaccion": "Nueva Reacción",
    "like_publicacion": "Le gustó tu publicación",
    "like_comentario": "Le gustó tu comentario",
    "venta": "Nueva Venta",
    "sistema": "Notificación del Sistema",
    "donacion_recibida": "Donación Recibida",
    "pqrs_tienda": "PQRS",
}

TIPO_CATEGORIAS = {
    "pedido_realizado": "marketplace",
    "pago_confirmado": "marketplace",
    "pedido_enviado": "marketplace",
    "pedido_entregado": "marketplace",
    "pedido_cancelado": "marketplace",
    "pedido_actualizado": "marketplace",
    "reembolso": "marketplace",
    "nueva_solicitud": "adopciones",
    "solicitud_enviada": "adopciones",
    "solicitud_aceptada": "adopciones",
    "solicitud_rechazada": "adopciones",
    "actualizacion_refugio": "adopciones",
    "cambio_password": "sistema",
    "nuevo_login": "sistema",
    "actualizacion_perfil": "sistema",
    "nueva_publicacion": "comunidad",
    "nuevo_evento": "comunidad",
    "nueva_mascota": "adopciones",
    "respuesta_foro": "comunidad",
    "comentario": "comunidad",
    "reaccion": "comunidad",
    "like_publicacion": "comunidad",
    "like_comentario": "comunidad",
    "venta": "marketplace",
    "sistema": "sistema",
    "donacion_recibida": "adopciones",
    "pqrs_tienda": "sistema",
}

def _serialize(n: Notificacion) -> dict:
    return {
        "id": n.id,
        "tipo": n.tipo,
        "mensaje": n.mensaje,
        "enlace": n.enlace,
        "leida": n.leida,
        "creado_en": n.creado_en.isoformat() if n.creado_en else None,
    }


@router.get("/")
def listar(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = (
        db.query(Notificacion)
        .filter(Notificacion.usuario_id == current_user.id)
        .order_by(Notificacion.creado_en.desc())
        .limit(50)
        .all()
    )
    return [_serialize(n) for n in notifs]


@router.get("/no-leidas")
def no_leidas(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    total = (
        db.query(Notificacion)
        .filter(Notificacion.usuario_id == current_user.id, Notificacion.leida == False)  # noqa: E712
        .count()
    )
    return {"count": total}


@router.patch("/{notif_id}/leer")
def marcar_leida(notif_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notificacion).filter(
        Notificacion.id == notif_id, Notificacion.usuario_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")
    n.leida = True
    db.commit()
    return {"ok": True}


@router.patch("/leer-todas")
def marcar_todas(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notificacion).filter(
        Notificacion.usuario_id == current_user.id, Notificacion.leida == False  # noqa: E712
    ).update({Notificacion.leida: True})
    db.commit()
    return {"ok": True}


@router.delete("/{notif_id}")
def eliminar_notificacion(notif_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notificacion).filter(
        Notificacion.id == notif_id, Notificacion.usuario_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")
    db.delete(n)
    db.commit()
    return {"ok": True}
