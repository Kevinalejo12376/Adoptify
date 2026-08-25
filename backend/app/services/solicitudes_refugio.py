"""Servicio de automatización del flujo de solicitudes de registro de refugios.

Centraliza TODA la lógica de negocio del módulo para que pueda ser reutilizada
por los endpoints de administración y, en el futuro, por automatizaciones
externas (p. ej. n8n) sin duplicar ni modificar la lógica principal.

Responsabilidades:
  - Crear la solicitud + subir sus documentos a Cloudinary.
  - Serializar solicitudes para la API.
  - Aprobar: crear usuario (rol refugio), refugio, username único, enlace
    seguro para crear contraseña (24 h), enviar correo y registrar historial.
  - Rechazar: guardar motivo, cambiar estado y enviar correo.
  - Solicitar información: guardar mensaje, cambiar estado, enviar correo.
  - Marcar estado de verificación de un documento.
"""
# pyrefly: ignore [missing-import]
import logging
import secrets
from datetime import datetime, timedelta, timezone
# pyrefly: ignore [missing-import]
from typing import Optional

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import (
    enviar_correo_aprobacion_refugio,
    enviar_correo_solicitud_informacion,
    enviar_correo_rechazo_refugio,
)
from app.core.notificaciones import notificar_admins, registrar_auditoria
from app.core.security import get_password_hash
from app.models.usuario import Usuario
from app.models.refugio import Refugio, RefugioImagen
from app.models.catalogos import Rol
from app.models.solicitud_refugio import (
    SolicitudRefugio,
    SolicitudRefugioDocumento,
    SolicitudRefugioHistorial,
    EnlaceCreacionPassword,
)

logger = logging.getLogger(__name__)

ESTADOS_VALIDOS = {"pendiente", "informacion_solicitada", "aprobada", "rechazada"}
ESTADOS_VERIFICACION_DOC = {"pendiente", "verificado", "no_valido"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slugify(texto: str) -> str:
    base = "".join(c.lower() if c.isalnum() else "-" for c in texto).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return base or "refugio"


def _normalizar(texto: Optional[str]) -> str:
    """Quita acentos, espacios y caracteres especiales para generar usernames."""
    import unicodedata
    if not texto:
        return ""
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return texto


def generar_username(db: Session, nombre_refugio: str) -> str:
    """Genera un nombre de usuario único a partir del nombre del refugio.

    Ejemplo: "Fundación Huellas" -> "fundacionhuellas".
    Si ya existe, agrega un sufijo numérico (fundacionhuellas2, ...).
    """
    base = _normalizar(nombre_refugio or "").lower().replace(" ", "")
    base = "".join(c for c in base if c.isalnum())
    if not base:
        base = "refugio"
    # Truncar razonablemente
    base = base[:28]

    candidato = base
    contador = 2
    while True:
        existe = db.query(Usuario).filter(Usuario.username == candidato).first()
        if not existe:
            return candidato
        candidato = f"{base[:28 - len(str(contador))]}{contador}"
        contador += 1


def crear_enlace_password(db: Session, usuario_id: int) -> EnlaceCreacionPassword:
    """Crea un enlace seguro de creación de contraseña vigente por 24 horas."""
    token = secrets.token_urlsafe(48)
    enlace = EnlaceCreacionPassword(
        usuario_id=usuario_id,
        token=token,
        usado="activo",
        expira_en=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(enlace)
    return enlace


def _agregar_historial(
    db: Session,
    solicitud: SolicitudRefugio,
    accion: str,
    descripcion: str,
    administrador_id: Optional[int] = None,
) -> SolicitudRefugioHistorial:
    h = SolicitudRefugioHistorial(
        solicitud_id=solicitud.id,
        accion=accion,
        descripcion=descripcion,
        administrador_id=administrador_id,
    )
    db.add(h)
    return h


def _nombre_admin(db: Session, admin_id: Optional[int]) -> Optional[str]:
    if not admin_id:
        return None
    admin = db.query(Usuario).filter(Usuario.id == admin_id).first()
    if not admin:
        return None
    return f"{admin.nombre} {admin.apellido or ''}".strip()


def _subir_documento(db: Session, solicitud_id: int, payload) -> SolicitudRefugioDocumento:
    """Sube un documento (base64) a Cloudinary y lo guarda en la BD."""
    from app.services.cloudinary_service import _subir_a_cloudinary
    from app.core.config import settings as _s

    contenido = payload.contenido_base64 or ""
    # Extraer solo la parte base64 si viene con prefijo data:image/...;base64,
    if "," in contenido and contenido.lstrip().startswith("data:"):
        contenido = contenido.split(",", 1)[1]

    carpeta = "solicitudes-refugio/documentos"
    try:
        subida = _subir_a_cloudinary(contenido, carpeta, payload.categoria)
    except Exception as exc:
        logger.exception("[solicitudes_refugio] Error subiendo documento a Cloudinary: %s", exc)
        raise

    return SolicitudRefugioDocumento(
        solicitud_id=solicitud_id,
        categoria=payload.categoria,
        tipo=payload.tipo or "obligatorio",
        nombre_archivo=(payload.nombre_archivo or "archivo")[:255],
        url=subida["url"],
        public_id=subida["public_id"],
    )


# ---------------------------------------------------------------------------
# Serialización
# ---------------------------------------------------------------------------

def serialize_documento(doc: SolicitudRefugioDocumento) -> dict:
    return {
        "id": doc.id,
        "solicitud_id": doc.solicitud_id,
        "categoria": doc.categoria,
        "tipo": doc.tipo,
        "nombre_archivo": doc.nombre_archivo,
        "url": doc.url,
        "public_id": doc.public_id,
        "estado_verificacion": doc.estado_verificacion,
        "creado_en": doc.creado_en.isoformat() if doc.creado_en else None,
    }


def serialize_historial(h: SolicitudRefugioHistorial, db: Session) -> dict:
    return {
        "id": h.id,
        "solicitud_id": h.solicitud_id,
        "accion": h.accion,
        "descripcion": h.descripcion,
        "administrador_id": h.administrador_id,
        "administrador_nombre": _nombre_admin(db, h.administrador_id),
        "creado_en": h.creado_en.isoformat() if h.creado_en else None,
    }


def serialize_solicitud(s: SolicitudRefugio, db: Session, incluir_detalle: bool = True) -> dict:
    """Serializa una solicitud para la API. Evita lazy loading problemático."""
    documentos = (
        db.query(SolicitudRefugioDocumento)
        .filter(SolicitudRefugioDocumento.solicitud_id == s.id)
        .order_by(SolicitudRefugioDocumento.id.asc())
        .all()
    )
    historial = (
        db.query(SolicitudRefugioHistorial)
        .filter(SolicitudRefugioHistorial.solicitud_id == s.id)
        .order_by(SolicitudRefugioHistorial.creado_en.asc())
        .all()
    )
    data = {
        "id": s.id,
        "nombre_refugio": s.nombre_refugio,
        "logo_url": s.logo_url,
        "descripcion": s.descripcion,
        "email_contacto": s.email_contacto,
        "telefono": s.telefono,
        "departamento": s.departamento,
        "ciudad": s.ciudad,
        "municipio": s.municipio,
        "direccion": s.direccion,
        "website": s.website,
        "anio_fundacion": s.anio_fundacion,
        "facebook": s.facebook,
        "instagram": s.instagram,
        "tiktok": s.tiktok,
        "representante_nombre": s.representante_nombre,
        "representante_apellido": s.representante_apellido,
        "representante_email": s.representante_email,
        "representante_telefono": s.representante_telefono,
        "estado": s.estado,
        "motivo_rechazo": s.motivo_rechazo,
        "mensaje_informacion": s.mensaje_informacion,
        "fecha_revision": s.fecha_revision.isoformat() if s.fecha_revision else None,
        "administrador_id": s.administrador_id,
        "administrador_nombre": _nombre_admin(db, s.administrador_id),
        "username_generado": s.username_generado,
        "fecha_aprobacion": s.fecha_aprobacion.isoformat() if s.fecha_aprobacion else None,
        "token_consulta": s.token_consulta,
        "creada_en": s.creada_en.isoformat() if s.creada_en else None,
        "actualizada_en": s.actualizada_en.isoformat() if s.actualizada_en else None,
        "total_documentos": len(documentos),
    }
    if incluir_detalle:
        data["documentos"] = [serialize_documento(d) for d in documentos]
        data["historial"] = [serialize_historial(h, db) for h in historial]
    return data


# ---------------------------------------------------------------------------
# Acciones del administrador (automatizaciones)
# ---------------------------------------------------------------------------

# Categorías de documentos de la solicitud que son fotografías VISUALES del
# refugio (Fachada, vista exterior, instalaciones, animales). Las demás son
# documentos legales/confidenciales y NO se copian a la galería pública.
CATEGORIAS_VISUALES_REFUGIO = ("fachada", "fotografias", "instalaciones", "animales")


def _copiar_imagenes_solicitud_a_galeria(db: Session, solicitud_id: int, refugio_id: int) -> None:
    """Copia las fotografías visuales de una solicitud aprobada a la galería
    (RefugioImagen) del refugio creado. La primera se marca como portada."""
    docs = (
        db.query(SolicitudRefugioDocumento)
        .filter(
            SolicitudRefugioDocumento.solicitud_id == solicitud_id,
            SolicitudRefugioDocumento.categoria.in_(CATEGORIAS_VISUALES_REFUGIO),
        )
        .order_by(SolicitudRefugioDocumento.id.asc())
        .all()
    )
    for idx, doc in enumerate(docs):
        db.add(RefugioImagen(
            refugio_id=refugio_id,
            url=doc.url,
            es_portada=(idx == 0),
            orden=idx,
        ))


def aprobar_solicitud(db: Session, solicitud: SolicitudRefugio, admin: Usuario) -> dict:
    """Aprueba la solicitud: crea usuario (rol refugio), refugio, username,
    enlace seguro para crear contraseña (24 h), envía el correo de bienvenida
    y registra todo en el historial.

    Nota: no hace commit; el llamador controla la transacción.
    """
    if solicitud.estado not in ("pendiente", "informacion_solicitada"):
        raise ValueError(f"No se puede aprobar una solicitud en estado '{solicitud.estado}'")

    # 1. El correo de inicio de sesión es el CORREO DEL REFUGIO (contacto);
    #    si no se indicó, se usa el del representante como respaldo.
    login_email = (solicitud.email_contacto or solicitud.representante_email or "").strip().lower()
    if not login_email:
        raise ValueError("No se pudo determinar el correo de acceso del refugio")

    existente = db.query(Usuario).filter(Usuario.email == login_email).first()
    if existente:
        raise ValueError(
            "El correo del refugio ya está registrado en la plataforma. "
            "No se puede crear la cuenta automáticamente."
        )

    # 2. Resolver rol refugio
    rol_refugio = db.query(Rol).filter(Rol.codigo == "refugio").first()
    if not rol_refugio:
        raise ValueError("El rol 'refugio' no existe en el catálogo")

    # 3. Crear usuario (sin contraseña; se creará por el enlace seguro)
    username = generar_username(db, solicitud.nombre_refugio)
    user = Usuario(
        nombre=(solicitud.representante_nombre or "Representante").strip(),
        apellido=(solicitud.representante_apellido or "").strip() or None,
        username=username,
        email=login_email,
        # Contraseña placeholder aleatoria; el usuario la reemplazará con el enlace seguro.
        hashed_password=get_password_hash(secrets.token_urlsafe(16)),
        rol_id=rol_refugio.id,
        telefono=solicitud.representante_telefono,
        ubicacion=solicitud.ciudad,
        activo=True,
    )
    db.add(user)
    db.flush()

    # 4. Crear refugio asociado
    slug = _slugify(solicitud.nombre_refugio)
    if db.query(Refugio).filter(Refugio.slug == slug).first():
        slug = f"{slug}-{user.id}"
    refugio = Refugio(
        usuario_id=user.id,
        nombre=solicitud.nombre_refugio,
        slug=slug,
        logo_url=solicitud.logo_url,
        descripcion=solicitud.descripcion,
        ubicacion=solicitud.ciudad or solicitud.municipio,
        departamento=solicitud.departamento,
        municipio=solicitud.municipio,
        direccion=solicitud.direccion,
        telefono=solicitud.telefono,
        email=solicitud.email_contacto or login_email,
        website=solicitud.website,
        facebook=solicitud.facebook,
        instagram=solicitud.instagram,
        tiktok=solicitud.tiktok,
        anio_fundacion=solicitud.anio_fundacion,
        verificado=True,
    )
    db.add(refugio)
    db.flush()

    # 4b. Copiar las fotografías del registro (fachada, vista exterior,
    #     instalaciones, animales) a la galería del refugio creado.
    _copiar_imagenes_solicitud_a_galeria(db, solicitud.id, refugio.id)

    # 5. Generar enlace seguro para crear contraseña (24 h)
    enlace = crear_enlace_password(db, user.id)
    url_crear = f"{settings.FRONTEND_URL}/crear-password/{enlace.token}"

    # 6. Actualizar la solicitud
    ahora = datetime.now(timezone.utc)
    solicitud.estado = "aprobada"
    solicitud.usuario_creado_id = user.id
    solicitud.refugio_creado_id = refugio.id
    solicitud.username_generado = username
    solicitud.fecha_aprobacion = ahora
    solicitud.fecha_revision = ahora
    solicitud.administrador_id = admin.id
    solicitud.actualizada_en = ahora

    # 7. Historial + auditoría + notificaciones
    _agregar_historial(
        db, solicitud, "aprobada",
        f"Solicitud aprobada por {admin.nombre}. Refugio y cuenta creados. "
        f"Enlace para crear contraseña enviado (24 h).",
        admin.id,
    )
    registrar_auditoria(
        db, admin.id, "aprobar_solicitud_refugio", "solicitudes_refugio",
        solicitud.id, f"Aprobado: {solicitud.nombre_refugio} -> usuario {username}",
    )
    notificar_admins(
        db,
        tipo="nuevo_refugio",
        mensaje=f"✅ Solicitud aprobada: {solicitud.nombre_refugio}",
        enlace="/admin/refugios",
    )

    # 8. Enviar correo de bienvenida (no bloquea la transacción si falla)
    try:
        enviar_correo_aprobacion_refugio(
            email_destino=login_email,
            nombre_refugio=solicitud.nombre_refugio,
            username=username,
            enlace_crear_password=url_crear,
        )
    except Exception as exc:
        logger.error("Error enviando correo de aprobación a %s: %s", login_email, exc)

    return serialize_solicitud(solicitud, db, incluir_detalle=True)


def rechazar_solicitud(
    db: Session, solicitud: SolicitudRefugio, admin: Usuario, motivo: str
) -> dict:
    """Rechaza la solicitud. `motivo` es obligatorio."""
    motivo = (motivo or "").strip()
    if not motivo:
        raise ValueError("El motivo del rechazo es obligatorio")

    if solicitud.estado in ("aprobada", "rechazada"):
        raise ValueError(f"No se puede rechazar una solicitud en estado '{solicitud.estado}'")

    ahora = datetime.now(timezone.utc)
    solicitud.estado = "rechazada"
    solicitud.motivo_rechazo = motivo
    solicitud.fecha_revision = ahora
    solicitud.administrador_id = admin.id
    solicitud.actualizada_en = ahora

    _agregar_historial(
        db, solicitud, "rechazada",
        f"Solicitud rechazada por {admin.nombre}. Motivo: {motivo}",
        admin.id,
    )
    registrar_auditoria(
        db, admin.id, "rechazar_solicitud_refugio", "solicitudes_refugio",
        solicitud.id, f"Rechazado: {solicitud.nombre_refugio}",
    )

    try:
        enviar_correo_rechazo_refugio(
            email_destino=(solicitud.email_contacto or solicitud.representante_email),
            nombre_refugio=solicitud.nombre_refugio,
            motivo=motivo,
        )
    except Exception as exc:
        logger.error("Error enviando correo de rechazo: %s", exc)

    return serialize_solicitud(solicitud, db, incluir_detalle=True)


def solicitar_informacion(
    db: Session, solicitud: SolicitudRefugio, admin: Usuario, mensaje: str
) -> dict:
    """Solicita información adicional. `mensaje` es obligatorio."""
    mensaje = (mensaje or "").strip()
    if not mensaje:
        raise ValueError("El mensaje de solicitud de información es obligatorio")

    if solicitud.estado not in ("pendiente", "informacion_solicitada"):
        raise ValueError(f"No se puede solicitar información en estado '{solicitud.estado}'")

    ahora = datetime.now(timezone.utc)
    solicitud.estado = "informacion_solicitada"
    solicitud.mensaje_informacion = mensaje
    solicitud.fecha_revision = ahora
    solicitud.administrador_id = admin.id
    solicitud.actualizada_en = ahora

    _agregar_historial(
        db, solicitud, "informacion_solicitada",
        f"Información adicional solicitada por {admin.nombre}: {mensaje}",
        admin.id,
    )
    registrar_auditoria(
        db, admin.id, "solicitar_informacion_refugio", "solicitudes_refugio",
        solicitud.id, f"Info adicional: {solicitud.nombre_refugio}",
    )

    try:
        enviar_correo_solicitud_informacion(
            email_destino=(solicitud.email_contacto or solicitud.representante_email),
            nombre_refugio=solicitud.nombre_refugio,
            mensaje=mensaje,
            enlace_completar=f"{settings.FRONTEND_URL}/registrar-refugio?completar={solicitud.token_consulta}",
        )
    except Exception as exc:
        logger.error("Error enviando correo de solicitud de información: %s", exc)

    return serialize_solicitud(solicitud, db, incluir_detalle=True)


def verificar_documento(
    db: Session, documento: SolicitudRefugioDocumento, admin: Usuario, estado: str
) -> dict:
    """Marca el estado de verificación de un documento y registra en el historial."""
    if estado not in ESTADOS_VERIFICACION_DOC:
        raise ValueError(f"Estado de verificación inválido: {estado}")

    documento.estado_verificacion = estado
    solicitud = db.query(SolicitudRefugio).filter(
        SolicitudRefugio.id == documento.solicitud_id
    ).first()
    if solicitud:
        etiquetas = {
            "verificado": "Verificado",
            "no_valido": "No válido",
            "pendiente": "Pendiente",
        }
        _agregar_historial(
            db, solicitud, "verificacion_documento",
            f"Documento '{documento.categoria}' marcado como {etiquetas.get(estado, estado)} "
            f"por {admin.nombre}.",
            admin.id,
        )
    return serialize_documento(documento)
