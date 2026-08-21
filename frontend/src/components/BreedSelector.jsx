import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Selector de razas obtenidas de la base de datos (compartido entre Crear y
 * Editar Mascota):
 * - Modo normal (botón selector): muestra inicialmente 10 razas y permite ver
 *   todas con scroll (NO es un buscador). Al elegir una raza, el desplegable
 *   se cierra.
 * - Opción "Otro": convierte el mismo campo en un input editable donde se
 *   escribe la raza personalizada; el valor se conserva y se guarda con la mascota.
 */
export default function BreedSelector({ razas, value, isCustom, error, onSelect, onOtro, onTyped }) {
  const [open, setOpen] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Al entrar en modo "Otro", el cursor va al input para escribir de inmediato.
  useEffect(() => {
    if (isCustom) inputRef.current?.focus();
  }, [isCustom]);

  const todas = razas || [];
  const visibles = verTodas ? todas : todas.slice(0, 10);
  const baseCls = "w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-bg transition-all";
  const errorCls = error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "focus:ring-2 focus:ring-rose-500 focus:border-rose-500";

  // Modo "Otro": el mismo campo se convierte en input editable para la raza propia.
  if (isCustom) {
    return (
      <div ref={wrapRef} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value || ""}
            placeholder="Escriba la raza..."
            onChange={(e) => onTyped(e.target.value)}
            className={`${baseCls} text-gray-900 dark:text-white pr-8 ${errorCls}`}
          />
          <button
            type="button"
            title="Elegir una raza de la lista"
            onClick={() => { onSelect(""); setOpen(true); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 p-0.5">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setVerTodas(false); }}
        className={`${baseCls} text-left flex items-center justify-between gap-2 ${value ? "text-gray-900 dark:text-white" : "text-gray-400"} ${errorCls}`}>
        <span className="truncate">{value || "Selecciona una raza"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-xl overflow-hidden animate-slide-down">
          <div className="max-h-56 overflow-y-auto">
            {visibles.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No hay razas disponibles.</p>
            ) : (
              visibles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onSelect(r.nombre); setOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  {r.nombre}
                </button>
              ))
            )}
          </div>
          {!verTodas && todas.length > 10 && (
            <button
              type="button"
              onClick={() => setVerTodas(true)}
              className="w-full px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-dark-border hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              Ver más razas ({todas.length - 10} más)
            </button>
          )}
          <button
            type="button"
            onClick={() => { onOtro(); setOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-rose-600 dark:text-rose-400 border-t border-gray-100 dark:border-dark-border hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
            Otro
          </button>
        </div>
      )}
    </div>
  );
}
