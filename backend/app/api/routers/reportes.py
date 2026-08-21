"""Reportes de contenido: los usuarios reportan; se notifica a admins."""
# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.db.database import get_db
from app.core.security import get_current_user
from app.core.notificaciones import notificar_admins
from app.models.usuario import Usuario
from app.models.soporte import Reporte
from app.schemas.soporte import ReporteCreate
from app.api.routers.ia import crear_tarea_ia

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

    # IA / n8n: clasifica y prioriza el reporte (WF-2) para agilizar la revision.
    try:
        crear_tarea_ia(db, "clasificar_reporte", {
            "reporte_id": reporte.id,
            "reportante_id": current_user.id,
            "tipo_objeto": reporte.tipo_objeto,
            "objeto_id": reporte.objeto_id,
            "motivo": reporte.motivo,
        })
    except Exception as exc:
        logger.warning("[reportes] No se pudo encolar clasificacion: %s", exc)

    return {
        "id": reporte.id,
        "tipo_objeto": reporte.tipo_objeto,
        "objeto_id": reporte.objeto_id,
        "motivo": reporte.motivo,
        "estado": reporte.estado,
    }
