import React, { useState, useEffect } from "react";
import {
  Users, Building2, PawPrint, Heart, Store, ShoppingCart,
  MessageSquare, Flag, HelpCircle, Shield, ClipboardList, Loader2, Star,
  TrendingUp, TrendingDown, Activity,
} from "lucide-react";
import {
  getEstadisticas, listarPedidos, listarReportes, listarPqrs, listarForoAdmin,
} from "../../api/admin";

// ========================================================
// Gráfica de barras simple con etiquetas (usa datos reales)
// ========================================================
function LabeledBarChart({ items, height = 180 }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }}>
        {items.map((it, i) => {
          const altura = (it.value / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end">
              <span className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">{it.value}</span>
              <div
                style={{ height: `${Math.max(altura, 4)}%` }}
                className={`w-full rounded-lg bg-gradient-to-t ${it.color} transition-all duration-500`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2">
        {items.map((it, i) => (
          <span key={i} className="flex-1 text-center text-[11px] text-gray-400 dark:text-dark-text-secondary">
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ========================================================
// Barra de progreso
// ========================================================
function ProgressBar({ value, max, color = "rose", label, showValue = true }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorMap = {
    rose: "bg-gradient-to-r from-rose-400 to-rose-500",
    emerald: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    amber: "bg-gradient-to-r from-amber-400 to-amber-500",
    blue: "bg-gradient-to-r from-blue-400 to-blue-500",
    violet: "bg-gradient-to-r from-violet-400 to-violet-500",
    cyan: "bg-gradient-to-r from-cyan-400 to-cyan-500",
    orange: "bg-gradient-to-r from-orange-400 to-orange-500",
  };
  const bgMap = {
    rose: "bg-rose-100 dark:bg-rose-500/10",
    emerald: "bg-emerald-100 dark:bg-emerald-500/10",
    amber: "bg-amber-100 dark:bg-amber-500/10",
    blue: "bg-blue-100 dark:bg-blue-500/10",
    violet: "bg-violet-100 dark:bg-violet-500/10",
    cyan: "bg-cyan-100 dark:bg-cyan-500/10",
    orange: "bg-orange-100 dark:bg-orange-500/10",
  };
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary">{label}</span>
          {showValue && <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{value}</span>}
        </div>
      )}
      <div className={`w-full h-2 rounded-full ${bgMap[color] || bgMap.rose} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${colorMap[color] || colorMap.rose} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ========================================================
// Widget de estadística (icono + label + total)
// ========================================================
const StatWidget = ({ icon: Icono, label, total, color }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 shadow-sm flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
      color === "rose" ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500" :
      color === "emerald" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" :
      color === "amber" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-500" :
      color === "blue" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-500" :
      color === "violet" ? "bg-violet-50 dark:bg-violet-500/10 text-violet-500" :
      color === "orange" ? "bg-orange-50 dark:bg-orange-500/10 text-orange-500" :
      color === "cyan" ? "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-500" :
      "bg-gray-50 dark:bg-gray-500/10 text-gray-500"
    }`}>
      <Icono size={18} strokeWidth={1.5} />
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-dark-text-secondary font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-dark-text">{total}</p>
    </div>
  </div>
);

// ========================================================
// Tarjeta de estadística principal
// ========================================================
function StatCard({ icon: Icono, label, total, color, trend, trendValue, subtitle }) {
  const colorMap = {
    rose: {
      bg: "bg-rose-50 dark:bg-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-500/20",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-500/20",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-500/20",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-500/20",
    },
    violet: {
      bg: "bg-violet-50 dark:bg-violet-500/10",
      text: "text-violet-600 dark:text-violet-400",
      border: "border-violet-200 dark:border-violet-500/20",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-500/10",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-500/20",
    },
    cyan: {
      bg: "bg-cyan-50 dark:bg-cyan-500/10",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-200 dark:border-cyan-500/20",
    },
  };
  const c = colorMap[color] || colorMap.rose;

  return (
    <div className={`bg-white dark:bg-dark-card rounded-2xl border ${c.border} shadow-sm p-5 hover:shadow-md transition-all duration-300 group`}>
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center ${c.text} group-hover:scale-110 transition-transform duration-300`}>
          <Icono size={22} strokeWidth={1.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
            trend === "up" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
            "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          }`}>
            {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trendValue || "0%"}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900 dark:text-dark-text tracking-tight">{total ?? 0}</p>
        <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary mt-1">{label}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ========================================================
// Gráfico de barras mejorado
// ========================================================
function BarChart({ items, height = 200, title }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      {title && (
        <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">{title}</h3>
      )}
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {items.map((it, i) => {
          const altura = (it.value / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 justify-end h-full">
              <span className="text-xs font-bold text-gray-700 dark:text-dark-text">{it.value}</span>
              <div className="relative w-full flex-1 flex items-end justify-center" style={{ minHeight: "4px" }}>
                <div
                  style={{ height: `${Math.max(altura, 4)}%` }}
                  className={`w-full rounded-lg bg-gradient-to-t ${it.color} transition-all duration-700 ease-out hover:opacity-80 cursor-pointer relative`}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-full h-1 rounded-full bg-white/30 opacity-0 group-hover:opacity-100" />
                </div>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-dark-text-secondary text-center leading-tight">
                {it.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================================================
// Gráfico de donut simple
// ========================================================
function DonutChart({ items, size = 160 }) {
  const total = items.reduce((sum, it) => sum + it.value, 0) || 1;
  const colors = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#06b6d4"];
  let cumulativePct = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" className="transform -rotate-90 w-full h-full">
          {items.map((it, i) => {
            const pct = (it.value / total) * 100;
            const startAngle = cumulativePct;
            cumulativePct += pct;
            const dashArray = `${pct} ${100 - pct}`;
            const dashOffset = 100 - startAngle;

            return (
              <circle
                key={i}
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="3"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            );
          })}
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-dark-border" opacity="0.3" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{total}</p>
            <p className="text-[10px] text-gray-400 dark:text-dark-text-secondary">Total</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[11px] text-gray-500 dark:text-dark-text-secondary">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE PRINCIPAL
// ========================================================
export default function AdminEstadisticas() {
  const [stats, setStats] = useState(null);
  const [counts, setCounts] = useState({ pedidos: 0, reportes: 0, pqrs: 0, foro: 0 });
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("total");

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [est, pedidos, reportes, pqrs, foro] = await Promise.all([
          getEstadisticas().catch(() => null),
          listarPedidos().catch(() => []),
          listarReportes().catch(() => []),
          listarPqrs().catch(() => []),
          listarForoAdmin().catch(() => []),
        ]);
        if (!activo) return;
        setStats(est);
        setCounts({
          pedidos: (pedidos || []).length,
          reportes: (reportes || []).length,
          pqrs: (pqrs || []).length,
          foro: (foro || []).length,
        });
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-rose-500" />
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 opacity-20 animate-ping" />
        </div>
        <p className="mt-4 text-sm font-medium">Cargando estadísticas...</p>
      </div>
    );
  }

  const s = stats || {};
  const enProceso = Math.max((s.mascotas || 0) - (s.mascotas_disponibles || 0) - (s.mascotas_adoptadas || 0), 0);
  const totalMascotas = s.mascotas || 1;

  const statsPrincipal = [
    { icon: Users, label: "Usuarios registrados", total: s.usuarios ?? 0, color: "rose", subtitle: "usuarios activos" },
    { icon: Building2, label: "Refugios aliados", total: s.refugios ?? 0, color: "emerald", subtitle: "refugios verificados" },
    { icon: Shield, label: "Administradores", total: s.administradores ?? 0, color: "blue", subtitle: "cuentas activas" },
    { icon: PawPrint, label: "Mascotas registradas", total: s.mascotas ?? 0, color: "amber", subtitle: "en la plataforma" },
    { icon: Heart, label: "Adopciones exitosas", total: s.mascotas_adoptadas ?? 0, color: "rose", subtitle: "mascotas adoptadas" },
    { icon: ClipboardList, label: "Solicitudes", total: s.solicitudes ?? 0, color: "violet", subtitle: "en gestión" },
    { icon: Store, label: "Productos en venta", total: s.productos ?? 0, color: "blue", subtitle: "en marketplace" },
    { icon: ShoppingCart, label: "Pedidos realizados", total: counts.pedidos, color: "violet", subtitle: "pedidos totales" },
  ];

  const statsSecundarias = [
    { icon: MessageSquare, label: "Publicaciones foro", total: s.foro_posts ?? 0, color: "amber", subtitle: "publicaciones" },
    { icon: Star, label: "Reseñas", total: s.resenas ?? 0, color: "amber", subtitle: "valoraciones" },
    { icon: Flag, label: "Reportes", total: counts.reportes, color: "orange", subtitle: "reportes activos" },
    { icon: HelpCircle, label: "PQRS recibidas", total: counts.pqrs, color: "cyan", subtitle: "peticiones" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
              <Activity size={20} className="text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Estadísticas</h1>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                Datos y métricas de la plataforma
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-dark-border rounded-xl p-0.5">
            {["semanal", "mensual", "total"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  periodo === p
                    ? "bg-white dark:bg-dark-card text-rose-600 dark:text-rose-400 shadow-sm"
                    : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text"
                }`}
              >
                {p === "semanal" ? "Semanal" : p === "mensual" ? "Mensual" : "Total"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statsPrincipal.map((stat, i) => (
          <div key={i} className="animate-fade-in">
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Tarjetas secundarias */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsSecundarias.map((stat, i) => (
          <div key={i} className="animate-fade-in">
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Mascotas por estado */}
        <div className="lg:col-span-1 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm">
          <DonutChart
            items={[
              { label: "Disponibles", value: s.mascotas_disponibles ?? 0 },
              { label: "Adoptadas", value: s.mascotas_adoptadas ?? 0 },
              { label: "En proceso", value: enProceso },
            ]}
          />
          <div className="mt-4 space-y-2">
            <ProgressBar
              label="Disponibles"
              value={s.mascotas_disponibles ?? 0}
              max={totalMascotas}
              color="emerald"
            />
            <ProgressBar
              label="Adoptadas"
              value={s.mascotas_adoptadas ?? 0}
              max={totalMascotas}
              color="rose"
            />
            <ProgressBar
              label="En proceso"
              value={enProceso}
              max={totalMascotas}
              color="amber"
            />
          </div>
        </div>

        {/* Mascotas - gráfico de barras */}
        <div className="lg:col-span-1 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm">
          <BarChart
            title="Mascotas por estado"
            items={[
              { label: "Disponibles", value: s.mascotas_disponibles ?? 0, color: "from-emerald-400 to-emerald-300 dark:from-emerald-600 dark:to-emerald-500" },
              { label: "Adoptadas", value: s.mascotas_adoptadas ?? 0, color: "from-rose-400 to-rose-300 dark:from-rose-600 dark:to-rose-500" },
              { label: "En proceso", value: enProceso, color: "from-amber-400 to-amber-300 dark:from-amber-600 dark:to-amber-500" },
            ]}
            height={180}
          />
        </div>

        {/* Cuentas registradas */}
        <div className="lg:col-span-1 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm">
          <BarChart
            title="Cuentas registradas"
            items={[
              { label: "Usuarios", value: s.usuarios ?? 0, color: "from-rose-400 to-rose-300 dark:from-rose-600 dark:to-rose-500" },
              { label: "Refugios", value: s.refugios ?? 0, color: "from-emerald-400 to-emerald-300 dark:from-emerald-600 dark:to-emerald-500" },
              { label: "Admins", value: s.administradores ?? 0, color: "from-blue-400 to-blue-300 dark:from-blue-600 dark:to-blue-500" },
            ]}
            height={180}
          />
        </div>
      </div>

      {/* Comunidad y soporte */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm">
        <BarChart
          title="Comunidad y soporte"
          items={[
            { label: "Publicaciones foro", value: s.foro_posts ?? 0, color: "from-amber-400 to-amber-300 dark:from-amber-600 dark:to-amber-500" },
            { label: "Pedidos", value: counts.pedidos, color: "from-violet-400 to-violet-300 dark:from-violet-600 dark:to-violet-500" },
            { label: "Reportes", value: counts.reportes, color: "from-orange-400 to-orange-300 dark:from-orange-600 dark:to-orange-500" },
            { label: "PQRS", value: counts.pqrs, color: "from-cyan-400 to-cyan-300 dark:from-cyan-600 dark:to-cyan-500" },
          ]}
          height={200}
        />
      </div>
    </div>
  );
}
