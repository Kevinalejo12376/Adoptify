import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  listarNotificaciones, contarNoLeidas,
  marcarLeida, marcarTodasLeidas, eliminarNotificacion
} from "../../api/notificaciones";
import {
  Bell, Heart, MessageSquare, PawPrint, ShoppingBag, AlertCircle,
  CheckCircle2, Clock, X, Info, Store, User, Shield,
  Search, Filter, Loader2, RefreshCw, Trash2,
  CheckCheck, ChevronRight, PackageSearch, ExternalLink,
  Megaphone, Building2, Users
} from "lucide-react";

const CATEGORY_ICONS = {
  marketplace: ShoppingBag,
  adopciones: Heart,
  sistema: Shield,
  comunidad: MessageSquare,
  refugios: Building2,
};

const CATEGORY_COLORS = {
  marketplace: { light: "text-rose-600 bg-rose-50", dark: "text-rose-400 bg-rose-500/10" },
  adopciones: { light: "text-pink-600 bg-pink-50", dark: "text-pink-400 bg-pink-500/10" },
  sistema: { light: "text-violet-600 bg-violet-50", dark: "text-violet-400 bg-violet-500/10" },
  comunidad: { light: "text-blue-600 bg-blue-50", dark: "text-blue-400 bg-blue-500/10" },
  refugios: { light: "text-emerald-600 bg-emerald-50", dark: "text-emerald-400 bg-emerald-500/10" },
};

const CATEGORIES = [
  { value: "todas", label: "Todas", icon: Bell },
  { value: "no_leidas", label: "No leídas", icon: AlertCircle },
  { value: "marketplace", label: "Marketplace", icon: ShoppingBag },
  { value: "adopciones", label: "Adopciones", icon: Heart },
  { value: "sistema", label: "Sistema", icon: Shield },
  { value: "comunidad", label: "Comunidad", icon: MessageSquare },
];

function formatFechaRelativa(iso) {
  if (!iso) return "";
  try {
    const now = new Date();
    const d = new Date(iso);
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHour < 24) return `Hace ${diffHour} h`;
    if (diffDay < 7) return `Hace ${diffDay} d`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function formatFechaCompleta(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function UserNotifications() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("todas");
  const [searchTerm, setSearchTerm] = useState("");

  const cargarNotificaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, countData] = await Promise.all([
        listarNotificaciones(),
        contarNoLeidas(),
      ]);
      setNotifications(data || []);
      setUnreadCount(countData?.count || 0);
    } catch (err) {
      setError(err.message || "Error al cargar notificaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  const handleMarkAsRead = async (notifId) => {
    try {
      await marcarLeida(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, leida: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await marcarTodasLeidas();
      setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleDelete = async (notifId) => {
    try {
      await eliminarNotificacion(notifId);
      const deleted = notifications.find((n) => n.id === notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      if (deleted && !deleted.leida) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // silent
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.leida) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.enlace) {
      navigate(notif.enlace);
    }
  };

  // Filtrar notificaciones
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (activeCategory === "no_leidas") {
      result = result.filter((n) => !n.leida);
    } else if (activeCategory !== "todas") {
      result = result.filter((n) => n.categoria === activeCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          (n.titulo || "").toLowerCase().includes(term) ||
          (n.mensaje || "").toLowerCase().includes(term)
      );
    }

    return result;
  }, [notifications, activeCategory, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className={`w-12 h-12 animate-spin mb-4 ${
              isDark ? "text-rose-400" : "text-rose-500"
            }`} />
            <p className={`text-lg font-medium ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>
              Cargando notificaciones...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
              isDark ? "bg-red-500/10" : "bg-red-50"
            }`}>
              <AlertCircle className={`w-10 h-10 ${
                isDark ? "text-red-400" : "text-red-500"
              }`} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Error al cargar notificaciones
            </h3>
            <p className={`text-sm mb-6 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}>
              {error}
            </p>
            <button
              onClick={cargarNotificaciones}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDark ? "bg-rose-500/10" : "bg-rose-50"
            }`}>
              <Bell className={`w-6 h-6 ${
                isDark ? "text-rose-400" : "text-rose-600"
              }`} />
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold font-display ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                Notificaciones
              </h1>
              <p className={`text-sm ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}>
                {unreadCount > 0
                  ? `${unreadCount} notificación${unreadCount !== 1 ? "es" : ""} sin leer`
                  : "No tienes notificaciones pendientes"}
              </p>
            </div>
          </div>

          {notifications.length > 0 && unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isDark
                  ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  : "bg-rose-50 text-rose-600 hover:bg-rose-100"
              }`}
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Búsqueda */}
        <div className="relative mb-6">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
            isDark ? "text-gray-500" : "text-gray-400"
          }`} />
          <input
            type="text"
            placeholder="Buscar notificaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-10 py-3 rounded-xl border transition-all duration-200 outline-none ${
              isDark
                ? "bg-dark-card border-dark-border text-dark-text placeholder-gray-500 focus:border-rose-500/50"
                : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-rose-500"
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className={`w-4 h-4 ${
                isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
              }`} />
            </button>
          )}
        </div>

        {/* Categorías */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap
                  transition-all duration-200 border shrink-0
                  ${isActive
                    ? isDark
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      : "bg-rose-50 border-rose-200 text-rose-600"
                    : isDark
                      ? "bg-transparent border-dark-border text-gray-400 hover:border-gray-500 hover:text-gray-300"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Lista */}
        {filteredNotifications.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${
            isDark ? "border-dark-border" : "border-gray-200"
          }`}>
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
              isDark ? "bg-white/5" : "bg-gray-50"
            }`}>
              <Bell className={`w-10 h-10 ${
                isDark ? "text-gray-600" : "text-gray-300"
              }`} />
            </div>
            <h3 className={`text-xl font-bold font-display mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              {activeCategory === "no_leidas"
                ? "No tienes notificaciones sin leer"
                : searchTerm
                  ? "No se encontraron notificaciones"
                  : "No hay notificaciones"}
            </h3>
            <p className={`text-sm text-center max-w-md ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}>
              {activeCategory === "no_leidas"
                ? "Has revisado todas tus notificaciones. ¡Buen trabajo!"
                : searchTerm
                  ? "Intenta con otros términos de búsqueda"
                  : "Las notificaciones aparecerán aquí cuando tengas actividad en la plataforma"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notif, index) => {
              const Icon = CATEGORY_ICONS[notif.categoria] || Bell;
              const colors = CATEGORY_COLORS[notif.categoria] || CATEGORY_COLORS.sistema;

              return (
                <div
                  key={notif.id}
                  className={`
                    rounded-2xl border transition-all duration-200 animate-fade-in-up
                    ${!notif.leida
                      ? isDark
                        ? "bg-rose-500/[0.03] border-rose-500/10 hover:border-rose-500/20"
                        : "bg-rose-50/40 border-rose-100 hover:border-rose-200"
                      : isDark
                        ? "bg-dark-card border-dark-border hover:border-gray-600"
                        : "bg-white border-gray-100 hover:border-gray-200"
                    }
                  `}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Unread dot */}
                    {!notif.leida && (
                      <div className="absolute left-6 top-6 w-2 h-2 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 shadow-sm shadow-rose-500/30" />
                    )}

                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      !notif.leida ? `${colors.light} ring-2 ring-rose-500/20` : colors.light
                    } ${isDark ? colors.dark : colors.light}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${
                            !notif.leida
                              ? isDark ? "text-white" : "text-gray-900"
                              : isDark ? "text-gray-300" : "text-gray-700"
                          }`}>
                            {notif.titulo || "Notificación"}
                          </p>
                          <p className={`text-sm mt-0.5 line-clamp-2 ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}>
                            {notif.mensaje}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <span className={`flex items-center gap-1 text-xs ${
                          isDark ? "text-gray-500" : "text-gray-400"
                        }`}>
                          <Clock className="w-3 h-3" />
                          {formatFechaRelativa(notif.creado_en)}
                        </span>
                        {!notif.leida && (
                          <span className={`text-xs font-medium ${
                            isDark ? "text-rose-400" : "text-rose-600"
                          }`}>
                            Nueva
                          </span>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 mt-3">
                        {notif.enlace && (
                          <button
                            onClick={() => handleNotificationClick(notif)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              isDark
                                ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                                : "text-rose-600 bg-rose-50 hover:bg-rose-100"
                            }`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {notif.tipo?.includes("pedido") ? "Ver pedido" : "Ver más"}
                          </button>
                        )}
                        {!notif.leida && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              isDark
                                ? "text-gray-400 bg-white/5 hover:bg-white/10 hover:text-gray-300"
                                : "text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-800"
                            }`}
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Marcar leída
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                            isDark
                              ? "text-red-400 bg-red-500/10 hover:bg-red-500/20"
                              : "text-red-600 bg-red-50 hover:bg-red-100"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
