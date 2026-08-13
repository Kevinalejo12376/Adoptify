# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.database import Base


class SolicitudTienda(Base):
    """Solicitud de registro de una Tienda Aliada enviada desde el formulario público.

    Replica la estructura del flujo de solicitudes de Refugios para reutilizar la
    misma infraestructura (revisión manual, historial, documentos, enlace seguro).

    Estados posibles (columna `estado`):
      - pendiente               -> recién enviada, esperando revisión
      - informacion_solicitada  -> el administrador pidió información adicional
      - aprobada                -> la tienda fue creada (usuario + tienda)
      - rechazada               -> rechazada (requiere motivo)
    """
    __tablename__ = "solicitudes_tienda"

    id = Column(Integer, primary_key=True, index=True)

    # ---- Información de la tienda (Paso 1) ----
    nombre_tienda = Column(String(150), nullable=False)
    logo_url = Column(Text)
    descripcion = Column(Text)
    email_contacto = Column(String(255))
    telefono = Column(String(30))
    departamento = Column(String(150))
    ciudad = Column(String(150))
    municipio = Column(String(150))
    direccion = Column(String(200))
    website = Column(String(150))
    horario_semana = Column(String(120))
    horario_fin_semana = Column(String(120))
    facebook = Column(String(120))
    instagram = Column(String(120))

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
    tienda_creado_id = Column(Integer, ForeignKey("tiendas.id", ondelete="SET NULL"))
    username_generado = Column(String(50))
    fecha_aprobacion = Column(DateTime(timezone=True))

    # Token público para consultar el estado / completar información solicitada
    token_consulta = Column(String(64), unique=True, index=True)

    creada_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizada_en = Column(DateTime(timezone=True), onupdate=func.now())

    administrador = relationship("Usuario", foreign_keys=[administrador_id])
    usuario_creado = relationship("Usuario", foreign_keys=[usuario_creado_id])
    tienda_creado = relationship("Tienda", foreign_keys=[tienda_creado_id])
    documentos = relationship(
        "SolicitudTiendaDocumento",
        back_populates="solicitud",
        cascade="all, delete-orphan",
    )
    historial = relationship(
        "SolicitudTiendaHistorial",
        back_populates="solicitud",
        cascade="all, delete-orphan",
        order_by="SolicitudTiendaHistorial.creado_en.asc()",
    )


class SolicitudTiendaDocumento(Base):
    """Documento/imagen adjunto a una solicitud de registro de Tienda Aliada."""
    __tablename__ = "solicitudes_tienda_documentos"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(
        Integer, ForeignKey("solicitudes_tienda.id", ondelete="CASCADE"), nullable=False
    )
    # Categoría: identidad | camara_comercio | fachada | fotografias | instalaciones |
    #            productos | nit | otros
    categoria = Column(String(40), nullable=False)
    # obligatorio | opcional
    tipo = Column(String(20), nullable=False, default="obligatorio")
    nombre_archivo = Column(String(255))
    url = Column(Text, nullable=False)
    public_id = Column(String(255))
    # Estado de verificación por el administrador: pendiente | verificado | no_valido
    estado_verificacion = Column(String(20), nullable=False, default="pendiente")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    solicitud = relationship("SolicitudTienda", back_populates="documentos")


class SolicitudTiendaHistorial(Base):
    """Registro cronológico (timeline) de una solicitud de Tienda Aliada."""
    __tablename__ = "solicitudes_tienda_historial"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(
        Integer, ForeignKey("solicitudes_tienda.id", ondelete="CASCADE"), nullable=False
    )
    # creada | informacion_solicitada | informacion_completada | aprobada |
    # rechazada | observacion | verificacion_documento
    accion = Column(String(40), nullable=False)
    descripcion = Column(Text)
    administrador_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    solicitud = relationship("SolicitudTienda", back_populates="historial")
    administrador = relationship("Usuario", foreign_keys=[administrador_id])
