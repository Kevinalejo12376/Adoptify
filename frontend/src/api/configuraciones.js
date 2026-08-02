// Llamadas al backend para la configuracion de cuenta del usuario.
import { apiFetch } from "./client";

const base = "/api/configuraciones";

/** Obtiene la configuracion del usuario autenticado (crea default si no existe). */
export const obtenerConfiguracion = () => apiFetch(`${base}/`);

/** Actualiza la configuracion del usuario autenticado. */
export const actualizarConfiguracion = (payload) =>
  apiFetch(`${base}/`, { method: "PUT", body: payload });
