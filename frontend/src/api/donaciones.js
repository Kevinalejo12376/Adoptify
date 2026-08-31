// Llamadas al backend para el sistema de donaciones de personas a refugios.
// Flujo: crear donación (anónima o asociada a la cuenta) -> pasarela de pagos
// (pago-confirmado / pago-fallido) -> el refugio confirma recepción ->
// opcionalmente se comparte la donación en el foro con ayuda de Gemini.
import { apiFetch } from "./client";

const base = "/api/donaciones";
const adminBase = "/api/admin";

/** Crea una donación (dinero o física). No exige autenticación: si el usuario
 *  tiene token, queda asociada a su cuenta; si no, se registra como anónima. */
export const crearDonacion = (payload) =>
  apiFetch(`${base}/donaciones`, { method: "POST", body: payload });

/** Confirma el pago de una donación monetaria (punto de integración de la
 *  futura pasarela de pagos; hoy lo llama la UI al simular el pago). */
export const confirmarPago = (donacionId, payload = {}) =>
  apiFetch(`${base}/donaciones/${donacionId}/pago-confirmado`, { method: "POST", body: payload });

/** Marca el pago de una donación monetaria como fallido (no se completó). */
export const pagoFallido = (donacionId, payload = {}) =>
  apiFetch(`${base}/donaciones/${donacionId}/pago-fallido`, { method: "POST", body: payload });

/** Donaciones del usuario autenticado. */
export const misDonaciones = () => apiFetch(`${base}/donaciones/mis-donaciones`);

/** Consulta una donación por su referencia (útil para donantes anónimos). */
export const consultarDonacionPorReferencia = (referencia) =>
  apiFetch(`${base}/donaciones/publicas/${encodeURIComponent(referencia)}`, { auth: false });

/** Donaciones dirigidas al refugio autenticado. */
export const donacionesRefugio = () => apiFetch(`${base}/donaciones/refugio`);

/** El refugio confirma que recibió la donación. */
export const confirmarRecibida = (donacionId) =>
  apiFetch(`${base}/donaciones/${donacionId}/recibir`, { method: "POST" });

/** El refugio reporta que NO recibió la donación (exige un motivo). */
export const confirmarNoRecibida = (donacionId, motivo) =>
  apiFetch(`${base}/donaciones/${donacionId}/no-recibir`, { method: "POST", body: { motivo } });

/** Genera con Gemini un borrador de publicación para el foro (editable). */
export const generarPublicacion = (donacionId) =>
  apiFetch(`${base}/donaciones/${donacionId}/publicacion`, { method: "POST" });

/** Publica en el foro la publicación (previamente editada por el usuario). */
export const publicarDonacion = (donacionId, payload) =>
  apiFetch(`${base}/donaciones/${donacionId}/publicar`, { method: "POST", body: payload });

/** Todas las donaciones de Adoptify (administrador). Acepta filtros:
 *  { desde, hasta, refugio_id, tipo, estado }. */
export const donacionesAdmin = (filtros = {}) => {
  const q = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  });
  const qs = q.toString();
  return apiFetch(`${adminBase}/donaciones${qs ? `?${qs}` : ""}`);
};

/** Estadísticas generales de donaciones (administrador). Acepta los mismos filtros. */
export const estadisticasDonacionesAdmin = (filtros = {}) => {
  const q = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  });
  const qs = q.toString();
  return apiFetch(`${adminBase}/donaciones/estadisticas${qs ? `?${qs}` : ""}`);
};
