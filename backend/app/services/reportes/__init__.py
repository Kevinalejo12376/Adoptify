"""
Modulo de generacion de reportes de Adoptify.

Registro central de tipos de reporte. Para agregar un nuevo reporte:
    1. Crear una subclase de ``GeneradorReporte`` (o agregarla en generadores.py).
    2. Registrarla en ``REGISTRO_REPORTES``.
    3. Los endpoints de descarga la detectan automaticamente.
"""
# pyrefly: ignore [missing-import]
from typing import Dict, Optional, Type

from app.services.reportes.base import GeneradorReporte
from app.services.reportes.generadores import (
    ReporteContenido,
    ReporteEstadisticas,
    ReporteMascotas,
    ReportePedidos,
    ReportePqrs,
    ReporteProductos,
    ReporteRefugios,
    ReporteSolicitudes,
    ReporteTiendas,
    ReporteUsuarios,
)

__all__ = [
    "Columna",
    "GeneradorReporte",
    "REGISTRO_REPORTES",
    "obtener_generador",
    "listar_tipos",
]

# Reexportar tipos utiles
from app.services.reportes.base import Columna  # noqa: E402

# ---------------------------------------------------------------------------
# Registro central de reportes
# ---------------------------------------------------------------------------
REGISTRO_REPORTES: Dict[str, Type[GeneradorReporte]] = {
    cls.codigo: cls
    for cls in (
        ReporteUsuarios,
        ReporteMascotas,
        ReporteRefugios,
        ReporteTiendas,
        ReporteProductos,
        ReportePedidos,
        ReporteSolicitudes,
        ReportePqrs,
        ReporteContenido,
        ReporteEstadisticas,
    )
}


def obtener_generador(codigo: str) -> Optional[GeneradorReporte]:
    """Instancia el generador de reporte correspondiente al codigo.

    Args:
        codigo: Codigo del tipo de reporte.

    Returns:
        Instancia del generador, o None si el codigo no esta registrado.
    """
    clase = REGISTRO_REPORTES.get(codigo)
    if clase is None:
        return None
    return clase()


def listar_tipos() -> list:
    """Devuelve los tipos de reporte disponibles (para el frontend)."""
    return [
        {
            "codigo": cls.codigo,
            "titulo": cls.titulo,
            "descripcion": cls.descripcion,
            "nombre_archivo": cls.nombre_archivo,
        }
        for cls in REGISTRO_REPORTES.values()
    ]
