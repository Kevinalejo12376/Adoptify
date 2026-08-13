// Llamadas al backend para el flujo de Solicitudes de Registro de Tiendas Aliadas.
// Reutiliza las utilidades compartidas de archivos del módulo de Refugios.
import { apiFetch } from "./client";
import { filesToBase64 } from "./solicitudesRefugio";

const base = "/api/solicitudes-tienda";

/** Crea una solicitud de registro de Tienda Aliada (formulario público).
 * @param {object} payload { nombre_tienda, logo_base64, descripcion, ...,
 *   representante_nombre, representante_email, ..., documentos: [...] }
 */
export async function crearSolicitudTienda(payload) {
  return apiFetch(`${base}/`, { method: "POST", body: payload, auth: false });
}

/** Consulta el estado de una solicitud mediante su token (público). */
export async function consultarEstadoSolicitudTienda(token) {
  return apiFetch(`${base}/estado/${encodeURIComponent(token)}`, { auth: false });
}

/** Sube documentos adicionales para completar la información solicitada. */
export async function subirDocumentosSolicitudTienda(token, documentos) {
  return apiFetch(`${base}/${encodeURIComponent(token)}/documentos`, {
    method: "POST",
    body: { documentos },
    auth: false,
  });
}

/** Crea la contraseña de la cuenta de la tienda mediante el enlace seguro. */
export async function crearPasswordTienda(token, password) {
  return apiFetch(`${base}/crear-password`, {
    method: "POST",
    body: { token, password },
    auth: false,
  });
}

// ===== Utilidades de archivos (base64) =====
// Re-exportamos filesToBase64 para que el formulario de tienda pueda usarla
// sin depender directamente del módulo de refugios.
export { filesToBase64 };
