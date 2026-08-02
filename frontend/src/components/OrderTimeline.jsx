import React from "react";
import { useTheme } from "../context/ThemeContext";
import {
  ShoppingCart, CheckCircle2, Package, Truck,
  PackageCheck, XCircle, RotateCcw, Clock
} from "lucide-react";

const TIMELINE_STEPS = [
  { estado: "pendiente", label: "Pedido Realizado", icon: ShoppingCart },
  { estado: "pagado", label: "Pago Confirmado", icon: CheckCircle2 },
  { estado: "preparando", label: "Preparando Pedido", icon: Package },
  { estado: "enviado", label: "Enviado", icon: Package },
  { estado: "en_camino", label: "En Camino", icon: Truck },
  { estado: "entregado", label: "Entregado", icon: PackageCheck },
];

const STATUS_ORDER = [
  "pendiente", "pagado", "preparando", "enviado", "en_camino", "entregado",
];

function getStepStatus(currentStatus, stepEstado) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stepIdx = STATUS_ORDER.indexOf(stepEstado);

  if (currentStatus === "cancelado" || currentStatus === "reembolsado") {
    return stepIdx <= currentIdx ? "inactive" : "future";
  }
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "current";
  return "future";
}

export default function OrderTimeline({ currentStatus, historial = [], isDark: propIsDark }) {
  const { theme } = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : theme === "dark";

  // Si está cancelado, mostrar estado especial
  const isCancelled = currentStatus === "cancelado" || currentStatus === "reembolsado";

  // Construir historial de estados alcanzados
  const estadosAlcanzados = new Set();
  historial.forEach((h) => estadosAlcanzados.add(h.estado));
  estadosAlcanzados.add(currentStatus);

  return (
    <div className="relative">
      {/* Linea de tiempo vertical para mobile, horizontal para desktop */}
      <div className="flex flex-col md:flex-row md:items-start gap-0 md:gap-0 relative">
        {/* Linea conectora - vertical en mobile, horizontal en desktop */}
        <div className="hidden md:block absolute top-6 left-[calc(16.666%+12px)] right-[calc(16.666%+12px)] h-0.5">
          <div className={`h-full rounded-full transition-all duration-700 ${
            isDark ? "bg-white/10" : "bg-gray-200"
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isCancelled
                  ? "bg-red-500"
                  : "bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500"
              }`}
              style={{
                width: isCancelled
                  ? `${((STATUS_ORDER.indexOf(currentStatus) + 1) / STATUS_ORDER.length) * 100}%`
                  : `${(STATUS_ORDER.indexOf(currentStatus) / (STATUS_ORDER.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {TIMELINE_STEPS.map((step, index) => {
          const stepStatus = isCancelled
            ? estadosAlcanzados.has(step.estado)
              ? "completed"
              : "future"
            : getStepStatus(currentStatus, step.estado);
          const Icon = step.icon;
          const isCompleted = stepStatus === "completed";
          const isCurrent = stepStatus === "current";

          return (
            <div
              key={step.estado}
              className={`
                flex md:flex-col items-start md:items-center gap-4 md:gap-2
                flex-1 relative group
                ${index === 0 ? "" : "md:ml-0"}
                animate-fade-in-up
              `}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/* Mobile: row layout */}
              <div className="flex md:hidden items-start gap-4 w-full">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-500 shrink-0
                      ${
                        isCompleted
                          ? isDark
                            ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30"
                            : "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500/20"
                          : isCurrent
                            ? isDark
                              ? "bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30 animate-pulse-soft"
                              : "bg-amber-100 text-amber-600 ring-2 ring-amber-500/20 animate-pulse-soft"
                            : isDark
                              ? "bg-white/5 text-gray-500 ring-2 ring-white/10"
                              : "bg-gray-100 text-gray-400 ring-2 ring-gray-200"
                      }
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-8 mt-1 transition-all duration-500 ${
                        isCompleted
                          ? "bg-gradient-to-b from-emerald-500"
                          : isDark ? "bg-white/10" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <p
                    className={`text-sm font-semibold transition-colors duration-300 ${
                      isCompleted || isCurrent
                        ? isDark ? "text-white" : "text-gray-900"
                        : isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && !isCancelled && (
                    <span
                      className={`inline-block mt-1 text-xs font-medium ${
                        isDark ? "text-amber-400" : "text-amber-600"
                      }`}
                    >
                      Estado actual
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop: column layout */}
              <div className="hidden md:flex flex-col items-center w-full">
                {/* Timeline dot */}
                <div
                  className={`
                    relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-500
                    ${
                      isCompleted
                        ? isDark
                          ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30"
                          : "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500/20"
                        : isCurrent
                          ? isDark
                            ? "bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30 animate-pulse-soft"
                            : "bg-amber-100 text-amber-600 ring-2 ring-amber-500/20 animate-pulse-soft"
                          : isDark
                            ? "bg-white/5 text-gray-500 ring-2 ring-white/10"
                            : "bg-gray-100 text-gray-400 ring-2 ring-gray-200"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`mt-3 text-sm font-semibold text-center transition-colors duration-300 ${
                    isCompleted || isCurrent
                      ? isDark ? "text-white" : "text-gray-900"
                      : isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                {isCurrent && !isCancelled && (
                  <span
                    className={`mt-1 text-xs font-medium ${
                      isDark ? "text-amber-400" : "text-amber-600"
                    }`}
                  >
                    Estado actual
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estado cancelado/reembolsado */}
      {isCancelled && (
        <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          {currentStatus === "cancelado" ? (
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          ) : (
            <RotateCcw className="w-5 h-5 text-gray-500 shrink-0" />
          )}
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            {currentStatus === "cancelado"
              ? "Este pedido fue cancelado"
              : "Este pedido fue reembolsado"}
          </span>
        </div>
      )}

      {/* Historial adicional */}
      {historial.length > 0 && (
        <div className="mt-8">
          <h4 className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Historial de cambios
          </h4>
          <div className="space-y-2">
            {historial.map((h, idx) => (
              <div
                key={h.id || idx}
                className={`flex items-start gap-3 px-3 py-2 rounded-lg ${
                  isDark ? "bg-white/5" : "bg-gray-50"
                }`}
              >
                <Clock className={`w-4 h-4 mt-0.5 ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}>
                    {h.estado_nombre || h.estado}
                  </p>
                  {h.notas && (
                    <p className={`text-xs mt-0.5 ${
                      isDark ? "text-gray-500" : "text-gray-500"
                    }`}>
                      {h.notas}
                    </p>
                  )}
                </div>
                <span className={`text-xs shrink-0 ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`}>
                  {formatFecha(h.creado_en)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatFecha(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
