import { useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Store, BarChart3, Bell, Settings,
  ChevronLeft, ChevronRight, LogOut, PawPrint as LogoIcon, Star, ClipboardList,
  History, HeartHandshake, Pin, PinOff, Loader2,
} from "lucide-react";
import { useStore } from "../../../context/StoreContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/tienda/dashboard" },
  { icon: Package, label: "Productos", path: "/tienda/productos" },
  { icon: ClipboardList, label: "Kardex", path: "/tienda/kardex" },
  { icon: ShoppingCart, label: "Pedidos", path: "/tienda/pedidos" },
  { icon: Store, label: "Perfil Tienda", path: "/tienda/perfil" },
  { icon: BarChart3, label: "Estadísticas", path: "/tienda/estadisticas" },
  { icon: Bell, label: "Notificaciones", path: "/tienda/notificaciones" },
  { icon: Settings, label: "Configuración", path: "/tienda/configuracion" },
];
// El menu lateral se simplifica a las opciones principales de trabajo.
// Las demas funcionalidades (perfil, administradores, notificaciones, PQRS,
// configuracion y cerrar sesion) se acceden desde el menu del perfil.
function useMenuItems() {
  const { tienePermiso } = useStore();

  const items = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/tienda/dashboard", permiso: "dashboard.ver" },
    { icon: Package, label: "Productos", path: "/tienda/productos", permiso: "productos.ver" },
    { icon: ClipboardList, label: "Kardex", path: "/tienda/kardex" },
    { icon: ShoppingCart, label: "Pedidos", path: "/tienda/pedidos", permiso: "pedidos.ver" },
    { icon: BarChart3, label: "Estadísticas", path: "/tienda/estadisticas", permiso: "reportes.ver_estadisticas" },
    { icon: History, label: "Historial de actividad", path: "/tienda/actividad", permiso: "historial.ver" },
    { icon: HeartHandshake, label: "Donaciones", path: "/tienda/donaciones", permiso: "donaciones.ver" },
  ];

  return items.filter((item) => {
    if (item.permiso) return tienePermiso(item.permiso);
    return true;
  });
}

export default function StoreSidebar({ collapsed, setCollapsed, storeNombre, storeLogo, onLogout, fijado, onToggleFijar }) {
  const location = useLocation();
  // Mientras el contexto de la tienda carga los permisos (BD), se muestra un
  // indicador en lugar del menú filtrado (evita que aparezca solo "Kardex").
  const { loading: contextoCargando } = useStore();
  const menuItems = useMenuItems();
  const sidebarRef = useRef(null);
  // "Fijar" se controla desde StoreLayout para poder ajustar el margen del contenido.

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const expandir = () => setCollapsed(false);
  const colapsar = () => { if (!fijado) setCollapsed(true); };

  // Fijar/desfijar: notifica al layout para ajustar el margen del contenido.
  const toggleFijar = () => {
    const nuevo = !fijado;
    onToggleFijar();
    if (nuevo) setCollapsed(false);
    else setCollapsed(true);
  };

  // Se colapsa al hacer click fuera de la barra lateral (salvo si está fijado).
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        if (!fijado) setCollapsed(true);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setCollapsed, fijado]);

  return (
    <>
      {/* Sidebar Desktop: se expande al entrar el mouse y se colapsa al salir */}
      <aside
        ref={sidebarRef}
        onMouseEnter={expandir}
        onMouseLeave={colapsar}
        className={`
          fixed left-0 top-0 h-full z-50
          bg-white dark:bg-dark-card
          border-r border-gray-100 dark:border-dark-border
          transition-all duration-300 ease-in-out
          hidden lg:flex flex-col
          ${collapsed ? "w-[72px]" : "w-[260px]"}
        `}
      >
        {/* Logo + nombre de la tienda */}
        <div className={`flex items-center ${collapsed ? "justify-center" : ""} px-4 h-16 border-b border-gray-100 dark:border-dark-border flex-shrink-0`}>
          <NavLink to="/tienda/dashboard" onClick={colapsar} className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {storeLogo ? (
                <img src={storeLogo} alt={storeNombre || "Tienda"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">{storeNombre?.[0] || "T"}</span>
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-dark-text truncate">
                  {storeNombre || "Mi Tienda"}
                </p>
              </div>
            )}
          </NavLink>
        </div>

        {/* Menu dinamico segun permisos */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2 space-y-0.5">
          {contextoCargando ? (
            <div className={`flex flex-col items-center justify-center text-gray-400 dark:text-dark-text-secondary ${collapsed ? "py-6" : "py-8"}`}>
              <Loader2 className="w-5 h-5 animate-spin text-rose-500 mb-2" />
              {!collapsed && <span className="text-xs">Cargando menú...</span>}
            </div>
          ) : menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={colapsar}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative
                  ${collapsed ? "justify-center" : ""}
                  ${
                    active
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20"
                      : "text-gray-500 dark:text-dark-text-secondary hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400"
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={`flex-shrink-0 transition-all ${active ? "text-white" : "group-hover:text-orange-600 dark:group-hover:text-orange-400"}`}
                />
                {!collapsed && (
                  <span className={`text-sm font-medium transition-all ${active ? "text-white" : ""}`}>
                    {item.label}
                  </span>
                )}
                {active && !collapsed && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white/70" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Acciones inferiores: fijar menú y cerrar sesión */}
        <div className="border-t border-gray-100 dark:border-dark-border p-3 flex-shrink-0 space-y-0.5">
          <button
            type="button"
            onClick={toggleFijar}
            title={fijado ? "Menú fijado (clic para desfijar)" : "Fijar menú"}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${collapsed ? "justify-center px-0" : ""} ${
              fijado
                ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20"
                : "text-gray-500 dark:text-dark-text-secondary hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400"
            }`}
          >
            {fijado ? <PinOff size={16} className="flex-shrink-0" /> : <Pin size={16} className="flex-shrink-0" />}
            {!collapsed && (fijado ? "Menú fijado" : "Fijar menú")}
          </button>

          <button
            type="button"
            onClick={() => { onLogout?.(); colapsar(); }}
            title="Cerrar sesión"
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ${collapsed ? "justify-center px-0" : ""}`}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-hide px-1 py-1">
          {!contextoCargando && menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[60px] transition-colors
                  ${active ? "text-rose-500" : "text-gray-400 dark:text-dark-text-secondary"}
                `}
              >
                <item.icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
