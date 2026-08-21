"""
Endpoints de descarga del "Historial de Adopciones" (PDF/Excel) para el rol Usuario.

Seguridad:
    - Valida el token JWT mediante ``get_current_user``.
    - Filtra SIEMPRE por ``usuario_id == current_user.id``, de modo que un
      usuario solo puede exportar SU propio historial (nunca el de otro).

Los archivos se generan en memoria (ReportLab / openpyxl) y se envian como
descarga directa via ``StreamingResponse`` con las cabeceras correctas
(``Content-Type``, ``Content-Disposition``). No se almacena ninguna copia en el
servidor.
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
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.mascota import Mascota
from app.models.solicitud import SolicitudAdopcion
from app.models.usuario import Usuario
from app.services.reportes import adopciones as adopciones_reporte

router = APIRouter()

MEDIA_TYPE_PDF = "application/pdf"
MEDIA_TYPE_EXCEL = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)

NOMBRE_BASE = "Historial_Adopciones"

# Mensaje cuando el usuario no tiene solicitudes de adopcion registradas.
MENSAJE_SIN_SOLICITUDES = (
    "No tienes solicitudes de adopción registradas. "
    "No es posible generar el reporte."
)


def _nombre_archivo(extension: str) -> str:
    """Nombre de archivo con la fecha actual: Historial_Adopciones_YYYY-MM-DD."""
    fecha = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"{NOMBRE_BASE}_{fecha}.{extension}"


def _descarga(content: bytes, media_type: str, filename: str) -> StreamingResponse:
    """Construye una respuesta de descarga directa con cabeceras correctas."""
    # RFC 5987: codifica el nombre para que el navegador lo interprete bien.
    filename_encoded = quote(filename)
    headers = {
        "Content-Disposition": (
            f"attachment; filename=\"{filename}\"; filename*=UTF-8''{filename_encoded}"
        ),
        "Content-Length": str(len(content)),
        "Cache-Control": "no-store, must-revalidate",
        "Pragma": "no-cache",
    }
    # El documento ya esta completo en memoria; iter([content]) lo envia sin
    # escribir archivos temporales en disco.
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers=headers,
    )


def _adopciones_del_usuario(db: Session, usuario: Usuario) -> list:
    """Consulta las adopciones (solicitudes) del usuario autenticado.

    Usa ``joinedload`` para precargar mascota, tipo, refugio y estado y evitar
    consultas N+1 al generar el reporte.

    La consulta encuentra las solicitudes del usuario por:
      - ``usuario_id`` igual al del usuario autenticado, o
      - ``usuario_id`` nulo pero ``email_contacto`` igual al correo del usuario.

    Esto cubre solicitudes que no quedaron asociadas al usuario (``usuario_id``
    NULL, por ejemplo creadas/manuales por el refugio) pero que si registran el
    correo de contacto del solicitante, de modo que SIEMPRE aparezcan en el
    historial del usuario correcto.
    """
    condiciones = [SolicitudAdopcion.usuario_id == usuario.id]
    if usuario.email:
        # Comparacion insensible a mayusculas para no perder solicitudes cuyo
        # correo de contacto se guardo con otra capitalizacion.
        condiciones.append(
            and_(
                SolicitudAdopcion.usuario_id.is_(None),
                func.lower(SolicitudAdopcion.email_contacto)
                == func.lower(usuario.email),
            )
        )
    return (
        db.query(SolicitudAdopcion)
        .options(
            joinedload(SolicitudAdopcion.mascota).joinedload(Mascota.refugio),
        )
        .filter(or_(*condiciones))
        .order_by(SolicitudAdopcion.creada_en.desc())
        .all()
    )


@router.get("/export/pdf")
def exportar_historial_pdf(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera y descarga el PDF "Historial de Solicitudes de Adopción" del usuario.

    Los datos se obtienen SIEMPRE desde la base de datos y SOLO del usuario
    autenticado. Si el usuario no tiene solicitudes registradas, se rechaza la
    descarga con un mensaje claro (no se genera ni descarga el archivo).
    """
    solicitudes = _adopciones_del_usuario(db, current_user)
    if not solicitudes:
        raise HTTPException(
            status_code=404,
            detail=MENSAJE_SIN_SOLICITUDES,
        )
    try:
        contenido = adopciones_reporte.generar_pdf_historial(
            current_user, solicitudes
        )
    except Exception as exc:
        # Error controlado: no se expone el detalle interno al cliente.
        raise HTTPException(
            status_code=500,
            detail="No se pudo generar el reporte PDF. Intenta de nuevo.",
        ) from exc

    return _descarga(contenido, MEDIA_TYPE_PDF, _nombre_archivo("pdf"))


@router.get("/export/excel")
def exportar_historial_excel(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera y descarga el Excel "Historial de Solicitudes de Adopción" del usuario.

    Los datos se obtienen SIEMPRE desde la base de datos y SOLO del usuario
    autenticado. Si el usuario no tiene solicitudes registradas, se rechaza la
    descarga con un mensaje claro (no se genera ni descarga el archivo).
    """
    solicitudes = _adopciones_del_usuario(db, current_user)
    if not solicitudes:
        raise HTTPException(
            status_code=404,
            detail=MENSAJE_SIN_SOLICITUDES,
        )
    try:
        contenido = adopciones_reporte.generar_excel_historial(
            current_user, solicitudes
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="No se pudo generar el reporte Excel. Intenta de nuevo.",
        ) from exc

    return _descarga(contenido, MEDIA_TYPE_EXCEL, _nombre_archivo("xlsx"))
