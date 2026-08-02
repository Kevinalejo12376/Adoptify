import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ mensaje = "No hay datos disponibles", icono: Icono, submensaje, accion, textoAccion }) {
  const Icon = Icono || Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-dark-border flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary text-center">
        {mensaje}
      </p>
      {submensaje && (
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-1 max-w-xs">
          {submensaje}
        </p>
      )}
      {accion && (
        <button
          onClick={accion}
          className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-200 shadow-sm"
        >
          {textoAccion || "Acción"}
        </button>
      )}
    </div>
  );
}
