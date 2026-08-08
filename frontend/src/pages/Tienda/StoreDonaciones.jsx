import { useState, useEffect, useCallback } from "react";
import {
  HeartHandshake, Plus, X, CheckCircle2, AlertCircle, Loader2, Calendar,
  Package, Eye, Building2, Minus, Plus as PlusIcon, StickyNote,
} from "lucide-react";
import {
  refugiosParaDonar,
  misProductosTienda,
  crearDonacion,
  listarDonaciones,
} from "../../api/tienda";
import ConfirmModal from "../../components/ConfirmModal";

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all";

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

function EstadoBadge({ estado }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
      <CheckCircle2 size={12} /> {estado === "completada" ? "Completada" : estado}
    </span>
  );
}

function DetalleModal({ donacion, onClose }) {
  if (!donacion) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden animate-modal-content max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500" />
        <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
              <HeartHandshake size={18} className="text-rose-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">Detalle de la donación</h3>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                {donacion.refugio_nombre || "Refugio"} · #{donacion.id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-secondary">
            <Calendar size={12} />
            {donacion.creado_en
              ? new Date(donacion.creado_en).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })
              : "—"}
            <span className="ml-auto"><EstadoBadge estado={donacion.estado} /></span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Productos donados</p>
            <div className="divide-y divide-gray-100 dark:divide-dark-border rounded-xl border border-gray-100 dark:border-dark-border overflow-hidden">
              {(donacion.items || []).map((it) => (
                <div key={it.id} className="flex items-center justify-between px-4 py-3 bg-gray-50/50 dark:bg-dark-bg/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-dark-card flex items-center justify-center flex-shrink-0">
                      <Package size={14} className="text-rose-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-dark-text truncate">{it.nombre_producto}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-dark-text">x{it.cantidad}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 mt-2 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 rounded-xl border border-rose-100 dark:border-rose-500/10">
              <p className="text-sm font-semibold text-gray-700 dark:text-dark-text">Total de productos</p>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {(donacion.items || []).reduce((s, i) => s + (i.cantidad || 0), 0)}
              </p>
            </div>
          </div>

          {donacion.observacion && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                <StickyNote size={12} /> Observación
              </p>
              <div className="p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-xl border border-gray-100 dark:border-dark-border">
                <p className="text-sm text-gray-700 dark:text-dark-text whitespace-pre-wrap">{donacion.observacion}</p>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 flex items-center gap-1">
            <Building2 size={12} /> Donación realizada por {donacion.usuario || "—"} ({donacion.rol || "—"})
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-dark-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StoreDonaciones() {
  const [refugios, setRefugios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [donaciones, setDonaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const notificar = (mensaje, tipo = "success") => setToast({ mensaje, tipo });

  // Modal "Nueva donación"
  const [modalOpen, setModalOpen] = useState(false);
  const [refugioSel, setRefugioSel] = useState("");
  const [cantidades, setCantidades] = useState({});
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  const [detalle, setDetalle] = useState(null);
  const [confirmar, setConfirmar] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [refs, prods, dons] = await Promise.all([
        refugiosParaDonar().catch(() => []),
        misProductosTienda().catch(() => []),
        listarDonaciones().catch(() => []),
      ]);
      setRefugios(refs || []);
      setProductos((prods || []).filter((p) => (p.stock || 0) > 0));
      setDonaciones(dons || []);
    } catch (e) {
      notificar(e?.message || "No se pudieron cargar los datos", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirModal = () => {
    setRefugioSel("");
    setCantidades({});
    setObservacion("");
    setErrorForm("");
    setModalOpen(true);
  };

  const totalUnidades = () => Object.values(cantidades).reduce((s, v) => s + (v || 0), 0);

  const confirmarDonacion = async () => {
    setErrorForm("");
    if (!refugioSel) {
      setErrorForm("Selecciona un refugio para la donación.");
      return;
    }
    const items = productos
      .filter((p) => (cantidades[p.id] || 0) > 0)
      .map((p) => ({ producto_id: p.id, cantidad: cantidades[p.id] }));
    if (items.length === 0) {
      setErrorForm("Selecciona al menos un producto y su cantidad.");
      return;
    }
    // Validacion client-side: no superar el stock.
    for (const it of items) {
      const p = productos.find((x) => x.id === it.producto_id);
      if (it.cantidad > (p?.stock || 0)) {
        setErrorForm(`La cantidad de '${p?.nombre}' supera el stock disponible (${p?.stock}).`);
        return;
      }
    }

    setSaving(true);
    try {
      await crearDonacion({ refugio_id: Number(refugioSel), items, observacion: observacion.trim() || null });
      notificar("Donación realizada correctamente. El stock se actualizó.");
      setModalOpen(false);
      // Recarga productos (stock actualizado) y donaciones sin recargar la página.
      const [prods, dons] = await Promise.all([
        misProductosTienda().catch(() => []),
        listarDonaciones().catch(() => []),
      ]);
      setProductos((prods || []).filter((p) => (p.stock || 0) > 0));
      setDonaciones(dons || []);
    } catch (e) {
      setErrorForm(e?.message || "No se pudo realizar la donación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <HeartHandshake size={20} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Donaciones</h1>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">
              Dona productos de tu tienda a los refugios registrados en Adoptify.
            </p>
          </div>
        </div>
        <button
          onClick={abrirModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
        >
          <Plus size={16} /> Donar productos
        </button>
      </div>

      {/* Historial */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p>Cargando donaciones...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-dark-text">Historial de donaciones</h2>
            <span className="text-xs text-gray-400">{donaciones.length} donación(es)</span>
          </div>
          {donaciones.length === 0 ? (
            <div className="p-12 text-center">
              <HeartHandshake size={44} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
              <p className="text-sm text-gray-400">Aún no has realizado donaciones.</p>
              <button onClick={abrirModal} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors">
                <Plus size={15} /> Realizar la primera donación
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Refugio beneficiado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Productos donados</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Cantidad</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Observación</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                  {donaciones.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                            <Building2 size={14} className="text-rose-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">{d.refugio_nombre || "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-text-secondary">
                        {(d.items || []).map((i) => i.nombre_producto).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-dark-text">
                        {(d.items || []).reduce((s, i) => s + (i.cantidad || 0), 0)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {d.creado_en ? new Date(d.creado_en).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3"><EstadoBadge estado={d.estado} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-text-secondary max-w-[160px]">
                        <p className="truncate" title={d.observacion || ""}>{d.observacion || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => setDetalle(d)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                          >
                            <Eye size={13} /> Ver detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Nueva donación */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-modal-overlay">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden animate-modal-content max-h-[90vh] flex flex-col">
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500" />
            <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">Donar productos</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Refugio */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Refugio beneficiado *</label>
                <select
                  value={refugioSel}
                  onChange={(e) => setRefugioSel(e.target.value)}
                  className={`${inputCls} appearance-none cursor-pointer`}
                >
                  <option value="">Selecciona un refugio...</option>
                  {refugios.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}{r.ciudad ? ` — ${r.ciudad}` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Productos */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">
                  Productos a donar * <span className="text-gray-400">(selecciona cantidad; no puede superar el stock)</span>
                </label>
                {productos.length === 0 ? (
                  <p className="text-sm text-gray-400 bg-gray-50 dark:bg-dark-bg/50 rounded-xl p-4 text-center">
                    No tienes productos con stock disponible para donar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {productos.map((p) => {
                      const cant = cantidades[p.id] || 0;
                      const excede = cant > (p.stock || 0);
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
                            cant > 0
                              ? "border-rose-300 dark:border-rose-500/40 bg-rose-50/40 dark:bg-rose-500/5"
                              : "border-gray-100 dark:border-dark-border bg-gray-50/40 dark:bg-dark-bg/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-white dark:bg-dark-card flex items-center justify-center flex-shrink-0">
                              <Package size={15} className="text-rose-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-700 dark:text-dark-text truncate">{p.nombre}</p>
                              <p className={`text-xs ${excede ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                                {excede ? "Excede el stock disponible" : `Stock disponible: ${p.stock}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setCantidades((prev) => ({ ...prev, [p.id]: Math.max(0, cant - 1) }))}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-bg transition-colors"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={p.stock}
                              value={cant}
                              onChange={(e) => setCantidades((prev) => ({ ...prev, [p.id]: Math.max(0, Number(e.target.value) || 0) }))}
                              className="w-14 text-center text-sm font-semibold bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            />
                            <button
                              type="button"
                              onClick={() => setCantidades((prev) => ({ ...prev, [p.id]: Math.min(p.stock || 0, cant + 1) }))}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-bg transition-colors"
                            >
                              <PlusIcon size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Observacion */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">
                  Observación <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Notas para el refugio..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              {errorForm && (
                <p className="text-sm text-red-500 flex items-center gap-1.5">
                  <AlertCircle size={14} /> {errorForm}
                </p>
              )}

              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 rounded-xl border border-rose-100 dark:border-rose-500/10">
                <p className="text-sm font-semibold text-gray-700 dark:text-dark-text">Total a donar</p>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{totalUnidades()} unidad(es)</p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setConfirmar(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <HeartHandshake size={16} />}
                {saving ? "Donando..." : "Confirmar donación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmacion */}
      <ConfirmModal
        isOpen={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={() => { setConfirmar(false); confirmarDonacion(); }}
        confirmDisabled={saving}
        type="info"
        title="Confirmar donación"
        message={`Se donarán ${totalUnidades()} unidad(es) de producto(s) al refugio seleccionado. El stock de la tienda se descontará automáticamente.`}
        confirmText="Confirmar"
      />

      <DetalleModal donacion={detalle} onClose={() => setDetalle(null)} />
      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
