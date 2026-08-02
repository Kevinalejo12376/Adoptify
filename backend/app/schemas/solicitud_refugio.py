# pyrefly: ignore [missing-import]
import re
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List


# Teléfonos: solo números y separadores comunes (espacio, +, -, paréntesis).
TELEFONO_RE = re.compile(r"^[0-9+\s()\-]{7,20}$")


def _validar_telefono(valor: Optional[str]) -> Optional[str]:
    """Valida un teléfono: no admite letras ni caracteres inválidos."""
    if valor is None or str(valor).strip() == "":
        return valor
    valor = str(valor).strip()
    if not TELEFONO_RE.fullmatch(valor):
        raise ValueError("El teléfono solo debe contener números (7 a 20 dígitos)")
    return valor


class SolicitudRefugioDocumentoCreate(BaseModel):
    """Un documento adjunto enviado con la solicitud (base64)."""
    categoria: str  # identidad | fachada | fotografias | instalaciones | animales | ...
    tipo: str = "obligatorio"  # obligatorio | opcional
    nombre_archivo: str = "archivo"
    contenido_base64: str


class SolicitudRefugioCreate(BaseModel):
    # Refugio (Paso 1)
    nombre_refugio: str
    logo_base64: Optional[str] = None
    descripcion: Optional[str] = None
    email_contacto: Optional[str] = None
    telefono: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None
    municipio: Optional[str] = None
    direccion: Optional[str] = None
    website: Optional[str] = None
    anio_fundacion: Optional[int] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None

    # Representante (Paso 2)
    representante_nombre: str
    representante_apellido: Optional[str] = None
    representante_email: str
    representante_telefono: Optional[str] = None

    # Paso 4
    acepto_veracidad: bool = True
    autorizo_verificacion: bool = True

    # Documentos (Paso 3)
    documentos: List[SolicitudRefugioDocumentoCreate] = []

    @field_validator("representante_email")
    @classmethod
    def _email_valido(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not v or "@" not in v:
            raise ValueError("El correo del representante es inválido")
        return v

    @field_validator("telefono", "representante_telefono")
    @classmethod
    def _telefonos_validos(cls, v: Optional[str]) -> Optional[str]:
        return _validar_telefono(v)


class SolicitudRefugioDocumentoResponse(BaseModel):
    id: int
    solicitud_id: int
    categoria: str
    tipo: str
    nombre_archivo: Optional[str] = None
    url: Optional[str] = None
    estado_verificacion: str = "pendiente"
    creado_en: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SolicitudRefugioHistorialResponse(BaseModel):
    id: int
    solicitud_id: int
    accion: str
    descripcion: Optional[str] = None
    administrador_id: Optional[int] = None
    administrador_nombre: Optional[str] = None
    creado_en: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SolicitudRefugioResponse(BaseModel):
    id: int
    nombre_refugio: str
    logo_url: Optional[str] = None
    descripcion: Optional[str] = None
    email_contacto: Optional[str] = None
    telefono: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None
    municipio: Optional[str] = None
    direccion: Optional[str] = None
    website: Optional[str] = None
    anio_fundacion: Optional[int] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    representante_nombre: str
    representante_apellido: Optional[str] = None
    representante_email: str
    representante_telefono: Optional[str] = None
    estado: str
    motivo_rechazo: Optional[str] = None
    mensaje_informacion: Optional[str] = None
    fecha_revision: Optional[str] = None
    administrador_id: Optional[int] = None
    administrador_nombre: Optional[str] = None
    username_generado: Optional[str] = None
    fecha_aprobacion: Optional[str] = None
    token_consulta: Optional[str] = None
    creada_en: Optional[str] = None
    actualizada_en: Optional[str] = None
    total_documentos: int = 0
    documentos: List[SolicitudRefugioDocumentoResponse] = []
    historial: List[SolicitudRefugioHistorialResponse] = []

    model_config = ConfigDict(from_attributes=True)


class SolicitudRefugioEstadoPublico(BaseModel):
    """Respuesta pública con el estado de la solicitud (por token)."""
    id: int
    nombre_refugio: str
    estado: str
    mensaje_informacion: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    mensaje: Optional[str] = None
    creada_en: Optional[str] = None
    fecha_revision: Optional[str] = None
    fecha_aprobacion: Optional[str] = None
    username_generado: Optional[str] = None
    token_consulta: Optional[str] = None


class SolicitudRefugioDocumentoUpload(BaseModel):
    """Documentos adicionales subidos cuando se solicita información."""
    documentos: List[SolicitudRefugioDocumentoCreate] = []


class SolicitudRefugioRechazar(BaseModel):
    motivo: str


class SolicitudRefugioSolicitarInfo(BaseModel):
    mensaje: str


class SolicitudRefugioDocVerificacion(BaseModel):
    estado_verificacion: str  # pendiente | verificado | no_valido


class CrearPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def _password_valida(cls, v: str) -> str:
        if len(v or "") < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
        return v
