import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { ThumbsUp, Loader2 } from "lucide-react";
import { REACTION_TYPES, getReaction } from "../forumData";

/**
 * Botón "Reaccionar" con panel flotante 100% personalizado de Adoptify.
 *
 * - Hover (desktop): abre el panel. El hover se maneja sobre el CONTENEDOR
 *   (botón + panel) para que NO desaparezca al mover el mouse del botón al panel.
 * - Clic directo: registra/quita la reacción predeterminada (Me gusta).
 * - Touch/móvil: un toque abre el panel (no existe hover).
 * - Protección contra doble clic mientras se procesa.
 *
 * Diseño: cada reacción conserva su icono y color; el estado activo usa un fondo
 * MUY suave + icono/texto con color intenso + borde contrastante. Nunca se
 * colorea todo el botón ni aparece negro.
 */
export default function ReactionButton({ postId, myReaction, onReact, compact = false, className = "" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeTimer = useRef(null);

  const isTouch = useMemo(
    () =>
      (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches) ||
      "ontouchstart" in window,
    []
  );

  const active = getReaction(myReaction);
  const ActiveIcon = active?.icon || ThumbsUp;

  const openPanel = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Retraso corto para tolerar pequeños desplazamientos del mouse entre el
  // botón y el panel sin que la ventana se cierre.
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 320);
  };

  const handleReact = async (tipo) => {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    try {
      await onReact?.(postId, tipo);
    } finally {
      setBusy(false);
    }
  };

  // Cerrar al hacer clic fuera (el panel NO usa un backdrop que tape el botón).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (e.target.closest("[data-reaction-picker]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const buttonBase = `relative flex items-center justify-center gap-2 rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-95 select-none disabled:opacity-60 disabled:cursor-not-allowed ${
    compact ? "px-3 py-2" : "px-4 py-2.5"
  } ${className}`;

  // Estado normal: fondo neutro (blanco / oscuro), borde sutil, icono gris.
  const inactiveCls = isDark
    ? "bg-dark-card border-dark-border text-dark-text-secondary hover:bg-white/5 hover:text-dark-text"
    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800";

  // Estado activo: fondo MUY suave del color de la reacción + borde contrastante
  // + texto/icono con el color intenso. No colorea todo el botón.
  const activeCls = active
    ? `${active.softBg} ${active.darkSoftBg} border ${active.softBorder} ${active.darkSoftBorder} ${active.color} shadow-sm`
    : inactiveCls;

  return (
    <div
      data-reaction-picker
      className="relative inline-flex"
      onMouseEnter={openPanel}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => {
          if (isTouch) {
            openPanel();
            return;
          }
          handleReact(active ? active.id : "like");
        }}
        disabled={busy}
        title={active ? `Quitar reacción (${active.label})` : "Reaccionar"}
        className={`${buttonBase} ${active ? activeCls : inactiveCls}`}
      >
        {busy ? (
          <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`} />
        ) : active ? (
          <ActiveIcon className={`w-5 h-5 ${active.color}`} fill="none" />
        ) : (
          <ThumbsUp className={`w-5 h-5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`} />
        )}
        <span>{active ? active.label : "Reaccionar"}</span>
      </button>

      {open && (
        <div
          className={`absolute bottom-full left-0 mb-2 z-40 flex items-center gap-1 px-3 py-2 rounded-2xl shadow-xl border animate-scale-in ${
            isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
          }`}
          style={{ transformOrigin: "bottom left" }}
        >
          {REACTION_TYPES.map((r) => {
            const Icon = r.icon;
            const isActive = myReaction === r.id;
            // Hover con el color suave de la reacción (sin negro).
            const hoverCls = `hover:${r.softBg} ${r.darkSoftBg.replace("dark:", "dark:hover:")}`;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleReact(r.id)}
                disabled={busy}
                className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 hover:-translate-y-1 active:scale-95 ${
                  isActive
                    ? `${r.softBg} ${r.darkSoftBg} ring-2 ${r.ring} ${r.darkRing}`
                    : hoverCls
                }`}
              >
                <Icon className={`w-5 h-5 ${r.color}`} fill="none" />
                {/* Nombre de la reacción al pasar el mouse */}
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
