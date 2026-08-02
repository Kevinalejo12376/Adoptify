# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict
# pyrefly: ignore [missing-import]
from typing import Optional


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


class RefugioResponse(RefugioBase):
    id: int
    usuario_id: int
    slug: Optional[str] = None
    tienda_habilitada: bool = False

    model_config = ConfigDict(from_attributes=True)
