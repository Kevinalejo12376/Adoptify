import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Plus, X, Loader2, CheckCircle2, AlertCircle, FileText, HelpCircle,
  ThumbsUp, Clock, Send, Paperclip, Eye, ShieldCheck, Building2, Calendar, Search,
} from "lucide-react";
import {
  crearPqrsTienda,
  listarPqrsTienda,
  obtenerPqrsTienda,
  responderPqrsTienda,
} from "../../api/tienda";
import { useStore } from "../../context/StoreContext";

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all";

const TIPOS = {
  peticion: { label: "Petición", icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  queja: { label: "Queja", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  reclamo: { label: "Reclamo", icon: HelpCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  sugerencia: { label: "Sugerencia", icon: ThumbsUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
};

const ESTADOS = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", icon: Clock },
  en_revision: { label: "En revisión", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400", icon: Loader2 },
  finalizado: { label: "Finalizado", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", icon: CheckCircle2 },
};

function Toast({ mensaje, tipo, onClose }) {
  useEffect(() => {
    if (mensaje) {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [mensaje, onClose]);
  if (!mensaje) return null;
  const cls = tipo === "error"
    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
    : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300";
  return (
    <div className="fixed bottom-6 right-6 z-[120] animate-slide-up-fade">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border shadow-lg backdrop-blur-sm ${cls}`}>
        {tipo === "error" ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
        <p className="text-sm font-medium">{mensaje}</p>
      </div>
    </div>
  );
}

function TipoBadge({ tipo }) {
  const config = TIPOS[tipo] || TIPOS.peticion;
  const Icono = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.color}`}>
      <Icono size={12} /> {config.label}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const config = ESTADOS[estado] || ESTADOS.pendiente;
  const Icono = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color}`}>
      <Icono size={12} /> {config.label}
    </span>
  );
}

// Convierte un archivo de imagen a dataURL (base64).
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdjuntosLista({ adjuntos }) {
  if (!adjuntos || adjuntos.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {adjuntos.map((a) => (
        <a
          key={a.id || a.url}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-text-secondary text-xs hover:bg-gray-200 dark:hover:bg-dark-bg transition-colors"
        >
          <Paperclip size={12} />
          {a.nombre_archivo || "Adjunto"}
        </a>
      ))}
    </div>
  );
}

function DetalleModal({ pqrs, cargando, onClose, onResponder }) {
  const [mensaje, setMensaje] = useState("");
  const [adjuntos, setAdjuntos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  if (!pqrs) return null;

  const puedeResponder = pqrs.estado !== "finalizado";

  const agregarArchivos = async (files) => {
    const nuevos = [];
    for (const f of Array.from(files || [])) {
      if (f.type.startsWith("image/")) {
        const base64 = await fileToBase64(f);
        nuevos.push({ nombre_archivo: f.name, imagen_base64: base64 });
      } else {
        nuevos.push({ nombre_archivo: f.name, url: URL.createObjectURL(f) });
      }
    }
    setAdjuntos((prev) => [...prev, ...nuevos].slice(0, 5));
  };

  const enviarRespuesta = async () => {
    if (!mensaje.trim()) {
      setErrorForm("Escribe un mensaje para responder.");
      return;
    }
    setSaving(true);
    setErrorForm("");
    try {
      await onResponder({ mensaje: mensaje.trim(), adjuntos });
      setMensaje("");
      setAdjuntos([]);
      setErrorForm("");
    } catch (e) {
      setErrorForm(e?.message || "No se pudo enviar la respuesta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden animate-modal-content max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500" />
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text truncate">{pqrs.asunto}</h3>
              <EstadoBadge estado={pqrs.estado} />
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <TipoBadge tipo={pqrs.tipo} />
              {pqrs.creado_en && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={11} /> Creada: {new Date(pqrs.creado_en).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </span>
              )}
              {pqrs.actualizado_en && pqrs.actualizado_en !== pqrs.creado_en && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={11} /> Actualizada: {new Date(pqrs.actualizado_en).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Conversacion */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/40 dark:bg-dark-bg/30">
          {cargando && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            </div>
          )}

          {(pqrs.mensajes || []).map((m) => {
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
                    {m.nombre_remitente || (esTienda ? "Tu tienda" : "Adoptify")}
                    <span className="font-normal opacity-70">
                      · {m.creado_en ? new Date(m.creado_en).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.mensaje}</p>
                </div>
              </div>
            );
          })}

          {(pqrs.adjuntos || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Adjuntos</p>
              <AdjuntosLista adjuntos={pqrs.adjuntos} />
            </div>
          )}

          {(!pqrs.mensajes || pqrs.mensajes.length === 0) && !cargando && (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-2" />
              <p className="text-sm">Sin mensajes todavía.</p>
            </div>
          )}
        </div>

        {/* Responder */}
        {puedeResponder && (
          <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card">
            <textarea
              rows={3}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className={`${inputCls} resize-none`}
            />
            {adjuntos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {adjuntos.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-text-secondary text-xs">
                    <Paperclip size={12} /> {a.nombre_archivo || "Adjunto"}
                    <button type="button" onClick={() => setAdjuntos((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errorForm && <p className="text-sm text-red-500 mt-2 flex items-center gap-1.5"><AlertCircle size={14} /> {errorForm}</p>}
            <div className="flex items-center justify-between gap-3 mt-3">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl cursor-pointer transition-colors">
                <Paperclip size={14} />
                Adjuntar imagen
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { agregarArchivos(e.target.files); e.target.value = ""; }}
                />
              </label>
              <button
                onClick={enviarRespuesta}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {saving ? "Enviando..." : "Enviar respuesta"}
              </button>
            </div>
          </div>
        )}

        {!puedeResponder && (
          <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-emerald-50/50 dark:bg-emerald-500/5 text-center text-sm text-emerald-600 dark:text-emerald-400">
            Esta PQRS ha sido finalizada por Adoptify.
          </div>
        )}
      </div>
    </div>
  );
}

export default function StorePqrs() {
  const { tienePermiso } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [toast, setToast] = useState(null);
  const notificar = (mensaje, tipo = "success") => setToast({ mensaje, tipo });

  // Modal crear
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ tipo: "peticion", asunto: "", descripcion: "" });
  const [adjuntos, setAdjuntos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  // Detalle
  const [detalle, setDetalle] = useState(null);
  const [detalleCargando, setDetalleCargando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarPqrsTienda();
      setItems(data || []);
    } catch (e) {
      notificar(e?.message || "No se pudieron cargar las PQRS", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirDetalle = async (pqrs) => {
    setDetalleCargando(true);
    setDetalle(pqrs);
    try {
      const data = await obtenerPqrsTienda(pqrs.id);
      setDetalle(data);
    } catch (e) {
      notificar(e?.message || "No se pudo cargar el detalle", "error");
    } finally {
      setDetalleCargando(false);
    }
  };

  const enviarRespuesta = async (payload) => {
    await responderPqrsTienda(detalle.id, payload);
    notificar("Respuesta enviada correctamente.");
    const data = await obtenerPqrsTienda(detalle.id);
    setDetalle(data);
    cargar();
  };

  const crear = async () => {
    setErrorForm("");
    if (form.asunto.trim().length < 3) {
      setErrorForm("El asunto debe tener al menos 3 caracteres.");
      return;
    }
    if (form.descripcion.trim().length < 5) {
      setErrorForm("La descripción debe tener al menos 5 caracteres.");
      return;
    }
    setSaving(true);
    try {
      await crearPqrsTienda({
        tipo: form.tipo,
        asunto: form.asunto.trim(),
        descripcion: form.descripcion.trim(),
        adjuntos,
      });
      notificar("PQRS creada correctamente.");
      setModalOpen(false);
      setForm({ tipo: "peticion", asunto: "", descripcion: "" });
      setAdjuntos([]);
      cargar();
    } catch (e) {
      setErrorForm(e?.message || "No se pudo crear la PQRS");
    } finally {
      setSaving(false);
    }
  };

  const agregarArchivos = async (files) => {
    const nuevos = [];
    for (const f of Array.from(files || [])) {
      if (f.type.startsWith("image/")) {
        const base64 = await fileToBase64(f);
        nuevos.push({ nombre_archivo: f.name, imagen_base64: base64 });
      }
    }
    setAdjuntos((prev) => [...prev, ...nuevos].slice(0, 5));
  };

  const filtrados = items.filter((p) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (p.asunto || "").toLowerCase().includes(q) || (p.descripcion || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <MessageSquare size={20} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">PQRS</h1>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">
              Peticiones, quejas, reclamos y sugerencias ante Adoptify.
            </p>
          </div>
        </div>
        {tienePermiso("pqrs.crear") && (
          <button
            onClick={() => { setModalOpen(true); setErrorForm(""); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
          >
            <Plus size={16} /> Nueva PQRS
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por asunto..."
            className={`${inputCls} w-full pl-9`}
          />
        </div>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p>Cargando PQRS...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-12 text-center">
          <MessageSquare size={44} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
          <p className="text-sm text-gray-400">No hay PQRS que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-dark-text truncate">{p.asunto}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <TipoBadge tipo={p.tipo} />
                    <EstadoBadge estado={p.estado} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary line-clamp-2">{p.descripcion}</p>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-dark-border">
                <div className="text-[11px] text-gray-400">
                  <p className="flex items-center gap-1"><Calendar size={11} /> {p.creado_en ? new Date(p.creado_en).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                  {(p.mensajes || []).length > 0 && (
                    <p className="flex items-center gap-1 mt-0.5"><MessageSquare size={11} /> {(p.mensajes || []).length} mensaje(s)</p>
                  )}
                </div>
                <button
                  onClick={() => abrirDetalle(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                >
                  <Eye size={13} /> Ver detalle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-modal-overlay">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden animate-modal-content max-h-[90vh] flex flex-col">
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500" />
            <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">Nueva PQRS</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Categoría *</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                  className={`${inputCls} appearance-none cursor-pointer`}
                >
                  {Object.entries(TIPOS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Asunto *</label>
                <input
                  type="text"
                  value={form.asunto}
                  onChange={(e) => setForm((p) => ({ ...p, asunto: e.target.value }))}
                  placeholder="Describe brevemente el asunto"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Descripción *</label>
                <textarea
                  rows={4}
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Explica tu petición, queja, reclamo o sugerencia..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">
                  Adjuntos <span className="text-gray-400">(imágenes opcionales, máx. 5)</span>
                </label>
                {adjuntos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {adjuntos.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-text-secondary text-xs">
                        <Paperclip size={12} /> {a.nombre_archivo || "Adjunto"}
                        <button type="button" onClick={() => setAdjuntos((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-dark-text-secondary border border-dashed border-gray-300 dark:border-dark-border rounded-xl hover:border-rose-400 dark:hover:border-rose-500/40 cursor-pointer transition-colors w-full justify-center">
                  <Paperclip size={15} />
                  Adjuntar imágenes
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { agregarArchivos(e.target.files); e.target.value = ""; }}
                  />
                </label>
              </div>
              {errorForm && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle size={14} /> {errorForm}</p>}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={crear}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {saving ? "Creando..." : "Crear PQRS"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DetalleModal
        pqrs={detalle}
        cargando={detalleCargando}
        onClose={() => setDetalle(null)}
        onResponder={enviarRespuesta}
      />
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
