# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.database import Base


class SolicitudRefugio(Base):
    """Solicitud de registro de un refugio enviada desde el formulario público.

    Estados posibles (columna `estado`):
      - pendiente               -> recién enviada, esperando revisión
      - informacion_solicitada  -> el administrador pidió información adicional
      - aprobada                -> el refugio fue creado (usuario + refugio)
      - rechazada               -> rechazada (requiere motivo)
    """
    __tablename__ = "solicitudes_refugio"

    id = Column(Integer, primary_key=True, index=True)

    # ---- Información del refugio (Paso 1) ----
    nombre_refugio = Column(String(150), nullable=False)
    logo_url = Column(Text)
    descripcion = Column(Text)
    email_contacto = Column(String(255))
    telefono = Column(String(30))
    departamento = Column(String(150))
    ciudad = Column(String(150))
    municipio = Column(String(150))
    direccion = Column(String(200))
    website = Column(String(150))
    anio_fundacion = Column(Integer)
    facebook = Column(String(120))
    instagram = Column(String(120))
    tiktok = Column(String(120))

    # ---- Información del representante (Paso 2) ----
    representante_nombre = Column(String(100), nullable=False)
    representante_apellido = Column(String(100))
    representante_email = Column(String(255), nullable=False, index=True)
    representante_telefono = Column(String(30))

    # ---- Gestión (Paso 3 / Paso 4) ----
    acepto_veracidad = Column(String(20))          # 'true' | 'false'
    autorizo_verificacion = Column(String(20))     # 'true' | 'false'
    estado = Column(String(30), nullable=False, default="pendiente", index=True)

    # Rechazo / información adicional
    motivo_rechazo = Column(Text)
    mensaje_informacion = Column(Text)
    fecha_revision = Column(DateTime(timezone=True))
    administrador_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))

    # Resultado de la aprobación
    usuario_creado_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    refugio_creado_id = Column(Integer, ForeignKey("refugios.id", ondelete="SET NULL"))
    username_generado = Column(String(50))
    fecha_aprobacion = Column(DateTime(timezone=True))

    # Token público para consultar el estado / completar información solicitada
    token_consulta = Column(String(64), unique=True, index=True)

    creada_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizada_en = Column(DateTime(timezone=True), onupdate=func.now())

    administrador = relationship("Usuario", foreign_keys=[administrador_id])
    usuario_creado = relationship("Usuario", foreign_keys=[usuario_creado_id])
    refugio_creado = relationship("Refugio", foreign_keys=[refugio_creado_id])
    documentos = relationship(
        "SolicitudRefugioDocumento",
        back_populates="solicitud",
        cascade="all, delete-orphan",
    )
    historial = relationship(
        "SolicitudRefugioHistorial",
        back_populates="solicitud",
        cascade="all, delete-orphan",
        order_by="SolicitudRefugioHistorial.creado_en.asc()",
    )


class SolicitudRefugioDocumento(Base):
    """Documento/imagen adjunto a una solicitud de registro de refugio."""
    __tablename__ = "solicitudes_refugio_documentos"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(
        Integer, ForeignKey("solicitudes_refugio.id", ondelete="CASCADE"), nullable=False
    )
    # Categoría: identidad | fachada | fotografias | instalaciones | animales |
    #            camara_comercio | nit | personeria_juridica | certificado_fundacion | otros
    categoria = Column(String(40), nullable=False)
    # obligatorio | opcional
    tipo = Column(String(20), nullable=False, default="obligatorio")
    nombre_archivo = Column(String(255))
    url = Column(Text, nullable=False)
    public_id = Column(String(255))
    # Estado de verificación por el administrador: pendiente | verificado | no_valido
    estado_verificacion = Column(String(20), nullable=False, default="pendiente")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    solicitud = relationship("SolicitudRefugio", back_populates="documentos")


class SolicitudRefugioHistorial(Base):
    """Registro cronológico (timeline) de una solicitud de refugio."""
    __tablename__ = "solicitudes_refugio_historial"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(
        Integer, ForeignKey("solicitudes_refugio.id", ondelete="CASCADE"), nullable=False
    )
    # creada | informacion_solicitada | informacion_completada | aprobada |
    # rechazada | observacion | verificacion_documento
    accion = Column(String(40), nullable=False)
    descripcion = Column(Text)
    administrador_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    solicitud = relationship("SolicitudRefugio", back_populates="historial")
    administrador = relationship("Usuario", foreign_keys=[administrador_id])


class EnlaceCreacionPassword(Base):
    """Enlace seguro (token) para que el refugio aprobado cree su contraseña.

    El enlace vence a las 24 horas de generado y solo puede usarse una vez.
    """
    __tablename__ = "enlaces_creacion_password"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token = Column(String(64), unique=True, nullable=False, index=True)
    usado = Column(String(20), nullable=False, default="activo")  # activo | usado | expirado
    expira_en = Column(DateTime(timezone=True), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario")
