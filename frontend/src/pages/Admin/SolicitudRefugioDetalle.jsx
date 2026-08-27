import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Building2, User, FileText, Image as ImageIcon,
  MessageSquare, History as HistoryIcon, CheckCircle2, XCircle,
  MessageCircle, Mail, Phone, MapPin, Globe,
  Music2, Calendar, Download, Maximize2, ShieldCheck, X, Loader2,
  AlertCircle, ExternalLink, File, PawPrint, Home, LayoutGrid, IdCard,
  Clock, Send, Check,
} from "lucide-react";
import { FacebookIcon, InstagramIcon } from "../../components/SocialIcons";
import {
  obtenerSolicitudRefugio,
  aprobarSolicitudRefugio,
  rechazarSolicitudRefugio,
  solicitarInformacionSolicitud,
  verificarDocumentoSolicitud,
} from "../../api/admin";
import AdminModalPortal from "../../components/admin/AdminModalPortal";

// ========================================================
// CONFIGURACIÓN DE ESTADOS / CATEGORÍAS
// ========================================================

const ESTADO_CONFIG = {
  pendiente: { label: "Pendiente", dot: "bg-amber-400", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  informacion_solicitada: { label: "Información solicitada", dot: "bg-blue-400", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  aprobada: { label: "Aprobada", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazada: { label: "Rechazada", dot: "bg-rose-500", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

const DOC_VERIF_CONFIG = {
  pendiente: { label: "Pendiente", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  verificado: { label: "Verificado", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  no_valido: { label: "No válido", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

const CATEGORIA_LABEL = {
  identidad: "Documento de identidad del representante",
  fachada: "Fotografía de la fachada",
  fotografias: "Fotografías del refugio",
  instalaciones: "Fotografías de las instalaciones",
  animales: "Fotografías de algunos animales",
  camara_comercio: "Cámara de Comercio",
  nit: "NIT",
  personeria_juridica: "Personería Jurídica",
  certificado_fundacion: "Certificado como Fundación",
  otros: "Otros documentos",
};

const CATEGORIA_ICON = {
  identidad: IdCard,
  fachada: Home,
  fotografias: ImageIcon,
  instalaciones: LayoutGrid,
  animales: PawPrint,
  camara_comercio: FileText,
  nit: FileText,
  personeria_juridica: FileText,
  certificado_fundacion: FileText,
  otros: FileText,
};

const HISTORIAL_ACCION = {
  creada: { icon: Send, color: "bg-blue-100 text-blue-600", label: "Solicitud creada" },
  informacion_solicitada: { icon: MessageCircle, color: "bg-blue-100 text-blue-600", label: "Información solicitada" },
  informacion_completada: { icon: Check, color: "bg-amber-100 text-amber-600", label: "Información completada" },
  aprobada: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600", label: "Aprobada" },
  rechazada: { icon: XCircle, color: "bg-rose-100 text-rose-600", label: "Rechazada" },
  verificacion_documento: { icon: ShieldCheck, color: "bg-violet-100 text-violet-600", label: "Verificación de documento" },
  password_creada: { icon: ShieldCheck, color: "bg-teal-100 text-teal-600", label: "Contraseña creada" },
};

const TABS = [
  { id: "refugio", label: "Información del refugio", icon: Building2 },
  { id: "representante", label: "Información del representante", icon: User },
  { id: "documentacion", label: "Documentación", icon: FileText },
  { id: "galeria", label: "Galería", icon: ImageIcon },
  { id: "observaciones", label: "Observaciones", icon: MessageSquare },
  { id: "historial", label: "Historial", icon: HistoryIcon },
];

const MOTIVOS_RECHAZO = [
  "Información inconsistente.",
  "No fue posible verificar el refugio.",
  "Documentación insuficiente.",
  "Fotografías no válidas.",
  "Otro.",
];

function BadgeEstado({ estado }) {
  const c = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  try {
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return fecha;
  }
}

export default function SolicitudRefugioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("refugio");

  // Modales
  const [modal, setModal] = useState(null); // 'aprobar' | 'info' | 'rechazar'
  const [accionCargando, setAccionCargando] = useState(false);
  const [mensajeInfo, setMensajeInfo] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");

  // Lightbox
  const [lightbox, setLightbox] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const data = await obtenerSolicitudRefugio(id);
      setSolicitud(data);
    } catch (e) {
      setError(e.message || "No se pudo cargar la solicitud.");
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutarAccion = async (accion) => {
    setAccionCargando(true);
    setError("");
    try {
      if (accion === "aprobar") await aprobarSolicitudRefugio(id);
      if (accion === "info") await solicitarInformacionSolicitud(id, mensajeInfo);
      if (accion === "rechazar") await rechazarSolicitudRefugio(id, motivoRechazo);
      setModal(null);
      setMensajeInfo("");
      setMotivoRechazo("");
      await cargar();
    } catch (e2) {
      setError(e2.message || "No se pudo completar la acción.");
    } finally {
      setAccionCargando(false);
    }
  };

  const marcarDoc = async (docId, estado) => {
    try {
      await verificarDocumentoSolicitud(docId, estado);
      await cargar();
    } catch {
      /* noop */
    }
  };

  if (cargando && !solicitud) {
    return (
      <div className="space-y-6">
        <Skeleton />
      </div>
    );
  }

  if (error && !solicitud) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => navigate("/admin/refugios")} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">
          Volver al módulo Refugios
        </button>
      </div>
    );
  }

  const docs = solicitud?.documentos || [];
  const imagenesGaleria = docs.filter((d) => d.url && /\.(png|jpe?g|gif|webp|avif)/i.test(d.url));
  const noPuedeActuar = solicitud?.estado === "aprobada" || solicitud?.estado === "rechazada";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/refugios")}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Solicitud de Refugio
              <BadgeEstado estado={solicitud.estado} />
            </h1>
            <p className="text-sm text-gray-500">
              {solicitud.nombre_refugio} · {solicitud.ciudad || "Ciudad no indicada"} · Recibida {formatFecha(solicitud.creada_en)}
            </p>
          </div>
        </div>

        {!noPuedeActuar && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setMensajeInfo(""); setModal("info"); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors"
            >
              <MessageCircle size={16} /> Solicitar información
            </button>
            <button
              onClick={() => { setMotivoRechazo(""); setModal("rechazar"); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-white text-rose-600 font-semibold text-sm hover:bg-rose-50 transition-colors"
            >
              <XCircle size={16} /> Rechazar
            </button>
            <button
              onClick={() => setModal("aprobar")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200"
            >
              <CheckCircle2 size={16} /> Aprobar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Pestañas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            const activa = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${activa
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-200"
                    : "text-gray-600 hover:bg-gray-50"}`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido de pestañas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        {tab === "refugio" && <TabRefugio s={solicitud} />}
        {tab === "representante" && <TabRepresentante s={solicitud} />}
        {tab === "documentacion" && (
          <TabDocumentacion docs={docs} onMarcar={marcarDoc} onAmpliar={setLightbox} onDescargar={(url) => window.open(url, "_blank")} />
        )}
        {tab === "galeria" && <TabGaleria docs={imagenesGaleria} onAmpliar={setLightbox} />}
        {tab === "observaciones" && <TabObservaciones s={solicitud} />}
        {tab === "historial" && <TabHistorial historial={solicitud?.historial || []} />}
      </div>

      {/* Modal aprobar */}
      {modal === "aprobar" && (
        <ModalBase onClose={() => setModal(null)}>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Aprobar esta solicitud?</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Se creará automáticamente la cuenta del refugio <strong>{solicitud.nombre_refugio}</strong> con
              el rol <strong>Refugio</strong>, se generará un usuario único, un enlace seguro para crear la
              contraseña (válido 24 h) y se enviará el correo de bienvenida.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => ejecutarAccion("aprobar")}
                disabled={accionCargando}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60"
              >
                {accionCargando && <Loader2 size={16} className="animate-spin" />} Confirmar aprobación
              </button>
            </div>
          </div>
        </ModalBase>
      )}

      {/* Modal solicitar información */}
      {modal === "info" && (
        <ModalBase onClose={() => setModal(null)}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Solicitar información</h3>
              <p className="text-sm text-gray-500">Indica qué falta para continuar la revisión.</p>
            </div>
          </div>
          <textarea
            value={mensajeInfo}
            onChange={(e) => setMensajeInfo(e.target.value)}
            rows={4}
            placeholder="Ej: Por favor adjunte una fotografía donde se observe claramente la fachada del refugio."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
          />
          <div className="flex gap-3 mt-5">
            <button onClick={() => setModal(null)} className="flex-1 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={() => ejecutarAccion("info")}
              disabled={accionCargando || !mensajeInfo.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50"
            >
              {accionCargando && <Loader2 size={16} className="animate-spin" />} Enviar
            </button>
          </div>
        </ModalBase>
      )}

      {/* Modal rechazar */}
      {modal === "rechazar" && (
        <ModalBase onClose={() => setModal(null)}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <XCircle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Rechazar solicitud</h3>
              <p className="text-sm text-gray-500">El motivo es obligatorio y se enviará al refugio.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {MOTIVOS_RECHAZO.map((m) => (
              <button
                key={m}
                onClick={() => setMotivoRechazo(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                  ${motivoRechazo === m
                    ? "bg-rose-50 border-rose-300 text-rose-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-rose-200 hover:text-rose-600"}`}
              >
                {m}
              </button>
            ))}
          </div>

          <textarea
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            rows={4}
            placeholder="Escribe el motivo del rechazo..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white placeholder-gray-400 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 resize-none"
          />
          {!motivoRechazo.trim() && (
            <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
              <AlertCircle size={12} /> Debes indicar el motivo para rechazar la solicitud.
            </p>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={() => setModal(null)} className="flex-1 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={() => ejecutarAccion("rechazar")}
              disabled={accionCargando || !motivoRechazo.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold hover:from-rose-600 hover:to-red-600 disabled:opacity-50"
            >
              {accionCargando && <Loader2 size={16} className="animate-spin" />} Confirmar rechazo
            </button>
          </div>
        </ModalBase>
      )}

      {/* Lightbox */}
      {lightbox && (
        <AdminModalPortal>
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X size={20} />
          </button>
          <img src={lightbox} alt="Vista ampliada" className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl animate-zoom-in" onClick={(e) => e.stopPropagation()} />
        </div>
        </AdminModalPortal>
      )}
    </div>
  );
}

// ========================================================
// PESTAÑAS
// ========================================================

function FilaInfo({ icono: Icono, label, valor, mono }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="shrink-0 w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
        <Icono size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-sm text-gray-800 break-words ${mono ? "font-mono" : "font-medium"}`}>{valor || "—"}</p>
      </div>
    </div>
  );
}

function TabRefugio({ s }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        {s.logo_url ? (
          <img src={s.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-gray-200" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-rose-500">
            <Building2 size={28} />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{s.nombre_refugio}</h2>
          <p className="text-sm text-gray-500">{s.ciudad || "Ciudad no indicada"} · {s.anio_fundacion ? `Fundado en ${s.anio_fundacion}` : "Año de fundación no indicado"}</p>
        </div>
      </div>
      {s.descripcion && (
        <div className="mb-5 rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-700 leading-relaxed">{s.descripcion}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        <FilaInfo icono={Building2} label="Nombre" valor={s.nombre_refugio} />
        <FilaInfo icono={Mail} label="Correo de contacto" valor={s.email_contacto} />
        <FilaInfo icono={Phone} label="Teléfono" valor={s.telefono} />
        <FilaInfo icono={MapPin} label="Departamento" valor={s.departamento} />
        <FilaInfo icono={MapPin} label="Municipio" valor={s.municipio || s.ciudad} />
        <FilaInfo icono={MapPin} label="Dirección" valor={s.direccion} />
        <FilaInfo icono={Globe} label="Sitio web" valor={s.website} />
        <FilaInfo icono={Calendar} label="Año de fundación" valor={s.anio_fundacion} />
        <FilaInfo icono={FacebookIcon} label="Facebook" valor={s.facebook} />
        <FilaInfo icono={InstagramIcon} label="Instagram" valor={s.instagram} />
        <FilaInfo icono={Music2} label="TikTok" valor={s.tiktok} />
      </div>
    </div>
  );
}

function TabRepresentante({ s }) {
  return (
    <div className="animate-fade-in max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center">
          <User size={26} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {`${s.representante_nombre || ""} ${s.representante_apellido || ""}`.trim()}
          </h2>
          <p className="text-sm text-gray-500">Representante legal / responsable</p>
        </div>
      </div>
      <FilaInfo icono={User} label="Nombre" valor={s.representante_nombre} />
      <FilaInfo icono={User} label="Apellido" valor={s.representante_apellido} />
      <FilaInfo icono={Mail} label="Correo electrónico" valor={s.representante_email} />
      <FilaInfo icono={Phone} label="Teléfono" valor={s.representante_telefono} />
      <div className="mt-5 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-100 p-4 flex gap-3">
        <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-gray-600">
          El correo de inicio de sesión del refugio será el "Correo de contacto" cuando
          la solicitud sea aprobada.
        </p>
      </div>
    </div>
  );
}

function TabDocumentacion({ docs, onMarcar, onAmpliar, onDescargar }) {
  const agrupados = {};
  for (const d of docs) {
    if (!agrupados[d.categoria]) agrupados[d.categoria] = [];
    agrupados[d.categoria].push(d);
  }

  if (!docs.length) {
    return (
      <div className="text-center py-14">
        <FileText size={44} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No se adjuntaron documentos en esta solicitud.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {Object.keys(agrupados).map((cat) => {
        const Icon = CATEGORIA_ICON[cat] || FileText;
        const esImagen = (url) => /\.(png|jpe?g|gif|webp|avif)/i.test(url || "");
        return (
          <div key={cat} className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <Icon size={16} className="text-rose-500" />
              <span className="text-sm font-semibold text-gray-800">{CATEGORIA_LABEL[cat] || cat}</span>
              <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${agrupados[cat][0]?.tipo === "obligatorio" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                {agrupados[cat][0]?.tipo === "obligatorio" ? "Obligatorio" : "Opcional"}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {agrupados[cat].map((d) => (
                <div key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                  {esImagen(d.url) ? (
                    <img src={d.url} alt={d.nombre_archivo} className="w-16 h-14 rounded-lg object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="w-16 h-14 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                      <File size={22} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.nombre_archivo || "Documento"}</p>
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${DOC_VERIF_CONFIG[d.estado_verificacion]?.bg || DOC_VERIF_CONFIG.pendiente.bg}`}>
                      {DOC_VERIF_CONFIG[d.estado_verificacion]?.label || "Pendiente"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => onAmpliar(d.url)} title="Ampliar" className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center">
                      <Maximize2 size={14} />
                    </button>
                    <button onClick={() => onDescargar(d.url)} title="Descargar" className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center">
                      <Download size={14} />
                    </button>
                    {[
                      { v: "verificado", label: "Verificado", cls: "text-emerald-600 hover:bg-emerald-50" },
                      { v: "pendiente", label: "Pendiente", cls: "text-amber-600 hover:bg-amber-50" },
                      { v: "no_valido", label: "No válido", cls: "text-rose-600 hover:bg-rose-50" },
                    ].map((op) => (
                      <button
                        key={op.v}
                        onClick={() => onMarcar(d.id, op.v)}
                        title={`Marcar como ${op.label}`}
                        className={`h-8 px-2 rounded-lg text-[11px] font-semibold ${op.cls} ${d.estado_verificacion === op.v ? "bg-gray-100" : ""}`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabGaleria({ docs, onAmpliar }) {
  if (!docs.length) {
    return (
      <div className="text-center py-14">
        <ImageIcon size={44} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay imágenes en esta solicitud.</p>
      </div>
    );
  }
  return (
    <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {docs.map((d) => (
        <button
          key={d.id}
          onClick={() => onAmpliar(d.url)}
          className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-square"
        >
          <img src={d.url} alt={d.nombre_archivo} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 size={22} className="text-white" />
          </div>
          <span className="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white bg-black/50 px-1.5 py-0.5 rounded truncate text-left">
            {CATEGORIA_LABEL[d.categoria] || d.categoria}
          </span>
        </button>
      ))}
    </div>
  );
}

function TabObservaciones({ s }) {
  const items = [
    { icon: ShieldCheck, label: "Declaración de veracidad", valor: s.acepto_veracidad === "true" ? "Aceptada" : "No aceptada", ok: s.acepto_veracidad === "true" },
    { icon: ShieldCheck, label: "Autorización de verificación", valor: s.autorizo_verificacion === "true" ? "Autorizada" : "No autorizada", ok: s.autorizo_verificacion === "true" },
    { icon: MessageCircle, label: "Mensaje de información solicitada", valor: s.mensaje_informacion },
    { icon: XCircle, label: "Motivo de rechazo", valor: s.motivo_rechazo },
    { icon: User, label: "Administrador responsable", valor: s.administrador_nombre },
    { icon: Calendar, label: "Fecha de revisión", valor: formatFecha(s.fecha_revision) },
    { icon: Calendar, label: "Fecha de aprobación", valor: formatFecha(s.fecha_aprobacion) },
  ];
  return (
    <div className="animate-fade-in max-w-2xl space-y-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${it.ok === false ? "bg-rose-100 text-rose-500" : "bg-gray-100 text-gray-500"}`}>
              <Icon size={17} />
            </span>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{it.label}</p>
              <p className={`text-sm ${it.ok === false ? "text-rose-600 font-semibold" : "text-gray-800"}`}>{it.valor || "—"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabHistorial({ historial }) {
  if (!historial.length) {
    return (
      <div className="text-center py-14">
        <HistoryIcon size={44} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Aún no hay eventos registrados.</p>
      </div>
    );
  }
  return (
    <div className="animate-fade-in max-w-2xl">
      <ol className="relative border-l-2 border-rose-100 ml-5 space-y-8">
        {historial.map((h) => {
          const cfg = HISTORIAL_ACCION[h.accion] || { icon: Clock, color: "bg-gray-100 text-gray-500", label: h.accion };
          const Icon = cfg.icon;
          return (
            <li key={h.id} className="relative pl-8">
              <span className={`absolute -left-[29px] top-0 w-11 h-11 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${cfg.color}`}>
                <Icon size={17} />
              </span>
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-bold text-gray-800">{cfg.label}</p>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} /> {formatFecha(h.creado_en)}
                  </span>
                </div>
                {h.descripcion && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{h.descripcion}</p>}
                {h.administrador_nombre && (
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <User size={11} /> {h.administrador_nombre}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ========================================================
// AUXILIARES
// ========================================================

function ModalBase({ children, onClose }) {
  return (
    <AdminModalPortal>
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-full overflow-y-auto p-6 sm:p-8 animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
    </AdminModalPortal>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
      <div className="h-96 bg-gray-50 rounded-2xl animate-pulse" />
    </div>
  );
}
