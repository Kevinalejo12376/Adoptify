import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Search, ArrowUpRight, Loader2 } from "lucide-react";
import { misPedidosTienda } from "../../api/tienda";

function StatusBadge({ estado }) {
  const config = {
    pendiente: { label: "Pendiente", color: "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" },
    pagado: { label: "Pagado", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
    enviado: { label: "Enviado", color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
    entregado: { label: "Entregado", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    cancelado: { label: "Cancelado", color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
  };
  const c = config[estado] || { label: estado || "—", color: "bg-gray-50 text-gray-600" };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${c.color}`}>{c.label}</span>;
}

export default function StoreOrders() {
  const [busqueda, setBusqueda] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await misPedidosTienda();
        setPedidos(data || []);
      } catch (e) {
        setPedidos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtrados = pedidos.filter((o) =>
    !busqueda ||
    (o.numero || `#${o.id}`).toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Pedidos</h1>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
          Administra los pedidos realizados por los clientes.
        </p>
      </div>

      {/* Buscador */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número de pedido..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p>Cargando pedidos...</p>
        </div>
      ) : filtrados.length > 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Pedido</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filtrados.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-dark-text">{order.numero || `#${order.id}`}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-dark-text">${Number(order.total || 0).toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3"><StatusBadge estado={order.estado} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/tienda/pedidos/${order.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                        Ver detalle <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border">
          <ShoppingCart size={48} className="mx-auto text-gray-300 dark:text-dark-border mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Aún no hay pedidos</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Cuando los clientes realicen compras de tus productos, sus pedidos aparecerán aquí.
          </p>
        </div>
      )}
    </div>
  );
}
