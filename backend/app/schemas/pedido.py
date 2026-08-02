# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional, List


class PedidoItemInput(BaseModel):
    producto_id: int
    cantidad: int = 1


class PedidoCreate(BaseModel):
    items: List[PedidoItemInput]
    nombre_contacto: Optional[str] = None
    telefono_contacto: Optional[str] = None
    direccion_envio: Optional[str] = None
    metodo_pago: Optional[str] = None
    notas: Optional[str] = None
    costo_envio: float = 0
    descuento: float = 0
    codigo_promocion: Optional[str] = None


class EstadoPedidoUpdate(BaseModel):
    estado: str
    numero_guia: Optional[str] = None
    empresa_transportadora: Optional[str] = None
