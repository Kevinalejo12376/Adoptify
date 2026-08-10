"""Modelos de donaciones de productos de Tiendas Aliadas a Refugios."""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Donacion(Base):
    """Donacion de productos realizada por una tienda aliada a un refugio.

    Al confirmarse:
      - Se descuenta la cantidad donada del stock de cada producto.
      - Se notifica al refugio beneficiado.
      - Se registra la accion en el Historial de Actividad de la tienda.

    Se guardan snapshots (``usuario_nombre``, ``rol_usuario`` y
    ``refugio_nombre``) para que el historial de donaciones sea legible aunque
    cambien los datos originales.
    """
    __tablename__ = "donaciones"

    id = Column(Integer, primary_key=True, index=True)
    tienda_id = Column(Integer, ForeignKey("tiendas.id", ondelete="CASCADE"), nullable=False, index=True)
    refugio_id = Column(Integer, ForeignKey("refugios.id", ondelete="SET NULL"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    # Snapshot del usuario que realizo la donacion
    usuario_nombre = Column(String(200))
    rol_usuario = Column(String(30))
    # Snapshot del refugio beneficiado
    refugio_nombre = Column(String(150))
    observacion = Column(Text)
    # 'completada' (por ahora unica posibilidad al confirmarse)
    estado = Column(String(20), nullable=False, default="completada")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    tienda = relationship("Tienda")
    refugio = relationship("Refugio")
    usuario = relationship("Usuario")
    items = relationship(
        "DonacionItem",
        back_populates="donacion",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class DonacionItem(Base):
    """Producto individual donado dentro de una donacion.

    Guarda un snapshot del nombre del producto (``nombre_producto``) para que
    el detalle siga siendo legible aunque el producto se elimine despues.
    """
    __tablename__ = "donacion_items"

    id = Column(Integer, primary_key=True, index=True)
    donacion_id = Column(Integer, ForeignKey("donaciones.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="SET NULL"))
    # Snapshot del producto donado
    nombre_producto = Column(String(150), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)

    donacion = relationship("Donacion", back_populates="items")
    producto = relationship("Producto", lazy="joined")
