// "Mis donaciones" — historial de donaciones del usuario registrado.
// Muestra: refugio, tipo de donación, valor (si monetaria), fecha, estado y
// referencia/ID. Permite ver el detalle (trazabilidad) y, si la donación fue
// confirmada y aún no se comparte, invitar a compartirla en el foro con IA.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import BackButton from "../../components/BackButton";
import { useTheme } from "../../context/ThemeContext";
import { misDonaciones } from "../../api/donaciones";
import CompartirDonacionModal from "../../components/CompartirDonacionModal";
import DonarModal from "../../components/DonarModal";
import {
  HandHeart, Banknote, Package, Clock, CheckCircle2, XCircle, Loader2,
  Search, Sparkles, ChevronDown, ArrowRight, AlertCircle, Eye, RefreshCw,
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

export default function MisDonaciones() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [donaciones, setDonaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [expandida, setExpandida] = useState(null);
  const [shareDonacion, setShareDonacion] = useState(null);
  // Modal "¿Cómo deseas ayudar?" (componente reutilizable con Home).
  const [showDonarModal, setShowDonarModal] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await misDonaciones();
      setDonaciones(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar tus donaciones");
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
        (d.refugio_nombre || "").toLowerCase().includes(t) ||
        (d.transaccion_id || "").toLowerCase().includes(t)
      );
    }
    return r;
  }, [donaciones, filtro, busqueda]);

  const stats = useMemo(() => {
    const confirmadas = donaciones.filter((d) => d.estado === "pago_confirmado" || d.estado === "recibida");
    return {
      total: confirmadas.reduce((s, d) => s + (d.valor || 0), 0),
      cantidad: donaciones.length,
      pendientes: donaciones.filter((d) => d.estado === "pendiente").length,
    };
  }, [donaciones]);

  const puedeCompartir = (d) => (d.estado === "pago_confirmado" || d.estado === "recibida") && !d.compartida;

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando tus donaciones...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Encabezado */}
        <div>
          <BackButton />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Mis donaciones</h1>
              <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
                Revisa el estado de cada aporte que has hecho a los refugios.
              </p>
            </div>
            <button
              onClick={() => setShowDonarModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold shadow-lg shadow-rose-200 hover:shadow-xl transition-all cursor-pointer"
            >
              <HandHeart className="w-5 h-5" /> Hacer una donación
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Total donado (confirmado)</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-display mt-1">{nf.format(stats.total)}</p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Donaciones realizadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-display mt-1">{stats.cantidad}</p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border">
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Pendientes de confirmar</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-display mt-1">{stats.pendientes}</p>
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
              placeholder="Buscar por referencia, refugio o transacción"
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
            <p className="text-gray-500 dark:text-dark-text-secondary mb-2">
              {donaciones.length === 0 ? "Aún no has realizado donaciones." : "No hay donaciones que coincidan con tu búsqueda."}
            </p>
            {donaciones.length === 0 && (
              <button
                onClick={() => setShowDonarModal(true)}
                className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:shadow-lg transition-all cursor-pointer"
              >
                Hacer mi primera donación <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtradas.map((d) => {
              const Est = ESTADOS[d.estado] || ESTADOS.pendiente;
              const Icono = Est.icon;
              const abierta = expandida === d.id;
              return (
                <div key={d.id} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Ícono tipo */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      d.tipo === "dinero"
                        ? "bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20"
                        : "bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-500/20 dark:to-rose-500/20"
                    }`}>
                      {d.tipo === "dinero" ? <Banknote className="w-6 h-6 text-rose-600 dark:text-rose-400" /> : <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{d.refugio_nombre}</p>
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
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      {puedeCompartir(d) && (
                        <button
                          onClick={() => setShareDonacion(d)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:shadow-lg transition-all"
                        >
                          <Sparkles className="w-4 h-4" /> Compartir
                        </button>
                      )}
                      {d.compartida && (
                        <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold">
                          <Sparkles className="w-3.5 h-3.5" /> Compartida
                        </span>
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
                          <p className="text-xs uppercase tracking-wide text-gray-400">Información general</p>
                          <p><span className="text-gray-500 dark:text-dark-text-secondary">Refugio:</span> <strong className="text-gray-900 dark:text-white">{d.refugio_nombre}</strong></p>
                          <p><span className="text-gray-500 dark:text-dark-text-secondary">Tipo:</span> {d.tipo === "dinero" ? "Monetaria" : "Física"}</p>
                          {d.tipo === "dinero" && <p><span className="text-gray-500 dark:text-dark-text-secondary">Valor:</span> <strong className="text-rose-600">{nf.format(d.valor)}</strong></p>}
                          <p><span className="text-gray-500 dark:text-dark-text-secondary">Estado:</span> {Est.label}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Trazabilidad</p>
                          <p><span className="text-gray-500 dark:text-dark-text-secondary">Referencia:</span> <span className="font-mono">{d.referencia}</span></p>
                          {d.transaccion_id && <p><span className="text-gray-500 dark:text-dark-text-secondary">Transacción:</span> <span className="font-mono">{d.transaccion_id}</span></p>}
                          <p><span className="text-gray-500 dark:text-dark-text-secondary">Fecha:</span> {formatFecha(d.creado_en)}</p>
                          {d.confirmado_por_nombre && (
                            <p><span className="text-gray-500 dark:text-dark-text-secondary">Confirmada por:</span> {d.confirmado_por_nombre}</p>
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

        {donaciones.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={cargar}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-rose-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          </div>
        )}
      </div>

      {/* Modal "¿Cómo deseas ayudar?" (reutilizado con Home) */}
      <DonarModal isOpen={showDonarModal} onClose={() => setShowDonarModal(false)} />

      {/* Modal para compartir en el foro (Gemini) */}
      <CompartirDonacionModal
        isOpen={!!shareDonacion}
        onClose={() => setShareDonacion(null)}
        donacion={shareDonacion}
        onPublicado={() => { cargar(); setShareDonacion(null); }}
      />
    </div>
  );
}
