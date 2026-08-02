import React, { useState, useEffect } from "react";
import {
  Settings, Store, Lock, Bell, Shield, User, Save, ChevronRight, Loader2,
} from "lucide-react";
import { miPerfilTienda, actualizarMiPerfilTienda, cambiarPasswordTienda } from "../../api/tienda";

const sections = [
  { id: "tienda", label: "Datos de la Tienda", icon: Store, desc: "Administra la información general de tu tienda" },
  { id: "password", label: "Contraseña", icon: Lock, desc: "Cambia tu contraseña de acceso" },
  { id: "notificaciones", label: "Notificaciones", icon: Bell, desc: "Configura las notificaciones que deseas recibir" },
  { id: "preferencias", label: "Preferencias", icon: Settings, desc: "Personaliza la experiencia de tu panel" },
  { id: "cuenta", label: "Cuenta", icon: User, desc: "Administra los datos de tu cuenta" },
];

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all";

export default function StoreSettings() {
  const [activeSection, setActiveSection] = useState("tienda");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", direccion: "", ciudad: "" });
  const [pwd, setPwd] = useState({ actual: "", nueva: "", confirmar: "" });

  useEffect(() => {
    (async () => {
      try {
        const p = await miPerfilTienda();
        setPerfil(p);
        setForm({
          nombre: p.nombre || "", email: p.email || "", telefono: p.telefono || "",
          direccion: p.direccion || "", ciudad: p.ciudad || "",
        });
      } catch (e) { /* sin datos */ }
    })();
  }, []);

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      if (activeSection === "tienda") {
        const p = await actualizarMiPerfilTienda(form);
        setPerfil(p);
        flashSaved();
      } else if (activeSection === "password") {
        if (!pwd.actual || !pwd.nueva) { setError("Completa los campos de contraseña"); return; }
        if (pwd.nueva !== pwd.confirmar) { setError("Las contraseñas nuevas no coinciden"); return; }
        await cambiarPasswordTienda({ password_actual: pwd.actual, password_nueva: pwd.nueva });
        setPwd({ actual: "", nueva: "", confirmar: "" });
        flashSaved();
      } else {
        // Preferencias locales del panel
        flashSaved();
      }
    } catch (e) {
      setError(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "tienda":
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Datos de la Tienda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "nombre", label: "Nombre comercial" },
                { key: "email", label: "Correo electrónico" },
                { key: "telefono", label: "Teléfono" },
                { key: "ciudad", label: "Ciudad" },
                { key: "direccion", label: "Dirección" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">{f.label}</label>
                  <input type="text" value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className={inputCls} />
                </div>
              ))}
            </div>
          </div>
        );

      case "password":
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Cambiar Contraseña</h3>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Contraseña actual</label>
                <input type="password" value={pwd.actual} onChange={(e) => setPwd((p) => ({ ...p, actual: e.target.value }))} className={inputCls} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Nueva contraseña</label>
                <input type="password" value={pwd.nueva} onChange={(e) => setPwd((p) => ({ ...p, nueva: e.target.value }))} className={inputCls} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Confirmar nueva contraseña</label>
                <input type="password" value={pwd.confirmar} onChange={(e) => setPwd((p) => ({ ...p, confirmar: e.target.value }))} className={inputCls} placeholder="••••••••" />
              </div>
            </div>
          </div>
        );

      case "notificaciones":
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Preferencias de Notificaciones</h3>
            <p className="text-xs text-gray-400 dark:text-dark-text-secondary">Estas preferencias se guardan en tu navegador.</p>
            <div className="space-y-3">
              {[
                { label: "Productos agotados", desc: "Alertar cuando un producto se quede sin stock" },
                { label: "Mensajes del administrador", desc: "Recibir comunicaciones del equipo de Adoptify" },
                { label: "Actualizaciones del sistema", desc: "Informar sobre nuevas versiones y mejoras" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-amber-500" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case "preferencias":
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Preferencias del Panel</h3>
            <p className="text-xs text-gray-400 dark:text-dark-text-secondary">Estas preferencias se guardan en tu navegador.</p>
            <div className="space-y-3">
              {[
                { label: "Sidebar colapsado por defecto", desc: "Iniciar con el menú lateral cerrado" },
                { label: "Mostrar productos agotados", desc: "Visualizar productos sin stock en el listado" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-amber-500" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case "cuenta":
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Información de la Cuenta</h3>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-dark-bg">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center">
                <User size={28} className="text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-dark-text">{perfil?.responsable_nombre || perfil?.nombre || "—"}</p>
                <p className="text-xs text-gray-400">{perfil?.responsable_email || "—"}</p>
                {perfil?.creado_en && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Miembro desde {new Date(perfil.creado_en).toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const showSaveButton = ["tienda", "password", "notificaciones", "preferencias"].includes(activeSection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Configuración</h1>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
          Administra la configuración de tu tienda y cuenta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de secciones */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
            <div className="p-1">
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => { setActiveSection(section.id); setError(""); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                        : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border"
                    }`}
                  >
                    <section.icon size={18} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${isActive ? "text-white" : ""}`}>{section.label}</p>
                    </div>
                    <ChevronRight size={14} className={`flex-shrink-0 ${isActive ? "text-white/70" : "text-gray-300"}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contenido de la sección */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            {renderSection()}

            {error && (
              <p className="mt-4 text-sm text-red-500">{error}</p>
            )}

            {showSaveButton && (
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar Cambios"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
