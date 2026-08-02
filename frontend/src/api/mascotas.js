// Llamadas al backend para mascotas (publico + gestion del refugio).
import { apiFetch } from "./client";

const base = "/api/mascotas";

/** Listado publico de mascotas. filtros: { tipo, estado } (opcionales). */
export async function listarMascotas(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.estado) params.set("estado", filtros.estado);
  const q = params.toString();
  return apiFetch(`${base}/${q ? `?${q}` : ""}`, { auth: false });
}

/** Detalle publico de una mascota. */
export async function obtenerMascota(id) {
  return apiFetch(`${base}/${id}`, { auth: false });
}

/** Mascotas del refugio autenticado. */
export async function misMascotas() {
  return apiFetch(`${base}/mias`);
}

/** Crea una mascota (refugio). */
export async function crearMascota(payload) {
  return apiFetch(`${base}/`, { method: "POST", body: payload });
}

/** Actualiza una mascota (refugio). */
export async function actualizarMascota(id, payload) {
  return apiFetch(`${base}/${id}`, { method: "PUT", body: payload });
}

/** Elimina una mascota (refugio). */
export async function eliminarMascota(id) {
  return apiFetch(`${base}/${id}`, { method: "DELETE" });
}
