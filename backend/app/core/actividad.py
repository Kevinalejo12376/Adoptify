"""Registro centralizado del Historial de Actividad del modulo Tienda Aliada.

Cada accion administrativa importante realizada dentro de una tienda se
persiste en la tabla ``tienda_actividades`` mediante ``registrar_actividad``.

Reglas de uso:
  - Se invoca DESDE EL BACKEND, solo cuando la accion ya se completo
    correctamente (despues del commit principal), para garantizar que el
    historial sea confiable y no registre operaciones fallidas.
  - Es "best effort": si falla el registro, no rompe la peticion original.
  - Los datos del usuario (nombre + rol) se capturan como snapshot para que el
    historial sea legible aun si la cuenta se elimina o se degrada.

Roles:
  - super_admin  -> "Representante"
  - admin        -> "Administrador"
"""
# pyrefly: ignore [missing-import]
import logging

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.tienda import TiendaActividad, TiendaUsuario

logger = logging.getLogger("actividad")


def rol_usuario_tienda(db: Session, usuario: Usuario) -> str:
    """Resuelve el rol visible del usuario dentro de su tienda."""
    if not usuario:
        return "Sistema"
    tu = (
        db.query(TiendaUsuario)
        .filter(TiendaUsuario.usuario_id == usuario.id)
        .order_by(TiendaUsuario.id.desc())
        .first()
    )
    if tu and tu.tipo == "super_admin":
        return "Representante"
    return "Administrador"


def registrar_actividad(
    db: Session,
    tienda_id: int,
    usuario: Usuario,
    tipo_accion: str,
    accion: str,
    elemento_tipo: str = None,
    elemento: str = None,
    detalle: str = None,
) -> None:
    """Persiste una entrada en el historial de actividad de la tienda.

    Args:
        db: sesion de base de datos.
        tienda_id: id de la tienda donde ocurrio la accion.
        usuario: usuario que ejecuto la accion (representante o admin).
        tipo_accion: codigo para filtros, ej: 'producto.crear', 'donacion.crear'.
        accion: descripcion legible, ej: 'Creo el producto'.
        elemento_tipo: tipo de elemento afectado, ej: 'producto', 'administrador'.
        elemento: nombre del elemento afectado (para mostrarlo en el historial).
        detalle: informacion adicional opcional.
    """
    try:
        nombre = (
            f"{usuario.nombre} {usuario.apellido or ''}".strip()
            if usuario else "Sistema"
        )
        rol = rol_usuario_tienda(db, usuario) if usuario else "Sistema"
        db.add(TiendaActividad(
            tienda_id=tienda_id,
            usuario_id=usuario.id if usuario else None,
            usuario_nombre=nombre,
            rol_usuario=rol,
            tipo_accion=tipo_accion,
            accion=accion,
            elemento_tipo=elemento_tipo,
            elemento=elemento,
            detalle=detalle,
        ))
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.warning("[actividad] No se pudo registrar la actividad (%s): %s", tipo_accion, exc)
