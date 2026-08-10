import { createPortal } from "react-dom";
import { useTheme } from "../../../context/ThemeContext";
import { X, Shield, Loader2, Smile } from "lucide-react";
import { getReaction } from "../forumData";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};

/**
 * Modal "Reacciones": muestra quién reaccionó y con qué reacción.
 * La información proviene del backend (datos reales, nunca inventados).
 */
export default function ReactionsModal({ isOpen, onClose, reactions = [], loading = false }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!isOpen) return null;

  const total = reactions.length;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-modal-overlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div
        className={`relative w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? "bg-dark-card border border-dark-border" : "bg-white"
        } animate-modal-content`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? "border-dark-border" : "border-gray-100"}`}>
          <div>
            <h2 className={`text-lg font-bold font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>Reacciones</h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              {total} {total === 1 ? "persona reaccionó" : "personas reaccionaron"}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`} />
            </div>
          )}

          {!loading && reactions.length === 0 && (
            <div className={`text-center py-12 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              <Smile className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aún no hay reacciones en esta publicación.</p>
            </div>
          )}

          {!loading &&
            reactions.map((r, idx) => {
              const reaccion = getReaction(r.tipo);
              const Icon = reaccion?.icon || Smile;
              return (
                <div key={r.usuario_id ?? idx} className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  {r.autor_avatar ? (
                    <div className={`w-10 h-10 rounded-full overflow-hidden border ${isDark ? "border-dark-border" : "border-gray-100"} shrink-0`}>
                      <img src={r.autor_avatar} alt={r.autor} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        r.autor_rol === "refugio" ? "from-orange-500 to-rose-500" : "from-amber-400 to-orange-500"
                      } flex items-center justify-center text-white text-sm font-bold shrink-0`}
                    >
                      {getInitials(r.autor)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isDark ? "text-dark-text" : "text-gray-900"}`}>{r.autor}</p>
                    {r.autor_rol === "refugio" && (
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${isDark ? "text-orange-300" : "text-orange-600"}`}>
                        <Shield className="w-3 h-3" />
                        Refugio
                      </span>
                    )}
                  </div>
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isDark ? "bg-white/5" : "bg-gray-50"
                    }`}
                    title={reaccion?.label || r.tipo}
                  >
                    {Icon && <Icon className={`w-5 h-5 ${reaccion?.color || ""}`} fill="none" />}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>,
    document.body
  );
}
