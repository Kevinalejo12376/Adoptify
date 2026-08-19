import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";

/**
 * Rasgos de personalidad preseleccionados (chips). El usuario puede seleccionar
 * varios a la vez. Los rasgos ya guardados que no estén en esta lista se agregan
 * como chips adicionales para no perder información existente.
 */
const RASGOS_PERSONALIDAD = [
  "Juguetón",
  "Cariñoso",
  "Mimoso",
  "Tranquilo",
  "Activo",
  "Sociable",
  "Amigable",
  "Protector",
  "Independiente",
  "Curioso",
  "Obediente",
  "Tímido",
  "Energético",
  "Dormilón",
];

const MAX_PERSONALIDADES = 5;

/**
 * Selector visual de rasgos de personalidad (chips) compartido entre Crear y
 * Editar Mascota. Limita la selección a un máximo de 5 rasgos.
 * @param {string[]} value Lista de rasgos seleccionados.
 * @param {(rasgos: string[]) => void} onChange Recibe la nueva lista de rasgos.
 */
export default function PersonalitySelector({ value = [], onChange }) {
  const [limiteMsg, setLimiteMsg] = useState("");
  const seleccionados = value || [];
  const extras = seleccionados.filter((t) => !RASGOS_PERSONALIDAD.includes(t));
  const opciones = [...RASGOS_PERSONALIDAD, ...extras];

  const toggle = (rasgo) => {
    const actual = seleccionados;
    if (actual.includes(rasgo)) {
      setLimiteMsg("");
      onChange(actual.filter((t) => t !== rasgo));
      return;
    }
    if (actual.length >= MAX_PERSONALIDADES) {
      setLimiteMsg("Puedes seleccionar máximo 5 rasgos de personalidad.");
      return;
    }
    setLimiteMsg("");
    onChange([...actual, rasgo]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {opciones.map((rasgo) => {
          const activo = seleccionados.includes(rasgo);
          return (
            <button
              key={rasgo}
              type="button"
              onClick={() => toggle(rasgo)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activo
                  ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200 dark:shadow-rose-500/20 scale-[1.02]"
                  : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              {activo && <Check className="w-3 h-3" />}
              {rasgo}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        {limiteMsg ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" /> {limiteMsg}
          </p>
        ) : (
          <span />
        )}
        <span className="text-[11px] font-medium text-gray-400 dark:text-dark-text-secondary">
          {seleccionados.length}/{MAX_PERSONALIDADES}
        </span>
      </div>
    </div>
  );
}
