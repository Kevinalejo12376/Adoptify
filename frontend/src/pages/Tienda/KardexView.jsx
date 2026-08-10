import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, PackageSearch, CalendarDays, FileSpreadsheet,
  FileText, Loader2, PackageOpen, ArrowDownToLine, ArrowUpFromLine,
  Scale, Boxes, RotateCcw, AlertCircle, Tag, Coins,
} from "lucide-react";
import { misProductosTienda, obtenerKardexProducto } from "../../api/tienda";

// ============================================================
// Configuración visual de cada tipo de movimiento
// ============================================================
const TIPO_CONFIG = {
  ENTRADA: {
    label: "Entrada",
    badge: "bg-emerald-50 text-emerald-600 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    bar: "bg-emerald-500",
    icon: ArrowDownToLine,
  },
  SALIDA: {
    label: "Salida",
    badge: "bg-red-50 text-red-600 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    bar: "bg-red-500",
    icon: ArrowUpFromLine,
  },
  AJUSTE_POSITIVO: {
    label: "Ajuste Positivo",
    badge: "bg-sky-50 text-sky-600 ring-sky-600/10 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
    bar: "bg-sky-500",
    icon: Scale,
  },
  AJUSTE_NEGATIVO: {
    label: "Ajuste Negativo",
    badge: "bg-gray-100 text-gray-600 ring-gray-500/10 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-400/20",
    bar: "bg-gray-500",
    icon: Scale,
  },
};

const TIPOS_INGRESO = new Set(["ENTRADA", "AJUSTE_POSITIVO"]);
const TIPOS_EGRESO = new Set(["SALIDA", "AJUSTE_NEGATIVO"]);

// ============================================================
// Utilidades de formato
// ============================================================
const formatearMoneda = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

const formatearFecha = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString("es-CO", {
      day: "2-digit", month: "short", year: "numeric",
    });
    const hora = d.toLocaleTimeString("es-CO", {
      hour: "2-digit", minute: "2-digit",
    });
    return { fecha, hora };
  } catch {
    return { fecha: iso, hora: "" };
  }
};

// ============================================================
// Sub-componentes
// ============================================================
function TipoBadge({ tipo }) {
  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.AJUSTE_NEGATIVO;
  const Icono = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${config.badge}`}>
      <Icono size={13} />
      {config.label}
    </span>
  );
}

function KpiCard({ titulo, valor, sub, icono: Icono, gradiente, iconoBg }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-text-secondary truncate">
            {titulo}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-dark-text font-display truncate">
            {valor}
          </p>
          {sub && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-text-secondary truncate">
              {sub}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradiente} flex items-center justify-center flex-shrink-0 ${iconoBg}`}>
          <Icono size={19} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function FiltroFecha({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary flex items-center gap-1.5">
        <CalendarDays size={13} className="text-gray-400" />
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-700 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
      />
    </label>
  );
}

// ============================================================
// Vista principal: Kardex de inventario
// ============================================================
export default function KardexView() {
  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);       // carga inicial de productos
  const [kardexLoading, setKardexLoading] = useState(false);
  const [error, setError] = useState("");

  // Carga los productos de la tienda y selecciona el primero por defecto.
  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      try {
        const prods = await misProductosTienda();
        if (!activo) return;
        setProductos(prods || []);
        if (prods && prods.length > 0) {
          setProductoId(String(prods[0].id));
        }
      } catch (e) {
        if (activo) setError(e.message || "No se pudieron cargar los productos.");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Carga el kardex cuando cambia el producto o los filtros.
  const cargarKardex = useCallback(async () => {
    if (!productoId) {
      setData(null);
      setKardexLoading(false);
      return;
    }
    setKardexLoading(true);
    setError("");
    try {
      const resp = await obtenerKardexProducto(productoId, {
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        tipo_movimiento: tipoMovimiento || undefined,
      });
      setData(resp);
    } catch (e) {
      setError(e.message || "No se pudo cargar el Kardex del producto.");
      setData(null);
    } finally {
      setKardexLoading(false);
    }
  }, [productoId, fechaInicio, fechaFin, tipoMovimiento]);

  // Debounce ligero: evita consultas repetidas al cambiar producto/filtros.
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarKardex();
    }, 250);
    return () => clearTimeout(timer);
  }, [cargarKardex]);

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setTipoMovimiento("");
  };

  // Exportaciones (simuladas: implementar con librería jspdf/xlsx si se requiere).
  const exportarPDF = () => {
    // TODO: generar PDF real del Kardex con jspdf.
    console.log("Exportar Kardex a PDF", { productoId, filtros: { fechaInicio, fechaFin, tipoMovimiento } });
  };
  const exportarExcel = () => {
    // TODO: generar Excel real del Kardex con xlsx.
    console.log("Exportar Kardex a Excel", { productoId, filtros: { fechaInicio, fechaFin, tipoMovimiento } });
  };

  const resumen = data?.resumen || null;
  const movimientos = data?.movimientos || [];
  const productoSeleccionado = productos.find((p) => String(p.id) === String(productoId));

  return (
    <div className="space-y-6">
      {/* ============ Header ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display flex items-center gap-2">
            <ClipboardList size={24} className="text-rose-500" />
            Kardex de Inventario
          </h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            Historial de entradas, salidas y saldos de tus productos (costo promedio ponderado).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm font-semibold text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
          >
            <FileText size={15} className="text-rose-500" />
            PDF
          </button>
          <button
            onClick={exportarExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm font-semibold text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
          >
            <FileSpreadsheet size={15} className="text-emerald-500" />
            Excel
          </button>
        </div>
      </div>

      {/* ============ Filtros ============ */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Select de producto */}
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary flex items-center gap-1.5">
              <PackageSearch size={13} className="text-gray-400" />
              Producto
            </span>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-700 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
            >
              {productos.length === 0 && <option value="">Sin productos</option>}
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>

          {/* Fechas */}
          <FiltroFecha label="Desde" value={fechaInicio} onChange={setFechaInicio} />
          <FiltroFecha label="Hasta" value={fechaFin} onChange={setFechaFin} />

          {/* Tipo de movimiento */}
          <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary flex items-center gap-1.5">
              <Tag size={13} className="text-gray-400" />
              Tipo de movimiento
            </span>
            <select
              value={tipoMovimiento}
              onChange={(e) => setTipoMovimiento(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-700 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
            >
              <option value="">Todos</option>
              <option value="ENTRADA">Entrada (Compra)</option>
              <option value="SALIDA">Salida (Venta)</option>
              <option value="AJUSTE_POSITIVO">Ajuste Positivo</option>
              <option value="AJUSTE_NEGATIVO">Ajuste Negativo</option>
            </select>
          </label>
        </div>

        {(fechaInicio || fechaFin || tipoMovimiento) && (
          <div className="mt-3 flex items-center justify-end">
            <button
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              <RotateCcw size={13} />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* ============ Manejo de estados ============ */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border">
          <Loader2 size={32} className="animate-spin text-rose-500" />
          <p className="mt-3 text-sm text-gray-500 dark:text-dark-text-secondary">Cargando productos…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-dark-card rounded-2xl border border-red-200 dark:border-red-500/20 px-6 text-center">
          <AlertCircle size={36} className="text-red-500" />
          <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-dark-text">No se pudo cargar la información</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary max-w-md">{error}</p>
          <button
            onClick={() => { cargarKardex(); }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-rose-500/25 transition-all"
          >
            <RotateCcw size={15} />
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && productos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border px-6 text-center">
          <PackageOpen size={40} className="text-gray-300 dark:text-gray-600" />
          <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-dark-text">Aún no tienes productos</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary max-w-sm">
            Agrega productos a tu tienda para empezar a registrar su Kardex de inventario.
          </p>
        </div>
      )}

      {!loading && !error && productos.length > 0 && !kardexLoading && data && (
        <>
          {/* ============ KPIs / Resumen ============ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              titulo="Stock actual"
              valor={resumen ? `${resumen.stock_actual ?? 0} uds` : "—"}
              sub={productoSeleccionado ? `Disponible · ${productoSeleccionado.nombre}` : "Disponible"}
              icono={Boxes}
              gradiente="from-rose-500 to-amber-500"
              iconoBg=""
            />
            <KpiCard
              titulo="Costo promedio unitario"
              valor={resumen ? formatearMoneda(resumen.costo_promedio) : "—"}
              sub="Método promedio ponderado"
              icono={Scale}
              gradiente="from-sky-500 to-indigo-500"
              iconoBg=""
            />
            <KpiCard
              titulo="Valoración total"
              valor={resumen ? formatearMoneda(resumen.valor_total_inventario) : "—"}
              sub="Valor total del inventario"
              icono={Coins}
              gradiente="from-emerald-500 to-teal-500"
              iconoBg=""
            />
          </div>

          {/* ============ Tabla de Kardex ============ */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
            {/* Encabezado del producto */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                <PackageSearch size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 dark:text-dark-text truncate">
                  {productoSeleccionado?.nombre || "Producto"}
                </h2>
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary truncate">
                  {productoSeleccionado?.categoria || "Sin categoría"}
                  {productoSeleccionado?.marca ? ` · ${productoSeleccionado.marca}` : ""}
                </p>
              </div>
              <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 dark:bg-dark-bg dark:text-dark-text-secondary text-xs font-medium">
                <ClipboardList size={13} />
                {movimientos.length} movimiento{movimientos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {movimientos.length === 0 ? (
              /* ---- Empty state: sin movimientos ---- */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <PackageOpen size={40} className="text-gray-300 dark:text-gray-600" />
                <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-dark-text">
                  Sin movimientos en este rango
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-secondary max-w-sm">
                  {fechaInicio || fechaFin || tipoMovimiento
                    ? "No hay movimientos que coincidan con los filtros aplicados. Ajusta los filtros o límpialos."
                    : "Este producto aún no registra movimientos de inventario. Las ventas, compras y ajustes aparecerán aquí."}
                </p>
                {(fechaInicio || fechaFin || tipoMovimiento) && (
                  <button
                    onClick={limpiarFiltros}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-rose-500/25 transition-all"
                  >
                    <RotateCcw size={15} />
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              /* ---- Tabla principal ---- */
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    {/* Fila 1: grupos de columnas */}
                    <tr className="bg-gray-50 dark:bg-dark-bg">
                      <th colSpan={3} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">
                        Fecha · Concepto · Tipo
                      </th>
                      <th colSpan={3} className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-gray-100 dark:border-dark-border">
                        Entradas
                      </th>
                      <th colSpan={3} className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400 border-b border-gray-100 dark:border-dark-border">
                        Salidas
                      </th>
                      <th colSpan={3} className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 border-b border-gray-100 dark:border-dark-border">
                        Saldo
                      </th>
                    </tr>
                    {/* Fila 2: columnas individuales */}
                    <tr className="bg-gray-50/60 dark:bg-dark-bg/60">
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Fecha</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Concepto</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Tipo</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Cantidad</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Costo U.</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Total</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Cantidad</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Costo U.</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Total</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Cantidad</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Costo U.</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary border-b border-gray-100 dark:border-dark-border">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
                    {movimientos.map((m, idx) => {
                      const esIngreso = TIPOS_INGRESO.has(m.tipo_movimiento);
                      const esEgreso = TIPOS_EGRESO.has(m.tipo_movimiento);
                      const { fecha, hora } = formatearFecha(m.creado_en);
                      return (
                        <tr
                          key={m.id ?? idx}
                          className="hover:bg-orange-50/40 dark:hover:bg-orange-500/5 transition-colors"
                        >
                          {/* Fecha / Concepto / Tipo */}
                          <td className="px-4 py-3 align-top">
                            <p className="text-[13px] font-medium text-gray-700 dark:text-dark-text whitespace-nowrap">{fecha}</p>
                            <p className="text-[11px] text-gray-400 dark:text-dark-text-secondary whitespace-nowrap">{hora}</p>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <p className="text-[13px] text-gray-600 dark:text-dark-text max-w-[180px] truncate" title={m.concepto}>
                              {m.concepto || "—"}
                            </p>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <TipoBadge tipo={m.tipo_movimiento} />
                          </td>

                          {/* Entradas */}
                          {esIngreso ? (
                            <>
                              <td className="px-3 py-3 text-right text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 align-top">+{m.cantidad}</td>
                              <td className="px-3 py-3 text-right text-[13px] text-gray-600 dark:text-dark-text align-top">{formatearMoneda(m.costo_unitario)}</td>
                              <td className="px-3 py-3 text-right text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 align-top">{formatearMoneda(m.costo_total)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-right text-[13px] text-gray-300 dark:text-gray-600 align-top">—</td>
                              <td className="px-3 py-3 text-right text-[13px] text-gray-300 dark:text-gray-600 align-top">—</td>
                              <td className="px-3 py-3 text-right text-[13px] text-gray-300 dark:text-gray-600 align-top">—</td>
                            </>
                          )}

                          {/* Salidas */}
                          {esEgreso ? (
                            <>
                              <td className="px-3 py-3 text-right text-[13px] font-semibold text-red-500 dark:text-red-400 align-top">-{m.cantidad}</td>
                              <td className="px-3 py-3 text-right text-[13px] text-gray-600 dark:text-dark-text align-top">{formatearMoneda(m.costo_unitario)}</td>
                              <td className="px-3 py-3 text-right text-[13px] font-semibold text-red-500 dark:text-red-400 align-top">{formatearMoneda(m.costo_total)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-right text-[13px] text-gray-300 dark:text-gray-600 align-top">—</td>
                              <td className="px-3 py-3 text-right text-[13px] text-gray-300 dark:text-gray-600 align-top">—</td>
                              <td className="px-3 py-3 text-right text-[13px] text-gray-300 dark:text-gray-600 align-top">—</td>
                            </>
                          )}

                          {/* Saldo */}
                          <td className="px-3 py-3 text-right text-[13px] font-bold text-gray-900 dark:text-dark-text align-top">{m.saldo_cantidad}</td>
                          <td className="px-3 py-3 text-right text-[13px] text-gray-600 dark:text-dark-text align-top">{formatearMoneda(m.saldo_costo_unitario)}</td>
                          <td className="px-3 py-3 text-right text-[13px] font-semibold text-sky-600 dark:text-sky-400 align-top">{formatearMoneda(m.saldo_valor)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Overlay de carga del kardex (mantiene visible la tabla anterior) */}
      {!loading && !error && kardexLoading && productos.length > 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border">
          <Loader2 size={32} className="animate-spin text-rose-500" />
          <p className="mt-3 text-sm text-gray-500 dark:text-dark-text-secondary">Consultando movimientos…</p>
        </div>
      )}
    </div>
  );
}
