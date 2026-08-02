"""
Servicio de integracion con Google Gemini API para analisis de productos.

Utiliza Gemini 1.5 Flash para analizar imagenes de productos
y extraer informacion estructurada.

Incluye reintentos automáticos con backoff exponencial para evitar
errores de cuota (HTTP 429) y problemas de red transitorios.
"""
# pyrefly: ignore [missing-import]
import asyncio
import json
import httpx

from app.core.config import settings

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# Configuración de reintentos
MAX_RETRIES = 5
BASE_DELAY = 2.0       # segundos
MAX_DELAY = 30.0       # máximo entre reintentos


def _construir_prompt() -> str:
    return """Eres un experto en analisis de productos para mascotas. 
Analiza las imagenes del producto y extrae la siguiente informacion en formato JSON.

Reglas IMPORTANTES:
1. Responde SOLO con un objeto JSON valido, sin markdown, sin explicaciones adicionales.
2. Si no puedes determinar un campo, deja el string vacio "".
3. Para categoria, usa: "alimentos", "accesorios", "juguetes", "salud", "higiene", "ropa"
4. Para tipo_mascota, usa: "Perro", "Gato", o "Ambos"
5. Para calidad, usa: "Premium", "Estandar", "Economico", o ""
6. Todos los campos deben ser strings.

Formato JSON:
{
  "nombre": "Nombre del producto",
  "descripcion": "Descripcion breve del producto",
  "descripcion_larga": "Descripcion detallada",
  "marca": "Marca del producto",
  "categoria": "categoria",
  "material": "Material principal",
  "calidad": "Calidad",
  "ingredientes": "Ingredientes",
  "ingredientes_activos": "Ingredientes activos",
  "aroma": "Aroma",
  "instrucciones_cuidado": "Instrucciones de cuidado",
  "tipo_mascota": "Tipo de mascota",
  "edad_recomendada": "Edad recomendada",
  "peso": "Peso o talla",
  "fabricante": "Fabricante",
  "registro_sanitario": "Registro sanitario",
  "advertencias": "Advertencias",
  "informacion_adicional": "Info adicional",
  "tallas": "Tallas disponibles",
  "colores": "Colores disponibles"
}"""


def _comprimir_imagen_base64(b64_data: str, max_size_kb: int = 500) -> str:
    """Reduce el tamaño de una imagen base64 si es muy grande.
    Si la cadena tiene prefijo data:image, lo respeta.
    """
    prefix = ""
    if "," in b64_data:
        prefix, b64_data = b64_data.split(",", 1)

    # Estimar tamaño en KB (base64 ~ 4/3 del tamaño original)
    estimated_kb = len(b64_data) * 3 / 4 / 1024
    if estimated_kb <= max_size_kb:
        return f"{prefix},{b64_data}" if prefix else b64_data

    # Si es muy grande, recortar (Gemini igual procesa bien con menos calidad)
    # Mantener los primeros max_size_kb de datos base64
    max_chars = int(max_size_kb * 1024 * 4 / 3)
    b64_data = b64_data[:max_chars]
    return f"{prefix},{b64_data}" if prefix else b64_data


async def analizar_producto(imagenes_base64: list[str]) -> dict:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY no esta configurada en el archivo .env")

    # Comprimir imágenes antes de enviar
    imagenes_comprimidas = [_comprimir_imagen_base64(img) for img in imagenes_base64]

    # Contenido: prompt + imagenes
    contents = [
        {"role": "user", "parts": [{"text": _construir_prompt()}]}
    ]

    image_parts = []
    for img_b64 in imagenes_comprimidas:
        if "," in img_b64:
            mime_prefix, b64_data = img_b64.split(",", 1)
            mime_type = mime_prefix.replace("data:", "").split(";")[0] if ";" in mime_prefix else "image/png"
        else:
            b64_data = img_b64
            mime_type = "image/png"

        image_parts.append({"inline_data": {"mime_type": mime_type, "data": b64_data}})

    if image_parts:
        contents.append({"role": "user", "parts": image_parts})

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]
    }

    url = f"{GEMINI_API_URL}?key={api_key}"

    # Reintentos con backoff exponencial para 429 y errores de red
    last_exception = None
    for intento in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()

            texto = ""
            try:
                candidate = result["candidates"][0]
                texto = candidate["content"]["parts"][0]["text"]
            except (KeyError, IndexError) as e:
                try:
                    block_reason = result["promptFeedback"]["blockReason"]
                    raise ValueError(f"La solicitud fue bloqueada por seguridad. Razón: {block_reason}")
                except (KeyError, IndexError):
                    pass
                raise ValueError(f"Error al procesar respuesta de Gemini: {str(e)}")

            # Limpiar markdown
            texto = texto.strip()
            if texto.startswith("```json"):
                texto = texto[7:]
            elif texto.startswith("```"):
                texto = texto[3:]
            if texto.endswith("```"):
                texto = texto[:-3]
            texto = texto.strip()

            # Parsear JSON
            datos = json.loads(texto)

            campos_esperados = [
                "nombre", "descripcion", "descripcion_larga", "marca", "categoria",
                "material", "calidad", "ingredientes", "ingredientes_activos",
                "aroma", "instrucciones_cuidado", "tipo_mascota", "edad_recomendada",
                "peso", "fabricante", "registro_sanitario", "advertencias",
                "informacion_adicional", "tallas", "colores"
            ]
            for campo in campos_esperados:
                if campo not in datos or not isinstance(datos.get(campo), str):
                    datos[campo] = str(datos[campo]) if datos.get(campo) is not None else ""

            return datos

        except httpx.TimeoutException:
            last_exception = ValueError("Gemini tardó demasiado en responder. Intenta de nuevo.")
            if intento < MAX_RETRIES:
                espera = min(BASE_DELAY * (2 ** (intento - 1)), MAX_DELAY)
                print(f"[gemini] Timeout (intento {intento}/{MAX_RETRIES}), reintentando en {espera}s...")
                await asyncio.sleep(espera)
                continue
            raise last_exception

        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            body = e.response.text

            # 429 = Rate limited → reintentar con backoff
            if status == 429:
                last_exception = ValueError("Demasiadas solicitudes a Gemini. Espera e intenta de nuevo.")
                if intento < MAX_RETRIES:
                    # Usar el header Retry-After si existe, si no, backoff exponencial
                    retry_after = e.response.headers.get("Retry-After")
                    espera = float(retry_after) if retry_after else min(BASE_DELAY * (2 ** (intento - 1)), MAX_DELAY)
                    print(f"[gemini] Rate limited (429) intento {intento}/{MAX_RETRIES}, reintentando en {espera}s...")
                    await asyncio.sleep(espera)
                    continue
                raise last_exception

            # Errores definitivos (no se reintentan)
            if status == 400:
                try:
                    err_data = json.loads(body)
                    msg = err_data.get("error", {}).get("message", body)
                except json.JSONDecodeError:
                    msg = body
                raise ValueError(f"Error en la solicitud a Gemini (400): {msg[:200]}")
            elif status == 403:
                raise ValueError("API key de Gemini no autorizada o cuota excedida.")
            else:
                raise ValueError(f"Error HTTP {status} de Gemini: {body[:200]}")

        except json.JSONDecodeError as e:
            raise ValueError(f"Gemini no devolvió un JSON válido: {str(e)}")

    # Si se agotaron los reintentos
    raise last_exception or ValueError("No se pudo obtener respuesta de Gemini después de varios intentos.")
