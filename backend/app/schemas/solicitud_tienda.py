# pyrefly: ignore [missing-import]
import re
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List

# Teléfono: solo números y exactamente 10 dígitos (formato estándar Colombia).
TELEFONO_RE = re.compile(r"^\d{10}$")

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _validar_telefono(valor: Optional[str]) -> Optional[str]:
    """Valida un teléfono: solo números y exactamente 10 dígitos."""
    if valor is None or str(valor).strip() == "":
        return valor
    # Se filtran caracteres no numéricos (espacios, guiones, paréntesis, "+", etc.)
    solo_digitos = re.sub(r"\D", "", str(valor))
    if not TELEFONO_RE.fullmatch(solo_digitos):
        raise ValueError("El teléfono debe contener exactamente 10 números")
    return solo_digitos


class SolicitudTiendaDocumentoCreate(BaseModel):
    """Un documento adjunto enviado con la solicitud (base64)."""
    categoria: str  # identidad | camara_comercio | fachada | fotografias | instalaciones | productos | nit | otros
    tipo: str = "obligatorio"  # obligatorio | opcional
    nombre_archivo: str = "archivo"
    contenido_base64: str


class SolicitudTiendaCreate(BaseModel):
    # Tienda (Paso 1)
    nombre_tienda: str
    logo_base64: Optional[str] = None
    descripcion: Optional[str] = None
    email_contacto: Optional[str] = None
    telefono: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None
    municipio: Optional[str] = None
    direccion: Optional[str] = None
    website: Optional[str] = None
    horario_semana: Optional[str] = None
    horario_fin_semana: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None

    # Representante (Paso 2)
    representante_nombre: str
    representante_apellido: Optional[str] = None
    representante_email: str
    representante_telefono: Optional[str] = None

    # Paso 4
    acepto_veracidad: bool = True
    autorizo_verificacion: bool = True

    # Documentos (Paso 3)
    documentos: List[SolicitudTiendaDocumentoCreate] = []

    @field_validator("nombre_tienda")
    @classmethod
    def _nombre_no_vacio(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("El nombre de la tienda es obligatorio")
        return v

    @field_validator("email_contacto")
    @classmethod
    def _email_contacto_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None or str(v).strip() == "":
            return v
        v = v.strip()
        if not EMAIL_RE.fullmatch(v):
            raise ValueError("El correo de contacto es inválido")
        return v

    @field_validator("representante_email")
    @classmethod
    def _email_valido(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not EMAIL_RE.fullmatch(v):
            raise ValueError("El correo del representante es inválido")
        return v

    @field_validator("telefono", "representante_telefono")
    @classmethod
    def _telefonos_validos(cls, v: Optional[str]) -> Optional[str]:
        return _validar_telefono(v)

    @field_validator("website", "facebook", "instagram")
    @classmethod
    def _urls_opcionales(cls, v: Optional[str]) -> Optional[str]:
        if v is None or str(v).strip() == "":
            return v
        v = v.strip()
        if not re.fullmatch(r"https?://\S+", v):
            raise ValueError("La URL debe comenzar con http:// o https://")
        return v


class SolicitudTiendaDocumentoResponse(BaseModel):
    id: int
    solicitud_id: int
    categoria: str
    tipo: str
    nombre_archivo: Optional[str] = None
    url: Optional[str] = None
    estado_verificacion: str = "pendiente"
    creado_en: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SolicitudTiendaHistorialResponse(BaseModel):
    id: int
    solicitud_id: int
    accion: str
    descripcion: Optional[str] = None
    administrador_id: Optional[int] = None
    administrador_nombre: Optional[str] = None
    creado_en: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SolicitudTiendaResponse(BaseModel):
    id: int
    nombre_tienda: str
    logo_url: Optional[str] = None
    descripcion: Optional[str] = None
    email_contacto: Optional[str] = None
    telefono: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None
    municipio: Optional[str] = None
    direccion: Optional[str] = None
    website: Optional[str] = None
    horario_semana: Optional[str] = None
    horario_fin_semana: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
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
    documentos: List[SolicitudTiendaDocumentoResponse] = []
    historial: List[SolicitudTiendaHistorialResponse] = []

    model_config = ConfigDict(from_attributes=True)


class SolicitudTiendaEstadoPublico(BaseModel):
    """Respuesta pública con el estado de la solicitud (por token)."""
    id: int
    nombre_tienda: str
    estado: str
    mensaje_informacion: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    mensaje: Optional[str] = None
    creada_en: Optional[str] = None
    fecha_revision: Optional[str] = None
    fecha_aprobacion: Optional[str] = None
    username_generado: Optional[str] = None
    token_consulta: Optional[str] = None


class SolicitudTiendaDocumentoUpload(BaseModel):
    """Documentos adicionales subidos cuando se solicita información."""
    documentos: List[SolicitudTiendaDocumentoCreate] = []


class SolicitudTiendaRechazar(BaseModel):
    motivo: str


class SolicitudTiendaSolicitarInfo(BaseModel):
    mensaje: str


class SolicitudTiendaDocVerificacion(BaseModel):
    estado_verificacion: str  # pendiente | verificado | no_valido


class CrearPasswordTiendaRequest(BaseModel):
    token: str
    password: str


def validar_password_fuerte(password: str) -> None:
    """Valida la fortaleza de la contraseña de la Tienda Aliada.

    Se ejecuta DENTRO del endpoint (después de confirmar que el enlace pertenece a
    una tienda) y NO en el schema de Pydantic. Esto es imprescindible para que los
    enlaces de Refugio reciban un 404 y el frontend caiga al endpoint de refugio,
    sin que la validación de contraseña de tienda bloquee el flujo actual de Refugio.
    """
    p = password or ""
    if len(p) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres")
    if not re.search(r"[A-Z]", p):
        raise ValueError("La contraseña debe contener al menos una mayúscula")
    if not re.search(r"[a-z]", p):
        raise ValueError("La contraseña debe contener al menos una minúscula")
    if not re.search(r"\d", p):
        raise ValueError("La contraseña debe contener al menos un número")
    if not re.search(r"[^A-Za-z0-9]", p):
        raise ValueError("La contraseña debe contener al menos un carácter especial")
