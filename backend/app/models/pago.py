"""Modelo de pagos (pasarela Stripe).

Tabla 'pagos': un registro por intento de pago de un pedido.
Se relaciona con 'pedidos' (un pedido puede tener varios intentos, p.ej. tras
un fallo el usuario vuelve a intentar pagar).

La tabla es genérica y reutiliza la estructura creada originalmente para
dLocal; la columna ``proveedor`` identifica la pasarela ('stripe' para los
pagos nuevos, 'dlocal' para los registros históricos que se conservan).
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

    # Pasarela de pago: 'stripe' (nuevos) | 'dlocal' (históricos).
    proveedor = Column(String(20), nullable=False, default="stripe", index=True)
    # Identificador EXTERNO del intento: "ADOPTIFY-PEDIDO-{id}".
    order_id = Column(String(125), nullable=False, index=True)

    # Estado interno de Adoptify:
    # pendiente | procesando | pagado | fallido | cancelado | reembolsado
    estado = Column(String(30), nullable=False, default="pendiente", index=True)
    # Estado crudo reportado por Stripe (open | complete | paid | unpaid | expired | refunded...)
    estado_stripe = Column(String(80))

    # Monto en COP (sin centavos, entero) tomado de la BD del pedido.
    monto = Column(BigInteger, nullable=False, default=0)
    moneda = Column(String(3), nullable=False, default="COP")
    metodo_pago = Column(String(30), default="stripe")

    # URL de Checkout de Stripe a la que se redirige al usuario.
    redirect_url = Column(Text)

    # Identificadores de Stripe (referencia externa de la sesión y del intento).
    stripe_checkout_session_id = Column(String(255), index=True)
    stripe_payment_intent_id = Column(String(255), index=True)

    # Monto real cobrado en la moneda de Stripe (centavos) y moneda de cobro.
    stripe_amount = Column(BigInteger)
    stripe_currency = Column(String(3))

    # Desglose de la distribución del dinero (Stripe Connect):
    # - comision_plataforma: comisión que conserva Adoptify (centavos).
    # - monto_distribuido: total transferido a las tiendas conectadas (centavos).
    # - detalle_distribucion: JSON con el desglose por tienda.
    # - stripe_transfer_ids: JSON con los ids de las Transferencias creadas.
    comision_plataforma = Column(BigInteger)
    monto_distribuido = Column(BigInteger)
    detalle_distribucion = Column(Text)
    stripe_transfer_ids = Column(Text)

    # Payloads crudos (JSON) para auditoría.
    respuesta_stripe = Column(Text)
    notificacion = Column(Text)

    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    pedido = relationship("Pedido", lazy="joined")

    def __repr__(self):
        return f"<Pago {self.order_id} estado={self.estado} proveedor={self.proveedor}>"
