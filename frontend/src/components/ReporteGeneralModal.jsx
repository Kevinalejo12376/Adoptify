import React, { useEffect, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { descargarHistorialAdopciones } from "../api/reportesDescarga";

// Configuracion visual de cada formato, coherente con el resto del sistema
// (mismos gradientes institucionales y colores que la seccion de reportes).
const FORMATOS = {
  pdf: {
    key: "pdf",
    titulo: "Reporte PDF",
    descripcion:
      "Descarga un documento PDF con el historial completo de tus adopciones.",
    boton: "Generar PDF",
    icono: FileText,
    iconoGradiente: "from-rose-500 to-pink-500",
    botonGradiente: "bg-rose-500 hover:bg-rose-600",
  },
  excel: {
    key: "excel",
    titulo: "Reporte Excel",
    descripcion:
      "Descarga un archivo Excel con todos los registros de adopciones.",
    boton: "Generar Excel",
    icono: FileSpreadsheet,
    iconoGradiente: "from-emerald-500 to-teal-500",
    botonGradiente: "bg-emerald-500 hover:bg-emerald-600",
  },
};

/**
 * Modal reutilizable para generar el "Reporte General" del Historial de
 * Adopciones del usuario autenticado.
 *
 * Permite descargar el reporte en PDF o Excel con estados de carga
 * independientes, notificaciones de exito/error y cierre por boton X,
 * tecla ESC o clic fuera de la ventana.
 *
 * @param {object}  props
 * @param {boolean} props.isOpen    Controla si el modal esta visible.
 * @param {function} props.onClose  Callback al cerrar el modal.
 */
export default function ReporteGeneralModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Estado de carga independiente por formato ("pdf" | "excel" | null)
  const [cargando, setCargando] = useState(null);
  // Notificacion de resultado: { tipo: "ok" | "error", texto }
  const [mensaje, setMensaje] = useState(null);

  // Cerrar con la tecla ESC
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Limpiar estados internos al abrir/cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      setCargando(null);
      setMensaje(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const generar = async (formato) => {
    setCargando(formato);
    setMensaje(null);
    try {
      const { nombre } = await descargarHistorialAdopciones(formato);
      setMensaje({
        tipo: "ok",
        texto: `Archivo "${nombre}" descargado correctamente.`,
      });
    } catch (e) {
      setMensaje({
        tipo: "error",
        texto: e?.message || "No se pudo generar el reporte. Intenta de nuevo.",
      });
    } finally {
      setCargando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-modal-overlay">
      {/* Overlay con desenfoque: cierra al hacer clic fuera */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reporte-general-titulo"
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          isDark ? "bg-dark-card border border-dark-border" : "bg-white"
        } animate-modal-content`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Barra decorativa institucional */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500" />

        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3
                id="reporte-general-titulo"
                className={`text-lg font-bold font-display leading-tight ${
                  isDark ? "text-dark-text" : "text-gray-900"
                }`}
              >
                Generar Reporte General
              </h3>
              <p
                className={`text-sm ${
                  isDark ? "text-dark-text-secondary" : "text-gray-500"
                }`}
              >
                Historial de Adopciones
              </p>
            </div>
          </div>

          {/* Boton cerrar (X) */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${
              isDark
                ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/10"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-4">
          <p
            className={`text-sm leading-relaxed ${
              isDark ? "text-dark-text-secondary" : "text-gray-600"
            }`}
          >
            Seleccione el formato en el que desea descargar su historial de
            adopciones.
          </p>

          {/* Notificaciones de exito / error */}
          {mensaje && (
            <div
              className={`mt-4 flex items-start gap-2.5 p-3 rounded-xl border text-sm ${
                mensaje.tipo === "ok"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  : "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
              }`}
            >
              {mensaje.tipo === "ok" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{mensaje.texto}</span>
            </div>
          )}

          {/* Tarjetas de formato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {["pdf", "excel"].map((formato) => {
              const cfg = FORMATOS[formato];
              const Icono = cfg.icono;
              const activo = cargando === cfg.key;
              return (
                <div
                  key={cfg.key}
                  className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cfg.iconoGradiente} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
                    >
                      <Icono className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4
                        className={`font-bold leading-tight ${
                          isDark ? "text-dark-text" : "text-gray-900"
                        }`}
                      >
                        {cfg.titulo}
                      </h4>
                      <p
                        className={`text-xs mt-0.5 leading-relaxed ${
                          isDark
                            ? "text-dark-text-secondary"
                            : "text-gray-400"
                        }`}
                      >
                        {cfg.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-3">
                    <button
                      onClick={() => generar(cfg.key)}
                      disabled={!!cargando}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${cfg.botonGradiente}`}
                    >
                      {activo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icono className="w-4 h-4" />
                      )}
                      {cfg.boton}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie: boton secundario cancelar */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
              isDark
                ? "text-dark-text-secondary hover:text-dark-text bg-white/5 hover:bg-white/10 border border-dark-border"
                : "text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200"
            }`}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
