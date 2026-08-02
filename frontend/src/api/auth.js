// Llamadas de autenticacion al backend FastAPI.
import { apiFetch, setToken, clearToken } from "./client";

/** Registra un nuevo usuario o refugio. Devuelve el usuario creado. */
export async function registerRequest(payload) {
  // payload: { nombre, apellido, email, password, telefono, tipo_documento,
  //            numero_documento, rol, ubicacion, nombre_refugio }
  return apiFetch("/api/auth/register", { method: "POST", body: payload, auth: false });
}

/** Envia un código de verificación de 6 dígitos al correo.
 * @param {string} email
 * @param {string} tipo - 'registro' | 'reset_password'
 * @param {string} [nombre] - Nombre del usuario (opcional, para personalizar el correo)
 */
export async function sendVerificationCode(email, tipo = "registro", nombre = "") {
  return apiFetch("/api/auth/send-code", {
    method: "POST",
    body: { email, tipo, nombre },
    auth: false,
  });
}

/** Verifica si un código de 6 dígitos es válido (sin consumirlo). */
export async function verifyCode(email, codigo) {
  return apiFetch("/api/auth/verify-code", {
    method: "POST",
    body: { email, codigo },
    auth: false,
  });
}

/** Registra un nuevo usuario validando primero el código de verificación.
 * @param {object} payload - { nombre, apellido, email, password, codigo_verificacion, ... }
 */
export async function registerWithCodeRequest(payload) {
  return apiFetch("/api/auth/verify-register", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

/** Solicita un código para restablecer la contraseña (alias de sendCode con tipo='reset_password'). */
export async function forgotPasswordRequest(email) {
  return apiFetch("/api/auth/forgot-password", {
    method: "POST",
    body: { email, tipo: "reset_password" },
    auth: false,
  });
}

/** Restablece la contraseña usando el código de verificación. */
export async function resetPasswordRequest(email, codigo, newPassword) {
  return apiFetch("/api/auth/reset-password", {
    method: "POST",
    body: { email, codigo, new_password: newPassword },
    auth: false,
  });
}

/** Cambia la contraseña del usuario autenticado. */
export async function changePasswordRequest(passwordActual, passwordNueva) {
  return apiFetch("/api/auth/change-password", {
    method: "POST",
    body: { password_actual: passwordActual, password_nueva: passwordNueva },
  });
}

/** Inicia sesion. Guarda el token y devuelve el usuario (via /me). */
export async function loginRequest(email, password) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: { username: email, password },
    auth: false,
    form: true,
  });
  setToken(data.access_token);
  return fetchMe();
}

/** Obtiene el usuario autenticado. */
export async function fetchMe() {
  return apiFetch("/api/auth/me", { method: "GET" });
}

/** Obtiene el perfil completo del usuario autenticado. */
export async function fetchProfile() {
  return apiFetch("/api/auth/profile", { method: "GET" });
}

/** Actualiza los datos del perfil del usuario autenticado. */
export async function updateProfile(payload) {
  return apiFetch("/api/auth/profile", { method: "PUT", body: payload });
}

/** Inicia sesion con Google. Envia el credential token al backend. */
export async function googleLoginRequest(credential) {
  const data = await apiFetch("/api/auth/google", {
    method: "POST",
    body: { credential },
    auth: false,
  });
  setToken(data.access_token);
  return fetchMe();
}

/** Cierra sesion (limpia el token local). */
export function logoutRequest() {
  clearToken();
}
