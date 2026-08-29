# pyrefly: ignore [missing-import]
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


class Refugio(Base):
    __tablename__ = "refugios"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    slug = Column(String(160), unique=True)
    logo_url = Column(Text)
    descripcion = Column(Text)
    ubicacion = Column(String(150))
    departamento = Column(String(150))
    municipio = Column(String(150))
    direccion = Column(String(200))
    telefono = Column(String(30))
    email = Column(String(255))
    facebook = Column(String(120))
    instagram = Column(String(120))
    tiktok = Column(String(120))
    website = Column(String(150))
    anio_fundacion = Column(Integer)
    total_rescatados = Column(Integer, nullable=False, default=0)
    total_voluntarios = Column(Integer, nullable=False, default=0)
    verificado = Column(Boolean, nullable=False, default=False)
    tienda_habilitada = Column(Boolean, nullable=False, default=False)
    # Soft delete: activo=False oculta el refugio del público conservando
    # sus mascotas, empleados, productos y donaciones.
    activo = Column(Boolean, nullable=False, default=True)
    eliminado_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="refugio")
    mascotas = relationship("Mascota", back_populates="refugio", cascade="all, delete-orphan")
    # Productos publicados por el refugio en el marketplace.
    productos = relationship("Producto", back_populates="refugio")
    # Galería de fotos del refugio (secure_url de Cloudinary).
    imagenes = relationship(
        "RefugioImagen",
        back_populates="refugio",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="RefugioImagen.orden",
    )
    # Equipo del refugio: usuarios con rol 'empleado_refugio' vinculados a este refugio.
    empleados = relationship(
        "RefugioEmpleado",
        back_populates="refugio",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class RefugioImagen(Base):
    """Imagen de la galería del refugio (almacenada en Cloudinary)."""
    __tablename__ = "refugio_imagenes"

    id = Column(Integer, primary_key=True, index=True)
    refugio_id = Column(Integer, ForeignKey("refugios.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)          # secure_url de Cloudinary
    es_portada = Column(Boolean, nullable=False, default=False)
    orden = Column(Integer, nullable=False, default=0)

    refugio = relationship("Refugio", back_populates="imagenes")


class RefugioPermiso(Base):
    """Catálogo de permisos disponibles para los empleados de un refugio.

    Los permisos viven en la base de datos (no hardcoded). El representante
    selecciona cuáles asigna a cada empleado.
    """
    __tablename__ = "refugio_permisos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(80), unique=True, nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    modulo = Column(String(40), nullable=False, index=True)
    descripcion = Column(Text)
    activo = Column(Boolean, nullable=False, default=True)


class RefugioEmpleado(Base):
    """Vincula a un Usuario (rol 'empleado_refugio') con un Refugio.

    El representante se identifica por ``refugios.usuario_id`` (estructura
    existente); los empleados se registran aquí con sus permisos explícitos.
    """
    __tablename__ = "refugio_empleados"

    id = Column(Integer, primary_key=True, index=True)
    refugio_id = Column(Integer, ForeignKey("refugios.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("refugio_id", "usuario_id", name="uq_refugio_empleado"),
    )

    refugio = relationship("Refugio", back_populates="empleados")
    usuario = relationship("Usuario", foreign_keys=[usuario_id], back_populates="refugio_empleado")
    creador = relationship("Usuario", foreign_keys=[creado_por])
    permisos = relationship(
        "RefugioEmpleadoPermiso",
        back_populates="refugio_empleado",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class RefugioEmpleadoPermiso(Base):
    """Permisos específicos asignados a un empleado de refugio."""
    __tablename__ = "refugio_empleado_permisos"

    id = Column(Integer, primary_key=True, index=True)
    refugio_empleado_id = Column(
        Integer, ForeignKey("refugio_empleados.id", ondelete="CASCADE"), nullable=False
    )
    permiso_id = Column(
        Integer, ForeignKey("refugio_permisos.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "refugio_empleado_id", "permiso_id", name="uq_refugio_empleado_permiso"
        ),
    )

    refugio_empleado = relationship("RefugioEmpleado", back_populates="permisos")
    permiso = relationship("RefugioPermiso")
