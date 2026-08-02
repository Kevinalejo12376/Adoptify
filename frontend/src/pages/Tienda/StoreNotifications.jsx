import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from "../../api/notificaciones";

export default function StoreNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    try {
      const data = await listarNotificaciones();
      setNotifications(data || []);
    } catch (e) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)
  );
  const unreadCount = notifications.filter((n) => !n.leida).length;

  const markAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    try { await marcarTodasLeidas(); } catch (e) { cargar(); }
  };

  const handleClick = async (notif) => {
    if (!notif.leida) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n)));
      try { await marcarLeida(notif.id); } catch (e) { /* noop */ }
    }
    if (notif.enlace) navigate(notif.enlace);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Notificaciones</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            Centro de notificaciones de tu tienda.
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all">
            <CheckCheck size={16} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p>Cargando notificaciones...</p>
        </div>
      ) : sorted.length > 0 ? (
        <div className="space-y-2">
          {sorted.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`w-full text-left block bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 hover:shadow-md transition-all ${!notif.leida ? "border-l-4 border-l-rose-500" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-border flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-dark-text-secondary">
                  <Bell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm ${!notif.leida ? "font-bold" : "font-semibold"} text-gray-900 dark:text-dark-text`}>
                        {notif.titulo || notif.tipo || "Notificación"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">{notif.mensaje}</p>
                    </div>
                    {!notif.leida && <div className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0 mt-1.5" />}
                  </div>
                  {notif.creado_en && (
                    <span className="text-[10px] text-gray-400 mt-2 inline-block">
                      {new Date(notif.creado_en).toLocaleDateString("es-CO", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bell size={48} className="mx-auto text-gray-300 dark:text-dark-border mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">No hay notificaciones</h3>
          <p className="text-sm text-gray-500 mt-1">Cuando ocurra algo importante aparecerá aquí.</p>
        </div>
      )}
    </div>
  );
}
