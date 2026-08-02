import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { misPedidos } from "../../api/pedidos";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import {
  PackageSearch, Search, X, SlidersHorizontal, ChevronDown,
  ShoppingBag, ArrowRight, Clock, Package, Truck,
  PackageCheck, AlertCircle, Loader2, RefreshCw,
  Eye, MapPin, CreditCard, Store
} from "lucide-react";

const nf = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FILTERS = [
  { value: "todos", label: "Todos", icon: PackageSearch },
  { value: "pendiente", label: "Pendientes", icon: Clock },
  { value: "pagado", label: "En proceso", icon: Package },
  { value: "enviado", label: "Enviados", icon: Truck },
  { value: "entregado", label: "Entregados", icon: PackageCheck },
  { value: "cancelado", label: "Cancelados", icon: AlertCircle },
];

const SORT_OPTIONS = [
  { value: "reciente", label: "Más recientes" },
  { value: "antiguo", label: "Más antiguos" },
  { value: "mayor", label: "Mayor valor" },
  { value: "menor", label: "Menor valor" },
];

function formatFecha(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function UserOrders() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("reciente");
  const [showFilters, setShowFilters] = useState(false);

  const cargarPedidos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await misPedidos();
      setOrders(data || []);
    } catch (err) {
      setError(err.message || "Error al cargar los pedidos");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  // Filtrar y ordenar pedidos
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filtro por estado
    if (activeFilter !== "todos") {
      result = result.filter((o) => o.estado === activeFilter);
    }

    // Búsqueda por término
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.numero?.toLowerCase().includes(term) ||
          o.items?.some(
            (it) =>
              it.nombre_producto?.toLowerCase().includes(term) ||
              (o.vendedor?.nombre || "").toLowerCase().includes(term)
          ) ||
          (o.vendedor?.nombre || "").toLowerCase().includes(term)
      );
    }

    // Ordenar
    result.sort((a, b) => {
      const aDate = a.creado_en ? new Date(a.creado_en) : new Date(0);
      const bDate = b.creado_en ? new Date(b.creado_en) : new Date(0);
      const aTotal = a.total || 0;
      const bTotal = b.total || 0;

      switch (sortBy) {
        case "antiguo":
          return aDate - bDate;
        case "mayor":
          return bTotal - aTotal;
        case "menor":
          return aTotal - bTotal;
        default:
          return bDate - aDate;
      }
    });

    return result;
  }, [orders, activeFilter, searchTerm, sortBy]);

  // Estado de carga
  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className={`w-12 h-12 animate-spin mb-4 ${
              isDark ? "text-rose-400" : "text-rose-500"
            }`} />
            <p className={`text-lg font-medium ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>
              Cargando tus pedidos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
              isDark ? "bg-red-500/10" : "bg-red-50"
            }`}>
              <AlertCircle className={`w-10 h-10 ${
                isDark ? "text-red-400" : "text-red-500"
              }`} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Error al cargar pedidos
            </h3>
            <p className={`text-sm mb-6 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}>
              {error}
            </p>
            <button
              onClick={cargarPedidos}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDark ? "bg-rose-500/10" : "bg-rose-50"
            }`}>
              <PackageSearch className={`w-6 h-6 ${
                isDark ? "text-rose-400" : "text-rose-600"
              }`} />
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold font-display ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                Mis Pedidos
              </h1>
              <p className={`text-sm ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}>
                {orders.length} {orders.length === 1 ? "pedido realizado" : "pedidos realizados"}
              </p>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          /* Estado vacío */
          <div className="flex flex-col items-center justify-center py-20">
            <div className={`w-28 h-28 rounded-3xl flex items-center justify-center mb-8 ${
              isDark ? "bg-white/5" : "bg-gray-50"
            }`}>
              <ShoppingBag className={`w-14 h-14 ${
                isDark ? "text-gray-600" : "text-gray-300"
              }`} />
            </div>
            <h2 className={`text-2xl font-bold font-display mb-3 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              No tienes pedidos aún
            </h2>
            <p className={`text-base mb-8 max-w-md text-center ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}>
              Explora nuestra tienda y encuentra todo lo que tu mascota necesita.
              ¡Tu primer pedido te espera!
            </p>
            <Link
              to="/store"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-200 dark:shadow-none hover:shadow-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 hover:scale-105"
            >
              <ShoppingBag className="w-5 h-5" />
              Ir al Marketplace
            </Link>
          </div>
        ) : (
          <>
            {/* Búsqueda y filtros */}
            <div className="space-y-4 mb-8">
              {/* Barra de búsqueda */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`} />
                  <input
                    type="text"
                    placeholder="Buscar por número, producto o tienda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-12 pr-10 py-3 rounded-xl border transition-all duration-200 outline-none ${
                      isDark
                        ? "bg-dark-card border-dark-border text-dark-text placeholder-gray-500 focus:border-rose-500/50"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-rose-500"
                    }`}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <X className={`w-4 h-4 ${
                        isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                      }`} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 ${
                    showFilters || activeFilter !== "todos"
                      ? isDark
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : "bg-rose-50 border-rose-200 text-rose-600"
                      : isDark
                        ? "bg-dark-card border-dark-border text-gray-400 hover:border-gray-600"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Filtros expandibles */}
              {showFilters && (
                <div className={`p-4 rounded-xl border animate-fade-in-down ${
                  isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-200"
                }`}>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {FILTERS.map((f) => {
                      const Icon = f.icon;
                      const isActive = activeFilter === f.value;
                      return (
                        <button
                          key={f.value}
                          onClick={() => setActiveFilter(f.value)}
                          className={`
                            inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                            transition-all duration-200 border
                            ${isActive
                              ? isDark
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                : "bg-rose-50 border-rose-200 text-rose-600"
                              : isDark
                                ? "bg-transparent border-dark-border text-gray-400 hover:border-gray-500 hover:text-gray-300"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Ordenar */}
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Ordenar por:
                    </span>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`appearance-none px-4 py-2 pr-10 rounded-xl text-sm font-medium border transition-all duration-200 outline-none cursor-pointer ${
                          isDark
                            ? "bg-dark-card border-dark-border text-gray-300 focus:border-rose-500/50"
                            : "bg-white border-gray-200 text-gray-700 focus:border-rose-500"
                        }`}
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                        isDark ? "text-gray-500" : "text-gray-400"
                      }`} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de pedidos */}
            {filteredOrders.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border ${
                isDark ? "border-dark-border" : "border-gray-200"
              }`}>
                <Search className={`w-12 h-12 mb-4 ${
                  isDark ? "text-gray-600" : "text-gray-300"
                }`} />
                <p className={`text-lg font-medium ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}>
                  No se encontraron pedidos
                </p>
                <p className={`text-sm mt-1 ${
                  isDark ? "text-gray-500" : "text-gray-500"
                }`}>
                  Intenta con otros filtros o términos de búsqueda
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, index) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isDark={isDark}
                    index={index}
                    onClick={() => navigate(`/mis-pedidos/${order.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, isDark, index, onClick }) {
  const totalItems = order.items?.reduce((sum, it) => sum + (it.cantidad || 0), 0) || 0;
  const firstItem = order.items?.[0];

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border p-5 cursor-pointer
        transition-all duration-300 animate-fade-in-up
        hover:shadow-lg hover:-translate-y-0.5
        ${isDark
          ? "bg-dark-card border-dark-border hover:border-rose-500/20"
          : "bg-white border-gray-100 hover:border-rose-200 hover:shadow-rose-100/50"
        }
      `}
      style={{ animationDelay: `${index * 0.05}s` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      aria-label={`Ver detalle del pedido ${order.numero}`}
    >
      {/* Desktop layout */}
      <div className="hidden sm:block">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h3 className={`text-base font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                {order.numero}
              </h3>
              <p className={`text-sm mt-0.5 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}>
                {formatFecha(order.creado_en)}
              </p>
            </div>
          </div>
          <OrderStatusBadge status={order.estado} />
        </div>

        <div className="flex items-center gap-4">
          {firstItem && (
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? "bg-white/5" : "bg-gray-50"
            }`}>
              <ShoppingBag className={`w-8 h-8 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                <span className={isDark ? "text-gray-500" : "text-gray-400"}>
                  {totalItems} {totalItems === 1 ? "producto" : "productos"}
                </span>
              </span>
              {order.vendedor?.nombre && (
                <span className={`text-sm flex items-center gap-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}>
                  <Store className="w-3.5 h-3.5" />
                  {order.vendedor.nombre}
                </span>
              )}
              {order.metodo_pago && (
                <span className={`text-sm flex items-center gap-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}>
                  <CreditCard className="w-3.5 h-3.5" />
                  {order.metodo_pago}
                </span>
              )}
            </div>
            {order.items?.slice(0, 3).map((it) => (
              <p key={it.id} className={`text-sm truncate mt-1 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}>
                {it.cantidad}x {it.nombre_producto}
              </p>
            ))}
            {order.items?.length > 3 && (
              <p className={`text-xs mt-0.5 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                +{order.items.length - 3} productos más
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-lg font-bold font-display ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              {nf.format(order.total || 0)}
            </p>
            <div className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${
              isDark ? "text-rose-400" : "text-rose-600"
            }`}>
              Ver detalles
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className={`text-sm font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              {order.numero}
            </h3>
            <p className={`text-xs mt-0.5 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}>
              {formatFecha(order.creado_en)}
            </p>
          </div>
          <OrderStatusBadge status={order.estado} size="sm" />
        </div>

        <div className="flex items-center gap-3">
          {firstItem && (
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              isDark ? "bg-white/5" : "bg-gray-50"
            }`}>
              <ShoppingBag className={`w-6 h-6 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}>
              {firstItem?.nombre_producto || "Productos"}
            </p>
            <p className={`text-xs mt-0.5 ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}>
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
              {order.vendedor?.nombre && ` · ${order.vendedor.nombre}`}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-base font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              {nf.format(order.total || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
