# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, ForeignKey
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base

# ============================================================
# Tablas de catalogo (reference / lookup) - 3FN
# Todas comparten la forma (id, codigo, nombre).
# ============================================================


class TipoDocumento(Base):
    __tablename__ = "tipos_documento"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(10), unique=True, nullable=False)
    nombre = Column(String(60), nullable=False)


class Rol(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(30), unique=True, nullable=False)
    nombre = Column(String(60), nullable=False)


class TipoMascota(Base):
    __tablename__ = "tipos_mascota"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)


class TamanoMascota(Base):
    __tablename__ = "tamanos_mascota"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)


class GeneroMascota(Base):
    __tablename__ = "generos_mascota"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)


class EstadoMascota(Base):
    __tablename__ = "estados_mascota"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)


class RazaMascota(Base):
    __tablename__ = "razas_mascota"
    id = Column(Integer, primary_key=True, index=True)
    # Cada raza pertenece a un tipo de mascota (perro/gato) para poder filtrar
    # el selector de razas según el tipo seleccionado.
    tipo_mascota_id = Column(Integer, ForeignKey("tipos_mascota.id"))
    codigo = Column(String(60), unique=True, nullable=False)
    nombre = Column(String(80), nullable=False)

    tipo_mascota = relationship("TipoMascota")


class EstadoSolicitud(Base):
    __tablename__ = "estados_solicitud"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)


class EstadoPedido(Base):
    __tablename__ = "estados_pedido"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)


class CategoriaProducto(Base):
    __tablename__ = "categorias_producto"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(30), unique=True, nullable=False)
    nombre = Column(String(60), nullable=False)


class ForoCategoria(Base):
    __tablename__ = "foro_categorias"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(40), unique=True, nullable=False)
    nombre = Column(String(60), nullable=False)
    icono = Column(String(20))


class TipoPostForo(Base):
    __tablename__ = "tipos_post_foro"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)


class EstadoPostForo(Base):
    __tablename__ = "estados_post_foro"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)


class TipoReaccion(Base):
    __tablename__ = "tipos_reaccion"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(40), nullable=False)
