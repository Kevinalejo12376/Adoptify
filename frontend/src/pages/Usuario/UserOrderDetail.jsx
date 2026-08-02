import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { obtenerPedido } from "../../api/pedidos";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import OrderTimeline from "../../components/OrderTimeline";
import {
  PackageSearch, ArrowLeft, ShoppingBag, MapPin, CreditCard,
  Truck, Calendar, Store, User, Phone, FileText,
  Loader2, AlertCircle, RefreshCw, ChevronRight,
  Package, Wallet, Clock, Hash, Info, Download
} from "lucide-react";

const nf = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatFecha(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function UserOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarPedido = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerPedido(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || "Error al cargar el pedido");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarPedido();
  }, [cargarPedido]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className={`w-12 h-12 animate-spin mb-4 ${
              isDark ? "text-rose-400" : "text-rose-500"
            }`} />
            <p className={`text-lg font-medium ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>
              Cargando detalle del pedido...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              Error al cargar el pedido
            </h3>
            <p className={`text-sm mb-6 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}>
              {error}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cargarPedido}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300"
              >
                <RefreshCw className="w-4 h-4" />
                Intentar de nuevo
              </button>
              <Link
                to="/mis-pedidos"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 border ${
                  isDark
                    ? "border-dark-border text-gray-300 hover:border-gray-500"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const subtotal = order.subtotal || 0;
  const costoEnvio = order.costo_envio || 0;
  const descuento = order.descuento || 0;
  const total = order.total || 0;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/mis-pedidos")}
            className={`inline-flex items-center gap-2 text-sm font-medium mb-4 transition-colors ${
              isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a mis pedidos
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDark ? "bg-rose-500/10" : "bg-rose-50"
              }`}>
                <PackageSearch className={`w-6 h-6 ${
                  isDark ? "text-rose-400" : "text-rose-600"
                }`} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold font-display ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  {order.numero}
                </h1>
                <p className={`text-sm ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}>
                  Realizado el {formatFecha(order.creado_en)}
                </p>
              </div>
            </div>
            <OrderStatusBadge status={order.estado} size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <div className={`rounded-2xl border p-6 ${
              isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
            }`}>
              <h2 className={`text-lg font-bold font-display mb-6 ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                Estado del Pedido
              </h2>
              <OrderTimeline
                currentStatus={order.estado}
                historial={order.historial || []}
                isDark={isDark}
              />
            </div>

            {/* Productos */}
            <div className={`rounded-2xl border p-6 ${
              isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
            }`}>
              <h2 className={`text-lg font-bold font-display mb-6 ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                Productos ({order.items?.length || 0})
              </h2>
              <div className="space-y-4">
                {order.items?.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                      isDark ? "bg-white/5 hover:bg-white/[0.07]" : "bg-gray-50 hover:bg-gray-100/70"
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? "bg-white/5" : "bg-white"
                    }`}>
                      <ShoppingBag className={`w-8 h-8 ${
                        isDark ? "text-gray-500" : "text-gray-400"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`text-sm font-semibold ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}>
                            {item.nombre_producto}
                          </h3>
                          <p className={`text-xs mt-1 ${
                            isDark ? "text-gray-500" : "text-gray-500"
                          }`}>
                            Cantidad: {item.cantidad}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}>
                            {nf.format(item.subtotal || 0)}
                          </p>
                          <p className={`text-xs mt-0.5 ${
                            isDark ? "text-gray-500" : "text-gray-500"
                          }`}>
                            {nf.format(item.precio_unitario || 0)} c/u
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resumen de costos */}
            <div className={`rounded-2xl border p-6 ${
              isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
            }`}>
              <h2 className={`text-lg font-bold font-display mb-5 ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                Resumen
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>Subtotal</span>
                  <span className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {nf.format(subtotal)}
                  </span>
                </div>
                {costoEnvio > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Costo de envío</span>
                    <span className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {nf.format(costoEnvio)}
                    </span>
                  </div>
                )}
                {descuento > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">Descuento</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      -{nf.format(descuento)}
                    </span>
                  </div>
                )}
                <div className={`border-t pt-3 flex justify-between ${
                  isDark ? "border-dark-border" : "border-gray-100"
                }`}>
                  <span className={`text-base font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}>
                    Total
                  </span>
                  <span className={`text-lg font-bold font-display ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}>
                    {nf.format(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Información de pago */}
            {order.metodo_pago && (
              <div className={`rounded-2xl border p-6 ${
                isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
              }`}>
                <h2 className={`text-lg font-bold font-display mb-5 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  Pago
                </h2>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-emerald-500/10" : "bg-emerald-50"
                  }`}>
                    <CreditCard className={`w-5 h-5 ${
                      isDark ? "text-emerald-400" : "text-emerald-600"
                    }`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}>
                      {order.metodo_pago}
                    </p>
                    <p className={`text-xs ${
                      isDark ? "text-gray-500" : "text-gray-500"
                    }`}>
                      Método de pago
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dirección de envío */}
            {order.direccion_envio && (
              <div className={`rounded-2xl border p-6 ${
                isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
              }`}>
                <h2 className={`text-lg font-bold font-display mb-5 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  Envío
                </h2>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? "bg-violet-500/10" : "bg-violet-50"
                  }`}>
                    <MapPin className={`w-5 h-5 ${
                      isDark ? "text-violet-400" : "text-violet-600"
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}>
                      {order.direccion_envio}
                    </p>
                    {order.nombre_contacto && (
                      <p className={`text-xs mt-1 flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}>
                        <User className="w-3 h-3" />
                        {order.nombre_contacto}
                      </p>
                    )}
                    {order.telefono_contacto && (
                      <p className={`text-xs mt-0.5 flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}>
                        <Phone className="w-3 h-3" />
                        {order.telefono_contacto}
                      </p>
                    )}
                    {order.fecha_estimada_entrega && (
                      <p className={`text-xs mt-2 flex items-center gap-1 ${
                        isDark ? "text-amber-400" : "text-amber-600"
                      }`}>
                        <Calendar className="w-3 h-3" />
                        Entrega estimada: {formatFecha(order.fecha_estimada_entrega)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seguimiento del envío: número de guía y transportadora */}
            {(order.numero_guia || order.empresa_transportadora) && (
              <div className={`rounded-2xl border p-6 ${
                isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
              }`}>
                <h2 className={`text-lg font-bold font-display mb-5 flex items-center gap-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  <Truck className={`w-5 h-5 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                  Seguimiento del envío
                </h2>
                {order.empresa_transportadora && (
                  <div className="mb-4">
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      Empresa transportadora
                    </p>
                    <p className={`text-sm font-semibold mt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {order.empresa_transportadora}
                    </p>
                  </div>
                )}
                {order.numero_guia && (
                  <div className={`rounded-xl p-4 ${isDark ? "bg-amber-500/10" : "bg-amber-50"}`}>
                    <p className={`text-xs flex items-center gap-1 ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                      <Hash className="w-3 h-3" />
                      Su número de guía es:
                    </p>
                    <p className={`text-lg font-bold font-display tracking-wide mt-1 select-all ${
                      isDark ? "text-amber-300" : "text-amber-800"
                    }`}>
                      {order.numero_guia}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Información del vendedor */}
            {order.vendedor && (
              <div className={`rounded-2xl border p-6 ${
                isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
              }`}>
                <h2 className={`text-lg font-bold font-display mb-5 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  Vendedor
                </h2>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-rose-500/10" : "bg-rose-50"
                  }`}>
                    <Store className={`w-5 h-5 ${
                      isDark ? "text-rose-400" : "text-rose-600"
                    }`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}>
                      {order.vendedor.nombre}
                    </p>
                    <p className={`text-xs ${
                      isDark ? "text-gray-500" : "text-gray-500"
                    }`}>
                      {order.vendedor.tipo === "tienda" ? "Tienda aliada" : "Refugio"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notas */}
            {order.notas && (
              <div className={`rounded-2xl border p-6 ${
                isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
              }`}>
                <h2 className={`text-lg font-bold font-display mb-5 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>
                  Notas
                </h2>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? "bg-blue-500/10" : "bg-blue-50"
                  }`}>
                    <FileText className={`w-5 h-5 ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    }`} />
                  </div>
                  <p className={`text-sm ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}>
                    {order.notas}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
