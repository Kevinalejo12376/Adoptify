import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Bell, Sun, Moon, ChevronDown, Settings,
  Shield, BarChart3, HelpCircle, Info, UserCircle,
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from "../../../api/notificaciones";
import ProfileDropdown from "../../../components/ProfileDropdown";

const getTipoColor = (tipo) => {
  const map = {
    nuevo_refugio: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    nuevo_usuario: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    nueva_mascota: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    nueva_solicitud: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    reporte: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    pqrs: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };
  return map[tipo] || "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400";
};

export default function AdminHeader({ adminNombre, onLogout, onMenuToggle }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const notifRef = useRef(null);

  const [notifs, setNotifs] = useState([]);
  const noLeidas = notifs.filter((n) => !n.leida).length;

  const cargarNotifs = useCallback(async () => {
    try {
      const data = await listarNotificaciones();
      setNotifs(data || []);
    } catch {
      // sin notificaciones si falla
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(cargarNotifs, 30000);
    const first = setTimeout(cargarNotifs, 0);
    return () => { clearInterval(timer); clearTimeout(first); };
  }, [cargarNotifs]);

  // Cierra el panel de notificaciones al hacer clic fuera.
  useEffect(() => {
    const h = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Solo un menú desplegable abierto a la vez: abrir uno cierra el otro.
  const toggleNotif = () => {
    if (!notifOpen) setPerfilOpen(false);
    setNotifOpen(!notifOpen);
  };

  const togglePerfil = () => {
    if (!perfilOpen) setNotifOpen(false);
    setPerfilOpen(!perfilOpen);
  };

  const handleClickNotif = async (notif) => {
    if (!notif.leida) {
      try { await marcarLeida(notif.id); } catch { /* noop */ }
      setNotifs((prev) => prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n)));
    }
    if (notif.enlace) navigate(notif.enlace);
    setNotifOpen(false);
  };

  const handleMarcarTodas = async () => {
    try { await marcarTodasLeidas(); } catch { /* noop */ }
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (busqueda.trim()) {
      navigate("/admin/dashboard");
      setBusqueda("");
    }
  };

  const handleNavigation = (path) => {
    setPerfilOpen(false);
    navigate(path);
  };

  // Opciones del menú del perfil (sin duplicados), con el mismo estilo del rol Tienda.
  const opcionesPerfil = [
    { icon: UserCircle, label: "Perfil", path: "/admin/usuarios" },
    { icon: Settings, label: "Configuración", path: "/admin/configuracion" },
    { icon: Shield, label: "Administradores", path: "/admin/administradores" },
    { icon: BarChart3, label: "Estadísticas", path: "/admin/estadisticas" },
    { icon: HelpCircle, label: "PQRS", path: "/admin/pqrs" },
    { icon: Info, label: "Acerca de Adoptify", path: "/admin/dashboard" },
  ];

  const nombreAdmin = adminNombre || "Administrador";

  const trigger = (
    <>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center text-xs font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
        {adminNombre?.[0] || "A"}
      </div>
      <div className="hidden sm:block text-left">
        <p className="text-xs font-semibold text-gray-900 dark:text-dark-text leading-tight">{nombreAdmin}</p>
        <p className="text-[10px] text-gray-400 dark:text-dark-text-secondary leading-tight">Administrador</p>
      </div>
      <ChevronDown size={14} className={`text-gray-400 hidden sm:block transition-transform duration-200 ${perfilOpen ? "rotate-180" : ""}`} />
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-gray-100 dark:border-dark-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en el panel..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center gap-1.5 ml-4">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-all duration-200 hover:scale-105 active:scale-95"
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={toggleNotif}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Bell size={18} />
              {noLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-dark-card">
                  {noLeidas > 9 ? "9+" : noLeidas}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-dark-border animate-scale-in overflow-hidden">
                <div className="p-3 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Notificaciones</h3>
                  {noLeidas > 0 && (
                    <button onClick={handleMarcarTodas} className="text-xs text-rose-500 hover:text-rose-600 font-medium">
                      Marcar todas leidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-hide">
                  {notifs.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={28} className="mx-auto text-gray-300 dark:text-dark-border mb-2" />
                      <p className="text-sm text-gray-400 dark:text-dark-text-secondary">Sin notificaciones</p>
                    </div>
                  ) : (
                    notifs.slice(0, 8).map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleClickNotif(notif)}
                        className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-border ${
                          !notif.leida ? "bg-rose-50/30 dark:bg-rose-500/5" : ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${getTipoColor(notif.tipo)}`}>
                          <Bell size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.leida ? "font-semibold" : "font-medium"} text-gray-900 dark:text-dark-text truncate`}>
                            {notif.titulo || notif.tipo || "Notificacion"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5 line-clamp-2">
                            {notif.mensaje}
                          </p>
                          {notif.creado_en && (
                            <p className="text-[10px] text-gray-400 dark:text-dark-text-secondary mt-1">
                              {new Date(notif.creado_en).toLocaleDateString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                        {!notif.leida && <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-2" />}
                      </button>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-gray-100 dark:border-dark-border">
                  <button
                    onClick={() => { navigate("/admin/dashboard"); setNotifOpen(false); }}
                    className="w-full py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    Ver todas las notificaciones
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Menú del perfil: mismo diseño que el rol Tienda, sin franja superior,
              abre/cierra solo con clic; opciones con hover y estado activo. */}
          <ProfileDropdown
            open={perfilOpen}
            onToggle={togglePerfil}
            onClose={() => setPerfilOpen(false)}
            trigger={trigger}
            avatar={adminNombre?.[0] || "A"}
            name={nombreAdmin}
            subtitle="Administrador"
            options={opcionesPerfil}
            onOptionClick={(op) => handleNavigation(op.path)}
            onLogout={() => { onLogout(); setPerfilOpen(false); }}
          />
        </div>
      </div>
    </header>
  );
}
