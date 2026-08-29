// Formateo de precios en formato colombiano para todo Adoptify.
//
// Reglas:
// - Punto (.) como separador de miles:  10000  -> "10.000"
// - Sin decimales si el valor es entero: 150000.00 -> "150.000"
// - Decimales solo si son necesarios:    9999.5 -> "9.999,5"
// - No modifica el valor original; solo afecta la visualización.
// - Tolera string, number, null, undefined y no genera NaN.
//
// Ejemplos de salida: "$10.000", "$25.000", "$150.000", "$1.000.000".

/**
 * Formatea un precio con símbolo monetario por defecto ($).
 * @param {string|number|null|undefined} valor
 * @param {{ simbolo?: string }} [opts]
 * @returns {string}
 */
export function formatPrice(valor, { simbolo = "$" } = {}) {
  if (valor === null || valor === undefined || valor === "") {
    return `${simbolo}0`;
  }
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return `${simbolo}0`;
  }

  // Redondea a máximo 2 decimales y separa parte entera / decimal.
  const redondeado = Math.round(numero * 100) / 100;
  const [entero, decimal = "00"] = String(redondeado).split(".");

  // Separa miles con punto, independiente del locale del navegador.
  const enteroFormateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimalFormateado = decimal === "00" ? "" : `,${decimal}`;

  return `${simbolo}${enteroFormateado}${decimalFormateado}`;
}

/**
 * Formatea un número sin símbolo (útil para cantidades, descuentos,
 * subtotales y totales donde el símbolo ya está presente en el diseño).
 * @param {string|number|null|undefined} valor
 * @returns {string}
 */
export function formatNumber(valor) {
  return formatPrice(valor, { simbolo: "" });
}

/**
 * Normaliza lo que el usuario escribe en un input de precio al formato
 * colombiano: miles con punto (.) y decimales con coma (,).
 * - "15000"    -> "15.000"
 * - "15000.5"  -> "15.000,5"
 * - "15.000"   -> "15.000" (se conserva)
 * Elimina símbolos ($), espacios y letras no numéricas.
 * @param {string|number|null|undefined} valor
 * @returns {string}
 */
export function normalizarPrecioInput(valor) {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor).replace(/[^\d.,]/g, "");
  // Conserva solo la primera coma (decimal); elimina las demás.
  const primeraComa = texto.indexOf(",");
  if (primeraComa !== -1) {
    texto = texto.slice(0, primeraComa + 1) + texto.slice(primeraComa + 1).replace(/,/g, "");
  }
  const [enteros, decimales] = texto.split(",");
  const enterosLimpio = (enteros || "").replace(/\./g, "");
  const enterosFormateados = enterosLimpio.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimales !== undefined
    ? `${enterosFormateados},${decimales}`
    : enterosFormateados;
}

/**
 * Convierte el texto de un input de precio (formato colombiano) a número.
 * - "15.000"   -> 15000
 * - "9.999,5"  -> 9999.5
 * - ""/null    -> 0
 * @param {string|number|null|undefined} valor
 * @returns {number}
 */
export function parsearPrecioInput(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  const texto = String(valor).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}
