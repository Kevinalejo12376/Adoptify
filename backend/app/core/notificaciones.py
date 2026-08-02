"""Helpers para crear notificaciones y registros de auditoria.
Agregan filas a la sesion; el commit lo hace el endpoint que las llama."""
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.models.catalogos import Rol
from app.models.soporte import Notificacion, Auditoria

ROLES_ADMIN = ("administrador", "administrador_principal")


def crear_notificacion(db: Session, usuario_id: int, tipo: str, mensaje: str, enlace: str = None):
    """Crea una notificacion para un usuario especifico."""
    db.add(Notificacion(usuario_id=usuario_id, tipo=tipo, mensaje=mensaje, enlace=enlace))


def notificar_admins(db: Session, tipo: str, mensaje: str, enlace: str = None):
    """Crea una notificacion para todos los administradores."""
    admins = (
        db.query(Usuario.id)
        .join(Rol, Rol.id == Usuario.rol_id)
        .filter(Rol.codigo.in_(ROLES_ADMIN))
        .all()
    )
    for (uid,) in admins:
        db.add(Notificacion(usuario_id=uid, tipo=tipo, mensaje=mensaje, enlace=enlace))


def registrar_auditoria(db: Session, usuario_id, accion: str, entidad: str = None, entidad_id=None, detalle: str = None):
    """Registra una accion en la auditoria del sistema."""
    db.add(Auditoria(
        usuario_id=usuario_id,
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        detalle=detalle,
    ))
