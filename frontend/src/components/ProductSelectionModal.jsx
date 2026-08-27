import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Sparkles, ScanLine, PenLine, X, ArrowRight, Check, Zap,
} from "lucide-react";

export default function ProductSelectionModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

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
      onClick: () => navigate("/tienda/productos/analizar"),
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
      onClick: () => navigate("/tienda/productos/escanear"),
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
      onClick: () => navigate("/tienda/productos/editar/nuevo"),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Contenedor centrado con scroll vertical en pantallas pequeñas */}
      <div className="relative flex min-h-full items-center justify-center p-3 sm:p-6">
        {/* Modal */}
        <div className="relative w-full max-w-xl my-auto bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="relative p-5 sm:p-6 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-rose-50/70 via-orange-50/40 to-amber-50/70 dark:from-rose-500/5 dark:via-transparent dark:to-amber-500/5">
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 sm:right-4 sm:top-4 p-2 rounded-xl bg-white dark:bg-dark-card text-gray-400 hover:text-gray-600 dark:hover:text-dark-text shadow-sm border border-gray-100 dark:border-dark-border transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 sm:gap-4 pr-10">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/25">
                <Plus size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-dark-text font-display">
                  Agregar nuevo producto
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">
                  Elige cómo quieres registrar tu producto en la tienda.
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-3">
            {opciones.map((opcion) => {
              const {
                Icon, gradiente, sombra, hover, ctaColor, recomendada,
                beneficios, cta, onClick, titulo, descripcion,
              } = opcion;

              return (
                <button
                  key={opcion.key}
                  onClick={() => { onClick(); onClose(); }}
                  className={`w-full text-left group relative overflow-hidden bg-white dark:bg-dark-card border-2 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${hover} ${
                    recomendada
                      ? "border-rose-200 dark:border-rose-500/30 bg-gradient-to-br from-rose-50/70 to-amber-50/50 dark:from-rose-500/10 dark:to-amber-500/5"
                      : "border-gray-200 dark:border-dark-border"
                  }`}
                >
                  {/* Badge recomendada */}
                  {recomendada && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                        <Zap size={10} />
                        RECOMENDADO
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 sm:gap-4 pr-12">
                    {/* Ícono */}
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${gradiente} flex items-center justify-center flex-shrink-0 shadow-lg ${sombra} group-hover:scale-105 group-hover:rotate-3 transition-transform duration-200`}>
                      <Icon size={26} className="text-white" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">
                        {titulo}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-0.5">
                        {descripcion}
                      </p>

                      {/* Beneficios */}
                      {beneficios.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {beneficios.map((beneficio, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-dark-bg text-[10px] font-medium text-gray-500 dark:text-dark-text-secondary"
                            >
                              <Check size={10} className="text-emerald-500" />
                              {beneficio}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* CTA */}
                      <div className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all ${ctaColor}`}>
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
