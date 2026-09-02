<<<<<<< HEAD
<<<<<<< HEAD
// Pagos online (dLocal).
=======
// Pagos online (Stripe).
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
// Pagos online (dLocal).
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
import { apiFetch } from "./client";

const base = "/api/pagos";

/**
<<<<<<< HEAD
<<<<<<< HEAD
 * Crea un pago en dLocal (Checkout REDIRECT) para un pedido.
 * payload: { pedido_id }
 * Devuelve: { redirect_url, order_id, dlocal_payment_id, estado, ... }
=======
 * Crea una Stripe Checkout Session para un pedido.
 * payload: { pedido_id }
 * Devuelve: { redirect_url, order_id, stripe_checkout_session_id, estado, ... }
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
 * Crea un pago en dLocal (Checkout REDIRECT) para un pedido.
 * payload: { pedido_id }
 * Devuelve: { redirect_url, order_id, dlocal_payment_id, estado, ... }
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
 * El monto se calcula SIEMPRE en el backend (nunca se envía un precio).
 */
export const iniciarCheckout = (payload) =>
  apiFetch(`${base}/checkout`, { method: "POST", body: payload });

/** Detalle de un pago propio. */
export const obtenerPago = (id) => apiFetch(`${base}/${id}`);

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
/**
 * Consulta el estado REAL del pago (usado al volver del Checkout de dLocal).
 * Acepta order_id, pago_id o session_id (id del pago en dLocal).
 */
<<<<<<< HEAD
=======
/** Consulta el estado REAL del pago (usado al volver del checkout de Stripe). */
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
export const consultarEstadoPago = ({ order_id, pago_id, session_id }) => {
  const params = new URLSearchParams();
  if (order_id) params.set("order_id", order_id);
  if (pago_id) params.set("pago_id", pago_id);
  if (session_id) params.set("session_id", session_id);
  const qs = params.toString();
  return apiFetch(`${base}/estado${qs ? `?${qs}` : ""}`);
};
<<<<<<< HEAD
<<<<<<< HEAD
=======

/** Inicia el onboarding de Stripe Connect de la tienda autenticada.
 *  Devuelve: { url } (URL de Stripe a la que redirigir al representante). */
export const iniciarOnboardingConnect = () =>
  apiFetch(`${base}/connect/onboarding`, { method: "POST" });

/** Estado de la cuenta conectada de Stripe de la tienda autenticada. */
export const estadoConnect = () => apiFetch(`${base}/connect/estado`);
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
