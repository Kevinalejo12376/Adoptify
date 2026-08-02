import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Building2, PawPrint, Heart, Store, Shield, ClipboardList,
  TrendingUp, Activity, Calendar,
} from "lucide-react";
import { getEstadisticas, listarUsuarios } from "../../api/admin";

// ========================================================
// Skeleton Loading Component
// ========================================================
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-dark-border" />
        <div className="w-16 h-5 rounded-full bg-gray-200 dark:bg-dark-border" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 bg-gray-200 dark:bg-dark-border rounded" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-dark-border rounded" />
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
        <div className="h-5 w-40 bg-gray-200 dark:bg-dark-border rounded" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-dark-border rounded" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-dark-border" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 bg-gray-200 dark:bg-dark-border rounded" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-dark-border rounded" />
          </div>
          <div className="w-16 h-6 rounded-full bg-gray-200 dark:bg-dark-border" />
        </div>
      ))}
    </div>
  );
}

// ========================================================
// Mini Sparkline Chart Component
// ========================================================
function SparklineChart({ data, color = "rose", height = 48 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const polyline = points.join(" ");

  const gradientId = `sparkline-${color}-${Math.random().toString(36).substr(2, 9)}`;

  const colorMap = {
    rose: { stroke: "#f43f5e", fill: "url(#" + gradientId + ")" },
    emerald: { stroke: "#10b981", fill: "url(#" + gradientId + ")" },
    amber: { stroke: "#f59e0b", fill: "url(#" + gradientId + ")" },
    blue: { stroke: "#3b82f6", fill: "url(#" + gradientId + ")" },
    violet: { stroke: "#8b5cf6", fill: "url(#" + gradientId + ")" },
    orange: { stroke: "#f97316", fill: "url(#" + gradientId + ")" },
  };

  const colors = colorMap[color] || colorMap.rose;

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.2" />
          <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <polyline
        points={polyline}
        fill="none"
        stroke={colors.stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw-line"
        style={{
          strokeDasharray: "1000",
          strokeDashoffset: "0",
        }}
      />
      <polygon
        points={`0,${height} ${polyline} 100,${height}`}
        fill={colors.fill}
      />
    </svg>
  );
}

// ========================================================
// Mini Bar Chart
// ========================================================
function MiniBarChart({ data, labels, color = "rose", height = 100 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);

  const colorMap = {
    rose: "bg-rose-400 dark:bg-rose-500",
    emerald: "bg-emerald-400 dark:bg-emerald-500",
    amber: "bg-amber-400 dark:bg-amber-500",
    blue: "bg-blue-400 dark:bg-blue-500",
    violet: "bg-violet-400 dark:bg-violet-500",
    orange: "bg-orange-400 dark:bg-orange-500",
  };

  const barColor = colorMap[color] || colorMap.rose;

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((valor, i) => {
          const altura = (valor / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end group">
              <span className="text-[9px] font-medium text-gray-400 dark:text-dark-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                {valor}
              </span>
              <div
                style={{ height: `${Math.max(altura, 4)}%` }}
                className={`w-full rounded-t-md ${barColor} transition-all duration-500 ease-out hover:brightness-110 cursor-pointer`}
              />
            </div>
          );
        })}
      </div>
      {labels && (
        <div className="flex justify-between text-[9px] text-gray-400 dark:text-dark-text-secondary">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================================
// Stat Card con hover mejorado y sparkline
// ========================================================
function StatCard({ titulo, valor, icono: Icono, color = "rose", incremento, onClick, sparklineData }) {
  const isPositive = incremento > 0;
  const isNegative = incremento < 0;

  const iconBgMap = {
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    teal: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl bg-white dark:bg-dark-card
        border border-gray-100 dark:border-dark-border p-5
        transition-all duration-300 ease-out
        ${onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-gray-200 dark:hover:border-dark-border/80" : ""}
        shadow-sm group
      `}
    >
      {/* Header con icono y badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${iconBgMap[color] || iconBgMap.rose}`}>
          {Icono && <Icono size={20} strokeWidth={1.5} />}
        </div>
        {incremento !== undefined && incremento !== null && (
          <span
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
              ${isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : ""}
              ${isNegative ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : ""}
              ${!isPositive && !isNegative ? "bg-gray-50 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400" : ""}
            `}
          >
            {isPositive && <TrendingUp size={10} />}
            {isNegative && "↓"}
            {isPositive ? "+" : ""}{incremento}%
          </span>
        )}
      </div>

      {/* Información */}
      <div>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary font-medium mb-0.5">
          {titulo}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
          {typeof valor === "number" ? valor.toLocaleString("es-CO") : valor}
        </p>
      </div>

      {/* Sparkline en la parte inferior */}
      {sparklineData && (
        <div className="mt-3 -mx-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
          <SparklineChart data={sparklineData} color={color} height={32} />
        </div>
      )}

      {/* Decoración fondo */}
      <div
        className={`
          absolute -bottom-3 -right-3 w-20 h-20 rounded-full opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300
          ${color === "rose" ? "bg-rose-500" : ""}
          ${color === "emerald" ? "bg-emerald-500" : ""}
          ${color === "amber" ? "bg-amber-500" : ""}
          ${color === "blue" ? "bg-blue-500" : ""}
          ${color === "violet" ? "bg-violet-500" : ""}
          ${color === "orange" ? "bg-orange-500" : ""}
          ${color === "teal" ? "bg-teal-500" : ""}
        `}
      />
    </div>
  );
}

// ========================================================
// Dashboard Principal
// ========================================================
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [refugios, setRefugios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [est, refs] = await Promise.all([
          getEstadisticas(),
          listarUsuarios("refugio"),
        ]);
        if (!activo) return;
        setStats(est);
        setRefugios(refs.slice(0, 5));
      } catch (e) {
        if (activo) setError(e?.message || "No se pudieron cargar las estadísticas");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Sin series temporales por ahora (no hay endpoint historico).
  const sparklineData = [];

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="h-8 w-64 bg-gray-200 dark:bg-dark-border rounded-lg mb-2 animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
        </div>

        {/* Grid de skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <SkeletonCard />
            </div>
          ))}
        </div>

        {/* Skeleton tabla */}
        <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <SkeletonTable />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
          <Activity size={28} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-1">
          Error al cargar datos
        </h3>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary max-w-md">
          {error}
        </p>
      </div>
    );
  }

  const statCards = [
    {
      titulo: "Usuarios Registrados", valor: stats.usuarios,
      icono: Users, color: "rose",
      onClick: () => navigate("/admin/usuarios"),
      incremento: 12,
      sparklineData: sparklineData,
    },
    {
      titulo: "Refugios Registrados", valor: stats.refugios,
      icono: Building2, color: "emerald",
      onClick: () => navigate("/admin/refugios"),
      incremento: 5,
      sparklineData: [],
    },
    {
      titulo: "Administradores", valor: stats.administradores,
      icono: Shield, color: "teal",
      onClick: () => navigate("/admin/administradores"),
    },
    {
      titulo: "Mascotas Publicadas", valor: stats.mascotas,
      icono: PawPrint, color: "amber",
      onClick: () => navigate("/admin/mascotas"),
      incremento: 8,
    },
    {
      titulo: "Mascotas Disponibles", valor: stats.mascotas_disponibles,
      icono: PawPrint, color: "blue",
    },
    {
      titulo: "Mascotas Adoptadas", valor: stats.mascotas_adoptadas,
      icono: Heart, color: "rose",
      incremento: -3,
      sparklineData: [],
    },
    {
      titulo: "Solicitudes de Adopción", valor: stats.solicitudes,
      icono: ClipboardList, color: "violet",
      incremento: 15,
    },
    {
      titulo: "Productos Publicados", valor: stats.productos,
      icono: Store, color: "blue",
      onClick: () => navigate("/admin/marketplace"),
      incremento: 7,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header con bienvenida */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <Activity size={18} className="text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Panel de Administración
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary ml-11">
          Datos en tiempo real de la plataforma ·{" "}
          <span className="text-rose-500 font-medium">
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </p>
      </div>

      {/* Tarjetas con animación escalonada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <StatCard {...card} />
          </div>
        ))}
      </div>

      {/* Distribuciones reales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mascotas por estado */}
        <div className="animate-fade-in bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <PawPrint size={16} className="text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Mascotas por estado</h3>
          </div>
          <MiniBarChart
            data={[stats.mascotas_disponibles || 0, stats.mascotas_adoptadas || 0, Math.max((stats.mascotas || 0) - (stats.mascotas_disponibles || 0) - (stats.mascotas_adoptadas || 0), 0)]}
            labels={["Disponibles", "Adoptadas", "En proceso"]}
            color="amber"
            height={120}
          />
        </div>

        {/* Cuentas registradas */}
        <div className="animate-fade-in bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
              <Users size={16} className="text-rose-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Cuentas registradas</h3>
          </div>
          <MiniBarChart
            data={[stats.usuarios || 0, stats.refugios || 0, stats.administradores || 0]}
            labels={["Usuarios", "Refugios", "Admins"]}
            color="rose"
            height={120}
          />
        </div>
      </div>

      {/* Últimos refugios registrados */}
      <div className="animate-fade-in bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Building2 size={16} className="text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Últimos Refugios Registrados</h3>
          </div>
          <button
            onClick={() => navigate("/admin/refugios")}
            className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            Ver todos
          </button>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-dark-border">
          {refugios.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 size={32} className="mx-auto text-gray-300 dark:text-dark-border mb-2" />
              <p className="text-sm text-gray-400 dark:text-dark-text-secondary">No hay refugios registrados</p>
            </div>
          ) : (
            refugios.map((ref, index) => (
              <div
                key={ref.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-all duration-200 cursor-pointer group"
                onClick={() => navigate("/admin/refugios")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-transform duration-200 group-hover:scale-110">
                    {(ref.refugio_nombre || ref.nombre || "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{ref.refugio_nombre || ref.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{ref.ubicacion || "Sin ciudad"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-dark-text-secondary">
                    #{ref.id?.toString().padStart(4, "0")}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Activo
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
