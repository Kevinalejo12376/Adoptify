"""
Servicio centralizado de integración con IA de Adoptify (backend directo).

Transporte OpenAI-compatible (POST .../chat/completions). Este módulo es el
ÚNICO lugar del backend que realiza llamadas HTTP a proveedores de IA. Toda la
lógica de dominio (prompts, parsing de JSON, análisis de imágenes) vive en los
servicios que lo consumen (p. ej. app.services.gemini), que reciben aquí el
texto plano de la respuesta.

Cadena de proveedores (failover en cascada):
  1) OpenRouter (proveedor PRINCIPAL). Conserva su mecanismo NATIVO de fallback:
       - Nivel "provider": provider.allow_fallbacks=True -> OpenRouter prueba
         otros proveedores del mismo modelo si el seleccionado falla o está
         limitado (429 / 5xx / timeout).
       - Nivel "model": "models": [principal, fallback1, ...] -> si todos los
         proveedores del modelo principal fallan, pasa al siguiente modelo.
  2) Proveedor ALTERNATIVO (OpenAI-compatible) si está configurado
     (IA_FALLBACK_ENABLED=true + IA_FALLBACK_API_KEY/BASE_URL/MODEL).
     Se intenta SOLO si toda la cadena de OpenRouter falló
     (429 / 402 / 403 / 5xx / timeout / proveedor caído / modelo no disponible).
     Debe ser un endpoint OpenAI-compatible (p. ej. Groq, Google Gemini
     compatible-mode, Alibaba, Together, etc.) para que funcione SIN cambios
     de código: basta con las variables de entorno.

Reglas:
  - Se envía el mensaje del usuario UNA vez por proveedor, en orden, hasta
    obtener la primera respuesta correcta. Nunca se duplica ni se multiplican
    peticiones al mismo proveedor (sin reintentos agresivos: reintentar el mismo
    proveedor multiplicaría peticiones y no ayuda en cuota/429).
  - Lista finita de proveedores recorrida una sola vez -> sin loops infinitos.
  - Se registra qué proveedor/modelo falló SIN revelar secretos.
  - Si TODOS los proveedores fallan, se lanza OpenRouterError con un resumen
    controlado (nunca un traceback crudo).

Seguridad: las API keys se leen de settings (variables de entorno del backend).
Nunca se exponen al frontend ni se registran en logs (se redactan).
"""
# pyrefly: ignore [missing-import]
import asyncio
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterError(Exception):
    """Error controlado del proveedor de IA con su código HTTP y mensaje seguro."""

    def __init__(self, status: int, mensaje: str):
        super().__init__(mensaje)
        self.status = status
        self.mensaje = mensaje


def _redactar(texto: str) -> str:
    """Elimina cualquier API key configurada del texto (logs/errores)."""
    texto = texto or ""
    for key in (settings.OPENROUTER_API_KEY, settings.IA_FALLBACK_API_KEY):
        if key:
            texto = texto.replace(key, "[REDACTADO]")
    return texto


def _base_url() -> str:
    """URL base de OpenRouter sin barra final."""
    return settings.OPENROUTER_BASE_URL.rstrip("/")


def modelos_configurados() -> list:
    """Cadena de modelos de OpenRouter que se envía en 'models': principal + fallbacks."""
    principal = (settings.OPENROUTER_MODEL or "").strip()
    modelos = [principal] if principal else []
    for m in settings.openrouter_fallback_list:
        if m not in modelos:
            modelos.append(m)
    return modelos


def modelos_vision_configurados() -> list:
    """Cadena de modelos de OpenRouter SOLO para peticiones con imágenes.

    Evita enviar una imagen a un modelo que no la soporta (p. ej. un fallback de
    solo texto devuelve 404 'No endpoints found that support image input').
    Configurable con OPENROUTER_VISION_MODELS; si está vacío usa la cadena
    completa (comportamiento por defecto).
    """
    vision = settings.openrouter_vision_list
    if vision:
        return list(vision)
    return modelos_configurados()


def proveedores_configurados() -> list:
    """Lista ordenada de proveedores de IA disponibles (nunca se recorre dos veces).

    Devuelve especificaciones de proveedor con la info necesaria para llamarlos.
    NO incluye claves en este diccionario (solo nombres/tipos para logging); las
    claves se leen de settings dentro de cada llamada.
    """
    proveedores = []
    # 1) OpenRouter (principal): requiere API key y al menos un modelo.
    if settings.OPENROUTER_API_KEY.strip() and modelos_configurados():
        proveedores.append({"nombre": "OpenRouter", "tipo": "openrouter"})

    # 2) Proveedor alternativo OpenAI-compatible (opcional).
    if (
        settings.IA_FALLBACK_ENABLED
        and settings.IA_FALLBACK_API_KEY.strip()
        and settings.IA_FALLBACK_BASE_URL.strip()
        and settings.IA_FALLBACK_MODEL.strip()
    ):
        proveedores.append({"nombre": "Alternativo", "tipo": "openai"})

    return proveedores


def _extraer_mensaje_error(resp: httpx.Response) -> str:
    """Extrae un mensaje de error seguro del cuerpo de la respuesta."""
    texto = (resp.text or "").strip()
    try:
        data = resp.json()
        err = data.get("error") or {}
        if isinstance(err, dict):
            return str(err.get("message") or texto)[:300]
        return str(err)[:300]
    except Exception:  # noqa: BLE001 - el cuerpo no es JSON
        return texto[:300]


def _clasificar_error(
    status: int, resp: httpx.Response, etiqueta: str
) -> OpenRouterError:
    """Devuelve un OpenRouterError con un mensaje legible según el código HTTP."""
    detalle = _extraer_mensaje_error(resp)
    if status == 400:
        motivo = "Solicitud inválida"
    elif status == 401:
        motivo = "API key inválida o no autorizada"
    elif status == 402:
        motivo = "Créditos/saldo insuficiente en el proveedor"
    elif status == 403:
        motivo = "Acceso no permitido (403)"
    elif status == 404:
        motivo = "Modelo no disponible (404)"
    elif status == 408:
        motivo = "Timeout del proveedor (408)"
    elif status == 429:
        motivo = "Límite de peticiones / proveedor saturado (429)"
    elif 500 <= status < 600:
        motivo = f"Error temporal del proveedor/servicio ({status})"
    else:
        motivo = f"Error HTTP {status}"
    mensaje = _redactar(
        f"[{etiqueta}] {motivo} | {detalle}"
    )
    logger.warning("[ia] %s", mensaje[:500])
    return OpenRouterError(status, mensaje)


async def _post_chat_json(
    *,
    url: str,
    api_key: str,
    payload: dict,
    timeout: float,
    etiqueta: str,
    referer: str = "",
    titulo: str = "",
) -> dict:
    """POST OpenAI-compatible y devuelve el JSON de la respuesta.

    Convierte cualquier fallo de red/timeout en OpenRouterError(0, ...) para que
    la cadena de proveedores pueda continuar con el siguiente.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if referer:
        headers["HTTP-Referer"] = referer
    if titulo:
        headers["X-Title"] = titulo

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException:
        msg = f"[{etiqueta}] Timeout: el proveedor no respondió en {timeout:.0f}s"
        logger.warning("[ia] %s", _redactar(msg))
        raise OpenRouterError(0, _redactar(msg))
    except httpx.HTTPError as exc:
        msg = f"[{etiqueta}] Error de red hacia el proveedor: {type(exc).__name__}"
        logger.warning("[ia] %s", _redactar(msg))
        raise OpenRouterError(0, _redactar(msg))
    except Exception as exc:  # noqa: BLE001
        msg = f"[{etiqueta}] Error inesperado de transporte: {type(exc).__name__}"
        logger.warning("[ia] %s", _redactar(msg))
        raise OpenRouterError(0, _redactar(msg))

    if resp.status_code >= 400:
        raise _clasificar_error(resp.status_code, resp, etiqueta)

    try:
        return resp.json()
    except Exception as exc:  # noqa: BLE001
        raise OpenRouterError(
            0, _redactar(f"[{etiqueta}] El proveedor devolvió una respuesta no JSON: {exc}")
        )


def _extraer_contenido(data: dict, etiqueta: str) -> str:
    """Extrae el texto de data['choices'][0]['message']['content'].

    Una respuesta 200 sin 'choices' o con contenido vacío se considera un FALLO
    del proveedor para que la cadena continúe con el siguiente modelo/proveedor
    (un modelo gratuito puede devolver 200 sin texto útil).
    """
    modelo_usado = data.get("model") or data.get("id") or ""
    if modelo_usado:
        logger.info("[ia] %s: modelo utilizado: %s", etiqueta, modelo_usado)
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError(
            0, _redactar(f"[{etiqueta}] Respuesta sin contenido válido ('choices' ausente): {exc}")
        )
    texto = str(content or "").strip()
    if not texto:
        raise OpenRouterError(0, _redactar(f"[{etiqueta}] El proveedor devolvió una respuesta vacía"))
    return texto


async def _chat_openrouter(
    messages: list,
    *,
    temperature: float,
    max_tokens: int,
    timeout: float,
    modelos_override: list | None = None,
) -> str:
    """Llama a OpenRouter con la cadena 'models' y el failover nativo.

    modelos_override permite restringir la cadena para casos especiales
    (p. ej. solo modelos con visión cuando la petición incluye imágenes).
    """
    api_key = settings.OPENROUTER_API_KEY.strip()
    if not api_key:
        raise OpenRouterError(0, "[OpenRouter] OPENROUTER_API_KEY no configurada")
    modelos = modelos_override or modelos_configurados()
    if not modelos:
        raise OpenRouterError(0, "[OpenRouter] OPENROUTER_MODEL no configurada")

    payload = {
        "models": modelos,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        # Failover nativo: OpenRouter prueba otros proveedores del mismo modelo
        # y, si todos fallan, pasa al siguiente modelo de la lista.
        "provider": {"allow_fallbacks": True},
    }
    url = f"{_base_url()}/chat/completions"
    data = await _post_chat_json(
        url=url,
        api_key=api_key,
        payload=payload,
        timeout=timeout,
        etiqueta="OpenRouter",
        referer=settings.OPENROUTER_SITE_URL.strip(),
        titulo=settings.OPENROUTER_SITE_NAME.strip(),
    )
    return _extraer_contenido(data, "OpenRouter")


async def _chat_openai_compatible(
    messages: list,
    *,
    temperature: float,
    max_tokens: int,
    timeout: float,
) -> str:
    """Llama al proveedor alternativo OpenAI-compatible (modelo único)."""
    api_key = settings.IA_FALLBACK_API_KEY.strip()
    base_url = settings.IA_FALLBACK_BASE_URL.rstrip("/")
    modelo = settings.IA_FALLBACK_MODEL.strip()
    etiqueta = "Alternativo"
    if not (api_key and base_url and modelo):
        raise OpenRouterError(0, f"[{etiqueta}] configuración incompleta")

    payload = {
        "model": modelo,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    url = f"{base_url}/chat/completions"
    data = await _post_chat_json(
        url=url,
        api_key=api_key,
        payload=payload,
        timeout=timeout,
        etiqueta=etiqueta,
    )
    return _extraer_contenido(data, etiqueta)


async def chat_completions(
    messages: list,
    *,
    temperature: float = 0.1,
    max_tokens: int = 2048,
    timeout: float = 60.0,
    modelos: list | None = None,
) -> str:
    """Genera una respuesta de texto con la cadena de proveedores de IA.

    Args:
        messages: lista de mensajes estilo OpenAI (roles system/user/assistant).
        temperature: control de creatividad.
        max_tokens: máximo de tokens a generar.
        timeout: segundos de espera por proveedor (cada petición HTTP).
        modelos: (opcional) restringe la cadena 'models' de OpenRouter. Si la
            petición es multimodal (visión), pasa aquí modelos con soporte de
            imágenes (p. ej. modelos_vision_configurados()).

    Returns:
        Contenido de texto de data["choices"][0]["message"]["content"] del
        PRIMER proveedor que responda correctamente.

    Raises:
        ValueError: si no hay ningún proveedor de IA configurado.
        OpenRouterError: si TODOS los proveedores configurados fallan.
    """
    proveedores = proveedores_configurados()
    if not proveedores:
        raise ValueError(
            "No hay proveedor de IA configurado en el backend (.env). "
            "Configura OPENROUTER_API_KEY + OPENROUTER_MODEL (principal) o "
            "IA_FALLBACK_ENABLED=true + IA_FALLBACK_API_KEY/BASE_URL/MODEL (alternativo). "
            "Las claves deben estar SOLO en el backend, nunca en el frontend."
        )

    # Fallos "transitorios" que merecen reintento con backoff: los modelos
    # gratuitos (:free) de OpenRouter devuelven con frecuencia 429 o incluso un
    # 200 SIN 'choices' (error del proveedor) por saturación momentánea
    # (verificado 2026-09). Varias pasadas con backoff creciente sortean esos
    # fallos sin multiplicar peticiones de forma agresiva. Los 4xx permanentes
    # (400/401/403/404) no se reintentan porque no van a mejorar.
    reintentables = {0, 408, 429, 500, 502, 503, 504}
    MAX_PASADAS = 4
    errores_totales: list = []  # (etiqueta, OpenRouterError)
    for pasada in range(1, MAX_PASADAS + 1):
        errores: list = []  # (etiqueta, OpenRouterError)
        for prov in proveedores:
            try:
                if prov["tipo"] == "openrouter":
                    return await _chat_openrouter(
                        messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        timeout=timeout,
                        modelos_override=modelos,
                    )
                return await _chat_openai_compatible(
                    messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=timeout,
                )
            except OpenRouterError as exc:
                logger.warning(
                    "[ia] Proveedor '%s' falló (HTTP %s): %s",
                    prov["nombre"],
                    exc.status,
                    _redactar(exc.mensaje)[:300],
                )
                errores.append((prov["nombre"], exc))
        errores_totales.extend(errores)

        # Reintentar SOLO si TODOS fallaron por causas transitorias y queda pasada.
        ultimo = errores[0][1] if errores else None
        if pasada < MAX_PASADAS and ultimo and ultimo.status in reintentables:
            espera = 2 * pasada
            logger.info(
                "[ia] Fallo transitorio (HTTP %s). Reintento %s/%s en %ss...",
                ultimo.status,
                pasada + 1,
                MAX_PASADAS,
                espera,
            )
            await asyncio.sleep(espera)
            continue
        break

    # Todos los proveedores fallaron -> error controlado (sin traceback crudo).
    # Se deduplican los proveedores repetidos por cada pasada de reintento.
    status_final = errores_totales[0][1].status if errores_totales else 0
    vistos: set = set()
    unicos: list = []
    for nombre, exc in errores_totales:
        clave = (nombre, exc.status)
        if clave not in vistos:
            vistos.add(clave)
            unicos.append((nombre, exc))
    resumen = "; ".join(f"{nombre} (HTTP {exc.status})" for nombre, exc in unicos)
    mensaje = _redactar(
        f"Ningún proveedor de IA respondió correctamente. "
        f"Intentados: {resumen or 'ninguno'}. Revisa la configuración/cuota de los proveedores."
    )
    logger.warning("[ia] %s", mensaje[:500])
    raise OpenRouterError(status_final, mensaje)
