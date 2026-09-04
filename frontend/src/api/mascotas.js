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

/** Calcula la compatibilidad usuario-mascota con IA (Gemini).
 * @param {number} mascotaId id de la mascota.
 * @param {object} respuestas respuestas del test de personalidad del usuario
 *   (pregunta -> opción seleccionada).
 */
export async function calcularCompatibilidad(mascotaId, respuestas) {
  return apiFetch(`${base}/${mascotaId}/compatibilidad`, {
    method: "POST",
    body: { respuestas },
    auth: false,
  });
}

/** Mascotas del refugio autenticado. */
export async function misMascotas() {
  return apiFetch(`${base}/mias`);
}

/**
 * Crea una mascota (refugio).
 * @param {object} payload datos de la mascota.
 * @param {string} [idempotencyKey] clave única por envío; si se reutiliza
 *   (p.ej. doble clic/Enter con la misma solicitud), el backend evita duplicar
 *   el registro y devuelve la mascota ya creada.
 */
export async function crearMascota(payload, idempotencyKey) {
  const headers = idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {};
  return apiFetch(`${base}/`, { method: "POST", body: payload, headers });
}

/** Actualiza una mascota (refugio). */
export async function actualizarMascota(id, payload) {
  return apiFetch(`${base}/${id}`, { method: "PUT", body: payload });
}

/** Elimina una mascota (refugio): pasa a Borradores (papelera de 30 días). */
export async function eliminarMascota(id) {
  return apiFetch(`${base}/${id}`, { method: "DELETE" });
}

/** Mascotas del refugio en BORRADORES (papelera, restaurables < 30 días). */
export async function papeleraMascotas() {
  return apiFetch(`${base}/papelera`);
}

/** Restaura una mascota desde Borradores. */
export async function restaurarMascota(id) {
  return apiFetch(`${base}/${id}/restaurar`, { method: "POST" });
}

/** Elimina definitivamente una mascota desde Borradores. */
export async function eliminarMascotaDefinitiva(id) {
  return apiFetch(`${base}/${id}/definitivo`, { method: "DELETE" });
}
