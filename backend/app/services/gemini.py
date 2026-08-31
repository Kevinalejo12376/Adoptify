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

GEMINI_MODEL = "gemini-2.5-flash"
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


# ---------------------------------------------------------------------------
# Clasificacion / generacion de texto (moderacion, PQRS, sugerencias)
# ---------------------------------------------------------------------------

# Prompts por tipo de tarea. Deben devolver SOLO JSON con la forma indicada.
_PROMPTS_CLASIFICACION = {
    "moderar_post": (
        "Eres el moderador de contenido de Adoptify (plataforma de adopcion de mascotas). "
        "Analiza el texto de una PUBLICACION del foro y responde SOLO JSON: "
        '{"decision": "aprobar"|"marcar"|"ocultar", "confianza": 0.0-1.0, '
        '"motivo": "explicacion corta en espanol", '
        '"sugerencias": "como reescribirlo para que sea apropiado"}.\n'
        "Reglas: ocultar SOLO para spam evidente, insultos graves o contenido ilegal "
        "(confianza alta). marcar para contenido dudoso. aprobar para el resto.\n"
        "Texto de la publicacion:\n"
    ),
    "moderar_comentario": (
        "Eres el moderador de comentarios de Adoptify. Analiza un COMENTARIO del foro "
        "y responde SOLO JSON: "
        '{"decision": "aprobar"|"marcar"|"ocultar", "confianza": 0.0-1.0, '
        '"motivo": "...", "sugerencias": "..."}.\n'
        "Reglas: ocultar SOLO para spam o insultos graves (confianza alta); "
        "marcar para groserias leves; aprobar para el resto.\n"
        "Texto del comentario:\n"
    ),
    "moderar_producto": (
        "Eres el moderador del marketplace de Adoptify. Analiza la descripcion de un "
        "PRODUCTO y responde SOLO JSON: "
        '{"decision": "aprobar"|"marcar"|"ocultar", "confianza": 0.0-1.0, '
        '"motivo": "...", "sugerencias": "..."}.\n'
        "Oculta solo si es contenido inapropiado, prohibido o spam.\n"
        "Nombre y descripcion del producto:\n"
    ),
    "moderar_mascota": (
        "Eres el moderador de Adoptify. Analiza la ficha de una MASCOTA y responde "
        "SOLO JSON: "
        '{"decision": "aprobar"|"marcar"|"ocultar", "confianza": 0.0-1.0, '
        '"motivo": "...", "sugerencias": "..."}.\n'
        "Oculta solo si hay contenido inapropiado, ilegal o spam.\n"
        "Ficha de la mascota:\n"
    ),
    "clasificar_pqrs": (
        "Clasifica la siguiente PQRS de una tienda de Adoptify. Responde SOLO JSON: "
        '{"categoria": "pago"|"envio"|"producto"|"plataforma"|"otro", '
        '"prioridad": "alta"|"media"|"baja", "resumen": "una frase corta en espanol"}.\n'
        "PQRS:\n"
    ),
    "clasificar_reporte": (
        "Clasifica el siguiente REPORTE de contenido de Adoptify. Responde SOLO JSON: "
        '{"categoria": "spam"|"abuso"|"contenido_inapropiado"|"estafa"|"otro", '
        '"prioridad": "alta"|"media"|"baja", "resumen": "una frase corta en espanol"}.\n'
        "Reporte:\n"
    ),
    "sugerir_descripcion": (
        "Eres un redactor experto en adopcion de mascotas. Con los datos de la mascota "
        "escribe una descripcion atractiva y empatica en espanol, y requisitos de adopcion "
        "claros. Responde SOLO JSON: "
        '{"descripcion": "descripcion de 3-5 frases", "requisitos": "lista de requisitos"}.\n'
        "Datos de la mascota:\n"
    ),
    "sugerir_hashtags": (
        "Genera 5-8 hashtags relevantes en espanol para una publicacion de Adoptify. "
        "Responde SOLO JSON: {\"hashtags\": [\"#...\", ...]}.\n"
        "Contenido de la publicacion:\n"
    ),
    "chatbot": (
        "Eres el asistente virtual de Adoptify, una plataforma de adopcion de mascotas "
        "que conecta refugios, tiendas y adoptantes. Respondes en espanol, con un tono "
        "amable y cercano, en 1-3 frases. Responde SOLO JSON con esta forma exacta:\n"
        '{"respuesta": "tu mensaje al usuario", "accion": null}\n'
        'Si el usuario pide "ir a" una seccion, devuelve accion como '
        '{"tipo": "navegar", "ruta": "/..."} usando SOLO una de estas rutas: '
        "/, /adoptar, /refugios, /tienda, /foro, /mis-pedidos, /favoritos, /login, /registrar-refugio. "
        "Si no aplica navegacion, accion: null.\n"
        "Usa el CONTEXTO (historial y pedidos del usuario) para responder sobre el estado "
        "de pedidos si se te pregunta; no inventes datos ni consultes nada fuera de lo dado.\n\n"
        "CONTEXTO (historial de la conversacion):\n"
    ),
    "compatibilidad": (
        "Eres un asesor experto en adopcion de mascotas de Adoptify. Analiza las "
        "respuestas de un test de personalidad del adoptante junto con la ficha de "
        "una mascota disponible para adopcion y calcula el NIVEL DE COMPATIBILIDAD "
        "real entre ambos. Responde SOLO JSON con esta forma exacta:\n"
        '{"porcentaje": 0-100, "mensaje": "mensaje personalizado en espanol"}\n'
        "Reglas IMPORTANTES:\n"
        "- porcentaje: numero entero entre 0 y 100 que refleje la compatibilidad "
        "real, considerando el estilo de vida, experiencia, espacio disponible, "
        "tiempo, otros animales y las necesidades y personalidad de la mascota.\n"
        "- mensaje: 2-3 frases atractivas, empaticas y coherentes con el porcentaje, "
        "mencionando a la mascota por su nombre y dando razones concretas basadas "
        "en la ficha y las respuestas. Nunca inventes datos de la mascota.\n\n"
        "DATOS:\n"
    ),
}


async def clasificar_contenido(tipo: str, texto: str) -> dict:
    """Clasifica o genera contenido de texto con Gemini para una tarea de IA.

    Args:
        tipo: clave en _PROMPTS_CLASIFICACION (moderar_post, clasificar_pqrs, ...).
        texto: contenido a analizar.

    Returns:
        dict con el resultado estructurado (decision/confianza o categoria/...).
        Si la API falla, devuelve un dict "seguro" por tipo para no romper el flujo.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY no esta configurada en el archivo .env")

    prompt = _PROMPTS_CLASIFICACION.get(tipo)
    if not prompt:
        raise ValueError(f"Tipo de clasificacion desconocido: {tipo}")

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt + texto}]}],
        "generationConfig": {
            "temperature": 0.1,
            # gemini-2.5-flash usa "thinking" por defecto, que consume el
            # presupuesto de tokens y puede TRUNCAR la respuesta JSON a mitad
            # de un string. Se desactiva el thinking y se amplía el límite para
            # que la salida llegue completa y parseable (compatibilidad, chatbot,
            # moderación, etc.).
            "maxOutputTokens": 2048,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }

    url = f"{GEMINI_API_URL}?key={api_key}"
    last_exception = None
    for intento in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()
            texto_resp = ""
            try:
                texto_resp = result["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError) as exc:
                raise ValueError(f"Error al procesar respuesta de Gemini: {str(exc)}")

            texto_resp = texto_resp.strip()
            if texto_resp.startswith("```json"):
                texto_resp = texto_resp[7:]
            elif texto_resp.startswith("```"):
                texto_resp = texto_resp[3:]
            if texto_resp.endswith("```"):
                texto_resp = texto_resp[:-3]
            texto_resp = texto_resp.strip()

            datos = json.loads(texto_resp)
            if not isinstance(datos, dict):
                raise ValueError("Gemini no devolvio un objeto JSON")
            return datos

        except httpx.TimeoutException:
            last_exception = ValueError("Gemini tardo demasiado.")
            if intento < MAX_RETRIES:
                await asyncio.sleep(min(BASE_DELAY * (2 ** (intento - 1)), MAX_DELAY))
                continue
            raise last_exception
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and intento < MAX_RETRIES:
                await asyncio.sleep(min(BASE_DELAY * (2 ** (intento - 1)), MAX_DELAY))
                continue
            last_exception = ValueError(f"Error HTTP {e.response.status_code} de Gemini")
            raise last_exception
        except json.JSONDecodeError as exc:
            raise ValueError(f"Gemini no devolvio JSON valido: {str(exc)}")

    raise last_exception or ValueError("No se pudo obtener respuesta de Gemini")


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
