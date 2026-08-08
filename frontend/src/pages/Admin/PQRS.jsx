import { useState, useEffect, useCallback } from "react";
import {
  Loader2, CheckCircle, MessageSquare, FileText, AlertCircle, HelpCircle, ThumbsUp,
  Clock, Check, Calendar, Mail, Search, Filter, ChevronDown, X,
  Building2, Send, Paperclip, ShieldCheck,
} from "lucide-react";
import DataTable from "../../components/admin/DataTable";
import {
  listarPqrs, actualizarPqrs,
  listarPqrsTiendas, obtenerPqrsTienda, cambiarEstadoPqrsTienda, responderPqrsTienda,
} from "../../api/admin";

const ESTADOS = ["pendiente", "en_proceso", "resuelto", "cerrado"];
const TIPOS = {
  peticion: { label: "Petici\u00f3n", icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  queja: { label: "Queja", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  reclamo: { label: "Reclamo", icon: HelpCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  sugerencia: { label: "Sugerencia", icon: ThumbsUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
};

const ESTADO_CONFIG = {
  pendiente: {
    label: "Pendiente",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: Clock,
  },
  en_proceso: {
    label: "En proceso",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    dot: "bg-blue-500",
    icon: Loader2,
  },
  resuelto: {
    label: "Resuelto",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  cerrado: {
    label: "Cerrado",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
    dot: "bg-gray-400",
    icon: Check,
  },
};

// ===== BADGE DE TIPO =====
function TipoBadge({ tipo }) {
  const config = TIPOS[tipo] || { label: tipo, icon: HelpCircle, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-500/10" };
  const Icono = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.color}`}>
      <Icono size={12} />
      {config.label}
    </span>
  );
}

// ===== BADGE DE ESTADO =====
function EstadoBadge({ estado }) {
  const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  const Icono = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color}`}>
      <Icono size={12} className={config.dot.replace("bg-", "text-")} />
      {config.label}
    </span>
  );
}

// ===== MODAL DE DETALLE PQRS =====
function PqrsDetailModal({ item, onClose, onResponder, onCambiarEstado }) {
  if (!item) return null;

  const tipoConfig = TIPOS[item.tipo] || { icon: HelpCircle, color: "text-gray-500", bg: "bg-gray-50" };
  const TipoIcono = tipoConfig.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-overlay" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-card rounded-2xl shadow-2xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-24 bg-gradient-to-r from-rose-500 to-amber-500 rounded-t-2xl" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="px-6 pb-6 -mt-8">
          <div className="flex items-end gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl ${tipoConfig.bg} flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-dark-card`}>
              <TipoIcono size={24} className={tipoConfig.color} />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text truncate">
                  {item.asunto || "Sin asunto"}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <TipoBadge tipo={item.tipo} />
                <EstadoBadge estado={item.estado} />
                {item.creado_en && (
                  <span className="text-xs text-gray-400 dark:text-dark-text-secondary flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(item.creado_en).toLocaleDateString("es-CO", {
                      year: "numeric", month: "long", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary mb-2">
              Mensaje del usuario
            </p>
            <div className="p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-xl border border-gray-100 dark:border-dark-border">
              <p className="text-sm text-gray-700 dark:text-dark-text leading-relaxed whitespace-pre-wrap">
                {item.mensaje || "Sin contenido"}
              </p>
            </div>
            {item.email_usuario && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
                <Mail size={12} />
                {item.email_usuario}
              </div>
            )}
          </div>

          {item.respuesta && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary mb-2">
                Respuesta
              </p>
              <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 rounded-xl border border-rose-100 dark:border-rose-500/10">
                <p className="text-sm text-gray-700 dark:text-dark-text leading-relaxed whitespace-pre-wrap">
                  {item.respuesta}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-dark-border">
            {item.estado !== "cerrado" && item.estado !== "resuelto" && (
              <button
                onClick={() => { onResponder(item); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-200 text-sm"
              >
                <MessageSquare size={15} />
                Responder
              </button>
            )}
            {item.estado === "pendiente" && (
              <button
                onClick={() => { onCambiarEstado(item.id, "en_proceso"); onClose(); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm border border-blue-200 dark:border-blue-500/20 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <Loader2 size={15} />
                En proceso
              </button>
            )}
            {item.estado !== "cerrado" && (
              <button
                onClick={() => { onCambiarEstado(item.id, "cerrado"); onClose(); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm border border-gray-200 dark:border-gray-600/20 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500/10"
              >
                <Check size={15} />
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MODAL DE RESPUESTA =====
function ResponderModal({ item, onClose, onGuardar, guardando }) {
  const [respuesta, setRespuesta] = useState(item?.respuesta || "");

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-overlay" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
              <MessageSquare size={18} className="text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Responder PQRS</h3>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{item.asunto}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-dark-bg/50 rounded-xl text-sm text-gray-600 dark:text-dark-text-secondary max-h-32 overflow-y-auto">
            {item.mensaje}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-dark-text-secondary mb-1.5">
              Tu respuesta
            </label>
            <textarea
              rows={5}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none text-gray-900 dark:text-dark-text placeholder-gray-400"
              placeholder="Escribe tu respuesta detallada..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onGuardar(respuesta)}
              disabled={guardando || !respuesta.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-200 text-sm disabled:opacity-60"
            >
              {guardando ? (
                <><Loader2 size={15} className="animate-spin" /> Respondiendo...</>
              ) : (
                <><MessageSquare size={15} /> Responder y resolver</>
              )}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all duration-200 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PQRS DE TIENDAS ALIADAS (gestion por Administradores de Adoptify)
// ============================================================
const ESTADOS_TIENDA = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", dot: "bg-amber-500", icon: Clock },
  en_revision: { label: "En revisión", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400", dot: "bg-blue-500", icon: Loader2 },
  finalizado: { label: "Finalizado", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", dot: "bg-emerald-500", icon: CheckCircle },
};

function EstadoTiendaBadge({ estado }) {
  const config = ESTADOS_TIENDA[estado] || ESTADOS_TIENDA.pendiente;
  const Icono = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color}`}>
      <Icono size={12} /> {config.label}
    </span>
  );
}

function PqrsTiendaDetailModal({ item, onClose, onEstado, onResponder }) {
  const [respuesta, setRespuesta] = useState("");
  const [estadoSel, setEstadoSel] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!item) return null;

  const tipoConfig = TIPOS[item.tipo] || { icon: HelpCircle, color: "text-gray-500", bg: "bg-gray-50" };
  const TipoIcono = tipoConfig.icon;

  const enviar = async () => {
    if (!respuesta.trim()) return;
    setGuardando(true);
    try {
      await onResponder(item.id, { mensaje: respuesta.trim(), estado: estadoSel || undefined });
      setRespuesta("");
      setEstadoSel("");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-dark-card rounded-2xl shadow-2xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-24 bg-gradient-to-r from-rose-500 to-amber-500 rounded-t-2xl" />
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <X size={16} />
        </button>

        <div className="px-6 pb-6 -mt-8">
          <div className="flex items-end gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl ${tipoConfig.bg} flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-dark-card`}>
              <TipoIcono size={24} className={tipoConfig.color} />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text truncate">{item.asunto || "Sin asunto"}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <TipoBadge tipo={item.tipo} />
                <EstadoTiendaBadge estado={item.estado} />
                <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Building2 size={12} /> {item.tienda_nombre || "Tienda"}</span>
              </div>
            </div>
          </div>

          {/* Conversacion */}
          <div className="mb-4 space-y-3 max-h-64 overflow-y-auto pr-1">
            {(item.mensajes || []).map((m) => {
              const esTienda = m.rol_remitente === "tienda";
              return (
                <div key={m.id} className={`flex ${esTienda ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    esTienda
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                      : "bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-800 dark:text-dark-text"
                  }`}>
                    <div className={`flex items-center gap-1.5 mb-1 text-xs font-semibold ${esTienda ? "text-white/90" : "text-gray-400"}`}>
                      {esTienda ? <Building2 size={12} /> : <ShieldCheck size={12} />}
                      {m.nombre_remitente || (esTienda ? "Tienda" : "Adoptify")}
                      {m.creado_en && <span className="font-normal opacity-70">· {new Date(m.creado_en).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.mensaje}</p>
                  </div>
                </div>
              );
            })}
            {(item.adjuntos || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(item.adjuntos || []).map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-text-secondary text-xs hover:bg-gray-200 dark:hover:bg-dark-bg transition-colors">
                    <Paperclip size={12} /> {a.nombre_archivo || "Adjunto"}
                  </a>
                ))}
              </div>
            )}
          </div>

          {item.estado !== "finalizado" && (
            <div className="border-t border-gray-100 dark:border-dark-border pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-dark-text-secondary mb-1.5">Cambiar estado</label>
                  <select
                    value={estadoSel}
                    onChange={(e) => setEstadoSel(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="">Mantener estado actual</option>
                    {Object.keys(ESTADOS_TIENDA).map((k) => <option key={k} value={k}>{ESTADOS_TIENDA[k].label}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => { onEstado(item.id, "en_revision"); }}
                  className="self-end px-4 py-2.5 text-sm font-semibold rounded-xl border border-blue-200 dark:border-blue-500/20 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                >
                  En revisión
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-dark-text-secondary mb-1.5">Tu respuesta</label>
                <textarea
                  rows={4}
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                  placeholder="Escribe la respuesta de Adoptify..."
                />
                <button
                  onClick={enviar}
                  disabled={guardando || !respuesta.trim()}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-200 text-sm disabled:opacity-60"
                >
                  {guardando ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : <><Send size={15} /> Responder y notificar a la tienda</>}
                </button>
              </div>
            </div>
          )}

          {item.estado === "finalizado" && (
            <div className="text-center text-sm text-emerald-600 dark:text-emerald-400 py-3">
              PQRS finalizada por Adoptify.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPqrsTiendas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listarPqrsTiendas({ estado: filtroEstado || undefined, busqueda: busqueda || undefined });
      setItems(data || []);
    } catch (e) { setError(e?.message || "Error al cargar las PQRS de tiendas"); }
    finally { setLoading(false); }
  }, [filtroEstado, busqueda]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const abrirDetalle = async (item) => {
    setSelected(item);
    // Si falla la carga del detalle se mantiene el item de la lista.
    obtenerPqrsTienda(item.id).then(setSelected).catch(() => {});
  };

  const handleEstado = async (id, estado) => {
    try { await cambiarEstadoPqrsTienda(id, estado); await cargar(); if (selected) abrirDetalle(selected); }
    catch (e) { setError(e?.message); }
  };

  const handleResponder = async (id, payload) => {
    await responderPqrsTienda(id, payload);
    await cargar();
    if (selected) abrirDetalle(selected);
  };

  const contarEstado = (estado) => items.filter((i) => i.estado === estado).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(ESTADOS_TIENDA).map(([estado, config]) => {
          const Icono = config.icon;
          const activo = filtroEstado === estado;
          return (
            <button key={estado} onClick={() => setFiltroEstado(activo ? "" : estado)}
              className={`bg-white dark:bg-dark-card rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                activo ? "border-rose-300 dark:border-rose-500/30 ring-1 ring-rose-200 dark:ring-rose-500/20" : "border-gray-100 dark:border-dark-border"
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                  <Icono size={18} />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-gray-900 dark:text-dark-text">{contarEstado(estado)}</p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{config.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por asunto, tienda o descripción..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
          />
        </div>
        {(filtroEstado || busqueda) && (
          <button onClick={() => { setFiltroEstado(""); setBusqueda(""); }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-xl text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
          <p className="text-sm">Cargando PQRS de tiendas...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Tienda</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Asunto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Fecha</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-dark-border transition-colors cursor-pointer" onClick={() => abrirDetalle(item)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                          <Building2 size={14} className="text-rose-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">{item.tienda_nombre || "—"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-text font-medium">{item.asunto}</td>
                    <td className="px-4 py-3"><TipoBadge tipo={item.tipo} /></td>
                    <td className="px-4 py-3"><EstadoTiendaBadge estado={item.estado} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.creado_en ? new Date(item.creado_en).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button onClick={(e) => { e.stopPropagation(); abrirDetalle(item); }}
                          className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
                          {item.estado === "pendiente" ? "Responder" : "Ver"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
                      <p className="text-sm text-gray-400">No hay PQRS de tiendas.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PqrsTiendaDetailModal item={selected} onClose={() => setSelected(null)} onEstado={handleEstado} onResponder={handleResponder} />
    </div>
  );
}

// ===== COMPONENTE PRINCIPAL =====
export default function AdminPQRS() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [responderItem, setResponderItem] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState("usuarios");

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await listarPqrs()); }
    catch (e) { setError(e?.message || "Error al cargar PQRS"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleEstado = async (id, estado) => {
    try { await actualizarPqrs(id, { estado }); await cargar(); }
    catch (e) { setError(e?.message); }
  };

  const handleResponder = async () => {
    if (!responderItem || !respuesta.trim()) return;
    setGuardando(true);
    try {
      await actualizarPqrs(responderItem.id, { estado: "resuelto", respuesta });
      setResponderItem(null); setRespuesta(""); await cargar();
    } catch (e) { setError(e?.message); }
    finally { setGuardando(false); }
  };

  const itemsFiltrados = items.filter((item) => {
    if (filtroTipo !== "todos" && item.tipo !== filtroTipo) return false;
    if (filtroEstado !== "todos" && item.estado !== filtroEstado) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      return (
        (item.asunto || "").toLowerCase().includes(q) ||
        (item.mensaje || "").toLowerCase().includes(q) ||
        (item.email_usuario || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const contarEstado = (estado) => items.filter((i) => i.estado === estado).length;

  const columnas = [
    { key: "tipo", titulo: "Tipo", render: (v) => TIPOS[v] || v, ordenable: true },
    { key: "asunto", titulo: "Asunto", ordenable: true },
    { key: "estado", titulo: "Estado", tipo: "badge", ordenable: true },
    { key: "creado_en", titulo: "Fecha", tipo: "fecha", ordenable: true },
    {
      key: "acciones", titulo: "Acciones", tipo: "render", ordenable: false, className: "text-right",
      render: (_, f) => (
        <div className="flex gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); setSelected(f); setRespuesta(f.respuesta || ""); }}
            className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
            {f.respuesta ? "Ver" : "Responder"}
          </button>
          {f.estado !== "cerrado" && (
            <button onClick={(e) => { e.stopPropagation(); handleEstado(f.id, "cerrado"); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cerrar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tabs: PQRS de usuarios / PQRS de tiendas aliadas */}
      <div className="inline-flex items-center gap-1 p-1 bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border">
        <button type="button" onClick={() => setTab("usuarios")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === "usuarios" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white" : "text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border"}`}>
          Usuarios
        </button>
        <button type="button" onClick={() => setTab("tiendas")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === "tiendas" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white" : "text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border"}`}>
          Tiendas aliadas
        </button>
      </div>

      {tab === "tiendas" ? (
        <AdminPqrsTiendas />
      ) : (
        <>
      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
          <MessageSquare size={20} className="text-rose-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">PQRS</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
            Gestiona las peticiones, quejas, reclamos y sugerencias
          </p>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ESTADOS.map((estado) => {
          const config = ESTADO_CONFIG[estado];
          const Icono = config.icon;
          const count = contarEstado(estado);
          return (
            <button
              key={estado}
              onClick={() => setFiltroEstado(filtroEstado === estado ? "todos" : estado)}
              className={`bg-white dark:bg-dark-card rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                filtroEstado === estado
                  ? "border-rose-300 dark:border-rose-500/30 ring-1 ring-rose-200 dark:ring-rose-500/20"
                  : "border-gray-100 dark:border-dark-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color} bg-opacity-20`}>
                  <Icono size={18} />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-gray-900 dark:text-dark-text">{count}</p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{config.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por asunto, mensaje o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 appearance-none cursor-pointer text-gray-700 dark:text-dark-text"
            >
              <option value="todos">Todos los tipos</option>
              {Object.entries(TIPOS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {(filtroTipo !== "todos" || filtroEstado !== "todos" || busqueda) && (
            <button
              onClick={() => { setFiltroTipo("todos"); setFiltroEstado("todos"); setBusqueda(""); }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-xl text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            >
              <X size={14} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
          <p className="text-sm">Cargando PQRS...</p>
        </div>
      ) : (
        <DataTable
          columnas={columnas}
          datos={itemsFiltrados}
          buscador={false}
          emptyMessage={
            filtroTipo !== "todos" || filtroEstado !== "todos" || busqueda
              ? "No se encontraron PQRS con los filtros seleccionados"
              : "No hay PQRS registrados"
          }
        />
      )}

      {/* Modal Detalle */}
      <PqrsDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onResponder={(item) => setResponderItem(item)}
        onCambiarEstado={handleEstado}
      />

      {/* Modal Responder */}
      <ResponderModal
        item={responderItem}
        onClose={() => setResponderItem(null)}
        onGuardar={handleResponder}
        guardando={guardando}
      />
        </>
      )}
    </div>
  );
}
