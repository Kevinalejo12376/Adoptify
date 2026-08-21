# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import ARRAY
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Mascota(Base):
    __tablename__ = "mascotas"

    id = Column(Integer, primary_key=True, index=True)
    refugio_id = Column(Integer, ForeignKey("refugios.id", ondelete="CASCADE"))
    nombre = Column(String(100), nullable=False)
    tipo_id = Column(Integer, ForeignKey("tipos_mascota.id"), nullable=False)
    tamano_id = Column(Integer, ForeignKey("tamanos_mascota.id"))
    genero_id = Column(Integer, ForeignKey("generos_mascota.id"))
    estado_id = Column(Integer, ForeignKey("estados_mascota.id"), nullable=False)
    raza = Column(String(100))
    edad = Column(String(40))
    peso = Column(String(30))
    color = Column(String(60))
    descripcion = Column(Text)
    # Rasgos de personalidad almacenados como array de textos (text[]).
    personalidad = Column(ARRAY(Text))
    salud = Column(Text)
    requisitos = Column(Text)
    vacunado = Column(Boolean, nullable=False, default=False)
    esterilizado = Column(Boolean, nullable=False, default=False)
    desparasitado = Column(Boolean, nullable=False, default=False)
    fecha_ingreso = Column(Date)
    # Soft delete: activo=False oculta la mascota del público conservando
    # su historial (solicitudes de adopción, favoritos, etc.).
    activo = Column(Boolean, nullable=False, default=True)
    eliminado_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    refugio = relationship("Refugio", back_populates="mascotas")
    tipo = relationship("TipoMascota", lazy="joined")
    tamano = relationship("TamanoMascota", lazy="joined")
    genero = relationship("GeneroMascota", lazy="joined")
    estado = relationship("EstadoMascota", lazy="joined")
    solicitudes = relationship("SolicitudAdopcion", back_populates="mascota", cascade="all, delete-orphan")
    # Imágenes de la mascota. Solo se almacena la secure_url de Cloudinary.
    imagenes = relationship(
        "MascotaImagen",
        back_populates="mascota",
        cascade="all, delete-orphan",
        order_by="MascotaImagen.orden",
    )


class MascotaImagen(Base):
    """Imagen de una mascota (almacenada en Cloudinary, solo se guarda la URL)."""
    __tablename__ = "mascota_imagenes"

    id = Column(Integer, primary_key=True, index=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(500), nullable=False)
    public_id = Column(String(255))
    orden = Column(Integer, default=0)

    mascota = relationship("Mascota", back_populates="imagenes")
