# pyrefly: ignore [missing-import]
"""Endpoints públicos para el formulario de solicitud de registro de refugio.

No requieren autenticación: cualquier visitante puede enviar una solicitud,
consultar su estado mediante su token y completar información solicitada.
"""
import logging
import secrets
# pyrefly: ignore [missing-import]
from datetime import datetime, timezone

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db
from app.core.security import get_password_hash
from app.core.notificaciones import notificar_admins, registrar_auditoria
from app.models.usuario import Usuario
from app.models.refugio import Refugio
from app.models.solicitud_refugio import (
    SolicitudRefugio,
    EnlaceCreacionPassword,
)
from app.schemas.solicitud_refugio import (
    SolicitudRefugioCreate,
    SolicitudRefugioResponse,
    SolicitudRefugioEstadoPublico,
    SolicitudRefugioDocumentoUpload,
    CrearPasswordRequest,
)
from app.services import solicitudes_refugio as svc
from app.api.routers.ia import crear_tarea_ia

logger = logging.getLogger(__name__)

router = APIRouter()


def _subir_logo(contenido_base64: str) -> dict:
    """Sube el logo del refugio a Cloudinary y devuelve {url, public_id}."""
    from app.services.cloudinary_service import _subir_a_cloudinary
    contenido = contenido_base64 or ""
    if "," in contenido and contenido.lstrip().startswith("data:"):
        contenido = contenido.split(",", 1)[1]
    return _subir_a_cloudinary(contenido, "solicitudes-refugio/logos", "logo")


@router.post("/", response_model=SolicitudRefugioResponse, status_code=status.HTTP_201_CREATED)
def crear_solicitud(payload: SolicitudRefugioCreate, db: Session = Depends(get_db)):
    """Crea una solicitud de registro de refugio (formulario público)."""
    email_norm = payload.representante_email.strip().lower()

    email_contacto = (payload.email_contacto or "").strip().lower()

    # --- Validación de documentación obligatoria (backend como autoridad final) ---
    CATEGORIAS_REQUERIDAS = {
        "identidad", "fachada", "fotografias", "instalaciones", "animales",
        "camara_comercio", "nit", "personeria_juridica", "certificado_fundacion", "otros",
    }
    categorias_recibidas = {d.categoria for d in payload.documentos}
    faltantes = CATEGORIAS_REQUERIDAS - categorias_recibidas
    if faltantes:
        raise HTTPException(
            status_code=400,
            detail="Debes adjuntar toda la documentación solicitada para continuar con tu solicitud.",
        )

    # --- Prevención de solicitudes duplicadas ---
    # 1. Si ya existe una solicitud pendiente/informacion con el correo del representante.
    duplicada = (
        db.query(SolicitudRefugio)
        .filter(
            SolicitudRefugio.representante_email == email_norm,
            SolicitudRefugio.estado.in_(["pendiente", "informacion_solicitada"]),
        )
        .first()
    )
    if duplicada:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ya existe una solicitud pendiente con este correo. "
                "Si te pidieron información adicional, regresa al enlace que recibiste por correo."
            ),
        )

    # 2. Si ya existe una solicitud APROBADA con el mismo correo, el refugio ya fue creado.
    aprobada = (
        db.query(SolicitudRefugio)
        .filter(
            SolicitudRefugio.estado == "aprobada",
            (SolicitudRefugio.representante_email == email_norm)
            | (
                (SolicitudRefugio.email_contacto.isnot(None))
                & (SolicitudRefugio.email_contacto == email_contacto)
            ),
        )
        .first()
    )
    if aprobada:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una cuenta registrada para este usuario. Este refugio ya fue aprobado en Adoptify.",
        )

    # 3. Unicidad del correo de contacto: no debe estar registrado como cuenta activa.
    if email_contacto:
        usuario_existente = db.query(Usuario).filter(Usuario.email == email_contacto).first()
        if usuario_existente:
            raise HTTPException(
                status_code=400,
                detail="El correo de contacto ya está registrado en Adoptify. Usa otro correo.",
            )

    # 4. No debe existir otro refugio con el mismo nombre (slug base).
    base_slug = svc._slugify(payload.nombre_refugio or "")
    if base_slug:
        refugio_existente = (
            db.query(Refugio)
            .filter(
                (Refugio.slug == base_slug) | (Refugio.slug.like(f"{base_slug}-%"))
            )
            .first()
        )
        if refugio_existente:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un refugio registrado con este nombre.",
            )

    # Subir logo si viene
    logo_url = None
    if payload.logo_base64:
        try:
            logo_url = _subir_logo(payload.logo_base64)["url"]
        except Exception:
            logo_url = None

    solicitud = SolicitudRefugio(
        nombre_refugio=payload.nombre_refugio,
        logo_url=logo_url,
        descripcion=payload.descripcion,
        email_contacto=(payload.email_contacto or "").strip(),
        telefono=payload.telefono,
        departamento=payload.departamento,
        ciudad=payload.ciudad or payload.municipio,
        municipio=payload.municipio,
        direccion=payload.direccion,
        website=payload.website,
        anio_fundacion=payload.anio_fundacion,
        facebook=payload.facebook,
        instagram=payload.instagram,
        tiktok=payload.tiktok,
        representante_nombre=payload.representante_nombre,
        representante_apellido=payload.representante_apellido,
        representante_email=email_norm,
        representante_telefono=payload.representante_telefono,
        acepto_veracidad="true" if payload.acepto_veracidad else "false",
        autorizo_verificacion="true" if payload.autorizo_verificacion else "false",
        estado="pendiente",
        token_consulta=secrets.token_urlsafe(32),
    )
    db.add(solicitud)
    db.flush()

    # Guardar documentos (subir a Cloudinary)
    errores_subida = 0
    for doc in payload.documentos:
        try:
            documento = svc._subir_documento(db, solicitud.id, doc)
            db.add(documento)
        except Exception:
            errores_subida += 1

    svc._agregar_historial(
        db, solicitud, "creada",
        f"Solicitud de registro enviada para '{solicitud.nombre_refugio}'.",
    )

    # Notificar a los administradores
    notificar_admins(
        db,
        tipo="nueva_solicitud",
        mensaje=f"📬 Nueva solicitud de refugio: {solicitud.nombre_refugio} ({solicitud.ciudad or '—'})",
        enlace="/admin/refugios",
    )
    registrar_auditoria(
        db, None, "crear_solicitud_refugio", "solicitudes_refugio",
        solicitud.id, f"Solicitud de {solicitud.nombre_refugio}",
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe una solicitud pendiente con este correo. Verifica tu bandeja de correo o el enlace que recibiste.",
        )
    db.refresh(solicitud)

    # n8n (WF-1): aviso externo a administradores (correo/Telegram/WhatsApp).
    try:
        crear_tarea_ia(db, "notificar_externo", {
            "evento": "nueva_solicitud_refugio",
            "solicitud_id": solicitud.id,
            "nombre_refugio": solicitud.nombre_refugio,
            "ciudad": solicitud.ciudad or solicitud.municipio,
            "email_contacto": solicitud.email_contacto or solicitud.representante_email,
        })
    except Exception as exc:
        logger.warning("[solicitudes_refugio] No se pudo encolar aviso externo: %s", exc)

    data = svc.serialize_solicitud(solicitud, db)
    if errores_subida:
        data["mensaje"] = (
            "Solicitud enviada. Algunos documentos no se pudieron subir; "
            "completa la información solicitada o vuelve a intentarlo."
        )
    return data


@router.get("/estado/{token}", response_model=SolicitudRefugioEstadoPublico)
def estado_solicitud(token: str, db: Session = Depends(get_db)):
    """Consulta pública del estado de una solicitud mediante su token."""
    solicitud = (
        db.query(SolicitudRefugio).filter(SolicitudRefugio.token_consulta == token).first()
    )
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    mensaje = None
    if solicitud.estado == "pendiente":
        mensaje = "Tu solicitud está pendiente de revisión. El proceso puede tardar entre 24 y 72 horas."
    elif solicitud.estado == "informacion_solicitada":
        mensaje = "Se solicitó información adicional. Completa la información para continuar."
    elif solicitud.estado == "aprobada":
        mensaje = "Tu solicitud fue aprobada. Revisa tu correo para crear tu contraseña."
    elif solicitud.estado == "rechazada":
        mensaje = "Tu solicitud fue rechazada. Revisa el motivo indicado."

    return SolicitudRefugioEstadoPublico(
        id=solicitud.id,
        nombre_refugio=solicitud.nombre_refugio,
        estado=solicitud.estado,
        mensaje_informacion=solicitud.mensaje_informacion,
        motivo_rechazo=solicitud.motivo_rechazo,
        mensaje=mensaje,
        creada_en=solicitud.creada_en.isoformat() if solicitud.creada_en else None,
        fecha_revision=solicitud.fecha_revision.isoformat() if solicitud.fecha_revision else None,
        fecha_aprobacion=solicitud.fecha_aprobacion.isoformat() if solicitud.fecha_aprobacion else None,
        username_generado=solicitud.username_generado,
        token_consulta=solicitud.token_consulta,
    )


@router.post("/{token}/documentos", response_model=SolicitudRefugioResponse)
def subir_documentos_adicionales(
    token: str,
    payload: SolicitudRefugioDocumentoUpload,
    db: Session = Depends(get_db),
):
    """Permite al refugio completar únicamente la información solicitada
    (subir documentos) sin volver a diligenciar toda la solicitud."""
    solicitud = (
        db.query(SolicitudRefugio).filter(SolicitudRefugio.token_consulta == token).first()
    )
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if solicitud.estado not in ("pendiente", "informacion_solicitada"):
        raise HTTPException(
            status_code=400,
            detail="Esta solicitud ya no acepta información adicional",
        )

    agregados = 0
    for doc in payload.documentos:
        try:
            documento = svc._subir_documento(db, solicitud.id, doc)
            db.add(documento)
            agregados += 1
        except Exception as exc:
            logger.error("Error subiendo documento adicional: %s", exc)

    # Si estaba en 'informacion_solicitada', vuelve a 'pendiente' para revisión
    if solicitud.estado == "informacion_solicitada" and agregados:
        solicitud.estado = "pendiente"
        solicitud.actualizada_en = datetime.now(timezone.utc)
        svc._agregar_historial(
            db, solicitud, "informacion_completada",
            "El refugio completó la información solicitada. Solicitud de nuevo en revisión.",
        )

    if not agregados:
        raise HTTPException(
            status_code=400,
            detail="No se pudo subir ningún documento. Intenta de nuevo.",
        )

    db.commit()
    return svc.serialize_solicitud(solicitud, db)


@router.post("/crear-password", status_code=status.HTTP_200_OK)
def crear_password(payload: CrearPasswordRequest, db: Session = Depends(get_db)):
    """Crea la contraseña de la cuenta del refugio aprobado usando el enlace seguro."""
    now = datetime.now(timezone.utc)
    enlace = (
        db.query(EnlaceCreacionPassword)
        .filter(EnlaceCreacionPassword.token == payload.token)
        .first()
    )
    if not enlace:
        raise HTTPException(status_code=404, detail="El enlace no es válido")

    if enlace.usado == "usado":
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado")
    if enlace.expira_en < now:
        enlace.usado = "expirado"
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="El enlace ha expirado. Contacta al equipo de Adoptify para generar uno nuevo.",
        )

    user = db.query(Usuario).filter(Usuario.id == enlace.usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="La cuenta asociada no existe")

    user.hashed_password = get_password_hash(payload.password)
    user.activo = True
    enlace.usado = "usado"

    # Registrar en el historial de la solicitud si existe
    solicitud = (
        db.query(SolicitudRefugio)
        .filter(SolicitudRefugio.usuario_creado_id == user.id)
        .first()
    )
    if solicitud:
        svc._agregar_historial(
            db, solicitud, "password_creada",
            "El representante creó la contraseña de acceso mediante el enlace seguro.",
        )

    registrar_auditoria(
        db, user.id, "crear_password_refugio", "usuarios",
        user.id, f"Contraseña creada por enlace seguro para {user.email}",
    )
    db.commit()

    return {"mensaje": "Contraseña creada correctamente. Ya puedes iniciar sesión."}
