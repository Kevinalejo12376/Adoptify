# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.database import Base


class Refugio(Base):
    __tablename__ = "refugios"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    slug = Column(String(160), unique=True)
    logo_url = Column(Text)
    descripcion = Column(Text)
    ubicacion = Column(String(150))
    departamento = Column(String(150))
    municipio = Column(String(150))
    direccion = Column(String(200))
    telefono = Column(String(30))
    email = Column(String(255))
    facebook = Column(String(120))
    instagram = Column(String(120))
    tiktok = Column(String(120))
    website = Column(String(150))
    anio_fundacion = Column(Integer)
    total_rescatados = Column(Integer, nullable=False, default=0)
    total_voluntarios = Column(Integer, nullable=False, default=0)
    verificado = Column(Boolean, nullable=False, default=False)
    tienda_habilitada = Column(Boolean, nullable=False, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="refugio")
    mascotas = relationship("Mascota", back_populates="refugio", cascade="all, delete-orphan")
