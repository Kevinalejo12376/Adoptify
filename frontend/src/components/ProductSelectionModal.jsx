import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Barcode, Edit3, X, ArrowRight } from "lucide-react";

const BENEFICIOS_IA = [
  "Captura automática de 4 imágenes",
  "Detección de nombre, marca y categoría",
  "Identificación de ingredientes y advertencias",
  "Sin trabajo manual, solo confirma",
];

export default function ProductSelectionModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAnalizarIA = () => {
    navigate("/tienda/productos/analizar");
    onClose();
  };

  const handleBarcodeScan = () => {
    navigate("/tienda/productos/escanear");
    onClose();
  };

  const handleManualAdd = () => {
    navigate("/tienda/productos/editar/nuevo");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-100 dark:border-dark-border">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
          >
            <X size={18} />
          </button>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text font-display">
              ¿Cómo deseas agregar tu producto?
            </h2>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
              Selecciona el método que prefieras para registrar un nuevo producto en tu tienda.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Opción 1: Analizar con IA (Recomendada) */}
          <button
            onClick={handleAnalizarIA}
            className="w-full text-left group relative overflow-hidden bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 border-2 border-rose-200 dark:border-rose-500/20 rounded-2xl p-5 hover:shadow-lg hover:shadow-rose-500/10 transition-all"
          >
            {/* Badge recomendada */}
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold rounded-full">
                <Sparkles size={10} />
                RECOMENDADO
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/20">
                <Sparkles size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">
                  Analizar producto con IA
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  La inteligencia artificial capturará automáticamente las imágenes del producto,
                  analizará su contenido y completará la mayor parte de la información del formulario.
                </p>
                <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {BENEFICIOS_IA.map((beneficio, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-text-secondary">
                      <span className="w-1 h-1 rounded-full bg-rose-500 flex-shrink-0" />
                      {beneficio}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400 group-hover:gap-2 transition-all">
                  Comenzar análisis
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </button>

          {/* Opción 2: Escanear código de barras */}
          <button
            onClick={handleBarcodeScan}
            className="w-full text-left group relative overflow-hidden bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-5 hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Barcode size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">
                  Escanear código de barras
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  Escanea o escribe el código de barras del producto para obtener su información
                  automáticamente desde bases de datos mundiales.
                </p>
                <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-text-secondary">
                    <span className="w-1 h-1 rounded-full bg-rose-500 flex-shrink-0" />
                    Escanea con la cámara
                  </li>
                  <li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-text-secondary">
                    <span className="w-1 h-1 rounded-full bg-rose-500 flex-shrink-0" />
                    Escribe el código manualmente
                  </li>
                  <li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-text-secondary">
                    <span className="w-1 h-1 rounded-full bg-rose-500 flex-shrink-0" />
                    Compatible con lectores USB
                  </li>
                  <li className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-text-secondary">
                    <span className="w-1 h-1 rounded-full bg-rose-500 flex-shrink-0" />
                    Autocompleta el formulario
                  </li>
                </ul>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400 group-hover:gap-2 transition-all">
                  Escanear ahora
                  <Barcode size={14} />
                </div>
              </div>
            </div>
          </button>

          {/* Opción 3: Agregar manualmente */}
          <button
            onClick={handleManualAdd}
            className="w-full text-left group bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-5 hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Edit3 size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">
                  Agregar manualmente
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  Completa tú mismo todos los datos del producto en el formulario de creación.
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400 group-hover:gap-2 transition-all">
                  Ir al formulario
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
