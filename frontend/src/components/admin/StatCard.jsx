import React from "react";

const iconColors = {
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  teal: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
};

export default function StatCard({ titulo, valor, icono: Icono, color = "rose", incremento, onClick }) {
  const isPositive = incremento > 0;
  const isNegative = incremento < 0;

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl bg-white dark:bg-dark-card
        border border-gray-100 dark:border-dark-border p-5
        transition-all duration-300
        ${onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-1" : ""}
        shadow-sm
      `}
    >
      {/* Icono */}
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconColors[color] || iconColors.rose}`}>
          {Icono && <Icono size={20} strokeWidth={1.5} />}
        </div>
        {incremento !== undefined && incremento !== null && (
          <span
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
              ${isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : ""}
              ${isNegative ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : ""}
              ${!isPositive && !isNegative ? "bg-gray-50 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400" : ""}
            `}
          >
            {isPositive && "↑"}
            {isNegative && "↓"}
            {isPositive ? "+" : ""}{incremento}%
          </span>
        )}
      </div>

      {/* Información */}
      <div>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary font-medium mb-0.5">
          {titulo}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
          {typeof valor === "number" ? valor.toLocaleString("es-CO") : valor}
        </p>
      </div>

      {/* Decoración */}
      <div
        className={`
          absolute -bottom-3 -right-3 w-16 h-16 rounded-full opacity-5
          ${color === "rose" ? "bg-rose-500" : ""}
          ${color === "amber" ? "bg-amber-500" : ""}
          ${color === "emerald" ? "bg-emerald-500" : ""}
          ${color === "blue" ? "bg-blue-500" : ""}
          ${color === "violet" ? "bg-violet-500" : ""}
          ${color === "orange" ? "bg-orange-500" : ""}
          ${color === "cyan" ? "bg-cyan-500" : ""}
          ${color === "teal" ? "bg-teal-500" : ""}
        `}
      />
    </div>
  );
}
