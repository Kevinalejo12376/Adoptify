import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, Menu, X, Sparkles, User, ChevronDown, LogOut, PawPrint, ShoppingBag, MessageSquare, Home as HomeIcon, Settings, Bell, ShoppingCart, Sun, Moon, Building2, ClipboardList, Store, LayoutDashboard, PackageSearch, Users } from "lucide-react";
import { ADOPTIFY_LOGO as logo } from "../constants/assets";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import NotificationPanel from "./NotificationPanel";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeNavSection, setActiveNavSection] = useState("inicio");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isShelter, esRepresentanteRefugio, tienePermisoRefugio } = useAuth();
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { cartCount } = useCart();
  const dropdownRef = useRef(null);

  const isDark = theme === "dark";

  // Determinar si el usuario pertenece a un refugio (representante o empleado)
  const esShelter = isShelter();
  // ¿Es empleado del refugio (no representante)?
  const esEmpleadoRefugio = esShelter && !esRepresentanteRefugio();
  // Verificar si la tienda del refugio está activada
  const isStoreEnabled = user?.settings?.storeEnabled ?? false;

  const isActive = (path) => location.pathname === path;
  const isAuthenticated = !!user;
  const isInicioActive = () => isActive("/dashboard") || isActive("/refugio/dashboard") || isActive("/");

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return "?";
    const names = user.name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  // Foto de perfil real persistida: para refugios se prefiere el logo del
  // refugio; para el resto, el avatar del usuario (o el logo si aplica).
  const getUserAvatar = () => {
    if (esShelter) return user?.logo_url || user?.avatar_url || null;
    return user?.avatar_url || user?.logo_url || null;
  };

  // Get a consistent color based on user name for the avatar
  const getAvatarColor = () => {
    const colors = [
      "from-rose-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-violet-500 to-purple-600",
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-cyan-500 to-blue-600",
    ];
    if (!user?.name) return colors[0];
    // Para refugios usar tonos verdes/teal
    if (esShelter) {
      return "from-rose-500 to-amber-600";
    }
    const index = user.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const scrollToSection = (sectionId) => {
    setActiveNavSection(sectionId);
    setIsOpen(false);
    setShowUserMenu(false);
    if (location.pathname === "/") {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  const scrollToTop = () => {
    setActiveNavSection("inicio");
    setIsOpen(false);
    setShowUserMenu(false);
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate("/");
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setIsOpen(false);
    navigate("/");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Navegación dinámica por secciones (SOLO vista pública sin sesión) ───
  // Cuando el usuario NO está autenticado y está en la portada ("/"), se detecta
  // qué sección de la página es visible durante el scroll y se marca
  // automáticamente como activa en el navbar (Animales, Refugios, Tienda,
  // Foro). Para usuarios autenticados el comportamiento permanece exactamente
  // igual al actual.
  useEffect(() => {
    // Esta lógica se aplica únicamente en la vista pública (sin sesión) sobre
    // la página de inicio. En el resto de casos (usuario autenticado u otras
    // rutas) no se configura ninguna detección dinámica por scroll.
    if (isAuthenticated || location.pathname !== "/") {
      return;
    }

    // Las secciones de la portada que tienen una opción equivalente en el navbar.
    const sectionIds = ["animals", "shelters", "store", "forum"];

    // Línea de detección: justo debajo del navbar fijo (h-16 = 64px) con un
    // pequeño margen para que la sección quede visible y no tapada por él.
    const NAVBAR_OFFSET = 100;

    // Scroll-spy clásico: se recorre el documento y la sección activa es la
    // última cuyo borde superior ya cruzó la línea de detección. Esto funciona
    // aunque las secciones estén envueltas en AnimatedSection (opacidad 0) o
    // tengan alturas muy distintas, y responde tanto al bajar como al subir.
    const detectActiveSection = () => {
      let current = "inicio";
      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        // Mientras la sección esté por encima (o sobre) la línea de detección,
        // es candidata a ser la visible; la última en cruzar gana.
        if (rect.top <= NAVBAR_OFFSET) {
          current = id;
        } else {
          break;
        }
      }
      setActiveNavSection((prev) => (prev === current ? prev : current));
    };

    detectActiveSection();
    window.addEventListener("scroll", detectActiveSection, { passive: true });
    window.addEventListener("resize", detectActiveSection);

    // Limpieza: se eliminan los listeners al cambiar la ruta, la sesión o al
    // desmontar el componente (sin duplicados).
    return () => {
      window.removeEventListener("scroll", detectActiveSection);
      window.removeEventListener("resize", detectActiveSection);
    };
  }, [isAuthenticated, location.pathname]);

  // Active style classes - light mode (naranja para usuarios normales / no autenticados)
  const activeLinkClass = "text-orange-600 font-semibold bg-orange-50/80";
  const inactiveLinkClass = "text-gray-600 hover:text-orange-600 hover:bg-orange-50/50";
  const activeMobileClass = "bg-orange-50 text-orange-600";
  const inactiveMobileClass = "text-gray-700 hover:bg-gray-50 hover:text-orange-600";

  // Dark mode active style classes (naranja para usuarios normales / no autenticados)
  const darkActiveLinkClass = "text-orange-400 font-semibold border border-orange-500/70";
  const darkInactiveLinkClass = "text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 border border-transparent";
  const darkActiveMobileClass = "text-orange-400 font-semibold border border-orange-500/70";
  const darkInactiveMobileClass = "text-gray-300 hover:text-orange-400 hover:bg-orange-500/10 border border-transparent";

  // Para refugios usar azul como el logo
  const shelterActiveClass = "text-blue-600 font-semibold bg-blue-50/80";
  const shelterInactiveClass = "text-gray-600 hover:text-blue-600 hover:bg-blue-50/50";
  const shelterActiveMobileClass = "bg-blue-50 text-blue-600";
  const shelterInactiveMobileClass = "text-gray-700 hover:bg-gray-50 hover:text-blue-600";
  const darkShelterActiveClass = "text-blue-400 font-semibold border border-blue-500/70";
  const darkShelterInactiveClass = "text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent";

  // Determinar qué estilos usar según el rol
  const getLinkClasses = (isActivePath) => {
    if (esShelter) {
      if (isDark) {
        return isActivePath ? darkShelterActiveClass : darkShelterInactiveClass;
      }
      return isActivePath ? shelterActiveClass : shelterInactiveClass;
    }
    if (isDark) {
      return isActivePath ? darkActiveLinkClass : darkInactiveLinkClass;
    }
    return isActivePath ? activeLinkClass : inactiveLinkClass;
  };

  const getMobileClasses = (isActivePath) => {
    if (esShelter) {
      if (isDark) {
        return isActivePath ? darkShelterActiveClass : darkShelterInactiveClass;
      }
      return isActivePath ? shelterActiveMobileClass : shelterInactiveMobileClass;
    }
    if (isDark) {
      return isActivePath ? darkActiveMobileClass : darkInactiveMobileClass;
    }
    return isActivePath ? activeMobileClass : inactiveMobileClass;
  };

  return (
    <nav className={`main-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isDark
        ? "bg-[#16181D] border-b border-white/5 shadow-lg shadow-black/20"
        : "bg-white/70 backdrop-blur-md border-b border-gray-100 shadow-sm"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src={logo}
              alt="Adoptify Logo"
              className="h-16 w-auto transition-transform group-hover:scale-120"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {isAuthenticated ? (
              <>
                {esShelter ? (
                  /* === NAVEGACIÓN PARA REFUGIO === */
                  <>
                    <Link
                      to="/refugio/dashboard"
                      className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/refugio/dashboard"))}`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Inicio
                    </Link>
                    {tienePermisoRefugio("mascotas") && (
                      <Link
                        to="/refugio/mascotas"
                        className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/refugio/mascotas"))}`}
                      >
                        <PawPrint className="w-4 h-4" />
                        Mascotas
                      </Link>
                    )}
                    {tienePermisoRefugio("solicitudes") && (
                      <Link
                        to="/refugio/solicitudes"
                        className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/refugio/solicitudes"))}`}
                      >
                        <ClipboardList className="w-4 h-4" />
                        Solicitudes
                      </Link>
                    )}
                    {isStoreEnabled && tienePermisoRefugio("marketplace") && (
                      <Link
                        to="/refugio/tienda"
                        className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/refugio/tienda"))}`}
                      >
                        <Store className="w-4 h-4" />
                        Mi tienda
                      </Link>
                    )}
                    {isStoreEnabled && tienePermisoRefugio("pedidos") && (
                      <Link
                        to="/refugio/pedidos"
                        className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/refugio/pedidos") || isActive("/refugio/pedidos/"))}`}
                      >
                        <PackageSearch className="w-4 h-4" />
                        Pedidos
                      </Link>
                    )}
                    {tienePermisoRefugio("foro") && (
                      <Link
                        to="/refugio/foro"
                        className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/refugio/foro"))}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Foro
                      </Link>
                    )}
                  </>
                ) : (
                  /* === NAVEGACIÓN PARA USUARIO NORMAL === */
                  <>
                    <Link
                      to="/dashboard"
                      className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isInicioActive())}`}
                    >
                      <HomeIcon className="w-4 h-4" />
                      {t("nav.inicio")}
                    </Link>
                    <Link
                      to="/animals"
                      className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/animals"))}`}
                    >
                      <PawPrint className="w-4 h-4" />
                      {t("nav.animales")}
                    </Link>
                    <Link
                      to="/shelters"
                      className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/shelters"))}`}
                    >
                      <HomeIcon className="w-4 h-4" />
                      {t("nav.refugios")}
                    </Link>
                    <Link
                      to="/store"
                      className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/store"))}`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {t("nav.tienda")}
                    </Link>
                    <Link
                      to="/forum"
                      className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl ${getLinkClasses(isActive("/forum"))}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {t("nav.foro")}
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={scrollToTop}
                  className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer ${
                    isDark
                      ? (activeNavSection === "inicio" ? darkActiveLinkClass : darkInactiveLinkClass)
                      : (activeNavSection === "inicio" ? activeLinkClass : inactiveLinkClass)
                  }`}
                >
                  <HomeIcon className="w-4 h-4" />
                  {t("nav.inicio")}
                </button>
                <button
                  onClick={() => scrollToSection("animals")}
                  className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer ${
                    isDark
                      ? (activeNavSection === "animals" ? darkActiveLinkClass : darkInactiveLinkClass)
                      : (activeNavSection === "animals" ? activeLinkClass : inactiveLinkClass)
                  }`}
                >
                  <PawPrint className="w-4 h-4" />
                  {t("nav.animales")}
                </button>
                <button
                  onClick={() => scrollToSection("shelters")}
                  className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer ${
                    isDark
                      ? (activeNavSection === "shelters" ? darkActiveLinkClass : darkInactiveLinkClass)
                      : (activeNavSection === "shelters" ? activeLinkClass : inactiveLinkClass)
                  }`}
                >
                  <HomeIcon className="w-4 h-4" />
                  {t("nav.refugios")}
                </button>
                <button
                  onClick={() => scrollToSection("store")}
                  className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer ${
                    isDark
                      ? (activeNavSection === "store" ? darkActiveLinkClass : darkInactiveLinkClass)
                      : (activeNavSection === "store" ? activeLinkClass : inactiveLinkClass)
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {t("nav.tienda")}
                </button>
                <button
                  onClick={() => scrollToSection("forum")}
                  className={`nav-link text-sm font-medium transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer ${
                    isDark
                      ? (activeNavSection === "forum" ? darkActiveLinkClass : darkInactiveLinkClass)
                      : (activeNavSection === "forum" ? activeLinkClass : inactiveLinkClass)
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t("nav.foro")}
                </button>
              </>
            )}
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Notifications - both shelter and user */}
                <div className="relative">
                  <NotificationPanel />
                </div>

                {/* Cart - Solo para usuarios normales */}
                {!esShelter && (
                  <Link to="/cart" className={`relative p-2 rounded-xl transition-colors ${
                    isDark
                      ? "text-gray-300 hover:text-orange-400 hover:bg-white/5"
                      : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                  }`}>
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* User Menu */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                      isDark
                        ? "bg-[#252628] text-white hover:bg-[#2f3033] shadow-none"
                        : esShelter
                          ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-200/50"
                          : "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-200/50"
                    }`}
                  >
                    {/* User Avatar (foto real o iniciales) */}
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor()} flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden`}>
                      {getUserAvatar() ? (
                        <img src={getUserAvatar()} alt={user?.name || "avatar"} className="w-full h-full object-cover" />
                      ) : (
                        getUserInitials()
                      )}
                    </div>
                    <span className="font-medium text-sm max-w-[100px] truncate">{user?.name || t("nav.mi_cuenta")}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserMenu && (
                    <div className={`absolute right-0 mt-2 w-64 py-2 z-50 ${
                      isDark
                        ? "bg-[#1F2025] rounded-[20px] shadow-xl shadow-black/30 border border-white/5 animate-scale-in"
                        : "bg-white rounded-2xl shadow-xl border border-gray-100"
                    }`}>
                      <div className={`px-4 py-3 border-b rounded-t-[20px] ${
                        isDark ? "border-white/5 bg-[#252628]" : "border-gray-100"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor()} flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden`}>
                            {getUserAvatar() ? (
                              <img src={getUserAvatar()} alt={user?.name || "avatar"} className="w-full h-full object-cover" />
                            ) : (
                              getUserInitials()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-semibold truncate ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}>{user?.name || "Usuario"}</p>
                            <p className={`text-sm truncate ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}>{user?.email || ""}</p>
                            {esShelter && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full text-xs font-medium">
                                <Building2 className="w-3 h-3" />
                                {esEmpleadoRefugio ? "Empleado" : "Refugio"}
                              </span>
                            )}
                            {esEmpleadoRefugio && user?.shelterName && (
                              <p className={`text-[11px] truncate mt-0.5 ${
                                isDark ? "text-gray-500" : "text-gray-500"
                              }`}>
                                {user.shelterName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {esShelter ? (
                        /* === DROPDOWN PARA REFUGIO === */
                        <>
                          <Link
                            to="/refugio/perfil"
                            onClick={() => setShowUserMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                              isDark
                                ? (isActive("/refugio/perfil")
                                  ? "text-rose-400 font-semibold bg-gradient-to-r from-rose-300/15 via-amber-300/15 to-rose-300/15"
                                  : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-rose-300/15 hover:via-amber-300/15 hover:to-rose-300/15")
                                : (isActive("/refugio/perfil")
                                  ? "text-rose-600 font-semibold bg-rose-50"
                                  : "text-gray-700 hover:bg-rose-50")
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                            <span>Mi Perfil</span>
                          </Link>
                          {tienePermisoRefugio("adopciones") && (
                            <Link
                              to="/refugio/historial"
                              onClick={() => setShowUserMenu(false)}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                isDark
                                  ? (isActive("/refugio/historial")
                                    ? "text-rose-400 font-semibold bg-gradient-to-r from-rose-300/15 via-amber-300/15 to-rose-300/15"
                                    : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-rose-300/15 hover:via-amber-300/15 hover:to-rose-300/15")
                                  : (isActive("/refugio/historial")
                                    ? "text-rose-600 font-semibold bg-rose-50"
                                    : "text-gray-700 hover:bg-rose-50")
                              }`}
                            >
                              <Heart className="w-4 h-4" />
                              <span>Historial de Solicitudes</span>
                            </Link>
                          )}
                          {tienePermisoRefugio("configuracion") && (
                            <Link
                              to="/refugio/configuracion"
                              onClick={() => setShowUserMenu(false)}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                isDark
                                  ? (isActive("/refugio/configuracion")
                                    ? "text-rose-400 font-semibold bg-gradient-to-r from-rose-300/15 via-amber-300/15 to-rose-300/15"
                                    : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-rose-300/15 hover:via-amber-300/15 hover:to-rose-300/15")
                                  : (isActive("/refugio/configuracion")
                                    ? "text-rose-600 font-semibold bg-rose-50"
                                    : "text-gray-700 hover:bg-rose-50")
                              }`}
                            >
                              <Settings className="w-4 h-4" />
                              <span>Configuración</span>
                            </Link>
                          )}
                          {tienePermisoRefugio("administrar_empleados") && (
                            <Link
                              to="/refugio/equipo"
                              onClick={() => setShowUserMenu(false)}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                isDark
                                  ? (isActive("/refugio/equipo")
                                    ? "text-rose-400 font-semibold bg-gradient-to-r from-rose-300/15 via-amber-300/15 to-rose-300/15"
                                    : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-rose-300/15 hover:via-amber-300/15 hover:to-rose-300/15")
                                  : (isActive("/refugio/equipo")
                                    ? "text-rose-600 font-semibold bg-rose-50"
                                    : "text-gray-700 hover:bg-rose-50")
                              }`}
                            >
                              <Users className="w-4 h-4" />
                              <span>Equipo del refugio</span>
                            </Link>
                          )}
                        </>
                      ) : (
                        /* === DROPDOWN PARA USUARIO NORMAL === */
                        <>
                          <Link
                            to="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                              isDark
                                ? (isActive("/profile")
                                  ? "text-orange-400 font-semibold bg-gradient-to-r from-orange-300/15 via-yellow-300/15 to-pink-300/15"
                                  : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-300/15 hover:via-yellow-300/15 hover:to-pink-300/15")
                                : (isActive("/profile")
                                  ? "text-rose-600 font-semibold bg-rose-50"
                                  : "text-gray-700 hover:bg-rose-50")
                            }`}
                          >
                            <User className="w-4 h-4" />
                            <span>{t("nav.mi_perfil")}</span>
                          </Link>
                          <Link
                            to="/adoption-history"
                            onClick={() => setShowUserMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                              isDark
                                ? (isActive("/adoption-history")
                                  ? "text-orange-400 font-semibold bg-gradient-to-r from-orange-300/15 via-yellow-300/15 to-pink-300/15"
                                  : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-300/15 hover:via-yellow-300/15 hover:to-pink-300/15")
                                : (isActive("/adoption-history")
                                  ? "text-rose-600 font-semibold bg-rose-50"
                                  : "text-gray-700 hover:bg-rose-50")
                            }`}
                          >
                            <PawPrint className="w-4 h-4" />
                            <span>{t("nav.historial_adopciones")}</span>
                          </Link>
                          <Link
                            to="/favorites"
                            onClick={() => setShowUserMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                              isDark
                                ? (isActive("/favorites")
                                  ? "text-orange-400 font-semibold bg-gradient-to-r from-orange-300/15 via-yellow-300/15 to-pink-300/15"
                                  : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-300/15 hover:via-yellow-300/15 hover:to-pink-300/15")
                                : (isActive("/favorites")
                                  ? "text-rose-600 font-semibold bg-rose-50"
                                  : "text-gray-700 hover:bg-rose-50")
                            }`}
                          >
                            <Heart className="w-4 h-4" />
                            <span>{t("nav.mis_favoritos")}</span>
                          </Link>
                          <Link
                            to="/mis-pedidos"
                            onClick={() => setShowUserMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                              isDark
                                ? (location.pathname.startsWith("/mis-pedidos")
                                  ? "text-orange-400 font-semibold bg-gradient-to-r from-orange-300/15 via-yellow-300/15 to-pink-300/15"
                                  : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-300/15 hover:via-yellow-300/15 hover:to-pink-300/15")
                                : (location.pathname.startsWith("/mis-pedidos")
                                  ? "text-rose-600 font-semibold bg-rose-50"
                                  : "text-gray-700 hover:bg-rose-50")
                            }`}
                          >
                            <PackageSearch className="w-4 h-4" />
                            <span>Mis Pedidos</span>
                          </Link>
                          <Link
                            to="/notificaciones"
                            onClick={() => setShowUserMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                              isDark
                                ? (isActive("/notificaciones")
                                  ? "text-orange-400 font-semibold bg-gradient-to-r from-orange-300/15 via-yellow-300/15 to-pink-300/15"
                                  : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-300/15 hover:via-yellow-300/15 hover:to-pink-300/15")
                                : (isActive("/notificaciones")
                                  ? "text-rose-600 font-semibold bg-rose-50"
                                  : "text-gray-700 hover:bg-rose-50")
                            }`}
                          >
                            <Bell className="w-4 h-4" />
                            <span>Notificaciones</span>
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setShowUserMenu(false)}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                              isDark
                                ? (isActive("/settings")
                                  ? "text-orange-400 font-semibold bg-gradient-to-r from-orange-300/15 via-yellow-300/15 to-pink-300/15"
                                  : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-300/15 hover:via-yellow-300/15 hover:to-pink-300/15")
                                : (isActive("/settings")
                                  ? "text-rose-600 font-semibold bg-rose-50"
                                  : "text-gray-700 hover:bg-rose-50")
                            }`}
                          >
                            <Settings className="w-4 h-4" />
                            <span>{t("nav.configuracion")}</span>
                          </Link>
                        </>
                      )}

                      {/* Theme Toggle in Dropdown */}
                      <div className={`border-t mt-2 pt-2 ${
                        isDark ? "border-white/5" : "border-gray-100"
                      }`}>
                        <div className="px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {theme === "dark" ? (
                              <Moon className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                            ) : (
                              <Sun className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                            )}
                            <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{t("settings.theme")}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setTheme("light")}
                              className={`p-1.5 rounded-lg transition-all ${
                                theme === "light"
                                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                                  : isDark
                                    ? "text-gray-500 hover:text-white hover:bg-white/10"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              }`}
                              title="Claro"
                            >
                              <Sun className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setTheme("dark")}
                              className={`p-1.5 rounded-lg transition-all ${
                                theme === "dark"
                                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                                  : isDark
                                    ? "text-gray-500 hover:text-white hover:bg-white/10"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              }`}
                              title="Oscuro"
                            >
                              <Moon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={`border-t pt-2 ${
                        isDark ? "border-white/5" : "border-gray-100"
                      }`}>
                        <button
                          onClick={handleLogout}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${
                            isDark
                              ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              : "text-red-600 hover:bg-red-50"
                          }`}
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t("nav.cerrar_sesion")}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    isDark
                      ? (isActive("/login") ? "text-blue-400 font-semibold" : "text-gray-300 hover:text-blue-400")
                      : (isActive("/login") ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600")
                  }`}
                >
                  {t("nav.iniciar_sesion")}
                </Link>
                <Link
                  to="/register"
                  className={`relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-white rounded-xl group transition-all duration-300 ${
                    isDark
                      ? "bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20"
                      : "bg-gradient-to-br from-rose-500 to-amber-500 group-hover:from-rose-500 group-hover:to-amber-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-rose-200 shadow-md shadow-rose-100"
                  }`}
                >
                  <span className="relative px-5 py-1.5 transition-all ease-in duration-75 bg-transparent rounded-xl flex items-center gap-1.5 font-semibold">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    {t("nav.registrarse")}
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
                isDark
                  ? "text-gray-300 hover:text-blue-400 hover:bg-white/5 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              }`}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
          isDark
            ? "bg-[#16181D] border-b border-white/5"
            : "bg-white border-b border-gray-100"
        } ${
          isOpen ? "max-h-[calc(100vh-4rem)] opacity-100 py-3" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 space-y-1">
          {isAuthenticated ? (
            <>
              {/* User info header in mobile */}
              <div className={`flex items-center gap-3 px-3 py-3 mb-2 border-b ${
                isDark ? "border-white/5" : "border-gray-100"
              }`}>
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor()} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {getUserInitials()}
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>{user?.name || "Usuario"}</p>
                  <p className={`text-xs truncate ${isDark ? "text-gray-400" : "text-gray-600"}`}>{user?.email || ""}</p>
                </div>
              </div>

              {esShelter ? (
                /* === MOBILE NAV PARA REFUGIO === */
                <>
                  <Link to="/refugio/dashboard" onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/refugio/dashboard"))}`}>
                    <LayoutDashboard className="w-4 h-4" />
                    Inicio
                  </Link>
                  {tienePermisoRefugio("mascotas") && (
                    <Link to="/refugio/mascotas" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/refugio/mascotas"))}`}>
                      <PawPrint className="w-4 h-4" />
                      Mascotas
                    </Link>
                  )}
                  {tienePermisoRefugio("solicitudes") && (
                    <Link to="/refugio/solicitudes" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/refugio/solicitudes"))}`}>
                      <ClipboardList className="w-4 h-4" />
                      Solicitudes
                    </Link>
                  )}
                  {isStoreEnabled && tienePermisoRefugio("marketplace") && (
                    <Link to="/refugio/tienda" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/refugio/tienda"))}`}>
                      <Store className="w-4 h-4" />
                      Mi tienda
                    </Link>
                  )}
                  {isStoreEnabled && tienePermisoRefugio("pedidos") && (
                    <Link to="/refugio/pedidos" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/refugio/pedidos") || isActive("/refugio/pedidos/"))}`}>
                      <PackageSearch className="w-4 h-4" />
                      Pedidos
                    </Link>
                  )}
                  {tienePermisoRefugio("foro") && (
                    <Link to="/refugio/foro" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/refugio/foro"))}`}>
                      <MessageSquare className="w-4 h-4" />
                      Foro
                    </Link>
                  )}
                  <div className={`pt-4 pb-2 border-t flex flex-col gap-2 ${isDark ? "border-white/5" : "border-gray-100"}`}>
                    <Link to="/refugio/perfil" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(isActive("/refugio/perfil"))}`}>
                      <Building2 className="w-4 h-4" />
                      Mi Perfil
                    </Link>
                    {tienePermisoRefugio("adopciones") && (
                      <Link to="/refugio/historial" onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(isActive("/refugio/historial"))}`}>
                        <Heart className="w-4 h-4" />
                        Historial de Solicitudes
                      </Link>
                    )}
                    {tienePermisoRefugio("administrar_empleados") && (
                      <Link to="/refugio/equipo" onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(isActive("/refugio/equipo"))}`}>
                        <Users className="w-4 h-4" />
                        Equipo del refugio
                      </Link>
                    )}

                    {/* Theme Toggle */}
                    <div className={`flex items-center justify-between px-3 py-2 border-t mt-2 pt-3 ${isDark ? "border-white/5" : "border-gray-100"}`}>
                      <div className="flex items-center gap-3">
                        {theme === "dark" ? <Moon className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} /> : <Sun className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />}
                        <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{t("settings.theme")}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setTheme("light")}
                          className={`p-1.5 rounded-lg transition-all ${theme === "light" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white" : isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                          <Sun className="w-4 h-4" />
                        </button>
                        <button onClick={() => setTheme("dark")}
                          className={`p-1.5 rounded-lg transition-all ${theme === "dark" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white" : isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                          <Moon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <button onClick={() => { logout(); setIsOpen(false); navigate("/"); }}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg w-full ${isDark ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}>
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              ) : (
                /* === MOBILE NAV PARA USUARIO NORMAL === */
                <>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isInicioActive())}`}>
                    <HomeIcon className="w-4 h-4" />
                    {t("nav.inicio")}
                  </Link>
                  <Link to="/animals" onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/animals"))}`}>
                    <PawPrint className="w-4 h-4" />
                    {t("nav.animales")}
                  </Link>
                  <Link to="/shelters" onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/shelters"))}`}>
                    <HomeIcon className="w-4 h-4" />
                    {t("nav.refugios")}
                  </Link>
                  <Link to="/store" onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/store"))}`}>
                    <ShoppingBag className="w-4 h-4" />
                    {t("nav.tienda")}
                  </Link>
                  <Link to="/forum" onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${getMobileClasses(isActive("/forum"))}`}>
                    <MessageSquare className="w-4 h-4" />
                    {t("nav.foro")}
                  </Link>
                  <div className={`pt-4 pb-2 border-t flex flex-col gap-2 ${isDark ? "border-white/5" : "border-gray-100"}`}>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <button className={`relative p-2 rounded-xl transition-colors ${isDark ? "text-gray-300 hover:text-orange-400 hover:bg-white/5" : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"}`}>
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                      </button>
                      <Link to="/cart" onClick={() => setIsOpen(false)} className={`relative p-2 rounded-xl transition-colors ${isDark ? "text-gray-300 hover:text-orange-400 hover:bg-white/5" : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"}`}>
                        <ShoppingCart className="w-5 h-5" />
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>
                        )}
                      </Link>
                    </div>
                    <Link to="/profile" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(isActive("/profile"))}`}>
                      <User className="w-4 h-4" />
                      {t("nav.mi_perfil")}
                    </Link>
                    <Link to="/adoption-history" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(isActive("/adoption-history"))}`}>
                      <PawPrint className="w-4 h-4" />
                      {t("nav.historial_adopciones")}
                    </Link>
                    <Link to="/favorites" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(isActive("/favorites"))}`}>
                      <Heart className="w-4 h-4" />
                      {t("nav.mis_favoritos")}
                    </Link>
                    <Link to="/mis-pedidos" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(location.pathname.startsWith("/mis-pedidos"))}`}>
                      <PackageSearch className="w-4 h-4" />
                      Mis Pedidos
                    </Link>
                    <Link to="/notificaciones" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(isActive("/notificaciones"))}`}>
                      <Bell className="w-4 h-4" />
                      Notificaciones
                    </Link>
                    <Link to="/settings" onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg ${getMobileClasses(isActive("/settings"))}`}>
                      <Settings className="w-4 h-4" />
                      {t("nav.configuracion")}
                    </Link>

                    {/* Theme Toggle */}
                    <div className={`flex items-center justify-between px-3 py-2 border-t mt-2 pt-3 ${isDark ? "border-white/5" : "border-gray-100"}`}>
                      <div className="flex items-center gap-3">
                        {theme === "dark" ? <Moon className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} /> : <Sun className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />}
                        <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{t("settings.theme")}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setTheme("light")}
                          className={`p-1.5 rounded-lg transition-all ${theme === "light" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white" : isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                          <Sun className="w-4 h-4" />
                        </button>
                        <button onClick={() => setTheme("dark")}
                          className={`p-1.5 rounded-lg transition-all ${theme === "dark" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white" : isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                          <Moon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <button onClick={() => { logout(); setIsOpen(false); navigate("/"); }}
                      className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-lg w-full ${isDark ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}>
                      <LogOut className="w-4 h-4" />
                      {t("nav.cerrar_sesion")}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <button onClick={scrollToTop}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium w-full text-left cursor-pointer ${isDark ? (activeNavSection === "inicio" ? darkActiveMobileClass : darkInactiveMobileClass) : (activeNavSection === "inicio" ? activeMobileClass : inactiveMobileClass)}`}>
                <HomeIcon className="w-4 h-4" />
                {t("nav.inicio")}
              </button>
              <button onClick={() => scrollToSection("animals")}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium w-full text-left cursor-pointer ${isDark ? (activeNavSection === "animals" ? darkActiveMobileClass : darkInactiveMobileClass) : (activeNavSection === "animals" ? activeMobileClass : inactiveMobileClass)}`}>
                <PawPrint className="w-4 h-4" />
                {t("nav.animales")}
              </button>
              <button onClick={() => scrollToSection("shelters")}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium w-full text-left cursor-pointer ${isDark ? (activeNavSection === "shelters" ? darkActiveMobileClass : darkInactiveMobileClass) : (activeNavSection === "shelters" ? activeMobileClass : inactiveMobileClass)}`}>
                <HomeIcon className="w-4 h-4" />
                {t("nav.refugios")}
              </button>
              <button onClick={() => scrollToSection("store")}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium w-full text-left cursor-pointer ${isDark ? (activeNavSection === "store" ? darkActiveMobileClass : darkInactiveMobileClass) : (activeNavSection === "store" ? activeMobileClass : inactiveMobileClass)}`}>
                <ShoppingBag className="w-4 h-4" />
                {t("nav.tienda")}
              </button>
              <button onClick={() => scrollToSection("forum")}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium w-full text-left cursor-pointer ${isDark ? (activeNavSection === "forum" ? darkActiveMobileClass : darkInactiveMobileClass) : (activeNavSection === "forum" ? activeMobileClass : inactiveMobileClass)}`}>
                <MessageSquare className="w-4 h-4" />
                {t("nav.foro")}
              </button>
              <div className={`pt-4 pb-2 border-t flex flex-col gap-2 ${isDark ? "border-white/5" : "border-gray-100"}`}>
                <Link to="/login" onClick={() => setIsOpen(false)}
                  className={`text-center px-4 py-2 text-base font-medium rounded-lg ${isDark ? "text-gray-300 hover:text-blue-400 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"}`}>
                  {t("nav.iniciar_sesion")}
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)}
                  className={`text-center px-4 py-2 text-base font-medium text-white rounded-lg shadow-sm ${isDark ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600" : "bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600"}`}>
                  {t("nav.registrarse")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
