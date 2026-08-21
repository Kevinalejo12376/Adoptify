"""Endpoints publicos (sin autenticacion) para la landing page y vistas abiertas."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.lookups import id_por_codigo
from app.models.mascota import Mascota
from app.models.refugio import Refugio
from app.models.usuario import Usuario
from app.models.solicitud import SolicitudAdopcion
from app.models.catalogos import EstadoMascota, EstadoSolicitud

router = APIRouter()


@router.get("/estadisticas")
def estadisticas_publicas(db: Session = Depends(get_db)):
    """Conteos globales reales para la landing page (Home)."""
    disponible_id = id_por_codigo(db, EstadoMascota, "disponible")
    finalizada_id = id_por_codigo(db, EstadoSolicitud, "finalizada")

    mascotas_disponibles = (
        db.query(Mascota).filter(
            Mascota.estado_id == disponible_id,
            Mascota.activo == True,  # noqa: E712
        ).count()
        if disponible_id else 0
    )
    adopciones_exitosas = (
        db.query(SolicitudAdopcion).filter(SolicitudAdopcion.estado_id == finalizada_id).count()
        if finalizada_id else 0
    )

    return {
        "mascotas_disponibles": mascotas_disponibles,
        "mascotas_total": db.query(Mascota).filter(Mascota.activo == True).count(),  # noqa: E712
        "refugios": db.query(Refugio).filter(Refugio.activo == True).count(),  # noqa: E712
        "adopciones_exitosas": adopciones_exitosas,
        "usuarios": db.query(Usuario).filter(Usuario.activo == True).count(),  # noqa: E712
    }
