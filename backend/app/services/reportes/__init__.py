"""
Registro central de los reportes descargables de Adoptify.

Expone el diccionario ``REGISTRO_REPORTES`` (codigo -> clase generadora) que
usan el router de descarga y la UI para listar y generar reportes en PDF/Excel.
"""
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

# Codigo -> clase generadora
REGISTRO_REPORTES = {
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


def obtener_generador(codigo: str):
    """Devuelve una instancia del generador segun su codigo (o None)."""
    cls = REGISTRO_REPORTES.get(codigo)
    return cls() if cls else None


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
