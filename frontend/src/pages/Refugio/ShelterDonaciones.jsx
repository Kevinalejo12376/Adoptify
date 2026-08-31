// "Donaciones recibidas" — sección del rol Refugio.
// Muestra las donaciones (monetarias y físicas) dirigidas al refugio y permite
// ver su detalle. El refugio confirma la recepción:
//   ✅ Confirmar recepción  -> estado "recibida"
//   ❌ No recibí esta donación -> estado "no_recibida" (exige un motivo)
// Antes de cambiar el estado se muestra una confirmación. Al confirmar, la BD
// se actualiza de inmediato y la vista se refleja sin recargar la página.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import BackButton from "../../components/BackButton";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { donacionesRefugio, confirmarRecibida, confirmarNoRecibida } from "../../api/donaciones";
import {
  HandHeart, Banknote, Package, Clock, CheckCircle2, XCircle, Loader2,
  Check, X, AlertTriangle, Search, Eye, RefreshCw, AlertCircle,
} from "lucide-react";

const nf = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const ESTADOS = {
  pendiente: { label: "Pendiente", icon: Clock, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  pago_confirmado: { label: "Pago confirmado", icon: CheckCircle2, color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  recibida: { label: "Recibida", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  no_recibida: { label: "No recibida", icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  fallida: { label: "Fallida", icon: XCircle, color: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400" },
};

const FILTROS = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "pago_confirmado", label: "Pago confirmado" },
  { value: "recibida", label: "Recibidas" },
  { value: "no_recibida", label: "No recibidas" },
  { value: "fallida", label: "Fallidas" },
];

function formatFecha(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function ShelterDonaciones() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [donaciones, setDonaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [expandida, setExpandida] = useState(null);

  // Modal de confirmación
  const [confirmTarget, setConfirmTarget] = useState(null); // { donacion, tipo: 'recibir'|'no-recibir' }
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [toast, setToast] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await donacionesRefugio();
      setDonaciones(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las donaciones recibidas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    let r = [...donaciones];
    if (filtro !== "todas") r = r.filter((d) => d.estado === filtro);
    if (busqueda.trim()) {
      const t = busqueda.toLowerCase().trim();
      r = r.filter((d) =>
        (d.referencia || "").toLowerCase().includes(t) ||
        (d.nombre_donante || "").toLowerCase().includes(t) ||
        (d.transaccion_id || "").toLowerCase().includes(t)
      );
    }
    return r;
  }, [donaciones, filtro, busqueda]);

  const stats = useMemo(() => ({
    pendientes: donaciones.filter((d) => d.estado === "pendiente" || d.estado === "pago_confirmado").length,
    recibidas: donaciones.filter((d) => d.estado === "recibida").length,
    noRecibidas: donaciones.filter((d) => d.estado === "no_recibida").length,
    total: donaciones.length,
  }), [donaciones]);

  const puedeAccionar = (d) => d.estado === "pendiente" || d.estado === "pago_confirmado";

  const abrirConfirmar = (d) => {
    setConfirmTarget({ donacion: d, tipo: "recibir" });
    setMotivo("");
    setActionError(null);
  };

  const abrirNoRecibir = (d) => {
    setConfirmTarget({ donacion: d, tipo: "no-recibir" });
    setMotivo("");
    setActionError(null);
  };

  const cerrarModal = () => {
    setConfirmTarget(null);
    setMotivo("");
    setActionError(null);
  };

  const ejecutar = async () => {
    if (!confirmTarget) return;
    const { donacion, tipo } = confirmTarget;
    setActionError(null);
    if (tipo === "no-recibir" && (motivo || "").trim().length < 5) {
      setActionError("Escribe el motivo por el que no recibiste esta donación (mínimo 5 caracteres)");
      return;
    }
    setProcesando(true);
    try {
      let actualizada;
      if (tipo === "recibir") {
        actualizada = await confirmarRecibida(donacion.id);
      } else {
        actualizada = await confirmarNoRecibida(donacion.id, motivo.trim());
      }
      // Actualización en tiempo real sin recargar la página.
      setDonaciones((prev) => prev.map((d) => (d.id === actualizada.id ? actualizada : d)));
      setToast(
        tipo === "recibir"
          ? { type: "success", msg: `Donación ${actualizada.referencia} marcada como recibida.` }
          : { type: "error", msg: `Donación ${actualizada.referencia} marcada como NO recibida.` }
      );
      cerrarModal();
      setTimeout(() => setToast(null), 5000);
    } catch (e) {
      setActionError(e?.message || "No se pudo actualizar la donación. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando donaciones recibidas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Encabezado */}
        <div>
          <BackButton />
          <div className="mt-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Donaciones recibidas</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
              Confirma la recepción de cada donación para que el donante y el equipo lo vean al instante.
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Pendientes de confirmar</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-display mt-1">{stats.pendientes}</p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Recibidas</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-display mt-1">{stats.recibidas}</p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">No recibidas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 font-display mt-1">{stats.noRecibidas}</p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-display mt-1">{stats.total}</p>
          </div>
        </div>

        {/* Filtros + búsqueda */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filtro === f.value
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm"
                    : "bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por referencia, donante o transacción"
              className="w-full pl-9 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-rose-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Lista */}
        {filtradas.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border">
            <HandHeart className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-dark-text-secondary">
              {donaciones.length === 0 ? "Aún no has recibido donaciones." : "No hay donaciones que coincidan con tu búsqueda."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtradas.map((d) => {
              const Est = ESTADOS[d.estado] || ESTADOS.pendiente;
              const Icono = Est.icon;
              const abierta = expandida === d.id;
              return (
                <div key={d.id} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      d.tipo === "dinero"
                        ? "bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20"
                        : "bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-500/20 dark:to-rose-500/20"
                    }`}>
                      {d.tipo === "dinero" ? <Banknote className="w-6 h-6 text-rose-600 dark:text-rose-400" /> : <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-white">{d.nombre_donante}</p>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${Est.color}`}>
                          <Icono className="w-3 h-3" /> {Est.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-0.5">
                        {d.tipo === "dinero"
                          ? <>Donación monetaria · <strong className="text-rose-600 dark:text-rose-400">{nf.format(d.valor)}</strong></>
                          : <>Donación física · {d.detalle}</>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatFecha(d.creado_en)} · <span className="font-mono">{d.referencia}</span>
                        {d.email_contacto || d.telefono_contacto ? ` · ${d.telefono_contacto || ""} ${d.email_contacto ? (d.telefono_contacto ? "· " : "") + d.email_contacto : ""}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {puedeAccionar(d) && (
                        <>
                          <button
                            onClick={() => abrirConfirmar(d)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:shadow-lg transition-all"
                          >
                            <Check className="w-4 h-4" /> Confirmar recepción
                          </button>
                          <button
                            onClick={() => abrirNoRecibir(d)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-semibold hover:shadow-lg transition-all"
                          >
                            <X className="w-4 h-4" /> No recibí
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandida(abierta ? null : d.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary text-sm font-semibold hover:border-rose-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" /> Detalle
                      </button>
                    </div>
                  </div>

                  {abierta && (
                    <div className="border-t border-gray-100 dark:border-dark-border px-5 py-4 bg-gray-50/50 dark:bg-[#20202c]">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Donación</p>
                          <p><span className="text-gray-500 dark:text-dark-text-secondary">Tipo:</span> {d.tipo === "dinero" ? "Monetaria" : "Física"}</p>
                          {d.tipo === "dinero"
                            ? <p><span className="text-gray-500 dark:text-dark-text-secondary">Valor:</span> <strong className="text-rose-600">{nf.format(d.valor)}</strong></p>
                            : <p><span className="text-gray-500 dark:text-dark-text-secondary">Detalle:</span> {d.detalle}</p>}
                          <p><span className="text-gray-500 dark:text-dark-text-secondary">Fecha:</span> {formatFecha(d.creado_en)}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Trazabilidad</p>
                          <p><span className="text-gray-500 dark:text-dark-text-secondary">Referencia:</span> <span className="font-mono">{d.referencia}</span></p>
                          {d.transaccion_id && <p><span className="text-gray-500 dark:text-dark-text-secondary">Transacción:</span> <span className="font-mono">{d.transaccion_id}</span></p>}
                          {d.confirmado_por_nombre && (
                            <p><span className="text-gray-500 dark:text-dark-text-secondary">Confirmada por:</span> {d.confirmado_por_nombre} ({formatFecha(d.confirmado_en)})</p>
                          )}
                          {d.motivo_no_recibida && (
                            <p className="text-red-600 dark:text-red-400"><span className="text-gray-500 dark:text-dark-text-secondary">Motivo:</span> {d.motivo_no_recibida}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={cargar}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-rose-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 animate-modal-pop ${
          toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay" onClick={cerrarModal} />
          <div className="relative w-full max-w-md bg-white dark:bg-dark-card rounded-3xl shadow-2xl animate-modal-pop overflow-hidden">
            <div className={`px-6 py-5 ${confirmTarget.tipo === "recibir" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                  {confirmTarget.tipo === "recibir" ? <Check className="w-6 h-6 text-white" /> : <X className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {confirmTarget.tipo === "recibir" ? "Confirmar recepción" : "No recibí esta donación"}
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {confirmTarget.tipo === "recibir" ? (
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    ¿Confirmas que recibiste la siguiente donación?
                  </p>
                  <div className="rounded-2xl bg-gray-50 dark:bg-[#20202c] p-4 space-y-1.5">
                    <p className="font-bold text-gray-900 dark:text-white">{confirmTarget.donacion.nombre_donante}</p>
                    <p className="text-gray-600 dark:text-dark-text-secondary">
                      {confirmTarget.donacion.tipo === "dinero"
                        ? `Donación monetaria · ${nf.format(confirmTarget.donacion.valor)}`
                        : `Donación física · ${confirmTarget.donacion.detalle}`}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{confirmTarget.donacion.referencia}</p>
                  </div>
                  {confirmTarget.donacion.tipo === "fisica" && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Recuerda: confirma solo cuando realmente hayas recibido los artículos.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text">
                    Motivo por el que no recibiste esta donación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={4}
                    placeholder="Ej: la entrega no llegó, no coordinamos la cita, datos incorrectos..."
                    className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-rose-400 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-400">Este motivo será visible para el donante y los administradores.</p>
                </div>
              )}

              {actionError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {actionError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={cerrarModal}
                  disabled={procesando}
                  className="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutar}
                  disabled={procesando}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold shadow-lg disabled:opacity-60 transition-all ${
                    confirmTarget.tipo === "recibir"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200"
                      : "bg-gradient-to-r from-red-500 to-rose-500 shadow-red-200"
                  }`}
                >
                  {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmTarget.tipo === "recibir" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  {procesando ? "Guardando..." : confirmTarget.tipo === "recibir" ? "Sí, confirmar recepción" : "Confirmar no recibida"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
