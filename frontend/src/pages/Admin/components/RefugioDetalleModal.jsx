import React, { useState, useEffect, useCallback } from "react";
import {
  Building2, Mail, Phone, MapPin, Globe, Music2, Calendar, X,
  Edit3, Lock, Unlock, Trash2, PawPrint, Package, HeartHandshake,
  Loader2, ShieldCheck, User, CheckCircle2, AlertTriangle, Clock,
  FileText, MessageSquare, Save, Locate,
} from "lucide-react";
import { FacebookIcon, InstagramIcon } from "../../../components/SocialIcons";
import {
  obtenerRefugioAdmin,
  actualizarRefugioAdmin,
  cambiarEstadoRefugioAdmin,
  eliminarRefugioAdmin,
} from "../../../api/admin";

const inputCls = "w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 bg-gray-50/50 placeholder-gray-400 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100";

function formatFecha(fecha) {
  if (!fecha) return "—";
  try {
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return fecha;
  }
}

export default function RefugioDetalleModal({ refugio, onClose, onActualizar, notificar }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [confirmAccion, setConfirmAccion] = useState(null); // 'activar' | 'inactivar' | 'eliminar'
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [form, setForm] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerRefugioAdmin(refugio.id);
      setDetalle(data);
    } catch (e) {
      notificar?.(e.message || "No se pudo cargar el refugio.", "error");
    } finally {
      setCargando(false);
    }
  }, [refugio.id, notificar]);

  useEffect(() => { cargar(); }, [cargar]);

  const iniciarEdicion = () => {
    setForm({
      nombre: detalle.nombre || "",
      descripcion: detalle.descripcion || "",
      departamento: detalle.departamento || "",
      ciudad: detalle.ciudad || detalle.ubicacion || "",
      municipio: detalle.municipio || "",
      direccion: detalle.direccion || "",
      telefono: detalle.telefono || "",
      email: detalle.email || "",
      website: detalle.website || "",
      facebook: detalle.facebook || "",
      instagram: detalle.instagram || "",
      tiktok: detalle.tiktok || "",
      anio_fundacion: detalle.anio_fundacion || "",
    });
    setEditando(true);
  };

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  // Obtiene la ubicación actual del dispositivo (geolocalización) y rellena
  // los campos de ubicación + coordenadas del refugio.
  const usarMiUbicacion = async () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no soporta geolocalización. Puedes escribir la ubicación manualmente.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    try {
      const posicion = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
      });
      // Geocodificación inversa (opcional) para rellenar el texto de ubicación.
      let departamento = "", municipio = "", ciudad = "", direccion = "";
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${posicion.coords.latitude}&lon=${posicion.coords.longitude}&accept-language=es`,
          { headers: { "User-Agent": "AdoptifyApp/1.0" } }
        );
        if (res.ok) {
          const data = await res.json();
          const a = data.address || {};
          departamento = a.state || a.region || "";
          municipio = a.city || a.town || a.village || a.municipality || a.county || "";
          ciudad = a.city || a.town || a.village || municipio || "";
          direccion = [a.road, a.neighbourhood, a.suburb, a.hamlet].filter(Boolean).join(", ");
        }
      } catch { /* la geocodificación es opcional */ }
      setForm((prev) => ({
        ...prev,
        departamento: departamento || prev.departamento,
        municipio: municipio || prev.municipio,
        ciudad: ciudad || prev.ciudad,
        direccion: direccion || prev.direccion,
      }));
    } catch {
      setGeoError("No se pudo obtener la ubicación. Verifica los permisos o ingrésala manualmente.");
    } finally {
      setGeoLoading(false);
    }
  };

  const guardarEdicion = async () => {
    setCargandoAccion(true);
    try {
      await actualizarRefugioAdmin(detalle.id, {
        ...form,
        ubicacion: form.ciudad,
        anio_fundacion: form.anio_fundacion ? Number(form.anio_fundacion) : null,
      });
      notificar?.("Refugio actualizado correctamente.");
      setEditando(false);
      await cargar();
      onActualizar?.();
    } catch (e) {
      notificar?.(e.message || "No se pudo guardar.", "error");
    } finally {
      setCargandoAccion(false);
    }
  };

  const ejecutarConfirm = async () => {
    if (!confirmAccion) return;
    setCargandoAccion(true);
    try {
      if (confirmAccion === "activar" || confirmAccion === "inactivar") {
        await cambiarEstadoRefugioAdmin(detalle.id, confirmAccion === "activar");
        notificar?.(`Refugio ${confirmAccion === "activar" ? "activado" : "inactivado"} correctamente.`);
        setConfirmAccion(null);
        await cargar();
        onActualizar?.();
      } else if (confirmAccion === "eliminar") {
        await eliminarRefugioAdmin(detalle.id);
        notificar?.("Refugio eliminado correctamente.");
        onActualizar?.();
        onClose();
      }
    } catch (e) {
      notificar?.(e.message || "No se pudo completar la acción.", "error");
    } finally {
      setCargandoAccion(false);
    }
  };

  const activo = detalle?.estado === "activo";

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-4 animate-pop-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Encabezado ===== */}
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-5 flex items-center gap-4">
          {detalle?.logo_url ? (
            <img src={detalle.logo_url} alt={detalle.nombre} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/50 bg-white" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white">
              <Building2 size={26} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">{detalle?.nombre || refugio.nombre}</h2>
            <p className="text-xs text-white/80 mt-0.5">Detalle del refugio · ID #{detalle?.id}</p>
          </div>
          <button onClick={onClose} className="shrink-0 w-9 h-9 rounded-xl bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors" title="Cerrar">
            <X size={18} />
          </button>
        </div>

        {cargando && !detalle ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Loader2 size={30} className="text-rose-400 animate-spin" />
            <p className="text-gray-400 text-sm">Cargando información del refugio...</p>
          </div>
        ) : detalle ? (
          <>
            {/* ===== Contenido ===== */}
            <div className="px-6 py-6 space-y-6 max-h-[65vh] overflow-y-auto">
              {/* Estado + fecha */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  activo
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activo ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {activo ? "Activo" : "Inactivo"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar size={13} /> Registrado el {formatFecha(detalle.creado_en)}
                </span>
                {detalle.verificado && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-semibold">
                    <ShieldCheck size={12} /> Verificado
                  </span>
                )}
                {detalle.tienda_habilitada && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-200 text-[11px] font-semibold">
                    <Package size={12} /> Tienda habilitada
                  </span>
                )}
              </div>

              {/* Información general */}
              <Seccion titulo="Información general" icono={Building2}>
                <CampoInfo label="Nombre del refugio" valor={detalle.nombre} />
                <CampoInfo label="Año de fundación" valor={detalle.anio_fundacion} />
                <CampoInfo label="Fecha de registro" valor={formatFecha(detalle.creado_en)} />
                {detalle.descripcion && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Descripción</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{detalle.descripcion}</p>
                  </div>
                )}
              </Seccion>

              {/* Información de contacto */}
              <Seccion titulo="Información de contacto" icono={Mail}>
                <CampoInfo icono={Mail} label="Correo electrónico" valor={detalle.email} />
                <CampoInfo icono={Phone} label="Teléfono" valor={detalle.telefono} />
                <CampoInfo icono={MapPin} label="Departamento" valor={detalle.departamento} />
                <CampoInfo icono={MapPin} label="Ciudad" valor={detalle.ciudad} />
                <CampoInfo icono={MapPin} label="Municipio" valor={detalle.municipio} />
                <CampoInfo icono={MapPin} label="Dirección" valor={detalle.direccion} />
                <CampoInfo icono={Globe} label="Sitio web" valor={detalle.website} />
              </Seccion>

              {/* Redes sociales */}
              <Seccion titulo="Redes sociales" icono={Globe}>
                <CampoInfo icono={FacebookIcon} label="Facebook" valor={detalle.facebook} />
                <CampoInfo icono={InstagramIcon} label="Instagram" valor={detalle.instagram} />
                <CampoInfo icono={Music2} label="TikTok" valor={detalle.tiktok} />
              </Seccion>

              {/* Representante */}
              <Seccion titulo="Representante" icono={User}>
                <CampoInfo icono={User} label="Nombre completo" valor={detalle.usuario_nombre} />
                <CampoInfo icono={Mail} label="Correo electrónico" valor={detalle.usuario_email} />
                <CampoInfo icono={Phone} label="Teléfono" valor={detalle.usuario_telefono} />
              </Seccion>

              {/* Estadísticas */}
              <Seccion titulo="Estadísticas" icono={HeartHandshake}>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard icono={PawPrint} color="bg-rose-50 text-rose-500" label="Mascotas" valor={detalle.total_mascotas ?? 0} />
                  <StatCard icono={HeartHandshake} color="bg-emerald-50 text-emerald-500" label="Adopciones" valor={detalle.total_adopciones ?? 0} />
                  <StatCard icono={Package} color="bg-amber-50 text-amber-500" label="Productos" valor={detalle.total_productos ?? 0} />
                </div>
              </Seccion>
            </div>

            {/* ===== Acciones CRUD ===== */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60">
              {editando ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 max-h-[45vh] overflow-y-auto pr-1">
                  <CampoForm label="Nombre del refugio" value={form.nombre} onChange={(v) => set("nombre", v)} />
                  <CampoForm label="Año de fundación" value={form.anio_fundacion} onChange={(v) => set("anio_fundacion", v)} type="number" />
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                    <textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={2} className={`${inputCls} resize-none`} />
                  </div>
                  <CampoForm label="Departamento" value={form.departamento} onChange={(v) => set("departamento", v)} />
                  <CampoForm label="Ciudad" value={form.ciudad} onChange={(v) => set("ciudad", v)} />
                  <CampoForm label="Municipio" value={form.municipio} onChange={(v) => set("municipio", v)} />
                  <CampoForm label="Dirección" value={form.direccion} onChange={(v) => set("direccion", v)} />
                  {/* Ubicación automática: obtener la ubicación del dispositivo */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={usarMiUbicacion}
                      disabled={geoLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-semibold text-xs hover:bg-rose-100 transition-colors disabled:opacity-60"
                    >
                      {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <Locate size={14} />}
                      {geoLoading ? "Obteniendo ubicación..." : "Obtener mi ubicación"}
                    </button>
                    {geoError && <p className="text-xs text-rose-600 mt-1.5">{geoError}</p>}
                  </div>
                  <CampoForm label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} />
                  <CampoForm label="Correo de contacto" value={form.email} onChange={(v) => set("email", v)} />
                  <CampoForm label="Sitio web" value={form.website} onChange={(v) => set("website", v)} />
                  <CampoForm label="Facebook" value={form.facebook} onChange={(v) => set("facebook", v)} />
                  <CampoForm label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} />
                  <CampoForm label="TikTok" value={form.tiktok} onChange={(v) => set("tiktok", v)} />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText size={14} /> Gestión del refugio
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={iniciarEdicion}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-600 font-semibold text-xs hover:bg-blue-50 transition-colors"
                    >
                      <Edit3 size={14} /> Editar
                    </button>
                    <button
                      onClick={() => setConfirmAccion(activo ? "inactivar" : "activar")}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-colors ${
                        activo
                          ? "border-amber-200 bg-white text-amber-600 hover:bg-amber-50"
                          : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                      }`}
                    >
                      {activo ? <Lock size={14} /> : <Unlock size={14} />}
                      {activo ? "Inactivar refugio" : "Activar refugio"}
                    </button>
                    <button
                      onClick={() => setConfirmAccion("eliminar")}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 bg-white text-rose-600 font-semibold text-xs hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={14} /> Eliminar refugio
                    </button>
                    <button
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors"
                    >
                      <X size={14} /> Cerrar
                    </button>
                  </div>
                </div>
              )}

              {editando && (
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditando(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    onClick={guardarEdicion}
                    disabled={cargandoAccion}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold text-xs hover:from-rose-600 hover:to-amber-600 disabled:opacity-60"
                  >
                    {cargandoAccion ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar cambios
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* ===== Modal de confirmación ===== */}
        {confirmAccion && (
          <ConfirmAccionModal
            accion={confirmAccion}
            activo={activo}
            nombre={detalle?.nombre}
            cargando={cargandoAccion}
            onClose={() => setConfirmAccion(null)}
            onConfirmar={ejecutarConfirm}
          />
        )}
      </div>
    </div>
  );
}

// ========================================================
// SUBCOMPONENTES
// ========================================================

function Seccion({ titulo, icono: Icono, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-500 flex items-center justify-center">
          <Icono size={15} />
        </span>
        <h3 className="text-sm font-bold text-gray-800">{titulo}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">{children}</div>
    </div>
  );
}

function CampoInfo({ label, valor, icono: Icono }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icono && (
        <span className="mt-0.5 text-gray-300 flex-shrink-0">
          <Icono size={14} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm text-gray-800 break-words">{valor || "—"}</p>
      </div>
    </div>
  );
}

function StatCard({ icono: Icono, color, label, valor }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 flex items-center gap-3">
      <span className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
        <Icono size={17} />
      </span>
      <div>
        <p className="text-lg font-bold text-gray-900 leading-none">{valor}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CampoForm({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} type={type} className={inputCls} />
    </div>
  );
}

function ConfirmAccionModal({ accion, activo, nombre, cargando, onClose, onConfirmar }) {
  const configs = {
    activar: {
      titulo: "¿Activar refugio?",
      desc: `Se reactivará el acceso de "${nombre}" a la plataforma.`,
      icono: Unlock, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-100 text-emerald-600",
      btn: "Activar",
    },
    inactivar: {
      titulo: "¿Inactivar refugio?",
      desc: `Se desactivará el acceso de "${nombre}" a la plataforma.`,
      icono: Lock, color: "from-amber-500 to-orange-500", bg: "bg-amber-100 text-amber-600",
      btn: "Inactivar",
    },
    eliminar: {
      titulo: "¿Estás seguro de eliminar este refugio?",
      desc: `Se eliminará definitivamente "${nombre}" junto con su usuario. Esta acción no podrá deshacerse.`,
      icono: Trash2, color: "from-rose-500 to-red-500", bg: "bg-rose-100 text-rose-600",
      btn: "Eliminar definitivamente",
    },
  }[accion];
  const Icono = configs.icono;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className={`mx-auto w-16 h-16 rounded-2xl ${configs.bg} flex items-center justify-center mb-4`}>
            <Icono size={30} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{configs.titulo}</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{configs.desc}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={cargando}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${configs.color} text-white font-semibold hover:opacity-90 disabled:opacity-60`}
            >
              {cargando && <Loader2 size={15} className="animate-spin" />} {configs.btn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
