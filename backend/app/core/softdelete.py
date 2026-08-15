"""Utilidades de borrado lógico (soft delete).

En lugar de eliminar la fila de la base de datos, el soft delete marca
``activo = False`` y guarda la fecha en ``eliminado_en``. Esto conserva el
historial (solicitudes de adopción, reseñas, favoritos, kardex, pedidos,
donaciones, comentarios) y permite restaurar el registro si es necesario.

Uso:
    from app.core.softdelete import soft_delete, liberar_slug
    producto = db.query(Producto).filter(Producto.id == id).first()
    liberar_slug(db, tienda)          # libera unicidad (slug/email) si aplica
    soft_delete(db, producto)         # marca activo=False y hace commit
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session


def _aplicar_banderas(obj) -> None:
    """Marca las columnas de soft delete de un objeto ORM (si existen)."""
    if hasattr(obj, "activo"):
        obj.activo = False
    if hasattr(obj, "eliminado_en"):
        obj.eliminado_en = datetime.now(timezone.utc)


def soft_delete(db: Session, obj) -> None:
    """Marca un objeto como eliminado lógicamente y hace commit."""
    _aplicar_banderas(obj)
    db.add(obj)
    db.commit()


def soft_delete_no_commit(db: Session, obj) -> None:
    """Igual que soft_delete pero sin commit (para agrupar en una transacción)."""
    _aplicar_banderas(obj)
    db.add(obj)


def liberar_slug(db: Session, obj, campo_slug: str = "slug") -> None:
    """Renombra el slug de un objeto eliminado para liberar la unicidad.

    Al desactivar un refugio/tienda conservamos su slug histórico pero con un
    sufijo ``-eliminado-<id>`` para que un registro nuevo pueda reutilizar el
    slug original (la columna es UNIQUE).
    """
    slug = getattr(obj, campo_slug, None)
    if slug and obj.id:
        setattr(obj, campo_slug, f"{slug}-eliminado-{obj.id}")
        db.add(obj)


def liberar_email(db: Session, obj) -> None:
    """Renombra el email/username de un usuario eliminado para liberar unicidad.

    La columna ``email`` de usuarios es UNIQUE; al desactivar una cuenta le
    agregamos un sufijo para permitir registrar un correo igual más adelante.
    """
    email = getattr(obj, "email", None)
    if email and obj.id and not email.endswith("-eliminado-"):
        setattr(obj, "email", f"{email}-eliminado-{obj.id}")
        db.add(obj)
