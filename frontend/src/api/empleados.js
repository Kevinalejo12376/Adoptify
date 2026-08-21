// Llamadas al backend para el módulo "Equipo del refugio" (empleados).
import { apiFetch } from "./client";

const base = "/api/refugios";

/** Lista el equipo del refugio (representante + empleados). */
export const listarEquipo = () => apiFetch(`${base}/equipo`);

/** Catálogo de permisos disponibles para los empleados. */
export const listarPermisosEquipo = () => apiFetch(`${base}/equipo/permisos`);

/** Permisos del usuario autenticado en su refugio (control de acceso). */
export const misPermisosEquipo = () => apiFetch(`${base}/equipo/mis-permisos`);

/** Crea un empleado (usuario con rol 'empleado_refugio' vinculado al refugio). */
export const crearEmpleado = (payload) =>
  apiFetch(`${base}/equipo`, { method: "POST", body: payload });

/** Actualiza datos, estado y permisos de un empleado. */
export const actualizarEmpleado = (usuarioId, payload) =>
  apiFetch(`${base}/equipo/${usuarioId}`, { method: "PUT", body: payload });

/** Activa/desactiva un empleado. */
export const cambiarEstadoEmpleado = (usuarioId, activo) =>
  apiFetch(`${base}/equipo/${usuarioId}/estado`, { method: "PATCH", body: { activo } });

/** Desvincula (eliminación lógica) a un empleado del refugio. */
export const desvincularEmpleado = (usuarioId) =>
  apiFetch(`${base}/equipo/${usuarioId}`, { method: "DELETE" });
