// Llamadas al backend para solicitudes de adopcion.
import { apiFetch, API_URL, getToken } from "./client";
import { descargarBlob, nombreArchivoDesdeDisposition } from "../utils/downloadFile";

const base = "/api/solicitudes";

/** Historial de adopciones del usuario autenticado. */
export const misSolicitudes = () => apiFetch(`${base}/mias`);

/** Solicitudes recibidas por el refugio autenticado. */
export const solicitudesRecibidas = () => apiFetch(`${base}/recibidas`);

/** Crea una solicitud de adopcion. */
export const crearSolicitud = (payload) =>
  apiFetch(`${base}/`, { method: "POST", body: payload });

/** Cambia el estado de una solicitud (solo refugio). */
export const actualizarEstado = (id, estado) =>
  apiFetch(`${base}/${id}/estado`, { method: "PATCH", body: { estado } });

/**
 * Genera y descarga un reporte desde una ruta del backend de solicitudes.
 * Devuelve { nombre } del archivo descargado. Si el servidor devuelve 404
 * (sin solicitudes) el error incluye el mensaje para mostrarlo en la UI.
 */
async function _descargarReporte(ruta, formato) {
  const res = await fetch(`${API_URL}${base}/${ruta}?formato=${formato}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!res.ok) {
    let detail = "No se pudo generar el reporte.";
    try {
      const data = await res.json();
      detail = data?.detail || detail;
    } catch {
      /* ignorar */
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const nombre = nombreArchivoDesdeDisposition(res.headers.get("Content-Disposition"));
  descargarBlob(blob, nombre);
  return { nombre };
}

/**
 * Reporte de las solicitudes del refugio autenticado (backend filtra por refugio).
 * @param {"pdf"|"excel"} formato
 */
export function descargarReporteHistorialRefugio(formato) {
  return _descargarReporte("recibidas/reporte", formato);
}

/**
 * Reporte de las solicitudes del usuario autenticado (backend filtra por usuario).
 * @param {"pdf"|"excel"} formato
 */
export function descargarReporteHistorialUsuario(formato) {
  return _descargarReporte("mias/reporte", formato);
}
