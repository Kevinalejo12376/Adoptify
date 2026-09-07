"""
Servicio centralizado de integración con OpenRouter (proveedor principal de IA).

OpenRouter expone una API compatible con OpenAI:
    POST {OPENROUTER_BASE_URL}/chat/completions
    Authorization: Bearer $OPENROUTER_API_KEY

Este módulo es el ÚNICO lugar del backend que realiza llamadas HTTP a
OpenRouter. Toda la lógica de dominio (prompts, parsing de JSON, análisis de
imágenes) vive en los servicios que lo consumen (p. ej. app.services.gemini),
que reciben aquí el texto plano de la respuesta.

Failover (mecanismo NATIVO de OpenRouter, sin lógica manual):
  1) Nivel "provider": se envía provider.allow_fallbacks=True para que OpenRouter
     pruebe otros proveedores del mismo modelo si el seleccionado falla o está
     limitado (429 / 5xx / timeout / indisponibilidad).
  2) Nivel "model": se envía "models": [principal, fallback1, fallback2]. Si
     todos los proveedores del modelo principal fallan, OpenRouter pasa
     automáticamente al siguiente modelo de la lista.

Por eso NO se implementan reintentos agresivos aquí: reintentar desde el backend
multiplicaría peticiones. Solo se confía en el fallback de OpenRouter y se
reporta un error claro únicamente si TODA la cadena falla.

Seguridad: la API key se lee de settings.OPENROUTER_API_KEY (variable de entorno
del backend). Nunca se expone al frontend ni se registra en logs.
"""
# pyrefly: ignore [missing-import]
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenRouterError(Exception):
    """Error controlado de OpenRouter con su código HTTP y un mensaje seguro."""

    def __init__(self, status: int, mensaje: str):
        super().__init__(mensaje)
        self.status = status
        self.mensaje = mensaje


def _base_url() -> str:
    """URL base sin barra final (settings.OPENROUTER_BASE_URL)."""
    return settings.OPENROUTER_BASE_URL.rstrip("/")


def modelos_configurados() -> list:
    """Cadena de modelos que se envía en 'models': principal + fallbacks."""
    principal = (settings.OPENROUTER_MODEL or "").strip()
    modelos = [principal] if principal else []
    for m in settings.openrouter_fallback_list:
        if m not in modelos:
            modelos.append(m)
    return modelos


def _extraer_mensaje_error(resp: httpx.Response) -> str:
    """Extrae un mensaje de error seguro del cuerpo de OpenRouter."""
    texto = (resp.text or "").strip()
    try:
        data = resp.json()
        err = data.get("error") or {}
        if isinstance(err, dict):
            return str(err.get("message") or texto)[:300]
        return str(err)[:300]
    except Exception:  # noqa: BLE001 - el cuerpo no es JSON
        return texto[:300]


def _clasificar_error(status: int, resp: httpx.Response, modelos: list) -> OpenRouterError:
    """Devuelve un OpenRouterError con un mensaje legible según el código HTTP."""
    detalle = _extraer_mensaje_error(resp)
    if status == 400:
        motivo = "Solicitud inválida"
    elif status == 401:
        motivo = "API key de OpenRouter inválida o no autorizada"
    elif status == 402:
        motivo = "Créditos/saldo insuficiente en OpenRouter"
    elif status == 403:
        motivo = "Acceso no permitido (403)"
    elif status == 408:
        motivo = "Timeout del proveedor (408)"
    elif status == 429:
        motivo = "Rate limit alcanzado en toda la cadena de modelos de OpenRouter (429)"
    elif 500 <= status < 600:
        motivo = f"Error temporal del proveedor/servicio ({status})"
    else:
        motivo = f"Error HTTP {status}"
    mensaje = f"{motivo} | modelos probados: {', '.join(modelos) or 'ninguno'} | {detalle}"
    logger.warning("[openrouter] %s", mensaje[:500])
    return OpenRouterError(status, mensaje)


async def chat_completions(
    messages: list,
    *,
    temperature: float = 0.1,
    max_tokens: int = 2048,
    timeout: float = 60.0,
) -> str:
    """Llama a OpenRouter (chat/completions) y devuelve el texto del primer mensaje.

    Args:
        messages: lista de mensajes estilo OpenAI (roles system/user/assistant).
        temperature: control de creatividad.
        max_tokens: máximo de tokens a generar.
        timeout: segundos de espera de la petición HTTP.

    Returns:
        Contenido de texto de data["choices"][0]["message"]["content"].

    Raises:
        ValueError: si no hay OPENROUTER_API_KEY configurada.
        OpenRouterError: si toda la cadena de modelos de OpenRouter falla.
    """
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise ValueError(
            "OPENROUTER_API_KEY no está configurada en el backend (.env). "
            "La clave debe estar SOLO en el backend, nunca en el frontend."
        )

    modelos = modelos_configurados()
    if not modelos:
        raise ValueError("OPENROUTER_MODEL no está configurada en el backend (.env).")

    payload = {
        "models": modelos,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        # Nivel 1 de failover: OpenRouter puede usar otros proveedores del mismo
        # modelo cuando el seleccionado falla o está limitado.
        "provider": {"allow_fallbacks": True},
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    # Cabeceras opcionales para atribución/ranking del sitio (no sensibles).
    if settings.OPENROUTER_SITE_URL.strip():
        headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL.strip()
    if settings.OPENROUTER_SITE_NAME.strip():
        headers["X-Title"] = settings.OPENROUTER_SITE_NAME.strip()

    url = f"{_base_url()}/chat/completions"
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload, headers=headers)

    if resp.status_code >= 400:
        raise _clasificar_error(resp.status_code, resp, modelos)

    try:
        data = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise OpenRouterError(0, f"OpenRouter devolvió una respuesta no JSON: {exc}") from exc

    # Observabilidad: el modelo que realmente respondió lo decide OpenRouter.
    modelo_usado = data.get("model") or data.get("id") or ""
    if modelo_usado:
        logger.info("[openrouter] modelo utilizado: %s", modelo_usado)

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError(0, f"Respuesta de OpenRouter sin contenido válido: {exc}") from exc

    return str(content or "")
