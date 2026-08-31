"""Rutas de administración de donaciones (supervisión y consulta).

El administrador SUPERVISA y CONSULTA las donaciones de Adoptify; no altera
arbitrariamente la confirmación de recepción que realiza el refugio. Se exponen:

  - GET /api/admin/donaciones          -> listado completo con filtros y trazabilidad.
  - GET /api/admin/donaciones/estadisticas -> totales agregados con los mismos filtros.
"""
# pyrefly: ignore [missing-import]
from datetime import datetime
from typing import Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import get_current_admin
from app.core.notificaciones import registrar_auditoria
from app.models.usuario import Usuario
from app.models.donacion_usuario import DonacionUsuario
from app.models.refugio import Refugio
from app.api.routers.donaciones import _serialize_donacion

router = APIRouter()


def _filtros_base(
    db: Session,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    refugio_id: Optional[int] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
):
    """Construye el query base de donaciones aplicando los filtros opcionales."""
    query = db.query(DonacionUsuario)

    if refugio_id:
        query = query.filter(DonacionUsuario.refugio_id == refugio_id)
    if tipo:
        query = query.filter(DonacionUsuario.tipo == tipo)
    if estado:
        query = query.filter(DonacionUsuario.estado == estado)
    if desde:
        try:
            desde_dt = datetime.fromisoformat(desde)
            query = query.filter(DonacionUsuario.creado_en >= desde_dt)
        except ValueError:
            pass
    if hasta:
        try:
            hasta_dt = datetime.fromisoformat(hasta)
            query = query.filter(DonacionUsuario.creado_en <= hasta_dt)
        except ValueError:
            pass
    return query


@router.get("/donaciones")
def listar_donaciones_admin(
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    refugio_id: Optional[int] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
):
    """Lista todas las donaciones de Adoptify con filtros por fecha, refugio,
    tipo y estado. Incluye donante, refugio, tipo, valor, fecha, estado,
    referencia/transacción, detalle y trazabilidad (quién confirmó)."""
    donaciones = (
        _filtros_base(db, desde, hasta, refugio_id, tipo, estado)
        .order_by(DonacionUsuario.creado_en.desc())
        .all()
    )

    # Datos de los refugios para el filtro/agrupación del frontend.
    refugios = db.query(Refugio).filter(Refugio.activo.is_(True)).order_by(Refugio.nombre.asc()).all()

    registrar_auditoria(
        db,
        current_user.id,
        "donacion.consultar",
        entidad="donacion_usuario",
        detalle=f"El admin consultó {len(donaciones)} donaciones",
    )
    db.commit()

    return {
        "donaciones": [_serialize_donacion(d) for d in donaciones],
        "refugios": [
            {"id": r.id, "nombre": r.nombre, "logo_url": r.logo_url}
            for r in refugios
        ],
    }


@router.get("/donaciones/estadisticas")
def estadisticas_donaciones_admin(
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    refugio_id: Optional[int] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
):
    """Estadísticas generales de donaciones con los mismos filtros:
    total donado, cantidad, recibidas, pendientes, no recibidas y pago confirmado."""
    query = _filtros_base(db, desde, hasta, refugio_id, tipo, estado)
    donaciones = query.all()

    total_donado = sum(d.valor or 0 for d in donaciones if d.estado in ("pago_confirmado", "recibida"))
    cantidad = len(donaciones)

    def contar(estados):
        return sum(1 for d in donaciones if d.estado in estados)

    return {
        "total_donado": total_donado,
        "cantidad": cantidad,
        "recibidas": contar(["recibida"]),
        "pendientes": contar(["pendiente"]),
        "pago_confirmado": contar(["pago_confirmado"]),
        "no_recibidas": contar(["no_recibida"]),
        "fallidas": contar(["fallida"]),
    }
