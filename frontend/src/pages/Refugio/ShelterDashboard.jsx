import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  PawPrint, Users, Heart, ClipboardList, FileText, ShoppingBag,
  Clock, AlertCircle, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ScrollToTop from "../../components/ScrollToTop";
import { misEstadisticas } from "../../api/refugios";
import { solicitudesRecibidas } from "../../api/solicitudes";

export default function ShelterDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [est, sols] = await Promise.all([misEstadisticas(), solicitudesRecibidas()]);
      setStats(est);
      setRecentRequests(sols.slice(0, 5).map((s) => ({
        id: s.id,
        user: s.nombre_contacto,
        pet: s.mascota_nombre || `Mascota #${s.mascota_id}`,
        type: s.mascota_tipo || "Perro",
        status: (s.estado || "pendiente").replace("_", " "),
        date: s.creada_en ? new Date(s.creada_en).toLocaleDateString("es-CO") : "",
        time: s.creada_en ? new Date(s.creada_en).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "",
      })));
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const isStoreEnabled = user?.settings?.storeEnabled ?? false;

  const quickActions = [
    { icon: PawPrint, label: "Registrar Mascota", to: "/refugio/mascotas", color: "from-rose-500 to-pink-500" },
    { icon: ClipboardList, label: "Ver Solicitudes", to: "/refugio/solicitudes", color: "from-emerald-500 to-teal-500" },
    { icon: FileText, label: "Nueva Publicación", to: "/refugio/foro", color: "from-amber-500 to-orange-500" },
    ...(isStoreEnabled ? [
      { icon: ShoppingBag, label: "Agregar Producto", to: "/refugio/tienda", color: "from-blue-500 to-cyan-500" },
    ] : []),
  ];

  const getStatusBadge = (status) => {
    const config = {
      "pendiente":    { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400", icon: Clock },
      "en revisión":  { color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400", icon: AlertCircle },
      "en revision":  { color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400", icon: AlertCircle },
      "contactado":   { color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400", icon: CheckCircle2 },
      "cerrada":      { color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400", icon: XCircle },
      "finalizada":   { color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400", icon: Heart },
    };
    const c = config[status] || config["pendiente"];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.color}`}>
        <Icon className="w-3 h-3" />{status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  const statCards = stats ? [
    { icon: PawPrint, label: "Mascotas Registradas", value: String(stats.mascotas), color: "from-rose-500 to-pink-500", textColor: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", progress: Math.min((stats.mascotas / 50) * 100, 100) },
    { icon: Users, label: "Solicitudes Recibidas", value: String(stats.solicitudes), color: "from-amber-500 to-orange-500", textColor: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", progress: Math.min((stats.solicitudes / 30) * 100, 100) },
    { icon: Heart, label: "Adopciones Exitosas", value: String(stats.exitosas), color: "from-emerald-500 to-teal-500", textColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", progress: stats.solicitudes > 0 ? Math.round((stats.exitosas / stats.solicitudes) * 100) : 0 },
    { icon: ClipboardList, label: "Solicitudes Pendientes", value: String(stats.pendientes), color: "from-violet-500 to-purple-500", textColor: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", progress: stats.solicitudes > 0 ? Math.round((stats.pendientes / stats.solicitudes) * 100) : 0 },
  ] : [];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
            Bienvenido, {user?.name || user?.nombre || "Refugio"}
          </p>
        </div>

        {/* Stats reales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-dark-border">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${s.textColor}`} />
                </div>
                <p className={`text-2xl font-bold font-display ${s.textColor}`}>{s.value}</p>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{s.label}</p>
                <div className="mt-3 h-1.5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${s.color} rounded-full`} style={{ width: `${s.progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Acciones rápidas */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={i} to={a.to}
                  className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition-all group flex flex-col items-center gap-2 text-center">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Solicitudes recientes (reales) */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Solicitudes Recientes</h3>
            <Link to="/refugio/solicitudes" className="text-xs font-medium text-rose-500 hover:text-rose-600">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-dark-border">
            {recentRequests.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No hay solicitudes recientes</div>
            ) : (
              recentRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                      {req.user?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{req.user}</p>
                      <p className="text-xs text-gray-500">Para: {req.pet}</p>
                    </div>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
}
