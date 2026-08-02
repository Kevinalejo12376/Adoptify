# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from app.db.database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(40))
    mensaje = Column(Text, nullable=False)
    enlace = Column(String(200))
    leida = Column(Boolean, nullable=False, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class Pqrs(Base):
    __tablename__ = "pqrs"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    # peticion | queja | reclamo | sugerencia
    tipo = Column(String(20), nullable=False, default="peticion")
    asunto = Column(String(200), nullable=False)
    mensaje = Column(Text, nullable=False)
    # pendiente | en_proceso | resuelto | cerrado
    estado = Column(String(20), nullable=False, default="pendiente")
    respuesta = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class Reporte(Base):
    __tablename__ = "reportes"

    id = Column(Integer, primary_key=True, index=True)
    reportante_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    # post | comentario | producto | usuario | mascota
    tipo_objeto = Column(String(20), nullable=False)
    objeto_id = Column(Integer)
    motivo = Column(Text, nullable=False)
    # pendiente | revisado | descartado
    estado = Column(String(20), nullable=False, default="pendiente")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class Auditoria(Base):
    __tablename__ = "auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    accion = Column(String(60), nullable=False)
    entidad = Column(String(60))
    entidad_id = Column(Integer)
    detalle = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
