// Editor interactivo de imágenes.
// Permite "acomodar" (arrastrar para encuadrar), hacer zoom, rotar y voltear
// una imagen antes de subirla a Cloudinary. Se aplica a TODOS los roles
// (usuario, refugio, tienda aliada, administrador) porque el ImageUploader
// lo usa de forma unificada.
//
// Por defecto se muestra como un overlay flotante (fixed z-[80]) sobre toda
// la pantalla. Si se usa dentro de otro modal (p. ej. crear/editar publicación
// del foro) se puede pasar `inline` para que el editor se renderice como un
// bloque dentro del contenedor del modal, reemplazando la zona de subida y
// evitando la superposición de capas.
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  ZoomIn,
  ZoomOut,
  RotateCw as ResetIcon,
  X,
  Check,
  Move,
  Loader2,
} from "lucide-react";

const BOX_W = 320; // ancho del marco de recorte en la vista previa (px)
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

/**
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {string} props.imageSrc Data URL de la imagen a editar.
 * @param {number} [props.aspectRatio] Relación de aspecto del recorte (w/h).
 * @param {number} [props.outputSize] Tamaño máximo del ancho de salida (px).
 * @param {(result:File|string)=>void} props.onApply Recibe un File/Blob real
 *   con el recorte aplicado (o un data URL si la exportación a Blob falla).
 * @param {()=>void} props.onCancel
 * @param {boolean} [props.inline] Renderiza el editor como bloque dentro del
 *   flujo (sin overlay flotante), ideal para usarlo dentro de otro modal.
 */
export default function ImageEditorModal({
  isOpen,
  imageSrc,
  aspectRatio = 1,
  outputSize = 800,
  onApply,
  onCancel,
  inline = false,
}) {
  const boxRef = useRef(null);
  const imageRef = useRef(null); // HTMLImageElement para el render en canvas
  const [loaded, setLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  // Imagen normalizada (orientación EXIF aplicada). La vista previa y la
  // exportación usan la MISMA imagen para que "Aplicar" coincida siempre.
  const [displaySrc, setDisplaySrc] = useState(null);
  const dragState = useRef(null);

  // Cargar la imagen cuando se abre. Se normaliza la orientación EXIF para que
  // la vista previa y la imagen exportada coincidan sin importar cómo venga la
  // foto (p. ej. tomada con celular).
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setLoaded(false);
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDisplaySrc(null);
    const load = async () => {
      let src = imageSrc;
      try {
        const blob = await (await fetch(imageSrc)).blob();
        const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        // Conserva la transparencia en PNG; para el resto usa fondo blanco.
        const mime = blob.type === "image/png" ? "image/png" : "image/jpeg";
        if (mime !== "image/png") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        src = canvas.toDataURL(mime, 0.95);
      } catch {
        // Si falla la normalización, se conserva la imagen original.
        src = imageSrc;
      }
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setDisplaySrc(src);
        setLoaded(true);
      };
      img.src = src;
    };
    load();
  }, [isOpen, imageSrc]);

  const reset = useCallback(() => {
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  if (!isOpen || !imageSrc) return null;

  const img = imageRef.current;
  const W = img?.naturalWidth || 1;
  const H = img?.naturalHeight || 1;
  const isSide = rotation % 180 !== 0;
  const rW = isSide ? H : W;
  const rH = isSide ? W : H;

  // Relación de aspecto efectiva: por defecto se ajusta a la relación de la
  // imagen para guardarla completa y centrada (sin recortarla por la mitad);
  // si se pasa un aspectRatio explícito (≠ 1), se respeta.
  const effAspect = aspectRatio === 1 ? rW / rH : aspectRatio;
  const boxH = BOX_W / effAspect;

  // Escala para que la imagen "cubra" el marco de recorte al 100%.
  const baseScale = Math.max(BOX_W / rW, boxH / rH);
  const scale = baseScale * zoom;

  const clampOffset = (ox, oy) => {
    // Límites de arrastre (restrictPosition): la imagen (rotada) no puede
    // desplazarse más allá de los bordes del visor, de modo que siempre cubre
    // el marco de recorte y no deja espacios vacíos a los lados.
    const maxX = Math.max(0, (rW * scale - BOX_W) / 2);
    const maxY = Math.max(0, (rH * scale - boxH) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  };

  const rotateLeft = () => setRotation((r) => (r + 270) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);
  const zoomBy = (d) =>
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(z + d).toFixed(2))));

  const onPointerDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    dragState.current = { startX, startY, offX: offset.x, offY: offset.y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clampOffset(dragState.current.offX + dx, dragState.current.offY + dy));
  };

  const onPointerUp = () => {
    dragState.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  const handleApply = () => {
    if (!imageRef.current) return;
    setExporting(true);
    try {
      const imgEl = imageRef.current;
      const imgW = imgEl.naturalWidth || W;
      const imgH = imgEl.naturalHeight || H;
      const isSide = rotation % 180 !== 0;
      const rW = isSide ? imgH : imgW;
      const rH = isSide ? imgW : imgH;
      // Escala con la que la imagen (rotada) cubre el box:
      // px de imagen original por px del box.
      const cover = Math.max(BOX_W / rW, boxH / rH);
      const scale = cover * zoom;
      // Factor que convierte px del box a px del canvas intermedio (escala de salida).
      const k = outputSize / BOX_W;

      // --- croppedAreaPixels en px de la imagen ORIGINAL (sin rotación) ---
      // El box equivale a (BOX_W / scale) px de la imagen original. El centro se
      // desplaza según el offset (px de box -> px de imagen original).
      const cropW = Math.max(1, Math.round(BOX_W / scale));
      const cropH = Math.max(1, Math.round(boxH / scale));
      const centerX = imgW / 2 - offset.x / scale;
      const centerY = imgH / 2 - offset.y / scale;
      const cropX = Math.round(centerX - cropW / 2);
      const cropY = Math.round(centerY - cropH / 2);

      // --- Canvas intermedio: imagen completa con rotación/volteo a escala de salida ---
      const mid = document.createElement("canvas");
      mid.width = Math.max(1, Math.round(rW * scale * k));
      mid.height = Math.max(1, Math.round(rH * scale * k));
      const mctx = mid.getContext("2d");
      mctx.fillStyle = "#ffffff";
      mctx.fillRect(0, 0, mid.width, mid.height);
      mctx.translate(mid.width / 2, mid.height / 2);
      mctx.rotate((rotation * Math.PI) / 180);
      mctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      mctx.drawImage(
        imgEl,
        (-imgW * scale * k) / 2,
        (-imgH * scale * k) / 2,
        imgW * scale * k,
        imgH * scale * k
      );

      // --- Resolución de salida: conserva la escala original sin upscale ---
      const outW = Math.max(1, Math.min(outputSize, cropW));
      const outH = Math.max(1, Math.round(outW / effAspect));

      // --- Recorte del croppedAreaPixels dentro del canvas intermedio ---
      // El canvas intermedio contiene la imagen (rotada/volteada) a escala de
      // salida; se recorta el área definida por cropX/cropY/cropW/cropH (px de
      // la imagen original) convertida a px del canvas intermedio (× scale × k).
      const midSx = mid.width / 2 - (imgW * scale * k) / 2 + cropX * scale * k;
      const midSy = mid.height / 2 - (imgH * scale * k) / 2 + cropY * scale * k;
      const midSw = cropW * scale * k;
      const midSh = cropH * scale * k;

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(mid, midSx, midSy, midSw, midSh, 0, 0, outW, outH);

      // --- Blob/File real recortado ---
      canvas.toBlob((blob) => {
        if (!blob) {
          // Si falla la exportación a Blob, se aplica la imagen original.
          onApply(imageSrc);
          return;
        }
        const file = new File([blob], "imagen-recortada.jpg", { type: "image/jpeg" });
        onApply(file);
      }, "image/jpeg", 0.92);
    } catch {
      // Si el render falla, se aplica la imagen original.
      onApply(imageSrc);
    } finally {
      setExporting(false);
    }
  };

  const editorBody = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 rounded-xl flex items-center justify-center">
            <Move className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white">Editar imagen</h3>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
              Arrastra para encuadrar, usa los controles para ajustar
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Preview del recorte */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-dark-bg overflow-hidden">
        {!loaded ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Cargando imagen...</p>
          </div>
        ) : (
          <div
            ref={boxRef}
            className="relative overflow-hidden rounded-xl shadow-lg ring-2 ring-rose-400/60 touch-none"
            style={{ width: BOX_W, height: boxH, cursor: "grab", background: "repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%) 50% / 20px 20px" }}
            onPointerDown={onPointerDown}
            onPointerCancel={onPointerUp}
          >
            <img
              src={displaySrc}
              alt="Editar"
              draggable={false}
              className="absolute select-none pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                width: W * scale,
                height: H * scale,
                marginLeft: (-W * scale) / 2,
                marginTop: (-H * scale) / 2,
                // Cubre el área del visor sin deformar; el overflow-hidden del
                // contenedor recorta el exceso (comportamiento "cover").
                objectFit: "cover",
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
                transformOrigin: "center center",
              }}
            />
            {/* Líneas de tercios */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
            </div>
            {/* Halo de "arrastrar" */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/50 text-white text-[10px] flex items-center gap-1">
              <Move className="w-3 h-3" /> Arrastra
            </div>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-dark-border">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={reset} title="Restablecer" className="ctrl-btn">
            <ResetIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Restablecer</span>
          </button>
          <button type="button" onClick={rotateLeft} title="Rotar izquierda" className="ctrl-btn">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Rotar</span>
          </button>
          <button type="button" onClick={rotateRight} title="Rotar derecha" className="ctrl-btn">
            <RotateCw className="w-4 h-4" />
            <span className="hidden sm:inline">Girar</span>
          </button>
          <button type="button" onClick={() => setFlipX(!flipX)} title="Voltear horizontal" className={`ctrl-btn ${flipX ? "ctrl-active" : ""}`}>
            <FlipHorizontal2 className="w-4 h-4" />
            <span className="hidden sm:inline">Voltear H</span>
          </button>
          <button type="button" onClick={() => setFlipY(!flipY)} title="Voltear vertical" className={`ctrl-btn ${flipY ? "ctrl-active" : ""}`}>
            <FlipVertical2 className="w-4 h-4" />
            <span className="hidden sm:inline">Voltear V</span>
          </button>
          <button type="button" onClick={() => zoomBy(-0.2)} title="Alejar" className="ctrl-btn">
            <ZoomOut className="w-4 h-4" />
            <span className="hidden sm:inline">-</span>
          </button>
          <span className="ctrl-btn ctrl-static">Zoom {Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomBy(0.2)} title="Acercar" className="ctrl-btn">
            <ZoomIn className="w-4 h-4" />
            <span className="hidden sm:inline">+</span>
          </button>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!loaded || exporting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-60 text-sm"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Aplicar
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .ctrl-btn {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.5rem 0.75rem; border-radius: 0.75rem; font-size: 0.8rem; font-weight: 600;
          color: #374151; background: #fff; border: 1px solid #e5e7eb;
          transition: all .2s; cursor: pointer;
        }
        .dark .ctrl-btn { color: #e5e7eb; background: #1f1f2e; border-color: #2d2d3f; }
        .ctrl-btn:hover { background: #f3f4f6; }
        .dark .ctrl-btn:hover { background: #2a2a3b; }
        .ctrl-btn.ctrl-active { background: #ffe4e6; border-color: #f43f5e; color: #e11d48; }
        .dark .ctrl-btn.ctrl-active { background: rgba(244,63,94,.15); border-color: #f43f5e; color: #fb7185; }
        .ctrl-btn.ctrl-static { cursor: default; }
      `}</style>
    </>
  );

  // Modo inline: se renderiza como un bloque dentro del contenedor del modal
  // que lo invoca (sin overlay ni backdrop), evitando capas superpuestas.
  if (inline) {
    return (
      <div className="w-full rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-xl overflow-hidden flex flex-col animate-modal-content">
        {editorBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-dark-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-content">
        {editorBody}
      </div>
    </div>
  );
}
