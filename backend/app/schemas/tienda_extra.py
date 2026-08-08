# pyrefly: ignore [missing-import]
from pydantic import BaseModel, field_validator
# pyrefly: ignore [missing-import]
from typing import List, Optional

TIPOS_PQRS_PERMITIDOS = {"peticion", "queja", "reclamo", "sugerencia"}
ESTADOS_PQRS_PERMITIDOS = {"pendiente", "en_revision", "finalizado"}


# ============================================================
# Donaciones de Tienda Aliada a Refugios
# ============================================================
class DonacionItemCreate(BaseModel):
    producto_id: int
    cantidad: int = 1

    @field_validator("cantidad")
    @classmethod
    def _validar_cantidad(cls, v):
        if v is None or v < 1:
            raise ValueError("La cantidad debe ser al menos 1")
        return int(v)


class DonacionCreate(BaseModel):
    refugio_id: int
    items: List[DonacionItemCreate]
    observacion: Optional[str] = None

    @field_validator("items")
    @classmethod
    def _validar_items(cls, v):
        if not v:
            raise ValueError("Debes donar al menos un producto")
        if len(v) > 50:
            raise ValueError("No se pueden donar mas de 50 productos a la vez")
        return v

    @field_validator("observacion")
    @classmethod
    def _validar_observacion(cls, v):
        if v is None:
            return None
        valor = v.strip()
        if len(valor) > 500:
            raise ValueError("La observacion no puede superar los 500 caracteres")
        return valor or None


# ============================================================
# PQRS de la Tienda Aliada (gestionadas por Administradores de Adoptify)
# ============================================================
class TiendaPqrsAdjuntoCreate(BaseModel):
    nombre_archivo: Optional[str] = None
    url: Optional[str] = None
    # Imagen en base64 (opcional): si se envia, el backend la sube a Cloudinary
    # y usa la URL resultante. Es la forma que usa la Tienda para adjuntar
    # imagenes sin depender de un endpoint de subida separado.
    imagen_base64: Optional[str] = None

    @field_validator("url")
    @classmethod
    def _validar_url(cls, v):
        if v is None:
            return None
        valor = v.strip()
        if not valor.startswith(("http://", "https://")):
            raise ValueError("URL de adjunto invalida")
        return valor

    @field_validator("imagen_base64")
    @classmethod
    def _validar_imagen(cls, v):
        if v is None:
            return None
        valor = v.strip()
        if not valor:
            raise ValueError("Imagen adjunta vacia")
        return valor


class TiendaPqrsCreate(BaseModel):
    tipo: str = "peticion"
    asunto: str
    descripcion: str
    adjuntos: List[TiendaPqrsAdjuntoCreate] = []

    @field_validator("tipo")
    @classmethod
    def _validar_tipo(cls, v):
        valor = (v or "").strip().lower()
        if valor not in TIPOS_PQRS_PERMITIDOS:
            raise ValueError("La categoria de PQRS no es valida")
        return valor

    @field_validator("asunto")
    @classmethod
    def _validar_asunto(cls, v):
        valor = (v or "").strip()
        if len(valor) < 3:
            raise ValueError("El asunto debe tener al menos 3 caracteres")
        if len(valor) > 200:
            raise ValueError("El asunto no puede superar los 200 caracteres")
        return valor

    @field_validator("descripcion")
    @classmethod
    def _validar_descripcion(cls, v):
        valor = (v or "").strip()
        if len(valor) < 5:
            raise ValueError("La descripcion debe tener al menos 5 caracteres")
        if len(valor) > 4000:
            raise ValueError("La descripcion no puede superar los 4000 caracteres")
        return valor

    @field_validator("adjuntos")
    @classmethod
    def _validar_adjuntos(cls, v):
        if len(v or []) > 5:
            raise ValueError("Maximo 5 archivos adjuntos por PQRS")
        return v or []


class TiendaPqrsRespuestaCreate(BaseModel):
    mensaje: str
    adjuntos: List[TiendaPqrsAdjuntoCreate] = []

    @field_validator("mensaje")
    @classmethod
    def _validar_mensaje(cls, v):
        valor = (v or "").strip()
        if len(valor) < 1:
            raise ValueError("Escribe un mensaje")
        if len(valor) > 4000:
            raise ValueError("El mensaje no puede superar los 4000 caracteres")
        return valor

    @field_validator("adjuntos")
    @classmethod
    def _validar_adjuntos(cls, v):
        if len(v or []) > 5:
            raise ValueError("Maximo 5 archivos adjuntos por mensaje")
        return v or []


# ============================================================
# Gestion de PQRS de Tienda por parte de Administradores de Adoptify
# ============================================================
class AdminTiendaPqrsEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def _validar_estado(cls, v):
        valor = (v or "").strip().lower()
        if valor not in ESTADOS_PQRS_PERMITIDOS:
            raise ValueError("El estado de PQRS no es valido")
        return valor


class AdminTiendaPqrsRespuestaCreate(BaseModel):
    estado: Optional[str] = None
    mensaje: str
    adjuntos: List[TiendaPqrsAdjuntoCreate] = []

    @field_validator("estado")
    @classmethod
    def _validar_estado(cls, v):
        if v is None:
            return None
        valor = v.strip().lower()
        if valor not in ESTADOS_PQRS_PERMITIDOS:
            raise ValueError("El estado de PQRS no es valido")
        return valor

    @field_validator("mensaje")
    @classmethod
    def _validar_mensaje(cls, v):
        valor = (v or "").strip()
        if len(valor) < 1:
            raise ValueError("Escribe un mensaje")
        if len(valor) > 4000:
            raise ValueError("El mensaje no puede superar los 4000 caracteres")
        return valor

    @field_validator("adjuntos")
    @classmethod
    def _validar_adjuntos(cls, v):
        if len(v or []) > 5:
            raise ValueError("Maximo 5 archivos adjuntos por mensaje")
        return v or []
