# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, field_validator
# pyrefly: ignore [missing-import]
from typing import Optional
import re


class UsuarioCreate(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    email: str
    password: str
    telefono: Optional[str] = None
    # codigo del catalogo tipos_documento (ej: 'CC') u opcional
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    # codigo del catalogo roles: 'usuario' | 'refugio'
    rol: str = "usuario"
    ubicacion: Optional[str] = None
    # Nombre del refugio (solo si rol == 'refugio')
    nombre_refugio: Optional[str] = None


class ProfileUpdate(BaseModel):
    """Esquema para que el usuario complete/actualice su perfil."""
    telefono: Optional[str] = None
    ubicacion: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_public_id: Optional[str] = None
    cover_url: Optional[str] = None

    @field_validator("website")
    @classmethod
    def validate_website(cls, v):
        if v and v.strip():
            if not re.match(r'^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-\.\/?%&=]*)?$', v.strip()):
                raise ValueError("El formato del sitio web no es válido")
        return v.strip() if v else v

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v):
        if v and v.strip():
            if not re.match(r'^[\d\s\+\-\(\)]{7,20}$', v.strip()):
                raise ValueError("El formato del teléfono no es válido")
        return v.strip() if v else v

    @field_validator("twitter", "instagram")
    @classmethod
    def validate_social(cls, v):
        if v and len(v.strip()) > 120:
            raise ValueError("Máximo 120 caracteres")
        return v.strip() if v else v

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v):
        if v and len(v.strip()) > 500:
            raise ValueError("La biografía no puede exceder 500 caracteres")
        return v.strip() if v else v


class ProfileResponse(BaseModel):
    """Respuesta con el perfil del usuario."""
    id: int
    nombre: str
    apellido: Optional[str] = None
    email: str
    telefono: Optional[str] = None
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    ubicacion: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_public_id: Optional[str] = None
    cover_url: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    perfil_completo: bool = False


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    apellido: Optional[str] = None
    email: str
    telefono: Optional[str] = None
    rol: Optional[str] = None
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    ubicacion: Optional[str] = None


# ─── Esquemas para verificación de email / recuperación de contraseña ───

class EnviarCodigoRequest(BaseModel):
    """Solicitud para enviar un código de verificación de 6 dígitos al correo."""
    email: str
    tipo: str = "registro"  # 'registro' | 'reset_password'
    nombre: Optional[str] = None


class VerificarCodigoRequest(BaseModel):
    """Verifica un código de 6 dígitos."""
    email: str
    codigo: str


class RegistrarConCodigoRequest(BaseModel):
    """Registra un usuario validando primero el código de verificación."""
    nombre: str
    apellido: Optional[str] = None
    email: str
    password: str
    codigo_verificacion: str
    telefono: Optional[str] = None
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    rol: str = "usuario"
    ubicacion: Optional[str] = None
    nombre_refugio: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    """Restablece la contraseña usando un código de verificación."""
    email: str
    codigo: str
    new_password: str
