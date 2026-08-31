"""Servicio de integración con dLocal Go (Create a payment / Checkout Redirect).

dLocal Go (a diferencia del API general de dLocal Payins) utiliza SOLO las
credenciales del dashboard: API Key y Secret Key (SmartFields opcional).
No usa el esquema antiguo de Payins (Login/Trans Key ni firma HMAC de la
petición) para autenticar.

Documentación oficial (https://docs.dlocalgo.com/integration-api):
  - Base URL Sandbox: https://api-sbx.dlocalgo.com
  - Autenticación:    Authorization: Bearer <API_KEY>:<SECRET_KEY>
  - Crear pago:       POST /v1/payments
  - Body oficial:     { currency, amount, country, order_id, description,
                        success_url, back_url, notification_url }
  - Respuesta:        { id, status, redirect_url, ... } -> el frontend redirige
                       a redirect_url.

Adoptify cobra en Colombia (COP); country="CO" y currency="COP" van en el JSON.
El monto se envía como entero (COP, sin centavos artificiales).
Seguridad: las claves solo se usan desde el backend; nunca se devuelven al
frontend ni se imprimen completas en logs.

Webhook/Notifications (documentación oficial Payments -> Notifications):
  - dLocal Go hace POST a notification_url con body { "payment_id": "..." }.
  - Header: Authorization: V2-HMAC-SHA256, Signature: <firma>.
  - Firma:  HMAC-SHA256(message = API_KEY + RAW_REQUEST_BODY, SECRET_KEY) hex.
  - El estado real se obtiene consultando GET /v1/payments/{payment_id}.
"""
# pyrefly: ignore [missing-import]
import hashlib
import hmac
import json
import logging

# pyrefly: ignore [missing-import]
import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# Base URLs de dLocal Go. Sandbox confirmado por la doc oficial.
_BASE_URLS = {
    "sandbox": "https://api-sbx.dlocalgo.com",
    "prod": "https://api.dlocalgo.com",
    "production": "https://api.dlocalgo.com",
}

# Endpoint oficial para crear un pago en dLocal Go.
_PAYMENTS_PATH = "v1/payments"


class DlocalConfiguracionError(Exception):
    """Se lanza cuando dLocal no está configurado (claves vacías)."""


class DlocalApiError(Exception):
    """Error devuelto por la API de dLocal (con detalles técnicos para logs)."""

    def __init__(self, message: str, http_status: int = None, code: str = None,
                 request_id: str = None):
        super().__init__(message)
        self.message = message
        self.http_status = http_status
        self.code = code
        self.request_id = request_id


def _asegurar_configuracion():
    """Valida que existan las credenciales de dLocal Go."""
    if not settings.DLOCAL_API_KEY or not settings.DLOCAL_SECRET_KEY:
        raise DlocalConfiguracionError(
            "dLocal no está configurado. Revisa DLOCAL_API_KEY y DLOCAL_SECRET_KEY del backend."
        )


def _base_url() -> str:
    env = (settings.DLOCAL_ENV or "sandbox").lower()
    return _BASE_URLS.get(env, _BASE_URLS["sandbox"])


def _headers() -> dict:
    """Headers de autenticación de dLocal Go.

    Documentación oficial: Authorization: Bearer <API_KEY>:<SECRET_KEY>.
    """
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {settings.DLOCAL_API_KEY}:{settings.DLOCAL_SECRET_KEY}",
    }


def _levantar_error(resp):
    """Convierte una respuesta HTTP de error en un DlocalApiError.

    Registra en logs: código, HTTP, request_id y mensaje (nunca secretos).
    """
    try:
        detalle = resp.json() or {}
    except ValueError:
        detalle = {}
    mensaje = (
        detalle.get("message")
        or detalle.get("error")
        or f"HTTP {resp.status_code}"
    )
    codigo = detalle.get("code")
    request_id = resp.headers.get("X-Request-Id") or resp.headers.get("request-id")
    logger.error(
        "[dlocal] Error API: HTTP=%s code=%s request_id=%s msg=%s",
        resp.status_code, codigo, request_id, mensaje,
    )
    return DlocalApiError(
        message=str(mensaje)[:255],
        http_status=resp.status_code,
        code=codigo,
        request_id=request_id,
    )


def _requisitar(method: str, ruta: str, cuerpo: dict = None) -> dict:
    """Ejecuta una petición autenticada a la API de dLocal Go y devuelve el JSON."""
    _asegurar_configuracion()
    url = f"{_base_url()}/{ruta.lstrip('/')}"
    try:
        if method == "GET":
            resp = requests.get(url, headers=_headers(), timeout=30)
        else:
            resp = requests.post(url, headers=_headers(), json=cuerpo or {}, timeout=30)
    except requests.RequestException as exc:
        logger.error("[dlocal] Error de red llamando a dLocal Go (%s %s): %s", method, ruta, exc)
        raise DlocalApiError(message="No se pudo conectar con dLocal. Intenta de nuevo.")
    if resp.status_code >= 400:
        raise _levantar_error(resp)
    try:
        return resp.json()
    except ValueError:
        logger.error("[dlocal] Respuesta no JSON (%s %s): %s", method, ruta, resp.status_code)
        raise DlocalApiError(message="Respuesta inválida de dLocal.")


# ============================================================
# Crear pago (Checkout Redirect)
# ============================================================
def crear_checkout(
    *,
    pedido,
    monto_cop: int,
    success_url: str,
    back_url: str,
    notification_url: str,
    payer: dict = None,
) -> dict:
    """Crea un pago en dLocal Go (POST /v1/payments) y devuelve la respuesta.

    - ``monto_cop``: monto en COP (entero, sin decimales) calculado SIEMPRE en
      el backend desde la BD.
    - ``success_url``: página de éxito de Adoptify.
    - ``back_url``: página de regreso/cancelación de Adoptify.
    - ``notification_url``: endpoint de webhook de Adoptify (/api/pagos/webhook).
    - Devuelve { id, status, redirect_url, ... } de dLocal Go (redirect_url es
      a donde se redirige al usuario para pagar).
    """
    _asegurar_configuracion()
    numero = f"ADOPTIFY-PEDIDO-{pedido.id}"
    cuerpo = {
        "currency": settings.DLOCAL_CURRENCY or "COP",
        "amount": int(monto_cop),
        "country": settings.DLOCAL_COUNTRY or "CO",
        "order_id": numero,
        "description": f"Pedido {numero} en Adoptify",
        "success_url": success_url,
        "back_url": back_url,
        "notification_url": notification_url,
    }
    if payer:
        cuerpo["payer"] = payer
    logger.info("[dlocal] Creando pago order_id=%s monto_cop=%s %s", numero, monto_cop, cuerpo["currency"])
    respuesta = _requisitar("POST", _PAYMENTS_PATH, cuerpo)
    logger.info("[dlocal] Pago creado id=%s status=%s", respuesta.get("id"), respuesta.get("status"))
    return respuesta


def consultar_pago(dlocal_id: str) -> dict:
    """Consulta el estado de un pago de dLocal Go (GET /v1/payments/{id})."""
    _asegurar_configuracion()
    logger.info("[dlocal] Consultando pago id=%s", dlocal_id)
    return _requisitar("GET", f"{_PAYMENTS_PATH}/{dlocal_id}")


# ============================================================
# Webhook (verificación de firma - Notifications)
# ============================================================
def verificar_webhook(raw_body: bytes, auth_header: str) -> dict:
    """Valida la firma del webhook de dLocal Go y devuelve el evento como dict.

    Documentación oficial (Payments -> Notifications):
      - Header:  Authorization: V2-HMAC-SHA256, Signature: <firma>
      - Firma:   HMAC-SHA256(message = API_KEY + RAW_REQUEST_BODY, SECRET_KEY) hex
      - Body:    { "payment_id": "DP-283" }
    Este header Authorization se usa SOLO para validar el webhook (las peticiones
    de API usan Bearer API:SECRET, no HMAC).
    """
    _asegurar_configuracion()
    if not auth_header:
        raise DlocalApiError(message="Webhook sin firma Authorization.")
    auth_str = auth_header.strip()
    if ", Signature:" not in auth_str:
        raise DlocalApiError(message="Header Authorization de webhook inválido.")
    firma_recibida = auth_str.split(", Signature:", 1)[1].strip()
    try:
        cuerpo_str = raw_body.decode("utf-8")
    except UnicodeDecodeError:
        raise DlocalApiError(message="Cuerpo de webhook inválido.")
    mensaje = (settings.DLOCAL_API_KEY + cuerpo_str).encode("utf-8")
    firma_esperada = hmac.new(
        settings.DLOCAL_SECRET_KEY.encode("utf-8"),
        mensaje,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(firma_esperada, firma_recibida):
        logger.warning("[dlocal] Webhook con firma inválida.")
        raise DlocalApiError(message="Firma de webhook inválida.")
    try:
        return json.loads(cuerpo_str)
    except ValueError:
        logger.warning("[dlocal] Webhook con cuerpo no JSON.")
        raise DlocalApiError(message="Cuerpo de webhook inválido.")
