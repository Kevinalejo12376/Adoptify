"""
Endpoints de descarga de reportes (PDF/Excel) para el panel de administracion.

Los archivos se generan en memoria (ReportLab / openpyxl) y se envian como
descarga directa via ``StreamingResponse`` con las cabeceras correctas
(``Content-Type``, ``Content-Disposition``) para forzar la descarga en el
navegador. No se almacena ninguna copia en el servidor; los recursos se
liberan automaticamente al finalizar la respuesta.
"""
# pyrefly: ignore [missing-import]
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from urllib.parse import quote
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.responses import StreamingResponse
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.database import get_db
from app.models.usuario import Usuario
from app.services import reportes as reportes_service

router = APIRouter()

MEDIA_TYPE_PDF = "application/pdf"
MEDIA_TYPE_EXCEL = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)


def _nombre_archivo(nombre_base: str, extension: str) -> str:
    """Genera un nombre de archivo unico con la fecha actual."""
    fecha = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"{nombre_base}_{fecha}.{extension}"


def _descarga(content: bytes, media_type: str, filename: str) -> StreamingResponse:
    """Construye una respuesta de descarga directa con las cabeceras correctas."""
    # RFC 5987: codifica el nombre para que el navegador lo interprete bien.
    filename_encoded = quote(filename)
    headers = {
        "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{filename_encoded}",
        "Content-Length": str(len(content)),
        "Cache-Control": "no-store, must-revalidate",
        "Pragma": "no-cache",
    }
    # El documento ya esta completo en memoria; iter([content]) lo envia
    # sin escribir archivos temporales en disco.
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers=headers,
    )


@router.get("/tipos")
def listar_tipos_reporte(
    _admin: Usuario = Depends(get_current_admin),
):
    """Devuelve los tipos de reportes disponibles (codigo, titulo, descripcion)."""
    return reportes_service.listar_tipos()


@router.get("/{tipo}/pdf")
def descargar_reporte_pdf(
    tipo: str,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Genera y descarga un reporte en PDF (en memoria, sin guardar en disco)."""
    generador = reportes_service.obtener_generador(tipo)
    if generador is None:
        raise HTTPException(status_code=404, detail="Tipo de reporte no encontrado")

    contenido = generador.generar_pdf(db)
    nombre = _nombre_archivo(generador.nombre_archivo, "pdf")
    return _descarga(contenido, MEDIA_TYPE_PDF, nombre)


@router.get("/{tipo}/excel")
def descargar_reporte_excel(
    tipo: str,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Genera y descarga un reporte en Excel (en memoria, sin guardar en disco)."""
    generador = reportes_service.obtener_generador(tipo)
    if generador is None:
        raise HTTPException(status_code=404, detail="Tipo de reporte no encontrado")

    contenido = generador.generar_excel(db)
    nombre = _nombre_archivo(generador.nombre_archivo, "xlsx")
    return _descarga(contenido, MEDIA_TYPE_EXCEL, nombre)
