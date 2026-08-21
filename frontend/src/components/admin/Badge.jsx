import React from "react";

// ========================================================
// SISTEMA CENTRALIZADO DE BADGES DE ESTADO
// --------------------------------------------------------
// Cada estado mapea a un "tono" semántico. Los tonos usan
// clases Tailwind que funcionan en modo claro y oscuro
// (los overrides `.dark` de index.css refuerzan el dark).
//   positive → éxito / disponible / activo
//   warning  → pendiente / en revisión / reservado
//   danger   → inactivo / rechazado / eliminado / agotado
//   info     → en proceso / enviado / informativo
//   violet/purple → especiales (roles, respondido)
//   neutral  → oculto / cerrado / descartado
// ========================================================

const TONES = {
  positive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/25",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/25",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/25",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200 dark:border-violet-500/25",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/25",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/25",
  neutral: "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/25",
};

const DOTS = {
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  rose: "bg-rose-500",
  neutral: "bg-gray-400",
};

// Mapa estado → [tono, etiqueta]
const ESTADOS = {
  // ── Positivos ────────────────────────────────────────
  activo: ["positive", "Activo"],
  activa: ["positive", "Activa"],
  disponible: ["positive", "Disponible"],
  adoptado: ["positive", "Adoptado"],
  adoptada: ["positive", "Adoptada"],
  verificado: ["positive", "Verificado"],
  verificada: ["positive", "Verificada"],
  aprobado: ["positive", "Aprobado"],
  aprobada: ["positive", "Aprobada"],
  visible: ["positive", "Visible"],
  publicado: ["positive", "Publicado"],
  publicada: ["positive", "Publicada"],
  entregado: ["positive", "Entregado"],
  entregada: ["positive", "Entregada"],
  exitoso: ["positive", "Exitoso"],
  exitosa: ["positive", "Exitosa"],
  resuelto: ["positive", "Resuelto"],
  resuelta: ["positive", "Resuelta"],
  revisado: ["positive", "Revisado"],
  revisada: ["positive", "Revisada"],
  completo: ["positive", "Completo"],
  completada: ["positive", "Completada"],
  en_linea: ["positive", "En línea"],
  pagado: ["positive", "Pagado"],
  pagada: ["positive", "Pagada"],

  // ── Advertencia ──────────────────────────────────────
  pendiente: ["warning", "Pendiente"],
  en_revision: ["warning", "En revisión"],
  por_verificar: ["warning", "Por verificar"],
  reservado: ["warning", "Reservado"],
  reservada: ["warning", "Reservada"],
  bajo_stock: ["warning", "Bajo stock"],
  destacado: ["warning", "Destacado"],
  media: ["warning", "Media"],
  devuelto: ["warning", "Devuelto"],
  devuelta: ["warning", "Devuelta"],
  programado: ["warning", "Programado"],
  pausado: ["warning", "Pausado"],
  pausada: ["warning", "Pausada"],

  // ── Negativos ────────────────────────────────────────
  suspendido: ["danger", "Suspendido"],
  suspendida: ["danger", "Suspendida"],
  rechazado: ["danger", "Rechazado"],
  rechazada: ["danger", "Rechazada"],
  inactivo: ["danger", "Inactivo"],
  inactiva: ["danger", "Inactiva"],
  cancelado: ["danger", "Cancelado"],
  cancelada: ["danger", "Cancelada"],
  eliminado: ["danger", "Eliminado"],
  eliminada: ["danger", "Eliminada"],
  bloqueado: ["danger", "Bloqueado"],
  bloqueada: ["danger", "Bloqueada"],
  agotado: ["danger", "Agotado"],
  agotada: ["danger", "Agotada"],
  sin_stock: ["danger", "Sin stock"],
  no_disponible: ["danger", "No disponible"],
  deshabilitado: ["danger", "Deshabilitado"],
  deshabilitada: ["danger", "Deshabilitada"],
  fallido: ["danger", "Fallido"],
  fallida: ["danger", "Fallida"],
  baja: ["danger", "Baja"],
  alta: ["danger", "Alta"],

  // ── Información ──────────────────────────────────────
  en_proceso: ["info", "En proceso"],
  enviado: ["info", "Enviado"],
  enviada: ["info", "Enviada"],
  procesando: ["info", "Procesando"],
  informacion_solicitada: ["info", "Info. solicitada"],
  en_transito: ["info", "En tránsito"],
  finalizado: ["info", "Finalizado"],
  finalizada: ["info", "Finalizada"],

  // ── Roles / especiales ───────────────────────────────
  administrador: ["info", "Admin"],
  administrador_principal: ["purple", "Principal"],
  super_admin: ["purple", "Super Admin"],
  refugio: ["positive", "Refugio"],
  tienda: ["violet", "Tienda"],
  usuario: ["info", "Usuario"],
  respondido: ["violet", "Respondido"],
  respondida: ["violet", "Respondida"],

  // ── Neutros ──────────────────────────────────────────
  oculto: ["neutral", "Oculto"],
  oculta: ["neutral", "Oculta"],
  cerrado: ["neutral", "Cerrado"],
  cerrada: ["neutral", "Cerrada"],
  descartado: ["neutral", "Descartado"],
  descartada: ["neutral", "Descartada"],
};

const FALLBACK = ["neutral", null];

export default function Badge({ estado, className = "", customLabel, variant, dot = true }) {
  const key = variant || estado;
  const entry = ESTADOS[key] || FALLBACK;
  const tone = entry[0];
  const label = customLabel || entry[1] || estado;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
        border ${TONES[tone]} ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOTS[tone]}`} />}
      {label}
    </span>
  );
}
