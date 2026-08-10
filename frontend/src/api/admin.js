// Llamadas al panel de administracion (requieren token de admin).
import { apiFetch } from "./client";

const base = "/api/admin";

/** Lista usuarios. rol opcional (codigo) para filtrar. */
export async function listarUsuarios(rol) {
  const q = rol ? `?rol=${encodeURIComponent(rol)}` : "";
  return apiFetch(`${base}/usuarios${q}`);
}

/** Crea un usuario/administrador/refugio. */
export async function crearUsuario(payload) {
  // payload: { nombre, apellido, email, password, telefono, tipo_documento,
  //            numero_documento, rol, ubicacion, nombre_refugio }
  return apiFetch(`${base}/usuarios`, { method: "POST", body: payload });
}

/** Actualiza un usuario (activo, datos basicos). */
export async function actualizarUsuario(id, payload) {
  return apiFetch(`${base}/usuarios/${id}`, { method: "PATCH", body: payload });
}

/** Elimina un usuario. */
export async function eliminarUsuario(id) {
  return apiFetch(`${base}/usuarios/${id}`, { method: "DELETE" });
}

/** Estadisticas reales (conteos) para el dashboard del admin. */
export async function getEstadisticas() {
  return apiFetch(`${base}/estadisticas`);
}

/** Lista todas las mascotas (de todos los refugios). */
export async function listarMascotas() {
  return apiFetch(`${base}/mascotas`);
}

/** Elimina una mascota. */
export async function eliminarMascota(id) {
  return apiFetch(`${base}/mascotas/${id}`, { method: "DELETE" });
}

/** Lista todos los productos (con su vendedor). */
export async function listarProductos() {
  return apiFetch(`${base}/productos`);
}

/** Elimina un producto. */
export async function eliminarProducto(id) {
  return apiFetch(`${base}/productos/${id}`, { method: "DELETE" });
}

// ===== PQRS =====
export async function listarPqrs() { return apiFetch(`${base}/pqrs`); }
export async function actualizarPqrs(id, payload) {
  return apiFetch(`${base}/pqrs/${id}`, { method: "PATCH", body: payload });
}

// ===== PQRS de Tiendas Aliadas =====
/** Lista las PQRS creadas por las Tiendas Aliadas. */
export async function listarPqrsTiendas({ estado, busqueda } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (busqueda) params.set("busqueda", busqueda);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`${base}/pqrs-tiendas${qs}`);
}

/** Detalle completo de una PQRS de tienda. */
export async function obtenerPqrsTienda(id) {
  return apiFetch(`${base}/pqrs-tiendas/${id}`);
}

/** Cambia el estado de una PQRS de tienda (admin de Adoptify). */
export async function cambiarEstadoPqrsTienda(id, estado) {
  return apiFetch(`${base}/pqrs-tiendas/${id}/estado`, { method: "PATCH", body: { estado } });
}

/** Responde una PQRS de tienda (admin de Adoptify). */
export async function responderPqrsTienda(id, payload) {
  return apiFetch(`${base}/pqrs-tiendas/${id}/responder`, { method: "POST", body: payload });
}

// ===== Reportes =====
export async function listarReportes() { return apiFetch(`${base}/reportes`); }
export async function actualizarReporte(id, payload) {
  return apiFetch(`${base}/reportes/${id}`, { method: "PATCH", body: payload });
}

// ===== Pedidos =====
export async function listarPedidos() { return apiFetch(`${base}/pedidos`); }

// ===== Foro =====
export async function listarForoAdmin() { return apiFetch(`${base}/foro`); }
export async function eliminarPostAdmin(id) {
  return apiFetch(`${base}/foro/${id}`, { method: "DELETE" });
}

// ===== Auditoría =====
export async function listarAuditoria() { return apiFetch(`${base}/auditoria`); }

// ==================================================================
// MÓDULO REFUGIOS (registrados + solicitudes de refugios)
// ==================================================================

// ----- Refugios registrados (aprobados) -----

/** Lista refugios aprobados con conteo de mascotas y datos del usuario. */
export async function listarRefugiosAdmin({ busqueda, estado, ciudad } = {}) {
  const params = new URLSearchParams();
  if (busqueda) params.set("busqueda", busqueda);
  if (estado) params.set("estado", estado);
  if (ciudad) params.set("ciudad", ciudad);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`${base}/refugios${qs}`);
}

/** Obtiene un refugio (admin). */
export async function obtenerRefugioAdmin(id) {
  return apiFetch(`${base}/refugios/${id}`);
}

/** Actualiza un refugio (admin). */
export async function actualizarRefugioAdmin(id, payload) {
  return apiFetch(`${base}/refugios/${id}`, { method: "PUT", body: payload });
}

/** Suspende (activo=false) o reactiva (activo=true) un refugio. */
export async function cambiarEstadoRefugioAdmin(id, activo) {
  return apiFetch(`${base}/refugios/${id}/estado`, {
    method: "PATCH",
    body: { activo },
  });
}

/** Elimina un refugio y su usuario asociado. */
export async function eliminarRefugioAdmin(id) {
  return apiFetch(`${base}/refugios/${id}`, { method: "DELETE" });
}

// ----- Solicitudes de refugios -----

/** Estadísticas de solicitudes (contadores por estado). */
export async function estadisticasSolicitudesRefugio() {
  return apiFetch(`${base}/solicitudes-refugio/estadisticas`);
}

/** Lista solicitudes de refugio (opcionalmente filtradas). */
export async function listarSolicitudesRefugio({ estado, busqueda, ciudad } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (busqueda) params.set("busqueda", busqueda);
  if (ciudad) params.set("ciudad", ciudad);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`${base}/solicitudes-refugio${qs}`);
}

/** Detalle completo de una solicitud (expediente). */
export async function obtenerSolicitudRefugio(id) {
  return apiFetch(`${base}/solicitudes-refugio/${id}`);
}

/** Elimina una solicitud de refugio (p. ej. una ya aprobada o rechazada). */
export async function eliminarSolicitudRefugio(id) {
  return apiFetch(`${base}/solicitudes-refugio/${id}`, { method: "DELETE" });
}

/** Aprueba una solicitud de refugio. */
export async function aprobarSolicitudRefugio(id) {
  return apiFetch(`${base}/solicitudes-refugio/${id}/aprobar`, { method: "POST" });
}

/** Rechaza una solicitud de refugio (motivo obligatorio). */
export async function rechazarSolicitudRefugio(id, motivo) {
  return apiFetch(`${base}/solicitudes-refugio/${id}/rechazar`, {
    method: "POST",
    body: { motivo },
  });
}

/** Solicita información adicional para una solicitud. */
export async function solicitarInformacionSolicitud(id, mensaje) {
  return apiFetch(`${base}/solicitudes-refugio/${id}/solicitar-informacion`, {
    method: "POST",
    body: { mensaje },
  });
}

/** Marca el estado de verificación de un documento. */
export async function verificarDocumentoSolicitud(documentoId, estadoVerificacion) {
  return apiFetch(`${base}/solicitudes-refugio/documentos/${documentoId}/verificacion`, {
    method: "PATCH",
    body: { estado_verificacion: estadoVerificacion },
  });
}
