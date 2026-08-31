// Pagos online (dLocal).
import { apiFetch } from "./client";

const base = "/api/pagos";

/**
 * Crea un pago en dLocal (Checkout REDIRECT) para un pedido.
 * payload: { pedido_id }
 * Devuelve: { redirect_url, order_id, dlocal_payment_id, estado, ... }
 * El monto se calcula SIEMPRE en el backend (nunca se envía un precio).
 */
export const iniciarCheckout = (payload) =>
  apiFetch(`${base}/checkout`, { method: "POST", body: payload });

/** Detalle de un pago propio. */
export const obtenerPago = (id) => apiFetch(`${base}/${id}`);

/**
 * Consulta el estado REAL del pago (usado al volver del Checkout de dLocal).
 * Acepta order_id, pago_id o session_id (id del pago en dLocal).
 */
export const consultarEstadoPago = ({ order_id, pago_id, session_id }) => {
  const params = new URLSearchParams();
  if (order_id) params.set("order_id", order_id);
  if (pago_id) params.set("pago_id", pago_id);
  if (session_id) params.set("session_id", session_id);
  const qs = params.toString();
  return apiFetch(`${base}/estado${qs ? `?${qs}` : ""}`);
};
