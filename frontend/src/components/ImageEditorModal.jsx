// Editor interactivo de imágenes.
// Permite "acomodar" (arrastrar para encuadrar), hacer zoom, rotar y voltear
// una imagen antes de subirla a Cloudinary. Se aplica a TODOS los roles
// (usuario, refugio, tienda aliada, administrador) porque el ImageUploader
// lo usa de forma unificada.
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
 * @param {number} [props.outputSize] Tamaño del ancho de salida (px).
 * @param {(dataUrl:string)=>void} props.onApply
 * @param {()=>void} props.onCancel
 */
export default function ImageEditorModal({
  isOpen,
  imageSrc,
  aspectRatio = 1,
  outputSize = 800,
  onApply,
  onCancel,
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
  const dragState = useRef(null);

  const boxH = BOX_W / aspectRatio;

  // Cargar la imagen cuando se abre.
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setLoaded(false);
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setLoaded(true);
    };
    img.src = imageSrc;
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

  // Escala para que la imagen "cubra" el marco de recorte al 100%.
  const baseScale = Math.max(BOX_W / rW, boxH / rH);
  const scale = baseScale * zoom;

  const clampOffset = (ox, oy) => {
    const maxX = Math.max(BOX_W, rW * scale) / 2 + BOX_W;
    const maxY = Math.max(boxH, rH * scale) / 2 + boxH;
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
      const outW = outputSize;
      const outH = Math.round(outputSize / aspectRatio);
      const factor = outW / BOX_W;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      // Fondo blanco (evita transparencia en JPEG).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.save();
      ctx.translate(outW / 2 + offset.x * factor, outH / 2 + offset.y * factor);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(
        imgEl,
        (-W * scale * factor) / 2,
        (-H * scale * factor) / 2,
        W * scale * factor,
        H * scale * factor
      );
      ctx.restore();
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onApply(dataUrl);
    } catch {
      // Si el render falla, se aplica la imagen original.
      onApply(imageSrc);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-dark-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-content">
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
                src={imageSrc}
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
            <button onClick={reset} title="Restablecer" className="ctrl-btn">
              <ResetIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
            <button onClick={rotateLeft} title="Rotar izquierda" className="ctrl-btn">
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Rotar</span>
            </button>
            <button onClick={rotateRight} title="Rotar derecha" className="ctrl-btn">
              <RotateCw className="w-4 h-4" />
              <span className="hidden sm:inline">Girar</span>
            </button>
            <button onClick={() => setFlipX(!flipX)} title="Voltear horizontal" className={`ctrl-btn ${flipX ? "ctrl-active" : ""}`}>
              <FlipHorizontal2 className="w-4 h-4" />
              <span className="hidden sm:inline">Voltear H</span>
            </button>
            <button onClick={() => setFlipY(!flipY)} title="Voltear vertical" className={`ctrl-btn ${flipY ? "ctrl-active" : ""}`}>
              <FlipVertical2 className="w-4 h-4" />
              <span className="hidden sm:inline">Voltear V</span>
            </button>
            <button onClick={() => zoomBy(-0.2)} title="Alejar" className="ctrl-btn">
              <ZoomOut className="w-4 h-4" />
              <span className="hidden sm:inline">-</span>
            </button>
            <span className="ctrl-btn ctrl-static">Zoom {Math.round(zoom * 100)}%</span>
            <button onClick={() => zoomBy(0.2)} title="Acercar" className="ctrl-btn">
              <ZoomIn className="w-4 h-4" />
              <span className="hidden sm:inline">+</span>
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
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
    </div>
  );
}
