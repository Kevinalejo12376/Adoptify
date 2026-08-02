# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional


class SolicitudCreate(BaseModel):
    mascota_id: int
    nombre_contacto: str
    email_contacto: Optional[str] = None
    telefono_contacto: Optional[str] = None
    ubicacion: Optional[str] = None
    mensaje: Optional[str] = None
    tiene_familia: bool = False
    tiene_experiencia: bool = False


class SolicitudEstadoUpdate(BaseModel):
    # codigo del catalogo estados_solicitud
    estado: str


class SolicitudResponse(BaseModel):
    id: int
    mascota_id: int
    mascota_nombre: Optional[str] = None
    mascota_tipo: Optional[str] = None
    usuario_id: Optional[int] = None
    nombre_contacto: str
    email_contacto: Optional[str] = None
    telefono_contacto: Optional[str] = None
    ubicacion: Optional[str] = None
    mensaje: Optional[str] = None
    notas: Optional[str] = None
    tiene_familia: bool = False
    tiene_experiencia: bool = False
    progreso: int = 0
    estado: Optional[str] = None
    estado_id: Optional[int] = None
    creada_en: Optional[str] = None
