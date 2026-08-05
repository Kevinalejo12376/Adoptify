// Cliente para el router unificado de subida de imágenes (/api/upload).
// Todo el proyecto debe subir imágenes a Cloudinary a través de estas funciones.
import { apiFetch } from "./client";

const base = "/api/upload";

/**
 * Sube una imagen PERMANENTE a Cloudinary.
 * En la BD solo debe guardarse la `url` (secure_url) devuelta.
 *
 * @param {string} tipo Clave de TIPOS_IMAGEN: 'usuario','refugio_logo',
 *   'refugio_portada','mascota','producto','tienda_logo','tienda_portada','foro','banner'
 * @param {string} imagenBase64 Imagen en base64 (con o sin prefijo data:)
 * @param {string} [etiqueta] Identificador opcional
 * @returns {Promise<{url:string, public_id:string, tipo:string}>}
 */
export async function subirImagen(tipo, imagenBase64, etiqueta) {
  return apiFetch(`${base}/imagen`, {
    method: "POST",
    body: { tipo, imagen_base64: imagenBase64, etiqueta },
  });
}

/**
 * Sube una imagen TEMPORAL a Cloudinary (carpeta temp/).
 * Útil para previews, análisis IA, escaneos. Debe eliminarse cuando ya no se use.
 *
 * @param {string} imagenBase64 Imagen en base64
 * @param {string} [carpetaTemp] 'TEMP_PREVIEW' | 'TEMP_ESCANEO' | 'TEMP_PRODUCTO' | ...
 * @param {string} [etiqueta] Identificador opcional
 * @returns {Promise<{url:string, public_id:string, carpeta:string}>}
 */
export async function subirImagenTemporal(imagenBase64, carpetaTemp = "TEMP_GENERAL", etiqueta) {
  return apiFetch(`${base}/imagen-temporal`, {
    method: "POST",
    body: { imagen_base64: imagenBase64, carpeta_temp: carpetaTemp, etiqueta },
  });
}

/**
 * Elimina una imagen de Cloudinary por su public_id.
 *
 * @param {string} publicId
 * @returns {Promise<{ok:boolean}>}
 */
export async function eliminarImagen(publicId) {
  return apiFetch(`${base}/${encodeURIComponent(publicId)}`, { method: "DELETE" });
}

/** Lista los tipos de imagen permanentes disponibles. */
export const listarTiposImagen = () => apiFetch(`${base}/tipos`);

/** Lista las carpetas temporales disponibles. */
export const listarTiposTemporales = () => apiFetch(`${base}/tipos-temporales`);
