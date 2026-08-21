import React, { useState, useEffect, useCallback } from "react";
import {
  X, Eye, Edit3, Trash2, Save, Loader2, PawPrint, MapPin, Phone, Mail,
  Calendar, AlertTriangle, CheckCircle2, ShieldCheck, Heart, Activity,
  ImageOff, Camera, Building2,
} from "lucide-react";
import AdminModalPortal from "../../../components/admin/AdminModalPortal";
import ConfirmModal from "../../../components/admin/ConfirmModal";
import {
  obtenerMascotaAdmin,
  actualizarMascotaAdmin,
  eliminarMascota,
} from "../../../api/admin";
import {
  getTiposMascota,
  getTamanosMascota,
  getGenerosMascota,
  getEstadosMascota,
} from "../../../api/catalogos";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-sm text-gray-800 dark:text-dark-text bg-gray-50/50 dark:bg-dark-bg placeholder-gray-400 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100 transition-all disabled:opacity-50";

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

// ========================================================
// MODAL DE DETALLE / CRUD DE MASCOTA (Panel Administrador)
// --------------------------------------------------------
// Permite Ver toda la información de la mascota (incluidas
// las imágenes), Editar los datos (con barra de carga propia
// que evita envíos duplicados), y Eliminar mediante Soft
// Delete (activo=False), conservando el historial en la BD.
// Se renderiza vía AdminModalPortal para quedar SIEMPRE por
// encima del navbar y del sidebar del Admin.
// ========================================================
export default function MascotaDetalleModal({ mascotaId, onClose, onActualizado, notificar }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [catalogos, setCatalogos] = useState({ tipos: [], tamanos: [], generos: [], estados: [] });
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [imgActiva, setImgActiva] = useState(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const data = await obtenerMascotaAdmin(mascotaId);
      setDetalle(data);
      setImgActiva(0);
    } catch (e) {
      setError(e?.message || "No se pudo cargar la mascota");
    } finally {
      setCargando(false);
    }
  }, [mascotaId]);

  useEffect(() => {
    cargar();
    Promise.all([
      getTiposMascota(), getTamanosMascota(), getGenerosMascota(), getEstadosMascota(),
    ])
      .then(([tipos, tamanos, generos, estados]) => {
        setCatalogos({ tipos, tamanos, generos, estados });
      })
      .catch(() => { /* los catálogos son opcionales */ });
  }, [cargar]);

  // Devuelve el código de un catálogo buscando por id y, como respaldo, por
  // nombre (por si los catálogos aún no se cargaron al iniciar la edición).
  const codigoPorId = (lista, id, nombre) => {
    const porId = lista?.find((i) => i.id === id);
    if (porId) return porId.codigo;
    const porNombre = lista?.find(
      (i) => String(i.nombre || "").toLowerCase() === String(nombre || "").toLowerCase()
    );
    return porNombre?.codigo || "";
  };

  const iniciarEdicion = () => {
    setForm({
      nombre: detalle.nombre || "",
      tipo: codigoPorId(catalogos.tipos, detalle.tipo_id, detalle.tipo) || String(detalle.tipo || "").toLowerCase(),
      tamano: codigoPorId(catalogos.tamanos, detalle.tamano_id, detalle.tamano) || "",
      genero: codigoPorId(catalogos.generos, detalle.genero_id, detalle.genero) || "",
      estado: detalle.estado || "disponible",
      raza: detalle.raza || "",
      edad: detalle.edad || "",
      peso: detalle.peso || "",
      color: detalle.color || "",
      descripcion: detalle.descripcion || "",
      personalidad: Array.isArray(detalle.personalidad)
        ? detalle.personalidad.join(", ")
        : (detalle.personalidad || ""),
      salud: detalle.salud || "",
      requisitos: detalle.requisitos || "",
      vacunado: !!detalle.vacunado,
      esterilizado: !!detalle.esterilizado,
      desparasitado: !!detalle.desparasitado,
    });
    setError("");
    setEditando(true);
  };

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async () => {
    // Evita múltiples envíos mientras la actualización está en curso.
    if (!form || guardando) return;
    setGuardando(true);
    setError("");
    try {
      const payload = {
        ...form,
        personalidad: form.personalidad
          ? form.personalidad.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
          : [],
        edad: form.edad?.trim() || null,
      };
      const actualizado = await actualizarMascotaAdmin(mascotaId, payload);
      setDetalle(actualizado);
      setEditando(false);
      onActualizado?.(actualizado);
      notificar?.("Mascota actualizada correctamente.");
    } catch (e) {
      setError(e?.message || "No se pudo actualizar la mascota");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    try {
      // Soft delete: desactiva la mascota (activo=False) conservando el historial.
      await eliminarMascota(mascotaId);
      notificar?.("Mascota eliminada correctamente.");
      onActualizado?.();
      onClose();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar la mascota");
      setConfirmEliminar(false);
    }
  };

  const imagenes = Array.isArray(detalle?.imagenes) ? detalle.imagenes : [];
  const imagenesUrl = imagenes.map((i) => i.url).filter(Boolean);

  const InfoItem = ({ etiqueta, valor }) => (
    <div className="flex items-start gap-2 py-1">
      <span className="mt-1.5 text-gray-300 dark:text-dark-border flex-shrink-0">
        <PawPrint size={12} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{etiqueta}</p>
        <p className="text-sm text-gray-800 dark:text-dark-text break-words">{valor || "—"}</p>
      </div>
    </div>
  );

  const Seccion = ({ titulo, icono: Icono, children }) => (
    <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
          <Icono size={15} />
        </span>
        <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text">{titulo}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">{children}</div>
    </div>
  );

  const BadgeCaracteristica = ({ activo, etiqueta }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
        activo
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
          : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-dark-bg dark:text-dark-text-secondary dark:border-dark-border"
      }`}
    >
      {activo ? <CheckCircle2 size={13} /> : <X size={13} />}
      {etiqueta}
    </span>
  );

  const Campo = ({ label, children, className = "" }) => (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">{label}</label>
      {children}
    </div>
  );

  const Select = ({ value, onChange, opciones, placeholder = "Seleccionar..." }) => (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={guardando} className={inputCls}>
      <option value="">{placeholder}</option>
      {opciones.map((o) => (
        <option key={o.codigo} value={o.codigo}>{o.nombre}</option>
      ))}
    </select>
  );

  const Toggle = ({ activo, onChange, etiqueta }) => (
    <button
      type="button"
      onClick={() => onChange(!activo)}
      disabled={guardando}
      className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${
        activo
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
          : "border-gray-200 bg-gray-50/50 text-gray-500 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-secondary"
      }`}
    >
      <span className={`w-4 h-4 rounded-md flex items-center justify-center text-white flex-shrink-0 ${activo ? "bg-emerald-500" : "bg-gray-200 dark:bg-dark-border"}`}>
        {activo && <CheckCircle2 size={13} />}
      </span>
      {etiqueta}
    </button>
  );

  return (
    <AdminModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop oscuro + desenfoque */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-modal-overlay" />

        {/* Panel del modal (capa superior) */}
        <div
          className="relative w-full max-w-4xl max-h-full flex flex-col bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border animate-modal-content overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-dark-border flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center flex-shrink-0">
                <PawPrint size={20} className="text-rose-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text truncate">
                  {detalle?.nombre || "Detalle de mascota"}
                </h2>
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary">Mascota #{detalle?.id ?? mascotaId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors flex-shrink-0"
              title="Cerrar"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Cuerpo con scroll interno */}
          <div className="overflow-y-auto flex-1 scrollbar-hide">
            {cargando ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <Loader2 size={30} className="text-rose-400 animate-spin" />
                <p className="text-gray-400 text-sm">Cargando información de la mascota...</p>
              </div>
            ) : error && !detalle ? (
              <div className="p-10 text-center">
                <AlertTriangle size={30} className="text-rose-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-5 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 dark:text-dark-text-secondary text-sm font-semibold hover:bg-gray-50 dark:hover:bg-dark-border transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : detalle && !editando ? (
              /* ========== MODO VER ========== */
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 p-5 sm:p-6">
                {/* Imágenes */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-bg flex items-center justify-center border border-gray-100 dark:border-dark-border">
                    {imagenesUrl.length > 0 ? (
                      <img src={imagenesUrl[imgActiva]} alt={detalle.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-dark-border">
                        <ImageOff size={40} />
                        <span className="text-xs">Sin imágenes</span>
                      </div>
                    )}
                  </div>
                  {imagenesUrl.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {imagenesUrl.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setImgActiva(i)}
                          className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${
                            i === imgActiva ? "border-rose-500" : "border-transparent hover:border-rose-300"
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <BadgeCaracteristica activo={detalle.vacunado} etiqueta="Vacunado" />
                    <BadgeCaracteristica activo={detalle.esterilizado} etiqueta="Esterilizado" />
                    <BadgeCaracteristica activo={detalle.desparasitado} etiqueta="Desparasitado" />
                  </div>
                </div>

                {/* Datos */}
                <div className="lg:col-span-3 space-y-4">
                  <Seccion titulo="Información general" icono={PawPrint}>
                    <InfoItem etiqueta="Nombre" valor={detalle.nombre} />
                    <InfoItem etiqueta="Especie" valor={detalle.tipo} />
                    <InfoItem etiqueta="Raza" valor={detalle.raza} />
                    <InfoItem etiqueta="Edad" valor={detalle.edad} />
                    <InfoItem etiqueta="Género" valor={detalle.genero} />
                    <InfoItem etiqueta="Tamaño" valor={detalle.tamano} />
                    <InfoItem etiqueta="Peso" valor={detalle.peso} />
                    <InfoItem etiqueta="Color" valor={detalle.color} />
                  </Seccion>

                  <Seccion titulo="Estado y refugio" icono={Building2}>
                    <InfoItem etiqueta="Estado" valor={detalle.estado} />
                    <InfoItem etiqueta="Refugio" valor={detalle.refugio_nombre} />
                    <InfoItem etiqueta="Fecha de ingreso" valor={formatFecha(detalle.fecha_ingreso)} />
                    <InfoItem etiqueta="Registrado" valor={formatFecha(detalle.creado_en)} />
                  </Seccion>

                  {detalle.descripcion && (
                    <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
                          <Heart size={15} />
                        </span>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text">Descripción</h3>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-dark-text leading-relaxed whitespace-pre-wrap">{detalle.descripcion}</p>
                    </div>
                  )}

                  {Array.isArray(detalle.personalidad) && detalle.personalidad.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-text-secondary mb-2">Personalidad</p>
                      <div className="flex flex-wrap gap-2">
                        {detalle.personalidad.map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-xs font-medium">
                            <Heart size={11} /> {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {detalle.salud && (
                    <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                          <Activity size={15} />
                        </span>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text">Salud</h3>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-dark-text leading-relaxed whitespace-pre-wrap">{detalle.salud}</p>
                    </div>
                  )}

                  {detalle.requisitos && (
                    <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck size={15} />
                        </span>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text">Requisitos de adopción</h3>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-dark-text leading-relaxed whitespace-pre-wrap">{detalle.requisitos}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : detalle ? (
              /* ========== MODO EDITAR ========== */
              <form
                onSubmit={(e) => { e.preventDefault(); guardar(); }}
                className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
                noValidate
              >
                <Campo label="Nombre *">
                  <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required disabled={guardando} className={inputCls} placeholder="Nombre de la mascota" />
                </Campo>
                <Campo label="Especie *">
                  <Select value={form.tipo} onChange={(v) => set("tipo", v)} opciones={catalogos.tipos} placeholder="Seleccionar especie..." />
                </Campo>
                <Campo label="Raza">
                  <input value={form.raza} onChange={(e) => set("raza", e.target.value)} disabled={guardando} className={inputCls} placeholder="Ej: Labrador" />
                </Campo>
                <Campo label="Edad">
                  <input value={form.edad} onChange={(e) => set("edad", e.target.value)} disabled={guardando} className={inputCls} placeholder="Ej: 2 años" />
                </Campo>
                <Campo label="Género">
                  <Select value={form.genero} onChange={(v) => set("genero", v)} opciones={catalogos.generos} placeholder="Seleccionar género..." />
                </Campo>
                <Campo label="Tamaño">
                  <Select value={form.tamano} onChange={(v) => set("tamano", v)} opciones={catalogos.tamanos} placeholder="Seleccionar tamaño..." />
                </Campo>
                <Campo label="Peso">
                  <input value={form.peso} onChange={(e) => set("peso", e.target.value)} disabled={guardando} className={inputCls} placeholder="Ej: 12 kg" />
                </Campo>
                <Campo label="Color">
                  <input value={form.color} onChange={(e) => set("color", e.target.value)} disabled={guardando} className={inputCls} placeholder="Ej: Marrón" />
                </Campo>
                <Campo label="Estado *">
                  <Select value={form.estado} onChange={(v) => set("estado", v)} opciones={catalogos.estados} placeholder="Seleccionar estado..." />
                </Campo>
                <Campo label="Personalidad (separar con comas)">
                  <textarea value={form.personalidad} onChange={(e) => set("personalidad", e.target.value)} rows={2} disabled={guardando} className={`${inputCls} resize-none`} placeholder="Ej: Juguetón, Cariñoso, Activo" />
                </Campo>
                <Campo label="Descripción" className="sm:col-span-2">
                  <textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={3} disabled={guardando} className={`${inputCls} resize-none`} placeholder="Descripción de la mascota" />
                </Campo>
                <Campo label="Salud">
                  <textarea value={form.salud} onChange={(e) => set("salud", e.target.value)} rows={3} disabled={guardando} className={`${inputCls} resize-none`} placeholder="Estado de salud, vacunas, cuidados..." />
                </Campo>
                <Campo label="Requisitos de adopción">
                  <textarea value={form.requisitos} onChange={(e) => set("requisitos", e.target.value)} rows={3} disabled={guardando} className={`${inputCls} resize-none`} placeholder="Requisitos para adoptar" />
                </Campo>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Toggle activo={form.vacunado} onChange={(v) => set("vacunado", v)} etiqueta="Vacunado" />
                  <Toggle activo={form.esterilizado} onChange={(v) => set("esterilizado", v)} etiqueta="Esterilizado" />
                  <Toggle activo={form.desparasitado} onChange={(v) => set("desparasitado", v)} etiqueta="Desparasitado" />
                </div>
              </form>
            ) : null}
          </div>

          {/* Footer / acciones */}
          {detalle && (
            <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-bg/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="min-w-0">
                {error && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> {error}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {!editando ? (
                  <>
                    <button
                      type="button"
                      onClick={iniciarEdicion}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-200 bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 font-semibold text-xs hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    >
                      <Edit3 size={14} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmEliminar(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 bg-white dark:bg-dark-card text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary font-semibold text-xs hover:bg-gray-50 dark:hover:bg-dark-border transition-colors"
                    >
                      <X size={14} /> Cerrar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setEditando(false); setError(""); }}
                      disabled={guardando}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary font-semibold text-xs hover:bg-gray-50 dark:hover:bg-dark-border transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={guardar}
                      disabled={guardando}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold text-xs hover:from-rose-600 hover:to-amber-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {guardando ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={14} /> Guardar cambios
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirmación de eliminación (soft delete) */}
        <ConfirmModal
          isOpen={confirmEliminar}
          onClose={() => setConfirmEliminar(false)}
          onConfirm={confirmarEliminar}
          titulo="Eliminar mascota"
          descripcion={`¿Eliminar a "${detalle?.nombre || ""}"? La mascota se desactiva mediante soft delete y su registro se conserva en la base de datos.`}
          variant="danger"
          confirmText="Eliminar"
          icon={Trash2}
        />
      </div>
    </AdminModalPortal>
  );
}
