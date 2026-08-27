# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field, field_validator
# pyrefly: ignore [missing-import]
from typing import Optional, List

from app.core.validadores import (
    validar_nombre,
    validar_nombre_comercial,
    validar_email,
    validar_telefono,
    validar_telefono_admin,
    validar_password,
    validar_permisos,
)


class TiendaPerfilUpdate(BaseModel):
    """Campos que la propia tienda puede editar de su perfil.

    (No incluye 'estado', que solo cambia el administrador.)
    """
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    logo_url: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    website: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    horario_semana: Optional[str] = None
    horario_fin_semana: Optional[str] = None

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


class PasswordUpdate(BaseModel):
    password_actual: str
    password_nueva: str

    @field_validator("password_nueva")
    @classmethod
    def _validar_password(cls, v):
        return validar_password(v)


# ============================================================
# Representante (Super Administrador)
# ============================================================
class RepresentanteUpdate(BaseModel):
    """Actualiza los datos personales del representante (solo super admin)."""
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    numero_documento: Optional[str] = None
    tipo_documento: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre(v, "nombre")

    @field_validator("apellido")
    @classmethod
    def _validar_apellido(cls, v):
        return validar_nombre(v, "apellido", requerido=True)

    @field_validator("telefono")
    @classmethod
    def _validar_telefono(cls, v):
        return validar_telefono(v)


class RepresentanteCorreoUpdate(BaseModel):
    """Cambia el correo de inicio de sesion del representante (solo super admin).

    Se valida la contrasena actual del representante para confirmar la identidad.
    """
    email: str
    password_actual: str

    @field_validator("email")
    @classmethod
    def _validar_email(cls, v):
        return validar_email(v)


class RepresentanteCambiar(BaseModel):
    """Transfiere el rol de Super Administrador a otro miembro de la tienda.

    ``nuevo_usuario_id`` debe ser un administrador (miembro) activo de la tienda.
    El representante actual pasa a ser un administrador normal.
    """
    nuevo_usuario_id: int


# ============================================================
# Administradores (CRUD - exclusivo Super Administrador)
# ============================================================
class AdminTiendaCreate(BaseModel):
    """Crea un nuevo administrador dentro de la tienda.

    ``apellido`` y ``telefono`` son obligatorios (se persisten de forma
    independiente del nombre y solo como dígitos, máximo 10).
    """
    nombre: str
    apellido: Optional[str]
    email: str
    # Opcional: la contraseña se establece mediante el enlace seguro enviado por
    # correo al crear la cuenta. Si se envía, se ignora en el backend.
    password: Optional[str] = None
    telefono: Optional[str]
    # Codigos de permiso asignados (se validan contra el catalogo)
    permisos: List[str] = []
    activo: bool = True

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre(v, "nombre")

    @field_validator("apellido")
    @classmethod
    def _validar_apellido(cls, v):
        return validar_nombre(v, "apellido", requerido=True)

    @field_validator("email")
    @classmethod
    def _validar_email(cls, v):
        return validar_email(v)

    @field_validator("password")
    @classmethod
    def _validar_password(cls, v):
        if v is None or str(v).strip() == "":
            return None
        return validar_password(v)

    @field_validator("telefono")
    @classmethod
    def _validar_telefono(cls, v):
        return validar_telefono_admin(v)

    @field_validator("permisos")
    @classmethod
    def _validar_permisos(cls, v):
        return validar_permisos(v, obligatorio=True)


class AdminTiendaUpdate(BaseModel):
    """Actualiza informacion y permisos de un administrador."""
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    # Opcional: nueva contrasena (si se quiere restablecer desde el formulario)
    password: Optional[str] = None
    # Si se envia, reemplaza por completo el set de permisos del administrador
    permisos: Optional[List[str]] = None
    activo: Optional[bool] = None

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre(v, "nombre")

    @field_validator("apellido")
    @classmethod
    def _validar_apellido(cls, v):
        if v is None:
            return None
        return validar_nombre(v, "apellido", requerido=True)

    @field_validator("password")
    @classmethod
    def _validar_password(cls, v):
        return validar_password(v)

    @field_validator("telefono")
    @classmethod
    def _validar_telefono(cls, v):
        if v is None:
            return None
        return validar_telefono_admin(v)

    @field_validator("permisos")
    @classmethod
    def _validar_permisos(cls, v):
        return validar_permisos(v, obligatorio=True)


class AdminTiendaEstadoUpdate(BaseModel):
    """Activa / desactiva un administrador."""
    activo: bool


class AdminTiendaPasswordReset(BaseModel):
    """Restablece la contrasena de un administrador."""
    password: str

    @field_validator("password")
    @classmethod
    def _validar_password(cls, v):
        return validar_password(v)


class LogoChangeRequest(BaseModel):
    """Cambia el logo (o imagen de tienda) recibiendo la imagen en base64."""
    imagen_base64: str
    tipo: str = "logo"  # 'logo' | 'portada'
