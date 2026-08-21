"""
Descarga de reportes descargables (PDF / Excel) para administradores.

Los archivos se generan en memoria (ReportLab / openpyxl), sin escribir en el
servidor, y se devuelven como respuesta de descarga directa.
"""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.database import get_db
from app.models.usuario import Usuario
from app.services.reportes import listar_reportes, obtener_generador

router = APIRouter()

# Formato -> (media_type, extension)
_FORMATOS = {
    "pdf": ("application/pdf", ".pdf"),
    "excel": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xlsx",
    ),
}


@router.get("")
def tipos_reportes(_admin: Usuario = Depends(get_current_admin)):
    """Devuelve los tipos de reportes disponibles para la UI."""
    return listar_reportes()


@router.get("/{codigo}")
def descargar(
    codigo: str,
    formato: str = Query("pdf", pattern="^(pdf|excel)$"),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Genera y descarga el reporte en el formato solicitado."""
    generador = obtener_generador(codigo)
    if not generador:
        raise HTTPException(status_code=404, detail="Tipo de reporte no encontrado")

    if formato == "excel":
        contenido = generador.generar_excel(db)
        media_type, ext = _FORMATOS["excel"]
    else:
        contenido = generador.generar_pdf(db)
        media_type, ext = _FORMATOS["pdf"]

    nombre = f"{generador.nombre_archivo}{ext}"
    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )
