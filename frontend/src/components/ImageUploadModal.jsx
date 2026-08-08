import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import {
  X, Upload, RotateCw, RotateCcw, ZoomIn, ZoomOut, Rotate3d,
  Trash2, Save, AlertCircle, Loader2, Image as ImageIcon,
} from "lucide-react";

/**
 * Modal reutilizable para subir y editar imágenes antes de enviarlas a Cloudinary.
 *
 * Incluye: vista previa, editor (recortar, rotar, zoom, mover y restablecer),
 * botón para cambiar imagen, eliminar imagen, cancelar y guardar.
 *
 * La imagen solo se exporta (base64) cuando el usuario confirma "Guardar";
 * en ese momento se llama a `onSave(base64)`. Si existe una imagen previa,
 * `onDelete()` permite eliminarla con confirmación.
 *
 * Props:
 *  - open, onClose
 *  - title (default "Editar imagen")
 *  - aspect: relación de recorte (default 1)
 *  - shape: "round" | "square" (estilo del contenedor de vista previa)
 *  - onSave(base64): Promise | void — sube la imagen editada
 *  - onDelete(): Promise | void — elimina la imagen existente
 *  - canDelete: muestra el botón eliminar (default false)
 */
export default function ImageUploadModal({
  open,
  onClose,
  title = "Editar imagen",
  aspect = 1,
  shape = "square",
  onSave,
  onDelete,
  canDelete = false,
}) {
  const fileInputRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);      // Object URL de la imagen seleccionada
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Al abrir el modal se reinicia el estado del editor.
  useEffect(() => {
    if (open) {
      setError("");
      setConfirmDelete(false);
      setSaving(false);
    } else {
      revokeImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const revokeImage = () => {
    setImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixelsResult) => {
    setCroppedAreaPixels(croppedAreaPixelsResult);
  }, []);

  const validarArchivo = (file) => {
    if (!file) return false;
    if (!file.type || !file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (PNG, JPG, WEBP, etc.).");
      return false;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen supera el tamaño máximo de 8 MB.");
      return false;
    }
    return true;
  };

  const handleSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validarArchivo(file)) return;
    setError("");
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    e.target.value = "";
  };

  const resetear = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setError("");
  };

  // Genera el recorte final sobre un canvas y lo devuelve como base64 (JPEG).
  const generarBase64 = async (imagenSrc, pixelCrop, rotacion, size = 512) => {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imagenSrc;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotacion * Math.PI) / 180);
    const escalaX = size / pixelCrop.width;
    const escalaY = size / pixelCrop.height;
    ctx.translate(
      -(pixelCrop.x + pixelCrop.width / 2) * escalaX,
      -(pixelCrop.y + pixelCrop.height / 2) * escalaY,
    );
    ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width * escalaX, image.height * escalaY);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const handleGuardar = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setError("Selecciona una imagen antes de guardar.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const base64 = await generarBase64(imageSrc, croppedAreaPixels, rotation, 512);
      await onSave?.(base64);
      revokeImage();
      onClose();
    } catch (e) {
      setError(e?.message || "No se pudo procesar la imagen. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onDelete?.();
      revokeImage();
      onClose();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar la imagen. Intenta de nuevo.");
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const previewCls = shape === "round" ? "rounded-full" : "rounded-2xl";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-modal-overlay">
      <div className="w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border animate-modal-content overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-border">
          <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-sm font-medium">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          {!imageSrc ? (
            /* Sin imagen seleccionada */
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 dark:border-dark-border rounded-2xl bg-gray-50 dark:bg-dark-bg text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center mb-3">
                <ImageIcon size={24} className="text-rose-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Selecciona una imagen</p>
              <p className="text-xs text-gray-400 dark:text-dark-text-secondary mb-4">PNG, JPG o WEBP · máx. 8 MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
              >
                <Upload size={15} /> Subir imagen
              </button>
            </div>
          ) : (
            /* Editor de imagen */
            <>
              <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-gray-900">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Controles de edición */}
              <div className="mt-4 space-y-3">
                {/* Zoom */}
                <div className="flex items-center gap-3">
                  <ZoomOut size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-rose-500"
                  />
                  <ZoomIn size={16} className="text-gray-400 flex-shrink-0" />
                </div>

                {/* Rotación + restablecer */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation((r) => r - 90)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors"
                      title="Rotar 90° a la izquierda"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => r + 90)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors"
                      title="Rotar 90° a la derecha"
                    >
                      <RotateCw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={resetear}
                      className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                      title="Restablecer imagen al estado original"
                    >
                      <Rotate3d size={14} /> Restablecer
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">Mueve y recorta la imagen en el área</span>
                </div>
              </div>

              {/* Vista previa del resultado */}
              <div className="mt-4 flex items-center gap-3">
                <div className={`w-14 h-14 ${previewCls} overflow-hidden bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 border-2 border-gray-100 dark:border-dark-border flex-shrink-0`}>
                  {croppedAreaPixels ? (
                    <img
                      src={imageSrc}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `rotate(${rotation}deg) scale(${zoom})`,
                        transformOrigin: "center center",
                      }}
                    />
                  ) : (
                    <ImageIcon size={20} className="text-rose-500 mx-auto mt-3.5" />
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary">
                  Vista previa: así se verá la imagen al guardar.
                </p>
              </div>
            </>
          )}

          {/* Input oculto para elegir/cambiar imagen */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSeleccionarArchivo}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-dark-border">
          {canDelete && (
            <button
              type="button"
              onClick={handleEliminar}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 ${
                confirmDelete
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              }`}
            >
              <Trash2 size={15} />
              {saving && confirmDelete ? "Eliminando..." : confirmDelete ? "¿Confirmar eliminación?" : "Eliminar"}
            </button>
          )}
          {imageSrc && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border transition-all disabled:opacity-60"
            >
              <Upload size={15} /> Cambiar imagen
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border transition-all disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving || !imageSrc}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
