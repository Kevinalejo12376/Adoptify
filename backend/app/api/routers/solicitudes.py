# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from typing import List

from app.db.database import get_db
from app.core.security import (
    get_current_user,
    get_refugio_de_usuario,
    require_permiso_refugio,
)
from app.core.lookups import id_por_codigo
from app.core.notificaciones import crear_notificacion, registrar_auditoria
from app.models.usuario import Usuario
from app.models.refugio import Refugio
from app.models.mascota import Mascota
from app.models.solicitud import SolicitudAdopcion
from app.models.catalogos import EstadoSolicitud
from app.schemas.solicitud import SolicitudCreate, SolicitudResponse, SolicitudEstadoUpdate
from app.schemas.serializers import serialize_solicitud

router = APIRouter()


def _enrich(s: SolicitudAdopcion, db: Session) -> dict:
    """Serializa la solicitud y agrega mascota_nombre/mascota_tipo desde la BD
    sin depender de lazy loading (que puede colgar la sesion)."""
    from app.models.catalogos import TipoMascota
    d = serialize_solicitud(s)
    row = db.query(Mascota.nombre, Mascota.tipo_id).filter(Mascota.id == s.mascota_id).first()
    if row:
        d["mascota_nombre"] = row[0]
        tipo_row = db.query(TipoMascota.nombre).filter(TipoMascota.id == row[1]).first()
        d["mascota_tipo"] = tipo_row[0] if tipo_row else None
    return d


@router.post("/", response_model=SolicitudResponse, status_code=status.HTTP_201_CREATED)
def crear_solicitud(
    payload: SolicitudCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mascota = db.query(Mascota).filter(
        Mascota.id == payload.mascota_id, Mascota.activo == True  # noqa: E712
    ).first()
    if not mascota:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")

    estado_id = id_por_codigo(db, EstadoSolicitud, "pendiente", requerido=True)
    solicitud = SolicitudAdopcion(
        mascota_id=payload.mascota_id,
        usuario_id=current_user.id,
        estado_id=estado_id,
        nombre_contacto=payload.nombre_contacto,
        email_contacto=payload.email_contacto,
        telefono_contacto=payload.telefono_contacto,
        ubicacion=payload.ubicacion,
        mensaje=payload.mensaje,
        tiene_familia=payload.tiene_familia,
        tiene_experiencia=payload.tiene_experiencia,
    )
    db.add(solicitud)
    db.flush()

    # Notifica al refugio dueno de la mascota
    if mascota.refugio:
        uid = db.query(Refugio.usuario_id).filter(Refugio.id == mascota.refugio_id).scalar()
        if uid:
            crear_notificacion(
                db, uid, tipo="nueva_solicitud",
                mensaje=f"Nueva solicitud de adopcion para {mascota.nombre} de {payload.nombre_contacto}",
                enlace="/refugio/solicitudes",
            )
    registrar_auditoria(db, current_user.id, "crear_solicitud", "solicitudes_adopcion",
                        solicitud.id, f"Solicitud para mascota id {mascota.id}")
    db.commit()
    db.refresh(solicitud)
    return _enrich(solicitud, db)


@router.get("/mias", response_model=List[SolicitudResponse])
def mis_solicitudes(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Historial de adopciones del usuario autenticado."""
    solicitudes = (
        db.query(SolicitudAdopcion)
        .filter(SolicitudAdopcion.usuario_id == current_user.id)
        .order_by(SolicitudAdopcion.creada_en.desc())
        .all()
    )
    return [_enrich(s, db) for s in solicitudes]


@router.get("/recibidas", response_model=List[SolicitudResponse])
def solicitudes_recibidas(current_user: Usuario = Depends(require_permiso_refugio("solicitudes")), db: Session = Depends(get_db)):
    """Solicitudes recibidas por el refugio autenticado."""
    refugio = get_refugio_de_usuario(db, current_user)
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")
    solicitudes = (
        db.query(SolicitudAdopcion)
        .join(Mascota, SolicitudAdopcion.mascota_id == Mascota.id)
        .filter(Mascota.refugio_id == refugio.id)
        .order_by(SolicitudAdopcion.creada_en.desc())
        .all()
    )
    return [_enrich(s, db) for s in solicitudes]


# Notificacion al solicitante segun el nuevo estado de su solicitud.
_NOTIF_ESTADO_SOLICITUD = {
    "en_revision": ("solicitud_enviada", "Tu solicitud de adopción para {m} está en revisión."),
    "contactado": ("solicitud_enviada", "El refugio te contactó sobre tu solicitud de adopción para {m}."),
    "finalizada": ("solicitud_aceptada", "¡Felicidades! Tu proceso de adopción para {m} ha finalizado con éxito."),
    "cerrada": ("solicitud_rechazada", "Tu solicitud de adopción para {m} ha sido cerrada."),
}


@router.patch("/{solicitud_id}/estado", response_model=SolicitudResponse)
def actualizar_estado(
    solicitud_id: int,
    payload: SolicitudEstadoUpdate,
    current_user: Usuario = Depends(require_permiso_refugio("solicitudes")),
    db: Session = Depends(get_db),
):
    nuevo_estado_id = id_por_codigo(db, EstadoSolicitud, payload.estado, requerido=True)
    refugio = get_refugio_de_usuario(db, current_user)
    solicitud = db.query(SolicitudAdopcion).filter(SolicitudAdopcion.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    mascota = db.query(Mascota).filter(Mascota.id == solicitud.mascota_id).first()
    if not refugio or not mascota or mascota.refugio_id != refugio.id:
        raise HTTPException(status_code=403, detail="No puedes gestionar esta solicitud")
    estado_anterior = solicitud.estado_id
    solicitud.estado_id = nuevo_estado_id

    # Notifica al solicitante sobre el cambio de estado
    if solicitud.usuario_id and estado_anterior != nuevo_estado_id:
        tipo, plantilla = _NOTIF_ESTADO_SOLICITUD.get(
            payload.estado,
            ("solicitud_enviada", "El estado de tu solicitud de adopción para {m} ha cambiado."),
        )
        crear_notificacion(
            db, solicitud.usuario_id, tipo,
            plantilla.format(m=mascota.nombre),
            "/adoption-history",
        )
    db.commit()
    db.refresh(solicitud)
    return _enrich(solicitud, db)
