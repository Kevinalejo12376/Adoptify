"""Schemas de la integración de pagos (dLocal)."""
# pyrefly: ignore [missing-import]
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PagoCheckoutRequest(BaseModel):
    """Solicitud para crear un pago en dLocal para un pedido.

    El monto SIEMPRE se recalcula en el backend desde la base de datos
    (pedido.total); el frontend jamás envía precios.
    """
    pedido_id: int


class PagoResponse(BaseModel):
    id: int
    pedido_id: int
    order_id: str
    proveedor: str = "dlocal"
    estado: str
    estado_pasarela: Optional[str] = None
    monto: Optional[float] = None
    moneda: str = "COP"
    metodo_pago: Optional[str] = None
    redirect_url: Optional[str] = None
    dlocal_payment_id: Optional[str] = None
    creado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PagoEstadoResponse(BaseModel):
    id: int
    pedido_id: int
    order_id: str
    proveedor: str = "dlocal"
    estado: str
    estado_pasarela: Optional[str] = None
    monto: Optional[float] = None
    moneda: str = "COP"
    metodo_pago: Optional[str] = None
    redirect_url: Optional[str] = None
    dlocal_payment_id: Optional[str] = None

    model_config = {"from_attributes": True}
