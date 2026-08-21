import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// ========================================================
// ADMIN MODAL — Modal reutilizable del Panel de Administración
// --------------------------------------------------------
// Jerarquía de capas garantizada:
//   Página + Navbar + Sidebar  →  debajo (oscurecidos + desenfocados)
//   Backdrop                   →  capa intermedia (oscuro + blur)
//   Modal                      →  capa superior (nítido)
//
// Se renderiza vía portal a <body> para quedar SIEMPRE en el
// stacking context raíz, a prueba de ancestros con transform,
// filter, overflow o z-index que crearían contextos anidados.
//
// El backdrop usa z-[100] (por encima del navbar z-40 y del
// sidebar z-50) + backdrop-blur, cubriendo todo el viewport.
// ========================================================

const SIZES = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

// Hook reutilizable: bloquea el scroll del fondo mientras el
// modal está abierto (requisito: el fondo no debe desplazarse).
export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

export default function AdminModal({
  open,
  onClose,
  title,
  icon: Icono,
  size = "md",
  children,
  lockScroll = true,
}) {
  useLockBodyScroll(lockScroll && open);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop oscuro + desenfoque (capa intermedia) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-modal-overlay" />

      {/* Panel del modal (capa superior, completamente nítido) */}
      <div
        className={`relative w-full ${SIZES[size] || SIZES.md} max-h-full flex flex-col bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border animate-modal-content overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fijo */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-dark-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icono && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Icono size={18} className="text-rose-500" />
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text truncate">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors flex-shrink-0"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo con scroll interno */}
        <div className="overflow-y-auto flex-1 p-5 scrollbar-hide">{children}</div>
      </div>
    </div>,
    document.body
  );
}
