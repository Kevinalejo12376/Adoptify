import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Search, MapPin, PawPrint, Mail, Phone, Calendar,
  Eye, Edit3, Trash2, Lock, Unlock, X, CheckCircle2, Loader2,
  AlertCircle, FileText, Clock, MessageCircle, Check, ExternalLink,
  Inbox, ShieldCheck, Globe,
} from "lucide-react";
import {
  listarRefugiosAdmin,
  listarSolicitudesRefugio,
  estadisticasSolicitudesRefugio,
  eliminarSolicitudRefugio,
} from "../../api/admin";
import RefugioDetalleModal from "./components/RefugioDetalleModal";

// ========================================================
// CONFIG
// ========================================================

const ESTADO_REFUGIO = {
  activo: { label: "Activo", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  suspendido: { label: "Suspendido", dot: "bg-rose-500", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

const ESTADO_SOLICITUD = {
  pendiente: { label: "Pendiente", dot: "bg-amber-400", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  informacion_solicitada: { label: "Info. solicitada", dot: "bg-blue-400", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  aprobada: { label: "Aprobada", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazada: { label: "Rechazada", dot: "bg-rose-500", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

function BadgeEstado({ config }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  try {
    return new Date(fecha).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return fecha;
  }
}

function Toast({ mensaje, tipo, onClose }) {
  useEffect(() => {
    if (mensaje) {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [mensaje, onClose]);
  if (!mensaje) return null;
  const cls = tipo === "error"
    ? "bg-rose-50 border-rose-200 text-rose-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";
  return (
    <div className="fixed bottom-6 right-6 z-[120] animate-slide-up-fade">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border shadow-lg backdrop-blur-sm ${cls}`}>
        {tipo === "error" ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
        <p className="text-sm font-medium">{mensaje}</p>
      </div>
    </div>
  );
}

export default function AdminRefugios() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("registrados");

  const [toast, setToast] = useState(null);
  const notificar = (mensaje, tipo = "success") => setToast({ mensaje, tipo });

  // ---- Refugios registrados ----
  const [refugios, setRefugios] = useState([]);
  const [cargandoRefugios, setCargandoRefugios] = useState(true);
  const [busquedaRef, setBusquedaRef] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCiudad, setFiltroCiudad] = useState("");

  // ---- Solicitudes ----
  const [solicitudes, setSolicitudes] = useState([]);
  const [statsSol, setStatsSol] = useState({});
  const [cargandoSol, setCargandoSol] = useState(true);
  const [filtroSol, setFiltroSol] = useState("");
  const [busquedaSol, setBusquedaSol] = useState("");

  // ---- Modales ----
  const [detalleRefugio, setDetalleRefugio] = useState(null); // modal de detalle/CRUD del refugio
  const [solicitudEliminar, setSolicitudEliminar] = useState(null); // solicitud a eliminar

  const cargarRefugios = useCallback(async () => {
    setCargandoRefugios(true);
    try {
      const data = await listarRefugiosAdmin({ busqueda: busquedaRef || undefined, estado: filtroEstado || undefined, ciudad: filtroCiudad || undefined });
      setRefugios(Array.isArray(data) ? data : []);
    } catch {
      setRefugios([]);
    } finally {
      setCargandoRefugios(false);
    }
  }, [busquedaRef, filtroEstado, filtroCiudad]);

  const cargarSolicitudes = useCallback(async () => {
    setCargandoSol(true);
    try {
      const [sol, stats] = await Promise.all([
        listarSolicitudesRefugio({ estado: filtroSol || undefined, busqueda: busquedaSol || undefined }),
        estadisticasSolicitudesRefugio(),
      ]);
      setSolicitudes(Array.isArray(sol) ? sol : []);
      setStatsSol(stats || {});
    } catch {
      setSolicitudes([]);
      setStatsSol({});
    } finally {
      setCargandoSol(false);
    }
  }, [filtroSol, busquedaSol]);

  useEffect(() => { cargarRefugios(); }, [cargarRefugios]);
  useEffect(() => { cargarSolicitudes(); }, [cargarSolicitudes]);

  const eliminarSolicitud = async () => {
    if (!solicitudEliminar) return;
    try {
      await eliminarSolicitudRefugio(solicitudEliminar.id);
      setSolicitudEliminar(null);
      notificar("Solicitud eliminada.");
      await cargarSolicitudes();
    } catch (e) {
      notificar(e.message || "No se pudo eliminar la solicitud.", "error");
    }
  };

  // Filtrado local para solicitudes por búsqueda/estado ya se hace en backend; aquí solo ciudad
  const solicitudesFiltradas = solicitudes;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Refugios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra los refugios registrados y las solicitudes de ingreso a la plataforma.
        </p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        <button
          onClick={() => setTab("registrados")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${tab === "registrados"
              ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-200"
              : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Building2 size={16} /> Refugios registrados
        </button>
        <button
          onClick={() => setTab("solicitudes")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${tab === "solicitudes"
              ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-200"
              : "text-gray-600 hover:bg-gray-50"}`}
        >
          <FileText size={16} /> Solicitudes de refugios
          {(statsSol.pendientes > 0 || statsSol.informacion_solicitada > 0) && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {statsSol.pendientes + statsSol.informacion_solicitada}
            </span>
          )}
        </button>
      </div>

      {tab === "registrados" && (
        <TabRegistrados
          refugios={refugios}
          cargando={cargandoRefugios}
          busqueda={busquedaRef}
          setBusqueda={setBusquedaRef}
          filtroEstado={filtroEstado}
          setFiltroEstado={setFiltroEstado}
          filtroCiudad={filtroCiudad}
          setFiltroCiudad={setFiltroCiudad}
          onVerDetalles={(r) => setDetalleRefugio(r)}
        />
      )}

      {tab === "solicitudes" && (
        <TabSolicitudes
          solicitudes={solicitudesFiltradas}
          stats={statsSol}
          cargando={cargandoSol}
          filtro={filtroSol}
          setFiltro={setFiltroSol}
          busqueda={busquedaSol}
          setBusqueda={setBusquedaSol}
          onVer={(s) => navigate(`/admin/refugios/${s.id}`)}
          onEliminar={(s) => setSolicitudEliminar(s)}
        />
      )}

      {/* Modal de detalle / CRUD del refugio */}
      {detalleRefugio && (
        <RefugioDetalleModal
          refugio={detalleRefugio}
          onClose={() => setDetalleRefugio(null)}
          onActualizar={cargarRefugios}
          notificar={notificar}
        />
      )}

      {/* Modal eliminar solicitud */}
      {solicitudEliminar && (
        <ModalEliminarSolicitud
          solicitud={solicitudEliminar}
          onClose={() => setSolicitudEliminar(null)}
          onConfirmar={eliminarSolicitud}
        />
      )}

      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}

// ========================================================
// PESTAÑA 1: REFUGIOS REGISTRADOS
// ========================================================

function TabRegistrados({ refugios, cargando, busqueda, setBusqueda, filtroEstado, setFiltroEstado, filtroCiudad, setFiltroCiudad, onVerDetalles }) {
  const ciudades = [...new Set(refugios.map((r) => r.ciudad).filter(Boolean))].sort();

  return (
    <div className="space-y-4">
      {/* Buscador y filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o ciudad..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-gray-50/50 placeholder-gray-400 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
          />
        </div>
        <div className="flex gap-3">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white outline-none focus:border-rose-300 cursor-pointer">
            <option value="">Estado: todos</option>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
          </select>
          <select value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white outline-none focus:border-rose-300 cursor-pointer max-w-[180px]">
            <option value="">Ciudad: todas</option>
            {ciudades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3.5 font-semibold">Refugio</th>
                <th className="px-4 py-3.5 font-semibold">Ciudad</th>
                <th className="px-4 py-3.5 font-semibold">Contacto</th>
                <th className="px-4 py-3.5 font-semibold text-center">Animales</th>
                <th className="px-4 py-3.5 font-semibold">Estado</th>
                <th className="px-4 py-3.5 font-semibold">Registro</th>
                <th className="px-4 py-3.5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={26} className="text-rose-400 animate-spin" />
                      <p className="text-gray-400 text-sm">Cargando refugios...</p>
                    </div>
                  </td>
                </tr>
              ) : refugios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <Inbox size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No se encontraron refugios con los filtros actuales.</p>
                  </td>
                </tr>
              ) : (
                refugios.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-rose-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {r.logo_url ? (
                          <img src={r.logo_url} alt={r.nombre} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-rose-500">
                            <Building2 size={19} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{r.nombre}</p>
                          <p className="text-xs text-gray-400 truncate">{r.usuario_email || "Sin correo de acceso"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-gray-400" />
                        {`${r.municipio || r.ciudad || "—"}${r.departamento ? ` (${r.departamento})` : ""}`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 text-gray-600"><Phone size={12} className="text-gray-400" /> {r.telefono || "—"}</span>
                        <span className="inline-flex items-center gap-1 text-gray-600"><Mail size={12} className="text-gray-400" /> {r.email || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                        <PawPrint size={13} /> {r.total_mascotas}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <BadgeEstado config={ESTADO_REFUGIO[r.estado] || ESTADO_REFUGIO.suspendido} />
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{formatFecha(r.creado_en)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => onVerDetalles(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-sm shadow-rose-100"
                        >
                          <Eye size={14} /> Ver detalles
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, color = "hover:text-rose-600 hover:bg-rose-50" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center transition-colors ${color}`}
    >
      {children}
    </button>
  );
}

// ========================================================
// PESTAÑA 2: SOLICITUDES DE REFUGIOS
// ========================================================

function TabSolicitudes({ solicitudes, stats, cargando, filtro, setFiltro, busqueda, setBusqueda, onVer, onEliminar }) {
  const statCards = [
    { label: "Pendientes", value: stats.pendientes || 0, bg: "bg-amber-50 text-amber-600" },
    { label: "Info. solicitada", value: stats.informacion_solicitada || 0, bg: "bg-blue-50 text-blue-600" },
    { label: "Aprobadas", value: stats.aprobadas || 0, bg: "bg-emerald-50 text-emerald-600" },
    { label: "Rechazadas", value: stats.rechazadas || 0, bg: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${s.bg}`}>{s.value}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{s.label}</p>
              <p className="text-[11px] text-gray-400">solicitudes</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador y filtro */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por refugio, representante o correo..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-gray-50/50 placeholder-gray-400 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
          />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white outline-none focus:border-rose-300 cursor-pointer">
          <option value="">Estado: todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="informacion_solicitada">Información solicitada</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </div>

      {/* Tarjetas de solicitudes */}
      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-52 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-8 bg-gray-100 rounded mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <Inbox size={44} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay solicitudes de refugio</p>
          <p className="text-gray-400 text-sm mt-1">
            Las solicitudes enviadas desde "Registrar mi refugio" aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {solicitudes.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:border-rose-100 transition-all duration-300 group">
              <div className="flex items-start gap-3">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.nombre_refugio} className="w-14 h-14 rounded-2xl object-cover border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-rose-500 shrink-0">
                    <Building2 size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-900 truncate">{s.nombre_refugio}</h3>
                    <BadgeEstado config={ESTADO_SOLICITUD[s.estado] || ESTADO_SOLICITUD.pendiente} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin size={11} className="text-gray-400" />
                    {`${[s.departamento, s.municipio || s.ciudad].filter(Boolean).join(", ") || "Ubicación no indicada"}`} · Solicitud #{s.id}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <p className="text-gray-500 flex items-center gap-1.5 truncate"><UserIcon /> {`${s.representante_nombre || ""} ${s.representante_apellido || ""}`.trim()}</p>
                <p className="text-gray-500 flex items-center gap-1.5 truncate"><Mail size={12} className="text-gray-400" /> {s.representante_email}</p>
                <p className="text-gray-500 flex items-center gap-1.5"><Phone size={12} className="text-gray-400" /> {s.representante_telefono || "—"}</p>
                <p className="text-gray-500 flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> {formatFecha(s.creada_en)}</p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <FileText size={12} /> {s.total_documentos || 0} documentos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEliminar(s)}
                    title="Eliminar solicitud"
                    className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => onVer(s)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-sm shadow-rose-100 group-hover:shadow-md"
                  >
                    Ver solicitud <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ========================================================
// MODAL EDITAR REFUGIO
// ========================================================

function ModalEditar({ refugio, onClose, onGuardar }) {
  const [form, setForm] = useState({
    nombre: refugio.nombre || "",
    descripcion: refugio.descripcion || "",
    departamento: refugio.departamento || "",
    municipio: refugio.municipio || refugio.ubicacion || "",
    direccion: refugio.direccion || "",
    telefono: refugio.telefono || "",
    email: refugio.email || "",
    website: refugio.website || "",
    facebook: refugio.facebook || "",
    instagram: refugio.instagram || "",
    tiktok: refugio.tiktok || "",
    anio_fundacion: refugio.anio_fundacion || "",
  });
  const [cargando, setCargando] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    setCargando(true);
    const payload = {
      ...form,
      // La columna ubicacion (ciudad) conserva el valor del municipio.
      ubicacion: form.municipio,
      anio_fundacion: form.anio_fundacion ? Number(form.anio_fundacion) : null,
    };
    await onGuardar(payload);
    setCargando(false);
  };

  const inputCls = "w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 bg-gray-50/50 placeholder-gray-400 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100";

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center"><Edit3 size={18} /></span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Editar refugio</h3>
              <p className="text-xs text-gray-500">{refugio.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200"><X size={16} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del refugio</label>
            <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Departamento</label>
            <input value={form.departamento} onChange={(e) => set("departamento", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Municipio</label>
            <input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label>
            <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
            <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Correo de contacto</label>
            <input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sitio web</label>
            <input value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Año de fundación</label>
            <input value={form.anio_fundacion} onChange={(e) => set("anio_fundacion", e.target.value)} type="number" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Facebook</label>
            <input value={form.facebook} onChange={(e) => set("facebook", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Instagram</label>
            <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">TikTok</label>
            <input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancelar</button>
          <button
            onClick={guardar}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold text-sm hover:from-rose-600 hover:to-amber-600 disabled:opacity-60"
          >
            {cargando && <Loader2 size={15} className="animate-spin" />} Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// MODAL CONFIRMACIÓN
// ========================================================

function ModalConfirmacion({ accion, onClose, onConfirmar }) {
  const { tipo, refugio } = accion;
  const config = {
    suspender: { titulo: "Suspender refugio", desc: `Se desactivará el acceso de "${refugio.nombre}" a la plataforma.`, btn: "Suspender", icon: Lock, color: "from-amber-500 to-orange-500", bg: "bg-amber-100 text-amber-600" },
    activar: { titulo: "Activar refugio", desc: `Se reactivará el acceso de "${refugio.nombre}" a la plataforma.`, btn: "Activar", icon: Unlock, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-100 text-emerald-600" },
    eliminar: { titulo: "Eliminar refugio", desc: `Se eliminará definitivamente "${refugio.nombre}" junto con su usuario. Esta acción no se puede deshacer.`, btn: "Eliminar", icon: Trash2, color: "from-rose-500 to-red-500", bg: "bg-rose-100 text-rose-600" },
  }[tipo];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className={`mx-auto w-16 h-16 rounded-2xl ${config.bg} flex items-center justify-center mb-4`}>
            <Icon size={30} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{config.titulo}</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{config.desc}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">Cancelar</button>
            <button onClick={onConfirmar} className={`flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r ${config.color} text-white font-semibold hover:opacity-90`}>
              {config.btn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// MODAL ELIMINAR SOLICITUD
// ========================================================

function ModalEliminarSolicitud({ solicitud, onClose, onConfirmar }) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
            <Trash2 size={30} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar solicitud</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Se eliminará la solicitud de <strong>{solicitud.nombre_refugio}</strong> (Solicitud #{solicitud.id}).
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={onConfirmar} className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold hover:opacity-90">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
