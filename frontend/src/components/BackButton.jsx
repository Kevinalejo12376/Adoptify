import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Botón "Regresar" inteligente para todo el rol Usuario.
 *
 * Vuelve EXACTAMENTE a la vista anterior desde la que el usuario ingresó
 * (conservando la ruta, filtros y estado) usando el historial del navegador.
 * Si no hay una vista previa accesible (p. ej. se entró directo por URL o se
 * recargó la página), cae en una ruta de respaldo.
 *
 * @param {string} [fallback] Ruta de respaldo cuando no hay historial previo.
 * @param {string} [label] Texto del botón (por defecto "Volver").
 * @param {string} [className] Clases adicionales para el botón.
 */
export default function BackButton({ fallback = "/", label = "Volver", className = "", ...rest }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Si hay historial navegable dentro de la app (no es una entrada directa
    // ni una recarga), volvemos a la vista anterior exacta.
    if (window.history.length > 1 && location.key !== "default") {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 transition-colors group ${className}`}
      {...rest}
    >
      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      {label}
    </button>
  );
}
