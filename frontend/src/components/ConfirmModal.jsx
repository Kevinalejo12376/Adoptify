import React from "react";
import { useTheme } from "../context/ThemeContext";
import { AlertTriangle, Trash2, LogOut, X, AlertCircle, Ban, Archive } from "lucide-react";

const typeConfig = {
  danger: {
    icon: Trash2,
    gradient: "from-red-500 to-rose-500",
    bg: "bg-red-100 dark:bg-red-500/10",
    btn: "bg-red-500 hover:bg-red-600",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-100 dark:bg-amber-500/10",
    btn: "bg-amber-500 hover:bg-amber-600",
    iconColor: "text-amber-500",
  },
  info: {
    icon: AlertCircle,
    gradient: "from-blue-500 to-indigo-500",
    bg: "bg-blue-100 dark:bg-blue-500/10",
    btn: "bg-blue-500 hover:bg-blue-600",
    iconColor: "text-blue-500",
  },
  archive: {
    icon: Archive,
    gradient: "from-gray-500 to-slate-500",
    bg: "bg-gray-100 dark:bg-gray-500/10",
    btn: "bg-gray-600 hover:bg-gray-700",
    iconColor: "text-gray-500",
  },
  logout: {
    icon: LogOut,
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-rose-100 dark:bg-rose-500/10",
    btn: "bg-rose-500 hover:bg-rose-600",
    iconColor: "text-rose-500",
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "¿Estás seguro?",
  message = "",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "danger",
  confirmDisabled = false,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!isOpen) return null;

  const config = typeConfig[type] || typeConfig.danger;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-modal-overlay">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div
        className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? "bg-dark-card border border-dark-border" : "bg-white"
        } animate-modal-content`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra decorativa */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`}
        ></div>

        <div className="p-6 text-center">
          {/* Icono */}
          <div
            className={`w-16 h-16 mx-auto mb-4 rounded-full ${config.bg} flex items-center justify-center`}
          >
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>

          {/* Título */}
          <h3
            className={`text-lg font-bold font-display mb-2 ${
              isDark ? "text-dark-text" : "text-gray-900"
            }`}
          >
            {title}
          </h3>

          {/* Mensaje */}
          {message && (
            <p
              className={`text-sm leading-relaxed ${
                isDark ? "text-dark-text-secondary" : "text-gray-500"
              }`}
            >
              {message}
            </p>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-dark-text bg-white/5 hover:bg-white/10 border border-dark-border"
                  : "text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all shadow-lg ${
                confirmDisabled
                  ? "bg-gray-300 cursor-not-allowed dark:bg-dark-border"
                  : `${config.btn} active:scale-95`
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
