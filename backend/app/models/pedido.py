# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    estado_id = Column(Integer, ForeignKey("estados_pedido.id"), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    costo_envio = Column(Numeric(10, 2), nullable=False, default=0)
    descuento = Column(Numeric(10, 2), nullable=False, default=0)
    total = Column(Numeric(10, 2), nullable=False, default=0)
    codigo_promocion = Column(String(40))
    # Datos de contacto/envio del comprador
    nombre_contacto = Column(String(150))
    telefono_contacto = Column(String(30))
    direccion_envio = Column(String(255))
    metodo_pago = Column(String(60))
    notas = Column(Text)
    fecha_estimada_entrega = Column(DateTime(timezone=True))
    # Datos de envio proporcionados por la tienda/refugio al despachar
    numero_guia = Column(String(80))
    empresa_transportadora = Column(String(120))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    estado = relationship("EstadoPedido", lazy="joined")
    items = relationship("PedidoItem", back_populates="pedido", cascade="all, delete-orphan")
    historial = relationship("HistorialEstadoPedido", back_populates="pedido", cascade="all, delete-orphan", order_by="HistorialEstadoPedido.creado_en.asc()")


class PedidoItem(Base):
    __tablename__ = "pedido_items"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="SET NULL"))
    # Snapshot de datos del producto al momento de la compra
    nombre_producto = Column(String(150), nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False, default=0)
    cantidad = Column(Integer, nullable=False, default=1)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)

    pedido = relationship("Pedido", back_populates="items")
    producto = relationship("Producto", lazy="joined")


class HistorialEstadoPedido(Base):
    __tablename__ = "historial_estados_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    estado_id = Column(Integer, ForeignKey("estados_pedido.id"), nullable=False)
    notas = Column(String(255))
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    pedido = relationship("Pedido", back_populates="historial")
    estado = relationship("EstadoPedido", lazy="joined")
