# pyrefly: ignore [missing-import]
"""Endpoints públicos para el formulario de solicitud de registro de Tienda Aliada.

No requieren autenticación: cualquier visitante puede enviar una solicitud,
consultar su estado mediante su token y completar información solicitada.
Reutiliza la infraestructura del flujo de solicitudes de Refugios.
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
from app.models.tienda import Tienda
from app.models.solicitud_refugio import EnlaceCreacionPassword
from app.models.solicitud_tienda import SolicitudTienda
from app.schemas.solicitud_tienda import (
    SolicitudTiendaCreate,
    SolicitudTiendaResponse,
    SolicitudTiendaEstadoPublico,
    SolicitudTiendaDocumentoUpload,
    CrearPasswordTiendaRequest,
    validar_password_fuerte,
)
from app.services import solicitudes_tienda as svc

logger = logging.getLogger(__name__)

router = APIRouter()


def _subir_logo(contenido_base64: str) -> dict:
    """Sube el logo de la tienda a Cloudinary y devuelve {url, public_id}."""
    from app.services.cloudinary_service import _subir_a_cloudinary
    contenido = contenido_base64 or ""
    if "," in contenido and contenido.lstrip().startswith("data:"):
        contenido = contenido.split(",", 1)[1]
    return _subir_a_cloudinary(contenido, "solicitudes-tienda/logos", "logo")


@router.post("/", response_model=SolicitudTiendaResponse, status_code=status.HTTP_201_CREATED)
def crear_solicitud(payload: SolicitudTiendaCreate, db: Session = Depends(get_db)):
    """Crea una solicitud de registro de Tienda Aliada (formulario público)."""
    email_norm = payload.representante_email.strip().lower()
    email_contacto = (payload.email_contacto or "").strip().lower()

    # --- Validación de documentación obligatoria (backend como autoridad final) ---
    # Toda la documentación es obligatoria; no se puede enviar una solicitud incompleta.
    CATEGORIAS_REQUERIDAS = {
        "identidad", "camara_comercio", "fachada", "instalaciones",
        "productos", "nit", "otros",
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
        db.query(SolicitudTienda)
        .filter(
            SolicitudTienda.representante_email == email_norm,
            SolicitudTienda.estado.in_(["pendiente", "informacion_solicitada"]),
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

    # 2. Si ya existe una solicitud APROBADA con el mismo correo, la tienda ya fue creada:
    #    no se permite volver a registrarla.
    aprobada = (
        db.query(SolicitudTienda)
        .filter(
            SolicitudTienda.estado == "aprobada",
            (SolicitudTienda.representante_email == email_norm)
            | (
                (SolicitudTienda.email_contacto.isnot(None))
                & (SolicitudTienda.email_contacto == email_contacto)
            ),
        )
        .first()
    )
    if aprobada:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una cuenta registrada para este usuario. Esta tienda ya fue aprobada en Adoptify.",
        )

    # 3. Unicidad del correo de contacto: no debe estar registrado como cuenta activa.
    if email_contacto:
        usuario_existente = db.query(Usuario).filter(Usuario.email == email_contacto).first()
        if usuario_existente:
            raise HTTPException(
                status_code=400,
                detail="El correo de contacto ya está registrado en Adoptify. Usa otro correo.",
            )

    # 4. No debe existir otra tienda con el mismo nombre (slug base).
    base_slug = svc._slugify(payload.nombre_tienda or "")
    if base_slug:
        tienda_existente = (
            db.query(Tienda)
            .filter(
                (Tienda.slug == base_slug) | (Tienda.slug.like(f"{base_slug}-%"))
            )
            .first()
        )
        if tienda_existente:
            raise HTTPException(
                status_code=400,
                detail="Ya existe una tienda registrada con este nombre.",
            )

    # Subir logo si viene
    logo_url = None
    if payload.logo_base64:
        try:
            logo_url = _subir_logo(payload.logo_base64)["url"]
        except Exception:
            logo_url = None

    solicitud = SolicitudTienda(
        nombre_tienda=payload.nombre_tienda,
        logo_url=logo_url,
        descripcion=payload.descripcion,
        email_contacto=email_contacto,
        telefono=payload.telefono,
        departamento=payload.departamento,
        ciudad=payload.ciudad or payload.municipio,
        municipio=payload.municipio,
        direccion=payload.direccion,
        website=payload.website,
        horario_semana=payload.horario_semana,
        horario_fin_semana=payload.horario_fin_semana,
        facebook=payload.facebook,
        instagram=payload.instagram,
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
        f"Solicitud de registro enviada para '{solicitud.nombre_tienda}'.",
    )

    # Notificar a los administradores
    notificar_admins(
        db,
        tipo="nueva_solicitud",
        mensaje=f"📬 Nueva solicitud de tienda aliada: {solicitud.nombre_tienda} ({solicitud.ciudad or '—'})",
        enlace="/admin/tiendas/solicitudes",
    )
    registrar_auditoria(
        db, None, "crear_solicitud_tienda", "solicitudes_tienda",
        solicitud.id, f"Solicitud de {solicitud.nombre_tienda}",
    )

    try:
        db.commit()
    except IntegrityError:
        # Dos peticiones simultáneas pudieron pasar el chequeo; la restricción única
        # de la BD bloquea el segundo registro.
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe una solicitud pendiente con este correo. Verifica tu bandeja de correo o el enlace que recibiste.",
        )
    db.refresh(solicitud)
    data = svc.serialize_solicitud(solicitud, db)
    if errores_subida:
        data["mensaje"] = (
            "Solicitud enviada. Algunos documentos no se pudieron subir; "
            "completa la información solicitada o vuelve a intentarlo."
        )
    return data


@router.get("/estado/{token}", response_model=SolicitudTiendaEstadoPublico)
def estado_solicitud(token: str, db: Session = Depends(get_db)):
    """Consulta pública del estado de una solicitud mediante su token."""
    solicitud = (
        db.query(SolicitudTienda).filter(SolicitudTienda.token_consulta == token).first()
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

    return SolicitudTiendaEstadoPublico(
        id=solicitud.id,
        nombre_tienda=solicitud.nombre_tienda,
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


@router.post("/{token}/documentos", response_model=SolicitudTiendaResponse)
def subir_documentos_adicionales(
    token: str,
    payload: SolicitudTiendaDocumentoUpload,
    db: Session = Depends(get_db),
):
    """Permite a la tienda completar únicamente la información solicitada
    (subir documentos) sin volver a diligenciar toda la solicitud."""
    solicitud = (
        db.query(SolicitudTienda).filter(SolicitudTienda.token_consulta == token).first()
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
            "La tienda completó la información solicitada. Solicitud de nuevo en revisión.",
        )

    if not agregados:
        raise HTTPException(
            status_code=400,
            detail="No se pudo subir ningún documento. Intenta de nuevo.",
        )

    db.commit()
    return svc.serialize_solicitud(solicitud, db)


@router.post("/crear-password", status_code=status.HTTP_200_OK)
def crear_password(payload: CrearPasswordTiendaRequest, db: Session = Depends(get_db)):
    """Crea la contraseña de la cuenta de la Tienda Aliada aprobada usando el enlace seguro.

    Valida en backend la fortaleza de la contraseña (mínimo 8 caracteres, mayúscula,
    minúscula, número y carácter especial) y registra la creación en el historial.
    """
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

    # Este endpoint es exclusivo de Tiendas Aliadas. Si el enlace pertenece a otro
    # tipo de cuenta (p. ej. refugio), se responde 404 para que el frontend use el
    # endpoint correspondiente del módulo de refugios.
    solicitud = (
        db.query(SolicitudTienda)
        .filter(SolicitudTienda.usuario_creado_id == user.id)
        .first()
    )
    if not solicitud:
        raise HTTPException(status_code=404, detail="El enlace no es válido")

    # Validar la fortaleza de la contraseña SOLO cuando el enlace es de una tienda.
    # Se ejecuta aquí (y no en el schema de Pydantic) para que los enlaces de
    # Refugio reciban el 404 anterior y el flujo actual de Refugio no se vea afectado.
    try:
        validar_password_fuerte(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    user.hashed_password = get_password_hash(payload.password)
    user.activo = True
    enlace.usado = "usado"

    # Registrar en el historial de la solicitud de tienda
    svc._agregar_historial(
        db, solicitud, "password_creada",
        "El representante creó la contraseña de acceso mediante el enlace seguro.",
    )

    registrar_auditoria(
        db, user.id, "crear_password_tienda", "usuarios",
        user.id, f"Contraseña creada por enlace seguro para {user.email}",
    )
    db.commit()

    return {"mensaje": "Contraseña creada correctamente. Ya puedes iniciar sesión."}
