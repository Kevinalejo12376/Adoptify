# pyrefly: ignore [missing-import]
from pydantic import BaseModel, field_validator
# pyrefly: ignore [missing-import]
from typing import List, Optional, Union

from app.core.validadores import validar_nombre_comercial


def _limitar_texto(valor, campo, maximo):
    if valor is None or str(valor).strip() == "":
        return valor
    limpio = str(valor).strip()
    if len(limpio) > maximo:
        raise ValueError(f"El {campo} no puede superar los {maximo} caracteres")
    return limpio


def _a_texto_lista(valor):
    """Normaliza un valor a texto plano.

    Si el cliente envia una lista (p. ej. rasgos de personalidad), se une con
    ", " para guardarla como texto en la columna Text, manteniendo el contrato
    del modelo y de la API.
    """
    if isinstance(valor, (list, tuple)):
        return ", ".join(str(v).strip() for v in valor if str(v).strip())
    return valor
def _validar_personalidad(v):
    """Limpia y valida la lista de rasgos de personalidad.

    Acepta una lista de textos (nuevo formato text[]) o, por compatibilidad,
    una cadena separada por comas (formato anterior). Máximo 5 rasgos.
    """
    if v is None or v == "":
        return None
    if isinstance(v, str):
        items = [p.strip() for p in v.split(",") if p.strip()]
    elif isinstance(v, list):
        items = [str(p).strip() for p in v if str(p).strip()]
    else:
        raise ValueError("La personalidad debe ser una lista de rasgos")
    vistos = set()
    limpio = []
    for s in items:
        if s not in vistos:
            vistos.add(s)
            limpio.append(s)
    if len(limpio) > 5:
        raise ValueError("Máximo 5 rasgos de personalidad")
    return limpio


class ImagenMascota(BaseModel):
    """Imagen de una mascota. Solo se almacena la secure_url de Cloudinary."""
    url: str
    public_id: Optional[str] = None


class MascotaCreate(BaseModel):
    nombre: str
    # codigos de catalogo (o nombres): tipo/tamano/genero/estado
    tipo: str = "perro"
    tamano: Optional[str] = None
    genero: Optional[str] = None
    estado: str = "disponible"
    raza: Optional[str] = None
    edad: Optional[str] = None
    # Edad estructurada (valor + unidad). Se combina en el backend y se guarda
    # en la columna `edad` (VARCHAR) como p.ej. "3 meses" o "2 años" para que el
    # sistema diferencie correctamente el valor y la unidad.
    edad_valor: Optional[int] = None
    edad_unidad: Optional[str] = None
    peso: Optional[str] = None
    color: Optional[str] = None
    descripcion: Optional[str] = None
    personalidad: Optional[Union[str, List[str]]] = None
    salud: Optional[Union[str, List[str]]] = None
    requisitos: Optional[Union[str, List[str]]] = None
    vacunado: bool = False
    esterilizado: bool = False
    desparasitado: bool = False
    # Imágenes ya subidas a Cloudinary. Solo se guardan las secure_url.
    imagenes: Optional[List[ImagenMascota]] = None

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

    @field_validator("edad_valor", mode="before")
    @classmethod
    def _validar_edad_valor(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        if isinstance(v, bool):
            raise ValueError("La edad debe ser un número entero")
        if isinstance(v, str):
            if not v.strip().isdigit():
                raise ValueError("La edad debe ser un número entero")
            v = int(v.strip())
        if not isinstance(v, int):
            raise ValueError("La edad debe ser un número entero")
        if v <= 0:
            raise ValueError("La edad debe ser mayor que 0")
        if v > 999:
            raise ValueError("La edad no puede superar 999")
        return v

    @field_validator("edad_unidad")
    @classmethod
    def _validar_edad_unidad(cls, v):
        if v is None or str(v).strip() == "":
            return None
        v = str(v).strip().lower()
        if v not in ("meses", "años", "mes", "año"):
            raise ValueError("La unidad de edad debe ser 'Meses' o 'Años'")
        return "meses" if v in ("meses", "mes") else "años"

    @field_validator("descripcion")
    @classmethod
    def _validar_descripcion(cls, v):
        return _limitar_texto(v, "campo descripción", 1000)

    @field_validator("personalidad", "salud", "requisitos")
    @classmethod
    def _validar_texto_lista(cls, v):
        return _a_texto_lista(v)


class MascotaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    tamano: Optional[str] = None
    genero: Optional[str] = None
    estado: Optional[str] = None
    raza: Optional[str] = None
    edad: Optional[str] = None
    # Edad estructurada (valor + unidad). Mismo formato que en la creación:
    # se combina en el backend y se guarda en la columna `edad` (VARCHAR)
    # como p.ej. "2 años" o "6 meses".
    edad_valor: Optional[int] = None
    edad_unidad: Optional[str] = None
    peso: Optional[str] = None
    color: Optional[str] = None
    descripcion: Optional[str] = None
    personalidad: Optional[Union[str, List[str]]] = None
    salud: Optional[Union[str, List[str]]] = None
    requisitos: Optional[Union[str, List[str]]] = None
    vacunado: Optional[bool] = None
    esterilizado: Optional[bool] = None
    desparasitado: Optional[bool] = None
    # Imágenes ya subidas a Cloudinary. Solo se guardan las secure_url.
    imagenes: Optional[List[ImagenMascota]] = None

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

    @field_validator("edad_valor", mode="before")
    @classmethod
    def _validar_edad_valor(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        if isinstance(v, bool):
            raise ValueError("La edad debe ser un número entero")
        if isinstance(v, str):
            if not v.strip().isdigit():
                raise ValueError("La edad debe ser un número entero")
            v = int(v.strip())
        if not isinstance(v, int):
            raise ValueError("La edad debe ser un número entero")
        if v <= 0:
            raise ValueError("La edad debe ser mayor que 0")
        if v > 999:
            raise ValueError("La edad no puede superar 999")
        return v

    @field_validator("edad_unidad")
    @classmethod
    def _validar_edad_unidad(cls, v):
        if v is None or str(v).strip() == "":
            return None
        v = str(v).strip().lower()
        if v not in ("meses", "años", "mes", "año"):
            raise ValueError("La unidad de edad debe ser 'Meses' o 'Años'")
        return "meses" if v in ("meses", "mes") else "años"

    @field_validator("descripcion")
    @classmethod
    def _validar_descripcion(cls, v):
        return _limitar_texto(v, "campo descripción", 1000)

    @field_validator("personalidad", "salud", "requisitos")
    @classmethod
    def _validar_texto_lista(cls, v):
        return _a_texto_lista(v)
    @field_validator("personalidad", mode="before")
    @classmethod
    def _validar_personalidad(cls, v):
        return _validar_personalidad(v)


class MascotaResponse(BaseModel):
    id: int
    refugio_id: Optional[int] = None
    refugio_nombre: Optional[str] = None
    refugio_telefono: Optional[str] = None
    refugio_direccion: Optional[str] = None
    refugio_ubicacion: Optional[str] = None
    refugio_activo: Optional[bool] = None
    nombre: str
    raza: Optional[str] = None
    edad: Optional[str] = None
    peso: Optional[str] = None
    color: Optional[str] = None
    descripcion: Optional[str] = None
    # Rasgos de personalidad como array de textos (text[]).
    personalidad: Optional[List[str]] = None
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
    # Imágenes de Cloudinary (secure_url) almacenadas en mascota_imagenes.
    imagenes: Optional[List[dict]] = None
