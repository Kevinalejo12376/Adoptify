"""Servicio de notificaciones por WhatsApp (via n8n, workflow WF-7).

El backend NO se conecta directamente a Twilio/Meta: enruta el mensaje a n8n
(webhook "enviar_whatsapp"), que es quien tiene las credenciales del proveedor
(WHATSAPP_PROVIDER, TWILIO_*/META_*). Si n8n no esta activo o no hay proveedor
configurado, la funcion hace no-op (no rompe nada).
"""
import logging

from app.core.config import settings
from app.core.webhooks import n8n_activo, disparar_evento

logger = logging.getLogger(__name__)


def whatsapp_activo() -> bool:
    """True si WhatsApp esta habilitado: n8n activo + proveedor configurado."""
    if not n8n_activo():
        return False
    prov = (settings.WHATSAPP_PROVIDER or "").strip().lower()
    if prov == "twilio":
        return bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN)
    if prov == "meta":
        return bool(settings.META_WHATSAPP_TOKEN and settings.META_WHATSAPP_PHONE_ID)
    return False


def enviar_whatsapp(telefono: str, mensaje: str) -> bool:
    """Envia un mensaje de WhatsApp por n8n (WF-7). Fire-and-forget.

    Args:
        telefono: numero en formato E.164 (ej. 573001234567) o con '+' (+573001234567).
        mensaje: texto a enviar.
    Returns:
        True si se enruto a n8n; False si WhatsApp no esta activo o fallo.
    """
    if not whatsapp_activo():
        return False
    ok = disparar_evento(
        "enviar_whatsapp",
        {"telefono": telefono, "mensaje": mensaje},
    )
    if ok:
        logger.info("✓ WhatsApp enrutado a n8n (WF-7) para %s", telefono)
        return True
    logger.warning("[whatsapp] n8n no respondio al enviar WhatsApp a %s", telefono)
    return False
