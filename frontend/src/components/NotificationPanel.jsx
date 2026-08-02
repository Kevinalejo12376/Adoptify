import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  listarNotificaciones, contarNoLeidas,
  marcarLeida, marcarTodasLeidas
} from "../api/notificaciones";
import {
  Bell, Heart, MessageSquare, ShoppingBag, AlertCircle,
  CheckCircle2, Clock, X, Info, Shield,
  CheckCheck, ChevronRight, ExternalLink, Loader2
} from "lucide-react";

const CATEGORY_ICONS = {
  marketplace: ShoppingBag,
  adopciones: Heart,
  sistema: Shield,
  comunidad: MessageSquare,
};

function getRelativeTime(iso) {
  if (!iso) return "";
  try {
    const now = new Date();
    const d = new Date(iso);
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHour < 24) return `Hace ${diffHour} h`;
    if (diffDay < 7) return `Hace ${diffDay} d`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export default function NotificationPanel() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [data, countData] = await Promise.all([
        listarNotificaciones(),
        contarNoLeidas(),
      ]);
      setNotifications((data || []).slice(0, 5));
      setUnreadCount(countData?.count || 0);
    } catch {
      // Silently fail - the panel should still work
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al abrir
  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen, cargarDatos]);

  // Cargar al montar para tener el contador
  useEffect(() => {
    contarNoLeidas()
      .then((data) => setUnreadCount(data?.count || 0))
      .catch(() => {});
  }, []);

  // Polling cada 30s para actualizar contador
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await contarNoLeidas();
        setUnreadCount(data?.count || 0);
      } catch {
        // silent
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

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

  const handleNotificationClick = async (notif) => {
    if (!notif.leida) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.enlace) {
      navigate(notif.enlace);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate("/notificaciones");
  };

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          isDark
            ? "text-gray-300 hover:text-rose-400 hover:bg-white/5"
            : "text-gray-600 hover:text-rose-600 hover:bg-rose-50"
        } ${isOpen ? (isDark ? "bg-white/5 text-rose-400" : "bg-rose-50 text-rose-600") : ""}`}
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold rounded-full px-1 shadow-lg shadow-rose-500/30 animate-scale-in">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden animate-modal-overlay"
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={panelRef}
            className={`
              fixed md:absolute top-0 md:top-full right-0 md:right-0 z-50
              w-full md:w-[400px] h-full md:h-auto md:mt-2
              flex flex-col
              ${isDark
                ? "bg-[#16181D] border border-white/5 shadow-2xl shadow-black/40"
                : "bg-white border border-gray-100 shadow-2xl shadow-black/10"
              }
              md:rounded-2xl md:animate-scale-in
              animate-slide-in-right
            `}
            style={{ transformOrigin: "top right" }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
              isDark ? "border-white/5" : "border-gray-100"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? "bg-rose-500/10" : "bg-rose-50"
                }`}>
                  <Bell className={`w-5 h-5 ${isDark ? "text-rose-400" : "text-rose-600"}`} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"} font-display`}>
                    Notificaciones
                  </h3>
                  {unreadCount > 0 && (
                    <p className={`text-xs ${isDark ? "text-rose-400" : "text-rose-600"} font-medium`}>
                      {unreadCount} {unreadCount === 1 ? "sin leer" : "sin leer"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${
                      isDark
                        ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                        : "text-rose-600 bg-rose-50 hover:bg-rose-100"
                    }`}
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto overscroll-contain max-h-[360px]" style={{ scrollbarWidth: "thin", scrollbarColor: isDark ? "#2a2a3a transparent" : "#e5e7eb transparent" }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-rose-400" : "text-rose-500"}`} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                    isDark ? "bg-gray-800/50" : "bg-gray-50"
                  }`}>
                    <Bell className={`w-7 h-7 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                  </div>
                  <p className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"} mb-1`}>
                    No hay notificaciones
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    Las notificaciones aparecerán aquí cuando tengas actividad
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notification, index) => {
                    const Icon = CATEGORY_ICONS[notification.categoria] || Bell;
                    const isUnread = !notification.leida;
                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`
                          flex items-start gap-3.5 px-5 py-4 transition-all duration-200 group cursor-pointer
                          ${isUnread
                            ? isDark
                              ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.07]"
                              : "bg-rose-50/40 hover:bg-rose-50"
                            : isDark
                              ? "hover:bg-white/[0.02]"
                              : "hover:bg-gray-50"
                          }
                          ${index !== notifications.length - 1
                            ? isDark ? "border-b border-white/[0.03]" : "border-b border-gray-50"
                            : ""
                          }
                          animate-fade-in-up
                        `}
                        style={{ animationDelay: `${index * 0.03}s` }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") handleNotificationClick(notification); }}
                      >
                        {/* Unread indicator dot */}
                        {isUnread && (
                          <div className="absolute left-[14px] top-[22px] w-2 h-2 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 shadow-sm shadow-rose-500/30" />
                        )}

                        {/* Icon */}
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                          transition-transform group-hover:scale-110
                          ${isUnread ? "ring-2 ring-rose-500/20" : ""}
                          ${isDark
                            ? `bg-${notification.categoria === "marketplace" ? "rose" : notification.categoria === "adopciones" ? "pink" : notification.categoria === "sistema" ? "violet" : "blue"}-500/10 text-${notification.categoria === "marketplace" ? "rose" : notification.categoria === "adopciones" ? "pink" : notification.categoria === "sistema" ? "violet" : "blue"}-400`
                            : `bg-${notification.categoria === "marketplace" ? "rose" : notification.categoria === "adopciones" ? "pink" : notification.categoria === "sistema" ? "violet" : "blue"}-50 text-${notification.categoria === "marketplace" ? "rose" : notification.categoria === "adopciones" ? "pink" : notification.categoria === "sistema" ? "violet" : "blue"}-600`
                          }
                        `}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`
                            text-sm leading-snug line-clamp-1
                            ${isUnread
                              ? isDark ? "text-white font-semibold" : "text-gray-900 font-semibold"
                              : isDark ? "text-gray-300" : "text-gray-700"
                            }
                          `}>
                            {notification.titulo || "Notificación"}
                          </p>
                          <p className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${
                            isDark ? "text-gray-500" : "text-gray-500"
                          }`}>
                            {notification.mensaje}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Clock className={`w-3 h-3 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
                            <span className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"} font-medium`}>
                              {getRelativeTime(notification.creado_en)}
                            </span>
                          </div>
                        </div>

                        {/* Action icon */}
                        <div className={`
                          w-6 h-6 rounded-lg flex items-center justify-center shrink-0
                          opacity-0 group-hover:opacity-100 transition-all
                          ${isDark ? "text-gray-600 group-hover:text-gray-400" : "text-gray-300 group-hover:text-gray-500"}
                        `}>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className={`px-5 py-3 border-t shrink-0 ${
                isDark ? "border-white/5" : "border-gray-100"
              }`}>
                <button
                  onClick={handleViewAll}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                    isDark
                      ? "text-rose-400 bg-rose-500/5 hover:bg-rose-500/10"
                      : "text-rose-600 bg-rose-50 hover:bg-rose-100"
                  }`}
                >
                  <span>Ver todas las notificaciones</span>
                  <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
