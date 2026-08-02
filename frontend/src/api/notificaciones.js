// Llamadas al backend para notificaciones del usuario autenticado.
import { apiFetch } from "./client";

const base = "/api/notificaciones";

export const listarNotificaciones = () => apiFetch(`${base}/`);
export const contarNoLeidas = () => apiFetch(`${base}/no-leidas`);
export const marcarLeida = (id) => apiFetch(`${base}/${id}/leer`, { method: "PATCH" });
export const marcarTodasLeidas = () => apiFetch(`${base}/leer-todas`, { method: "PATCH" });
export const eliminarNotificacion = (id) => apiFetch(`${base}/${id}`, { method: "DELETE" });
