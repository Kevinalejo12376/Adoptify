# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    username = Column(String(50), unique=True, index=True)
    tipo_documento_id = Column(Integer, ForeignKey("tipos_documento.id"))
    numero_documento = Column(String(30))
    telefono = Column(String(30))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(Text, nullable=False)
    google_id = Column(String(255), nullable=True, index=True)
    rol_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    ubicacion = Column(String(150))
    bio = Column(Text)
    website = Column(String(150))
    avatar_url = Column(Text)
    # ID público del recurso en Cloudinary (para poder eliminar la foto anterior
    # al cambiarla y no dejar imágenes huérfanas). Sigue el patrón de
    # tiendas.logo_public_id.
    avatar_public_id = Column(String(255))
    cover_url = Column(Text)
    twitter = Column(String(120))
    instagram = Column(String(120))
    verificado = Column(Boolean, nullable=False, default=False)
    perfil_completo = Column(Boolean, nullable=False, default=False)
    # Soft delete: 'activo' ya existía para desactivar cuentas; 'eliminado_en'
    # registra cuándo se desactiva la cuenta de forma definitiva.
    eliminado_en = Column(DateTime(timezone=True))
    # Bloqueo por intentos fallidos de inicio de sesión: tras 3 fallos la
    # cuenta queda bloqueada durante 15 minutos ('bloqueado_hasta') y se
    # habilita automáticamente al vencer ese tiempo.
    intentos_fallidos = Column(Integer, nullable=False, default=0)
    bloqueado_hasta = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    rol = relationship("Rol", lazy="joined")
    tipo_documento = relationship("TipoDocumento", lazy="joined")
    refugio = relationship(
        "Refugio",
        back_populates="usuario",
        uselist=False,
        cascade="all, delete-orphan",
    )
    # Si este usuario es empleado de un refugio (rol 'empleado_refugio').
    # 'foreign_keys' desambigua: refugio_empleados tiene dos FKs a usuarios
    # (usuario_id y creado_por); este lado usa usuario_id.
    refugio_empleado = relationship(
        "RefugioEmpleado",
        back_populates="usuario",
        uselist=False,
        foreign_keys="RefugioEmpleado.usuario_id",
    )
    solicitudes = relationship("SolicitudAdopcion", back_populates="usuario")

    @property
    def rol_codigo(self) -> str:
        """Codigo del rol ('usuario' | 'refugio')."""
        return self.rol.codigo if self.rol else None
