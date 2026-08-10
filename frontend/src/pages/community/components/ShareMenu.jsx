import { useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../../context/ThemeContext";
import { X, Link2, MessageCircle, Check, Loader2 } from "lucide-react";

/**
 * Menú "Compartir" propio de Adoptify:
 * - Copiar enlace único de la publicación.
 * - Compartir por WhatsApp con el enlace directo.
 *
 * Se renderiza mediante un portal en document.body para que el overlay oscuro
 * SIEMPRE cubra toda la ventana (evita que un ancestro con transform/filter
 * limite el posicionamiento del modal).
 */
export default function ShareMenu({ isOpen, onClose, url, title = "", notify, onTrack }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = title ? `${title} — Adoptify` : "Mira esta publicación en Adoptify";

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onTrack?.();
      notify?.("✓ Enlace copiado", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify?.("No se pudo copiar el enlace", "error");
    } finally {
      setCopying(false);
    }
  };

  const handleWhatsApp = () => {
    const wa = `https://wa.me/?text=${encodeURIComponent(`${shareText}: ${url}`)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
    onTrack?.();
    notify?.("Abriendo WhatsApp...", "info");
  };

  const rowBase = "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold w-full transition-all text-left";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-modal-overlay">
      {/* Overlay oscuro que cubre TODA la ventana */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div
        className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? "bg-dark-card border border-dark-border" : "bg-white"
        } animate-modal-content`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? "border-dark-border" : "border-gray-100"}`}>
          <div>
            <h2 className={`text-lg font-bold font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>Compartir publicación</h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              El enlace lleva directamente a esta publicación
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {/* Copiar enlace */}
          <button
            onClick={handleCopy}
            className={`${rowBase} ${isDark ? "bg-white/5 text-dark-text hover:bg-white/10" : "bg-gray-50 text-gray-800 hover:bg-gray-100"}`}
          >
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-amber-500/15" : "bg-amber-100"}`}>
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : copying ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : <Link2 className="w-5 h-5 text-amber-600" />}
            </span>
            <span className="flex-1">Copiar enlace</span>
            {copied && <span className="text-xs font-medium text-emerald-500">¡Copiado!</span>}
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className={`${rowBase} ${isDark ? "bg-white/5 text-dark-text hover:bg-white/10" : "bg-gray-50 text-gray-800 hover:bg-gray-100"}`}
          >
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-emerald-500/15" : "bg-emerald-100"}`}>
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </span>
            <span className="flex-1">WhatsApp</span>
          </button>
        </div>

        {/* Enlace visible */}
        <div className={`px-4 pb-5`}>
          <div className={`rounded-xl px-4 py-2.5 text-xs truncate ${isDark ? "bg-[#15151f] border border-dark-border text-dark-text-secondary" : "bg-gray-50 border border-gray-100 text-gray-500"}`}>
            {url}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
