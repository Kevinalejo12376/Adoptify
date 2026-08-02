# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Configuracion(Base):
    __tablename__ = "configuraciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)
    notif_email = Column(Boolean, nullable=False, default=True)
    notif_push = Column(Boolean, nullable=False, default=True)
    notif_adopciones = Column(Boolean, nullable=False, default=True)
    notif_respuestas_foro = Column(Boolean, nullable=False, default=True)
    notif_nuevos_animales = Column(Boolean, nullable=False, default=True)
    notif_nuevas_solicitudes = Column(Boolean, nullable=False, default=True)
    notif_cambios_estado = Column(Boolean, nullable=False, default=True)
    notif_mensajes_foro = Column(Boolean, nullable=False, default=True)
    tema = Column(String(10), nullable=False, default="light")
    idioma = Column(String(5), nullable=False, default="es")
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now())


class FavoritoMascota(Base):
    __tablename__ = "favoritos_mascotas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    mascota_id = Column(Integer, ForeignKey("mascotas.id", ondelete="CASCADE"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class FavoritoProducto(Base):
    __tablename__ = "favoritos_productos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class ForoComentario(Base):
    __tablename__ = "foro_comentarios"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("foro_posts.id", ondelete="CASCADE"), nullable=False)
    autor_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    comentario_padre_id = Column(Integer, ForeignKey("foro_comentarios.id", ondelete="CASCADE"))
    contenido = Column(Text, nullable=False)
    likes = Column(Integer, nullable=False, default=0)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    autor = relationship("Usuario", lazy="joined")


class ForoReaccion(Base):
    __tablename__ = "foro_reacciones"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("foro_posts.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo_reaccion_id = Column(Integer, ForeignKey("tipos_reaccion.id"), nullable=False)


class ForoComentarioLike(Base):
    """Me gusta de un usuario sobre un comentario del foro (uno por usuario)."""
    __tablename__ = "foro_comentario_likes"

    id = Column(Integer, primary_key=True, index=True)
    comentario_id = Column(Integer, ForeignKey("foro_comentarios.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class ForoGuardado(Base):
    """Publicacion del foro guardada por un usuario (marcadores)."""
    __tablename__ = "foro_guardados"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("foro_posts.id", ondelete="CASCADE"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


class Resena(Base):
    """Reseña/valoración de un producto hecha por un usuario."""
    __tablename__ = "resenas"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    calificacion = Column(Integer, nullable=False)
    comentario = Column(Text)
    creada_en = Column(DateTime(timezone=True), server_default=func.now())
    editada_en = Column(DateTime(timezone=True))

    usuario = relationship("Usuario", lazy="joined")
