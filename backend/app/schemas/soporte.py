# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional


class PqrsCreate(BaseModel):
    tipo: str = "peticion"  # peticion | queja | reclamo | sugerencia
    asunto: str
    mensaje: str


class PqrsEstadoUpdate(BaseModel):
    estado: Optional[str] = None  # pendiente | en_proceso | resuelto | cerrado
    respuesta: Optional[str] = None


class ReporteCreate(BaseModel):
    tipo_objeto: str  # post | comentario | producto | usuario | mascota
    objeto_id: Optional[int] = None
    motivo: str


class ReporteEstadoUpdate(BaseModel):
    estado: str  # pendiente | revisado | descartado
