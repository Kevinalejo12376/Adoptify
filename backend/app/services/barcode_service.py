"""
Servicio de búsqueda de productos por código de barras.

Arquitectura de consulta:
1. Primero consulta OpenFoodFacts (API pública, sin API Key).
2. Si no encuentra resultados, consulta UPCitemDB (requiere API Key opcional).
3. Unifica y normaliza la respuesta en un formato único.

Variables de entorno (.env):
- UPCITEMDB_API_KEY: (opcional) Clave de API para UPCitemDB.
  Si no está configurada, se omitirá la consulta a UPCitemDB.
"""

import logging
import re
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("barcode_service")

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
OPENFOODFACTS_URL = "https://world.openfoodfacts.org/api/v2/product/{codigo}.json"
# UPCitemDB usa DOS endpoints distintos:
# - Trial (sin API key): https://api.upcitemdb.com/prod/trial/lookup
#   Limite: ~100 consultas/dia por IP. No requiere autenticacion.
# - Produccion (con API key): https://api.upcitemdb.com/prod/lookup
#   Requiere el header "x-api-key: TU_CLAVE" (NO "Authorization: Bearer").
UPCITEMDB_TRIAL_URL = "https://api.upcitemdb.com/prod/trial/lookup?upc={codigo}"
UPCITEMDB_PROD_URL = "https://api.upcitemdb.com/prod/lookup?upc={codigo}"

# ---------------------------------------------------------------------------
# Modelo de respuesta unificada
# ---------------------------------------------------------------------------
class ProductoBarcode:
    """
    Representación normalizada de un producto encontrado por código de barras.

    Todos los campos pueden ser None si la API consultada no los proporciona.
    """
    def __init__(
        self,
        codigo_barras: str = "",
        nombre: Optional[str] = None,
        marca: Optional[str] = None,
        categoria: Optional[str] = None,
        descripcion: Optional[str] = None,
        presentacion: Optional[str] = None,
        imagen_url: Optional[str] = None,
        ingredientes: Optional[str] = None,
        fabricante: Optional[str] = None,
        peso: Optional[str] = None,
        fuente: str = "",
    ):
        self.codigo_barras = codigo_barras
        self.nombre = nombre
        self.marca = marca
        self.categoria = categoria
        self.descripcion = descripcion
        self.presentacion = presentacion
        self.imagen_url = imagen_url
        self.ingredientes = ingredientes
        self.fabricante = fabricante
        self.peso = peso
        self.fuente = fuente

    def to_dict(self) -> dict:
        return {
            "codigo_barras": self.codigo_barras,
            "nombre": self.nombre,
            "marca": self.marca,
            "categoria": self.categoria,
            "descripcion": self.descripcion,
            "presentacion": self.presentacion,
            "imagen_url": self.imagen_url,
            "ingredientes": self.ingredientes,
            "fabricante": self.fabricante,
            "peso": self.peso,
            "fuente": self.fuente,
            "encontrado": bool(self.nombre),
        }

    @staticmethod
    def no_encontrado(codigo_barras: str) -> "ProductoBarcode":
        return ProductoBarcode(
            codigo_barras=codigo_barras,
            fuente="ninguna",
        )


# ===================================================================
# PARSEADORES ESPECÍFICOS POR API
# ===================================================================


def _parsear_openfoodfacts(data: dict, codigo: str) -> Optional[ProductoBarcode]:
    """
    Parsea la respuesta de OpenFoodFacts y devuelve un ProductoBarcode.

    Documentación de la API:
    https://world.openfoodfacts.org/api/v2/product/{codigo}.json

    Returns:
        ProductoBarcode si el producto fue encontrado, None en caso contrario.
    """
    try:
        if data.get("status") != 1:
            logger.info("[barcode] OpenFoodFacts: producto no encontrado para %s", codigo)
            return None

        product = data.get("product") or {}
        if not product:
            return None

        # Extraer información relevante
        nombre = product.get("product_name") or product.get("generic_name")
        marca = product.get("brands")
        categoria = product.get("categories")
        descripcion = product.get("generic_name") or product.get("product_name")
        presentacion = product.get("quantity")
        imagen_url = product.get("image_url") or product.get("image_front_url")
        ingredientes = product.get("ingredients_text")
        fabricante = product.get("manufacturing_places") or product.get("emb_codes")
        peso = product.get("product_quantity")

        if peso:
            peso = f"{peso}g"

        return ProductoBarcode(
            codigo_barras=codigo,
            nombre=_limpiar_str(nombre),
            marca=_limpiar_str(marca),
            categoria=_limpiar_str(categoria),
            descripcion=_limpiar_str(descripcion),
            presentacion=_limpiar_str(presentacion),
            imagen_url=imagen_url,
            ingredientes=_limpiar_str(ingredientes),
            fabricante=_limpiar_str(fabricante),
            peso=peso,
            fuente="openfoodfacts",
        )
    except Exception as exc:
        logger.warning("[barcode] Error parseando OpenFoodFacts: %s", exc)
        return None


def _parsear_upcitemdb(data: dict, codigo: str) -> Optional[ProductoBarcode]:
    """
    Parsea la respuesta de UPCitemDB y devuelve un ProductoBarcode.

    Documentación:
    GET https://api.upcitemdb.com/prod/trial/lookup?upc={codigo}

    La API trial NO requiere API Key pero tiene límites de 100 requests/día.
    Para uso en producción, obtener API Key en:
    https://upcitemdb.com/

    IMPORTANTE: El endpoint trial de UPCitemDB a veces devuelve resultados
    "falsos" para códigos inexistentes (devuelve un producto cualquiera con
    marca "N/A" y un código distinto al buscado). Aquí filtramos:
    - Items cuyo codigo (ean/upc) no coincida con el buscado.
    - Items con marca "N/A" o titulos genericos (resultados no fiables).

    Returns:
        ProductoBarcode si el producto fue encontrado, None en caso contrario.
    """
    try:
        items = data.get("items") or []
        if not items:
            logger.info("[barcode] UPCitemDB: producto no encontrado para %s", codigo)
            return None

        # Buscar el primer item cuyo codigo coincida con el buscado.
        item = None
        for candidato in items:
            if not candidato:
                continue
            codigo_item = (
                candidato.get("ean")
                or candidato.get("upc")
                or candidato.get("isbn")
                or ""
            )
            codigo_item = re.sub(r"[^0-9]", "", str(codigo_item))
            # Normalizar: si el buscado tiene 13 digitos (EAN) y el item 12 (UPC),
            # intentar normalizar agregando o quitando el digito de control.
            if codigo_item and (
                codigo_item == codigo
                or _codigos_equivalentes(codigo_item, codigo)
            ):
                item = candidato
                break

        if not item:
            logger.info(
                "[barcode] UPCitemDB: item no coincide con el codigo %s (falso positivo descartado)",
                codigo,
            )
            return None

        nombre = item.get("title") or item.get("description")
        marca = item.get("brand")
        categoria = item.get("category")
        descripcion = item.get("description")
        presentacion = None  # UPCitemDB no suele tener presentación

        # Descartar resultados no fiables: marca "N/A" o nombre generico.
        marca_limpia = _limpiar_str(marca)
        nombre_limpio = _limpiar_str(nombre)
        if marca_limpia and marca_limpia.lower() in ("n/a", "na", "none", "unknown"):
            logger.info("[barcode] UPCitemDB: marca no fiable (%s) para %s, descartado", marca_limpia, codigo)
            return None

        # Imagen: tomar la primera si existe
        images = item.get("images") or []
        imagen_url = images[0] if images else None

        ingredientes = None
        fabricante = item.get("manufacturer")
        peso = item.get("weight")

        if peso:
            peso = str(peso)

        return ProductoBarcode(
            codigo_barras=codigo,
            nombre=nombre_limpio,
            marca=marca_limpia,
            categoria=_limpiar_str(categoria),
            descripcion=_limpiar_str(descripcion),
            presentacion=_limpiar_str(presentacion),
            imagen_url=imagen_url,
            ingredientes=_limpiar_str(ingredientes) if ingredientes else None,
            fabricante=_limpiar_str(fabricante),
            peso=peso,
            fuente="upcitemdb",
        )
    except Exception as exc:
        logger.warning("[barcode] Error parseando UPCitemDB: %s", exc)
        return None


def _codigos_equivalentes(a: str, b: str) -> bool:
    """
    Verifica si dos codigos (UPC/EAN) son equivalentes.

    UPC-A tiene 12 digitos; EAN-13 tiene 13 digitos. Un EAN-13 valido que
    empieza con 0 tiene el mismo producto que el UPC-A (12 digitos) sin el
    primer 0. Aqui comparamos normalizando a 12 o 13 digitos.
    """
    a = a.zfill(12)
    b = b.zfill(12)
    return a == b or a.zfill(13) == b.zfill(13)


# ===================================================================
# FUNCIONES DE CONSULTA HTTP
# ===================================================================


async def _consultar_openfoodfacts(codigo: str) -> Optional[ProductoBarcode]:
    """
    Consulta OpenFoodFacts y parsea la respuesta.
    """
    url = OPENFOODFACTS_URL.format(codigo=codigo)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            data = response.json()
            resultado = _parsear_openfoodfacts(data, codigo)
            if resultado and resultado.nombre:
                logger.info("[barcode] OpenFoodFacts: producto encontrado para %s", codigo)
                return resultado
            return None
    except httpx.TimeoutException:
        logger.warning("[barcode] OpenFoodFacts: timeout para %s", codigo)
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning("[barcode] OpenFoodFacts: error HTTP %s para %s", exc.response.status_code, codigo)
        return None
    except Exception as exc:
        logger.warning("[barcode] OpenFoodFacts: error inesperado para %s: %s", codigo, exc)
        return None


async def _consultar_upcitemdb(codigo: str) -> Optional[ProductoBarcode]:
    """
    Consulta UPCitemDB y parsea la respuesta.

    - Si hay API key configurada (UPCITEMDB_API_KEY en .env):
        usa el endpoint de produccion /prod/lookup con el header "x-api-key".
    - Si no hay API key:
        usa el endpoint trial /prod/trial/lookup (limite ~100 consultas/dia por IP).

    Obtener API Key gratuita en: https://upcitemdb.com/
    """
    api_key = settings.UPCITEMDB_API_KEY.strip() if settings.UPCITEMDB_API_KEY else ""

    # Elegir endpoint segun haya o no API key.
    if api_key:
        url = UPCITEMDB_PROD_URL.format(codigo=codigo)
        headers = {"Accept": "application/json", "x-api-key": api_key}
        logger.info("[barcode] UPCitemDB: usando endpoint de PRODUCCION (con API key)")
    else:
        url = UPCITEMDB_TRIAL_URL.format(codigo=codigo)
        headers = {"Accept": "application/json"}
        logger.info("[barcode] UPCitemDB: usando endpoint TRIAL (sin API key)")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers, follow_redirects=True)
            # Si la key es invalida o el limite de cuota se agoto, la API
            # puede devolver 401/403/429. Registramos el codigo para diagnosticar.
            if response.status_code in (401, 403):
                logger.warning(
                    "[barcode] UPCitemDB: API key rechazada (HTTP %s) para %s. "
                    "Verifica UPCITEMDB_API_KEY en .env",
                    response.status_code, codigo,
                )
                return None
            if response.status_code == 429:
                logger.warning(
                    "[barcode] UPCitemDB: limite de consultas agotado (HTTP 429) para %s",
                    codigo,
                )
                return None
            response.raise_for_status()
            data = response.json()
            resultado = _parsear_upcitemdb(data, codigo)
            if resultado and resultado.nombre:
                logger.info("[barcode] UPCitemDB: producto encontrado para %s", codigo)
                return resultado
            return None
    except httpx.TimeoutException:
        logger.warning("[barcode] UPCitemDB: timeout para %s", codigo)
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning("[barcode] UPCitemDB: error HTTP %s para %s", exc.response.status_code, codigo)
        return None
    except Exception as exc:
        logger.warning("[barcode] UPCitemDB: error inesperado para %s: %s", codigo, exc)
        return None


# ===================================================================
# FUNCIÓN PRINCIPAL
# ===================================================================


async def buscar_por_codigo_barras(codigo_barras: str) -> dict:
    """
    Busca un producto por su código de barras siguiendo el flujo:

    1. Consulta OpenFoodFacts (API pública, sin autenticación).
    2. Si no encuentra, consulta UPCitemDB.
    3. Si ninguna encuentra, devuelve un resultado vacío con encontrado=False.

    Args:
        codigo_barras: Código de barras (UPC, EAN, etc.) a buscar.

    Returns:
        dict con el formato de ProductoBarcode.to_dict()
    """
    # Limpiar el código (solo dígitos)
    codigo = re.sub(r"[^0-9]", "", codigo_barras)
    if not codigo:
        logger.warning("[barcode] Código de barras inválido: %s", codigo_barras)
        return ProductoBarcode.no_encontrado(codigo_barras).to_dict()

    logger.info("[barcode] Buscando código: %s", codigo)

    # PASO 1: OpenFoodFacts
    resultado = await _consultar_openfoodfacts(codigo)
    if resultado and resultado.nombre:
        return resultado.to_dict()

    # PASO 2: UPCitemDB (solo si OpenFoodFacts no encontró)
    resultado = await _consultar_upcitemdb(codigo)
    if resultado and resultado.nombre:
        return resultado.to_dict()

    # PASO 3: No encontrado en ninguna
    logger.info("[barcode] Producto no encontrado en ninguna API para %s", codigo)
    return ProductoBarcode.no_encontrado(codigo).to_dict()


# ===================================================================
# UTILIDADES
# ===================================================================


def _limpiar_str(valor: Optional[str]) -> Optional[str]:
    """Limpia y normaliza strings."""
    if not valor:
        return None
    if isinstance(valor, str):
        valor = valor.strip()
        # Remover espacios múltiples
        valor = re.sub(r"\s+", " ", valor)
        return valor if valor else None
    return str(valor).strip() if valor else None
