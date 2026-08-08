import { useState, useEffect } from "react";
import {
  Store, MapPin, Phone, Mail, Globe, Clock, Star,
  Edit3, Save, MessageSquare, ShoppingCart, Package, Loader2, CheckCircle2, AlertCircle, Upload, ShieldCheck,
} from "lucide-react";
import { estadisticasTienda, cambiarLogoTienda, eliminarLogoTienda } from "../../api/tienda";
import { useStore } from "../../context/StoreContext";
import ImageUploadModal from "../../components/ImageUploadModal";
import FieldError from "../../components/FieldError";
import {
  validarNombre, validarEmail, validarTelefono, normalizarEmail, limpiarEspacios, claseInput,
} from "../../utils/validaciones";

const CAMPOS = [
  { field: "direccion", label: "Dirección", icon: MapPin },
  { field: "ciudad", label: "Ciudad", icon: MapPin },
  { field: "telefono", label: "Teléfono", icon: Phone },
  { field: "email", label: "Correo electrónico", icon: Mail },
  { field: "website", label: "Sitio web", icon: Globe },
];

const REDES = [
  { key: "facebook", label: "Facebook", icon: Globe, color: "text-blue-600" },
  { key: "instagram", label: "Instagram", icon: Globe, color: "text-pink-600" },
];

export default function StoreProfile() {
  const { store, loading, actualizarStore, tienePermiso, refresh } = useStore();
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});
  const [logoModalOpen, setLogoModalOpen] = useState(false);

  const puedeEditar = tienePermiso("tienda.editar_informacion");
  const puedeCambiarLogo = tienePermiso("tienda.cambiar_logo");
  const puedeHorarios = tienePermiso("tienda.actualizar_horarios");

  // Carga las estadísticas de la tienda (independiente del perfil).
  useEffect(() => {
    let activo = true;
    (async () => {
      const est = await estadisticasTienda().catch(() => null);
      if (activo) setStats(est);
    })();
    return () => { activo = false; };
  }, []);

  // El formulario refleja el perfil del contexto (que ya viene de la BD).
  useEffect(() => {
    if (store && !editing) setForm(store);
  }, [store, editing]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setFeedback(null);
    const nuevosErrores = {
      nombre: validarNombre(form.nombre, { campo: "nombre", obligatorio: false }),
      email: validarEmail(form.email, { obligatorio: false }),
      telefono: validarTelefono(form.telefono, { obligatorio: false }),
    };
    setErrors(nuevosErrores);
    if (Object.values(nuevosErrores).some((m) => m)) return;
    setSaving(true);
    try {
      const payload = {
        nombre: limpiarEspacios(form.nombre), descripcion: form.descripcion,
        email: normalizarEmail(form.email), telefono: form.telefono?.trim() || null,
        ciudad: form.ciudad, direccion: form.direccion,
        website: form.website, facebook: form.facebook, instagram: form.instagram,
      };
      if (puedeHorarios) {
        payload.horario_semana = form.horario_semana;
        payload.horario_fin_semana = form.horario_fin_semana;
      }
      // actualizarStore guarda en la BD y sincroniza el contexto: el sidebar y
      // el menú desplegable se actualizan de inmediato sin recargar la página.
      const actualizado = await actualizarStore(payload);
      setForm(actualizado);
      setEditing(false);
      setFeedback({ tipo: "success", texto: "Perfil actualizado correctamente" });
    } catch (e) {
      setFeedback({ tipo: "error", texto: e?.message || "No se pudo actualizar el perfil" });
    } finally {
      setSaving(false);
    }
  };

  // Guarda el logo editado (base64) desde el modal de subida.
  const handleGuardarLogo = async (base64) => {
    setFeedback(null);
    try {
      await cambiarLogoTienda(base64, "logo");
      await refresh();
      setFeedback({ tipo: "success", texto: "Logo actualizado correctamente" });
    } catch (err) {
      setFeedback({ tipo: "error", texto: err?.message || "No se pudo cambiar el logo" });
      throw err;
    }
  };

  // Elimina el logo de Cloudinary y de la base de datos.
  const handleEliminarLogo = async () => {
    setFeedback(null);
    try {
      await eliminarLogoTienda();
      await refresh();
      setFeedback({ tipo: "success", texto: "Logo eliminado correctamente" });
    } catch (err) {
      setFeedback({ tipo: "error", texto: err?.message || "No se pudo eliminar el logo" });
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-24 text-gray-500 dark:text-dark-text-secondary">
        No se pudo cargar el perfil de la tienda.
      </div>
    );
  }

  const statsCards = [
    { icon: Star, label: "Calificación", value: store.rating ?? 0, color: "text-amber-500", bg: "bg-amber-50" },
    { icon: ShoppingCart, label: "Ventas totales", value: stats?.total_ventas ?? 0, color: "text-blue-500", bg: "bg-blue-50" },
    { icon: Package, label: "Productos", value: stats?.total_productos ?? 0, color: "text-rose-500", bg: "bg-rose-50" },
    { icon: MessageSquare, label: "Opiniones", value: 0, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Perfil de la Tienda</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            Administra la información pública de tu tienda. Los cambios se reflejan de inmediato en todo el panel.
          </p>
        </div>
        {puedeEditar && (
          <button
            onClick={editing ? handleSave : () => setEditing(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : editing ? <Save size={16} /> : <Edit3 size={16} />}
            {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Editar Perfil"}
          </button>
        )}
      </div>

      {/* Feedback de guardado */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
          feedback.tipo === "error"
            ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
            : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
        }`}>
          {feedback.tipo === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {feedback.texto}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} dark:opacity-80 flex items-center justify-center mb-3`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Store Info Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información básica */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Información de la Tienda</h3>

            {/* Logo */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.nombre} className="w-full h-full object-cover" />
                ) : (
                  <Store size={36} className="text-rose-500" />
                )}
              </div>
              {puedeCambiarLogo && (
                <button
                  type="button"
                  onClick={() => setLogoModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl hover:shadow-md transition-all"
                >
                  <Upload size={14} /> Cambiar logo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Nombre comercial</label>
                {editing ? (
                  <>
                    <input type="text" value={form.nombre || ""} onChange={(e) => handleChange("nombre", e.target.value)}
                      className={claseInput("w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all", !!errors.nombre)} />
                    <FieldError mensaje={errors.nombre} />
                  </>
                ) : (
                  <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">{store.nombre}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Descripción</label>
                {editing ? (
                  <textarea value={form.descripcion || ""} onChange={(e) => handleChange("descripcion", e.target.value)} rows={3}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none" />
                ) : (
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{store.descripcion || "Sin descripción"}</p>
                )}
              </div>

              {CAMPOS.map((item) => (
                <div key={item.field}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">{item.label}</label>
                  {editing ? (
                    <>
                      <input type="text" value={form[item.field] || ""} onChange={(e) => handleChange(item.field, e.target.value)}
                        className={claseInput("w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all", !!errors[item.field])} />
                      <FieldError mensaje={errors[item.field]} />
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text flex items-center gap-2">
                      <item.icon size={14} className="text-gray-400" />
                      {store[item.field] || "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Redes Sociales */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Redes Sociales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {REDES.map((social) => (
                <div key={social.key}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">{social.label}</label>
                  {editing ? (
                    <input type="text" value={form[social.key] || ""} onChange={(e) => handleChange(social.key, e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text flex items-center gap-2">
                      <social.icon size={14} className={social.color} />
                      {store[social.key] || "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Horarios de atención */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
              <Clock size={16} className="text-rose-500" />
              Horarios de Atención
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Lunes a viernes</label>
                {editing && puedeHorarios ? (
                  <input type="text" value={form.horario_semana || ""} onChange={(e) => handleChange("horario_semana", e.target.value)} placeholder="Ej: 8:00 - 18:00"
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{store.horario_semana || "—"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Fines de semana</label>
                {editing && puedeHorarios ? (
                  <input type="text" value={form.horario_fin_semana || ""} onChange={(e) => handleChange("horario_fin_semana", e.target.value)} placeholder="Ej: 9:00 - 14:00"
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{store.horario_fin_semana || "—"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right - Responsable + Opiniones */}
        <div className="space-y-6">
          {/* Responsable */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-3">Responsable</h3>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-gray-900 dark:text-dark-text flex items-center gap-2">
                {store.responsable_nombre || "—"}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-semibold whitespace-nowrap">
                  <ShieldCheck size={11} /> Representante
                </span>
              </p>
              <p className="text-gray-500 dark:text-dark-text-secondary flex items-center gap-2">
                <Mail size={14} className="text-gray-400" /> {store.responsable_email || "—"}
              </p>
              <p className="text-gray-500 dark:text-dark-text-secondary flex items-center gap-2">
                <Phone size={14} className="text-gray-400" /> {store.responsable_telefono || "—"}
              </p>
            </div>
          </div>

          {/* Calificación */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-3">Calificación Promedio</h3>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-gray-900 dark:text-dark-text">{store.rating ?? 0}</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} className={s <= Math.round(store.rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-300"} />
                ))}
              </div>
            </div>
          </div>

          {/* Opiniones (aún no disponibles) */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Opiniones de Usuarios</h3>
            <div className="text-center py-6">
              <MessageSquare size={28} className="mx-auto text-gray-300 dark:text-dark-border mb-2" />
              <p className="text-sm text-gray-400 dark:text-dark-text-secondary">Aún no hay opiniones</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de subida y edición del logo */}
      <ImageUploadModal
        open={logoModalOpen}
        onClose={() => setLogoModalOpen(false)}
        title="Editar logo de la tienda"
        aspect={1}
        shape="square"
        canDelete={!!store.logo_url}
        onSave={handleGuardarLogo}
        onDelete={handleEliminarLogo}
      />
    </div>
  );
}
