# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional


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


class PasswordUpdate(BaseModel):
    password_actual: str
    password_nueva: str
