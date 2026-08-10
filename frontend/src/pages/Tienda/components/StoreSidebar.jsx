import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Store, BarChart3, Bell, Settings,
  ChevronLeft, ChevronRight, LogOut, PawPrint as LogoIcon, Star, ClipboardList,
} from "lucide-react";

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

export default function StoreSidebar({ collapsed, onToggle, storeNombre, onLogout }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={`
          fixed left-0 top-0 h-full z-50
          bg-white dark:bg-dark-card
          border-r border-gray-100 dark:border-dark-border
          transition-all duration-300 ease-in-out
          hidden lg:flex flex-col
          ${collapsed ? "w-[72px]" : "w-[260px]"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4 h-16 border-b border-gray-100 dark:border-dark-border`}>
          <NavLink to="/tienda/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0">
              <LogoIcon size={16} className="text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-dark-text truncate">
                  {storeNombre || "Tienda"}
                </p>
                <p className="text-[10px] font-medium text-gray-400 dark:text-dark-text-secondary truncate leading-tight">
                  Panel Tienda
                </p>
              </div>
            )}
          </NavLink>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* Menú */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2 space-y-0.5">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
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

        {/* Info Tienda + Cerrar sesión */}
        <div className="border-t border-gray-100 dark:border-dark-border p-3">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center text-xs font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                  {storeNombre?.[0] || "T"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-dark-text truncate">
                    {storeNombre || "Tienda"}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-dark-text-secondary truncate">
                    Tienda Aliada
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button
              onClick={onToggle}
              className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors"
              title="Expandir"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Sidebar Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-hide px-1 py-1">
          {menuItems.slice(0, 5).map((item) => {
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
