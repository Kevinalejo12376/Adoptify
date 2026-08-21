import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  FileText, FileSpreadsheet, FileDown, Loader2, X, CheckCircle2, AlertCircle,
} from "lucide-react";

// Opciones de formato que se muestran en el menú del reporte general.
const OPCIONES = [
  {
    key: "pdf",
    label: "Reporte en PDF",
    descripcion: "Documento PDF listo para imprimir",
    Icon: FileText,
    gradiente: "from-rose-500 to-pink-500",
    bg: "bg-rose-100 dark:bg-rose-500/10",
    color: "text-rose-500",
    hover: "hover:border-rose-300 dark:hover:border-rose-500/40",
  },
  {
    key: "excel",
    label: "Reporte en Excel",
    descripcion: "Hoja de cálculo con los datos",
    Icon: FileSpreadsheet,
    gradiente: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
    color: "text-emerald-500",
    hover: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
  },
];

/**
 * Modal reutilizable "Reporte general": permite descargar el reporte en PDF o
 * Excel usando el mismo diseño en todos los roles (Usuario, Refugio, etc.).
 *
 * @param {object} props
 * @param {boolean} props.isOpen      Controla la visibilidad del modal.
 * @param {Function} props.onClose    Cierra el modal.
 * @param {Function} props.descargar  async (formato) => { nombre } que genera
 *                                    y descarga el reporte. Lanza error si no
 *                                    hay datos o si algo falla.
 * @param {string} [props.titulo]     Título del modal (por defecto "Reporte general").
 * @param {string} [props.descripcion] Texto secundario bajo el título.
 */
export default function ReporteGeneralModal({
  isOpen,
  onClose,
  descargar,
  titulo = "Reporte general",
  descripcion = "Selecciona el formato del reporte que deseas descargar.",
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [descargando, setDescargando] = useState(null); // "pdf" | "excel" | null
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  // Al abrir el modal se limpian los estados previos.
  useEffect(() => {
    if (isOpen) {
      setDescargando(null);
      setError(null);
      setExito(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const manejar = async (formato) => {
    setDescargando(formato);
    setError(null);
    setExito(null);
    try {
      const resultado = await descargar(formato);
      setExito(`Archivo "${resultado?.nombre || "reporte"}" descargado correctamente.`);
    } catch (e) {
      setError(e?.message || "No se pudo generar el reporte.");
    } finally {
      setDescargando(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-modal-overlay">
      {/* Fondo con blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Panel */}
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? "bg-dark-card border border-dark-border" : "bg-white"
        } animate-modal-content`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra decorativa con el gradiente de la marca */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500"></div>

        <div className="p-6">
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center flex-shrink-0">
                <FileDown className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className={`text-lg font-bold font-display leading-tight ${
                  isDark ? "text-dark-text" : "text-gray-900"
                }`}>
                  {titulo}
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  {descripcion}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                isDark
                  ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensaje de éxito */}
          {exito && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border text-sm mb-4 bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
              <span>{exito}</span>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border text-sm mb-4 bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Opciones de formato */}
          <div className="space-y-3">
            {OPCIONES.map((opcion) => {
              const { key, label, descripcion: desc, Icon, gradiente, bg, color, hover } = opcion;
              const cargando = descargando === key;
              return (
                <button
                  key={key}
                  onClick={() => manejar(key)}
                  disabled={!!descargando}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    isDark
                      ? `bg-white/5 border-dark-border ${hover}`
                      : `bg-white border-gray-200 ${hover}`
                  } hover:shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group`}
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradiente} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                      {label}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                      {desc}
                    </p>
                  </div>
                  {cargando ? (
                    <Loader2 className={`w-5 h-5 animate-spin flex-shrink-0 ${color}`} />
                  ) : (
                    <FileDown className={`w-5 h-5 flex-shrink-0 ${color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
