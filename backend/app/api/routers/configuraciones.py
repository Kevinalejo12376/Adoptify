"""Configuracion de cuenta del usuario autenticado (notificaciones, tema, idioma)."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.interaccion import Configuracion

router = APIRouter()

CAMPOS_BOOL = [
    "notif_email", "notif_push", "notif_adopciones", "notif_respuestas_foro",
    "notif_nuevos_animales", "notif_nuevas_solicitudes", "notif_cambios_estado",
    "notif_mensajes_foro",
]


class ConfiguracionUpdate(BaseModel):
    notif_email: Optional[bool] = None
    notif_push: Optional[bool] = None
    notif_adopciones: Optional[bool] = None
    notif_respuestas_foro: Optional[bool] = None
    notif_nuevos_animales: Optional[bool] = None
    notif_nuevas_solicitudes: Optional[bool] = None
    notif_cambios_estado: Optional[bool] = None
    notif_mensajes_foro: Optional[bool] = None
    tema: Optional[str] = None
    idioma: Optional[str] = None


def _serialize(c: Configuracion) -> dict:
    return {
        "notif_email": c.notif_email,
        "notif_push": c.notif_push,
        "notif_adopciones": c.notif_adopciones,
        "notif_respuestas_foro": c.notif_respuestas_foro,
        "notif_nuevos_animales": c.notif_nuevos_animales,
        "notif_nuevas_solicitudes": c.notif_nuevas_solicitudes,
        "notif_cambios_estado": c.notif_cambios_estado,
        "notif_mensajes_foro": c.notif_mensajes_foro,
        "tema": c.tema,
        "idioma": c.idioma,
    }


def _get_or_create(db: Session, usuario_id: int) -> Configuracion:
    cfg = db.query(Configuracion).filter(Configuracion.usuario_id == usuario_id).first()
    if not cfg:
        cfg = Configuracion(usuario_id=usuario_id)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.get("/")
def obtener(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    return _serialize(_get_or_create(db, current_user.id))


@router.put("/")
def actualizar(payload: ConfiguracionUpdate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    cfg = _get_or_create(db, current_user.id)
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(cfg, campo, valor)
    db.commit()
    db.refresh(cfg)
    return _serialize(cfg)
