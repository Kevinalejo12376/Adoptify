# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias_producto.id"))
    precio = Column(Numeric(10, 2), nullable=False, default=0)
    descripcion = Column(Text)
    descripcion_larga = Column(Text)
    calidad = Column(String(30))
    stock = Column(Integer, nullable=False, default=0)
    marca = Column(String(80))
    material = Column(String(200))
    tallas = Column(Text)
    colores = Column(Text)
    ingredientes = Column(Text)
    ingredientes_activos = Column(Text)
    aroma = Column(String(80))
    instrucciones_cuidado = Column(Text)
    activo = Column(Boolean, nullable=False, default=True)
    ventas = Column(Integer, nullable=False, default=0)
    rating = Column(Numeric(2, 1), nullable=False, default=0)
    refugio_id = Column(Integer, ForeignKey("refugios.id", ondelete="SET NULL"))
    tienda_id = Column(Integer, ForeignKey("tiendas.id", ondelete="SET NULL"))
    # Soft delete: 'activo' ya existía para publicar/ocultar; 'eliminado_en'
    # registra cuándo se desactiva definitivamente conservando reseñas,
    # favoritos, kardex y snapshots de pedidos/donaciones.
    eliminado_en = Column(DateTime(timezone=True))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    categoria = relationship("CategoriaProducto", lazy="joined")
    tienda = relationship("Tienda", back_populates="productos")
    resenas = relationship("Resena", lazy="select", cascade="all, delete-orphan")
    imagenes = relationship("ProductoImagen", lazy="select", cascade="all, delete-orphan", back_populates="producto")
    movimientos_kardex = relationship("MovimientoKardex", back_populates="producto", cascade="all, delete-orphan")


class ProductoImagen(Base):
    __tablename__ = "producto_imagenes"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    etiqueta = Column(String(80))
    orden = Column(Integer, nullable=False, default=0)

    producto = relationship("Producto", back_populates="imagenes")
