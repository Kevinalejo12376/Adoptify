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
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    autor = relationship("Usuario", lazy="joined")
    categoria = relationship("ForoCategoria", lazy="joined")
