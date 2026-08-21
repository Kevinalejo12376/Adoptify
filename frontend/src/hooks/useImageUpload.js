// Hook reutilizable para subir imágenes a Cloudinary a través del endpoint
// unificado /api/upload. Centraliza validación, conversión a base64, estados
// de carga y manejo de errores para toda la aplicación.
import { useState, useCallback, useRef } from "react";
import { subirImagen, subirImagenTemporal, eliminarImagen } from "../api/upload";
import { readAndValidateImage } from "../utils/imageUtils";

/**
 * @param {object} opts
 * @param {string} [opts.tipo] Tipo permanente ('usuario','mascota','foro',...).
 *   Obligatorio si NO se usa `temporal`.
 * @param {boolean} [opts.temporal] Si es true, sube como imagen TEMPORAL.
 * @param {string} [opts.carpetaTemp] Carpeta temporal (TEMP_PREVIEW, TEMP_ESCANEO, ...).
 * @param {string} [opts.etiqueta] Etiqueta opcional para la imagen.
 */
export function useImageUpload({ tipo, temporal = false, carpetaTemp = "TEMP_GENERAL", etiqueta } = {}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  // Contador para simular progreso visual mientras el backend sube a Cloudinary.
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  const clearError = useCallback(() => setError(null), []);
  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setProgress(0);
  }, []);

  /** Detiene el temporizador de progreso (si existe). */
  const stopProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  /**
   * Sube una cadena base64 (o data URL) a Cloudinary con estados de carga.
   * @param {string} base64 Cadena base64 o data URL.
   * @returns {Promise<{ok:boolean, url?:string, publicId?:string, error?:string}>}
   */
  const performUpload = useCallback(
    async (base64) => {
      stopProgress();
      setUploading(true);
      setError(null);
      setProgress(5);

      progressTimer.current = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 8 : p));
      }, 250);

      try {
        const res = temporal
          ? await subirImagenTemporal(base64, carpetaTemp, etiqueta)
          : await subirImagen(tipo, base64, etiqueta);

        stopProgress();
        setProgress(100);
        setResult(res);
        setUploading(false);

        return {
          ok: true,
          url: res.url,
          publicId: res.public_id,
          data: res,
        };
      } catch (e) {
        stopProgress();
        setUploading(false);
        setProgress(0);
        const msg = e?.message || "No se pudo subir la imagen. Intenta de nuevo.";
        setError(msg);
        return { ok: false, error: msg };
      }
    },
    [tipo, temporal, carpetaTemp, etiqueta, stopProgress]
  );

  /**
   * Valida y sube un File a Cloudinary.
   * @param {File} file
   * @returns {Promise<{ok:boolean, url?:string, publicId?:string, error?:string}>}
   */
  const upload = useCallback(
    async (file) => {
      stopProgress();
      setUploading(true);
      setError(null);
      setProgress(5);

      // Validar y convertir a base64 en el cliente.
      const lectura = await readAndValidateImage(file);
      if (!lectura.ok) {
        setUploading(false);
        setProgress(0);
        setError(lectura.error);
        return { ok: false, error: lectura.error };
      }

      return performUpload(lectura.base64);
    },
    [performUpload, stopProgress]
  );

  /**
   * Sube una imagen ya editada (data URL) a Cloudinary.
   * Se usa después del editor interactivo (recortar/rotar/voltear).
   * @param {string} dataUrl Data URL de la imagen final.
   * @returns {Promise<{ok:boolean, url?:string, publicId?:string, error?:string}>}
   */
  const uploadDataUrl = useCallback(
    async (dataUrl) => {
      if (!dataUrl || typeof dataUrl !== "string") {
        const msg = "La imagen editada no es válida.";
        setError(msg);
        return { ok: false, error: msg };
      }
      return performUpload(dataUrl);
    },
    [performUpload]
  );

  /**
   * Sube varias imágenes en paralelo.
   * @param {File[]} files
   * @returns {Promise<{ok:boolean, results?: object[], errors?: string[]}>}
   */
  const uploadMany = useCallback(
    async (files) => {
      const outcomes = await Promise.all(files.map((f) => upload(f)));
      const results = outcomes.filter((o) => o.ok);
      const errors = outcomes.filter((o) => !o.ok).map((o) => o.error);
      return { ok: errors.length === 0, results, errors };
    },
    [upload]
  );

  /**
   * Elimina una imagen de Cloudinary (por si se cancela antes de guardar).
   * @param {string} publicId
   */
  const removeFromCloudinary = useCallback(async (publicId) => {
    try {
      await eliminarImagen(publicId);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message };
    }
  }, []);

  return {
    upload,
    uploadDataUrl,
    uploadMany,
    removeFromCloudinary,
    uploading,
    error,
    result,
    progress,
    clearError,
    reset,
  };
}
