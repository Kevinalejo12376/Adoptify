// Utilidades compartidas para la gestión de imágenes en todo el frontend.
// Proporcionan validación unificada y conversión a base64 (lo que el backend
// envía a Cloudinary). Evita repetir lógica de FileReader en cada página.

/** Tamaño máximo por imagen (10 MB). */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Formatos de imagen aceptados. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];

export const MAX_IMAGE_SIZE_MB = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);

/**
 * Convierte un File a base64 (Promise).
 * @param {File} file
 * @returns {Promise<string>} data URL (data:image/...;base64,...)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File) && !(file instanceof Blob)) {
      reject(new Error("El archivo seleccionado no es válido"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Valida un archivo de imagen.
 * @param {File} file
 * @param {object} [opts]
 * @param {number} [opts.maxBytes] Tamaño máximo en bytes
 * @param {string[]} [opts.allowedTypes]
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateImageFile(
  file,
  { maxBytes = MAX_IMAGE_SIZE_BYTES, allowedTypes = ALLOWED_IMAGE_TYPES } = {}
) {
  if (!file) return { ok: false, error: "No se seleccionó ningún archivo" };

  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error: `Formato no permitido (${file.type || "desconocido"}). Usa: JPG, PNG, WEBP, GIF, AVIF o SVG.`,
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `La imagen supera el tamaño máximo de ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    };
  }

  return { ok: true };
}

/**
 * Valida y convierte un File a base64 en un solo paso.
 * @param {File} file
 * @param {object} [opts]
 * @returns {Promise<{ ok: true, base64: string, name: string, type: string, size: number } | { ok: false, error: string }>}
 */
export async function readAndValidateImage(file, opts = {}) {
  const validation = validateImageFile(file, opts);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }
  try {
    const base64 = await fileToBase64(file);
    return {
      ok: true,
      base64,
      name: file.name || "imagen",
      type: file.type,
      size: file.size,
    };
  } catch (e) {
    return { ok: false, error: e.message || "No se pudo leer el archivo" };
  }
}

/**
 * Formatea bytes a una cadena legible (KB/MB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Convierte varios archivos a base64, validando cada uno.
 * @param {File[]} files
 * @param {object} [opts]
 * @returns {Promise<{ok:boolean, results?: object[], errors?: string[]}>}
 */
export async function readAndValidateImages(files, opts = {}) {
  const results = [];
  const errors = [];
  for (const file of files) {
    const res = await readAndValidateImage(file, opts);
    if (res.ok) {
      results.push(res);
    } else {
      errors.push(`${file.name}: ${res.error}`);
    }
  }
  return { ok: errors.length === 0, results, errors };
}

/**
 * Optimiza una URL de imagen de Cloudinary agregando transformaciones de
 * escalado y formato. Evita que imágenes originalmente pequeñas se vean
 * pixeladas al mostrarlas en contenedores grandes: Cloudinary entrega una
 * versión con el ancho solicitado, formato auto y calidad ajustada.
 *
 * @param {string} src URL original (puede ser de Cloudinary o no).
 * @param {object} [opts]
 * @param {number} [opts.width] Ancho máximo en píxeles (por defecto 1200).
 * @param {string} [opts.quality] Calidad ('auto', 80, 90, ...).
 * @returns {string} URL optimizada; si no es de Cloudinary, la URL original.
 */
export function optimizeCloudinaryUrl(
  src,
  { width = 1200, quality = "auto" } = {}
) {
  if (!src || typeof src !== "string") return src;
  const marker = "/image/upload/";
  const idx = src.indexOf(marker);
  if (idx === -1) return src; // No es una URL de Cloudinary estándar.

  const prefix = src.slice(0, idx + marker.length);
  const rest = src.slice(idx + marker.length);
  const transforms = ["f_auto"];
  if (quality) transforms.push(`q_${quality}`);
  if (width) transforms.push(`w_${width}`);

  // Evita duplicar transformaciones si la URL ya las trae.
  if (/^(f_|q_|w_|h_|c_|e_)/.test(rest)) return src;

  return `${prefix}${transforms.join(",")}/${rest}`;
}
