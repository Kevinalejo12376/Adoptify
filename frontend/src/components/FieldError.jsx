// Componente estándar para mostrar mensajes de error bajo los campos de un
// formulario. Mantiene el mismo diseño en toda la aplicación:
//   - Tamaño de fuente pequeño (text-xs)
//   - Color rojo institucional (text-red-500)
//   - Asterisco (*) en rojo al inicio del mensaje
//   - Desaparece automáticamente cuando el campo vuelve a ser válido
//     (recibe mensaje vacío/null y no renderiza nada)
export default function FieldError({ mensaje }) {
  if (!mensaje) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-500 leading-snug">
      <span className="font-bold text-red-500" aria-hidden="true">*</span>
      <span>{mensaje}</span>
    </p>
  );
}
