import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package, ShoppingCart, PackageX, CheckCircle, TrendingUp,
  PlusCircle, AlertTriangle, Store, BarChart3, Settings, Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { estadisticasTienda, misProductosTienda, misPedidosTienda } from "../../api/tienda";

function StatCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${bgColor}`}>
        <Icon size={24} className={color} />
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">{label}</p>
    </div>
  );
}

export default function StoreDashboard() {
  const { user } = useAuth();
  const { tienePermiso } = useStore();
  const puedeVerProductos = tienePermiso("productos.ver");
  const puedeVerPedidos = tienePermiso("pedidos.ver");
  const puedeVerEstadisticas = tienePermiso("reportes.ver_estadisticas");
  const puedeCrearProducto = tienePermiso("productos.crear");

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const promises = [
          puedeVerEstadisticas ? estadisticasTienda().catch(() => null) : Promise.resolve(null),
          puedeVerProductos ? misProductosTienda().catch(() => []) : Promise.resolve([]),
          puedeVerPedidos ? misPedidosTienda().catch(() => []) : Promise.resolve([]),
        ];
        const [est, prods, peds] = await Promise.all(promises);
        if (!activo) return;
        setStats(est);
        setProducts(prods || []);
        setOrders(peds || []);
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando panel...</p>
      </div>
    );
  }

  const s = stats || {};
  const lowStock = products.filter((p) => (p.stock ?? 0) <= 5 && (p.stock ?? 0) >= 0);
  const sinStock = products.filter((p) => (p.stock ?? 0) <= 0).length;
  const storeName = user?.name || user?.nombre || "tu tienda";

  // Accesos rapidos filtrados por permisos del usuario.
  const accesosRapidos = [
    { icon: PlusCircle, label: "Nuevo Producto", path: "/tienda/productos/nuevo", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-500/10", permiso: puedeCrearProducto },
    { icon: Package, label: "Productos", path: "/tienda/productos", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10", permiso: puedeVerProductos },
    { icon: ShoppingCart, label: "Pedidos", path: "/tienda/pedidos", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10", permiso: puedeVerPedidos },
    { icon: Store, label: "Perfil", path: "/tienda/perfil", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-500/10", permiso: tienePermiso("tienda.ver_perfil") },
    { icon: BarChart3, label: "Estadísticas", path: "/tienda/estadisticas", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10", permiso: puedeVerEstadisticas },
    { icon: Settings, label: "Configuración", path: "/tienda/configuracion", color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-500/10", permiso: tienePermiso("configuracion.acceder") },
  ].filter((item) => item.permiso);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text font-display">Dashboard</h1>
          <p className="text-base text-gray-500 dark:text-dark-text-secondary mt-1">
            Bienvenido de nuevo, {storeName}. Aquí tienes un resumen de tu tienda.
          </p>
        </div>
        {puedeCrearProducto && (
          <Link to="/tienda/productos/nuevo" className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-base font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all">
            <PlusCircle size={18} />
            Nuevo Producto
          </Link>
        )}
      </div>

      {/* Stats Cards (reales, segun permisos) */}
      {puedeVerEstadisticas ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Productos publicados" value={s.total_productos ?? 0} color="text-rose-600" bgColor="bg-rose-50 dark:bg-rose-500/10" />
          <StatCard icon={CheckCircle} label="Productos activos" value={s.productos_activos ?? 0} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-500/10" />
          <StatCard icon={PackageX} label="Productos agotados" value={s.productos_sin_stock ?? 0} color="text-amber-600" bgColor="bg-amber-50 dark:bg-amber-500/10" />
          <StatCard icon={TrendingUp} label="Ventas acumuladas" value={s.total_ventas ?? 0} color="text-purple-600" bgColor="bg-purple-50 dark:bg-purple-500/10" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Package} label="Mis productos" value={products.length} color="text-rose-600" bgColor="bg-rose-50 dark:bg-rose-500/10" />
          <StatCard icon={ShoppingCart} label="Mis pedidos" value={orders.length} color="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-500/10" />
          <StatCard icon={PackageX} label="Sin stock" value={sinStock} color="text-amber-600" bgColor="bg-amber-50 dark:bg-amber-500/10" />
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productos más vendidos (real) */}
        {puedeVerEstadisticas && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">Productos más vendidos</h3>
              <Link to="/tienda/estadisticas" className="text-sm text-rose-500 hover:text-rose-600 font-medium">Ver todos</Link>
            </div>
            <div className="p-2">
              {(s.top_productos || []).length > 0 ? (s.top_productos || []).map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                    index === 0 ? "bg-amber-100 text-amber-600" :
                    index === 1 ? "bg-gray-100 text-gray-500" :
                    index === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"
                  }`}>{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">{product.nombre}</p>
                    <p className="text-xs text-gray-400">{product.ventas} vendidos</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                    ${Number(product.precio).toLocaleString("es-CO")}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-8">Aún no hay ventas registradas</p>
              )}
            </div>
          </div>
        )}

        {/* Últimos pedidos */}
        {puedeVerPedidos && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">Últimos pedidos</h3>
            </div>
            <div className="p-2">
              {orders.length > 0 ? (
                orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-dark-text">{order.numero || `#${order.id}`}</span>
                    <span className="text-sm text-gray-500">${Number(order.total || 0).toLocaleString("es-CO")}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart size={32} className="mx-auto text-gray-300 dark:text-dark-border mb-2" />
                  <p className="text-sm text-gray-400">Aún no hay pedidos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bajo inventario */}
        {puedeVerProductos && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">Bajo inventario</h3>
              <Link to="/tienda/productos" className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                {lowStock.length > 0 ? `(${lowStock.length})` : "Ver"}
              </Link>
            </div>
            <div className="p-2">
              {lowStock.length > 0 ? lowStock.slice(0, 6).map((product) => (
                <Link key={product.id} to={`/tienda/productos/${product.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">{product.nombre}</p>
                    <p className="text-xs text-gray-400">Stock: {product.stock}</p>
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-gray-400 text-center py-8">Todo en stock suficiente</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Accesos Rápidos */}
      {accesosRapidos.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-gray-100 dark:border-dark-border">
          <h3 className="text-base font-bold text-gray-900 dark:text-dark-text mb-4">Accesos Rápidos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {accesosRapidos.map((item) => (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 dark:border-dark-border hover:shadow-md hover:border-rose-100 dark:hover:border-rose-500/20 transition-all group">
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon size={22} className={item.color} />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
