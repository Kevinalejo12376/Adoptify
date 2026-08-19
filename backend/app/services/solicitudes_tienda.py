"""Servicio del flujo de solicitudes de registro de Tiendas Aliadas.

Replica la estructura del módulo de solicitudes de Refugios para reutilizar la
misma infraestructura (revisión manual, historial, documentos, enlace seguro
para crear contraseña) sin duplicar lógica de negocio.

Responsabilidades:
  - Serializar solicitudes para la API.
  - Aprobar: crear usuario (rol tienda_aliada), tienda, registro de Super
    Administrador en tienda_usuarios, username único, enlace seguro para crear
    contraseña (24 h), enviar correo y registrar historial.
  - Rechazar: guardar motivo, cambiar estado y enviar correo.
  - Solicitar información: guardar mensaje, cambiar estado y enviar correo.
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
    enviar_correo_aprobacion_tienda,
    enviar_correo_solicitud_informacion_tienda,
    enviar_correo_rechazo_tienda,
)
from app.core.notificaciones import notificar_admins, registrar_auditoria
from app.core.security import get_password_hash
from app.models.usuario import Usuario
from app.models.tienda import Tienda, TiendaUsuario
from app.models.catalogos import Rol
from app.models.solicitud_refugio import EnlaceCreacionPassword
from app.models.solicitud_tienda import (
    SolicitudTienda,
    SolicitudTiendaDocumento,
    SolicitudTiendaHistorial,
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
    return base or "tienda"


def _normalizar(texto: Optional[str]) -> str:
    """Quita acentos, espacios y caracteres especiales para generar usernames."""
    import unicodedata
    if not texto:
        return ""
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return texto


def generar_username(db: Session, nombre_tienda: str) -> str:
    """Genera un nombre de usuario único a partir del nombre de la tienda."""
    base = _normalizar(nombre_tienda or "").lower().replace(" ", "")
    base = "".join(c for c in base if c.isalnum())
    if not base:
        base = "tienda"
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
    solicitud: SolicitudTienda,
    accion: str,
    descripcion: str,
    administrador_id: Optional[int] = None,
) -> SolicitudTiendaHistorial:
    h = SolicitudTiendaHistorial(
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


def _subir_documento(db: Session, solicitud_id: int, payload) -> SolicitudTiendaDocumento:
    """Sube un documento (base64) a Cloudinary y lo guarda en la BD."""
    from app.services.cloudinary_service import _subir_a_cloudinary

    contenido = payload.contenido_base64 or ""
    if "," in contenido and contenido.lstrip().startswith("data:"):
        contenido = contenido.split(",", 1)[1]

    carpeta = "solicitudes-tienda/documentos"
    try:
        subida = _subir_a_cloudinary(contenido, carpeta, payload.categoria)
    except Exception as exc:
        logger.exception("[solicitudes_tienda] Error subiendo documento a Cloudinary: %s", exc)
        raise

    return SolicitudTiendaDocumento(
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

def serialize_documento(doc: SolicitudTiendaDocumento) -> dict:
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


def serialize_historial(h: SolicitudTiendaHistorial, db: Session) -> dict:
    return {
        "id": h.id,
        "solicitud_id": h.solicitud_id,
        "accion": h.accion,
        "descripcion": h.descripcion,
        "administrador_id": h.administrador_id,
        "administrador_nombre": _nombre_admin(db, h.administrador_id),
        "creado_en": h.creado_en.isoformat() if h.creado_en else None,
    }


def serialize_solicitud(s: SolicitudTienda, db: Session, incluir_detalle: bool = True) -> dict:
    """Serializa una solicitud para la API. Evita lazy loading problemático."""
    documentos = (
        db.query(SolicitudTiendaDocumento)
        .filter(SolicitudTiendaDocumento.solicitud_id == s.id)
        .order_by(SolicitudTiendaDocumento.id.asc())
        .all()
    )
    historial = (
        db.query(SolicitudTiendaHistorial)
        .filter(SolicitudTiendaHistorial.solicitud_id == s.id)
        .order_by(SolicitudTiendaHistorial.creado_en.asc())
        .all()
    )
    data = {
        "id": s.id,
        "nombre_tienda": s.nombre_tienda,
        "logo_url": s.logo_url,
        "descripcion": s.descripcion,
        "email_contacto": s.email_contacto,
        "telefono": s.telefono,
        "departamento": s.departamento,
        "ciudad": s.ciudad,
        "municipio": s.municipio,
        "direccion": s.direccion,
        "website": s.website,
        "horario_semana": s.horario_semana,
        "horario_fin_semana": s.horario_fin_semana,
        "facebook": s.facebook,
        "instagram": s.instagram,
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
# Acciones del administrador
# ---------------------------------------------------------------------------

def aprobar_solicitud(db: Session, solicitud: SolicitudTienda, admin: Usuario) -> dict:
    """Aprueba la solicitud: crea usuario (rol tienda_aliada), tienda, registro
    de Super Administrador, enlace seguro para crear contraseña (24 h), envía el
    correo de bienvenida y registra todo en el historial.

    Nota: no hace commit; el llamador controla la transacción.
    """
    if solicitud.estado not in ("pendiente", "informacion_solicitada"):
        raise ValueError(f"No se puede aprobar una solicitud en estado '{solicitud.estado}'")

    # 1. El correo de inicio de sesión es el CORREO DE LA TIENDA (contacto);
    #    si no se indicó, se usa el del representante como respaldo.
    login_email = (solicitud.email_contacto or solicitud.representante_email or "").strip().lower()
    if not login_email:
        raise ValueError("No se pudo determinar el correo de acceso de la tienda")

    existente = db.query(Usuario).filter(Usuario.email == login_email).first()
    if existente:
        raise ValueError(
            "El correo de la tienda ya está registrado en la plataforma. "
            "No se puede crear la cuenta automáticamente."
        )

    # 2. Resolver rol tienda_aliada
    rol_tienda = db.query(Rol).filter(Rol.codigo == "tienda_aliada").first()
    if not rol_tienda:
        raise ValueError("El rol 'tienda_aliada' no existe en el catálogo")

    # 3. Crear usuario (sin contraseña; se creará por el enlace seguro)
    username = generar_username(db, solicitud.nombre_tienda)
    user = Usuario(
        nombre=(solicitud.representante_nombre or "Representante").strip(),
        apellido=(solicitud.representante_apellido or "").strip() or None,
        username=username,
        email=login_email,
        hashed_password=get_password_hash(secrets.token_urlsafe(16)),
        rol_id=rol_tienda.id,
        telefono=solicitud.representante_telefono,
        ubicacion=solicitud.ciudad,
        activo=True,
    )
    db.add(user)
    db.flush()

    # 4. Crear tienda asociada
    slug = _slugify(solicitud.nombre_tienda)
    if db.query(Tienda).filter(Tienda.slug == slug).first():
        slug = f"{slug}-{user.id}"
    tienda = Tienda(
        usuario_id=user.id,
        nombre=solicitud.nombre_tienda,
        slug=slug,
        logo_url=solicitud.logo_url,
        descripcion=solicitud.descripcion,
        ubicacion=solicitud.ciudad or solicitud.municipio,
        ciudad=solicitud.ciudad or solicitud.municipio,
        direccion=solicitud.direccion,
        telefono=solicitud.telefono,
        email=solicitud.email_contacto or login_email,
        website=solicitud.website,
        facebook=solicitud.facebook,
        instagram=solicitud.instagram,
        horario_semana=solicitud.horario_semana,
        horario_fin_semana=solicitud.horario_fin_semana,
        estado="activa",
    )
    db.add(tienda)
    db.flush()

    # 4b. Registrar al representante como Super Administrador de la tienda
    db.add(TiendaUsuario(
        tienda_id=tienda.id,
        usuario_id=user.id,
        tipo="super_admin",
        activo=True,
        creado_por=admin.id,
    ))

    # 5. Generar enlace seguro para crear contraseña (24 h)
    enlace = crear_enlace_password(db, user.id)
    url_crear = f"{settings.FRONTEND_URL}/crear-password/{enlace.token}"

    # 6. Actualizar la solicitud
    ahora = datetime.now(timezone.utc)
    solicitud.estado = "aprobada"
    solicitud.usuario_creado_id = user.id
    solicitud.tienda_creado_id = tienda.id
    solicitud.username_generado = username
    solicitud.fecha_aprobacion = ahora
    solicitud.fecha_revision = ahora
    solicitud.administrador_id = admin.id
    solicitud.actualizada_en = ahora

    # 7. Historial + auditoría + notificaciones
    _agregar_historial(
        db, solicitud, "aprobada",
        f"Solicitud aprobada por {admin.nombre}. Tienda y cuenta creados. "
        f"Enlace para crear contraseña enviado (24 h).",
        admin.id,
    )
    registrar_auditoria(
        db, admin.id, "aprobar_solicitud_tienda", "solicitudes_tienda",
        solicitud.id, f"Aprobado: {solicitud.nombre_tienda} -> usuario {username}",
    )
    notificar_admins(
        db,
        tipo="nueva_tienda",
        mensaje=f"✅ Solicitud aprobada: {solicitud.nombre_tienda}",
        enlace="/admin/tiendas",
    )

    # 8. Enviar correo de bienvenida (no bloquea la transacción si falla)
    try:
        enviar_correo_aprobacion_tienda(
            email_destino=login_email,
            nombre_tienda=solicitud.nombre_tienda,
            username=username,
            enlace_crear_password=url_crear,
        )
    except Exception as exc:
        logger.error("Error enviando correo de aprobación a %s: %s", login_email, exc)

    return serialize_solicitud(solicitud, db, incluir_detalle=True)


def rechazar_solicitud(
    db: Session, solicitud: SolicitudTienda, admin: Usuario, motivo: str
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
        db, admin.id, "rechazar_solicitud_tienda", "solicitudes_tienda",
        solicitud.id, f"Rechazado: {solicitud.nombre_tienda}",
    )

    try:
        enviar_correo_rechazo_tienda(
            email_destino=(solicitud.email_contacto or solicitud.representante_email),
            nombre_tienda=solicitud.nombre_tienda,
            motivo=motivo,
        )
    except Exception as exc:
        logger.error("Error enviando correo de rechazo: %s", exc)

    return serialize_solicitud(solicitud, db, incluir_detalle=True)


def solicitar_informacion(
    db: Session, solicitud: SolicitudTienda, admin: Usuario, mensaje: str
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
        db, admin.id, "solicitar_informacion_tienda", "solicitudes_tienda",
        solicitud.id, f"Info adicional: {solicitud.nombre_tienda}",
    )

    try:
        enviar_correo_solicitud_informacion_tienda(
            email_destino=(solicitud.email_contacto or solicitud.representante_email),
            nombre_tienda=solicitud.nombre_tienda,
            mensaje=mensaje,
            enlace_completar=f"{settings.FRONTEND_URL}/registrar-tienda?completar={solicitud.token_consulta}",
        )
    except Exception as exc:
        logger.error("Error enviando correo de solicitud de información: %s", exc)

    return serialize_solicitud(solicitud, db, incluir_detalle=True)


def verificar_documento(
    db: Session, documento: SolicitudTiendaDocumento, admin: Usuario, estado: str
) -> dict:
    """Marca el estado de verificación de un documento y registra en el historial."""
    if estado not in ESTADOS_VERIFICACION_DOC:
        raise ValueError(f"Estado de verificación inválido: {estado}")

    documento.estado_verificacion = estado
    solicitud = db.query(SolicitudTienda).filter(
        SolicitudTienda.id == documento.solicitud_id
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
