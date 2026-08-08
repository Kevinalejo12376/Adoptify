import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ShoppingCart, Package, MapPin, CreditCard, Phone,
  User, Loader2, CheckCircle, Truck, Save, Hash,
} from "lucide-react";
import { obtenerPedidoTienda, cambiarEstadoPedidoTienda } from "../../api/tienda";
import { useStore } from "../../context/StoreContext";

const ESTADOS = [
  { key: "pendiente", label: "Pendiente" },
  { key: "pagado", label: "Pagado" },
  { key: "enviado", label: "Enviado" },
  { key: "entregado", label: "Entregado" },
  { key: "cancelado", label: "Cancelado" },
];

const ESTADO_COLOR = {
  pendiente: "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400",
  pagado: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  enviado: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  entregado: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelado: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

export default function StoreOrderDetail() {
  const { id } = useParams();
  const { tienePermiso, tieneAlgunoPermiso } = useStore();
  const puedeCambiar = tienePermiso("pedidos.cambiar_estado");
  const puedeAceptar = tienePermiso("pedidos.aceptar");
  const puedeRechazar = tienePermiso("pedidos.rechazar");
  const puedeGestionar = tieneAlgunoPermiso(["pedidos.cambiar_estado", "pedidos.aceptar", "pedidos.rechazar"]);

  // Determina si el usuario puede cambiar a un estado especifico segun sus permisos.
  const puedeCambiarA = (estado) => {
    if (estado === "cancelado") return puedeCambiar || puedeRechazar;
    if (["pagado", "enviado", "entregado"].includes(estado)) return puedeCambiar || puedeAceptar;
    return puedeCambiar;
  };
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [numeroGuia, setNumeroGuia] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [guiaSaved, setGuiaSaved] = useState(false);

  const cargar = async () => {
    try {
      const data = await obtenerPedidoTienda(id);
      setOrder(data);
      setNumeroGuia(data?.numero_guia || "");
      setTransportadora(data?.empresa_transportadora || "");
    } catch (e) {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [id]);

  const cambiarEstado = async (estado) => {
    setSaving(true);
    try {
      const actualizado = await cambiarEstadoPedidoTienda(id, estado, {
        numero_guia: numeroGuia || null,
        empresa_transportadora: transportadora || null,
      });
      setOrder(actualizado);
    } catch (e) { /* noop */ }
    finally { setSaving(false); }
  };

  const guardarGuia = async () => {
    if (!order) return;
    setSaving(true);
    setGuiaSaved(false);
    try {
      const actualizado = await cambiarEstadoPedidoTienda(id, order.estado, {
        numero_guia: numeroGuia || null,
        empresa_transportadora: transportadora || null,
      });
      setOrder(actualizado);
      setGuiaSaved(true);
      setTimeout(() => setGuiaSaved(false), 2500);
    } catch (e) { /* noop */ }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border">
        <ShoppingCart size={48} className="mx-auto text-gray-300 dark:text-dark-border mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Pedido no encontrado</h3>
        <p className="text-sm text-gray-500 mt-1">Este pedido no existe o no contiene productos de tu tienda.</p>
        <Link to="/tienda/pedidos" className="inline-flex items-center gap-2 mt-4 text-rose-500 hover:text-rose-600 font-medium">
          <ArrowLeft size={16} /> Volver a pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/tienda/pedidos" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Pedido {order.numero}</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            {order.creado_en ? new Date(order.creado_en).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Estado + Productos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Estado del pedido</h3>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${ESTADO_COLOR[order.estado] || ESTADO_COLOR.pendiente}`}>
                {order.estado_nombre || order.estado}
              </span>
            </div>
            {puedeGestionar ? (
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => {
                  const habilitado = puedeCambiarA(e.key);
                  if (!habilitado) return null;
                  return (
                    <button
                      key={e.key}
                      onClick={() => cambiarEstado(e.key)}
                      disabled={saving || order.estado === e.key}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50 ${
                        order.estado === e.key
                          ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                          : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300"
                      }`}
                    >
                      {e.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No tienes permisos para cambiar el estado de los pedidos.</p>
            )}
          </div>

          {/* Datos de envio: numero de guia y transportadora */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-1 flex items-center gap-2">
              <Truck size={16} className="text-rose-500" /> Datos de envío
            </h3>
            {puedeGestionar ? (
              <>
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-4">
                  Ingresa la empresa transportadora y el número de guía para que el cliente pueda rastrear su pedido.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1.5">
                      Empresa transportadora
                    </label>
                    <input
                      type="text"
                      value={transportadora}
                      onChange={(e) => setTransportadora(e.target.value)}
                      placeholder="Ej: Servientrega, Coordinadora..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text placeholder-gray-400 outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1.5">
                      Número de guía
                    </label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={numeroGuia}
                        onChange={(e) => setNumeroGuia(e.target.value)}
                        placeholder="Ej: 123456789"
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text placeholder-gray-400 outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={guardarGuia}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Guardar guía
                  </button>
                  {guiaSaved && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle size={14} /> Guardado
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-gray-600 dark:text-dark-text-secondary">Transportadora: <strong>{order.empresa_transportadora || "—"}</strong></p>
                <p className="text-gray-600 dark:text-dark-text-secondary">Número de guía: <strong>{order.numero_guia || "—"}</strong></p>
              </div>
            )}
          </div>

          {/* Productos (de mi tienda) */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Productos de tu tienda</h3>
            <div className="space-y-3">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-center flex-shrink-0">
                    <Package size={24} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">{item.nombre_producto}</p>
                    <p className="text-xs text-gray-400">Cantidad: {item.cantidad}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-dark-text">${Number(item.subtotal).toLocaleString("es-CO")}</p>
                    <p className="text-[10px] text-gray-400">${Number(item.precio_unitario).toLocaleString("es-CO")} c/u</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-base font-bold border-t border-gray-100 dark:border-dark-border pt-4">
              <span className="text-gray-900 dark:text-dark-text">Total (tus productos)</span>
              <span className="text-gray-900 dark:text-dark-text">${Number(order.total).toLocaleString("es-CO")}</span>
            </div>
          </div>
        </div>

        {/* Right - Cliente */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
              <User size={16} className="text-rose-500" /> Cliente
            </h3>
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-gray-900 dark:text-dark-text">{order.nombre_contacto || "—"}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-secondary">
                <Phone size={12} /> {order.telefono_contacto || "—"}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-rose-500" /> Dirección de entrega
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{order.direccion_envio || "—"}</p>
            {order.notas && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <p className="text-xs font-medium text-amber-600">Notas:</p>
                <p className="text-xs text-amber-700 mt-0.5">{order.notas}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-3 flex items-center gap-2">
              <CreditCard size={16} className="text-rose-500" /> Método de pago
            </h3>
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{order.metodo_pago || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
