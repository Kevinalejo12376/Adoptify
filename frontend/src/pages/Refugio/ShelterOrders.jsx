import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBag, Search, Package, ChevronDown, ChevronRight,
  Clock, CheckCircle, Truck, XCircle, AlertCircle,
  Eye, Filter, Calendar, DollarSign, MapPin, User,
  Box, TrendingUp, CreditCard, ArrowUp, ArrowDown
} from "lucide-react";

const orderStatuses = [
  { id: "recibido", label: "Recibido", icon: Package, color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  { id: "confirmado", label: "Confirmado", icon: CheckCircle, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  { id: "preparando", label: "Preparando", icon: Clock, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  { id: "enviado", label: "Enviado", icon: Truck, color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" },
  { id: "en_camino", label: "En camino", icon: Truck, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400" },
  { id: "entregado", label: "Entregado", icon: CheckCircle, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  { id: "cancelado", label: "Cancelado", icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
];

const getStatusBadge = (statusId) => {
  const config = orderStatuses.find(s => s.id === statusId) || orderStatuses[0];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

// Sample orders
const initialOrders = [
  {
    id: "ORD-001",
    customer: "Ana López",
    email: "ana@email.com",
    phone: "+57 300 123 4567",
    items: [
      { name: "Collar Premium Ajustable", quantity: 2, price: 100.00 },
      { name: "Juguete Interactivo Kong", quantity: 1, price: 35.00 },
    ],
    date: "15 Jul 2026",
    time: "10:30 AM",
    total: 235.00,
    paymentMethod: "Tarjeta de crédito",
    status: "recibido",
    address: "Cra 15 # 45-67, Bogotá",
    notes: "",
    history: [
      { status: "recibido", date: "15 Jul 2026", time: "10:30 AM", note: "Pedido recibido" },
    ]
  },
  {
    id: "ORD-002",
    customer: "Carlos Ruiz",
    email: "carlos@email.com",
    phone: "+57 301 987 6543",
    items: [
      { name: "Recipiente de Comida Anti-vuelco", quantity: 1, price: 45.00 },
    ],
    date: "14 Jul 2026",
    time: "3:45 PM",
    total: 45.00,
    paymentMethod: "Nequi",
    status: "confirmado",
    address: "Cll 23 # 12-34, Medellín",
    notes: "Entregar en portería",
    history: [
      { status: "recibido", date: "14 Jul 2026", time: "3:45 PM", note: "Pedido recibido" },
      { status: "confirmado", date: "14 Jul 2026", time: "5:20 PM", note: "Pedido confirmado, verificando stock" },
    ]
  },
  {
    id: "ORD-003",
    customer: "María Fernández",
    email: "maria@email.com",
    phone: "+57 302 456 7890",
    items: [
      { name: "Shampoo Natural para Mascotas", quantity: 3, price: 28.00 },
      { name: "Desparasitante Oral", quantity: 2, price: 32.00 },
      { name: "Juguete Interactivo Kong", quantity: 1, price: 35.00 },
    ],
    date: "13 Jul 2026",
    time: "9:15 AM",
    total: 183.00,
    paymentMethod: "Efectivo contra entrega",
    status: "preparando",
    address: "Av. Siempre Viva # 742, Cali",
    notes: "",
    history: [
      { status: "recibido", date: "13 Jul 2026", time: "9:15 AM", note: "Pedido recibido" },
      { status: "confirmado", date: "13 Jul 2026", time: "11:30 AM", note: "Pedido confirmado" },
      { status: "preparando", date: "14 Jul 2026", time: "8:00 AM", note: "Preparando productos" },
    ]
  },
  {
    id: "ORD-004",
    customer: "Pedro Martínez",
    email: "pedro@email.com",
    phone: "+57 303 789 0123",
    items: [
      { name: "Alimento Premium Perro Adulto", quantity: 2, price: 85.00 },
    ],
    date: "12 Jul 2026",
    time: "2:00 PM",
    total: 170.00,
    paymentMethod: "Transferencia bancaria",
    status: "enviado",
    address: "Carrera 50 # 20-30, Barranquilla",
    notes: "Llamar antes de entregar",
    history: [
      { status: "recibido", date: "12 Jul 2026", time: "2:00 PM", note: "Pedido recibido" },
      { status: "confirmado", date: "12 Jul 2026", time: "4:15 PM", note: "Pedido confirmado" },
      { status: "preparando", date: "13 Jul 2026", time: "9:00 AM", note: "Preparando productos" },
      { status: "enviado", date: "14 Jul 2026", time: "10:00 AM", note: "Enviado con Servientrega - Guía #123456" },
    ]
  },
  {
    id: "ORD-005",
    customer: "Laura Gómez",
    email: "laura@email.com",
    phone: "+57 304 567 8901",
    items: [
      { name: "Cama Ortopédica Grande", quantity: 1, price: 120.00 },
      { name: "Cepillo Dental para Mascotas", quantity: 2, price: 18.00 },
    ],
    date: "10 Jul 2026",
    time: "11:30 AM",
    total: 156.00,
    paymentMethod: "Tarjeta débito",
    status: "entregado",
    address: "Cll 8 # 3-45, Bucaramanga",
    notes: "",
    history: [
      { status: "recibido", date: "10 Jul 2026", time: "11:30 AM", note: "Pedido recibido" },
      { status: "confirmado", date: "10 Jul 2026", time: "2:00 PM", note: "Pedido confirmado" },
      { status: "preparando", date: "11 Jul 2026", time: "9:00 AM", note: "Preparando productos" },
      { status: "enviado", date: "12 Jul 2026", time: "11:00 AM", note: "Enviado con Envía - Guía #789012" },
      { status: "en_camino", date: "13 Jul 2026", time: "8:30 AM", note: "En camino a destino" },
      { status: "entregado", date: "14 Jul 2026", time: "3:15 PM", note: "Entregado al cliente" },
    ]
  },
  {
    id: "ORD-006",
    customer: "Roberto Sánchez",
    email: "roberto@email.com",
    phone: "+57 305 678 9012",
    items: [
      { name: "Antipulgas y Garrapatas", quantity: 1, price: 48.00 },
    ],
    date: "8 Jul 2026",
    time: "4:00 PM",
    total: 48.00,
    paymentMethod: "Tarjeta de crédito",
    status: "cancelado",
    address: "Av. Las Américas # 56-78, Pereira",
    notes: "Cliente solicitó cancelación",
    history: [
      { status: "recibido", date: "8 Jul 2026", time: "4:00 PM", note: "Pedido recibido" },
      { status: "cancelado", date: "9 Jul 2026", time: "10:15 AM", note: "Cancelado por solicitud del cliente" },
    ]
  },
];

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-100 dark:border-dark-border">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <span className={`text-2xl font-bold ${color} font-display`}>{value}</span>
    </div>
    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{label}</p>
  </div>
);

export default function ShelterOrders() {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [sortOrder, setSortOrder] = useState("newest");

  // Handle location state updates (from order detail page)
  React.useEffect(() => {
    if (location.state?.updatedOrder) {
      const updated = location.state.updatedOrder;
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === "recibido" || o.status === "confirmado" || o.status === "preparando").length;
  const shippedOrders = orders.filter(o => o.status === "enviado" || o.status === "en_camino").length;
  const deliveredOrders = orders.filter(o => o.status === "entregado").length;

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todas" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortOrder === "newest") return new Date(b.date + " " + b.time) - new Date(a.date + " " + a.time);
    return new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time);
  });

  const statusFilters = [
    { id: "todas", label: "Todas" },
    ...orderStatuses.map(s => ({ id: s.id, label: s.label })),
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="animate-fade-in-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium mb-3 shadow-sm">
              <ShoppingBag className="w-4 h-4" />
              <span>Seguimiento de Pedidos</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Pedidos</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Administra y da seguimiento a los pedidos de tu tienda</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ShoppingBag} label="Total Pedidos" value={totalOrders} color="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-500/10" />
          <StatCard icon={Clock} label="Pendientes" value={pendingOrders} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-500/10" />
          <StatCard icon={Truck} label="En tránsito" value={shippedOrders} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-500/10" />
          <StatCard icon={CheckCircle} label="Entregados" value={deliveredOrders} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-500/10" />
        </div>
      </section>

      {/* Search & Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-border">
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Buscar por # de pedido o cliente..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
            </div>
            <div className="relative sm:w-48">
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none cursor-pointer">
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(({ id, label }) => (
              <button key={id} onClick={() => setStatusFilter(statusFilter === id ? "todas" : id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === id
                    ? "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400"
                    : "bg-gray-50 dark:bg-dark-border/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Orders Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-rose-400 dark:text-rose-400/60" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">No hay pedidos</h3>
            <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
              {searchTerm || statusFilter !== "todas"
                ? "No se encontraron pedidos con los filtros actuales"
                : "Aún no has recibido ningún pedido"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, idx) => (
              <div key={order.id}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-dark-border overflow-hidden animate-fade-in-up cursor-pointer group"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => navigate(`/refugio/pedidos/${order.id}`, { state: { order } })}>
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white font-display">{order.id}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500 dark:text-dark-text-secondary flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {order.customer}
                          </span>
                          <span className="text-sm text-gray-400 dark:text-dark-text-secondary hidden sm:flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {order.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:text-right">
                      <div>
                        <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-display">${order.total.toFixed(2)}</span>
                        <p className="text-xs text-gray-400 dark:text-dark-text-secondary">{order.items.length} producto(s)</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {order.items.map((item, i) => (
                      <span key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 dark:bg-dark-border/50 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-dark-border">
                        <Box className="w-3 h-3" />
                        {item.name} x{item.quantity}
                      </span>
                    ))}
                  </div>

                  {/* Payment & Delivery Info */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-dark-border/50">
                    <span className="text-xs text-gray-400 dark:text-dark-text-secondary flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> {order.paymentMethod}
                    </span>
                    {order.address && (
                      <span className="text-xs text-gray-400 dark:text-dark-text-secondary flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {order.address}
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/refugio/pedidos/${order.id}`, { state: { order } }); }}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all">
                      <Eye className="w-3.5 h-3.5" /> Ver detalle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
