# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Numeric, BigInteger, Boolean, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


def _normalizar_precio(valor):
    """Convierte un precio (número o string) a float interpretando el separador
    de miles colombiano (punto) y el decimal (coma).

    - "10.000"    -> 10000.0  (punto = miles)
    - "10,5"      -> 10.5     (coma = decimal)
    - "$10.000"   -> 10000.0  (ignora el símbolo)
    - 10000       -> 10000.0  (número intacto)
    """
    if isinstance(valor, (int, float)):
        return float(valor)
    if valor is None:
        return 0.0
    texto = str(valor).strip().replace("$", "").replace(" ", "")
    if not texto:
        return 0.0
    # Coma y punto juntos: el punto es miles y la coma decimal.
    if "," in texto and "." in texto:
        texto = texto.replace(".", "").replace(",", ".")
    elif "," in texto:
        # Solo coma: separador decimal.
        texto = texto.replace(",", ".")
    elif "." in texto:
        # Solo punto: si la parte tras el último punto tiene 3 dígitos, es miles.
        partes = texto.split(".")
        if len(partes[-1]) == 3:
            texto = texto.replace(".", "")
    try:
        return float(texto)
    except (TypeError, ValueError):
        return 0.0


def precio_final(precio, descuento=0):
    """Calcula el precio final tras aplicar un porcentaje de descuento (0-100).

    Es la fuente única de verdad del cálculo del descuento en el backend: se usa
    en la serialización de productos y en la creación de pedidos para garantizar
    que el precio pagado sea consistente en marketplace, detalle, carrito y orden.
    """
    if precio is None:
        return 0
    try:
        d = min(100, max(0, int(descuento or 0)))
    except (TypeError, ValueError):
        d = 0
    p = _normalizar_precio(precio)
    if d <= 0:
        return p
    return round(p * (100 - d) / 100, 2)


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias_producto.id"))
    # Moneda: COP sin centavos -> entero (BigInteger). El punto de miles es solo formato.
    precio = Column(BigInteger, nullable=False, default=0)
    # Descuento en porcentaje (0-100). 0 = sin descuento. El precio final se
    # calcula con ``precio_final`` (fuente única de verdad del descuento).
    descuento = Column(Integer, nullable=False, default=0)
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
