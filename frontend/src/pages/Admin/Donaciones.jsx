// "Donaciones" — supervisión del administrador sobre todas las donaciones de
// Adoptify (monetarias y físicas, anónimas y registradas).
//
// El administrador SUPERVISA y CONSULTA: ve donante, refugio, tipo, valor,
// fecha, estado, referencia/transacción, detalle y trazabilidad. No altera la
// confirmación de recepción que realiza el refugio.
// Incluye estadísticas generales (total donado, cantidad, recibidas,
// pendientes, no recibidas) con filtros por fecha, refugio, tipo y estado.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "../../components/admin/DataTable";
import {
  HandHeart, Eye, AlertCircle, Clock, CheckCircle2, XCircle,
  Banknote, Package, FilterX, RefreshCw, Wallet, X,
} from "lucide-react";
import { donacionesAdmin, estadisticasDonacionesAdmin } from "../../api/donaciones";

const nf = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const ESTADOS = {
  pendiente: { label: "Pendiente", icon: Clock, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  pago_confirmado: { label: "Pago confirmado", icon: CheckCircle2, color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  recibida: { label: "Recibida", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  no_recibida: { label: "No recibida", icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  fallida: { label: "Fallida", icon: XCircle, color: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400" },
};

const ESTADO_BADGE = (estado) => {
  const c = ESTADOS[estado] || ESTADOS.pendiente;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.color}`}>
      <c.icon className="w-3 h-3" /> {c.label}
    </span>
  );
};

function formatFecha(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

const FiltrosBar = ({ filtros, onChange, refugios, onLimpiar }) => {
  const set = (campo, valor) => onChange({ ...filtros, [campo]: valor });
  const inputCls = "px-3 py-2 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all w-full";
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input type="date" value={filtros.desde || ""} onChange={(e) => set("desde", e.target.value)} className={inputCls} title="Desde" />
          <span className="text-gray-400">→</span>
          <input type="date" value={filtros.hasta || ""} onChange={(e) => set("hasta", e.target.value)} className={inputCls} title="Hasta" />
        </div>
        <select value={filtros.refugio_id || ""} onChange={(e) => set("refugio_id", e.target.value)} className={inputCls}>
          <option value="">Todos los refugios</option>
          {refugios.map((r) => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
        <select value={filtros.tipo || ""} onChange={(e) => set("tipo", e.target.value)} className={inputCls}>
          <option value="">Todos los tipos</option>
          <option value="dinero">Dinero</option>
          <option value="fisica">Física</option>
        </select>
        <select value={filtros.estado || ""} onChange={(e) => set("estado", e.target.value)} className={inputCls}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={onLimpiar}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border rounded-xl hover:border-rose-200 hover:text-rose-600 transition-colors"
        >
          <FilterX className="w-4 h-4" /> Limpiar
        </button>
      </div>
    </div>
  );
};

export default function AdminDonaciones() {
  const [donaciones, setDonaciones] = useState([]);
  const [refugios, setRefugios] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ desde: "", hasta: "", refugio_id: "", tipo: "", estado: "" });
  const [verDetalle, setVerDetalle] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const f = { ...filtros };
      const [data, est] = await Promise.all([
        donacionesAdmin(f),
        estadisticasDonacionesAdmin(f),
      ]);
      setDonaciones(data?.donaciones || []);
      setRefugios(data?.refugios || []);
      setStats(est || null);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las donaciones");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalDonado = useMemo(() => {
    if (stats) return stats.total_donado || 0;
    return donaciones
      .filter((d) => d.estado === "pago_confirmado" || d.estado === "recibida")
      .reduce((s, d) => s + (d.valor || 0), 0);
  }, [stats, donaciones]);

  const columnas = [
    {
      key: "nombre_donante",
      titulo: "Donante",
      tipo: "avatar",
      ordenable: true,
      nombreAvatar: (f) => (f.es_anonimo ? "?" : (f.nombre_donante || "?").charAt(0).toUpperCase()),
      subtitulo: (f) => f.referencia,
    },
    { key: "refugio_nombre", titulo: "Refugio", ordenable: true, cellClassName: "text-gray-500 dark:text-dark-text-secondary" },
    {
      key: "tipo",
      titulo: "Tipo",
      ordenable: true,
      render: (v) => v === "dinero"
        ? <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium"><Banknote className="w-4 h-4" /> Dinero</span>
        : <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"><Package className="w-4 h-4" /> Física</span>,
    },
    {
      key: "valor",
      titulo: "Valor",
      tipo: "moneda",
      ordenable: true,
      acceso: (f) => (f.tipo === "dinero" ? f.valor : null),
    },
    { key: "estado", titulo: "Estado", ordenable: true, render: (v) => ESTADO_BADGE(v) },
    { key: "creado_en", titulo: "Fecha/hora", tipo: "fecha", ordenable: true },
    {
      key: "acciones",
      titulo: "Detalle",
      ordenable: false,
      className: "text-right",
      render: (_, fila) => (
        <div className="flex items-center justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setVerDetalle(fila); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all shadow-sm shadow-rose-100"
          >
            <Eye className="w-4 h-4" /> Ver
          </button>
        </div>
      ),
    },
  ];

  const statCards = stats ? [
    { icon: Wallet, label: "Total donado", value: nf.format(stats.total_donado), color: "from-rose-500 to-amber-500", text: "text-rose-600 dark:text-rose-400" },
    { icon: HandHeart, label: "Donaciones", value: String(stats.cantidad), color: "from-violet-500 to-purple-500", text: "text-violet-600 dark:text-violet-400" },
    { icon: CheckCircle2, label: "Recibidas", value: String(stats.recibidas), color: "from-emerald-500 to-teal-500", text: "text-emerald-600 dark:text-emerald-400" },
    { icon: Clock, label: "Pendientes", value: String(stats.pendientes), color: "from-amber-500 to-orange-500", text: "text-amber-600 dark:text-amber-400" },
    { icon: CheckCircle2, label: "Pago confirmado", value: String(stats.pago_confirmado), color: "from-blue-500 to-cyan-500", text: "text-blue-600 dark:text-blue-400" },
    { icon: XCircle, label: "No recibidas", value: String(stats.no_recibidas), color: "from-red-500 to-rose-500", text: "text-red-600 dark:text-red-400" },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">Donaciones</h1>
          <p className="text-gray-500 dark:text-dark-text-secondary mt-1">
            Supervisa y consulta todas las donaciones de Adoptify con trazabilidad completa.
          </p>
        </div>
        <button
          onClick={cargar}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-200 hover:text-rose-600 transition-colors w-fit"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-dark-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-border">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className={`text-lg font-bold font-display truncate ${s.text}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{s.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filtros */}
      <FiltrosBar
        filtros={filtros}
        onChange={setFiltros}
        refugios={refugios}
        onLimpiar={() => setFiltros({ desde: "", hasta: "", refugio_id: "", tipo: "", estado: "" })}
      />

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Tabla */}
      <DataTable
        columnas={columnas}
        datos={donaciones}
        buscador
        placeholder="Buscar donación..."
        cargando={loading}
        emptyMessage="No se encontraron donaciones con los filtros seleccionados"
        emptyIcon={HandHeart}
        accionFila={(f) => setVerDetalle(f)}
      />

      {/* Modal de detalle / trazabilidad */}
      {verDetalle && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay" onClick={() => setVerDetalle(null)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide bg-white dark:bg-dark-card rounded-3xl shadow-2xl animate-modal-pop">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                  <HandHeart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Detalle de la donación</h3>
                  <p className="text-rose-100 text-xs font-mono">{verDetalle.referencia}</p>
                </div>
              </div>
              <button onClick={() => setVerDetalle(null)} className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{verDetalle.nombre_donante}</p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                    {verDetalle.es_anonimo ? "Donación anónima" : "Usuario registrado"} · {verDetalle.refugio_nombre}
                  </p>
                </div>
                <div className="ml-auto">{ESTADO_BADGE(verDetalle.estado)}</div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Donación</p>
                  <p><span className="text-gray-500 dark:text-dark-text-secondary">Tipo:</span> {verDetalle.tipo === "dinero" ? "Monetaria" : "Física"}</p>
                  {verDetalle.tipo === "dinero"
                    ? <p><span className="text-gray-500 dark:text-dark-text-secondary">Valor:</span> <strong className="text-rose-600">{nf.format(verDetalle.valor)}</strong></p>
                    : <p><span className="text-gray-500 dark:text-dark-text-secondary">Detalle:</span> {verDetalle.detalle}</p>}
                  <p><span className="text-gray-500 dark:text-dark-text-secondary">Fecha:</span> {formatFecha(verDetalle.creado_en)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Contacto del donante</p>
                  {verDetalle.telefono_contacto && <p><span className="text-gray-500 dark:text-dark-text-secondary">Teléfono:</span> {verDetalle.telefono_contacto}</p>}
                  {verDetalle.email_contacto && <p><span className="text-gray-500 dark:text-dark-text-secondary">Correo:</span> {verDetalle.email_contacto}</p>}
                  {!verDetalle.telefono_contacto && !verDetalle.email_contacto && (
                    <p className="text-gray-400">Sin datos de contacto</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-gray-400">Trazabilidad</p>
                <p><span className="text-gray-500 dark:text-dark-text-secondary">Referencia:</span> <span className="font-mono">{verDetalle.referencia}</span></p>
                {verDetalle.transaccion_id && <p><span className="text-gray-500 dark:text-dark-text-secondary">Transacción:</span> <span className="font-mono">{verDetalle.transaccion_id}</span></p>}
                {verDetalle.pasarela_datos && (
                  <p><span className="text-gray-500 dark:text-dark-text-secondary">Pasarela:</span> <span className="font-mono text-xs">{JSON.stringify(verDetalle.pasarela_datos)}</span></p>
                )}
                {verDetalle.confirmado_por_nombre && (
                  <p><span className="text-gray-500 dark:text-dark-text-secondary">Confirmada por:</span> {verDetalle.confirmado_por_nombre} ({formatFecha(verDetalle.confirmado_en)})</p>
                )}
                {verDetalle.motivo_no_recibida && (
                  <p className="text-red-600 dark:text-red-400"><span className="text-gray-500 dark:text-dark-text-secondary">Motivo no recibida:</span> {verDetalle.motivo_no_recibida}</p>
                )}
                {verDetalle.compartida && (
                  <p><span className="text-gray-500 dark:text-dark-text-secondary">Publicación del foro:</span> #{verDetalle.post_foro_id}</p>
                )}
              </div>

              <p className="text-xs text-gray-400 bg-gray-50 dark:bg-[#20202c] rounded-xl p-3">
                El administrador supervisa y consulta. La confirmación de recepción la realiza el refugio.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
