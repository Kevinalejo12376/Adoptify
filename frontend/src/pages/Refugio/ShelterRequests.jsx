import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, Search, Calendar, Clock, User, Dog, Cat, Filter,
  ChevronDown, Eye, MessageSquare, CheckCircle, XCircle, AlertCircle,
  ChevronRight, Phone, Mail, MapPin, Heart, ArrowLeft,
  Shield, Star, Home, Users, Activity, X, RefreshCw, Sparkles, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import ConfirmModal from "../../components/ConfirmModal";
import { solicitudesRecibidas, actualizarEstado } from "../../api/solicitudes";

const statuses = ["todas", "pendiente", "en revisión", "contactado", "finalizada", "cerrada"];

const getStatusConfig = (status) => {
  const config = {
    "pendiente": { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400", icon: Clock, bg: "bg-yellow-50 dark:bg-yellow-500/5", ring: "ring-yellow-500/30" },
    "en revisión": { color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400", icon: AlertCircle, bg: "bg-blue-50 dark:bg-blue-500/5", ring: "ring-blue-500/30" },
    "contactado": { color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400", icon: MessageSquare, bg: "bg-purple-50 dark:bg-purple-500/5", ring: "ring-purple-500/30" },
    "cerrada": { color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400", icon: XCircle, bg: "bg-gray-50 dark:bg-gray-500/5", ring: "ring-gray-500/30" },
    "finalizada": { color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400", icon: Heart, bg: "bg-green-50 dark:bg-green-500/5", ring: "ring-green-500/30" },
  };
  return config[status] || config["pendiente"];
};

const StatusBadge = ({ status }) => {
  const c = getStatusConfig(status);
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.color} shadow-sm`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const StatsCard = ({ status, count, isActive, onClick }) => {
  const c = getStatusConfig(status);
  const Icon = c.icon;
  return (
    <button onClick={onClick}
      className={`relative overflow-hidden rounded-xl p-3.5 text-center transition-all duration-300 hover:scale-[1.03] active:scale-95 ${
        isActive ? `${c.bg} ${c.ring} ring-2 ring-offset-2 dark:ring-offset-dark-bg shadow-lg` : 'bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border hover:shadow-md'
      }`}>
      <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mx-auto mb-2`}>
        <Icon className={`w-5 h-5 ${c.color.split(' ')[1]}`} />
      </div>
      <p className={`text-xl font-bold font-display ${c.color.split(' ')[1]}`}>{count}</p>
      <p className={`text-[11px] font-medium mt-0.5 ${c.color.split(' ')[1]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </p>
    </button>
  );
};

export default function ShelterRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ isOpen: false, requestId: null, newStatus: null });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await solicitudesRecibidas();
      setRequests(data.map((s) => ({
        id: s.id,
        user: s.nombre_contacto,
        email: s.email_contacto || "",
        phone: s.telefono_contacto || "",
        pet: s.mascota_nombre || `Mascota #${s.mascota_id}`,
        petType: s.mascota_tipo || "Perro",
        status: (s.estado || "pendiente").replace("_", " "),
        date: s.creada_en ? new Date(s.creada_en).toLocaleDateString("es-CO") : "",
        time: s.creada_en ? new Date(s.creada_en).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "",
        message: s.mensaje || "",
        location: s.ubicacion || "",
        hasFamily: s.tiene_familia,
        hasExperience: s.tiene_experiencia,
        notas: s.notas || "",
      })));
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las solicitudes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.user.toLowerCase().includes(searchTerm.toLowerCase()) || req.pet.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todas" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (id, newStatus) => {
    // Normaliza el estado para el backend (quita espacios, usa guion bajo)
    const estadoBackend = newStatus.replace(" ", "_");
    try {
      await actualizarEstado(id, estadoBackend);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedRequest?.id === id) {
        setSelectedRequest((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (e) {
      setError(e?.message || "No se pudo actualizar el estado");
    }
  };

  const handleStatusChange = (id, newStatus) => {
    // For critical status changes, show confirmation
    if (newStatus === "cerrada" || newStatus === "finalizada") {
      setConfirmAction({ isOpen: true, requestId: id, newStatus });
    } else {
      updateStatus(id, newStatus);
    }
  };

  const executeStatusChange = () => {
    if (confirmAction.requestId && confirmAction.newStatus) {
      updateStatus(confirmAction.requestId, confirmAction.newStatus);
    }
    setConfirmAction({ isOpen: false, requestId: null, newStatus: null });
  };

  const openDetail = (req) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
  };

  const getConfirmationConfig = (newStatus) => {
    if (newStatus === "cerrada") {
      return {
        title: "¿Cerrar solicitud?",
        message: "La solicitud será cerrada. Esta acción no se puede deshacer.",
        type: "danger",
        confirmText: "Cerrar solicitud"
      };
    }
    if (newStatus === "finalizada") {
      return {
        title: "¿Finalizar solicitud?",
        message: "La solicitud será marcada como finalizada (adopción completada). Esta acción no se puede deshacer.",
        type: "warning",
        confirmText: "Finalizar"
      };
    }
    return {
      title: "¿Cambiar estado?",
      message: `¿Estás seguro de cambiar el estado a "${newStatus}"?`,
      type: "info",
      confirmText: "Cambiar"
    };
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="animate-fade-in-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 rounded-full text-sm font-medium mb-3 shadow-sm">
              <ClipboardList className="w-4 h-4" />
              <span>Solicitudes de Adopción</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Solicitudes</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Revisa y gestiona las solicitudes de adopción recibidas</p>
          </div>
          <div className="flex items-center gap-3 animate-fade-in-right">
            <div className="text-right bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 px-5 py-3 rounded-xl border border-rose-100/50 dark:border-rose-500/10">
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-display">{requests.length}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Total solicitudes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statuses.filter(s => s !== "todas").map((status) => {
            const count = requests.filter(r => r.status === status).length;
            return (
              <StatsCard
                key={status}
                status={status}
                count={count}
                isActive={statusFilter === status}
                onClick={() => setStatusFilter(statusFilter === status ? "todas" : status)}
              />
            );
          })}
        </div>
      </section>

      {/* Search & Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Buscar por usuario o mascota..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative sm:w-52">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none cursor-pointer">
                <option value="todas">Todos los estados</option>
                {statuses.filter(s => s !== "todas").map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Active filter indicator */}
          {statusFilter !== "todas" && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
                <Filter className="w-3 h-3" />
                {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <button onClick={() => setStatusFilter("todas")} className="ml-1 hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
              <button onClick={() => setStatusFilter("todas")} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Limpiar filtro
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Requests List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
            <p>Cargando solicitudes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
              <ClipboardList className="w-10 h-10 text-rose-400 dark:text-rose-400/60" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">
              {searchTerm ? "Sin resultados" : "No hay solicitudes"}
            </h3>
            <p className="text-gray-500 dark:text-dark-text-secondary">
              {searchTerm
                ? "No se encontraron solicitudes con los criterios de búsqueda."
                : statusFilter !== "todas"
                  ? `No hay solicitudes en estado "${statusFilter}".`
                  : "Aún no has recibido solicitudes de adopción."}
            </p>
            {(searchTerm || statusFilter !== "todas") && (
              <button onClick={() => { setSearchTerm(""); setStatusFilter("todas"); }}
                className="mt-4 px-5 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all">
                <RefreshCw className="w-4 h-4 inline mr-1" />
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req, idx) => {
              const c = getStatusConfig(req.status);
              const Icon = c.icon;
              return (
                <div key={req.id} className="group bg-white dark:bg-dark-card rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border border-gray-100 dark:border-dark-border animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                        {req.user.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                          {req.user}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{req.location}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-dark-border" />
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{req.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pet Info */}
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border shrink-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${req.petType === "Perro" ? "bg-rose-50 dark:bg-rose-500/10" : "bg-amber-50 dark:bg-amber-500/10"}`}>
                        {req.petType === "Perro" ? (
                          <Dog className="w-4 h-4 text-rose-500" />
                        ) : (
                          <Cat className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{req.pet}</span>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      <StatusBadge status={req.status} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openDetail(req)}
                        className="px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        Ver detalle
                      </button>
                      <div className="relative group/dropdown">
                        <button className="px-3.5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark-bg/50 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-all flex items-center gap-1.5 border border-gray-100 dark:border-dark-border">
                          <ChevronDown className="w-4 h-4" />
                          Estado
                        </button>
                        <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-dark-border opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all duration-200 z-50 py-1.5 overflow-hidden">
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Cambiar a:</div>
                          {statuses.filter(s => s !== "todas" && s !== req.status).map((s) => {
                            const sc = getStatusConfig(s);
                            const SIcon = sc.icon;
                            return (
                              <button key={s} onClick={() => handleStatusChange(req.id, s)}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                                <div className={`w-6 h-6 rounded-lg ${sc.bg} flex items-center justify-center`}>
                                  <SIcon className={`w-3.5 h-3.5 ${sc.color.split(' ')[1]}`} />
                                </div>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowDetailModal(false); setSelectedRequest(null); } }}>
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modal-content" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border rounded-t-3xl">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <button onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                  </button>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                    {selectedRequest.user.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">{selectedRequest.user}</h2>
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Solicitud #{selectedRequest.id} · {selectedRequest.date}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info Grid */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-100/50 dark:border-blue-500/10">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Email</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedRequest.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-100/50 dark:border-emerald-500/10">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium">Teléfono</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedRequest.phone}</p>
                  </div>
                </div>
              </div>

              {/* Pet & Date Info */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border border-rose-100/50 dark:border-rose-500/10">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedRequest.petType === "Perro" ? "bg-rose-100 dark:bg-rose-500/20" : "bg-amber-100 dark:bg-amber-500/20"}`}>
                    {selectedRequest.petType === "Perro" ? (
                      <Dog className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <Cat className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Mascota solicitada</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedRequest.pet}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 dark:from-dark-bg/50 dark:to-dark-bg/50 border border-gray-100 dark:border-dark-border">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Fecha y hora</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedRequest.date} - {selectedRequest.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 dark:from-dark-bg/50 dark:to-dark-bg/50 border border-gray-100 dark:border-dark-border">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Ubicación</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedRequest.location}</p>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-500" />
                  Mensaje del solicitante
                </h3>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>"{selectedRequest.message}"</p>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  Información del solicitante
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border ${
                    selectedRequest.hasFamily
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                      : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                  }`}>
                    <Home className="w-3.5 h-3.5" />
                    {selectedRequest.hasFamily ? 'Tiene familia' : 'Sin familia'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border ${
                    selectedRequest.hasExperience
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                      : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                  }`}>
                    <Star className="w-3.5 h-3.5" />
                    {selectedRequest.hasExperience ? 'Con experiencia' : 'Sin experiencia'}
                  </span>
                </div>
              </div>

              {/* Quick Status Actions */}
              <div className="border-t border-gray-100 dark:border-dark-border pt-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" />
                  Cambiar estado
                </h3>
                <div className="flex flex-wrap gap-2">
                  {statuses.filter(s => s !== "todas" && s !== selectedRequest.status).map((s) => {
                    const sc = getStatusConfig(s);
                    const SIcon = sc.icon;
                    const isDestructive = s === "cerrada";
                    return (
                      <button key={s} onClick={() => handleStatusChange(selectedRequest.id, s)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm ${
                          isDestructive
                            ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20'
                            : `${sc.color} border border-transparent`
                        }`}>
                        <SIcon className="w-4 h-4" />
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border p-4 flex justify-end rounded-b-3xl">
              <button onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                className="px-6 py-2.5 text-gray-600 dark:text-gray-400 font-medium rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg transition-all text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for critical status changes */}
      <ConfirmModal
        isOpen={confirmAction.isOpen}
        onClose={() => setConfirmAction({ isOpen: false, requestId: null, newStatus: null })}
        onConfirm={executeStatusChange}
        title={getConfirmationConfig(confirmAction.newStatus).title}
        message={getConfirmationConfig(confirmAction.newStatus).message}
        confirmText={getConfirmationConfig(confirmAction.newStatus).confirmText}
        cancelText="Cancelar"
        type={getConfirmationConfig(confirmAction.newStatus).type}
      />
    </div>
  );
}
