import { useState } from "react";
import {
  X, Trash2, RotateCcw, Clock, Info, Loader2, Search, ArchiveRestore,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";

// Días que un elemento permanece en la papelera antes de purgarse.
const DIAS_PAPELERA = 30;

function calcDiasRestantes(eliminadoEn) {
  if (!eliminadoEn) return DIAS_PAPELERA;
  const fecha = new Date(eliminadoEn);
  if (Number.isNaN(fecha.getTime())) return DIAS_PAPELERA;
  const transcurridos = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 86400000));
  return Math.max(0, DIAS_PAPELERA - transcurridos);
}

function formatFecha(eliminadoEn) {
  if (!eliminadoEn) return "";
  const fecha = new Date(eliminadoEn);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Modal de BORRADORES / PAPELERA reutilizable (mascotas y productos).
 *
 * Cada elemento de la papelera se muestra con sus días restantes y dos
 * acciones: Restaurar (lo vuelve al panel principal) y Eliminar
 * definitivamente (archivado permanente, no restaurable).
 *
 * Props:
 *  - isOpen / onClose
 *  - items: [{ id, nombre, subtitulo, imagen, eliminado_en }]
 *  - onRestaurar(item) -> Promise (el padre refresca los items)
 *  - onEliminar(item)  -> Promise (el padre refresca los items)
 *  - canRestaurar / canEliminar: permisos del rol para mostrar cada acción
 */
export default function BorradoresModal({
  isOpen = false,
  onClose,
  titulo = "Borradores",
  descripcion = "Los elementos eliminados se conservan aquí durante 30 días. Puedes restaurarlos antes de que se eliminen definitivamente.",
  items = [],
  loading = false,
  error = "",
  vacioTitulo = "No hay borradores",
  vacioMensaje = "Cuando elimines una mascota o producto, aparecerá aquí por 30 días.",
  onRestaurar,
  onEliminar,
  canRestaurar = true,
  canEliminar = true,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [confirmar, setConfirmar] = useState(null); // item a eliminar definitivamente
  const [accionId, setAccionId] = useState(null);   // id con operación en curso

  if (!isOpen) return null;

  const visibles = (items || []).filter((it) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (it.nombre || "").toLowerCase().includes(q) ||
      (it.subtitulo || "").toLowerCase().includes(q);
  });

  const ejecutar = async (fn, item) => {
    if (!fn || accionId) return;
    setAccionId(item.id);
    try {
      await fn(item);
    } catch {
      // el error se muestra con el toast/toast del padre
    } finally {
      setAccionId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-modal-content"
        onClick={(e) => e.stopPropagation()}>

        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 flex items-center justify-center flex-shrink-0">
              <ArchiveRestore className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">{titulo}</h2>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5 max-w-md">{descripcion}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Aviso de 30 días */}
        <div className="mx-6 mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            Los elementos se eliminan definitivamente de forma automática a los <b>{DIAS_PAPELERA} días</b>. Si
            cambias de opinión, restáuralos antes de que expire el plazo.
          </p>
        </div>

        {/* Búsqueda */}
        <div className="px-6 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en borradores..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm border border-red-100 dark:border-red-500/20">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-500 dark:text-dark-text-secondary">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
              <p className="text-sm">Cargando borradores...</p>
            </div>
          ) : visibles.length === 0 ? (
            <div className="text-center py-14 animate-fade-in-up">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-dark-border flex items-center justify-center">
                <ArchiveRestore className="w-8 h-8 text-gray-400 dark:text-dark-text-secondary" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{vacioTitulo}</h3>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary max-w-xs mx-auto">{vacioMensaje}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visibles.map((it) => {
                const ocupado = accionId === it.id;
                const restantes = calcDiasRestantes(it.eliminado_en);
                return (
                  <li key={it.id}
                    className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-bg/40 hover:border-amber-200 dark:hover:border-amber-500/30 transition-colors">
                    {it.imagen ? (
                      <img src={it.imagen} alt={it.nombre}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-amber-600 dark:text-amber-400 uppercase">
                          {(it.nombre || "?").slice(0, 1)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{it.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">{it.subtitulo}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg">
                        <Clock className="w-3 h-3" />
                        Eliminado el {formatFecha(it.eliminado_en) || "—"} · se purga en {restantes} día{restantes === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canRestaurar && (
                        <button
                          onClick={() => ejecutar(onRestaurar, it)}
                          disabled={!!accionId}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Restaurar al panel principal">
                          {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          Restaurar
                        </button>
                      )}
                      {canEliminar && (
                        <button
                          onClick={() => setConfirmar(it)}
                          disabled={!!accionId}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Eliminar definitivamente">
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Confirmación de borrado definitivo */}
      <ConfirmModal
        isOpen={!!confirmar}
        onClose={() => setConfirmar(null)}
        onConfirm={() => {
          const item = confirmar;
          setConfirmar(null);
          return ejecutar(onEliminar, item);
        }}
        type="danger"
        title="¿Eliminar definitivamente?"
        message={`"${confirmar?.nombre || "Este elemento"}" se eliminará de forma permanente. Esta acción no se puede deshacer.`}
        confirmText="Eliminar definitivamente"
        cancelText="Cancelar"
      />
    </div>
  );
}
