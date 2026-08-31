// Cliente HTTP central para comunicarse con el backend FastAPI.
// La URL base se configura automáticamente según el entorno:
// - Desarrollo local (HTTP): el dev server sirve http://localhost:5173 y Vite
//   hace proxy de /api/* al backend local (server.proxy en vite.config.js), por
//   lo que se usa el MISMO origen ("" = URL relativa). Evita mixed-content/CORS.
// - Producción (Vercel): usa VITE_API_URL si está configurada en Vercel Dashboard,
//   o automáticamente apunta al backend de producción

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://adoptify-backend.vercel.app"
    : "");

const TOKEN_KEY = "adoptify_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/**
 * Realiza una peticion a la API. Adjunta el token JWT si existe.
 * @param {string} path  ruta relativa, ej: "/api/mascotas/"
 * @param {object} options { method, body (objeto JSON), auth (bool), form (bool) }
 */
export async function apiFetch(path, { method = "GET", body, auth = true, form = false, headers: extraHeaders = {} } = {}) {
  const headers = { ...extraHeaders };
  const token = getToken();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  let payload;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(body).toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  // Timeout de 60s: evita que la UI se quede "cargando" para siempre si el
  // servidor no responde. Se aumentó de 20s→60s porque Supabase (BD remota)
  // puede tener latencia que hace que consultas complejas tomen más tiempo.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      throw new Error("El servidor tardó demasiado en responder. Intenta de nuevo.");
    }
    throw new Error("No se pudo conectar con el servidor. Verifica que el backend esté encendido.");
  }
  clearTimeout(timeoutId);

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail = (data && data.detail) || "Error en la solicitud";
    // Si el token no es válido o expiró (401) en una petición autenticada,
    // se limpia la sesión y se redirige al login en lugar de dejar al usuario
    // en un estado roto viendo errores de "Not authenticated".
    if (res.status === 401 && auth) {
      clearToken();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    const error = new Error(typeof detail === "string" ? detail : "Error en la solicitud");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export { API_URL };
