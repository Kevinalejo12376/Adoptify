import React, { useState, useEffect } from "react";
import {
  Store, MapPin, Phone, Mail, Globe, Clock, Star,
  Edit3, Save, MessageSquare, ShoppingCart, Package, Loader2,
} from "lucide-react";
import { miPerfilTienda, actualizarMiPerfilTienda, estadisticasTienda } from "../../api/tienda";

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
  const [store, setStore] = useState(null);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    try {
      const [perfil, est] = await Promise.all([
        miPerfilTienda(),
        estadisticasTienda().catch(() => null),
      ]);
      setStore(perfil);
      setForm(perfil);
      setStats(est);
    } catch (e) {
      // sin datos
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre, descripcion: form.descripcion, email: form.email,
        telefono: form.telefono, ciudad: form.ciudad, direccion: form.direccion,
        website: form.website, facebook: form.facebook, instagram: form.instagram,
        horario_semana: form.horario_semana, horario_fin_semana: form.horario_fin_semana,
      };
      const actualizado = await actualizarMiPerfilTienda(payload);
      setStore(actualizado);
      setForm(actualizado);
      setEditing(false);
    } catch (e) {
      // se mantiene el modo edicion
    } finally {
      setSaving(false);
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
            Administra la información pública de tu tienda.
          </p>
        </div>
        <button
          onClick={editing ? handleSave : () => setEditing(true)}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : editing ? <Save size={16} /> : <Edit3 size={16} />}
          {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Editar Perfil"}
        </button>
      </div>

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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Nombre comercial</label>
                {editing ? (
                  <input type="text" value={form.nombre || ""} onChange={(e) => handleChange("nombre", e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
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
                    <input type="text" value={form[item.field] || ""} onChange={(e) => handleChange(item.field, e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
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
                {editing ? (
                  <input type="text" value={form.horario_semana || ""} onChange={(e) => handleChange("horario_semana", e.target.value)} placeholder="Ej: 8:00 - 18:00"
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{store.horario_semana || "—"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Fines de semana</label>
                {editing ? (
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
              <p className="font-semibold text-gray-900 dark:text-dark-text">{store.responsable_nombre || "—"}</p>
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
    </div>
  );
}
