# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class ForoPost(Base):
    __tablename__ = "foro_posts"

    id = Column(Integer, primary_key=True, index=True)
    autor_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    categoria_id = Column(Integer, ForeignKey("foro_categorias.id"))
    tipo_id = Column(Integer, ForeignKey("tipos_post_foro.id"))
    estado_id = Column(Integer, ForeignKey("estados_post_foro.id"), nullable=False)
    titulo = Column(String(255), nullable=False)
    contenido = Column(Text)
    tags = Column(Text)
    fijado = Column(Boolean, nullable=False, default=False)
    vistas = Column(Integer, nullable=False, default=0)
    compartidos = Column(Integer, nullable=False, default=0)
    # Soft delete: activo=False oculta la publicación conservando comentarios,
    # reacciones y guardados (a diferencia del borrado físico en cascada).
    activo = Column(Boolean, nullable=False, default=True)
    eliminado_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    autor = relationship("Usuario", lazy="joined")
    categoria = relationship("ForoCategoria", lazy="joined")
    # Imágenes de la publicación. Solo se almacena la secure_url de Cloudinary.
    imagenes = relationship(
        "ForoPostImagen",
        lazy="select",
        cascade="all, delete-orphan",
        back_populates="post",
    )


class ForoPostImagen(Base):
    """Imagen asociada a una publicación del foro (almacenada en Cloudinary)."""
    __tablename__ = "foro_posts_imagenes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("foro_posts.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)          # secure_url de Cloudinary
    public_id = Column(String(255), nullable=False)  # public_id para poder eliminarla
    etiqueta = Column(String(80))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("ForoPost", back_populates="imagenes")
