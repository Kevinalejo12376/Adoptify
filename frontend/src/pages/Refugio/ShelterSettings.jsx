import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Settings, Store, Bell, Shield, Globe, Save, ToggleLeft, ToggleRight, Building2, MapPin, Phone, Mail, Globe2, Camera, ChevronRight, ExternalLink } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ShelterSettings() {
  const { user, login } = useAuth();

  const [shelterInfo, setShelterInfo] = useState({
    name: user?.name || "Refugio Patitas Felices",
    email: user?.email || "",
    phone: user?.phone || "+57 301 987 6543",
    location: user?.location || "Bogotá, Colombia",
    address: user?.address || "Cra 45 # 67-89, Bogotá",
    description: user?.description || "Somos un refugio dedicado a rescatar y encontrar hogares amorosos para perros y gatos en situación de calle.",
    facebook: user?.socialMedia?.facebook || "",
    instagram: user?.socialMedia?.instagram || "",
  });

  const [settings, setSettings] = useState({
    storeEnabled: user?.settings?.storeEnabled || false,
    notifications: {
      newRequests: true,
      statusChanges: true,
      forumMessages: true,
      emailUpdates: false,
    },
    privacy: {
      showPhone: true,
      showEmail: true,
      showAddress: false,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("informacion");

  const handleStoreToggle = () => {
    const newStoreEnabled = !settings.storeEnabled;
    setSettings(prev => ({ ...prev, storeEnabled: newStoreEnabled }));
    const updatedUser = { ...user, settings: { ...user?.settings, storeEnabled: newStoreEnabled } };
    login(updatedUser);
  };

  const handleNotificationToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] }
    }));
  };

  const handlePrivacyToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: !prev.privacy[key] }
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      const updatedUser = { ...user, ...shelterInfo, settings };
      login(updatedUser);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1000);
  };

  const Toggle = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gray-200 dark:bg-dark-border'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  const tabs = [
    { id: "informacion", label: "Información", icon: Building2 },
    { id: "tienda", label: "Tienda", icon: Store },
    { id: "notificaciones", label: "Notificaciones", icon: Bell },
    { id: "privacidad", label: "Privacidad", icon: Shield },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-500/15 text-gray-700 dark:text-gray-400 rounded-full text-sm font-medium mb-3">
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Configuración del Refugio</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Administra la información y preferencias de tu refugio</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-200 dark:shadow-rose-500/20 hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-75"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
        {saveSuccess && (
          <div className="mt-4 px-4 py-3 bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-medium animate-fade-in-down">
            ✓ Cambios guardados exitosamente
          </div>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:w-64 shrink-0">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-2 sticky top-24">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/15 dark:to-amber-500/15 text-rose-700 dark:text-rose-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                    <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${activeTab === tab.id ? 'rotate-90' : ''}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-dark-card rounded-3xl shadow-sm border border-gray-100 dark:border-dark-border p-6">
              {/* Información del Refugio */}
              {activeTab === "informacion" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-rose-500" />
                    Información del Refugio
                  </h2>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-dark-bg/50">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-10 h-10 text-rose-400/60 dark:text-rose-400/40" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Logo del refugio</p>
                      <button className="mt-1 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all">
                        <Camera className="w-4 h-4" />
                        Cambiar imagen
                      </button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Refugio</label>
                      <input type="text" value={shelterInfo.name} onChange={(e) => setShelterInfo({...shelterInfo, name: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input type="email" value={shelterInfo.email} onChange={(e) => setShelterInfo({...shelterInfo, email: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                      <input type="text" value={shelterInfo.phone} onChange={(e) => setShelterInfo({...shelterInfo, phone: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                      <input type="text" value={shelterInfo.location} onChange={(e) => setShelterInfo({...shelterInfo, location: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                      <input type="text" value={shelterInfo.address} onChange={(e) => setShelterInfo({...shelterInfo, address: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                      <textarea rows={4} value={shelterInfo.description} onChange={(e) => setShelterInfo({...shelterInfo, description: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facebook</label>
                      <input type="text" value={shelterInfo.facebook} onChange={(e) => setShelterInfo({...shelterInfo, facebook: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" placeholder="usuario de Facebook" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram</label>
                      <input type="text" value={shelterInfo.instagram} onChange={(e) => setShelterInfo({...shelterInfo, instagram: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" placeholder="@usuario" />
                    </div>
                  </div>
                </div>
              )}

              {/* Configuración de Tienda */}
              {activeTab === "tienda" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                    <Store className="w-5 h-5 text-rose-500" />
                    Tienda del Refugio
                  </h2>

                  <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 border border-rose-100 dark:border-rose-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl ${settings.storeEnabled ? 'bg-gradient-to-br from-rose-500 to-amber-500' : 'bg-gray-200 dark:bg-dark-border'} flex items-center justify-center transition-all`}>
                          <Store className={`w-7 h-7 ${settings.storeEnabled ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">Activar Tienda</h3>
                          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                            {settings.storeEnabled
                              ? "Tu tienda está visible para los usuarios. Puedes desactivarla en cualquier momento."
                              : "Activa la tienda para que los usuarios puedan ver y comprar productos de tu refugio."}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleStoreToggle}
                        className={`relative w-16 h-8 rounded-full transition-all duration-300 ${settings.storeEnabled ? 'bg-gradient-to-r from-rose-500 to-amber-500 shadow-lg shadow-rose-200 dark:shadow-rose-500/20' : 'bg-gray-200 dark:bg-dark-border'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${settings.storeEnabled ? 'translate-x-9' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {settings.storeEnabled && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                        <div className="flex items-center gap-3">
                          <Globe2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                          <div>
                            <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Tienda activa</p>
                            <p className="text-xs text-rose-600/70 dark:text-rose-400/70">Los usuarios pueden ver y comprar tus productos</p>
                          </div>
                        </div>
                      </div>
                      <Link
                        to="/refugio/tienda"
                        className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-100 dark:border-blue-500/20 hover:shadow-md transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                            <Store className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Gestionar Tienda</p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Agrega, edita y administra tus productos</p>
                          </div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-dark-border pt-6">
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                      La tienda del refugio estará visible en el navbar solo cuando esté activada.
                      Esto permite que cada refugio decida si quiere ofrecer productos a la venta.
                    </p>
                  </div>
                </div>
              )}

              {/* Notificaciones */}
              {activeTab === "notificaciones" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                    <Bell className="w-5 h-5 text-rose-500" />
                    Notificaciones
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Configura qué notificaciones deseas recibir</p>
                  <div className="divide-y divide-gray-100 dark:divide-dark-border">
                    <Toggle enabled={settings.notifications.newRequests} onChange={() => handleNotificationToggle('newRequests')}
                      label="Nuevas solicitudes" description="Notificar cuando llegue una nueva solicitud de adopción" />
                    <Toggle enabled={settings.notifications.statusChanges} onChange={() => handleNotificationToggle('statusChanges')}
                      label="Cambios de estado" description="Notificar cuando una solicitud cambie de estado" />
                    <Toggle enabled={settings.notifications.forumMessages} onChange={() => handleNotificationToggle('forumMessages')}
                      label="Mensajes del foro" description="Notificar cuando alguien comente en tus publicaciones" />
                    <Toggle enabled={settings.notifications.emailUpdates} onChange={() => handleNotificationToggle('emailUpdates')}
                      label="Actualizaciones por email" description="Recibir resumen semanal por correo electrónico" />
                  </div>
                </div>
              )}

              {/* Privacidad */}
              {activeTab === "privacidad" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                    <Shield className="w-5 h-5 text-rose-500" />
                    Privacidad
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Controla qué información se muestra públicamente</p>
                  <div className="divide-y divide-gray-100 dark:divide-dark-border">
                    <Toggle enabled={settings.privacy.showPhone} onChange={() => handlePrivacyToggle('showPhone')}
                      label="Mostrar teléfono" description="Mostrar número de contacto en el perfil público" />
                    <Toggle enabled={settings.privacy.showEmail} onChange={() => handlePrivacyToggle('showEmail')}
                      label="Mostrar email" description="Mostrar correo electrónico en el perfil público" />
                    <Toggle enabled={settings.privacy.showAddress} onChange={() => handlePrivacyToggle('showAddress')}
                      label="Mostrar dirección" description="Mostrar dirección del refugio en el perfil público" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
