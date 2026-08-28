"""Servicio de integración con Stripe (Checkout, Webhooks y Connect).

Implementa el flujo oficial de Stripe:
  - Stripe Checkout (hosted): https://docs.stripe.com/payments/checkout
  - Webhooks con verificación de firma: https://docs.stripe.com/webhooks
  - Stripe Connect (cuentas Express + separación de cobros y transferencias):
    https://docs.stripe.com/connect

Modelo de distribución elegido (carritos multi-tienda):
  "Separate charges and transfers": Adoptify (cuenta de plataforma, US -> USD)
  cobra el total del pedido mediante Checkout y, cuando el pago se confirma por
  webhook, crea una Transferencia a la cuenta conectada de CADA tienda por el
  monto de sus productos menos la comisión de la plataforma.

La cuenta de Stripe de Adoptify está registrada en EE.UU., por lo que la
moneda de cobro es USD. El pedido en la BD se mantiene en COP (columna monto);
la conversión COP -> centavos de la moneda de Stripe usa STRIPE_CONVERSION_RATE.
"""
# pyrefly: ignore [missing-import]
import logging
from decimal import Decimal, ROUND_HALF_UP

# pyrefly: ignore [missing-import]
import stripe

from app.core.config import settings

logger = logging.getLogger(__name__)


class StripeConfiguracionError(Exception):
    """Se lanza cuando Stripe no está configurado (claves vacías)."""


def _asegurar_configuracion():
    """Configura la API key de Stripe (una sola vez) y valida que exista."""
    if not settings.STRIPE_SECRET_KEY:
        raise StripeConfiguracionError(
            "Stripe no está configurado. Revisa la variable STRIPE_SECRET_KEY del backend."
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY


# ============================================================
# Conversión de moneda
# ============================================================
def cop_a_centavos(cop_amount, rate: float = None) -> int:
    """Convierte un monto COP (entero, sin centavos) a centavos de la moneda
    de cobro de Stripe (USD). Ej: 25000 COP a 4000 COP/USD -> 625 centavos.

    Nunca devuelve 0: si la conversión diera menos de 1 centavo se usa 1.
    """
    tasa = rate if rate is not None else float(settings.STRIPE_CONVERSION_RATE or 0)
    if tasa <= 0:
        raise ValueError("STRIPE_CONVERSION_RATE debe ser mayor que 0")
    cop = Decimal(str(cop_amount or 0))
    centavos = (cop / Decimal(str(tasa)) * Decimal("100")).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )
    return max(1, int(centavos))


# ============================================================
# Stripe Checkout (hosted)
# ============================================================
def crear_checkout_session(*, pedido, items, monto_cents: int, moneda: str) -> dict:
    """Crea una Stripe Checkout Session en modo payment (hosted).

    - ``items``: lista de dicts {nombre, cantidad, precio_centavos}.
    - ``monto_cents``: total del pedido convertido a centavos de ``moneda``.
    - Devuelve la sesión completa (id, url, payment_intent...).

    Este es el modelo "separate charges and transfers": el cobro va a la
    cuenta de plataforma (Adoptify) y luego se distribuye con Transferencias.
    """
    _asegurar_configuracion()
    line_items = []
    for it in items:
        line_items.append({
            "price_data": {
                "currency": moneda,
                "unit_amount": it["precio_centavos"],
                "product_data": {"name": it["nombre"][:200]},
            },
            "quantity": it["cantidad"],
        })

    # La URL de éxito incluye el id de la sesión ({CHECKOUT_SESSION_ID}) para
    # que la página /pago-resultado pueda consultar el estado REAL del pago.
    success_url = settings.stripe_success_url
    if "{CHECKOUT_SESSION_ID}" not in success_url:
        sep = "&" if "?" in success_url else "?"
        success_url = f"{success_url}{sep}session_id={{CHECKOUT_SESSION_ID}}"

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        customer_email=_email_comprador(items),
        success_url=success_url,
        cancel_url=settings.stripe_cancel_url,
        metadata={
            "pedido_id": str(pedido.id),
            "order_id": getattr(pedido, "order_id", "") or f"ADOPTIFY-PEDIDO-{pedido.id}",
        },
        # El pago entra a la cuenta de la plataforma (no hay destination único
        # porque un pedido puede contener productos de varias tiendas).
        payment_intent_data={
            "metadata": {
                "pedido_id": str(pedido.id),
                "order_id": getattr(pedido, "order_id", "") or f"ADOPTIFY-PEDIDO-{pedido.id}",
            },
        },
    )
    logger.info(
        "[stripe] Checkout session creada id=%s monto_cents=%s %s",
        session.id, monto_cents, moneda,
    )
    return {
        "id": session.id,
        "url": session.url,
        "payment_intent_id": getattr(session, "payment_intent", None),
        "monto_cents": monto_cents,
        "moneda": moneda,
    }


def _email_comprador(items):
    """Extrae el email del comprador si se pasó como item especial, si no None.

    El email se envía en ``metadata['__email']`` dentro del primer item.
    """
    for it in items or []:
        if it.get("__email"):
            return it["__email"]
    return None


# ============================================================
# Webhooks (verificación de firma)
# ============================================================
def construir_evento(raw_body: bytes, sig_header: str):
    """Valida la firma del webhook usando STRIPE_WEBHOOK_SECRET y devuelve el
    evento de Stripe. Lanza una excepción si la firma no es válida.

    Documentación oficial: https://docs.stripe.com/webhooks#verify-events
    """
    _asegurar_configuracion()
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise StripeConfiguracionError(
            "STRIPE_WEBHOOK_SECRET no está configurado. No se pueden validar webhooks."
        )
    return stripe.Webhook.construct_event(
        payload=raw_body,
        sig_header=sig_header,
        secret=settings.STRIPE_WEBHOOK_SECRET,
    )


def obtener_checkout_session(session_id: str):
    """Obtiene una Checkout Session (para leer su PaymentIntent y estado)."""
    _asegurar_configuracion()
    return stripe.checkout.Session.retrieve(
        session_id,
        expand=["payment_intent"],
    )


def obtener_payment_intent(payment_intent_id: str):
    """Obtiene un PaymentIntent (para leer el estado real del cargo)."""
    _asegurar_configuracion()
    return stripe.PaymentIntent.retrieve(payment_intent_id)


# ============================================================
# Stripe Connect (onboarding Express + cuentas conectadas)
# ============================================================
def crear_cuenta_conectada(*, email: str, nombre_tienda: str, tienda_id: int) -> dict:
    """Crea una cuenta conectada tipo 'express' para una tienda de Adoptify.

    La tienda/vendedor se registra desde Adoptify y su representante completa
    el onboarding en la página de Stripe (AccountLink). NO se almacenan claves
    del vendedor: solo el identificador de la cuenta (stripe_account_id).
    """
    _asegurar_configuracion()
    cuenta = stripe.Account.create(
        type="express",
        country="CO",
        email=email,
        business_type="individual",
        capabilities={"transfers": {"requested": True}},
        business_profile={
            "name": nombre_tienda[:120],
            "url": settings.FRONTEND_URL,
        },
        metadata={"adoptify_tienda_id": str(tienda_id)},
    )
    logger.info("[stripe] Cuenta conectada creada account_id=%s", cuenta.id)
    return {"id": cuenta.id, "charges_enabled": cuenta.charges_enabled, "payouts_enabled": cuenta.payouts_enabled}


def crear_account_link(*, account_id: str, refresh_url: str, return_url: str) -> str:
    """Crea un AccountLink para que el representante complete el onboarding
    (tipo account_onboarding). Devuelve la URL a la que redirigir al usuario."""
    _asegurar_configuracion()
    enlace = stripe.AccountLink.create(
        account=account_id,
        refresh_url=refresh_url,
        return_url=return_url,
        type="account_onboarding",
    )
    return enlace.url


def obtener_cuenta_conectada(account_id: str):
    """Obtiene la cuenta conectada y su estado real en Stripe."""
    _asegurar_configuracion()
    return stripe.Account.retrieve(account_id)


def cuenta_puede_recibir_fondos(cuenta) -> bool:
    """True si la cuenta conectada puede recibir fondos (transferencias).

    Para recibir dinero por transferencia, Stripe exige que la cuenta esté
    habilitada para cobros y pagos (charges_enabled y payouts_enabled).
    """
    try:
        return bool(cuenta.charges_enabled and cuenta.payouts_enabled)
    except Exception:  # noqa: BLE001
        return False


def cuenta_estado_legible(cuenta) -> str:
    """Traduce el estado de la cuenta conectada a un estado interno de Adoptify:
    lista | pendiente_onboarding | invalida."""
    if cuenta_puede_recibir_fondos(cuenta):
        return "lista"
    if getattr(cuenta, "details_submitted", False):
        return "pendiente_onboarding"
    return "pendiente_onboarding"


# ============================================================
# Distribución del dinero (Separate charges and transfers)
# ============================================================
def crear_transferencia(
    *,
    account_id: str,
    monto_centavos: int,
    moneda: str,
    order_id: str,
    pedido_id: int,
    tienda_id: int,
) -> str:
    """Transfiere desde el balance de la plataforma a la cuenta conectada de
    la tienda por su parte (subtotal de sus productos - comisión de Adoptify).

    Devuelve el id de la Transferencia creada.
    """
    _asegurar_configuracion()
    transferencia = stripe.Transfer.create(
        amount=int(monto_centavos),
        currency=moneda,
        destination=account_id,
        transfer_group=order_id,
        metadata={
            "pedido_id": str(pedido_id),
            "order_id": order_id,
            "tienda_id": str(tienda_id),
        },
    )
    logger.info(
        "[stripe] Transferencia creada id=%s monto_cents=%s %s -> %s",
        transferencia.id, monto_centavos, moneda, account_id,
    )
    return transferencia.id
