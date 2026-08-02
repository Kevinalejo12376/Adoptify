// Llamadas al backend para refugios.
import { apiFetch } from "./client";

const base = "/api/refugios";

/** Listado publico de refugios. */
export const listarRefugios = () => apiFetch(`${base}/`, { auth: false });

/** Perfil de un refugio por id. */
export const obtenerRefugio = (id) => apiFetch(`${base}/${id}`, { auth: false });

/** Perfil del refugio autenticado. */
export const miPerfil = () => apiFetch(`${base}/mi-perfil`);

/** Estadisticas reales del refugio autenticado. */
export const misEstadisticas = () => apiFetch(`${base}/mi-perfil/estadisticas`);

/** Actualizar perfil del refugio autenticado. */
export const actualizarPerfil = (payload) =>
  apiFetch(`${base}/mi-perfil`, { method: "PUT", body: payload });

/** Estadisticas publicas globales (para la landing / Home). */
export const estadisticasPublicas = () =>
  apiFetch("/api/publico/estadisticas", { auth: false });
