# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional


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


class MascotaResponse(BaseModel):
    id: int
    refugio_id: Optional[int] = None
    refugio_nombre: Optional[str] = None
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
