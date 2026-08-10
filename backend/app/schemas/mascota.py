# pyrefly: ignore [missing-import]
from pydantic import BaseModel, field_validator
# pyrefly: ignore [missing-import]
from typing import Optional

from app.core.validadores import validar_nombre_comercial


def _limitar_texto(valor, campo, maximo):
    if valor is None or str(valor).strip() == "":
        return valor
    limpio = str(valor).strip()
    if len(limpio) > maximo:
        raise ValueError(f"El {campo} no puede superar los {maximo} caracteres")
    return limpio


class MascotaCreate(BaseModel):
    nombre: str
    # codigos de catalogo (o nombres): tipo/tamano/genero/estado
    tipo: str = "perro"
    tamano: Optional[str] = None
    genero: Optional[str] = None
    estado: str = "disponible"
    raza: Optional[str] = None
    edad: Optional[str] = None
    peso: Optional[str] = None
    color: Optional[str] = None
    descripcion: Optional[str] = None
    personalidad: Optional[str] = None
    salud: Optional[str] = None
    requisitos: Optional[str] = None
    vacunado: bool = False
    esterilizado: bool = False
    desparasitado: bool = False

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre_comercial(v, "nombre")

    @field_validator("raza")
    @classmethod
    def _validar_raza(cls, v):
        return _limitar_texto(v, "raza", 60)

    @field_validator("edad")
    @classmethod
    def _validar_edad(cls, v):
        return _limitar_texto(v, "edad", 20)

    @field_validator("descripcion")
    @classmethod
    def _validar_descripcion(cls, v):
        return _limitar_texto(v, "campo descripción", 1000)


class MascotaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    tamano: Optional[str] = None
    genero: Optional[str] = None
    estado: Optional[str] = None
    raza: Optional[str] = None
    edad: Optional[str] = None
    peso: Optional[str] = None
    color: Optional[str] = None
    descripcion: Optional[str] = None
    personalidad: Optional[str] = None
    salud: Optional[str] = None
    requisitos: Optional[str] = None
    vacunado: Optional[bool] = None
    esterilizado: Optional[bool] = None
    desparasitado: Optional[bool] = None

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre_comercial(v, "nombre")

    @field_validator("raza")
    @classmethod
    def _validar_raza(cls, v):
        return _limitar_texto(v, "raza", 60)

    @field_validator("edad")
    @classmethod
    def _validar_edad(cls, v):
        return _limitar_texto(v, "edad", 20)

    @field_validator("descripcion")
    @classmethod
    def _validar_descripcion(cls, v):
        return _limitar_texto(v, "campo descripción", 1000)


class MascotaResponse(BaseModel):
    id: int
    refugio_id: Optional[int] = None
    refugio_nombre: Optional[str] = None
    refugio_telefono: Optional[str] = None
    refugio_direccion: Optional[str] = None
    refugio_ubicacion: Optional[str] = None
    nombre: str
    raza: Optional[str] = None
    edad: Optional[str] = None
    peso: Optional[str] = None
    color: Optional[str] = None
    descripcion: Optional[str] = None
    personalidad: Optional[str] = None
    salud: Optional[str] = None
    requisitos: Optional[str] = None
    vacunado: bool = False
    esterilizado: bool = False
    desparasitado: bool = False
    # etiquetas legibles + ids
    tipo: Optional[str] = None
    tamano: Optional[str] = None
    genero: Optional[str] = None
    estado: Optional[str] = None
    tipo_id: Optional[int] = None
    tamano_id: Optional[int] = None
    genero_id: Optional[int] = None
    estado_id: Optional[int] = None
