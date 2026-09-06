// Llamadas al backend para reseñas/valoraciones de REFUGIOS y TIENDAS.
import { apiFetch } from "./client";

/** Lista pública de reseñas de un refugio. */
export const listarResenasRefugio = (refugioId) =>
  apiFetch(`/api/refugios/${refugioId}/resenas`, { auth: false });

/** Crea/actualiza la reseña del usuario en un refugio (una por usuario). */
export const crearResenaRefugio = (refugioId, payload) =>
  apiFetch(`/api/refugios/${refugioId}/resenas`, { method: "POST", body: payload });

/** Lista pública de reseñas de una tienda aliada. */
export const listarResenasTienda = (tiendaId) =>
  apiFetch(`/api/tiendas/${tiendaId}/resenas`, { auth: false });

/** Crea/actualiza la reseña del usuario en una tienda (una por usuario). */
export const crearResenaTienda = (tiendaId, payload) =>
  apiFetch(`/api/tiendas/${tiendaId}/resenas`, { method: "POST", body: payload });
