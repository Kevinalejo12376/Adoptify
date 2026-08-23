"""
Registro central de los reportes descargables de Adoptify.

Expone el diccionario ``REGISTRO_REPORTES`` (codigo -> clase generadora) que
usan el router de descarga y la UI para listar y generar reportes en PDF/Excel.
"""
# pyrefly: ignore [missing-import]
from typing import Dict, Optional, Type

from app.services.reportes.base import GeneradorReporte, Columna
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
    "listar_reportes",
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
    """Instancia el generador de reporte correspondiente al codigo (o None)."""
    clase = REGISTRO_REPORTES.get(codigo)
    if clase is None:
        return None
    return clase()


def listar_reportes():
    """Devuelve la lista de reportes disponibles (para el selector de la UI)."""
    return [
        {
            "codigo": g.codigo,
            "titulo": g.titulo,
            "descripcion": g.descripcion,
        }
        for g in REGISTRO_REPORTES.values()
    ]


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


__all__ = [
    "Columna",
    "GeneradorReporte",
    "REGISTRO_REPORTES",
    "obtener_generador",
    "listar_reportes",
    "listar_tipos",
]
