"""
Endpoints de descarga de reportes (PDF / Excel) para administradores.
<<<<<<< HEAD

Los archivos se generan en memoria (ReportLab / openpyxl), sin escribir en el
servidor, y se devuelven como respuesta de descarga directa (StreamingResponse)
con las cabeceras correctas (Content-Type, Content-Disposition) para forzar la
descarga en el navegador. No se almacena ninguna copia en el servidor; los
recursos se liberan automaticamente al finalizar la respuesta.
Descarga de reportes descargables (PDF / Excel) para administradores.

Los archivos se generan en memoria (ReportLab / openpyxl), sin escribir en el
servidor, y se devuelven como respuesta de descarga directa via
``StreamingResponse`` con las cabeceras correctas (``Content-Type``,
``Content-Disposition``) para forzar la descarga en el navegador. No se
almacena ninguna copia en el servidor; los recursos se liberan
automaticamente al finalizar la respuesta.
<<<<<<< HEAD
Descarga de reportes descargables (PDF / Excel) para administradores.

Los archivos se generan en memoria (ReportLab / openpyxl), sin escribir en el
servidor, y se devuelven como respuesta de descarga directa.
=======
=======

Los archivos se generan en memoria (ReportLab / openpyxl), sin escribir en el
servidor, y se devuelven como respuesta de descarga directa (StreamingResponse)
con las cabeceras correctas (Content-Type, Content-Disposition) para forzar la
descarga en el navegador. No se almacena ninguna copia en el servidor; los
recursos se liberan automaticamente al finalizar la respuesta.
>>>>>>> c445638 (Migración de dLocal a Stripe)
>>>>>>> 9ec2927 (Migración de dLocal a Stripe)
"""
# pyrefly: ignore [missing-import]
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from urllib.parse import quote
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
from fastapi.responses import Response, StreamingResponse
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.database import get_db
from app.models.usuario import Usuario
from app.services import reportes as reportes_service

router = APIRouter()

# Formato -> (media_type, extension)
_FORMATOS = {
    "pdf": ("application/pdf", ".pdf"),
    "excel": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xlsx",
    ),
}

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


def _generar(
    codigo: str, formato: str, db: Session, usuario: Usuario | None = None
) -> Response:
    """Genera el reporte en el formato indicado y devuelve la respuesta.

    ``usuario`` es quien genera el reporte y se refleja en los metadatos del
    documento (trazabilidad del autor).
    """
    generador = reportes_service.obtener_generador(codigo)
    if generador is None:
        raise HTTPException(status_code=404, detail="Tipo de reporte no encontrado")

    if formato == "excel":
        contenido = generador.generar_excel(db, usuario=usuario)
        media_type, ext = _FORMATOS["excel"]
    else:
        contenido = generador.generar_pdf(db, usuario=usuario)
        media_type, ext = _FORMATOS["pdf"]

    nombre = _nombre_archivo(generador.nombre_archivo, ext)
    return _descarga(contenido, media_type, nombre)


@router.get("")
def tipos_reportes(_admin: Usuario = Depends(get_current_admin)):
    """Devuelve los tipos de reportes disponibles para la UI."""
    return reportes_service.listar_reportes()


@router.get("/tipos")
def listar_tipos_reporte(
    _admin: Usuario = Depends(get_current_admin),
):
    """Devuelve los tipos de reportes disponibles (codigo, titulo, descripcion)."""
    return reportes_service.listar_tipos()


@router.get("/{codigo}")
def descargar(
    codigo: str,
    formato: str = Query("pdf", pattern="^(pdf|excel)$"),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Genera y descarga el reporte en el formato solicitado."""
    return _generar(codigo, formato, db, usuario=_admin)


@router.get("/{tipo}/pdf")
def descargar_reporte_pdf(
    tipo: str,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Genera y descarga un reporte en PDF (en memoria, sin guardar en disco)."""
    return _generar(tipo, "pdf", db, usuario=_admin)


@router.get("/{tipo}/excel")
def descargar_reporte_excel(
    tipo: str,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Genera y descarga un reporte en Excel (en memoria, sin guardar en disco)."""
    return _generar(tipo, "excel", db, usuario=_admin)
