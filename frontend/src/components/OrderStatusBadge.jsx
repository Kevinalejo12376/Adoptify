import React from "react";
import { useTheme } from "../context/ThemeContext";
import {
  Clock, CheckCircle2, Package, Truck, PackageCheck,
  XCircle, RotateCcw, Loader2
} from "lucide-react";

const STATUS_CONFIG = {
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    light: "bg-amber-100 text-amber-800 border-amber-200",
    dark: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  pagado: {
    label: "Pago Confirmado",
    icon: CheckCircle2,
    light: "bg-blue-100 text-blue-800 border-blue-200",
    dark: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
  },
  preparando: {
    label: "Preparando Pedido",
    icon: Package,
    light: "bg-indigo-100 text-indigo-800 border-indigo-200",
    dark: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  enviado: {
    label: "Enviado",
    icon: Package,
    light: "bg-violet-100 text-violet-800 border-violet-200",
    dark: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    dot: "bg-violet-500",
  },
  en_camino: {
    label: "En Camino",
    icon: Truck,
    light: "bg-orange-100 text-orange-800 border-orange-200",
    dark: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dot: "bg-orange-500",
  },
  entregado: {
    label: "Entregado",
    icon: PackageCheck,
    light: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    light: "bg-red-100 text-red-800 border-red-200",
    dark: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-500",
  },
  reembolsado: {
    label: "Reembolsado",
    icon: RotateCcw,
    light: "bg-gray-100 text-gray-800 border-gray-200",
    dark: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    dot: "bg-gray-500",
  },
};

export default function OrderStatusBadge({ status, size = "md", showIcon = true }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        transition-all duration-300
        ${sizeClasses[size]}
        ${isDark ? config.dark : config.light}
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}
