import { useState, useEffect, useCallback } from "react";
import {
  Store, Search, MapPin, X, CheckCircle2, Loader2,
  AlertCircle, FileText, Clock, Check, Inbox, ShieldCheck, Eye, Trash2,
  ClipboardList, MessageCircle, User, Image as ImageIcon,
} from "lucide-react";
import {
  listarSolicitudesTienda,
  estadisticasSolicitudesTienda,
  obtenerSolicitudTienda,
  aprobarSolicitudTienda,
  rechazarSolicitudTienda,
  solicitarInformacionSolicitudTienda,
  eliminarSolicitudTienda,
  verificarDocumentoSolicitudTienda,
} from "../../api/admin";

// ========================================================
// CONFIG
// ========================================================

const ESTADO_SOLICITUD = {
  pendiente: { label: "Pendiente", dot: "bg-amber-400", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  informacion_solicitada: { label: "Info. solicitada", dot: "bg-blue-400", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  aprobada: { label: "Aprobada", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazada: { label: "Rechazada", dot: "bg-rose-500", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

const CATEGORIAS_DOC = {
  identidad: "Documento de identidad",
  camara_comercio: "Cámara de Comercio / RUT",
  fachada: "Fachada del local",
  fotografias: "Fotografías",
  instalaciones: "Instalaciones del local",
  productos: "Fotografías de productos",
  nit: "NIT",
  otros: "Otros documentos",
};

function BadgeEstado({ estado }) {
  const config = ESTADO_SOLICITUD[estado] || ESTADO_SOLICITUD.pendiente;
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

function Modal({ isOpen, onClose, title, children, size = "md" }) {
  if (!isOpen) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-overlay" />
      <div
        className={`relative w-full ${sizes[size] || sizes.md} bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border animate-modal-content max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-border shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE PRINCIPAL
// ========================================================

export default function SolicitudesTiendas() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [stats, setStats] = useState({});
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [rechazar, setRechazar] = useState(null); // { id, nombre }
  const [motivo, setMotivo] = useState("");
  const [solicitarInfo, setSolicitarInfo] = useState(null); // { id, nombre }
  const [mensajeInfo, setMensajeInfo] = useState("");
  const [confirmarAprobacion, setConfirmarAprobacion] = useState(null);
  const [eliminar, setEliminar] = useState(null);
  const [accionCargando, setAccionCargando] = useState(false);
  const [toast, setToast] = useState(null);

  const notificar = (mensaje, tipo = "success") => setToast({ mensaje, tipo });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, s] = await Promise.all([
        listarSolicitudesTienda({ estado: filtro || undefined, busqueda: busqueda || undefined }),
        estadisticasSolicitudesTienda(),
      ]);
      setSolicitudes(Array.isArray(lista) ? lista : []);
      setStats(s || {});
    } catch {
      setSolicitudes([]);
      setStats({});
    } finally {
      setCargando(false);
    }
  }, [filtro, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirDetalle = async (id) => {
    setDetalle(null);
    setCargandoDetalle(true);
    try {
      const data = await obtenerSolicitudTienda(id);
      setDetalle(data);
    } catch (e) {
      notificar(e.message || "No se pudo cargar el expediente.", "error");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const ejecutarAprobacion = async () => {
    if (!confirmarAprobacion) return;
    setAccionCargando(true);
    try {
      await aprobarSolicitudTienda(confirmarAprobacion.id);
      notificar("Solicitud aprobada. Tienda y cuenta creadas.");
      setConfirmarAprobacion(null);
      await cargar();
      if (detalle?.id === confirmarAprobacion.id) abrirDetalle(confirmarAprobacion.id);
    } catch (e) {
      notificar(e.message || "No se pudo aprobar la solicitud.", "error");
    } finally {
      setAccionCargando(false);
    }
  };

  const ejecutarRechazo = async () => {
    if (!rechazar) return;
    if (!motivo.trim()) {
      notificar("El motivo del rechazo es obligatorio.", "error");
      return;
    }
    setAccionCargando(true);
    try {
      await rechazarSolicitudTienda(rechazar.id, motivo.trim());
      notificar("Solicitud rechazada.");
      setRechazar(null);
      setMotivo("");
      await cargar();
      if (detalle?.id === rechazar.id) abrirDetalle(rechazar.id);
    } catch (e) {
      notificar(e.message || "No se pudo rechazar la solicitud.", "error");
    } finally {
      setAccionCargando(false);
    }
  };

  const ejecutarSolicitarInfo = async () => {
    if (!solicitarInfo) return;
    if (!mensajeInfo.trim()) {
      notificar("El mensaje de solicitud de información es obligatorio.", "error");
      return;
    }
    setAccionCargando(true);
    try {
      await solicitarInformacionSolicitudTienda(solicitarInfo.id, mensajeInfo.trim());
      notificar("Se solicitó información adicional.");
      setSolicitarInfo(null);
      setMensajeInfo("");
      await cargar();
      if (detalle?.id === solicitarInfo.id) abrirDetalle(solicitarInfo.id);
    } catch (e) {
      notificar(e.message || "No se pudo solicitar la información.", "error");
    } finally {
      setAccionCargando(false);
    }
  };

  const ejecutarEliminar = async () => {
    if (!eliminar) return;
    setAccionCargando(true);
    try {
      await eliminarSolicitudTienda(eliminar.id);
      notificar("Solicitud eliminada.");
      setEliminar(null);
      await cargar();
    } catch (e) {
      notificar(e.message || "No se pudo eliminar la solicitud.", "error");
    } finally {
      setAccionCargando(false);
    }
  };

  const verificarDoc = async (documento, estado) => {
    try {
      await verificarDocumentoSolicitudTienda(documento.id, estado);
      notificar("Estado del documento actualizado.");
      abrirDetalle(detalle.id);
    } catch (e) {
      notificar(e.message || "No se pudo actualizar el documento.", "error");
    }
  };

  const tabs = [
    { key: "", label: "Todas", count: stats.total },
    { key: "pendiente", label: "Pendientes", count: stats.pendientes },
    { key: "informacion_solicitada", label: "Info. solicitada", count: stats.informacion_solicitada },
    { key: "aprobada", label: "Aprobadas", count: stats.aprobadas },
    { key: "rechazada", label: "Rechazadas", count: stats.rechazadas },
  ];

  const Fila = ({ label, valor }) => (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right break-words max-w-[60%]">{valor || "—"}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onClose={() => setToast(null)} />

      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Solicitudes de Tiendas Aliadas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa y aprueba las solicitudes de ingreso de nuevas tiendas a la plataforma.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por tienda, representante o correo"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-sm bg-white dark:bg-dark-card outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          />
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { key: "total", label: "Total", icon: Inbox, color: "text-rose-600 bg-rose-50" },
          { key: "pendientes", label: "Pendientes", icon: Clock, color: "text-amber-600 bg-amber-50" },
          { key: "informacion_solicitada", label: "Info. solicitada", icon: MessageCircle, color: "text-blue-600 bg-blue-50" },
          { key: "aprobadas", label: "Aprobadas", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
          { key: "rechazadas", label: "Rechazadas", icon: X, color: "text-rose-600 bg-rose-50" },
        ].map((s) => (
          <div key={s.key} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color} mb-2`}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{stats[s.key] ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFiltro(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
              ${filtro === t.key
                ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20"
                : "bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 hover:text-rose-600"}`}
          >
            {t.label} <span className="ml-1 opacity-80">({t.count ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-rose-400 animate-spin" />
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="text-center py-16">
            <Store size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay solicitudes de tiendas en este filtro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-bg text-left text-xs uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary">
                  <th className="px-5 py-3 font-semibold">Tienda</th>
                  <th className="px-5 py-3 font-semibold">Representante</th>
                  <th className="px-5 py-3 font-semibold">Ubicación</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
                {solicitudes.map((s) => (
                  <tr key={s.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-500/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.nombre_tienda} className="w-9 h-9 rounded-xl object-cover border border-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-rose-600 font-bold">
                            {(s.nombre_tienda || "T")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-gray-900 dark:text-dark-text">{s.nombre_tienda}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-dark-text-secondary">
                      {s.representante_nombre} {s.representante_apellido || ""}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-dark-text-secondary">{s.ciudad || "—"}</td>
                    <td className="px-5 py-3.5"><BadgeEstado estado={s.estado} /></td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-dark-text-secondary">{formatFecha(s.creada_en)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirDetalle(s.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                          <Eye size={14} /> Expediente
                        </button>
                        <button
                          onClick={() => setEliminar(s)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
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

      {/* ===== Modal Detalle / Expediente ===== */}
      <Modal isOpen={!!detalle || cargandoDetalle} onClose={() => setDetalle(null)} title="Expediente de solicitud" size="lg">
        {cargandoDetalle ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-rose-400 animate-spin" />
          </div>
        ) : detalle ? (
          <div className="space-y-5">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {detalle.logo_url ? (
                <img src={detalle.logo_url} alt={detalle.nombre_tienda} className="w-16 h-16 rounded-2xl object-cover border border-gray-100" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-rose-600 font-bold text-2xl">
                  {(detalle.nombre_tienda || "T")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-900 dark:text-dark-text">{detalle.nombre_tienda}</h4>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <MapPin size={13} /> {[detalle.ciudad, detalle.direccion].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <BadgeEstado estado={detalle.estado} />
            </div>

            {/* Acciones según estado */}
            {["pendiente", "informacion_solicitada"].includes(detalle.estado) && (
              <div className="flex flex-wrap gap-2 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-100 p-4">
                <button
                  onClick={() => setConfirmarAprobacion(detalle)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm"
                >
                  <CheckCircle2 size={16} /> Aprobar
                </button>
                <button
                  onClick={() => { setRechazar(detalle); setMotivo(""); }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-all shadow-sm"
                >
                  <X size={16} /> Rechazar
                </button>
                <button
                  onClick={() => { setSolicitarInfo(detalle); setMensajeInfo(""); }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 transition-all"
                >
                  <MessageCircle size={16} /> Solicitar información
                </button>
              </div>
            )}

            {detalle.motivo_rechazo && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
                <strong>Motivo del rechazo:</strong> {detalle.motivo_rechazo}
              </div>
            )}
            {detalle.mensaje_informacion && (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
                <strong>Información solicitada:</strong> {detalle.mensaje_informacion}
              </div>
            )}
            {detalle.username_generado && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
                <strong>Usuario generado:</strong> {detalle.username_generado}
              </div>
            )}

            {/* Información */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <h5 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">
                  <Store size={15} className="text-rose-500" /> Tienda
                </h5>
                <Fila label="Nombre" valor={detalle.nombre_tienda} />
                <Fila label="Correo" valor={detalle.email_contacto} />
                <Fila label="Teléfono" valor={detalle.telefono} />
                <Fila label="Departamento" valor={detalle.departamento} />
                <Fila label="Municipio" valor={detalle.municipio} />
                <Fila label="Dirección" valor={detalle.direccion} />
                <Fila label="Sitio web" valor={detalle.website} />
                <Fila label="Horario semana" valor={detalle.horario_semana} />
                <Fila label="Horario fin de semana" valor={detalle.horario_fin_semana} />
                <Fila label="Facebook" valor={detalle.facebook} />
                <Fila label="Instagram" valor={detalle.instagram} />
                {detalle.descripcion && (
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{detalle.descripcion}</p>
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                  <h5 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">
                    <User size={15} className="text-rose-500" /> Representante
                  </h5>
                  <Fila label="Nombre" valor={`${detalle.representante_nombre} ${detalle.representante_apellido || ""}`} />
                  <Fila label="Correo" valor={detalle.representante_email} />
                  <Fila label="Teléfono" valor={detalle.representante_telefono} />
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                  <h5 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">
                    <FileText size={15} className="text-rose-500" /> Documentos ({detalle.total_documentos})
                  </h5>
                  {detalle.documentos?.length ? (
                    <div className="space-y-2">
                      {detalle.documentos.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <ImageIcon size={15} className="text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-700 truncate">{CATEGORIAS_DOC[doc.categoria] || doc.categoria}</p>
                              <p className="text-[10px] text-gray-400 truncate">{doc.nombre_archivo}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100"
                            >
                              Ver
                            </a>
                            {["pendiente", "informacion_solicitada"].includes(detalle.estado) && (
                              <>
                                <button
                                  onClick={() => verificarDoc(doc, "verificado")}
                                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                >
                                  Validar
                                </button>
                                <button
                                  onClick={() => verificarDoc(doc, "no_valido")}
                                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100"
                                >
                                  Rechazar doc
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Sin documentos adjuntos.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Historial */}
            {detalle.historial?.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <h5 className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
                  <ClipboardList size={15} className="text-rose-500" /> Historial
                </h5>
                <div className="space-y-3">
                  {detalle.historial.map((h) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{h.descripcion}</p>
                        <p className="text-[11px] text-gray-400">{formatFecha(h.creado_en)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-right">
              <button
                onClick={() => setDetalle(null)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ===== Modal confirmar aprobación ===== */}
      <Modal isOpen={!!confirmarAprobacion} onClose={() => !accionCargando && setConfirmarAprobacion(null)} title="Aprobar solicitud" size="sm">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={26} />
          </div>
          <p className="text-gray-700 leading-relaxed mb-6">
            ¿Confirmas que deseas <strong>aprobar</strong> la solicitud de{" "}
            <strong>{confirmarAprobacion?.nombre_tienda}</strong>? Se creará la cuenta de la
            tienda y se enviará un correo con el enlace para crear su contraseña.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmarAprobacion(null)}
              disabled={accionCargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={ejecutarAprobacion}
              disabled={accionCargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60"
            >
              {accionCargando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Aprobar
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== Modal rechazo ===== */}
      <Modal isOpen={!!rechazar} onClose={() => !accionCargando && setRechazar(null)} title="Rechazar solicitud" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Rechazarás la solicitud de <strong>{rechazar?.nombre_tienda}</strong>. El motivo
            se enviará por correo al solicitante.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo del rechazo *</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Explica el motivo del rechazo..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setRechazar(null)}
              disabled={accionCargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={ejecutarRechazo}
              disabled={accionCargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 disabled:opacity-60"
            >
              {accionCargando ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              Rechazar
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== Modal solicitar información ===== */}
      <Modal isOpen={!!solicitarInfo} onClose={() => !accionCargando && setSolicitarInfo(null)} title="Solicitar información adicional" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Solicita información adicional a <strong>{solicitarInfo?.nombre_tienda}</strong>. El
            mensaje se enviará por correo con un enlace para completar la solicitud.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje *</label>
            <textarea
              value={mensajeInfo}
              onChange={(e) => setMensajeInfo(e.target.value)}
              rows={3}
              placeholder="Describe qué información necesitas..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSolicitarInfo(null)}
              disabled={accionCargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={ejecutarSolicitarInfo}
              disabled={accionCargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:from-blue-600 hover:to-indigo-600 disabled:opacity-60"
            >
              {accionCargando ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              Enviar solicitud
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== Modal eliminar ===== */}
      <Modal isOpen={!!eliminar} onClose={() => !accionCargando && setEliminar(null)} title="Eliminar solicitud" size="sm">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Trash2 size={24} />
          </div>
          <p className="text-gray-700 leading-relaxed mb-6">
            ¿Deseas eliminar la solicitud de <strong>{eliminar?.nombre_tienda}</strong>? Esta
            acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setEliminar(null)}
              disabled={accionCargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={ejecutarEliminar}
              disabled={accionCargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 disabled:opacity-60"
            >
              {accionCargando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
