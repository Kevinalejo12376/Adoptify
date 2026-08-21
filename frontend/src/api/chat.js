// Llamadas al backend para el chatbot (IA orquestada por n8n).
// El historial se guarda en el backend, ligado a un session_id.
import { apiFetch } from "./client";

const base = "/api/ia";

// Crea o recupera una sesion de chat. Devuelve { session_id }
export const crearSesionChat = (sessionId) =>
  apiFetch(`${base}/chat/sesion`, {
    method: "POST",
    body: { session_id: sessionId },
    auth: false,
  });

// Envia un mensaje y devuelve { respuesta, accion }
// Si el usuario esta logueado, se envia el token para vincular la sesion
// (asi el bot puede responder sobre SUS pedidos de forma segura).
export const enviarMensajeChat = (sessionId, mensaje) =>
  apiFetch(`${base}/chat`, {
    method: "POST",
    body: { session_id: sessionId, mensaje },
    auth: true,
  });

// Historial de mensajes de la sesion
export const historialChat = (sessionId) =>
  apiFetch(`${base}/chat/historial?session_id=${encodeURIComponent(sessionId)}`, {
    auth: false,
  });
