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
export async function descargarReporte(codigo, formato = "pdf") {
  const res = await fetch(`${API_URL}${base}/${codigo}?formato=${formato}`, {
    headers: _authedHeaders(),
  });

  if (!res.ok) {
    let detail = "No se pudo generar el reporte.";
 * Descarga un reporte en el formato indicado y fuerza el guardado en el
 * dispositivo del usuario.
 * @param {string} tipo  Codigo del tipo de reporte (ej: "usuarios").
 * @param {"pdf"|"excel"} formato  Formato de salida.
 * @returns {Promise<{nombre:string}>} Nombre del archivo descargado.
 */
export async function descargarReporte(tipo, formato = "pdf") {
  const endpoint = formato === "excel" ? "excel" : "pdf";
  const res = await fetch(`${API_URL}${base}/${tipo}/${endpoint}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!res.ok) {
    let detail = "Error al generar el reporte";
    try {
      const data = await res.json();
      detail = data?.detail || detail;
    } catch {
      /* ignorar */
    }
    throw new Error(detail);
  }

  const blob = await res.blob();
  const ext = formato === "excel" ? "xlsx" : "pdf";
  const nombre = nombreArchivoDesdeDisposition(
    res.headers.get("Content-Disposition"),
    `reporte_${codigo}.${ext}`
  );
  descargarBlob(blob, nombre);

  return { nombre };
}

  // Nombre de archivo desde Content-Disposition (o generico)
  const nombre = extraerNombreArchivo(res) || `reporte_${tipo}.${endpoint === "excel" ? "xlsx" : "pdf"}`;

  // Descarga forzada en el navegador
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { nombre };
}

/**
 * Descarga el "Historial de Adopciones" del usuario autenticado en el formato
 * indicado (PDF o Excel) y fuerza el guardado en el dispositivo.
 * @param {"pdf"|"excel"} formato  Formato de salida.
 * @returns {Promise<{nombre:string}>} Nombre del archivo descargado.
 */
export async function descargarHistorialAdopciones(formato = "pdf") {
  const endpoint = formato === "excel" ? "excel" : "pdf";
  const res = await fetch(`${API_URL}/api/adopciones/export/${endpoint}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!res.ok) {
    let detail = "Error al generar el reporte";
    try {
      const data = await res.json();
      detail = data?.detail || detail;
    } catch {
      /* ignorar */
    }
    throw new Error(detail);
  }

  const blob = await res.blob();

  // Nombre de archivo desde Content-Disposition (o generico)
  const nombre =
    extraerNombreArchivo(res) ||
    `Historial_Adopciones.${endpoint === "excel" ? "xlsx" : "pdf"}`;

  // Descarga forzada en el navegador
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { nombre };
}

/**
 * Extrae el nombre del archivo del header Content-Disposition.
 */
function extraerNombreArchivo(res) {
  const disposition = res.headers.get("Content-Disposition");
  if (!disposition) return null;
  // filename*=UTF-8''nombre  |  filename="nombre"
  const star = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) return decodeURIComponent(star[1]);
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : null;
}
