# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


# Tipos de movimiento del Kardex (metodo de costo promedio ponderado).
# ENTRADA / AJUSTE_POSITIVO  -> aumentan el stock.
# SALIDA / AJUSTE_NEGATIVO   -> disminuyen el stock.
TIPOS_MOVIMIENTO_KARDEX = ("ENTRADA", "SALIDA", "AJUSTE_POSITIVO", "AJUSTE_NEGATIVO")

# Tipos que representan un ingreso de unidades al inventario.
TIPOS_INGRESO = ("ENTRADA", "AJUSTE_POSITIVO")
# Tipos que representan una salida de unidades del inventario.
TIPOS_EGRESO = ("SALIDA", "AJUSTE_NEGATIVO")


class MovimientoKardex(Base):
    """Registro cronologico de un movimiento de inventario de un producto.

    Cada fila guarda el movimiento (entrada/salida/ajuste) junto con el
    saldo resultante (cantidad y valor) aplicando el metodo de costo promedio
    ponderado. Esto permite reconstruir el historial del Kardex sin depender
    del stock actual del producto.
    """

    __tablename__ = "movimientos_kardex"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False, index=True)
    tienda_id = Column(Integer, ForeignKey("tiendas.id", ondelete="CASCADE"), nullable=False, index=True)

    # ENTRADA | SALIDA | AJUSTE_POSITIVO | AJUSTE_NEGATIVO
    # Se usa Enum con native_enum=False para que funcione igual en SQLite y PostgreSQL.
    tipo_movimiento = Column(
        Enum(*TIPOS_MOVIMIENTO_KARDEX, name="tipo_movimiento_kardex", native_enum=False),
        nullable=False,
        index=True,
    )
    concepto = Column(String(255), nullable=False, default="")
    cantidad = Column(Integer, nullable=False, default=0)
    costo_unitario = Column(Numeric(12, 2), nullable=False, default=0)
    costo_total = Column(Numeric(12, 2), nullable=False, default=0)

    # Saldo resultante tras el movimiento
    saldo_cantidad = Column(Integer, nullable=False, default=0)
    saldo_valor = Column(Numeric(14, 2), nullable=False, default=0)

    creado_en = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    producto = relationship("Producto", back_populates="movimientos_kardex")
    tienda = relationship("Tienda", back_populates="movimientos_kardex")
