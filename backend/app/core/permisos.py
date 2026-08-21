# ============================================================
# Sistema centralizado de permisos (RBAC) para el modulo Tienda
# ============================================================
# Toda la autorizacion del modulo Tienda se resuelve aqui, consultando
# SIEMPRE la base de datos (catalogo de permisos + asignaciones por usuario).
# Nunca se hardcodean permisos en los endpoints: se usan las dependencias
# ``requiere_permiso(...)`` y ``requiere_super_admin_tienda()``.
#
# Jerarquia:
#   - super_admin (representante de la tienda): tiene TODOS los permisos
#     activos del catalogo de forma implicita.
#   - admin: unicamente los permisos asignados en tienda_usuario_permisos.
# pyrefly: ignore [missing-import]
from fastapi import Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import get_current_tienda
from app.models.usuario import Usuario
from app.models.tienda import Tienda, TiendaPermiso, TiendaUsuario, TiendaUsuarioPermiso


def obtener_tienda_usuario(db: Session, current_user: Usuario):
    """Devuelve el registro de pertenencia (TiendaUsuario) del usuario.

    Si la tienda es pre-existente y aun no tiene registro (migracion pendiente),
    se crea automaticamente el registro ``super_admin`` del representante
    (Tienda.usuario_id) para que no quede fuera del sistema de permisos.
    """
    if not current_user:
        return None

    tu = (
        db.query(TiendaUsuario)
        .filter(TiendaUsuario.usuario_id == current_user.id)
        .order_by(TiendaUsuario.id.desc())
        .first()
    )
    if tu:
        return tu

    # Backfill de compatibilidad: el representante de una tienda existente
    # pasa a ser Super Administrador de forma automatica (idempotente).
    tienda = db.query(Tienda).filter(Tienda.usuario_id == current_user.id).first()
    if tienda:
        tu = TiendaUsuario(
            tienda_id=tienda.id,
            usuario_id=current_user.id,
            tipo="super_admin",
            activo=True,
        )
        db.add(tu)
        try:
            db.commit()
            db.refresh(tu)
        except Exception:
            db.rollback()
            return None
        return tu
    return None


def es_super_admin(db: Session, current_user: Usuario) -> bool:
    """True si el usuario es Super Administrador activo de su tienda."""
    tu = obtener_tienda_usuario(db, current_user)
    return bool(tu and tu.tipo == "super_admin" and tu.activo)


def es_miembro_activo(db: Session, current_user: Usuario) -> bool:
    """True si el usuario es miembro activo (super admin o admin) de una tienda."""
    tu = obtener_tienda_usuario(db, current_user)
    return bool(tu and tu.activo)


def obtener_codigos_permisos(db: Session, current_user: Usuario):
    """Set de codigos de permiso del usuario dentro de su tienda.

    - super_admin: todos los permisos activos del catalogo.
    - admin: solo los asignados en la base de datos.
    """
    tu = obtener_tienda_usuario(db, current_user)
    if not tu or not tu.activo:
        return set()

    if tu.tipo == "super_admin":
        filas = (
            db.query(TiendaPermiso.codigo)
            .filter(TiendaPermiso.activo == True)  # noqa: E712
            .all()
        )
        return {codigo for (codigo,) in filas}

    filas = (
        db.query(TiendaPermiso.codigo)
        .join(TiendaUsuarioPermiso, TiendaUsuarioPermiso.permiso_id == TiendaPermiso.id)
        .filter(
            TiendaUsuarioPermiso.tienda_usuario_id == tu.id,
            TiendaPermiso.activo == True,  # noqa: E712
        )
        .all()
    )
    return {codigo for (codigo,) in filas}


def tiene_permiso(db: Session, current_user: Usuario, codigo: str) -> bool:
    """Consulta si el usuario posee un permiso especifico (desde la BD)."""
    return codigo in obtener_codigos_permisos(db, current_user)


def registrar_ultimo_acceso(db: Session, current_user: Usuario):
    """Actualiza el ultimo_acceso del miembro (best effort, sin romper la request)."""
    try:
        tu = obtener_tienda_usuario(db, current_user)
        if tu:
            from datetime import datetime, timezone
            tu.ultimo_acceso = datetime.now(timezone.utc)
            db.commit()
    except Exception:
        db.rollback()


def requiere_permiso(codigo: str):
    """Dependencia reutilizable: exige el permiso indicado al usuario autenticado.

    Ejemplo::

        @router.get("/productos")
        def mis_productos(
            current_user: Usuario = Depends(requiere_permiso("productos.ver")),
            db: Session = Depends(get_db),
        ):
            ...

    Si el usuario no posee el permiso responde 403 sin ejecutar la operacion.
    """
    def checker(
        current_user: Usuario = Depends(get_current_tienda),
        db: Session = Depends(get_db),
    ) -> Usuario:
        if not es_miembro_activo(db, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes una tienda activa asociada",
            )
        if not tiene_permiso(db, current_user, codigo):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta accion",
            )
        return current_user
    return checker


def requiere_super_admin_tienda(
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
) -> Usuario:
    """Dependencia: exige que el usuario autenticado sea Super Administrador.

    Solo el Super Administrador puede: crear/editar/eliminar administradores,
    gestionar permisos, cambiar representante y administrar la configuracion
    critica de la tienda.
    """
    if not es_super_admin(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el Super Administrador puede realizar esta accion",
        )
    return current_user
