import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

/**
 * Toast pequeño e independiente (NO usa la campana de notificaciones).
 * Aparece en la esquina inferior derecha, se cierra automáticamente tras unos
 * segundos o al hacer clic en la X. No bloquea la pantalla.
 * @param {string} message Texto a mostrar.
 * @param {"success"|"error"} type Tipo visual del toast.
 * @param {() => void} onClose Callback al cerrar.
 * @param {number} duration Milisegundos antes de auto-cerrar.
 */
export default function Toast({ message, type = "success", onClose, duration = 3200 }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;

  const isSuccess = type !== "error";
  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-[95] flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-2xl shadow-2xl border animate-scale-in max-w-[92vw] bg-white dark:bg-dark-card border-emerald-200 dark:border-emerald-500/30 text-gray-800 dark:text-dark-text"
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
