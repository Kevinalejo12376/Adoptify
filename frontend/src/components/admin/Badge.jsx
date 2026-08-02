import React from "react";

const variants = {
  activo: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  pendiente: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  suspendido: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20",
  inactivo: "bg-gray-50 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/20",
  rechazado: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
  visible: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  oculto: "bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/20",
  en_proceso: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  respondida: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
  cerrada: "bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/20",
  entregado: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  cancelado: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20",
  en_revision: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  resuelto: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  descartado: "bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/20",
  baja: "bg-gray-50 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/20",
  media: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  alta: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20",
  destacado: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  administrador_principal: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
  administrador: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  exitoso: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
};

const labels = {
  activo: "Activo",
  pendiente: "Pendiente",
  suspendido: "Suspendido",
  inactivo: "Inactivo",
  rechazado: "Rechazado",
  visible: "Visible",
  oculto: "Oculto",
  en_proceso: "En proceso",
  respondida: "Respondida",
  cerrada: "Cerrada",
  entregado: "Entregado",
  cancelado: "Cancelado",
  en_revision: "En revisión",
  resuelto: "Resuelto",
  descartado: "Descartado",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  destacado: "Destacado",
  administrador_principal: "Principal",
  administrador: "Admin",
  exitoso: "Exitoso",
};

export default function Badge({ estado, className = "", customLabel, variant }) {
  const key = variant || estado;
  const colorClass = variants[key] || "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/20";
  const label = customLabel || labels[key] || estado;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        border ${colorClass} ${className}
      `}
    >
      {label}
    </span>
  );
}
