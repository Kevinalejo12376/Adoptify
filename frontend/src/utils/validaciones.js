// ============================================================================
// MÓDULO CENTRAL DE VALIDACIÓN DE FORMULARIOS
// ----------------------------------------------------------------------------
// Unifica en un solo lugar los criterios (longitudes, formatos, complejidad) y
// los mensajes de error de toda la aplicación. El objetivo es que frontend y
// backend compartan la misma lógica de negocio y que los mensajes sean
// específicos, amigables y consistentes en todos los formularios.
//
// Cada función devuelve:
//   - ""        → campo válido (sin error)
//   - "mensaje" → texto específico que se mostrará bajo el campo
// ============================================================================

// ── Expresiones regulares ───────────────────────────────────────────────────
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Letras (incluye tildes, ñ, ü) y apóstrofes; palabras separadas por UN espacio.
export const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+)*$/;

// Teléfono: solo dígitos, con "+" opcional al inicio (código de país).
export const TELEFONO_REGEX = /^\+?\d+$/;

// ── Límites globales de la aplicación ───────────────────────────────────────
export const LIMITES = {
  nombre: { min: 2, max: 60 },
  apellido: { min: 2, max: 60 },
  email: { max: 254 },
  telefono: { min: 7, max: 15 },
  password: { min: 8, max: 72 },
};

// ── Normalización ───────────────────────────────────────────────────────────
/** Elimina espacios dobles y espacios al inicio/final. */
export function limpiarEspacios(valor) {
  return (valor || "").replace(/\s+/g, " ").trim();
}

/** Normaliza un correo: sin espacios y en minúsculas. */
export function normalizarEmail(valor) {
  return (valor || "").trim().toLowerCase();
}

/** Conserva únicamente dígitos. */
export function soloDigitos(valor) {
  return (valor || "").replace(/\D/g, "");
}

// ── Validadores de campo ────────────────────────────────────────────────────

/**
 * Nombre / Apellido.
 * @param {string} valor
 * @param {object} opts { campo: 'nombre'|'apellido', obligatorio: boolean }
 */
export function validarNombre(valor, { campo = "nombre", obligatorio = true } = {}) {
  const v = limpiarEspacios(valor);
  if (obligatorio && !v) return `El ${campo} es obligatorio.`;
  if (!v) return "";
  if (v.length < LIMITES.nombre.min) return `El ${campo} debe tener al menos ${LIMITES.nombre.min} caracteres.`;
  if (v.length > LIMITES.nombre.max) return `El ${campo} no puede superar los ${LIMITES.nombre.max} caracteres.`;
  if (!NOMBRE_REGEX.test(v)) {
    if (/\d/.test(v)) return `El ${campo} no puede contener números.`;
    return `El ${campo} solo puede contener letras (se permiten tildes y ñ).`;
  }
  return "";
}

export function validarApellido(valor, opts) {
  return validarNombre(valor, { ...opts, campo: "apellido" });
}

/**
 * Correo electrónico.
 * El valor se normaliza a minúsculas antes de validar el formato.
 */
export function validarEmail(valor, { obligatorio = true } = {}) {
  const v = normalizarEmail(valor);
  if (obligatorio && !v) return "El correo electrónico es obligatorio.";
  if (!v) return "";
  if (v.length > LIMITES.email.max) return "El correo electrónico no puede superar los 254 caracteres.";
  if (!EMAIL_REGEX.test(v)) return "Ingresa un correo electrónico válido.";
  return "";
}

/**
 * Teléfono: solo números, sin letras ni caracteres especiales.
 * Se ignoran separadores comunes (espacios, guiones, paréntesis) y se acepta
 * un "+" opcional al inicio (código de país). La cantidad final de dígitos
 * debe estar entre 7 y 15.
 */
export function validarTelefono(valor, { obligatorio = true } = {}) {
  const v = (valor || "").trim();
  if (obligatorio && !v) return "El teléfono es obligatorio.";
  if (!v) return "";
  const sinSeparadores = v.replace(/[\s\-()]/g, "");
  const sinSigno = sinSeparadores.startsWith("+") ? sinSeparadores.slice(1) : sinSeparadores;
  if (!/^\d+$/.test(sinSigno)) return "El teléfono solo puede contener números.";
  if (sinSigno.length < LIMITES.telefono.min || sinSigno.length > LIMITES.telefono.max) {
    return `El teléfono debe tener entre ${LIMITES.telefono.min} y ${LIMITES.telefono.max} dígitos.`;
  }
  return "";
}

/**
 * Teléfono de administrador: OBLIGATORIO y SOLO números (sin "+", espacios,
 * guiones ni paréntesis), con un máximo de 10 dígitos. El input debe filtrar
 * los caracteres no numéricos y limitar la longitud a 10.
 */
export function validarTelefonoAdmin(valor, { obligatorio = true } = {}) {
  const v = (valor || "").trim();
  if (obligatorio && !v) return "El teléfono es obligatorio.";
  if (!v) return "";
  if (!/^\d+$/.test(v)) return "El teléfono solo puede contener números.";
  if (v.length > 10) return "El teléfono no puede superar los 10 dígitos.";
  if (v.length < 7) return "El teléfono debe tener al menos 7 dígitos.";
  return "";
}

/**
 * Contraseña: longitud mínima + política de complejidad de la aplicación
 * (mayúscula, minúscula, número y carácter especial). Opcionalmente compara
 * con la confirmación.
 */
export function validarPassword(valor, { obligatorio = true, confirmacion = null } = {}) {
  const v = valor || "";
  if (obligatorio && !v) return "La contraseña es obligatoria.";
  if (!v) return "";
  if (v.length < LIMITES.password.min) return `La contraseña debe tener al menos ${LIMITES.password.min} caracteres.`;
  if (v.length > LIMITES.password.max) return "La contraseña no puede superar los 72 caracteres.";

  const faltantes = [];
  if (!/[A-Z]/.test(v)) faltantes.push("una mayúscula");
  if (!/[a-z]/.test(v)) faltantes.push("una minúscula");
  if (!/[0-9]/.test(v)) faltantes.push("un número");
  if (!/[^A-Za-z0-9]/.test(v)) faltantes.push("un carácter especial");
  if (faltantes.length) return `La contraseña debe incluir al menos ${faltantes.join(", ")}.`;

  if (confirmacion !== null && v !== confirmacion) return "Las contraseñas no coinciden.";
  return "";
}

/**
 * Permisos: al menos uno seleccionado.
 * Acepta un arreglo de códigos o un objeto { codigo: true/false }.
 */
export function validarPermisos(seleccionados, { obligatorio = true, mensaje = "Debes seleccionar al menos un permiso." } = {}) {
  if (!obligatorio) return "";
  let cantidad = 0;
  if (Array.isArray(seleccionados)) {
    cantidad = seleccionados.filter(Boolean).length;
  } else if (seleccionados && typeof seleccionados === "object") {
    cantidad = Object.values(seleccionados).filter(Boolean).length;
  }
  return cantidad === 0 ? mensaje : "";
}

// ── Utilidades de UI ────────────────────────────────────────────────────────

/**
 * Devuelve la clase CSS del input incluyendo el estado de error (borde rojo).
 * Uso: className={claseInput(inputCls, !!errors.nombre)}
 */
export function claseInput(claseBase, tieneError) {
  return `${claseBase}${tieneError
    ? " border-red-500 focus:border-red-500 focus:ring-red-500/20"
    : ""}`;
}
