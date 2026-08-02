// Pedidos del comprador (usuario autenticado).
import { apiFetch } from "./client";

const base = "/api/pedidos";

/** Crea un pedido (checkout). payload: { items:[{producto_id,cantidad}], ... }. */
export const crearPedido = (payload) =>
  apiFetch(base, { method: "POST", body: payload });

/** Lista mis pedidos. */
export const misPedidos = () => apiFetch(`${base}/mios`);

/** Detalle de un pedido propio. */
export const obtenerPedido = (id) => apiFetch(`${base}/${id}`);

/** Obtiene el historial de estados de un pedido. */
export const historialPedido = (id) => apiFetch(`${base}/${id}/historial`);
