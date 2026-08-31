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
 * Normaliza un precio (número o string) interpretando correctamente el
 * separador de miles colombiano (punto) y el separador decimal (coma).
 *
 * Es la clave para que el cálculo de descuentos no pierda los miles:
 *   Number("10.000") === 10  (incorrecto)
 *   parsePrecio("10.000") === 10000  (correcto)
 *
 * Casos soportados:
 * - "10.000"    -> 10000   (punto = miles)
 * - "10,5"      -> 10.5    (coma = decimal)
 * - "10.000,50" -> 10000.5 (punto = miles, coma = decimal)
 * - "$10.000"   -> 10000   (ignora el símbolo monetario)
 * - 10000       -> 10000   (número intacto)
 * - "", null    -> 0
 *
 * @param {string|number|null|undefined} valor
 * @returns {number}
 */
export function parsePrecio(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }
  if (valor === null || valor === undefined) return 0;
  const texto = String(valor).trim();
  if (!texto) return 0;
  // Quita símbolo monetario, espacios y cualquier carácter no numérico.
  const limpio = texto.replace(/[^\d.,-]/g, "");
  if (!limpio) return 0;

  // Coma y punto juntos: el punto es separador de miles y la coma decimal.
  if (limpio.includes(",") && limpio.includes(".")) {
    const n = Number(limpio.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  // Solo coma: es el separador decimal.
  if (limpio.includes(",")) {
    const n = Number(limpio.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  // Solo punto: heurística. Si la parte tras el último punto tiene exactamente
  // 3 dígitos, el punto es separador de miles; en caso contrario, es decimal.
  if (limpio.includes(".")) {
    const partes = limpio.split(".");
    if (partes[partes.length - 1].length === 3) {
      const n = Number(limpio.replace(/\./g, ""));
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formatea un precio con símbolo monetario por defecto ($).
 * @param {string|number|null|undefined} valor
 * @param {{ simbolo?: string }} [opts]
 * @returns {string}
 */
export function formatPrice(valor, { simbolo = "$" } = {}) {
  const numero = parsePrecio(valor);

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

/**
 * Calcula el precio final tras aplicar un porcentaje de descuento (0-100).
 * Es la fuente única de verdad del cálculo del descuento en el frontend y debe
 * coincidir con la función `precio_final` del backend:
 *   precioFinal = round(precio * (100 - descuento) / 100, 2)
 *
 * - `descuento` 0/ausente => devuelve el precio original (sin descuento).
 * - Valores fuera de rango se recortan a [0, 100].
 * - No modifica el valor original; solo devuelve el precio con descuento.
 *
 * @param {string|number|null|undefined} precio
 * @param {string|number|null|undefined} descuento Porcentaje 0-100.
 * @returns {number}
 */
export function precioConDescuento(precio, descuento = 0) {
  const p = parsePrecio(precio);
  const d = Math.min(100, Math.max(0, Number(descuento) || 0));
  if (d <= 0) return p;
  // Redondea a máximo 2 decimales (igual que formatPrice).
  return Math.round((p * (100 - d)) / 100 * 100) / 100;
}

/**
 * Monto ahorrado por el descuento de un producto (precio original - final).
 * @param {string|number|null|undefined} precio
 * @param {string|number|null|undefined} descuento Porcentaje 0-100.
 * @returns {number}
 */
export function montoDescuento(precio, descuento = 0) {
  const p = parsePrecio(precio);
  return p - precioConDescuento(p, descuento);
}
