# pyrefly: ignore [missing-import]
"""
Modelos para la integracion con n8n / IA.

- TareaIA: cola de trabajos asincronos de IA. La base de datos es la fuente de
  verdad: n8n consume tareas pendientes, las marca como "procesando" y entrega
  el resultado. Idempotente, con reintentos y trazabilidad.
- ChatSesion / ChatMensaje: historial persistente del chatbot. El historial se
  guarda en la BD (no en memoria) ligado a un session_id (o al usuario si esta
  autenticado), de modo que funcione igual en local y en produccion.
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    func,
)

from app.db.database import Base


class TareaIA(Base):
    __tablename__ = "tareas_ia"

    id = Column(Integer, primary_key=True, index=True)
    # moderar_post | moderar_comentario | moderar_producto | moderar_mascota |
    # clasificar_pqrs | clasificar_reporte | sugerir_descripcion | sugerir_hashtags | matching
    tipo = Column(String(60), nullable=False)
    # JSON con los datos de entrada para el workflow de n8n
    payload = Column(Text, nullable=False)
    # pendiente | procesando | completado | error
    estado = Column(String(20), nullable=False, default="pendiente", index=True)
    # JSON con el resultado validado devuelto por n8n
    resultado = Column(Text)
    error = Column(Text)
    intentos = Column(Integer, nullable=False, default=0)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    procesado_en = Column(DateTime(timezone=True))


class ChatSesion(Base):
    __tablename__ = "chat_sesiones"

    id = Column(Integer, primary_key=True, index=True)
    # token unico generado por el frontend para cada conversacion anonima,
    # o el id del usuario si esta autenticado
    session_id = Column(String(64), nullable=False, unique=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ChatMensaje(Base):
    __tablename__ = "chat_mensajes"

    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("chat_sesiones.id", ondelete="CASCADE"), nullable=False, index=True)
    # user | bot
    rol = Column(String(20), nullable=False)
    contenido = Column(Text, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
