import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, PawPrint, Store,
  ClipboardList, ChevronLeft, ShoppingBag, Package,
  BarChart3, ChevronDown, LogOut, Pin, PinOff,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Users, label: "Usuarios", path: "/admin/usuarios" },
  { icon: Building2, label: "Refugios", path: "/admin/refugios" },
  { icon: PawPrint, label: "Mascotas", path: "/admin/mascotas" },
  {
    icon: Store,
    label: "Marketplace",
    path: "/admin/marketplace",
    submenu: [
      { icon: Package, label: "Productos", path: "/admin/marketplace" },
      { icon: ShoppingBag, label: "Tiendas Aliadas", path: "/admin/tiendas" },
      { icon: BarChart3, label: "Estadísticas", path: "/admin/marketplace/estadisticas" },
    ],
  },
  { icon: ClipboardList, label: "Reportes", path: "/admin/reportes" },
];

export default function AdminSidebar({ mobileOpen, onMobileClose, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  // "Fijar" mantiene el menú lateral abierto (no se colapsa al salir el mouse).
  const [fijado, setFijado] = useState(false);
  const sidebarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const isExpanded = isHovered || fijado;
  const isMarketplaceActive = location.pathname.startsWith("/admin/marketplace") || location.pathname === "/admin/tiendas";

  // Auto-open marketplace submenu if we're on a marketplace page
  useEffect(() => {
    if (isMarketplaceActive && isExpanded) {
      const t = setTimeout(() => setMarketplaceOpen(true), 0);
      return () => clearTimeout(t);
    }
  }, [isMarketplaceActive, isExpanded]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (fijado) return; // fijado: el menú permanece abierto
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      if (!isMarketplaceActive) setMarketplaceOpen(false);
    }, 50);
  };

  // Fijar/desfijar: solo cambia el estado abierto/cerrado del menú lateral.
  const toggleFijar = () => {
    const nuevo = !fijado;
    setFijado(nuevo);
    setIsHovered(nuevo);
    if (nuevo && isMarketplaceActive) setMarketplaceOpen(true);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
    if (!fijado) setIsHovered(false);
  };

  const NavItem = ({ item, isMobile = false }) => {
    const isActive = location.pathname === item.path;
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const subActive = hasSubmenu && isMarketplaceActive;

    if (isMobile) {
      return (
        <div>
          <button
            onClick={() => {
              if (hasSubmenu) {
                setMarketplaceOpen(!marketplaceOpen);
              } else {
                navigate(item.path);
                handleNavClick();
              }
            }}
            className={`w-full group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${
              isActive || subActive
                ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20"
                : "text-gray-500 dark:text-dark-text-secondary hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400"
            }`}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full bg-white/80" />
            )}
            <item.icon size={22} strokeWidth={isActive || subActive ? 2.5 : 1.5} className="flex-shrink-0" />
            <span className="flex-1 text-left text-base font-medium">{item.label}</span>
            {hasSubmenu && (
              <ChevronDown size={16} className={`transition-transform duration-200 ${marketplaceOpen ? "rotate-180" : ""}`} />
            )}
          </button>
          {hasSubmenu && marketplaceOpen && (
            <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-dark-border pl-3">
              {item.submenu.map((sub) => {
                const isSubActive = location.pathname === sub.path;
                return (
                  <NavLink
                    key={sub.path}
                    to={sub.path}
                    onClick={handleNavClick}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isSubActive
                        ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10"
                        : "text-gray-500 dark:text-dark-text-secondary hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                    }`}
                  >
                    <sub.icon size={16} strokeWidth={isSubActive ? 2.5 : 1.5} />
                    {sub.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Desktop version
    return (
      <div>
        <NavLink
          to={hasSubmenu ? undefined : item.path}
          onClick={(e) => {
            if (hasSubmenu) {
              e.preventDefault();
              if (isExpanded) {
                setMarketplaceOpen(!marketplaceOpen);
              } else {
                setIsHovered(true);
                setTimeout(() => setMarketplaceOpen(true), 280);
              }
            } else {
              handleNavClick();
            }
          }}
          className={`
            group flex items-center gap-3 rounded-xl transition-all duration-200 relative overflow-hidden cursor-pointer
            ${isExpanded ? "px-3 py-3" : "px-0 py-3 justify-center mx-auto w-[56px]"}
            ${isActive || subActive
              ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20"
              : "text-gray-500 dark:text-dark-text-secondary hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400"
            }
          `}
          title={!isExpanded ? item.label : undefined}
        >
          {isActive && isExpanded && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full bg-white/80" />
          )}
          {isActive && !isExpanded && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-amber-400" />
          )}

          <item.icon
            size={22}
            strokeWidth={isActive || subActive ? 2.5 : 1.5}
            className={`flex-shrink-0 transition-all duration-200 ${
              isActive || subActive ? "text-white" : "group-hover:text-orange-600 dark:group-hover:text-orange-400"
            }`}
          />
          <span className={`
            text-base font-medium transition-all duration-[280ms] ease-out whitespace-nowrap flex-1
            ${isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0 overflow-hidden"}
            ${isActive || subActive ? "text-white" : ""}
          `}>
            {item.label}
          </span>
          {hasSubmenu && isExpanded && (
            <ChevronDown size={16} className={`transition-transform duration-200 flex-shrink-0 ${
              marketplaceOpen ? "rotate-180" : ""
            } ${isActive || subActive ? "text-white/80" : "text-gray-400"}`} />
          )}
        </NavLink>

        {/* Submenu */}
        {hasSubmenu && isExpanded && marketplaceOpen && (
          <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-rose-200 dark:border-rose-500/30 pl-3 animate-slide-down">
            {item.submenu.map((sub) => {
              const isSubActive = location.pathname === sub.path;
              return (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  onClick={handleNavClick}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isSubActive
                      ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10"
                      : "text-gray-500 dark:text-dark-text-secondary hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                  }`}
                >
                  <sub.icon size={16} strokeWidth={isSubActive ? 2.5 : 1.5} />
                  {sub.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          fixed left-0 top-0 h-full z-50
          bg-white dark:bg-dark-card
          border-r border-gray-100 dark:border-dark-border
          hidden lg:flex flex-col
          transition-all duration-[280ms] ease-out
          ${isExpanded ? "w-[280px]" : "w-[80px]"}
        `}
      >
        {/* Logo */}
        <div className={`
          flex items-center h-16 border-b border-gray-100 dark:border-dark-border
          ${isExpanded ? "px-4 justify-between" : "px-0 justify-center"}
          transition-all duration-[280ms] ease-out
        `}>
          <NavLink
            to="/admin/dashboard"
            onClick={handleNavClick}
            className={`
              flex items-center min-w-0
              ${isExpanded ? "gap-2.5" : "gap-0 justify-center"}
              transition-all duration-[280ms] ease-out
            `}
          >
            <img src="/FaviconNav.png" alt="Adoptify" className="w-11 h-11 object-contain flex-shrink-0" />
            <div className={`
              min-w-0 overflow-hidden
              transition-all duration-[280ms] ease-out
              ${isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"}
            `}>
              <p className="text-base font-bold text-gray-900 dark:text-dark-text truncate">Adoptify</p>
              <p className="text-xs font-medium text-gray-400 dark:text-dark-text-secondary truncate leading-tight">
                Panel de Administración
              </p>
            </div>
          </NavLink>
        </div>

        {/* Menú principal */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-2 space-y-1">
          {menuItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* Fijar menú + Cerrar Sesión */}
        <div className="border-t border-gray-100 dark:border-dark-border p-3 space-y-1">
          <button
            onClick={toggleFijar}
            title={fijado ? "Menú fijado (clic para desfijar)" : "Fijar menú"}
            className={`
              flex items-center rounded-xl transition-all duration-200 group cursor-pointer w-full
              ${isExpanded ? "gap-3 px-3 py-3" : "gap-0 justify-center px-0 py-3 mx-auto w-[56px]"}
              ${fijado ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20" : ""}
            `}
          >
            {fijado ? (
              <PinOff size={20} className="flex-shrink-0 text-white transition-colors" />
            ) : (
              <Pin size={20} className="flex-shrink-0 text-gray-400 group-hover:text-rose-500 transition-colors" />
            )}
            <span className={`
              text-sm font-medium transition-all duration-[280ms] ease-out whitespace-nowrap
              ${isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0 overflow-hidden"}
              ${fijado ? "text-white" : "text-gray-500 dark:text-dark-text-secondary"}
            `}>
              {fijado ? "Menú fijado" : "Fijar menú"}
            </span>
          </button>

          <button
            onClick={() => { onMobileClose?.(); onLogout?.(); }}
            className={`
              flex items-center rounded-xl transition-all duration-200 group cursor-pointer w-full
              ${isExpanded ? "gap-3 px-3 py-3" : "gap-0 justify-center px-0 py-3 mx-auto w-[56px]"}
            `}
            title={!isExpanded ? "Cerrar sesión" : undefined}
          >
            <LogOut size={20} className="flex-shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
            <span className={`
              text-sm font-medium text-gray-500 dark:text-dark-text-secondary group-hover:text-red-500 transition-colors
              transition-all duration-[280ms] ease-out whitespace-nowrap
              ${isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0 overflow-hidden"}
            `}>
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-modal-overlay"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Mobile */}
      <aside
        className={`
          fixed left-0 top-0 h-full z-50
          bg-white dark:bg-dark-card
          border-r border-gray-100 dark:border-dark-border
          lg:hidden flex flex-col
          transition-all duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          w-[260px]
        `}
      >
        {/* Logo Mobile */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 dark:border-dark-border">
          <NavLink to="/admin/dashboard" onClick={handleNavClick} className="flex items-center gap-2.5">
            <img src="/FaviconNav.png" alt="Adoptify" className="w-11 h-11 object-contain flex-shrink-0" />
            <div>
              <p className="text-base font-bold text-gray-900 dark:text-dark-text">Adoptify</p>
              <p className="text-xs font-medium text-gray-400 dark:text-dark-text-secondary leading-tight">
                Panel de Administración
              </p>
            </div>
          </NavLink>
          <button
            onClick={onMobileClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Menú Mobile */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2 space-y-1">
          {menuItems.map((item) => (
            <NavItem key={item.path} item={item} isMobile />
          ))}
        </nav>

        {/* Cerrar Sesión Mobile */}
        <div className="border-t border-gray-100 dark:border-dark-border p-3">
          <button
            onClick={() => { onMobileClose?.(); onLogout?.(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-500 dark:text-dark-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
