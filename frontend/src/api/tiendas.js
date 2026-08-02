// Llamadas a la API para gestión de Tiendas Aliadas (admin)
import { apiFetch } from "./client";

const base = "/api/admin/tiendas";

/** Resumen estadístico de tiendas */
export async function getResumenTiendas() {
  return apiFetch(`${base}/resumen`);
}

/** Lista tiendas con filtros y paginación */
export async function listarTiendas(params = {}) {
  const q = new URLSearchParams();
  if (params.estado) q.set("estado", params.estado);
  if (params.busqueda) q.set("busqueda", params.busqueda);
  if (params.ciudad) q.set("ciudad", params.ciudad);
  if (params.ordenar) q.set("ordenar", params.ordenar);
  if (params.pagina) q.set("pagina", params.pagina);
  if (params.por_pagina) q.set("por_pagina", params.por_pagina);
  const queryStr = q.toString();
  return apiFetch(`${base}${queryStr ? `?${queryStr}` : ""}`);
}

/** Obtiene una tienda por ID */
export async function obtenerTienda(id) {
  return apiFetch(`${base}/${id}`);
}

/** Crea una tienda aliada con su usuario de acceso */
export async function crearTienda(payload) {
  return apiFetch(base, { method: "POST", body: payload });
}

/** Actualiza datos de una tienda */
export async function actualizarTienda(id, payload) {
  return apiFetch(`${base}/${id}`, { method: "PUT", body: payload });
}

/** Cambia el estado de una tienda (activar/suspender/reactivar) */
export async function cambiarEstadoTienda(id, estado) {
  return apiFetch(`${base}/${id}/estado`, {
    method: "PATCH",
    body: { estado },
  });
}

/** Restablece la contraseña de una tienda */
export async function restablecerPasswordTienda(id, nuevaPassword) {
  return apiFetch(
    `${base}/${id}/restablecer-password?nueva_password=${encodeURIComponent(nuevaPassword)}`,
    { method: "POST" }
  );
}

/** Elimina una tienda */
export async function eliminarTienda(id) {
  return apiFetch(`${base}/${id}`, { method: "DELETE" });
}

/** Lista productos de una tienda */
export async function listarProductosTienda(tiendaId) {
  return apiFetch(`${base}/${tiendaId}/productos`);
}

/** Oculta/muestra un producto de una tienda */
export async function ocultarProductoTienda(tiendaId, productoId) {
  return apiFetch(`${base}/${tiendaId}/productos/${productoId}/ocultar`, {
    method: "PATCH",
  });
}

/** Elimina un producto de una tienda */
export async function eliminarProductoTienda(tiendaId, productoId) {
  return apiFetch(`${base}/${tiendaId}/productos/${productoId}`, {
    method: "DELETE",
  });
}
