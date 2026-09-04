import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Sparkles, ScanLine, PenLine, X, ArrowRight, Check, Zap,
} from "lucide-react";

export default function ProductSelectionModal({
  isOpen,
  onClose,
  onSeleccionarIA,
  onSeleccionarBarcode,
  onSeleccionarManual,
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAnalizarIA = () => {
    if (onSeleccionarIA) onSeleccionarIA();
    else navigate("/tienda/productos/analizar");
    onClose();
  };

  const handleBarcodeScan = () => {
    if (onSeleccionarBarcode) onSeleccionarBarcode();
    else navigate("/tienda/productos/escanear");
    onClose();
  };

  const handleManualAdd = () => {
    if (onSeleccionarManual) onSeleccionarManual();
    else navigate("/tienda/productos/editar/nuevo");
    onClose();
  };

  const opciones = [
    {
      key: "ia",
      titulo: "Analizar producto con IA",
      descripcion:
        "La inteligencia artificial captura las imágenes del producto y completa el formulario automáticamente.",
      beneficios: [
        "4 imágenes automáticas",
        "Nombre y categoría",
        "Ingredientes y advertencias",
        "Solo confirma",
      ],
      Icon: Sparkles,
      gradiente: "from-rose-500 to-amber-500",
      sombra: "shadow-rose-500/25",
      hover: "hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-rose-500/10",
      ctaColor: "text-rose-600 dark:text-rose-400",
      recomendada: true,
      cta: "Comenzar análisis",
      onClick: handleAnalizarIA,
    },
    {
      key: "barcode",
      titulo: "Escanear código de barras",
      descripcion:
        "Escanea o escribe el código de barras del producto y obtén su información automáticamente.",
      beneficios: ["Escaneo con cámara", "Autocompleta el formulario"],
      Icon: ScanLine,
      gradiente: "from-violet-500 to-blue-500",
      sombra: "shadow-violet-500/25",
      hover: "hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-violet-500/10",
      ctaColor: "text-violet-600 dark:text-violet-400",
      recomendada: false,
      cta: "Escanear ahora",
      onClick: handleBarcodeScan,
    },
    {
      key: "manual",
      titulo: "Agregar manualmente",
      descripcion:
        "Completa tú mismo todos los datos del producto en el formulario de creación.",
      beneficios: ["Control total de los datos"],
      Icon: PenLine,
      gradiente: "from-emerald-500 to-teal-500",
      sombra: "shadow-emerald-500/25",
      hover: "hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-emerald-500/10",
      ctaColor: "text-emerald-600 dark:text-emerald-400",
      recomendada: false,
      cta: "Ir al formulario",
      onClick: handleManualAdd,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor centrado con scroll vertical en pantallas pequeñas */}
      <div className="relative flex min-h-full items-start justify-center p-3 sm:items-center sm:p-6">
        {/* Modal */}
        <div className="relative my-auto flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card shadow-2xl border border-gray-100 dark:border-dark-border animate-scale-in">
          {/* Header */}
          <div className="relative flex-shrink-0 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-rose-50/70 via-orange-50/40 to-amber-50/70 dark:from-rose-500/5 dark:via-transparent dark:to-amber-500/5 p-4 sm:p-6">
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 p-2 rounded-xl bg-white dark:bg-dark-card text-gray-400 hover:text-gray-600 dark:hover:text-dark-text shadow-sm border border-gray-100 dark:border-dark-border transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 sm:gap-4 pr-10 sm:pr-12">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 shadow-lg shadow-rose-500/25">
                <Plus size={20} className="text-white sm:h-[22px] sm:w-[22px]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-xl font-bold text-gray-900 dark:text-dark-text">
                  Agregar nuevo producto
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary">
                  Elige cómo quieres registrar tu producto en la tienda.
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {opciones.map((opcion) => {
              const {
                Icon, gradiente, sombra, hover, ctaColor, recomendada,
                beneficios, cta, onClick, titulo, descripcion,
              } = opcion;

              return (
                <button
                  key={opcion.key}
                  onClick={onClick}
                  className={`relative w-full overflow-hidden rounded-2xl border-2 bg-white p-3.5 text-left transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-lg dark:bg-dark-card sm:p-5 ${hover} ${
                    recomendada
                      ? "border-rose-200 bg-gradient-to-br from-rose-50/70 to-amber-50/50 dark:border-rose-500/30 dark:from-rose-500/10 dark:to-amber-500/5"
                      : "border-gray-200 dark:border-dark-border"
                  }`}
                >
                  {/* Badge recomendada */}
                  {recomendada && (
                    <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-2 py-1 text-[9px] font-bold text-white shadow-sm sm:px-2.5 sm:text-[10px]">
                        <Zap size={10} />
                        RECOMENDADO
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 pr-8 sm:gap-4 sm:pr-12">
                    {/* Ícono */}
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-200 group-hover:rotate-3 group-hover:scale-105 sm:h-14 sm:w-14 ${gradiente} ${sombra}`}>
                      <Icon size={24} className="text-white sm:h-[26px] sm:w-[26px]" />
                    </div>

                    {/* Contenido */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-dark-text">
                        {titulo}
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">
                        {descripcion}
                      </p>

                      {/* Beneficios */}
                      {beneficios.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {beneficios.map((beneficio, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500 dark:bg-dark-bg dark:text-dark-text-secondary"
                            >
                              <Check size={10} className="text-emerald-500" />
                              {beneficio}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* CTA */}
                      <div className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold transition-all group-hover:gap-2 ${ctaColor}`}>
                        {cta}
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
