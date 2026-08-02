// Llamadas al backend para el flujo de Solicitudes de Registro de Refugios.
// Endpoints públicos (formulario de registro) + utilidades compartidas.
import { apiFetch } from "./client";

const base = "/api/solicitudes-refugio";

/** Crea una solicitud de registro de refugio (formulario público).
 * @param {object} payload { nombre_refugio, logo_base64, descripcion, ...,
 *   representante_nombre, representante_email, ..., documentos: [...] }
 */
export async function crearSolicitudRefugio(payload) {
  return apiFetch(`${base}/`, { method: "POST", body: payload, auth: false });
}

/** Consulta el estado de una solicitud mediante su token (público). */
export async function consultarEstadoSolicitud(token) {
  return apiFetch(`${base}/estado/${encodeURIComponent(token)}`, { auth: false });
}

/** Sube documentos adicionales para completar la información solicitada. */
export async function subirDocumentosSolicitud(token, documentos) {
  return apiFetch(`${base}/${encodeURIComponent(token)}/documentos`, {
    method: "POST",
    body: { documentos },
    auth: false,
  });
}

/** Crea la contraseña de la cuenta del refugio mediante el enlace seguro. */
export async function crearPasswordRefugio(token, password) {
  return apiFetch(`${base}/crear-password`, {
    method: "POST",
    body: { token, password },
    auth: false,
  });
}

// ===== Utilidades de archivos (base64) =====

/** Convierte un File a base64 (data URL). */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Convierte varios archivos a base64 manteniendo nombre y tamaño. */
export async function filesToBase64(files) {
  const resultados = [];
  for (const file of files) {
    const base64 = await fileToBase64(file);
    resultados.push({
      file,
      nombre: file.name,
      size: file.size,
      type: file.type,
      base64,
    });
  }
  return resultados;
}
