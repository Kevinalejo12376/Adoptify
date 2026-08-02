"""PQRS: los usuarios crean peticiones/quejas/reclamos/sugerencias; se notifica a admins."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from typing import List

from app.db.database import get_db
from app.core.security import get_current_user
from app.core.notificaciones import notificar_admins
from app.models.usuario import Usuario
from app.models.soporte import Pqrs
from app.schemas.soporte import PqrsCreate

router = APIRouter()


def _serialize(p: Pqrs) -> dict:
    return {
        "id": p.id,
        "usuario_id": p.usuario_id,
        "tipo": p.tipo,
        "asunto": p.asunto,
        "mensaje": p.mensaje,
        "estado": p.estado,
        "respuesta": p.respuesta,
        "creado_en": p.creado_en.isoformat() if p.creado_en else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def crear_pqrs(payload: PqrsCreate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    pqrs = Pqrs(
        usuario_id=current_user.id,
        tipo=payload.tipo,
        asunto=payload.asunto,
        mensaje=payload.mensaje,
    )
    db.add(pqrs)
    # Notifica a los administradores del nuevo PQRS
    notificar_admins(db, tipo="pqrs", mensaje=f"Nuevo PQRS: {payload.asunto}", enlace="/admin/pqrs")
    db.commit()
    db.refresh(pqrs)
    return _serialize(pqrs)


@router.get("/mias", response_model=List[dict])
def mis_pqrs(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Pqrs).filter(Pqrs.usuario_id == current_user.id).order_by(Pqrs.creado_en.desc()).all()
    return [_serialize(p) for p in items]
