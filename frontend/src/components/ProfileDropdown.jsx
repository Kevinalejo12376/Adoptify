import { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";

/**
 * Menú del perfil reutilizable (rol Tienda y rol Administrador).
 *
 * - Se abre/cierra SOLO al hacer clic en el trigger (sin hover).
 * - Al hacer clic fuera del menú se cierra automáticamente.
 * - El estado activo de cada opción se deriva de la ruta actual (React Router),
 *   por lo que persiste aunque se cierre y vuelva a abrir el menú.
 * - Hover (temporal, sutil) y Active (permanente, llamativo) se diferencian
 *   visualmente con claridad.
 * - Debajo del nombre se muestra una insignia tipo píldora con el rol.
 */
export default function ProfileDropdown({
  open,
  onToggle,
  onClose,
  trigger,
  avatar,
  name,
  subtitle,
  badgeIcon: BadgeIcon = ShieldCheck,
  onLogout,
  options = [],
  onOptionClick,
  width = "w-72",
}) {
  const location = useLocation();
  const ref = useRef(null);

  // Cierra al hacer clic fuera del menú.
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  // Estado activo: se determina con la ruta actual, no con estado temporal.
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const baseCls =
    "relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200";
  const hoverCls =
    "text-gray-600 dark:text-dark-text-secondary hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400";
  const activeCls =
    "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20";

  return (
    <div className="relative" ref={ref}>
      {/* Trigger: abre/cierra SOLO al hacer clic (sin hover) */}
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all duration-200 cursor-pointer"
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 top-full mt-2 ${width} bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border animate-scale-in overflow-hidden`}
        >
          {/* Encabezado: avatar + nombre + insignia de rol */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center overflow-hidden text-base font-bold text-rose-600 dark:text-rose-400 ring-2 ring-white dark:ring-dark-card shadow-md flex-shrink-0">
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-dark-text truncate">{name}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold whitespace-nowrap">
                <BadgeIcon size={12} strokeWidth={2.5} />
                {subtitle}
              </span>
            </div>
          </div>

          {/* Opciones con hover (sutil) y activo (permanente, según la ruta) */}
          <div className="p-1.5 max-h-[55vh] overflow-y-auto scrollbar-hide space-y-0.5">
            {options.map((op) => {
              const active = isActive(op.path);
              return (
                <button
                  key={op.label}
                  type="button"
                  onClick={() => onOptionClick?.(op)}
                  className={`${baseCls} group ${active ? activeCls : hoverCls}`}
                >
                  <op.icon
                    size={16}
                    strokeWidth={active ? 2.5 : 1.5}
                    className={`flex-shrink-0 transition-colors ${
                      active ? "text-white" : "group-hover:text-orange-600 dark:group-hover:text-orange-400"
                    }`}
                  />
                  <span className={`flex-1 text-left transition-colors ${active ? "text-white" : ""}`}>
                    {op.label}
                  </span>
                  {active && (
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-white/70" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Cerrar sesión */}
          <div className="border-t border-gray-100 dark:border-dark-border px-2 pb-2 pt-1.5">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
