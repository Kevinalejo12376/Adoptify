// Llamadas al backend para productos (marketplace publico + gestion).
import { apiFetch } from "./client";

const base = "/api/productos";

/** Listado publico de productos. filtros: { categoria } (opcional). */
export async function listarProductos(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.categoria) params.set("categoria", filtros.categoria);
  const q = params.toString();
  return apiFetch(`${base}/${q ? `?${q}` : ""}`, { auth: false });
}

/** Detalle publico de un producto. */
export const obtenerProducto = (id) => apiFetch(`${base}/${id}`, { auth: false });

/** Perfil público de una Tienda Aliada (datos + galería + productos). */
export const obtenerTiendaPublica = (id) =>
  apiFetch(`/api/publico/tiendas/${id}`, { auth: false });

/** Productos de la tienda/refugio autenticado. */
export const misProductos = () => apiFetch(`${base}/mios`);

/** Crea un producto. */
export const crearProducto = (payload) =>
  apiFetch(`${base}/`, { method: "POST", body: payload });

/** Actualiza un producto. */
export const actualizarProducto = (id, payload) =>
  apiFetch(`${base}/${id}`, { method: "PUT", body: payload });

/** Elimina un producto. */
export const eliminarProducto = (id) => apiFetch(`${base}/${id}`, { method: "DELETE" });

// ===== Reseñas / valoraciones =====

/** Lista publica de reseñas de un producto. */
export const listarResenas = (productoId) =>
  apiFetch(`${base}/${productoId}/resenas`, { auth: false });

/** Crea o actualiza la reseña del usuario para un producto. */
export const crearResena = (productoId, payload) =>
  apiFetch(`${base}/${productoId}/resenas`, { method: "POST", body: payload });

/** Edita una reseña propia. */
export const actualizarResena = (productoId, resenaId, payload) =>
  apiFetch(`${base}/${productoId}/resenas/${resenaId}`, { method: "PUT", body: payload });

/** Elimina una reseña propia. */
export const eliminarResena = (productoId, resenaId) =>
  apiFetch(`${base}/${productoId}/resenas/${resenaId}`, { method: "DELETE" });

/** Busca un producto por código de barras (OpenFoodFacts → UPCitemDB). */
export const buscarPorCodigoBarras = (barcode) =>
  apiFetch(`${base}/barcode/${encodeURIComponent(barcode)}`, { auth: false });
