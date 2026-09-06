"""
Servicio de integracion con el proveedor de IA (Alibaba Cloud Model Studio).

Reemplaza a Google Gemini por un endpoint OPENAI-COMPATIBLE
(chat/completions) apuntando al workspace dedicado:
  IA_BASE_URL = https://ws-...maas.aliyuncs.com/compatible-mode/v1
  IA_MODEL     = qwen-max

Se usa para:
  - Clasificacion / generacion de texto (moderacion, PQRS, sugerencias,
    compatibilidad, chatbot, publicaciones de donacion).
  - Analisis de imagenes de productos (modelo multimodal qwen-max).

Incluye reintentos automáticos con backoff exponencial para evitar
errores de cuota (HTTP 429) y problemas de red transitorios.
"""
# pyrefly: ignore [missing-import]
import asyncio
import json
import httpx

from app.core.config import settings

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

    # Si es muy grande, recortar (el modelo igual procesa bien con menos calidad)
    max_chars = int(max_size_kb * 1024 * 4 / 3)
    b64_data = b64_data[:max_chars]
    return f"{prefix},{b64_data}" if prefix else b64_data


def _endpoint() -> str:
    """URL completa del endpoint OpenAI-compatible de chat/completions."""
    base = settings.IA_BASE_URL.rstrip("/")
    return f"{base}/chat/completions"


def _limpiar_markdown_json(texto: str) -> str:
    """Quita bloques ```json ... ``` o ``` ... ``` si el modelo los añade."""
    texto = (texto or "").strip()
    if texto.startswith("```json"):
        texto = texto[7:]
    elif texto.startswith("```"):
        texto = texto[3:]
    if texto.endswith("```"):
        texto = texto[:-3]
    return texto.strip()


async def _request_chat(
    messages: list,
    *,
    temperature: float = 0.1,
    max_tokens: int = 2048,
    timeout: float = 60.0,
) -> str:
    """Llama a /chat/completions (OpenAI-compatible) y devuelve el texto crudo.

    Reintenta con backoff exponencial ante HTTP 429 y timeouts.
    """
    api_key = settings.IA_API_KEY
    if not api_key:
        raise ValueError("IA_API_KEY no esta configurada en el archivo .env")

    payload = {
        "model": settings.IA_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = _endpoint()

    last_exception = None
    for intento in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

            # Formato OpenAI: data["choices"][0]["message"]["content"]
            try:
                content = result["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as exc:
                raise ValueError(f"Error al procesar respuesta del modelo: {str(exc)}")
            return str(content or "")

        except httpx.TimeoutException:
            last_exception = ValueError("El modelo tardo demasiado.")
            if intento < MAX_RETRIES:
                await asyncio.sleep(min(BASE_DELAY * (2 ** (intento - 1)), MAX_DELAY))
                continue
            raise last_exception
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            body = e.response.text

            # 429 = Rate limited -> reintentar con backoff
            if status == 429 and intento < MAX_RETRIES:
                retry_after = e.response.headers.get("Retry-After")
                espera = float(retry_after) if retry_after else min(BASE_DELAY * (2 ** (intento - 1)), MAX_DELAY)
                print(f"[ia] Rate limited (429) intento {intento}/{MAX_RETRIES}, reintentando en {espera}s...")
                await asyncio.sleep(espera)
                continue

            # Errores definitivos (no se reintentan)
            try:
                err_data = json.loads(body)
                msg = err_data.get("error", {}).get("message", body)
            except json.JSONDecodeError:
                msg = body
            if status == 401 or status == 403:
                raise ValueError(f"API key del proveedor de IA no autorizada o cuota excedida: {msg[:200]}")
            if status == 429:
                last_exception = ValueError(f"Demasiadas solicitudes al proveedor de IA: {msg[:200]}")
                raise last_exception
            raise ValueError(f"Error HTTP {status} del proveedor de IA: {msg[:300]}")

    raise last_exception or ValueError("No se pudo obtener respuesta del proveedor de IA")


def _extraer_json(texto: str, origen: str = "el modelo") -> dict:
    """Parsea el JSON devuelto por el modelo, tolerando markdown."""
    texto = _limpiar_markdown_json(texto)
    try:
        datos = json.loads(texto)
    except json.JSONDecodeError as exc:
        raise ValueError(f"El proveedor de IA no devolvio JSON valido: {str(exc)}")
    if not isinstance(datos, dict):
        raise ValueError(f"El proveedor de IA no devolvio un objeto JSON")
    return datos


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
    "generar_post_donacion": (
        "Eres un redactor inspirador de la comunidad de Adoptify (plataforma de adopcion "
        "de mascotas). Con los datos de una DONACION realizada por un usuario a un refugio, "
        "escribe una publicacion para el foro que inspire a otras personas a donar. "
        "Responde SOLO JSON con esta forma exacta: "
        '{"titulo": "titulo breve y emotivo (max 60 caracteres)", '
        '"contenido": "3-5 frases en espanol, con tono agradecido y motivador, '
        "mencionando al refugio y la donacion (sin inventar datos numericos)\", "
        '"tags": ["#donaciones", "#Adoptify", "#ayudaa", "#solidaridad"]}.\n'
        "No inventes nombres de personas ni cifras que no esten en los datos. "
        "Si la donacion es anonima, no reveles datos personales.\n"
        "Datos de la donacion:\n"
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
    """Clasifica o genera contenido de texto con el modelo de IA.

    Args:
        tipo: clave en _PROMPTS_CLASIFICACION (moderar_post, clasificar_pqrs, ...).
        texto: contenido a analizar.

    Returns:
        dict con el resultado estructurado (decision/confianza o categoria/...).
        Si la API falla, devuelve un dict "seguro" por tipo para no romper el flujo.
    """
    prompt = _PROMPTS_CLASIFICACION.get(tipo)
    if not prompt:
        raise ValueError(f"Tipo de clasificacion desconocido: {tipo}")

    messages = [{"role": "user", "content": prompt + texto}]
    texto_resp = await _request_chat(messages, temperature=0.1, max_tokens=2048)
    return _extraer_json(texto_resp)


async def analizar_producto(imagenes_base64: list[str]) -> dict:
    """Analiza las imágenes de un producto y devuelve la ficha estructurada.

    Usa el formato multimodal OpenAI-compatible:
      content = [{"type": "text", "text": ...},
                 {"type": "image_url", "image_url": {"url": "data:<mime>;base64,..."}}]
    """
    # Comprimir imágenes antes de enviar
    imagenes_comprimidas = [_comprimir_imagen_base64(img) for img in imagenes_base64]

    # Contenido multimodal: texto + imágenes
    content_parts = [{"type": "text", "text": _construir_prompt()}]
    for img_b64 in imagenes_comprimidas:
        if "," in img_b64:
            mime_prefix, b64_data = img_b64.split(",", 1)
            mime_type = mime_prefix.replace("data:", "").split(";")[0] if ";" in mime_prefix else "image/png"
        else:
            b64_data = img_b64
            mime_type = "image/png"
        content_parts.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{b64_data}"},
        })

    messages = [{"role": "user", "content": content_parts}]
    texto = await _request_chat(messages, temperature=0.2, max_tokens=2048, timeout=120.0)

    datos = _extraer_json(texto)
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
