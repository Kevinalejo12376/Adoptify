import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Bell, Sun, Moon, ChevronDown, Settings, Store, Users, User, ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useStore } from "../../../context/StoreContext";
import { listarNotificaciones, marcarLeida } from "../../../api/notificaciones";
import ProfileDropdown from "../../../components/ProfileDropdown";

export default function StoreHeader({
  storeNombre, usuarioNombre, esSuperAdmin, tienePermiso, onLogout,
}) {
  const { theme, toggleTheme } = useTheme();
  const { storeLogo, representanteNombre } = useStore();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const notifRef = useRef(null);

  const [notifs, setNotifs] = useState([]);
  const noLeidas = notifs.filter((n) => !n.leida).length;

  const cargar = useCallback(async () => {
    try {
      const data = await listarNotificaciones();
      setNotifs(data || []);
    } catch { /* sin notificaciones */ }
  }, []);

  useEffect(() => {
    const t = setInterval(cargar, 30000);
    const first = setTimeout(cargar, 0);
    return () => { clearInterval(t); clearTimeout(first); };
  }, [cargar]);

  // Cierra el panel de notificaciones al hacer clic fuera.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (busqueda.trim()) { navigate("/tienda/dashboard"); setBusqueda(""); }
  };

  const irA = (path) => {
    setPerfilOpen(false);
    navigate(path);
  };

  // Opciones del menú del perfil (solo las que NO están en el menú lateral),
  // construidas dinámicamente según los permisos del rol Tienda.
  const opcionesPerfil = [];
  if (tienePermiso && tienePermiso("tienda.ver_perfil")) {
    opcionesPerfil.push({ label: "Perfil de la tienda", icon: Store, path: "/tienda/perfil" });
  }
  if (esSuperAdmin) {
    opcionesPerfil.push({ label: "Administradores", icon: Users, path: "/tienda/administradores" });
  }
  opcionesPerfil.push({ label: "Notificaciones", icon: Bell, path: "/tienda/notificaciones" });
  if (tienePermiso && tienePermiso("pqrs.ver")) {
    opcionesPerfil.push({ label: "PQRS", icon: MessageSquare, path: "/tienda/pqrs" });
  }
  if (tienePermiso && tienePermiso("configuracion.acceder")) {
    opcionesPerfil.push({ label: "Configuración", icon: Settings, path: "/tienda/configuracion" });
  }

  // Nombre del usuario autenticado (no el del dueño de la tienda) y su rol,
  // ambos resueltos dinámicamente desde el contexto que alimenta la base de datos.
  const nombreUsuarioActual = usuarioNombre || representanteNombre || "Usuario";
  const rolUsuario = esSuperAdmin ? "Representante" : "Administrador";
  const RolIcono = esSuperAdmin ? ShieldCheck : User;

  const avatarContent = storeLogo ? (
    <img src={storeLogo} alt={storeNombre || ""} className="w-full h-full object-cover" />
  ) : (
    nombreUsuarioActual?.[0] || (esSuperAdmin ? "R" : "A")
  );

  const trigger = (
    <>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center overflow-hidden text-xs font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
        {avatarContent}
      </div>
      <div className="hidden sm:block text-left">
        <p className="text-xs font-semibold text-gray-900 dark:text-dark-text leading-tight">{nombreUsuarioActual}</p>
        <p className={`text-[10px] leading-tight ${esSuperAdmin ? "text-rose-500 dark:text-rose-400" : "text-gray-400 dark:text-dark-text-secondary"}`}>{rolUsuario}</p>
      </div>
      <ChevronDown size={14} className={`text-gray-400 hidden sm:block transition-transform duration-200 ${perfilOpen ? "rotate-180" : ""}`} />
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-gray-100 dark:border-dark-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Buscador */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en la tienda..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
        </form>

        {/* Acciones derecha */}
        <div className="flex items-center gap-2 ml-4">
          <button onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-all duration-200 hover:scale-105 active:scale-95"
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notificaciones reales */}
          <div className="relative" ref={notifRef}>
            <button onClick={toggleNotif}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-all duration-200 hover:scale-105 active:scale-95">
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
                  {noLeidas > 0 && <span className="text-xs text-rose-500 font-medium">{noLeidas} sin leer</span>}
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-hide">
                  {notifs.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={26} className="mx-auto text-gray-300 dark:text-dark-border mb-2" />
                      <p className="text-sm text-gray-400">Sin notificaciones</p>
                    </div>
                  ) : notifs.slice(0, 6).map((notif) => (
                    <button key={notif.id} onClick={() => handleClickNotif(notif)}
                      className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-border ${!notif.leida ? "bg-rose-50/30 dark:bg-rose-500/5" : ""}`}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50 text-gray-600 dark:bg-dark-border">
                        <Bell size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.leida ? "font-semibold" : "font-medium"} text-gray-900 dark:text-dark-text truncate`}>
                          {notif.titulo || notif.tipo || "Notificación"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5 line-clamp-2">{notif.mensaje}</p>
                        {notif.creado_en && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(notif.creado_en).toLocaleDateString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      {!notif.leida && <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-2" />}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-gray-100 dark:border-dark-border">
                  <button onClick={() => { navigate("/tienda/notificaciones"); setNotifOpen(false); }}
                    className="w-full py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors">
                    Ver todas las notificaciones
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Menú del perfil: abre/cierra solo con clic; opciones con hover y estado activo */}
          <ProfileDropdown
            open={perfilOpen}
            onToggle={togglePerfil}
            onClose={() => setPerfilOpen(false)}
            trigger={trigger}
            avatar={avatarContent}
            name={nombreUsuarioActual}
            subtitle={rolUsuario}
            badgeIcon={RolIcono}
            options={opcionesPerfil}
            onOptionClick={(op) => irA(op.path)}
            onLogout={() => { onLogout(); setPerfilOpen(false); }}
          />
        </div>
      </div>
    </header>
  );
}
