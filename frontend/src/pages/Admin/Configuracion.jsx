import React, { useState } from "react";
import {
  Save, Globe, Mail, Shield, FileText, Bot,
  Palette, Bell, Lock, Smartphone, ChevronRight,
  Check, X, Moon, Sun, Eye, EyeOff,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// Configuración de categorías
const CATEGORIAS = [
  {
    id: "general",
    titulo: "Información General",
    descripcion: "Datos básicos de la plataforma",
    icono: Globe,
    color: "from-blue-400 to-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
    campos: [
      { key: "nombre", label: "Nombre de la plataforma", type: "text", placeholder: "Adoptify" },
      { key: "descripcion", label: "Descripción", type: "textarea", placeholder: "Breve descripción de la plataforma" },
      { key: "email", label: "Correo de contacto", type: "email", placeholder: "contacto@adoptify.com" },
      { key: "telefono", label: "Teléfono", type: "text", placeholder: "+57 300 000 0000" },
      { key: "direccion", label: "Dirección", type: "text", placeholder: "Bogotá, Colombia" },
    ],
  },
  {
    id: "redes",
    titulo: "Redes Sociales",
    descripcion: "Enlaces a las redes sociales oficiales",
    icono: Globe,
    color: "from-rose-400 to-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-500/10",
    textColor: "text-rose-600 dark:text-rose-400",
    campos: [
      { key: "facebook", label: "Facebook", type: "url", placeholder: "https://facebook.com/adoptify", icono: "facebook" },
      { key: "instagram", label: "Instagram", type: "url", placeholder: "https://instagram.com/adoptify", icono: "instagram" },
      { key: "twitter", label: "Twitter / X", type: "url", placeholder: "https://twitter.com/adoptify", icono: "twitter" },
    ],
  },
  {
    id: "apariencia",
    titulo: "Apariencia",
    descripcion: "Configuración visual de la plataforma",
    icono: Palette,
    color: "from-purple-400 to-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
    textColor: "text-purple-600 dark:text-purple-400",
    campos: [],
  },
  {
    id: "notificaciones",
    titulo: "Notificaciones",
    descripcion: "Configuración del sistema de notificaciones",
    icono: Bell,
    color: "from-amber-400 to-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    textColor: "text-amber-600 dark:text-amber-400",
    campos: [],
  },
  {
    id: "seguridad",
    titulo: "Seguridad",
    descripcion: "Políticas de seguridad y privacidad",
    icono: Lock,
    color: "from-emerald-400 to-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
    campos: [],
  },
  {
    id: "ia",
    titulo: "Inteligencia Artificial",
    descripcion: "Configuración de asistentes y moderación IA",
    icono: Bot,
    color: "from-violet-400 to-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
    textColor: "text-violet-600 dark:text-violet-400",
    campos: [],
  },
  {
    id: "documentos",
    titulo: "Documentos Legales",
    descripcion: "Términos, condiciones y políticas de privacidad",
    icono: FileText,
    color: "from-slate-400 to-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-500/10",
    textColor: "text-slate-600 dark:text-slate-400",
    campos: [],
  },
];

// Componente Toggle
function ToggleSwitch({ enabled, onChange, label, descripcion }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-dark-bg/50 rounded-xl border border-gray-100 dark:border-dark-border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">{label}</p>
        {descripcion && (
          <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">{descripcion}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ml-3 ${
          enabled
            ? "bg-gradient-to-r from-rose-500 to-amber-500 shadow-sm shadow-rose-500/20"
            : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
            enabled ? "translate-x-5" : ""
          }`}
        >
          {enabled ? (
            <Check size={10} className="text-rose-500" />
          ) : (
            <X size={10} className="text-gray-400" />
          )}
        </div>
      </button>
    </div>
  );
}

// Componente de opción de configuración con icono
function ConfigOption({ icon: Icono, label, descripcion, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-gray-50/80 dark:bg-dark-bg/50 rounded-xl border border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200 group"
    >
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-card flex items-center justify-center text-gray-400 group-hover:text-rose-500 transition-colors shadow-sm">
        <Icono size={18} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">{label}</p>
        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">{descripcion}</p>
      </div>
      {badge && (
        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 dark:group-hover:text-dark-text-secondary transition-colors flex-shrink-0" />
    </button>
  );
}

export default function AdminConfiguracion() {
  const { theme, toggleTheme } = useTheme();
  const [config, setConfig] = useState({
    nombre: "Adoptify",
    descripcion: "Plataforma de adopción de mascotas",
    email: "contacto@adoptify.com",
    telefono: "+57 300 000 0000",
    direccion: "Bogotá, Colombia",
    facebook: "https://facebook.com/adoptify",
    instagram: "https://instagram.com/adoptify",
    twitter: "https://twitter.com/adoptify",
  });
  const [apiConfig, setApiConfig] = useState({
    openaiKey: "",
    habilitarIA: false,
    moderacionAutomatica: false,
  });
  const [notifConfig, setNotifConfig] = useState({
    emailNotifs: true,
    pushNotifs: false,
    notifPQRS: true,
    notifReportes: true,
    notifRegistros: true,
  });
  const [securityConfig, setSecurityConfig] = useState({
    verificacionEmail: true,
    autoSuspender: false,
    modoMantenimiento: false,
  });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState("general");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-gray-900 dark:text-dark-text placeholder-gray-400";

  const legalDocs = [
    { icono: Shield, titulo: "Política de Privacidad", descripcion: "Documento de privacidad y tratamiento de datos", color: "text-blue-500" },
    { icono: FileText, titulo: "Términos y Condiciones", descripcion: "Términos de uso de la plataforma", color: "text-violet-500" },
    { icono: FileText, titulo: "Política de Cookies", descripcion: "Uso de cookies y tecnologías similares", color: "text-amber-500" },
  ];

  const categoria = CATEGORIAS.find((c) => c.id === categoriaActiva);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Configuración</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            Administra todos los aspectos de Adoptify
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm ${
            saved
              ? "bg-emerald-500 text-white shadow-emerald-500/20"
              : "text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 hover:shadow-lg hover:shadow-rose-500/25 active:scale-95"
          }`}
        >
          {saved ? (
            <><Check size={16} /> Guardado</>
          ) : (
            <><Save size={16} /> Guardar cambios</>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navegación de categorías - Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden shadow-sm sticky top-20">
            <div className="p-3 border-b border-gray-100 dark:border-dark-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary">
                Categorías
              </p>
            </div>
            <div className="p-2 space-y-0.5">
              {CATEGORIAS.map((cat) => {
                const Icono = cat.icono;
                const isActive = categoriaActiva === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaActiva(cat.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                      isActive
                        ? "bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 text-rose-600 dark:text-rose-400 shadow-sm"
                        : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border hover:text-gray-900 dark:hover:text-dark-text"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-rose-500 to-amber-500" />
                    )}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isActive ? cat.bgColor : "bg-gray-50 dark:bg-dark-border"
                    }`}>
                      <Icono size={15} className={isActive ? cat.textColor : "text-gray-400"} />
                    </div>
                    <span className="flex-1 text-left">{cat.titulo}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Contenido de la categoría activa */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden shadow-sm">
            {/* Header de categoría */}
            <div className="relative">
              <div className={`h-20 bg-gradient-to-r ${categoria?.color || "from-rose-400 to-amber-400"}`} />
              <div className="px-6 pb-5 -mt-8">
                <div className="flex items-end gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${categoria?.bgColor || "bg-rose-50 dark:bg-rose-500/10"} flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-dark-card`}>
                    {categoria && <categoria.icono size={24} className={categoria.textColor} />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                      {categoria?.titulo || "Configuración"}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                      {categoria?.descripcion || ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-6">
              {/* Información General */}
              {categoriaActiva === "general" && (
                <div className="space-y-4 pt-2">
                  {CATEGORIAS[0].campos.map((campo) => (
                    <div key={campo.key}>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-dark-text-secondary mb-1.5">
                        {campo.label}
                      </label>
                      {campo.type === "textarea" ? (
                        <textarea
                          value={config[campo.key]}
                          onChange={(e) => setConfig((p) => ({ ...p, [campo.key]: e.target.value }))}
                          rows={3}
                          placeholder={campo.placeholder}
                          className={inputClass + " resize-none"}
                        />
                      ) : (
                        <input
                          type={campo.type}
                          value={config[campo.key]}
                          onChange={(e) => setConfig((p) => ({ ...p, [campo.key]: e.target.value }))}
                          placeholder={campo.placeholder}
                          className={inputClass}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Redes Sociales */}
              {categoriaActiva === "redes" && (
                <div className="space-y-4 pt-2">
                  {CATEGORIAS[1].campos.map((campo) => (
                    <div key={campo.key}>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-dark-text-secondary mb-1.5">
                        {campo.label}
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                          {campo.icono === "facebook" && (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          )}
                          {campo.icono === "instagram" && (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-pink-500"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                          )}
                          {campo.icono === "twitter" && (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-900 dark:text-gray-100"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          )}
                        </div>
                        <input
                          type={campo.type}
                          value={config[campo.key]}
                          onChange={(e) => setConfig((p) => ({ ...p, [campo.key]: e.target.value }))}
                          placeholder={campo.placeholder}
                          className={inputClass + " pl-10"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Apariencia */}
              {categoriaActiva === "apariencia" && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-dark-bg/50 rounded-xl border border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        theme === "dark"
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
                          : "bg-amber-50 dark:bg-amber-500/10 text-amber-500"
                      }`}>
                        {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Modo oscuro</p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                          {theme === "dark" ? "El modo oscuro está activo" : "El modo claro está activo"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                        theme === "dark"
                          ? "bg-gradient-to-r from-rose-500 to-amber-500 shadow-sm shadow-rose-500/20"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
                          theme === "dark" ? "translate-x-5" : ""
                        }`}
                      >
                        {theme === "dark" ? (
                          <Moon size={10} className="text-indigo-500" />
                        ) : (
                          <Sun size={10} className="text-amber-500" />
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50/80 dark:bg-dark-bg/50 rounded-xl border border-gray-100 dark:border-dark-border">
                    <p className="text-sm font-semibold text-gray-900 dark:text-dark-text mb-1">Colores de la marca</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-3">
                      Esquema de color principal de Adoptify
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-500 shadow-sm" />
                        <span className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Rosa</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 shadow-sm" />
                        <span className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Ámbar</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 shadow-sm" />
                        <span className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Gradiente</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notificaciones */}
              {categoriaActiva === "notificaciones" && (
                <div className="space-y-3 pt-2">
                  <ToggleSwitch
                    enabled={notifConfig.emailNotifs}
                    onChange={(v) => setNotifConfig((p) => ({ ...p, emailNotifs: v }))}
                    label="Notificaciones por correo"
                    descripcion="Recibir notificaciones importantes por correo electrónico"
                  />
                  <ToggleSwitch
                    enabled={notifConfig.pushNotifs}
                    onChange={(v) => setNotifConfig((p) => ({ ...p, pushNotifs: v }))}
                    label="Notificaciones push"
                    descripcion="Recibir notificaciones en tiempo real en el navegador"
                  />
                  <ToggleSwitch
                    enabled={notifConfig.notifPQRS}
                    onChange={(v) => setNotifConfig((p) => ({ ...p, notifPQRS: v }))}
                    label="Alertas de PQRS"
                    descripcion="Notificar cuando se reciba una nueva PQRS"
                  />
                  <ToggleSwitch
                    enabled={notifConfig.notifReportes}
                    onChange={(v) => setNotifConfig((p) => ({ ...p, notifReportes: v }))}
                    label="Alertas de reportes"
                    descripcion="Notificar cuando se reciba un nuevo reporte"
                  />
                  <ToggleSwitch
                    enabled={notifConfig.notifRegistros}
                    onChange={(v) => setNotifConfig((p) => ({ ...p, notifRegistros: v }))}
                    label="Nuevos registros"
                    descripcion="Notificar cuando se registren nuevos usuarios o refugios"
                  />
                </div>
              )}

              {/* Seguridad */}
              {categoriaActiva === "seguridad" && (
                <div className="space-y-3 pt-2">
                  <ToggleSwitch
                    enabled={securityConfig.verificacionEmail}
                    onChange={(v) => setSecurityConfig((p) => ({ ...p, verificacionEmail: v }))}
                    label="Verificación de email obligatoria"
                    descripcion="Los nuevos usuarios deben verificar su correo electrónico"
                  />
                  <ToggleSwitch
                    enabled={securityConfig.autoSuspender}
                    onChange={(v) => setSecurityConfig((p) => ({ ...p, autoSuspender: v }))}
                    label="Suspensión automática por inactividad"
                    descripcion="Suspender cuentas después de 6 meses de inactividad"
                  />
                  <ToggleSwitch
                    enabled={securityConfig.modoMantenimiento}
                    onChange={(v) => setSecurityConfig((p) => ({ ...p, modoMantenimiento: v }))}
                    label="Modo mantenimiento"
                    descripcion="Deshabilitar el acceso público a la plataforma durante mantenimiento"
                  />
                </div>
              )}

              {/* Inteligencia Artificial */}
              {categoriaActiva === "ia" && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-dark-text-secondary mb-1.5">
                      API Key de OpenAI
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={apiConfig.openaiKey}
                        onChange={(e) => setApiConfig((p) => ({ ...p, openaiKey: e.target.value }))}
                        placeholder="sk-..."
                        className={inputClass + " pr-10"}
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={apiConfig.habilitarIA}
                    onChange={(v) => setApiConfig((p) => ({ ...p, habilitarIA: v }))}
                    label="Habilitar asistente IA"
                    descripcion="Permite usar IA para respuestas automáticas"
                  />
                  <ToggleSwitch
                    enabled={apiConfig.moderacionAutomatica}
                    onChange={(v) => setApiConfig((p) => ({ ...p, moderacionAutomatica: v }))}
                    label="Moderación automática"
                    descripcion="IA moderará contenido inapropiado automáticamente"
                  />
                </div>
              )}

              {/* Documentos Legales */}
              {categoriaActiva === "documentos" && (
                <div className="space-y-3 pt-2">
                  {legalDocs.map((doc) => (
                    <ConfigOption
                      key={doc.titulo}
                      icon={doc.icono}
                      label={doc.titulo}
                      descripcion={doc.descripcion}
                      badge="PDF"
                      onClick={() => {}}
                    />
                  ))}
                </div>
              )}

              {/* Guardar cambios al final */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    saved
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : "text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 hover:shadow-lg hover:shadow-rose-500/25 active:scale-95"
                  }`}
                >
                  {saved ? (
                    <><Check size={16} /> Guardado</>
                  ) : (
                    <><Save size={16} /> Guardar cambios</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
