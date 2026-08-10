# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, field_validator
# pyrefly: ignore [missing-import]
from typing import List, Optional

from app.core.validadores import validar_nombre_comercial, validar_email, validar_telefono_empleado


class RefugioImagenResponse(BaseModel):
    """Imagen de la galería del refugio."""
    id: int
    url: str
    es_portada: bool = False
    orden: int = 0

    model_config = ConfigDict(from_attributes=True)


class RefugioImagenIn(BaseModel):
    """Elemento de la galería al actualizar el perfil.

    - id: id de una imagen YA guardada (para reordenar/conservar).
    - url: secure_url de Cloudinary para una imagen NUEVA (id == None).
    """
    id: Optional[int] = None
    url: Optional[str] = None


class RefugioBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None
    departamento: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None


class RefugioUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None
    departamento: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    tienda_habilitada: Optional[bool] = None
    # Galería: lista completa en orden. Las imágenes nuevas llevan {url} y las
    # ya guardadas {id}. Las que ya existan y no estén en la lista se eliminan.
    imagenes: Optional[List[RefugioImagenIn]] = None

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
        return validar_telefono_empleado(v)


class RefugioResponse(RefugioBase):
    id: int
    usuario_id: int
    slug: Optional[str] = None
    tienda_habilitada: bool = False
    anio_fundacion: Optional[int] = None
    logo_url: Optional[str] = None
    imagenes: List[RefugioImagenResponse] = []

    model_config = ConfigDict(from_attributes=True)
