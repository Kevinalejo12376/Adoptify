# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Tienda(Base):
    __tablename__ = "tiendas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    nombre = Column(String(150), nullable=False)
    slug = Column(String(160), unique=True)
    descripcion = Column(Text)
    ubicacion = Column(String(150))
    ciudad = Column(String(150))
    direccion = Column(String(255))
    logo_url = Column(Text)
    estado = Column(String(20), nullable=False, default="activa")
    telefono = Column(String(30))
    email = Column(String(255))
    website = Column(String(150))
    facebook = Column(String(120))
    instagram = Column(String(120))
    horario_semana = Column(String(120))
    horario_fin_semana = Column(String(120))
    rating = Column(Numeric(2, 1), nullable=False, default=0)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", backref="tienda", uselist=False)
    productos = relationship("Producto", back_populates="tienda")
