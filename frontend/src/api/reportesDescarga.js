// Llamadas a los reportes descargables (PDF / Excel) del panel de admin.
// La generación ocurre en el servidor; aquí solo se listan los tipos y se
// dispara la descarga del archivo generado.
import { API_URL, getToken } from "./client";
import { descargarBlob, nombreArchivoDesdeDisposition } from "../utils/downloadFile";

const base = "/api/reportes-descargables";

const _authedHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

/** Lista los tipos de reportes disponibles. */
export async function obtenerTiposReportes() {
  const res = await fetch(`${API_URL}${base}`, {
    headers: _authedHeaders(),
  });
  if (!res.ok) {
    let detail = "Error al cargar los tipos de reporte";
    try {
      const data = await res.json();
      detail = data?.detail || detail;
    } catch {
      /* ignorar */
    }
    throw new Error(detail);
  }
  return res.json();
}

/**
 * Genera y descarga un reporte. Devuelve { nombre } del archivo descargado.
 * @param {string} codigo  Código del tipo de reporte.
 * @param {"pdf"|"excel"} formato  Formato de salida.
 */
export async function descargarReporte(codigo, formato) {
  const res = await fetch(`${API_URL}${base}/${codigo}?formato=${formato}`, {
    headers: _authedHeaders(),
  });

  if (!res.ok) {
    let detail = "No se pudo generar el reporte.";
    try {
      const data = await res.json();
      detail = data?.detail || detail;
    } catch {
      /* ignorar */
    }
    throw new Error(detail);
  }

  const blob = await res.blob();
  const nombre = nombreArchivoDesdeDisposition(res.headers.get("Content-Disposition"));
  descargarBlob(blob, nombre);

  return { nombre };
}
