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
 * Comprime y redimensiona una imagen ANTES de convertirla a base64.
 *
 * Evita que el request de subida sea demasiado grande (el base64 crece ~33% y
 * los proxies/servidores como Vercel cortan peticiones que superan ~4.5MB,
 * lo que produce "No se pudo conectar con el servidor").
 *
 * - SVG (vectores) y GIF (animados) se suben sin modificar.
 * - Imágenes ya pequeñas (<= 1.5 MB) se suben tal cual.
 * - El resto se redimensiona a un máximo de 1280px y se exporta como JPEG.
 *
 * @param {File} file
 * @param {object} [opts]
 * @param {number} [opts.maxDimension] Ancho/alto máximo (px). Por defecto 1280.
 * @param {number} [opts.calidad] Calidad JPEG (0-1). Por defecto 0.85.
 * @returns {Promise<{ base64: string, type: string }>}
 */
export async function comprimirImagen(
  file,
  { maxDimension = 1280, calidad = 0.85 } = {}
) {
  if (!file) throw new Error("No se seleccionó ningún archivo");

  // No comprimir SVG (vectores) ni GIF (animados).
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return { base64: await fileToBase64(file), type: file.type };
  }

  // Si es pequeña, se sube tal cual (sin redimensionar innecesariamente).
  if (file.size <= 1.5 * 1024 * 1024) {
    return { base64: await fileToBase64(file), type: file.type };
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const base64 = canvas.toDataURL("image/jpeg", calidad);
    return { base64, type: "image/jpeg" };
  } finally {
    bitmap.close();
  }
}
