import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Package, User, Calendar, Clock, DollarSign,
  MapPin, CreditCard, Phone, Mail, Box, CheckCircle,
  ShoppingBag, Truck, XCircle, AlertCircle, ClipboardList,
  ChevronRight, MessageSquare, Sparkles, Store
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

const orderStatuses = [
  { id: "recibido", label: "Pedido recibido", icon: Package, description: "Hemos recibido tu pedido y estamos revisándolo" },
  { id: "confirmado", label: "Pedido confirmado", icon: CheckCircle, description: "El pedido ha sido confirmado y está en proceso" },
  { id: "preparando", label: "Preparando pedido", icon: Clock, description: "Estamos preparando tus productos" },
  { id: "enviado", label: "Enviado", icon: Truck, description: "El paquete ha sido despachado" },
  { id: "en_camino", label: "En camino", icon: Truck, description: "El paquete está en ruta hacia tu dirección" },
  { id: "entregado", label: "Entregado", icon: CheckCircle, description: "El pedido ha sido entregado exitosamente" },
];

const getStatusColor = (statusId) => {
  const colors = {
    recibido: "blue",
    confirmado: "indigo",
    preparando: "amber",
    enviado: "purple",
    en_camino: "cyan",
    entregado: "emerald",
    cancelado: "red",
  };
  return colors[statusId] || "gray";
};

const getStatusIcon = (statusId) => {
  const status = orderStatuses.find(s => s.id === statusId);
  return status?.icon || XCircle;
};

const getStatusIndex = (statusId) => {
  return orderStatuses.findIndex(s => s.id === statusId);
};

export default function ShelterOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state?.order;

  const [order, setOrder] = useState(orderData);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [updateNote, setUpdateNote] = useState("");

  if (!order) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <Package className="w-10 h-10 text-rose-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Pedido no encontrado</h3>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-6">No se pudo cargar la información de este pedido.</p>
          <button onClick={() => navigate("/refugio/pedidos")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg">
            <ArrowLeft className="w-4 h-4" /> Volver a pedidos
          </button>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const isCanceled = order.status === "cancelado";

  const availableNextStatuses = () => {
    if (isCanceled) return [];
    const allStatuses = [...orderStatuses];
    const currentIdx = getStatusIndex(order.status);
    return allStatuses.filter((s, idx) => idx === currentIdx + 1 || idx === currentIdx);
  };

  const handleStatusUpdate = () => {
    if (!selectedStatus) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const newHistoryEntry = {
      status: selectedStatus.id,
      date: dateStr,
      time: timeStr,
      note: updateNote || selectedStatus.description,
    };

    const updatedOrder = {
      ...order,
      status: selectedStatus.id,
      history: [...order.history, newHistoryEntry],
    };

    setOrder(updatedOrder);
    setShowStatusModal(false);
    setSelectedStatus(null);
    setUpdateNote("");

    // Update parent list via location state
    navigate(`/refugio/pedidos/${order.id}`, { state: { order: updatedOrder }, replace: true });
  };

  const handleCancelOrder = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const updatedOrder = {
      ...order,
      status: "cancelado",
      history: [...order.history, {
        status: "cancelado",
        date: dateStr,
        time: timeStr,
        note: updateNote || "Pedido cancelado",
      }],
    };

    setOrder(updatedOrder);
    setShowStatusModal(false);
    setSelectedStatus(null);
    setUpdateNote("");
    navigate(`/refugio/pedidos/${order.id}`, { state: { order: updatedOrder }, replace: true });
  };

  const openStatusModal = (status) => {
    setSelectedStatus(status);
    setUpdateNote("");
    setShowStatusModal(true);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-left">
          <div>
            <button onClick={() => navigate("/refugio/pedidos", { state: { updatedOrder: order } })}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3 group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Volver a pedidos
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">{order.id}</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-rose-100 to-amber-100 dark:from-rose-500/15 dark:to-amber-500/15 text-rose-700 dark:text-rose-300">
                {order.items.length} producto(s)
              </span>
            </div>
            <p className="text-gray-500 dark:text-dark-text-secondary mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {order.date} - {order.time}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Timeline & Products */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-6 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-rose-500" />
                Seguimiento del Pedido
              </h3>

              {/* Canceled Banner */}
              {isCanceled && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Pedido cancelado</p>
                    <p className="text-xs text-red-500 dark:text-red-400/80">Este pedido fue cancelado y no se puede modificar.</p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="relative">
                {orderStatuses.map((status, idx) => {
                  const statusIdx = getStatusIndex(status.id);
                  const isCompleted = statusIdx <= currentStatusIndex && !isCanceled;
                  const isCurrent = statusIdx === currentStatusIndex && !isCanceled;
                  const isFuture = statusIdx > currentStatusIndex || isCanceled;
                  const Icon = status.icon;

                  // Check if this status has a history entry
                  const historyEntry = order.history.find(h => h.status === status.id);

                  return (
                    <div key={status.id} className="relative flex gap-4 pb-8 last:pb-0">
                      {/* Timeline Line */}
                      {idx < orderStatuses.length - 1 && (
                        <div className={`absolute left-[19px] top-9 w-0.5 h-full -translate-x-1/2 ${
                          isCompleted ? "bg-emerald-300 dark:bg-emerald-500/50" : "bg-gray-200 dark:bg-dark-border"
                        }`} />
                      )}

                      {/* Status Icon */}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : isCurrent
                            ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-4 ring-amber-50 dark:ring-amber-500/10"
                            : "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Status Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-sm font-bold ${
                            isCompleted
                              ? "text-emerald-700 dark:text-emerald-400"
                              : isCurrent
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-gray-400 dark:text-gray-500"
                          }`}>
                            {status.label}
                          </h4>
                          {historyEntry && (
                            <span className="text-xs text-gray-400 dark:text-dark-text-secondary shrink-0">
                              {historyEntry.date} - {historyEntry.time}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${
                          isCompleted || isCurrent
                            ? "text-gray-500 dark:text-dark-text-secondary"
                            : "text-gray-300 dark:text-gray-600"
                        }`}>
                          {historyEntry?.note || status.description}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Canceled Status */}
                {isCanceled && (
                  <div className="relative flex gap-4 pt-2">
                    <div className="relative z-10 w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400 ring-4 ring-red-50 dark:ring-red-500/10">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h4 className="text-sm font-bold text-red-700 dark:text-red-400">Cancelado</h4>
                      {order.history.filter(h => h.status === "cancelado").map((entry, i) => (
                        <p key={i} className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                          {entry.note} - {entry.date} {entry.time}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Update Status Button */}
              {!isCanceled && currentStatusIndex < orderStatuses.length - 1 && (
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
                  <div className="flex flex-wrap gap-2">
                    {orderStatuses.slice(currentStatusIndex, currentStatusIndex + 2).map((status) => (
                      <button key={status.id}
                        onClick={() => openStatusModal(status)}
                        disabled={status.id === order.status}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          status.id === order.status
                            ? "bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-lg shadow-rose-200 dark:shadow-rose-500/20 hover:shadow-xl active:scale-95"
                        }`}>
                        <status.icon className="w-4 h-4" />
                        Avanzar a: {status.label}
                      </button>
                    ))}
                    {currentStatusIndex < orderStatuses.length - 1 && (
                      <button onClick={() => openStatusModal({ id: "cancelado", label: "Cancelar pedido" })}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95">
                        <XCircle className="w-4 h-4" />
                        Cancelar pedido
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Products */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-rose-500" />
                Productos Adquiridos
              </h3>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center shrink-0">
                        <Box className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Cantidad: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Details */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-rose-500" />
                Información del Comprador
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-bg/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {order.customer.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{order.customer}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Cliente</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                  <Mail className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{order.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                  <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{order.phone}</span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                Resumen del Pedido
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-dark-text-secondary">Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">${order.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-dark-text-secondary">Envío</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Gratis</span>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-display">${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Delivery */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Pago y Entrega
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-gray-500 dark:text-dark-text-secondary">Método de pago:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{order.paymentMethod}</span>
                </div>
                {order.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-gray-500 dark:text-dark-text-secondary">Dirección de entrega:</span>
                      <p className="font-semibold text-gray-900 dark:text-white">{order.address}</p>
                    </div>
                  </div>
                )}
                {order.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-gray-500 dark:text-dark-text-secondary">Observaciones:</span>
                      <p className="font-semibold text-gray-900 dark:text-white">{order.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History Log */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                Historial de Cambios
              </h3>
              <div className="space-y-3">
                {[...order.history].reverse().map((entry, idx) => {
                  const Icon = getStatusIcon(entry.status);
                  const color = getStatusColor(entry.status);
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-${color}-50 dark:bg-${color}-500/10`}>
                        <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {orderStatuses.find(s => s.id === entry.status)?.label || entry.status}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{entry.note}</p>
                        <p className="text-[11px] text-gray-400 dark:text-dark-text-secondary mt-0.5">
                          {entry.date} - {entry.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Status Update Modal */}
      <ConfirmModal
        isOpen={showStatusModal}
        onClose={() => { setShowStatusModal(false); setSelectedStatus(null); setUpdateNote(""); }}
        onConfirm={selectedStatus?.id === "cancelado" ? handleCancelOrder : handleStatusUpdate}
        title={selectedStatus?.id === "cancelado" ? "¿Cancelar pedido?" : `¿Avanzar a "${selectedStatus?.label}"?`}
        message={
          selectedStatus?.id === "cancelado"
            ? "¿Estás seguro de cancelar este pedido? Esta acción no se puede deshacer."
            : `El pedido ${order.id} pasará al estado "${selectedStatus?.label}". ¿Deseas continuar?`
        }
        confirmText={selectedStatus?.id === "cancelado" ? "Sí, cancelar" : "Sí, actualizar"}
        cancelText="Volver"
        type={selectedStatus?.id === "cancelado" ? "danger" : "info"}
      />
    </div>
  );
}
