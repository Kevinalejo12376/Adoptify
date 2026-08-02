// Llamadas al backend para solicitudes de adopcion.
import { apiFetch } from "./client";

const base = "/api/solicitudes";

/** Historial de adopciones del usuario autenticado. */
export const misSolicitudes = () => apiFetch(`${base}/mias`);

/** Solicitudes recibidas por el refugio autenticado. */
export const solicitudesRecibidas = () => apiFetch(`${base}/recibidas`);

/** Crea una solicitud de adopcion. */
export const crearSolicitud = (payload) =>
  apiFetch(`${base}/`, { method: "POST", body: payload });

/** Cambia el estado de una solicitud (solo refugio). */
export const actualizarEstado = (id, estado) =>
  apiFetch(`${base}/${id}/estado`, { method: "PATCH", body: { estado } });
