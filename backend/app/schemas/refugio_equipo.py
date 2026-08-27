# pyrefly: ignore [missing-import]
from pydantic import BaseModel, field_validator
# pyrefly: ignore [missing-import]
from typing import List, Optional

from app.core.validadores import (
    validar_email,
    validar_nombre,
    validar_password,
    validar_telefono_empleado,
)


class RefugioPermisoResponse(BaseModel):
    """Permiso del catálogo disponible para empleados de refugio."""
    id: int
    codigo: str
    nombre: str
    modulo: str

    model_config = {"from_attributes": True}


class RefugioEmpleadoResponse(BaseModel):
    """Empleado (usuario) vinculado a un refugio."""
    id: int                      # id de refugio_empleados
    usuario_id: int
    nombre: str
    apellido: Optional[str] = None
    email: str
    telefono: Optional[str] = None
    avatar_url: Optional[str] = None
    activo: bool = True
    es_representante: bool = False
    creado_en: Optional[str] = None
    permisos: List[str] = []     # códigos de permiso asignados


class RefugioEmpleadoCreate(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    email: str
    telefono: Optional[str] = None
    # Opcional: la contraseña se establece mediante el enlace seguro enviado por
    # correo al crear la cuenta. Si se envía, se ignora en el backend.
    password: Optional[str] = None
    activo: bool = True
    permisos: List[str] = []     # códigos de permiso (de refugio_permisos)

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre(v, campo="nombre", requerido=True)

    @field_validator("apellido")
    @classmethod
    def _validar_apellido(cls, v):
        if v is None or str(v).strip() == "":
            return v
        return validar_nombre(v, campo="apellido")

    @field_validator("email")
    @classmethod
    def _validar_email(cls, v):
        return validar_email(v)

    @field_validator("telefono")
    @classmethod
    def _validar_telefono(cls, v):
        return validar_telefono_empleado(v)

    @field_validator("password")
    @classmethod
    def _validar_password(cls, v):
        if v is None or str(v).strip() == "":
            return None
        return validar_password(v)


class RefugioEmpleadoUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    password: Optional[str] = None
    activo: Optional[bool] = None
    permisos: Optional[List[str]] = None  # códigos; si se envía, reemplaza los actuales

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        if v is None:
            return v
        return validar_nombre(v, campo="nombre")

    @field_validator("apellido")
    @classmethod
    def _validar_apellido(cls, v):
        if v is None or str(v).strip() == "":
            return v
        return validar_nombre(v, campo="apellido")

    @field_validator("telefono")
    @classmethod
    def _validar_telefono(cls, v):
        return validar_telefono_empleado(v)

    @field_validator("password")
    @classmethod
    def _validar_password(cls, v):
        if v is None or str(v).strip() == "":
            return v
        return validar_password(v)
