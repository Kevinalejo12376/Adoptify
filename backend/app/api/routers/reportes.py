"""Reportes de contenido: los usuarios reportan; se notifica a admins."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import get_current_user
from app.core.notificaciones import notificar_admins
from app.models.usuario import Usuario
from app.models.soporte import Reporte
from app.schemas.soporte import ReporteCreate

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
def crear_reporte(payload: ReporteCreate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    reporte = Reporte(
        reportante_id=current_user.id,
        tipo_objeto=payload.tipo_objeto,
        objeto_id=payload.objeto_id,
        motivo=payload.motivo,
    )
    db.add(reporte)
    notificar_admins(db, tipo="reporte", mensaje=f"Nuevo reporte de {payload.tipo_objeto}", enlace="/admin/reportes")
    db.commit()
    db.refresh(reporte)
    return {
        "id": reporte.id,
        "tipo_objeto": reporte.tipo_objeto,
        "objeto_id": reporte.objeto_id,
        "motivo": reporte.motivo,
        "estado": reporte.estado,
    }
