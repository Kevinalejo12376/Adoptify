// Componente reutilizable de subida de imágenes a Cloudinary.
// Se usa en TODA la aplicación (perfil, refugios, mascotas, productos, foro...).
// Flujo: seleccionar → EDITAR (recortar/rotar/voltear/zoom) → subir a Cloudinary.
// Incluye validación, indicador de carga, errores, preview y botón "Quitar".
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useImageUpload } from "../hooks/useImageUpload";
import { readAndValidateImage, MAX_IMAGE_SIZE_MB } from "../utils/imageUtils";
import ImageEditorModal from "./ImageEditorModal";
import { Loader2, UploadCloud, X, ImageOff, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

/**
 * @param {object} props
 * @param {string} props.tipo Tipo permanente (obligatorio si no es temporal).
 * @param {boolean} [props.temporal] Sube como imagen temporal (temp/).
 * @param {string} [props.carpetaTemp]
 * @param {boolean} [props.multiple] Permitir varias imágenes.
 * @param {number} [props.maxFiles] Máximo de archivos (default 5).
 * @param {string} [props.label] Texto del título.
 * @param {Array} [props.value] Imágenes existentes: [{url, publicId?, id?}].
 * @param {(imgs:Array)=>void} [props.onChange] Se llama con el nuevo arreglo.
 * @param {(err:string)=>void} [props.onError]
 * @param {number} [props.aspectRatio] Relación de aspecto del recorte (w/h).
 * @param {string} [props.accept]
 * @param {string} [props.previewClassName] Clases extra para las miniaturas.
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.inline] Renderiza el editor embebido dentro del
 *   contenedor (sin overlay flotante), ideal cuando el uploader va dentro de
 *   otro modal (p. ej. crear/editar publicación del foro).
 */
export default function ImageUploader({
  tipo,
  temporal = false,
  carpetaTemp = "TEMP_GENERAL",
  multiple = false,
  maxFiles = 5,
  label = "Imágenes",
  value = [],
  onChange,
  onError,
  onUploadingChange,
  aspectRatio = 1,
  accept = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml",
  previewClassName = "",
  disabled = false,
  inline = false,
  diferirSubida = false,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState(null);
  // Previews locales mientras se suben (para feedback inmediato).
  const [pending, setPending] = useState([]); // [{preview, publicId?}]
  // Cola de edición: imagen que se está editando actualmente.
  const [editingSrc, setEditingSrc] = useState(null);
  const editQueueRef = useRef([]);

  const { upload, uploadDataUrl, uploading, progress, removeFromCloudinary } = useImageUpload({ tipo, temporal, carpetaTemp });

  // Notifica al padre si hay una subida en curso (para bloquear "Guardar").
  useEffect(() => {
    onUploadingChange?.(uploading || pending.length > 0);
  }, [uploading, pending.length, onUploadingChange]);

  // Normaliza `value` a un arreglo de objetos.
  const images = Array.isArray(value) ? value : value ? [value] : [];

  const addError = useCallback(
    (msg) => {
      setLocalError(msg);
      onError?.(msg);
    },
    [onError]
  );

  const openNextEditor = useCallback(() => {
    if (editQueueRef.current.length === 0) return;
    setEditingSrc(editQueueRef.current[0]);
  }, []);

  const handleFiles = useCallback(
    async (fileList) => {
      if (disabled || uploading || editingSrc) return;
      const files = Array.from(fileList || []);
      if (files.length === 0) return;

      setLocalError(null);

      const remaining = maxFiles - images.length - pending.length;
      if (remaining <= 0) {
        addError(`Solo se permiten hasta ${maxFiles} imágenes.`);
        return;
      }
      const toUpload = files.slice(0, remaining);
      if (files.length > remaining) {
        addError(`Solo se permiten hasta ${maxFiles} imágenes. Se ignoraron ${files.length - remaining}.`);
      }

      // Validar y leer a base64; encolar para el editor.
      const queue = [];
      for (const f of toUpload) {
        const res = await readAndValidateImage(f);
        if (res.ok) {
          queue.push(res.base64);
        } else {
          addError(res.error);
        }
      }
      editQueueRef.current = [...editQueueRef.current, ...queue];
      openNextEditor();
    },
    [disabled, uploading, editingSrc, maxFiles, images, pending.length, addError, openNextEditor]
  );

  // Aplica la imagen ya editada: recibe un File/Blob recortado (o un data URL
  // como fallback). Con `diferirSubida` NO sube a Cloudinary todavía: la imagen
  // queda local (blob URL + file) y se subirá cuando el formulario guarde o
  // publique. En el flujo normal la sube a Cloudinary y la agrega a la lista.
  const handleEditorApply = useCallback(
    async (result) => {
      setEditingSrc(null);
      editQueueRef.current = editQueueRef.current.slice(1);

      // Subida diferida: guardar la imagen editada localmente sin subirla.
      if (diferirSubida) {
        if (result instanceof Blob || result instanceof File) {
          const localUrl = URL.createObjectURL(result);
          onChange?.([...images, { url: localUrl, file: result, publicId: "" }]);
        } else {
          onChange?.([...images, { url: result, publicId: "" }]);
        }
        openNextEditor();
        return;
      }

      // Miniatura local del recorte mientras sube (Blob URL o data URL).
      const isBlob = result instanceof Blob || result instanceof File;
      const previewUrl = isBlob ? URL.createObjectURL(result) : result;
      setPending((p) => [...p, { preview: previewUrl }]);

      const res = isBlob ? await upload(result) : await uploadDataUrl(result);
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (res.ok) {
        const next = [...images, { url: res.url, publicId: res.publicId }];
        onChange?.(next);
      } else {
        addError(res.error);
      }
      setPending((prev) => prev.slice(1));
      openNextEditor();
    },
    [diferirSubida, upload, uploadDataUrl, images, onChange, addError, openNextEditor]
  );

  const removeImage = (index) => {
    if (disabled) return;
    const img = images[index];
    const next = images.filter((_, i) => i !== index);
    onChange?.(next);
    // Imagen local aún no subida: solo se libera la URL local.
    if (img?.file && img.url && img.url.startsWith("blob:")) {
      URL.revokeObjectURL(img.url);
    } else if (img && img.publicId && !img.id) {
      // Si es una imagen recién subida (sin id en la BD), se borra de Cloudinary.
      removeFromCloudinary(img.publicId);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer?.files);
  };

  // En modo inline (p. ej. dentro de un modal) el editor se muestra como un
  // bloque que reemplaza la zona de subida, en lugar de un overlay flotante.
  const showInlineEditor = inline && !!editingSrc;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {showInlineEditor ? (
        <ImageEditorModal
          inline
          isOpen
          imageSrc={editingSrc}
          aspectRatio={aspectRatio}
          onApply={handleEditorApply}
          onCancel={() => {
            editQueueRef.current = editQueueRef.current.slice(1);
            setEditingSrc(null);
            openNextEditor();
          }}
        />
      ) : (
        <>
          {/* Zona de arrastre / selección */}
          <div
            onClick={() => !disabled && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : dragOver
                ? "border-rose-500 bg-rose-50/60 dark:bg-rose-500/10"
                : "border-gray-300 dark:border-dark-border hover:border-rose-400 dark:hover:border-rose-500/50 bg-gray-50/50 dark:bg-transparent"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={accept}
              multiple={multiple}
              disabled={disabled || uploading}
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subiendo foto ({progress}%)
                </p>
                <div className="w-full max-w-xs h-2 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="w-8 h-8 text-gray-400 dark:text-dark-text-secondary" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Arrastra tus imágenes aquí
                </p>
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                  o haz clic para seleccionar archivos · JPG, PNG, WEBP, GIF, AVIF, SVG · máx. {MAX_IMAGE_SIZE_MB} MB
                </p>
                <p className="text-xs text-rose-500/80 font-medium">
                  ✂️ Podrás recortar, rotar y voltear antes de subir
                </p>
              </div>
            )}
          </div>

          {/* Error local */}
          {localError && (
            <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
              <p className="text-xs text-red-700 dark:text-red-300 flex-1">{localError}</p>
              <button onClick={() => setLocalError(null)} className="text-red-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Previews: existentes + pendientes */}
          {(images.length > 0 || pending.length > 0) && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={img.url || i} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border">
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={label}
                      className={`w-full h-24 object-cover ${previewClassName}`}
                      onError={(e) => {
                        e.currentTarget.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2VjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5YWEzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TSU4gSU1BR0VOPC90ZXh0Pjwvc3ZnPg==";
                      }}
                    />
                  ) : (
                    <div className="w-full h-24 flex items-center justify-center bg-gray-100 dark:bg-dark-bg">
                      <ImageOff className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  {!disabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(i);
                      }}
                      className="absolute top-1 right-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-semibold opacity-90 hover:bg-red-500 transition-all"
                      title="Quitar foto"
                    >
                      <Trash2 className="w-3 h-3" /> Quitar
                    </button>
                  )}
                  <CheckCircle2 className="absolute bottom-1 left-1 w-4 h-4 text-emerald-400 drop-shadow" />
                </div>
              ))}

              {pending.map((p, i) => (
                <div key={`p-${i}`} className="relative rounded-xl overflow-hidden border border-rose-200 dark:border-rose-500/30">
                  <img src={p.preview} alt="Subiendo" className="w-full h-24 object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Editor interactivo (overlay flotante, solo fuera de modo inline) */}
      {!inline && (
        <ImageEditorModal
          isOpen={!!editingSrc}
          imageSrc={editingSrc}
          aspectRatio={aspectRatio}
          onApply={handleEditorApply}
          onCancel={() => {
            editQueueRef.current = editQueueRef.current.slice(1);
            setEditingSrc(null);
            openNextEditor();
          }}
        />
      )}
    </div>
  );
}
