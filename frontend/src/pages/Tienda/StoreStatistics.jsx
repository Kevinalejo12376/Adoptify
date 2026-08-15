import React, { useState, useEffect } from "react";
import {
  DollarSign, ShoppingCart, Users, Star, Package, TrendingUp, Loader2,
} from "lucide-react";
import { estadisticasTienda, misProductosTienda } from "../../api/tienda";

// Paleta de colores para que cada barra tenga un color diferente.
const BAR_COLORS = [
  "from-rose-500 to-rose-400 dark:from-rose-600 dark:to-rose-500",
  "from-amber-500 to-amber-400 dark:from-amber-600 dark:to-amber-500",
  "from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500",
  "from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500",
  "from-violet-500 to-violet-400 dark:from-violet-600 dark:to-violet-500",
  "from-cyan-500 to-cyan-400 dark:from-cyan-600 dark:to-cyan-500",
  "from-orange-500 to-orange-400 dark:from-orange-600 dark:to-orange-500",
];

// Grafica de barras simple con datos reales.
// Cada barra usa su propio color: si el item trae `color` lo usa,
// si no, usa el color por defecto del componente.
function BarChart({ items, height = 200, color = "from-rose-500 to-amber-500" }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Sin datos suficientes</p>;
  }
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
      {items.map((it, index) => (
        <div key={index} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[10px] font-medium text-gray-400">{it.value}</span>
          <div className={`w-full rounded-lg bg-gradient-to-t ${it.color || color} transition-all duration-500 min-h-[4px]`}
            style={{ height: `${(it.value / max) * 100}%` }} />
          <span className="text-[10px] font-medium text-gray-400 truncate w-full text-center" title={it.label}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function StoreStatistics() {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [est, prods] = await Promise.all([
          estadisticasTienda().catch(() => null),
          misProductosTienda().catch(() => []),
        ]);
        if (!activo) return;
        setStats(est);
        setProducts(prods || []);
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  const s = stats || {};
  const top = s.top_productos || [];
  const leastSold = [...products].sort((a, b) => (a.ventas || 0) - (b.ventas || 0)).slice(0, 5);

  const summary = [
    { icon: DollarSign, color: "text-emerald-500", label: "Ingresos", value: `$${Number(s.ingresos ?? 0).toLocaleString("es-CO")}` },
    { icon: Package, color: "text-rose-500", label: "Productos", value: s.total_productos ?? 0 },
    { icon: TrendingUp, color: "text-purple-500", label: "Ventas acumuladas", value: s.total_ventas ?? 0 },
    { icon: ShoppingCart, color: "text-blue-500", label: "Pedidos", value: s.total_pedidos ?? 0 },
    { icon: Star, color: "text-yellow-500", label: "Calificación prom.", value: s.rating_promedio ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Estadísticas</h1>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
          Rendimiento de tu tienda con datos reales.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summary.map((c) => (
          <div key={c.label} className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
            <c.icon size={18} className={`${c.color} mb-2`} />
            <p className="text-lg font-bold text-gray-900 dark:text-dark-text">{c.value}</p>
            <p className="text-[10px] text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row (reales) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Top 7 productos por ventas</h3>
          <BarChart items={top.slice(0, 7).map((p, i) => ({ label: p.nombre?.slice(0, 8) || "-", value: p.ventas || 0, color: BAR_COLORS[i % BAR_COLORS.length] }))} />
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Top 7 productos por stock</h3>
          <BarChart items={[...products].sort((a, b) => (b.stock || 0) - (a.stock || 0)).slice(0, 7).map((p, i) => ({ label: p.nombre?.slice(0, 8) || "-", value: p.stock || 0, color: BAR_COLORS[i % BAR_COLORS.length] }))} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos más vendidos */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-dark-border">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Productos más vendidos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase">#</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase">Producto</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase">Vendidos</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {top.length > 0 ? top.map((product, index) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-dark-border">
                    <td className="px-4 py-2.5">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        index === 0 ? "bg-amber-100 text-amber-600" : index === 1 ? "bg-gray-100 text-gray-500" : index === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"
                      }`}>{index + 1}</div>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-dark-text">{product.nombre}</td>
                    <td className="px-4 py-2.5 text-right text-sm text-gray-600 dark:text-dark-text-secondary">{product.ventas}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-dark-text">${Number(product.precio).toLocaleString("es-CO")}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Aún no hay ventas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Productos menos vendidos */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-dark-border">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Productos con menos ventas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase">Producto</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase">Vendidos</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {leastSold.length > 0 ? leastSold.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-dark-border">
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-dark-text">{product.nombre}</td>
                    <td className="px-4 py-2.5 text-right text-sm text-gray-600 dark:text-dark-text-secondary">{product.ventas || 0}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-sm font-medium ${(product.stock || 0) === 0 ? "text-red-500" : (product.stock || 0) <= 5 ? "text-amber-500" : "text-gray-600 dark:text-dark-text-secondary"}`}>
                        {product.stock || 0}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clientes frecuentes (aún no disponible) */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-dark-border">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Clientes Frecuentes</h3>
          </div>
          <div className="text-center py-10">
            <Users size={26} className="mx-auto text-gray-300 dark:text-dark-border mb-2" />
            <p className="text-sm text-gray-400">Aún no hay datos de clientes</p>
          </div>
        </div>

        {/* Calificaciones (aún no disponible) */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-dark-border">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Calificaciones Recientes</h3>
          </div>
          <div className="text-center py-10">
            <Star size={26} className="mx-auto text-gray-300 dark:text-dark-border mb-2" />
            <p className="text-sm text-gray-400">Aún no hay calificaciones</p>
          </div>
        </div>
      </div>
    </div>
  );
}
