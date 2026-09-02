<<<<<<< HEAD
<<<<<<< HEAD
"""Schemas de la integración de pagos (dLocal)."""
=======
"""Schemas de la integración de pagos (Stripe)."""
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
"""Schemas de la integración de pagos (dLocal)."""
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
# pyrefly: ignore [missing-import]
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PagoCheckoutRequest(BaseModel):
<<<<<<< HEAD
<<<<<<< HEAD
    """Solicitud para crear un pago en dLocal para un pedido.
=======
    """Solicitud para crear un Stripe Checkout Session para un pedido.
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
    """Solicitud para crear un pago en dLocal para un pedido.
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)

    El monto SIEMPRE se recalcula en el backend desde la base de datos
    (pedido.total); el frontend jamás envía precios.
    """
    pedido_id: int


class PagoResponse(BaseModel):
    id: int
    pedido_id: int
    order_id: str
<<<<<<< HEAD
<<<<<<< HEAD
    proveedor: str = "dlocal"
    estado: str
    estado_pasarela: Optional[str] = None
=======
    proveedor: str = "stripe"
    estado: str
    estado_stripe: Optional[str] = None
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
    proveedor: str = "dlocal"
    estado: str
    estado_pasarela: Optional[str] = None
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
    monto: Optional[float] = None
    moneda: str = "COP"
    metodo_pago: Optional[str] = None
    redirect_url: Optional[str] = None
<<<<<<< HEAD
<<<<<<< HEAD
    dlocal_payment_id: Optional[str] = None
=======
    stripe_checkout_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
    dlocal_payment_id: Optional[str] = None
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
    creado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PagoEstadoResponse(BaseModel):
    id: int
    pedido_id: int
    order_id: str
<<<<<<< HEAD
<<<<<<< HEAD
    proveedor: str = "dlocal"
    estado: str
    estado_pasarela: Optional[str] = None
=======
    proveedor: str = "stripe"
    estado: str
    estado_stripe: Optional[str] = None
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
    proveedor: str = "dlocal"
    estado: str
    estado_pasarela: Optional[str] = None
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
    monto: Optional[float] = None
    moneda: str = "COP"
    metodo_pago: Optional[str] = None
    redirect_url: Optional[str] = None
<<<<<<< HEAD
<<<<<<< HEAD
    dlocal_payment_id: Optional[str] = None

    model_config = {"from_attributes": True}
=======
    stripe_checkout_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None

    model_config = {"from_attributes": True}


class ConnectEstadoResponse(BaseModel):
    """Estado de la cuenta conectada de Stripe de la tienda autenticada."""
    stripe_account_id: Optional[str] = None
    estado: str  # no_configurada | pendiente_onboarding | lista | invalida
    puede_recibir_fondos: bool = False
    mensaje: Optional[str] = None

    model_config = {"from_attributes": True}


class ConnectOnboardingResponse(BaseModel):
    """Respuesta del inicio de onboarding de Stripe Connect."""
    url: str
    stripe_account_id: Optional[str] = None
    estado: str = "pendiente_onboarding"
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
    dlocal_payment_id: Optional[str] = None

    model_config = {"from_attributes": True}
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
