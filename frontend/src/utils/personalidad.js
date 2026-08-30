/**
 * Normaliza el campo `personalidad` de una mascota a una lista plana de rasgos
 * individuales, lista para mostrar en la UI.
 *
 * El dato puede llegar del backend en varias formas:
 *  - Lista de rasgos: ["Juguetón", "Cariñoso"]
 *  - Lista con un solo elemento que contiene comas: ["Juguetón, Cariñoso"]
 *  - Cadena separada por comas: "Juguetón, Cariñoso"
 *  - Array "letra por letra" (dato corrupto de versiones anteriores, p. ej. la
 *    personalidad guardada como caracteres individuales): ["J","u","g","u","e","t","ó","n"]
 *  - null / undefined / "" (sin rasgos)
 *
 * Devuelve SIEMPRE un array (posiblemente vacío) con cada rasgo completo,
 * recortado, sin vacíos y sin duplicados, de modo que la vista muestre TODAS
 * las personalidades seleccionadas como chips individuales y legibles.
 */
export function normalizarPersonalidad(valor) {
  if (valor === null || valor === undefined || valor === "") return [];
  const fuente = Array.isArray(valor) ? valor : [valor];
  const elementos = fuente.filter((i) => i !== null && i !== undefined);

  // Si todos los elementos son de un solo carácter, el dato quedó guardado
  // "letra por letra" (formato corrupto). Se unen en una sola cadena y luego
  // se separa por comas para reconstruir cada rasgo completo.
  if (elementos.length > 0 && elementos.every((i) => String(i).length === 1)) {
    return String(elementos.join(""))
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const rasgos = [];
  const vistos = new Set();
  for (const item of elementos) {
    for (const parte of String(item).split(",")) {
      const limpio = parte.trim();
      if (limpio && !vistos.has(limpio)) {
        vistos.add(limpio);
        rasgos.push(limpio);
      }
    }
  }
  return rasgos;
}
