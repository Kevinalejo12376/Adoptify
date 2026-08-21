// Llamadas al modulo de reportes descargables (PDF/Excel) del panel admin.
// Los archivos se generan en memoria en el backend y se descargan
// directamente al dispositivo del usuario.
import { API_URL, getToken } from "./client";

const base = "/api/reportes-descarga";

/**
 * Lista los tipos de reportes disponibles en el backend.
 * @returns {Promise<Array<{codigo:string,titulo:string,descripcion:string}>>}
 */
export async function obtenerTiposReportes() {
  const res = await fetch(`${API_URL}${base}/tipos`, {
    method: "GET",
    headers: { Authorization: `Bearer ${getToken()}` },
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
