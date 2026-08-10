import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

/**
 * Toast reutilizable del foro. Sigue la identidad visual de Adoptify y se
 * adapta al modo oscuro. Se cierra automáticamente o al hacer clic.
 */
export default function ForumToast({ message, type = "success", onClose, duration = 2800 }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  const config = {
    success: { icon: CheckCircle2, color: "text-emerald-500", chip: isDark ? "bg-emerald-500/15" : "bg-emerald-50" },
    error: { icon: AlertCircle, color: "text-red-500", chip: isDark ? "bg-red-500/15" : "bg-red-50" },
    info: { icon: Info, color: "text-blue-500", chip: isDark ? "bg-blue-500/15" : "bg-blue-50" },
  };
  const c = config[type] || config.info;
  const Icon = c.icon;

  return (
    <div className={`fixed bottom-6 right-6 z-[90] flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-2xl shadow-2xl border animate-scale-in max-w-[92vw] ${
      isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
    }`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.chip}`}>
        <Icon className={`w-5 h-5 ${c.color}`} />
      </span>
      <span className={`text-sm font-medium pr-1 ${isDark ? "text-dark-text" : "text-gray-800"}`}>{message}</span>
      <button
        onClick={onClose}
        className={`p-1.5 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
