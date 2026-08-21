# pyrefly: ignore [missing-import]
"""
Helper central para la integracion con n8n.

Proposito: un unico punto desde el cual el backend dispara webhooks a n8n.
Todas las llamadas son seguras: si n8n no esta configurado (N8N_ENABLED=false
o N8N_WEBHOOK_URL vacio), las funciones hacen no-op y el sistema se comporta
exactamente como antes (sin romper nada).

Dos modos:
- disparar_webhook (async): espera la respuesta de n8n y la devuelve. Se usa en
  el chatbot, que necesita el texto del bot de vuelta.
- disparar_evento (sync): "fuego y olvido" para notificaciones/moderacion. Para
  que no bloquee, el workflow de n8n debe responder de inmediato (opcion
  "Respond = Immediately" en el nodo Webhook) y seguir procesando en segundo
  plano.
"""
import json
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def n8n_activo() -> bool:
    """True si la integracion con n8n esta habilitada y configurada."""
    return bool(settings.N8N_ENABLED and settings.N8N_WEBHOOK_URL.strip())


def _url_webhook(workflow: str) -> str:
    base = settings.N8N_WEBHOOK_URL.rstrip("/")
    return f"{base}/webhook/{workflow}"


def _headers() -> dict:
    headers = {"Content-Type": "application/json"}
    if settings.N8N_WEBHOOK_SECRET:
        headers["X-N8N-Token"] = settings.N8N_WEBHOOK_SECRET
    return headers


def _body(workflow: str, payload: dict) -> dict:
    """Envoltorio estandar del cuerpo enviado a n8n."""
    return {
        "workflow": workflow,
        "timestamp": None,  # se rellena en _now_iso
        "payload": payload,
    }


def _now_iso():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


async def disparar_webhook(
    workflow: str, payload: dict, esperar_respuesta: bool = True
):
    """Dispara un webhook a n8n y opcionalmente espera su respuesta.

    Args:
        workflow: nombre del workflow (debe coincidir con el Path del nodo Webhook).
        payload: dict de datos a enviar.
        esperar_respuesta: si True, devuelve el JSON de la respuesta de n8n;
            si False, envia y devuelve {"ok": True} sin esperar el cuerpo.

    Returns:
        dict con la respuesta de n8n, o None si n8n no esta activo o fallo.
    """
    if not n8n_activo():
        return None

    body = _body(workflow, payload)
    body["timestamp"] = _now_iso()

    try:
        async with httpx.AsyncClient(timeout=settings.N8N_WEBHOOK_TIMEOUT) as client:
            resp = await client.post(
                _url_webhook(workflow), json=body, headers=_headers()
            )
            resp.raise_for_status()
            if esperar_respuesta and resp.content:
                try:
                    return resp.json()
                except json.JSONDecodeError:
                    return {"ok": True, "respuesta": resp.text}
            return {"ok": True}
    except httpx.TimeoutException:
        logger.warning("[webhooks] Timeout llamando a n8n (%s)", workflow)
        return None
    except httpx.HTTPError as exc:
        logger.warning("[webhooks] Error HTTP llamando a n8n (%s): %s", workflow, exc)
        return None


def disparar_evento(workflow: str, payload: dict):
    """Dispara un evento a n8n de forma sincrona (fuego y olvido).

    Se usa en endpoints síncronos (def) para notificaciones/moderacion.
    Si n8n no esta activo, no hace nada y no lanza errores.
    """
    if not n8n_activo():
        return None

    body = _body(workflow, payload)
    body["timestamp"] = _now_iso()

    try:
        with httpx.Client(timeout=max(5, min(settings.N8N_WEBHOOK_TIMEOUT, 10))) as client:
            resp = client.post(_url_webhook(workflow), json=body, headers=_headers())
            resp.raise_for_status()
            return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        logger.warning("[webhooks] No se pudo enviar evento a n8n (%s): %s", workflow, exc)
        return None


def disparar_webhook_sync(workflow: str, payload: dict, timeout: float | None = None):
    """Dispara un webhook a n8n de forma sincrona y ESPERA su respuesta.

    A diferencia de disparar_evento (fuego y olvido), este espera a que n8n
    termine el workflow y responda. Se usa en el envio de correos para saber si
    realmente se envio (WF-1 con responseNode) y poder usar el respaldo (Brevo)
    si n8n falla. Si n8n no esta activo o falla, devuelve None.
    """
    if not n8n_activo():
        return None

    body = _body(workflow, payload)
    body["timestamp"] = _now_iso()
    timeout_s = timeout if timeout is not None else max(5, min(settings.N8N_WEBHOOK_TIMEOUT, 60))

    try:
        with httpx.Client(timeout=timeout_s) as client:
            resp = client.post(_url_webhook(workflow), json=body, headers=_headers())
            resp.raise_for_status()
            return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        logger.warning("[webhooks] No se pudo enviar/esperar webhook a n8n (%s): %s", workflow, exc)
        return None
