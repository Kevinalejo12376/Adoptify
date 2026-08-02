# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional, List


class AdminUsuarioCreate(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    email: str
    password: str
    telefono: Optional[str] = None
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    # rol: usuario | refugio | administrador | administrador_principal | tienda_aliada
    rol: str = "usuario"
    ubicacion: Optional[str] = None
    nombre_refugio: Optional[str] = None
    # Campos adicionales para refugios
    descripcion: Optional[str] = None
    logo_url: Optional[str] = None
    direccion: Optional[str] = None
    website: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    anio_fundacion: Optional[int] = None
    email_contacto: Optional[str] = None


class AdminUsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    telefono: Optional[str] = None
    ubicacion: Optional[str] = None
    activo: Optional[bool] = None


class AdminUsuarioResponse(BaseModel):
    id: int
    nombre: str
    apellido: Optional[str] = None
    email: str
    telefono: Optional[str] = None
    activo: bool = True
    ubicacion: Optional[str] = None
    rol: Optional[str] = None
    rol_nombre: Optional[str] = None
    refugio_nombre: Optional[str] = None
    creado_en: Optional[str] = None


# ============================================================
# Schemas para gestión de Tiendas Aliadas
# ============================================================

class TiendaCreate(BaseModel):
    """Creación de tienda aliada con datos de tienda + usuario."""
    # Datos de la tienda
    nombre: str
    descripcion: Optional[str] = None
    logo_url: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    website: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    # Datos del responsable. Su correo personal es el de INICIO DE SESION.
    responsable_nombre: str
    responsable_email: str
    responsable_telefono: Optional[str] = None
    # Contraseña temporal de acceso del responsable
    password: str
    confirmar_password: Optional[str] = None
    # Estado inicial
    estado: str = "activa"  # activa | pendiente | suspendida


class TiendaUpdate(BaseModel):
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
    responsable_nombre: Optional[str] = None
    responsable_email: Optional[str] = None
    responsable_telefono: Optional[str] = None
    estado: Optional[str] = None


class TiendaEstadoUpdate(BaseModel):
    """Para cambiar estado (activar/suspender/reactivar)."""
    estado: str


class TiendaResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    nombre: str
    slug: Optional[str] = None
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    logo_url: Optional[str] = None
    estado: Optional[str] = "activa"
    telefono: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    rating: float = 0
    creado_en: Optional[str] = None
    total_productos: int = 0
    total_ventas: int = 0
    ultimo_login: Optional[str] = None
    total_registros: Optional[int] = None
    # Datos del usuario asociado (responsable). El correo es el de login.
    usuario_email: Optional[str] = None
    usuario_nombre: Optional[str] = None
    usuario_telefono: Optional[str] = None
    usuario_activo: bool = True
    usuario_rol: Optional[str] = None
    responsable_nombre: Optional[str] = None
    responsable_email: Optional[str] = None
    responsable_telefono: Optional[str] = None


class TiendaResumen(BaseModel):
    """Resumen estadístico de tiendas."""
    total: int = 0
    activas: int = 0
    suspendidas: int = 0
    pendientes: int = 0
    total_productos: int = 0
    total_ventas: int = 0
