# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, field_validator
# pyrefly: ignore [missing-import]
from typing import Optional

from app.core.validadores import validar_nombre_comercial, validar_email, validar_telefono


class RefugioBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None


class RefugioUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    tienda_habilitada: Optional[bool] = None

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre_comercial(v, "nombre")

    @field_validator("email")
    @classmethod
    def _validar_email(cls, v):
        return validar_email(v)

    @field_validator("telefono")
    @classmethod
    def _validar_telefono(cls, v):
        return validar_telefono(v)


class RefugioResponse(RefugioBase):
    id: int
    usuario_id: int
    slug: Optional[str] = None
    tienda_habilitada: bool = False

    model_config = ConfigDict(from_attributes=True)
