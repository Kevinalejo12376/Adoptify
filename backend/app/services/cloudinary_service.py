"""
Servicio de almacenamiento de imágenes mediante Cloudinary.

Proporciona DOS familias de funciones completamente separadas:

1. FUNCIONES TEMPORALES (para análisis con Gemini)
   - subir_imagen_temporal()
   - subir_imagenes_temporales()
   - eliminar_imagen_temporal()
   - limpiar_imagenes_temporales()

   Las imágenes subidas con estas funciones:
   - Se almacenan en la carpeta ``temp/`` de Cloudinary.
   - NO se guardan en la base de datos.
   - Se eliminan automáticamente una vez que Gemini responde
     (bloque ``finally`` en el endpoint).

2. FUNCIONES PERMANENTES (para datos del sistema)
   - subir_imagen_producto()
   - subir_imagen_usuario()
   - subir_imagen_tienda()
   - subir_imagen_refugio()
   - subir_imagen_mascota()
   - subir_banner()
   - eliminar_imagen_permanente()

   Las imágenes subidas con estas funciones:
   - Se almacenan en carpetas específicas (productos/, usuarios/, etc.).
   - Su URL se guarda en PostgreSQL.
   - Solo se eliminan cuando el usuario o administrador lo solicita
     explícitamente.

Arquitectura:
- Clean Architecture / SOLID.
- Single Responsibility Principle: cada función hace una sola cosa.
- Separation of Concerns: el router coordina, el servicio almacena.
- Bajo acoplamiento: los routers NO conocen rutas de Cloudinary.
- Alta cohesión: toda la lógica de Cloudinary está encapsulada aquí.

Utiliza exclusivamente el SDK oficial de Cloudinary para Python.
"""
import base64
import binascii
import logging
import uuid
from typing import List, Optional

import cloudinary
import cloudinary.api
import cloudinary.uploader

from app.core.config import settings

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = logging.getLogger("cloudinary_service")


# ---------------------------------------------------------------------------
# Constantes centralizadas de carpetas en Cloudinary
# ---------------------------------------------------------------------------
# Todas las rutas se definen AQUÍ. Ningún router debe conocerlas.
# Si necesitas agregar una nueva carpeta, agrégala aquí y crea su función.
CLOUDINARY_FOLDERS = {
    # --- Temporales (usadas por IA, análisis, escaneos, previews) ---
    # Estas imágenes NO se guardan en la BD y se eliminan automáticamente.
    "TEMP_PRODUCTO": "temp/producto-ia",
    "TEMP_MASCOTA": "temp/mascotas-ia",
    "TEMP_PREVIEW": "temp/previews",
    "TEMP_ESCANEO": "temp/escaneos",
    "TEMP_GENERAL": "temp/general",
    # --- Permanentes (se guarda SOLO la secure_url en la BD) ---
    "PRODUCTOS": "productos/imagenes",
    "USUARIOS": "usuarios/perfil",
    "TIENDAS_LOGOS": "tiendas/logos",
    "TIENDAS_PORTADAS": "tiendas/portadas",
    "REFUGIOS_LOGOS": "refugios/logos",
    "REFUGIOS_PORTADAS": "refugios/portadas",
    "REFUGIOS_GALERIA": "refugios/galeria",
    "MASCOTAS": "mascotas/adopcion",
    "FORO": "foro/publicaciones",
    "SOLICITUDES_REFUGIO": "solicitudes-refugio/logos",
    "BANNERS": "banners",
}

# ---------------------------------------------------------------------------
# Mapeo de TIPOS de imagen → carpeta permanente en Cloudinary.
# ---------------------------------------------------------------------------
# Es la ÚNICA fuente de verdad para el endpoint unificado /api/upload/imagen.
# Agrega aquí un nuevo tipo y automáticamente queda disponible en toda la app.
TIPOS_IMAGEN = {
    "usuario": "USUARIOS",
    "refugio_logo": "REFUGIOS_LOGOS",
    "refugio_portada": "REFUGIOS_PORTADAS",
    "refugio_galeria": "REFUGIOS_GALERIA",
    "mascota": "MASCOTAS",
    "producto": "PRODUCTOS",
    "tienda_logo": "TIENDAS_LOGOS",
    "tienda_portada": "TIENDAS_PORTADAS",
    "foro": "FORO",
    "solicitud_refugio": "SOLICITUDES_REFUGIO",
    "banner": "BANNERS",
}

# Mime types permitidos para imágenes (validación unificada).
MIME_IMAGENES_PERMITIDOS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
}

# Tamaño máximo por imagen en bytes (10 MB).
TAMANO_MAXIMO_IMAGEN_BYTES = 10 * 1024 * 1024


# ---------------------------------------------------------------------------
# Inicialización con validación
# ---------------------------------------------------------------------------
def _validar_configuracion() -> None:
    """
    Valida que las credenciales de Cloudinary estén configuradas.

    Si falta CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o
    CLOUDINARY_API_SECRET, lanza un RuntimeError con un mensaje claro.

    Esta validación ocurre al importar el módulo, por lo que el error
    se produce en el arranque de la aplicación, no en medio de una
    solicitud.
    """
    errores: List[str] = []
    if not settings.CLOUDINARY_CLOUD_NAME:
        errores.append("CLOUDINARY_CLOUD_NAME")
    if not settings.CLOUDINARY_API_KEY:
        errores.append("CLOUDINARY_API_KEY")
    if not settings.CLOUDINARY_API_SECRET:
        errores.append("CLOUDINARY_API_SECRET")

    if errores:
        mensaje = (
            "Cloudinary no está configurado correctamente. "
            "Faltan las siguientes variables de entorno: "
            f"{', '.join(errores)}. "
            "Agrégalas en el archivo .env o en las variables de entorno "
            "de Vercel."
        )
        raise RuntimeError(mensaje)


def _inicializar() -> None:
    """
    Configura el cliente de Cloudinary con las credenciales del proyecto.

    Toma los valores de ``settings``:
    - CLOUDINARY_CLOUD_NAME
    - CLOUDINARY_API_KEY
    - CLOUDINARY_API_SECRET

    Se ejecuta automáticamente al importar el módulo, DESPUÉS de validar
    que las credenciales existan.
    """
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


# Validar y luego inicializar
_validar_configuracion()
_inicializar()


# ---------------------------------------------------------------------------
# Validación de imágenes (base64)
# ---------------------------------------------------------------------------
def _extraer_base64_limpio(imagen_base64: str) -> tuple:
    """
    Extrae la parte base64 pura de una cadena que puede incluir prefijo
    ``data:image/...;base64,``.

    Args:
        imagen_base64: Cadena base64 (con o sin prefijo data URI).

    Returns:
        Tupla ``(mime_type, datos_base64)``.

    Raises:
        ValueError: Si la cadena no tiene formato de imagen base64 válido.
    """
    contenido = (imagen_base64 or "").strip()
    if not contenido:
        raise ValueError("La imagen no puede estar vacía")

    mime_type = None
    if "," in contenido and contenido.lstrip().startswith("data:"):
        prefijo, datos = contenido.split(",", 1)
        mime_type = prefijo.replace("data:", "").split(";")[0] or None
        contenido = datos

    return mime_type, contenido


def validar_imagen_base64(
    imagen_base64: str,
    max_bytes: int = TAMANO_MAXIMO_IMAGEN_BYTES,
) -> dict:
    """
    Valida una imagen en base64 y devuelve su tipo MIME y datos limpios.

    - Verifica que el base64 sea decodificable.
    - Verifica que el tipo MIME esté en ``MIME_IMAGENES_PERMITIDOS``.
    - Verifica el tamaño máximo.

    Args:
        imagen_base64: Cadena base64 de la imagen (con o sin prefijo data:).
        max_bytes: Tamaño máximo permitido en bytes (por defecto 10 MB).

    Returns:
        dict con ``mime_type`` y ``data_base64`` (sin prefijo).

    Raises:
        ValueError: Con un mensaje claro si la imagen no es válida.
    """
    mime_type, datos = _extraer_base64_limpio(imagen_base64)

    # Estimar tamaño real (base64 ≈ 4/3 del tamaño original).
    size_bytes = int(len(datos) * 3 / 4)
    if size_bytes > max_bytes:
        raise ValueError(
            f"La imagen supera el tamaño máximo permitido "
            f"({max_bytes // (1024 * 1024)} MB)"
        )

    # Verificar MIME.
    if mime_type and mime_type not in MIME_IMAGENES_PERMITIDOS:
        raise ValueError(
            f"El tipo de imagen '{mime_type}' no está permitido. "
            f"Usa: {', '.join(sorted(MIME_IMAGENES_PERMITIDOS))}"
        )

    # Verificar que sea base64 decodificable.
    try:
        base64.b64decode(datos, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("La imagen no tiene un formato base64 válido") from exc

    return {"mime_type": mime_type, "data_base64": datos}


def _detectar_mime(data_base64: str) -> str:
    """
    Detecta el MIME de una imagen a partir de sus primeros bytes (magic number).

    Se usa cuando la imagen llega SIN prefijo ``data:image/...;base64,`` para
    poder construir un data URI válido para el SDK de Cloudinary.

    Args:
        data_base64: Cadena base64 sin prefijo.

    Returns:
        str: MIME detectado (por defecto "image/png").
    """
    try:
        header = base64.b64decode(data_base64[:64])
        if header.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if header.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if header.startswith(b"GIF8"):
            return "image/gif"
        if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
            return "image/webp"
        if header.startswith(b"\x00\x00\x00\x1cftypavif"):
            return "image/avif"
        if header.lstrip().startswith(b"<svg") or b"<svg" in header[:128]:
            return "image/svg+xml"
    except Exception:
        pass
    return "image/png"


def _a_data_uri(imagen_base64: str) -> str:
    """
    Convierte una imagen base64 a un data URI válido para Cloudinary.

    El SDK oficial de Cloudinary espera que la cadena comience con ``data:``
    para interpretarla como contenido base64 (si no, la trata como ruta de
    archivo local). Esta función garantiza el formato correcto siempre.

    Args:
        imagen_base64: Cadena base64 (con o sin prefijo data:image/...;base64,).

    Returns:
        str: Data URI completo (data:<mime>;base64,<datos>).
    """
    mime_type, datos = _extraer_base64_limpio(imagen_base64)
    if not mime_type:
        mime_type = _detectar_mime(datos)
    return f"data:{mime_type};base64,{datos}"


# ---------------------------------------------------------------------------
# Función interna compartida
# ---------------------------------------------------------------------------
def _subir_a_cloudinary(
    imagen_base64: str,
    carpeta: str,
    etiqueta: Optional[str] = None,
) -> dict:
    """
    Sube una imagen en base64 a Cloudinary en la carpeta especificada.

    Args:
        imagen_base64: Cadena base64 (puede incluir prefijo data:image/...;base64,).
        carpeta: Ruta de la carpeta en Cloudinary (ej: "productos/imagenes").
        etiqueta: Tag opcional para identificar la imagen.

    Returns:
        dict con ``public_id``, ``url`` y ``etiqueta``.

    Raises:
        RuntimeError: Si la subida a Cloudinary falla.
    """
    # Validar antes de subir (consistencia en toda la app).
    try:
        validar_imagen_base64(imagen_base64)
    except ValueError as exc:
        raise RuntimeError(f"Imagen inválida: {exc}") from exc

    public_id = f"{carpeta}/{uuid.uuid4().hex}"

    try:
        # El SDK necesita un data URI (data:<mime>;base64,<datos>) para subir.
        respuesta = cloudinary.uploader.upload(
            _a_data_uri(imagen_base64),
            public_id=public_id,
            overwrite=False,
            resource_type="image",
            tags=[etiqueta or "general"],
        )
    except Exception as exc:
        logger.exception(
            "[cloudinary_service] Error al subir imagen a '%s': %s",
            carpeta,
            exc,
        )
        raise

    return {
        "public_id": respuesta["public_id"],
        "url": respuesta["secure_url"],
        "etiqueta": etiqueta or "imagen",
    }


# ===================================================================
# FAMILIA 1: FUNCIONES TEMPORALES (IA, análisis, escaneos, previews)
# ===================================================================
# Estas funciones suben imágenes a la carpeta ``temp/`` de Cloudinary.
# Las imágenes se eliminan automáticamente después del flujo temporal.
# Nunca deben guardarse en la base de datos.
# ===================================================================


def subir_imagen_temporal(
    imagen_base64: str,
    carpeta_temp: str = "TEMP_PRODUCTO",
    etiqueta: Optional[str] = None,
) -> dict:
    """
    Sube UNA imagen temporal a Cloudinary para análisis con IA.

    La imagen se almacena en ``temp/<carpeta_temp>/`` con un UUID único.

    Args:
        imagen_base64: Cadena base64 de la imagen.
        carpeta_temp:
            Clave del diccionario ``CLOUDINARY_FOLDERS`` que indica la
            subcarpeta temporal. Por defecto: "TEMP_PRODUCTO".
        etiqueta: Identificador opcional (ej: "frontal", "trasera").

    Returns:
        dict con ``public_id``, ``url`` y ``etiqueta``.
    """
    folder = CLOUDINARY_FOLDERS.get(carpeta_temp, CLOUDINARY_FOLDERS["TEMP_GENERAL"])
    return _subir_a_cloudinary(imagen_base64, folder, etiqueta)


def subir_imagenes_temporales(
    imagenes_base64: List[str],
    etiquetas: Optional[List[str]] = None,
    carpeta_temp: str = "TEMP_PRODUCTO",
) -> List[dict]:
    """
    Sube MÚLTIPLES imágenes temporales a Cloudinary para análisis con IA.

    Args:
        imagenes_base64: Lista de cadenas base64.
        etiquetas:
            Lista opcional de etiquetas con la misma longitud que
            ``imagenes_base64``.
        carpeta_temp:
            Clave del diccionario ``CLOUDINARY_FOLDERS``.
            Por defecto: "TEMP_PRODUCTO".

    Returns:
        List[dict]: Lista con ``public_id``, ``url`` y ``etiqueta`` por imagen.
    """
    if etiquetas is None:
        etiquetas = [f"vista_{i+1}" for i in range(len(imagenes_base64))]

    resultados: List[dict] = []
    for i, img_b64 in enumerate(imagenes_base64):
        etiqueta = etiquetas[i] if i < len(etiquetas) else f"vista_{i+1}"
        resultado = subir_imagen_temporal(img_b64, carpeta_temp, etiqueta)
        resultados.append(resultado)

    return resultados


def eliminar_imagen_temporal(public_id: str) -> None:
    """
    Elimina UNA imagen temporal de Cloudinary por su public_id.

    Args:
        public_id: ID público del recurso en Cloudinary.

    Nota:
        Si la eliminación falla, se registra una advertencia pero no
        se interrumpe la ejecución.
    """
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception as exc:
        logger.warning(
            "[cloudinary_service] No se pudo eliminar la imagen temporal "
            "'%s': %s",
            public_id,
            exc,
        )


def limpiar_imagenes_temporales(public_ids: List[str]) -> None:
    """
    Elimina TODAS las imágenes temporales de una lista de public_id.

    Diseñada para ejecutarse en bloques ``finally``, garantizando que
    no queden archivos huérfanos incluso si ocurre una excepción.

    Args:
        public_ids: Lista de public_id a eliminar.
    """
    if not public_ids:
        return

    for pid in public_ids:
        eliminar_imagen_temporal(pid)


# ===================================================================
# FAMILIA 2: FUNCIONES PERMANENTES
# ===================================================================
# Estas funciones suben imágenes a carpetas específicas del sistema.
# Su URL se guarda en PostgreSQL y solo se eliminan explícitamente.
# ===================================================================


def subir_imagen_producto(imagen_base64: str, etiqueta: Optional[str] = None) -> dict:
    """
    Sube una imagen PERMANENTE de producto a Cloudinary.

    Carpeta: ``productos/imagenes/``.

    Args:
        imagen_base64: Cadena base64 de la imagen.
        etiqueta: Identificador opcional (ej: "frontal", "trasera").

    Returns:
        dict con ``public_id`` y ``url`` de la imagen.
    """
    return _subir_a_cloudinary(
        imagen_base64,
        CLOUDINARY_FOLDERS["PRODUCTOS"],
        etiqueta,
    )


def subir_imagen_usuario(imagen_base64: str, etiqueta: Optional[str] = None) -> dict:
    """
    Sube una imagen PERMANENTE de perfil de usuario a Cloudinary.

    Carpeta: ``usuarios/perfil/``.

    Args:
        imagen_base64: Cadena base64 de la imagen.
        etiqueta: Identificador opcional.

    Returns:
        dict con ``public_id`` y ``url`` de la imagen.
    """
    return _subir_a_cloudinary(
        imagen_base64,
        CLOUDINARY_FOLDERS["USUARIOS"],
        etiqueta,
    )


def subir_imagen_tienda(
    imagen_base64: str,
    tipo: str = "logo",
    etiqueta: Optional[str] = None,
) -> dict:
    """
    Sube una imagen PERMANENTE de tienda a Cloudinary.

    Según el parámetro ``tipo``:
    - "logo" → ``tiendas/logos/``
    - "portada" → ``tiendas/portadas/``

    Args:
        imagen_base64: Cadena base64 de la imagen.
        tipo: ``"logo"`` (default) o ``"portada"``.
        etiqueta: Identificador opcional.

    Returns:
        dict con ``public_id`` y ``url`` de la imagen.
    """
    carpeta = (
        CLOUDINARY_FOLDERS["TIENDAS_PORTADAS"]
        if tipo == "portada"
        else CLOUDINARY_FOLDERS["TIENDAS_LOGOS"]
    )
    return _subir_a_cloudinary(imagen_base64, carpeta, etiqueta)


def subir_imagen_refugio(
    imagen_base64: str,
    tipo: str = "logo",
    etiqueta: Optional[str] = None,
) -> dict:
    """
    Sube una imagen PERMANENTE de refugio a Cloudinary.

    Según el parámetro ``tipo``:
    - "logo" → ``refugios/logos/``
    - "portada" → ``refugios/portadas/``

    Args:
        imagen_base64: Cadena base64 de la imagen.
        tipo: ``"logo"`` (default) o ``"portada"``.
        etiqueta: Identificador opcional.

    Returns:
        dict con ``public_id`` y ``url`` de la imagen.
    """
    carpeta = (
        CLOUDINARY_FOLDERS["REFUGIOS_PORTADAS"]
        if tipo == "portada"
        else CLOUDINARY_FOLDERS["REFUGIOS_LOGOS"]
    )
    return _subir_a_cloudinary(imagen_base64, carpeta, etiqueta)


def subir_imagen_mascota(imagen_base64: str, etiqueta: Optional[str] = None) -> dict:
    """
    Sube una imagen PERMANENTE de mascota a Cloudinary.

    Carpeta: ``mascotas/adopcion/``.

    Args:
        imagen_base64: Cadena base64 de la imagen.
        etiqueta: Identificador opcional.

    Returns:
        dict con ``public_id`` y ``url`` de la imagen.
    """
    return _subir_a_cloudinary(
        imagen_base64,
        CLOUDINARY_FOLDERS["MASCOTAS"],
        etiqueta,
    )


def subir_imagen(
    tipo: str,
    imagen_base64: str,
    etiqueta: Optional[str] = None,
) -> dict:
    """
    Función PERMANENTE GENÉRICA: sube una imagen según su TIPO.

    Es la puerta de entrada única del endpoint ``/api/upload/imagen``.

    Args:
        tipo: Clave de ``TIPOS_IMAGEN`` (ej: "usuario", "mascota", "foro").
        imagen_base64: Cadena base64 de la imagen.
        etiqueta: Identificador opcional.

    Returns:
        dict con ``public_id``, ``url``, ``etiqueta`` y ``tipo``.

    Raises:
        ValueError: Si el tipo no está registrado en ``TIPOS_IMAGEN``.
        RuntimeError: Si la subida a Cloudinary falla.
    """
    clave_carpeta = TIPOS_IMAGEN.get(tipo)
    if not clave_carpeta:
        raise ValueError(
            f"Tipo de imagen '{tipo}' no soportado. "
            f"Válidos: {', '.join(sorted(TIPOS_IMAGEN))}"
        )
    carpeta = CLOUDINARY_FOLDERS[clave_carpeta]
    resultado = _subir_a_cloudinary(imagen_base64, carpeta, etiqueta)
    resultado["tipo"] = tipo
    return resultado


def subir_imagenes(
    tipo: str,
    imagenes_base64: List[str],
    etiquetas: Optional[List[str]] = None,
) -> List[dict]:
    """
    Sube MÚLTIPLES imágenes PERMANENTES del mismo tipo a Cloudinary.

    Args:
        tipo: Clave de ``TIPOS_IMAGEN`` (ej: "mascota", "producto", "foro").
        imagenes_base64: Lista de cadenas base64.
        etiquetas: Lista opcional de etiquetas.

    Returns:
        List[dict]: Lista con ``public_id`` y ``url`` por imagen.

    Raises:
        ValueError: Si el tipo no está registrado.
    """
    if etiquetas is None:
        etiquetas = [f"vista_{i+1}" for i in range(len(imagenes_base64))]

    resultados: List[dict] = []
    for i, img_b64 in enumerate(imagenes_base64):
        etiqueta = etiquetas[i] if i < len(etiquetas) else f"vista_{i+1}"
        resultados.append(subir_imagen(tipo, img_b64, etiqueta))

    return resultados


def subir_imagen_foro(imagen_base64: str, etiqueta: Optional[str] = None) -> dict:
    """
    Sube una imagen PERMANENTE de publicación del foro a Cloudinary.

    Carpeta: ``foro/publicaciones/``.

    Args:
        imagen_base64: Cadena base64 de la imagen.
        etiqueta: Identificador opcional.

    Returns:
        dict con ``public_id`` y ``url`` de la imagen.
    """
    return _subir_a_cloudinary(
        imagen_base64,
        CLOUDINARY_FOLDERS["FORO"],
        etiqueta,
    )


def subir_banner(imagen_base64: str, etiqueta: Optional[str] = None) -> dict:
    """
    Sube un banner PERMANENTE a Cloudinary.

    Carpeta: ``banners/``.

    Args:
        imagen_base64: Cadena base64 de la imagen.
        etiqueta: Identificador opcional.

    Returns:
        dict con ``public_id`` y ``url`` del banner.
    """
    return _subir_a_cloudinary(
        imagen_base64,
        CLOUDINARY_FOLDERS["BANNERS"],
        etiqueta,
    )


def eliminar_imagen_permanente(public_id: str) -> None:
    """
    Elimina UNA imagen permanente de Cloudinary.

    A diferencia de ``eliminar_imagen_temporal``, esta función registra
    el error con ``logger.exception`` y relanza la excepción para que
    el endpoint pueda manejarla (ej: devolver un error 500).

    Args:
        public_id: ID público del recurso en Cloudinary.

    Raises:
        RuntimeError: Si la eliminación falla.
    """
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception as exc:
        logger.exception(
            "[cloudinary_service] Error al eliminar imagen permanente "
            "'%s': %s",
            public_id,
            exc,
        )
        raise RuntimeError(
            f"No se pudo eliminar la imagen '{public_id}' de Cloudinary"
        ) from exc
