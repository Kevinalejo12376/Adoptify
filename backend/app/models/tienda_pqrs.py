"""Modelos de PQRS de las Tiendas Aliadas.

Son las peticiones/quejas/reclamos/sugerencias que una Tienda Aliada envia a
los Administradores de Adoptify. El estado lo gestionan los Administradores de
Adoptify; la tienda puede responder cuando corresponde.

Estados: pendiente | en_revision | finalizado
Tipos (categoria): peticion | queja | reclamo | sugerencia
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class TiendaPqrs(Base):
    """Cabecera de una PQRS creada por una Tienda Aliada."""
    __tablename__ = "tienda_pqrs"

    id = Column(Integer, primary_key=True, index=True)
    tienda_id = Column(Integer, ForeignKey("tiendas.id", ondelete="CASCADE"), nullable=False, index=True)
    # Snapshot del nombre de la tienda (para el panel de Administradores de Adoptify)
    tienda_nombre = Column(String(150))
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    # peticion | queja | reclamo | sugerencia
    tipo = Column(String(20), nullable=False, default="peticion")
    asunto = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    # pendiente | en_revision | finalizado
    estado = Column(String(20), nullable=False, default="pendiente")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tienda = relationship("Tienda")
    usuario = relationship("Usuario")
    mensajes = relationship(
        "TiendaPqrsMensaje",
        back_populates="pqrs",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TiendaPqrsMensaje.creado_en.asc()",
    )
    adjuntos = relationship(
        "TiendaPqrsAdjunto",
        back_populates="pqrs",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class TiendaPqrsMensaje(Base):
    """Mensaje dentro de la conversacion de una PQRS.

    ``rol_remitente`` indica si el mensaje lo escribio la tienda ('tienda') o
    un Administrador de Adoptify ('admin').
    """
    __tablename__ = "tienda_pqrs_mensajes"

    id = Column(Integer, primary_key=True, index=True)
    pqrs_id = Column(Integer, ForeignKey("tienda_pqrs.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    # Snapshot del remitente (nombre legible)
    nombre_remitente = Column(String(200))
    # 'tienda' | 'admin'
    rol_remitente = Column(String(20), nullable=False, default="tienda")
    mensaje = Column(Text, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    pqrs = relationship("TiendaPqrs", back_populates="mensajes")
    usuario = relationship("Usuario")


class TiendaPqrsAdjunto(Base):
    """Archivo/imagen adjunta a una PQRS (o a una respuesta de la misma)."""
    __tablename__ = "tienda_pqrs_adjuntos"

    id = Column(Integer, primary_key=True, index=True)
    pqrs_id = Column(Integer, ForeignKey("tienda_pqrs.id", ondelete="CASCADE"), nullable=False, index=True)
    # Mensaje al que pertenece (opcional: si se adjunto en una respuesta)
    mensaje_id = Column(Integer, ForeignKey("tienda_pqrs_mensajes.id", ondelete="CASCADE"))
    nombre_archivo = Column(String(255))
    url = Column(Text, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    pqrs = relationship("TiendaPqrs", back_populates="adjuntos")
    mensaje = relationship("TiendaPqrsMensaje")
