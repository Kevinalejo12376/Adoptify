# pyrefly: ignore [missing-import]
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, DateTime, ForeignKey, Boolean, func, UniqueConstraint,
)
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Tienda(Base):
    __tablename__ = "tiendas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    nombre = Column(String(150), nullable=False)
    slug = Column(String(160), unique=True)
    descripcion = Column(Text)
    ubicacion = Column(String(150))
    ciudad = Column(String(150))
    direccion = Column(String(255))
    logo_url = Column(Text)
    # ID público del recurso en Cloudinary (para poder eliminarlo sin huérfanas).
    logo_public_id = Column(String(255))
    estado = Column(String(20), nullable=False, default="activa")
    telefono = Column(String(30))
    email = Column(String(255))
    website = Column(String(150))
    facebook = Column(String(120))
    instagram = Column(String(120))
    horario_semana = Column(String(120))
    horario_fin_semana = Column(String(120))
    rating = Column(Numeric(2, 1), nullable=False, default=0)
    # Soft delete: activo=False desactiva la tienda conservando su historial
    # (productos, pedidos, donaciones, actividades, PQRS).
    activo = Column(Boolean, nullable=False, default=True)
    eliminado_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", backref="tienda", uselist=False)
    productos = relationship("Producto", back_populates="tienda")
    movimientos_kardex = relationship("MovimientoKardex", back_populates="tienda")
    # Miembros de la tienda (Super Administrador + Administradores)
    miembros = relationship(
        "TiendaUsuario",
        back_populates="tienda",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    # Galería de imágenes de la tienda (Fachada, instalaciones, productos).
    imagenes = relationship(
        "TiendaImagen",
        back_populates="tienda",
        cascade="all, delete-orphan",
        order_by="TiendaImagen.orden",
    )


class TiendaImagen(Base):
    """Imagen de la galería de una tienda (Fachada, instalaciones, productos)."""
    __tablename__ = "tienda_imagenes"

    id = Column(Integer, primary_key=True, index=True)
    tienda_id = Column(Integer, ForeignKey("tiendas.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    public_id = Column(String(255))
    categoria = Column(String(40))
    es_portada = Column(Boolean, nullable=False, default=False)
    orden = Column(Integer, nullable=False, default=0)

    tienda = relationship("Tienda", back_populates="imagenes")


class TiendaPermiso(Base):
    """Catalogo de permisos disponibles para los administradores de tienda.

    Los permisos viven en la base de datos (no hardcoded) y se cargan de forma
    dinamica. Para agregar un permiso nuevo basta con insertar una fila aqui
    (o agregarla al seed), sin tocar la logica existente.
    """
    __tablename__ = "tienda_permisos"

    id = Column(Integer, primary_key=True, index=True)
    # Codigo unico e inmutable, ej: 'productos.crear'
    codigo = Column(String(80), unique=True, nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    # Modulo al que pertenece, ej: 'productos', 'pedidos'
    modulo = Column(String(40), nullable=False, index=True)
    descripcion = Column(Text)
    activo = Column(Boolean, nullable=False, default=True)


class TiendaUsuario(Base):
    """Vincula a un Usuario con una Tienda y define su jerarquia interna.

    - ``tipo = 'super_admin'``: el representante oficial de la tienda. Tiene
      control absoluto (todos los permisos) y es el unico que puede administrar
      administradores, permisos y la informacion del representante.
    - ``tipo = 'admin'``: administrador creado por el Super Administrador.
      Sus permisos se almacenan explicitamente en ``tienda_usuario_permisos``.
    """
    __tablename__ = "tienda_usuarios"

    id = Column(Integer, primary_key=True, index=True)
    tienda_id = Column(Integer, ForeignKey("tiendas.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    # 'super_admin' | 'admin'
    tipo = Column(String(20), nullable=False, default="admin", index=True)
    activo = Column(Boolean, nullable=False, default=True)
    # Quien creo este miembro (el super admin que lo dio de alta)
    creado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    ultimo_acceso = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    tienda = relationship("Tienda", back_populates="miembros")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    creador = relationship("Usuario", foreign_keys=[creado_por])
    permisos = relationship(
        "TiendaUsuarioPermiso",
        back_populates="tienda_usuario",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class TiendaUsuarioPermiso(Base):
    """Permisos especificos asignados a un administrador (tipo 'admin').

    El Super Administrador no necesita filas aqui: se le otorgan todos los
    permisos activos del catalogo de forma implicita.
    """
    __tablename__ = "tienda_usuario_permisos"

    id = Column(Integer, primary_key=True, index=True)
    tienda_usuario_id = Column(
        Integer, ForeignKey("tienda_usuarios.id", ondelete="CASCADE"), nullable=False
    )
    permiso_id = Column(
        Integer, ForeignKey("tienda_permisos.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "tienda_usuario_id", "permiso_id", name="uq_tienda_usuario_permiso"
        ),
    )

    tienda_usuario = relationship("TiendaUsuario", back_populates="permisos")
    permiso = relationship("TiendaPermiso")


class TiendaActividad(Base):
    """Historial de actividad de una tienda aliada.

    Registra las acciones administrativas importantes realizadas dentro de la
    tienda (crear/editar/eliminar productos, stock, administradores, permisos,
    imagenes, informacion de la tienda, configuracion, donaciones, PQRS, etc).

    El nombre y el rol del usuario se guardan como snapshot (``usuario_nombre``,
    ``rol_usuario``) para que el historial siga siendo legible aunque la cuenta
    se elimine o cambie de rol. ``tipo_accion`` permite filtrar por tipo.
    """
    __tablename__ = "tienda_actividades"

    id = Column(Integer, primary_key=True, index=True)
    tienda_id = Column(Integer, ForeignKey("tiendas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    # Snapshot del usuario que realizo la accion
    usuario_nombre = Column(String(200))
    # Representante | Administrador | Sistema
    rol_usuario = Column(String(30))
    # Codigo para filtros, ej: 'producto.crear', 'donacion.crear', 'pqrs.crear'
    tipo_accion = Column(String(60), nullable=False, index=True)
    # Descripcion legible, ej: 'Creo el producto'
    accion = Column(String(200), nullable=False)
    # Tipo de elemento afectado, ej: 'producto', 'administrador', 'imagen'
    elemento_tipo = Column(String(60))
    # Nombre del elemento afectado (para mostrarlo en el historial)
    elemento = Column(String(255))
    detalle = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    tienda = relationship("Tienda")
    usuario = relationship("Usuario")
