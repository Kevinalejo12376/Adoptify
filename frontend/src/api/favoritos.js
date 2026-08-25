// Llamadas al backend para favoritos (mascotas y productos) del usuario.
import { apiFetch } from "./client";

const base = "/api/favoritos";

/** Mascotas favoritas del usuario autenticado. */
export const listarMascotasFavoritas = () => apiFetch(`${base}/mascotas`);

/** Ids de mascotas favoritas (para marcar corazones). */
export const idsMascotasFavoritas = () => apiFetch(`${base}/mascotas/ids`);

/** Agrega una mascota a favoritos. */
export const agregarMascotaFavorita = (mascotaId) =>
  apiFetch(`${base}/mascotas/${mascotaId}`, { method: "POST" });

/** Quita una mascota de favoritos. */
export const quitarMascotaFavorita = (mascotaId) =>
  apiFetch(`${base}/mascotas/${mascotaId}`, { method: "DELETE" });

/** Productos favoritos del usuario autenticado. */
export const listarProductosFavoritos = () => apiFetch(`${base}/productos`);

/** Agrega un producto a favoritos. */
export const agregarProductoFavorito = (productoId) =>
  apiFetch(`${base}/productos/${productoId}`, { method: "POST" });

/** Quita un producto de favoritos. */
export const quitarProductoFavorito = (productoId) =>
  apiFetch(`${base}/productos/${productoId}`, { method: "DELETE" });

/** Refugios favoritos del usuario autenticado. */
export const listarRefugiosFavoritos = () => apiFetch(`${base}/refugios`);

/** Agrega un refugio a favoritos. */
export const agregarRefugioFavorito = (refugioId) =>
  apiFetch(`${base}/refugios/${refugioId}`, { method: "POST" });

/** Quita un refugio de favoritos. */
export const quitarRefugioFavorito = (refugioId) =>
  apiFetch(`${base}/refugios/${refugioId}`, { method: "DELETE" });
