"""Modelo de pagos (pasarela dLocal).

Tabla 'pagos': un registro por intento de pago de un pedido.
Se relaciona con 'pedidos' (un pedido puede tener varios intentos, p.ej. tras
un fallo el usuario vuelve a intentar pagar).

La tabla es genérica: ``proveedor`` identifica la pasarela ('dlocal' para los
pagos nuevos; los registros históricos de otras pasarelas se conservan marcados
con su proveedor original). Los campos dLocal guardan solo referencias externas
(id del pago en dLocal), nunca secretos del vendedor.
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, BigInteger, Text, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), index=True)

    # Pasarela de pago: 'dlocal' (nuevos). Históricos conservan su valor.
    proveedor = Column(String(20), nullable=False, default="dlocal", index=True)
    # Identificador EXTERNO del intento: "ADOPTIFY-PEDIDO-{id}".
    order_id = Column(String(125), nullable=False, index=True)

    # Estado interno de Adoptify:
    # pendiente | procesando | pagado | fallido | cancelado | reembolsado
    estado = Column(String(30), nullable=False, default="pendiente", index=True)
    # Estado crudo reportado por dLocal (PENDING | PAID | REJECTED | CANCELLED |
    # EXPIRED | REFUNDED...).
    estado_pasarela = Column(String(80))

    # Monto en COP (sin centavos, entero) tomado de la BD del pedido.
    monto = Column(BigInteger, nullable=False, default=0)
    moneda = Column(String(3), nullable=False, default="COP")
    metodo_pago = Column(String(30), default="dlocal")

    # URL de Checkout de dLocal a la que se redirige al usuario.
    redirect_url = Column(Text)

    # Identificador del pago en dLocal (referencia externa).
    dlocal_payment_id = Column(String(255), index=True)

    # Payloads crudos (JSON) para auditoría.
    respuesta_pasarela = Column(Text)
    notificacion = Column(Text)

    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    pedido = relationship("Pedido", lazy="joined")

    def __repr__(self):
        return f"<Pago {self.order_id} estado={self.estado} proveedor={self.proveedor}>"
