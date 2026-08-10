# pyrefly: ignore [missing-import]
from pydantic import BaseModel, field_validator
# pyrefly: ignore [missing-import]
from typing import Optional


class PqrsCreate(BaseModel):
    tipo: str = "peticion"  # peticion | queja | reclamo | sugerencia
    asunto: str
    mensaje: str

    @field_validator("tipo")
    @classmethod
    def _validar_tipo(cls, v):
        permitidos = {"peticion", "queja", "reclamo", "sugerencia"}
        valor = (v or "").strip().lower()
        if valor not in permitidos:
            raise ValueError("El tipo de PQRS no es válido")
        return valor

    @field_validator("asunto")
    @classmethod
    def _validar_asunto(cls, v):
        valor = (v or "").strip()
        if len(valor) < 3:
            raise ValueError("El asunto debe tener al menos 3 caracteres")
        if len(valor) > 120:
            raise ValueError("El asunto no puede superar los 120 caracteres")
        return valor

    @field_validator("mensaje")
    @classmethod
    def _validar_mensaje(cls, v):
        valor = (v or "").strip()
        if len(valor) < 5:
            raise ValueError("El mensaje debe tener al menos 5 caracteres")
        if len(valor) > 2000:
            raise ValueError("El mensaje no puede superar los 2000 caracteres")
        return valor


class PqrsEstadoUpdate(BaseModel):
    estado: Optional[str] = None  # pendiente | en_proceso | resuelto | cerrado
    respuesta: Optional[str] = None

    @field_validator("respuesta")
    @classmethod
    def _validar_respuesta(cls, v):
        if v is not None and len(v.strip()) > 2000:
            raise ValueError("La respuesta no puede superar los 2000 caracteres")
        return v


class ReporteCreate(BaseModel):
    tipo_objeto: str  # post | comentario | producto | usuario | mascota
    objeto_id: Optional[int] = None
    motivo: str

    @field_validator("tipo_objeto")
    @classmethod
    def _validar_tipo_objeto(cls, v):
        permitidos = {"post", "comentario", "producto", "usuario", "mascota"}
        valor = (v or "").strip().lower()
        if valor not in permitidos:
            raise ValueError("El tipo de objeto del reporte no es válido")
        return valor

    @field_validator("motivo")
    @classmethod
    def _validar_motivo(cls, v):
        valor = (v or "").strip()
        if len(valor) < 5:
            raise ValueError("El motivo debe tener al menos 5 caracteres")
        if len(valor) > 500:
            raise ValueError("El motivo no puede superar los 500 caracteres")
        return valor


class ReporteEstadoUpdate(BaseModel):
    estado: str  # pendiente | revisado | descartado

    @field_validator("estado")
    @classmethod
    def _validar_estado(cls, v):
        permitidos = {"pendiente", "revisado", "descartado"}
        if (v or "").strip().lower() not in permitidos:
            raise ValueError("El estado del reporte no es válido")
        return (v or "").strip().lower()
