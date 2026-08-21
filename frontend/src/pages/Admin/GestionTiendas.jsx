import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Store, Plus, Search, X, SlidersHorizontal, ChevronDown, MoreVertical,
  Eye, Edit3, Package, BarChart3, Lock, Unlock, RefreshCw, Mail, Trash2,
  Building2, CheckCircle, Clock, AlertTriangle, ShoppingBag, TrendingUp,
  ChevronLeft, ChevronRight, Image as ImageIcon, ExternalLink, MapPin,
  Globe, Phone, Mail as MailIcon, User, Calendar, Shield,
  Filter, ClipboardList,
} from "lucide-react";
import {
  getResumenTiendas, listarTiendas, obtenerTienda,
  crearTienda, actualizarTienda, cambiarEstadoTienda,
  restablecerPasswordTienda, eliminarTienda,
  listarProductosTienda, ocultarProductoTienda, eliminarProductoTienda,
} from "../../api/tiendas";
import SolicitudesTiendas from "./SolicitudesTiendas";
import AdminModal from "../../components/admin/AdminModal";
import AdminModalPortal from "../../components/admin/AdminModalPortal";

// ========================================================
// COLORES PASTEL PARA TARJETAS DE RESUMEN
// ========================================================
const COLORES_PASTEL = {
  rose: { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", icon: "text-rose-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", icon: "text-emerald-500" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", icon: "text-amber-500" },
  blue: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", icon: "text-blue-500" },
  violet: { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", icon: "text-violet-500" },
  teal: { bg: "bg-teal-50 dark:bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", icon: "text-teal-500" },
};

// ========================================================
// COMPONENTE: Avatar con inicial
// ========================================================
function StoreAvatar({ nombre, logoUrl, size = "md" }) {
  const sizes = {
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-20 h-20 text-xl",
  };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={nombre}
        className={`${sizes[size] || sizes.md} rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-dark-border`}
        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
      />
    );
  }

  return (
    <div className={`${sizes[size] || sizes.md} rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center font-bold text-rose-600 dark:text-rose-400 flex-shrink-0`}>
      {(nombre || "T")[0].toUpperCase()}
    </div>
  );
}

// ========================================================
// COMPONENTE: Badge de estado
// ========================================================
function StatusBadge({ estado }) {
  const config = {
    activa: { bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500", label: "Activa" },
    verificada: { bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500", label: "Verificada" },
    pendiente: { bg: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500", label: "Pendiente" },
    suspendida: { bg: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500", label: "Suspendida" },
    inactiva: { bg: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500", label: "Inactiva" },
  };
  const c = config[estado] || config.pendiente;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.bg}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ========================================================
// COMPONENTE: Skeleton Loading
// ========================================================
function SkeletonLine({ className = "" }) {
  return <div className={`bg-gray-200 dark:bg-dark-border rounded animate-pulse ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm animate-pulse">
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

function SkeletonStoreCard() {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-dark-border" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 bg-gray-200 dark:bg-dark-border rounded" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-dark-border rounded" />
        </div>
        <div className="w-20 h-6 rounded-full bg-gray-200 dark:bg-dark-border" />
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: Tarjeta de Resumen (StatCard)
// ========================================================
function StatCard({ titulo, valor, icono: Icono, color = "rose" }) {
  const c = COLORES_PASTEL[color] || COLORES_PASTEL.rose;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${c.bg}`}>
          <Icono size={20} strokeWidth={1.5} className={c.icon} />
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-dark-text-secondary font-medium mb-0.5">{titulo}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{typeof valor === "number" ? valor.toLocaleString("es-CO") : valor}</p>
      <div className={`absolute -bottom-3 -right-3 w-20 h-20 rounded-full opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300 bg-${color === "rose" ? "rose" : color}-500`} />
    </div>
  );
}

// ========================================================
// COMPONENTE: Modal genérico (reutilizable)
// ========================================================
function Modal({ isOpen, onClose, title, children, size = "md", icon: Icono }) {
  return (
    <AdminModal open={isOpen} onClose={onClose} title={title} icon={Icono} size={size}>
      {children}
    </AdminModal>
  );
}

// ========================================================
// COMPONENTE: Modal de Confirmación
// ========================================================
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, icon: Icono, confirmText = "Confirmar", confirmColor = "red", loading = false }) {
  if (!isOpen) return null;
  const colorClasses = {
    red: "bg-red-500 hover:bg-red-600 focus:ring-red-500/30",
    emerald: "bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500/30",
    amber: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/30",
  };

  return (
    <AdminModalPortal>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-modal-overlay" />
      <div
        className={`relative w-full max-w-md max-h-full overflow-y-auto bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border animate-modal-content p-6 text-center`}
        onClick={(e) => e.stopPropagation()}
      >
        {Icono && (
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Icono size={32} className="text-red-500" />
          </div>
        )}
        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 ${colorClasses[confirmColor] || colorClasses.red}`}
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

// ========================================================
// COMPONENTE: Menú de acciones (tres puntos)
// ========================================================
function ActionMenu({ tienda, onAction, isOpen, onToggle }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onToggle(null);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onToggle]);

  const items = [
    { id: "ver", icon: Eye, label: "Ver detalles", color: "text-blue-600" },
    { id: "editar", icon: Edit3, label: "Editar tienda", color: "text-amber-600" },
    { id: "productos", icon: Package, label: "Ver productos", color: "text-violet-600" },
    { id: "estadisticas", icon: BarChart3, label: "Ver estadísticas", color: "text-teal-600" },
    { type: "divider" },
  ];

  if (tienda.estado === "suspendida") {
    items.push({ id: "reactivar", icon: Unlock, label: "Reactivar", color: "text-emerald-600" });
  } else if (tienda.estado === "activa") {
    items.push({ id: "suspender", icon: Lock, label: "Suspender", color: "text-orange-600" });
  }

  items.push(
    { type: "divider" },
    { id: "restablecer", icon: RefreshCw, label: "Restablecer contraseña", color: "text-gray-600" },
    { id: "reenviar", icon: Mail, label: "Reenviar credenciales", color: "text-gray-600" },
    { type: "divider" },
    { id: "eliminar", icon: Trash2, label: "Eliminar", color: "text-red-600" },
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(isOpen ? null : tienda.id); }}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors"
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-dark-border animate-scale-in overflow-hidden z-30 py-1">
          {items.map((item, idx) => {
            if (item.type === "divider") {
              return <div key={idx} className="border-t border-gray-100 dark:border-dark-border my-1" />;
            }
            const Icono = item.icon;
            return (
              <button
                key={item.id}
                onClick={(e) => { e.stopPropagation(); onAction(item.id, tienda); onToggle(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-dark-border ${item.color}`}
              >
                <Icono size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========================================================
// COMPONENTE: Tarjeta de tienda (Desktop)
// ========================================================
function StoreCard({ tienda, selected, onSelect, onAction, menuOpen, onMenuToggle }) {
  return (
    <div
      className={`group bg-white dark:bg-dark-card rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        selected ? "border-rose-300 dark:border-rose-500/50 shadow-sm shadow-rose-500/10" : "border-gray-100 dark:border-dark-border"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div className="pt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(tienda.id)}
              className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-rose-500 focus:ring-rose-500/30 accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Avatar */}
          <StoreAvatar nombre={tienda.nombre} logoUrl={tienda.logo_url} size="md" />

          {/* Info principal */}
          <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-start">
            {/* Nombre y email */}
            <div className="col-span-2 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                {tienda.nombre}
              </h3>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate mt-0.5">
                <MailIcon size={12} className="inline mr-1" />
                {tienda.email || tienda.usuario_email || "Sin email"}
              </p>
              {tienda.ciudad && (
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary truncate mt-0.5">
                  <MapPin size={12} className="inline mr-1" />
                  {tienda.ciudad}
                </p>
              )}
            </div>

            {/* Responsable (hidden en mobile) */}
            <div className="hidden md:block min-w-0">
              <p className="text-xs text-gray-400 dark:text-dark-text-secondary mb-1">Responsable</p>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center text-[10px] font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                  {(tienda.responsable_nombre || "?")[0]}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-dark-text truncate">
                  {tienda.responsable_nombre || "Sin asignar"}
                </span>
              </div>
            </div>

            {/* Estado */}
            <div className="min-w-0">
              <p className="text-xs text-gray-400 dark:text-dark-text-secondary mb-1">Estado</p>
              <StatusBadge estado={tienda.estado} />
            </div>

            {/* Productos */}
            <div className="hidden lg:block min-w-0">
              <p className="text-xs text-gray-400 dark:text-dark-text-secondary mb-1">Productos</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                {tienda.total_productos || 0}
              </p>
            </div>

            {/* Fecha */}
            <div className="hidden lg:block min-w-0">
              <p className="text-xs text-gray-400 dark:text-dark-text-secondary mb-1">Creado</p>
              <p className="text-xs font-medium text-gray-700 dark:text-dark-text">
                {tienda.creado_en ? new Date(tienda.creado_en).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex-shrink-0">
            <ActionMenu
              tienda={tienda}
              isOpen={menuOpen === tienda.id}
              onToggle={onMenuToggle}
              onAction={onAction}
            />
            <button
              onClick={() => onAction("ver", tienda)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
              title="Ver detalles completos"
            >
              <Eye size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: Tarjeta de tienda (Mobile)
// ========================================================
function StoreCardMobile({ tienda, selected, onSelect, onAction, menuOpen, onMenuToggle }) {
  return (
    <div
      className={`bg-white dark:bg-dark-card rounded-2xl border transition-all duration-200 ${
        selected ? "border-rose-300 dark:border-rose-500/50" : "border-gray-100 dark:border-dark-border"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(tienda.id)}
            className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-rose-500 focus:ring-rose-500/30 accent-rose-500 cursor-pointer mt-1"
          />
          <StoreAvatar nombre={tienda.nombre} logoUrl={tienda.logo_url} size="sm" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text truncate">{tienda.nombre}</h3>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">{tienda.ciudad || "Sin ciudad"}</p>
          </div>
          <ActionMenu tienda={tienda} isOpen={menuOpen === tienda.id} onToggle={onMenuToggle} onAction={onAction} />
          <button
            onClick={() => onAction("ver", tienda)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors flex-shrink-0"
            title="Ver detalles completos"
          >
            <Eye size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <StatusBadge estado={tienda.estado} />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-secondary">
            <ShoppingBag size={12} />
            <span>{tienda.total_productos || 0} prod.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: Subir Logo (drag & drop + preview)
// ========================================================
function LogoUpload({ value, onChange }) {
  const [preview, setPreview] = useState(value || null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleClick = () => fileInputRef.current?.click();

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="md:col-span-2">
      <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1.5">Logo de la tienda</label>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200
          ${dragging
            ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10"
            : preview
              ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5"
              : "border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-500/30 hover:bg-rose-50/30 dark:hover:bg-rose-500/5"
          }
        `}
      >
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

        {preview ? (
          <div className="p-4 flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-white dark:bg-dark-card shadow-sm flex-shrink-0">
              <img src={preview} alt="Logo preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">Logo cargado</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">Haz clic para cambiar la imagen</p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
              title="Eliminar logo"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <ImageIcon size={24} className="text-rose-400 dark:text-rose-500/50" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">
              Sube el logo de la tienda
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-3">
              Arrastra una imagen aquí o haz clic para seleccionar
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
            >
              <ImageIcon size={14} />
              Subir logo
            </button>
            <p className="text-[10px] text-gray-400 dark:text-dark-text-secondary mt-3">
              PNG, JPG o WEBP · Máx 2MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: Input con validación
// ========================================================
function ValidatedInput({ label, name, value, onChange, onBlur, error, touched, placeholder, type = "text", required = false, minLength, children, className = "" }) {
  const showError = touched && error;
  const inputClasses = `w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border rounded-xl focus:outline-none focus:ring-2 transition-all ${
    showError
      ? "border-red-300 dark:border-red-500/50 focus:ring-red-500/20 focus:border-red-500"
      : "border-gray-200 dark:border-dark-border focus:ring-rose-500/20 focus:border-rose-500"
  } ${className}`;

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {type === "textarea" ? (
          <textarea name={name} value={value} onChange={onChange} onBlur={onBlur} className={`${inputClasses} min-h-[80px] resize-none`} placeholder={placeholder} />
        ) : type === "select" ? (
          <select name={name} value={value} onChange={onChange} onBlur={onBlur} className={inputClasses}>{children}</select>
        ) : (
          <input name={name} type={type} value={value} onChange={onChange} onBlur={onBlur} className={inputClasses} placeholder={placeholder} minLength={minLength} />
        )}
        {showError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        )}
      </div>
      {showError && (
        <p className="flex items-center gap-1 mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

// ========================================================
// MODAL: Crear Tienda (con validación por campo)
// ========================================================
function ModalCrearTienda({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    nombre: "", descripcion: "", logo_url: "", email: "", telefono: "",
    ciudad: "", direccion: "", website: "", facebook: "", instagram: "",
    responsable_nombre: "", responsable_email: "", responsable_telefono: "",
    password: "", estado: "activa",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [generarPassword, setGenerarPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateField = (name, value) => {
    const v = (value || "").toString().trim();
    switch (name) {
      case "nombre":
        if (!v) return "El nombre de la tienda es obligatorio";
        if (v.length < 3) return "Debe tener al menos 3 caracteres";
        return "";
      case "email":
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Formato de correo inválido";
        return "";
      case "telefono":
        if (v && !/^[+\d\s()-]{7,20}$/.test(v)) return "Formato inválido";
        return "";
      case "website":
        if (v && !/^https?:\/\/.+/.test(v)) return "Debe iniciar con http:// o https://";
        return "";
      case "responsable_nombre":
        if (!v) return "El nombre del responsable es obligatorio";
        return "";
      case "responsable_email":
        if (!v) return "El correo del responsable es obligatorio";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Formato de correo inválido";
        return "";
      case "password":
        if (!v) return "La contraseña es obligatoria";
        if (v.length < 6) return "Debe tener al menos 6 caracteres";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateAll = () => {
    const errors = {};
    const fields = ["nombre", "email", "responsable_nombre", "responsable_email", "password", "telefono", "website"];
    const newTouched = { ...touched };
    let hasError = false;
    fields.forEach((f) => {
      newTouched[f] = true;
      const err = validateField(f, formData[f]);
      errors[f] = err;
      if (err) hasError = true;
    });
    setTouched(newTouched);
    setFieldErrors(errors);
    return !hasError;
  };

  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!validateAll()) return;
    setLoading(true);
    try {
      await crearTienda(formData);
      setSuccessMsg("Cuenta creada con éxito");
      // Mostrar mensaje de éxito brevemente antes de cerrar
      setTimeout(() => {
        onCreated();
        onClose();
        setSuccessMsg("");
      }, 1200);
    } catch (err) {
      setError(err?.message || "Hubo un fallo al crear la tienda. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const generarPasswordAuto = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };

  const regenerarPassword = () => {
    const pwd = generarPasswordAuto();
    setFormData((prev) => ({ ...prev, password: pwd }));
    if (touched.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
  };

  useEffect(() => {
    if (isOpen && generarPassword) {
      const pwd = generarPasswordAuto();
      setFormData((prev) => ({ ...prev, password: pwd }));
    }
    if (!isOpen) {
      setFormData({
        nombre: "", descripcion: "", logo_url: "", email: "", telefono: "",
        ciudad: "", direccion: "", website: "", facebook: "", instagram: "",
        responsable_nombre: "", responsable_email: "", responsable_telefono: "",
        password: "", estado: "activa",
      });
      setFieldErrors({});
      setTouched({});
      setError("");
      setSuccessMsg("");
      setGenerarPassword(true);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Tienda Aliada" icon={Store} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-3 animate-fade-in">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 flex-shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="16 8 11 15 8 12"/></svg>
            {successMsg}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Sección: Información de la Tienda */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-3 flex items-center gap-2">
            <Building2 size={16} className="text-rose-500" />
            Información de la Tienda
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <ValidatedInput label="Nombre de la tienda" name="nombre" value={formData.nombre} onChange={handleChange} onBlur={handleBlur} error={fieldErrors.nombre} touched={touched.nombre} placeholder="Ej: DogStore Bogotá" required />
            </div>
            <LogoUpload value={formData.logo_url} onChange={(val) => setFormData((prev) => ({ ...prev, logo_url: val }))} />
            <div className="md:col-span-2">
              <ValidatedInput label="Descripción" name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Breve descripción de la tienda..." type="textarea" />
            </div>
            <ValidatedInput label="Correo electrónico" name="email" type="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} error={fieldErrors.email} touched={touched.email} placeholder="tienda@ejemplo.com" />
            <ValidatedInput label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} onBlur={handleBlur} error={fieldErrors.telefono} touched={touched.telefono} placeholder="+57 300 123 4567" />
            <ValidatedInput label="Ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange} placeholder="Ej: Bogotá" />
            <ValidatedInput label="Dirección" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Calle 123 #45-67" />
            <ValidatedInput label="Sitio web" name="website" value={formData.website} onChange={handleChange} onBlur={handleBlur} error={fieldErrors.website} touched={touched.website} placeholder="https://tienda.com" />
            <ValidatedInput label="Instagram" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@tienda" />
          </div>
        </div>

        {/* Sección: Responsable */}
        <div className="border-t border-gray-100 dark:border-dark-border pt-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-1 flex items-center gap-2">
            <User size={16} className="text-amber-500" />
            Datos del Responsable
          </h3>
          <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-3">
            El correo del responsable es el que usará para <span className="font-semibold">iniciar sesión</span>. El correo de la tienda es solo de contacto.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedInput label="Nombre completo" name="responsable_nombre" value={formData.responsable_nombre} onChange={handleChange} onBlur={handleBlur} error={fieldErrors.responsable_nombre} touched={touched.responsable_nombre} placeholder="Nombre del encargado" required />
            <ValidatedInput label="Correo (inicio de sesión)" name="responsable_email" type="email" value={formData.responsable_email} onChange={handleChange} onBlur={handleBlur} error={fieldErrors.responsable_email} touched={touched.responsable_email} placeholder="responsable@ejemplo.com" required />
            <ValidatedInput label="Teléfono" name="responsable_telefono" value={formData.responsable_telefono} onChange={handleChange} placeholder="+57 300 123 4567" />
          </div>
        </div>

        {/* Sección: Acceso */}
        <div className="border-t border-gray-100 dark:border-dark-border pt-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-3 flex items-center gap-2">
            <Shield size={16} className="text-emerald-500" />
            Credenciales de Acceso
          </h3>
          <div className="p-3 mb-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <MailIcon size={15} className="flex-shrink-0" />
            <span className="min-w-0 truncate">
              Iniciará sesión con:{" "}
              <span className="font-semibold">{formData.responsable_email || "correo del responsable"}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1.5">Contraseña temporal *</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input name="password" type="text" value={formData.password} onChange={handleChange} onBlur={handleBlur}
                    className={`w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      touched.password && fieldErrors.password
                        ? "border-red-300 dark:border-red-500/50 focus:ring-red-500/20 focus:border-red-500"
                        : "border-gray-200 dark:border-dark-border focus:ring-rose-500/20 focus:border-rose-500"
                    }`}
                  />
                  {touched.password && fieldErrors.password && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    </div>
                  )}
                </div>
                <button type="button" onClick={regenerarPassword} className="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors flex-shrink-0" title="Generar nueva contraseña">
                  <RefreshCw size={16} />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-dark-text-secondary">
                Se genera automáticamente. Compártela con el responsable.
              </p>
              {touched.password && fieldErrors.password && (
                <p className="flex items-center gap-1 mt-1 text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1.5">Estado inicial</label>
              <select name="estado" value={formData.estado} onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              >
                <option value="activa">Activa</option>
                <option value="pendiente">Pendiente</option>
                <option value="suspendida">Suspendida</option>
              </select>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-dark-border">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all disabled:opacity-50 shadow-sm">
            {loading ? "Creando tienda..." : "Crear Tienda"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// MODAL: Detalle Completo de Tienda (con CRUD)
// ========================================================
function ModalDetalleCompleto({ isOpen, onClose, tiendaId, tienda: tiendaInicial, onAction }) {
  const [tienda, setTienda] = useState(tiendaInicial || null);
  const [loading, setLoading] = useState(!tiendaInicial);

  useEffect(() => {
    if (!isOpen) return;
    if (tiendaInicial) {
      setTienda(tiendaInicial);
      setLoading(false);
      return;
    }
    if (!tiendaId) return;
    setLoading(true);
    obtenerTienda(tiendaId)
      .then(setTienda)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, tiendaId]);

  if (!isOpen) return null;

  const InfoRow = ({ label, value }) => (
    <div className="flex items-start gap-2 py-2">
      <span className="text-xs font-medium text-gray-400 dark:text-dark-text-secondary min-w-[120px] flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-dark-text">{value || "—"}</span>
    </div>
  );

  const handleAction = (accion) => {
    onClose();
    onAction(accion, tienda);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tienda?.nombre || "Detalles de la Tienda"} icon={Store} size="lg">
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-dark-border" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-48 bg-gray-200 dark:bg-dark-border rounded" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-dark-border rounded" />
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 w-full bg-gray-200 dark:bg-dark-border rounded" />
          ))}
        </div>
      ) : tienda ? (
        <div className="space-y-6">
          {/* Header con logo */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-dark-border">
            <StoreAvatar nombre={tienda.nombre} logoUrl={tienda.logo_url} size="xl" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">{tienda.nombre}</h3>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">{tienda.descripcion || "Sin descripción"}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge estado={tienda.estado} />
                <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                  {tienda.total_productos || 0} productos · {tienda.total_ventas || 0} ventas
                </span>
              </div>
            </div>
          </div>

          {/* Grid de información */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <InfoRow label="Ciudad" value={tienda.ciudad} />
            <InfoRow label="Dirección" value={tienda.direccion} />
            <InfoRow label="Teléfono" value={tienda.telefono} />
            <InfoRow label="Correo" value={tienda.email || tienda.usuario_email} />
            <InfoRow label="Sitio web" value={tienda.website} />
            <InfoRow label="Responsable" value={tienda.responsable_nombre} />
            <InfoRow label="Email responsable" value={tienda.responsable_email} />
            <InfoRow label="Tel. responsable" value={tienda.responsable_telefono} />
            <InfoRow label="Fecha de creación" value={tienda.creado_en ? new Date(tienda.creado_en).toLocaleDateString("es-CO", { dateStyle: "long" }) : "—"} />
            <InfoRow label="Último login" value={tienda.ultimo_login ? new Date(tienda.ultimo_login).toLocaleDateString("es-CO", { dateStyle: "long", timeStyle: "short" }) : "Nunca"} />
            <InfoRow label="Productos" value={String(tienda.total_productos || 0)} />
            <InfoRow label="Ventas realizadas" value={String(tienda.total_ventas || 0)} />
          </div>

          {/* Botones rápidos */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-dark-border">
            <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors flex items-center gap-1.5">
              <Edit3 size={14} /> Editar
            </button>
            <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors flex items-center gap-1.5">
              <Package size={14} /> Ver productos
            </button>
          </div>

          {/* Acciones CRUD completas */}
          <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider mb-3">Acciones</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleAction("editar")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              >
                <Edit3 size={14} /> Editar
              </button>
              <button
                onClick={() => handleAction("productos")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
              >
                <Package size={14} /> Productos
              </button>
              <button
                onClick={() => handleAction("estadisticas")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors"
              >
                <BarChart3 size={14} /> Estadísticas
              </button>
              {tienda.estado === "suspendida" ? (
                <button
                  onClick={() => handleAction("reactivar")}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <Unlock size={14} /> Reactivar
                </button>
              ) : (
                <button
                  onClick={() => handleAction("suspender")}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
                >
                  <Lock size={14} /> Suspender
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => handleAction("restablecer")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-dark-border dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors"
              >
                <RefreshCw size={14} /> Restablecer contraseña
              </button>
              <button
                onClick={() => handleAction("reenviar")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-dark-border dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors"
              >
                <Mail size={14} /> Reenviar credenciales
              </button>
              <button
                onClick={() => handleAction("eliminar")}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-dark-text-secondary py-8">No se pudieron cargar los datos de la tienda.</p>
      )}
    </Modal>
  );
}

// ========================================================
// MODAL: Productos de una tienda
// ========================================================
function ModalProductosTienda({ isOpen, onClose, tiendaId, tiendaNombre }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !tiendaId) return;
    setLoading(true);
    listarProductosTienda(tiendaId)
      .then(setProductos)
      .catch(() => setProductos([]))
      .finally(() => setLoading(false));
  }, [isOpen, tiendaId]);

  const handleToggleActivo = async (prodId) => {
    try {
      await ocultarProductoTienda(tiendaId, prodId);
      setProductos((prev) => prev.map((p) => p.id === prodId ? { ...p, activo: !p.activo } : p));
    } catch {}
  };

  const handleEliminar = async (prodId) => {
    try {
      await eliminarProductoTienda(tiendaId, prodId);
      setProductos((prev) => prev.filter((p) => p.id !== prodId));
    } catch {}
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Productos - ${tiendaNombre || ""}`} icon={Package} size="lg">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-dark-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Esta tienda aún no tiene productos publicados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {productos.map((prod) => (
            <div key={prod.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Package size={16} className="text-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">
                    {prod.nombre}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                    ${Number(prod.precio).toLocaleString("es-CO")} · Stock: {prod.stock || 0} · {prod.categoria || "Sin categoría"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  prod.activo
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-500 dark:bg-dark-border dark:text-dark-text-secondary"
                }`}>
                  {prod.activo ? "Visible" : "Oculto"}
                </span>
                <button
                  onClick={() => handleToggleActivo(prod.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                >
                  {prod.activo ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  onClick={() => handleEliminar(prod.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ========================================================
// COMPONENTE: Paginación
// ========================================================
function Paginacion({ pagina, totalRegistros, porPagina, onPageChange }) {
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina));

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
        {totalRegistros > 0
          ? `Mostrando ${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, totalRegistros)} de ${totalRegistros} registros`
          : "Sin resultados"}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(pagina - 1)}
          disabled={pagina <= 1}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
          let pageNum;
          if (totalPaginas <= 5) {
            pageNum = i + 1;
          } else if (pagina <= 3) {
            pageNum = i + 1;
          } else if (pagina >= totalPaginas - 2) {
            pageNum = totalPaginas - 4 + i;
          } else {
            pageNum = pagina - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                pagina === pageNum
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: Estado Vacío
// ========================================================
function EmptyState({ onCrear }) {
  return (
    <div className="text-center py-16 animate-fade-in">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center mx-auto mb-5">
        <Store size={48} className="text-rose-300 dark:text-rose-500/30" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">
        Aún no hay Tiendas Aliadas registradas.
      </h3>
      <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6 max-w-md mx-auto">
        Comienza agregando tu primera tienda aliada para expandir tu marketplace.
      </p>
      <button
        onClick={onCrear}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all shadow-sm"
      >
        <Plus size={16} />
        Crear primera Tienda
      </button>
    </div>
  );
}

// ========================================================
// COMPONENTE PRINCIPAL: GestionTiendas
// ========================================================
export default function GestionTiendas() {
  // Estados generales
  const [resumen, setResumen] = useState(null);
  const [tiendas, setTiendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRegistros, setTotalRegistros] = useState(0);
  // Pestaña activa: 'tiendas' (registradas) o 'solicitudes' (por aprobar)
  const [tab, setTab] = useState("tiendas");

  // Filtros y paginación
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroCiudad, setFiltroCiudad] = useState("");
  const [ordenar, setOrdenar] = useState("recientes");
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(10);
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);

  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState([]);

  // Menú de acciones
  const [menuOpen, setMenuOpen] = useState(null);

  // Modales
  const [modalVer, setModalVer] = useState({ open: false, id: null });
  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalDetalle, setModalDetalle] = useState({ open: false, id: null, tienda: null });
  const [modalProductos, setModalProductos] = useState({ open: false, id: null, nombre: "" });
  const [confirmAction, setConfirmAction] = useState(null);

  // Timeout para debounce de búsqueda
  const searchTimeout = useRef(null);

  // ============================================
  // Cargar datos
  // ============================================
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, lista] = await Promise.all([
        getResumenTiendas(),
        listarTiendas({
          estado: filtroEstado !== "todas" ? filtroEstado : undefined,
          busqueda: busqueda || undefined,
          ciudad: filtroCiudad || undefined,
          ordenar,
          pagina,
          por_pagina: porPagina,
        }),
      ]);
      setResumen(res);
      if (Array.isArray(lista) && lista.length > 0) {
        setTiendas(lista);
        setTotalRegistros(lista[0]?.total_registros || lista.length);
      } else {
        setTiendas([]);
        setTotalRegistros(0);
      }
    } catch (e) {
      // API no disponible (back-end no corriendo) → mostrar estado vacío
      console.warn("API no disponible, mostrando estado vacío:", e.message);
      setResumen({ total: 0, activas: 0, suspendidas: 0, pendientes: 0, total_productos: 0, total_ventas: 0 });
      setTiendas([]);
      setTotalRegistros(0);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, busqueda, filtroCiudad, ordenar, pagina, porPagina]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ============================================
  // Handlers
  // ============================================
  const handleBusquedaChange = (e) => {
    const val = e.target.value;
    setBusqueda(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPagina(1);
    }, 400);
  };

  const handleLimpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("todas");
    setFiltroCiudad("");
    setOrdenar("recientes");
    setPagina(1);
  };

  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === tiendas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tiendas.map((t) => t.id));
    }
  };

  const handleAccion = (accion, tienda) => {
    switch (accion) {
      case "ver":
        setModalVer({ open: true, id: tienda.id });
        break;
      case "editar":
        // Por ahora redirigimos a ver detalle
        setModalVer({ open: true, id: tienda.id });
        setModalDetalle({ open: true, id: tienda.id, tienda });
        break;
      case "editar":
        setModalDetalle({ open: true, id: tienda.id, tienda });
        break;
      case "productos":
        setModalProductos({ open: true, id: tienda.id, nombre: tienda.nombre });
        break;
      case "estadisticas":
        // Placeholder para futuras estadísticas
        break;
      case "suspender":
        setConfirmAction({
          tipo: "suspender",
          tiendaId: tienda.id,
          tiendaNombre: tienda.nombre,
        });
        break;
      case "reactivar":
        setConfirmAction({
          tipo: "reactivar",
          tiendaId: tienda.id,
          tiendaNombre: tienda.nombre,
        });
        break;
      case "restablecer":
        setConfirmAction({
          tipo: "restablecer",
          tiendaId: tienda.id,
          tiendaNombre: tienda.nombre,
        });
        break;
      case "reenviar":
        // Por ahora reenvía al modal de restablecer con indicación
        setConfirmAction({
          tipo: "restablecer",
          tiendaId: tienda.id,
          tiendaNombre: tienda.nombre,
          reenviar: true,
        });
        break;
      case "eliminar":
        setConfirmAction({
          tipo: "eliminar",
          tiendaId: tienda.id,
          tiendaNombre: tienda.nombre,
        });
        break;
      default:
        break;
    }
  };

  const handleAccionMasiva = (accion) => {
    if (selectedIds.length === 0) return;
    setConfirmAction({
      tipo: accion,
      masivo: true,
      ids: selectedIds,
    });
  };

  const ejecutarConfirmAction = async () => {
    if (!confirmAction) return;
    const { tipo, tiendaId, ids, masivo } = confirmAction;
    const idsAfectar = masivo ? ids : [tiendaId];

    try {
      switch (tipo) {
        case "suspender":
          await Promise.all(idsAfectar.map((id) => cambiarEstadoTienda(id, "suspendida")));
          break;
        case "reactivar":
          await Promise.all(idsAfectar.map((id) => cambiarEstadoTienda(id, "activa")));
          break;
        case "restablecer":
          // Para cada tienda, restablecer con contraseña temporal
          if (!masivo && tiendaId) {
            const tempPwd = "Temp" + Math.random().toString(36).slice(2, 10) + "!";
            await restablecerPasswordTienda(tiendaId, tempPwd);
          }
          break;
        case "eliminar":
          await Promise.all(idsAfectar.map((id) => eliminarTienda(id)));
          break;
        default:
          break;
      }
      setSelectedIds([]);
      setConfirmAction(null);
      cargarDatos();
    } catch (err) {
      console.error("Error en acción:", err);
      setConfirmAction(null);
    }
  };

  const handleCreated = () => {
    cargarDatos();
  };

  // ============================================
  // Configuración del modal de confirmación
  // ============================================
  const getConfirmConfig = () => {
    if (!confirmAction) return null;
    const { tipo, tiendaNombre, masivo, ids } = confirmAction;
    const count = masivo ? ids.length : 1;

    const configs = {
      suspender: {
        icon: Lock,
        title: masivo ? `¿Suspender ${count} tiendas?` : `¿Suspender ${tiendaNombre}?`,
        message: "Al suspender, la tienda no podrá iniciar sesión y sus productos dejarán de mostrarse en el Marketplace. Podrás reactivarla después.",
        confirmText: "Suspender",
        confirmColor: "amber",
      },
      reactivar: {
        icon: Unlock,
        title: masivo ? `¿Reactivar ${count} tiendas?` : `¿Reactivar ${tiendaNombre}?`,
        message: "La tienda podrá acceder nuevamente al sistema y sus productos volverán a mostrarse en el Marketplace.",
        confirmText: "Reactivar",
        confirmColor: "emerald",
      },
      restablecer: {
        icon: RefreshCw,
        title: `¿Restablecer contraseña de ${tiendaNombre}?`,
        message: "Se generará una nueva contraseña temporal para el acceso de la tienda. Deberás comunicarla al responsable.",
        confirmText: "Restablecer",
        confirmColor: "amber",
      },
      eliminar: {
        icon: AlertTriangle,
        title: masivo ? `¿Eliminar ${count} tiendas?` : `¿Eliminar ${tiendaNombre}?`,
        message: "¿Está seguro de eliminar esta Tienda Aliada? Esta acción eliminará el acceso de la tienda al sistema y no podrá deshacerse.",
        confirmText: "Eliminar definitivamente",
        confirmColor: "red",
      },
    };
    return configs[tipo] || null;
  };

  const confirmConfig = getConfirmConfig();

  // Ciudades únicas para el filtro
  const ciudades = [...new Set(tiendas.map((t) => t.ciudad).filter(Boolean))];

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
              <Store size={20} className="text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">Gestión de Tiendas Aliadas</h1>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                Administra todas las tiendas aliadas registradas en la plataforma
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalCrear(true)}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all shadow-sm"
          >
            <Plus size={16} />
            Crear Tienda
          </button>
        </div>
      </div>

      {/* ========== PESTAÑAS: Tiendas | Solicitudes ========== */}
      <div className="flex flex-wrap gap-2 animate-fade-in">
        <button
          onClick={() => setTab("tiendas")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            ${tab === "tiendas"
              ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20"
              : "bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 hover:text-rose-600"}`}
        >
          <Store size={16} /> Tiendas Aliadas
        </button>
        <button
          onClick={() => setTab("solicitudes")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            ${tab === "solicitudes"
              ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20"
              : "bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 hover:text-rose-600"}`}
        >
          <ClipboardList size={16} /> Solicitudes de Tienda
        </button>
      </div>

      {tab === "tiendas" ? (
        <>
      {/* ========== TARJETAS DE RESUMEN ========== */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : resumen ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="animate-fade-in"><StatCard titulo="Total Tiendas" valor={resumen.total} icono={Store} color="rose" /></div>
          <div className="animate-fade-in animation-delay-100"><StatCard titulo="Activas" valor={resumen.activas} icono={CheckCircle} color="emerald" /></div>
          <div className="animate-fade-in animation-delay-200"><StatCard titulo="Suspendidas" valor={resumen.suspendidas} icono={Lock} color="amber" /></div>
          <div className="animate-fade-in animation-delay-300"><StatCard titulo="Pendientes" valor={resumen.pendientes} icono={Clock} color="blue" /></div>
          <div className="animate-fade-in animation-delay-400"><StatCard titulo="Productos" valor={resumen.total_productos} icono={Package} color="violet" /></div>
          <div className="animate-fade-in animation-delay-500"><StatCard titulo="Ventas" valor={resumen.total_ventas} icono={TrendingUp} color="teal" /></div>
        </div>
      ) : null}

      {/* ========== BARRA DE BÚSQUEDA Y FILTROS ========== */}
      <div className="animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm">
          {/* Fila superior: búsqueda y acciones */}
          <div className="p-3 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={handleBusquedaChange}
                placeholder="Buscar por nombre, correo, ciudad o responsable..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
              {busqueda && (
                <button onClick={() => { setBusqueda(""); setPagina(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltrosVisibles(!filtrosVisibles)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  filtrosVisibles || filtroEstado !== "todas" || filtroCiudad || ordenar !== "recientes"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                    : "bg-gray-50 text-gray-600 dark:bg-dark-border dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border/80"
                }`}
              >
                <SlidersHorizontal size={14} />
                Filtros
              </button>
              <button
                onClick={() => setModalCrear(true)}
                className="sm:hidden px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Fila de filtros expandibles */}
          {filtrosVisibles && (
            <div className="px-3 pb-3 border-t border-gray-100 dark:border-dark-border pt-3 animate-slide-down">
              <div className="flex flex-wrap gap-3">
                {/* Filtro por estado */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary">Estado:</label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
                    className="px-3 py-2 text-xs bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="todas">Todas</option>
                    <option value="activa">Activas</option>
                    <option value="suspendida">Suspendidas</option>
                    <option value="pendiente">Pendientes</option>
                  </select>
                </div>

                {/* Filtro por ciudad */}
                {ciudades.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary">Ciudad:</label>
                    <select
                      value={filtroCiudad}
                      onChange={(e) => { setFiltroCiudad(e.target.value); setPagina(1); }}
                      className="px-3 py-2 text-xs bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    >
                      <option value="">Todas</option>
                      {ciudades.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Ordenar */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary">Ordenar:</label>
                  <select
                    value={ordenar}
                    onChange={(e) => { setOrdenar(e.target.value); setPagina(1); }}
                    className="px-3 py-2 text-xs bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="recientes">Más recientes</option>
                    <option value="antiguas">Más antiguas</option>
                    <option value="nombre_asc">Nombre A-Z</option>
                    <option value="nombre_desc">Nombre Z-A</option>
                  </select>
                </div>

                {/* Limpiar filtros */}
                <button
                  onClick={handleLimpiarFiltros}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                >
                  <X size={12} />
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== BARRA DE ACCIONES MASIVAS ========== */}
      {selectedIds.length > 0 && (
        <div className="animate-slide-down bg-white dark:bg-dark-card rounded-2xl border border-rose-200 dark:border-rose-500/30 shadow-sm p-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-dark-text">
            <span className="font-bold text-rose-600">{selectedIds.length}</span> tienda(s) seleccionada(s)
          </p>
          <div className="flex gap-2">
            <button onClick={() => handleAccionMasiva("suspender")} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
              Suspender
            </button>
            <button onClick={() => handleAccionMasiva("reactivar")} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
              Reactivar
            </button>
            <button onClick={() => handleAccionMasiva("eliminar")} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* ========== LISTA DE TIENDAS ========== */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <SkeletonStoreCard />
            </div>
          ))}
        </div>
      ) : tiendas.length === 0 ? (
        <EmptyState onCrear={() => setModalCrear(true)} />
      ) : (
        <>
          {/* Checkbox "Seleccionar todo" + contador */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.length === tiendas.length && tiendas.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-rose-500 focus:ring-rose-500/30 accent-rose-500 cursor-pointer"
            />
            <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
              {selectedIds.length > 0 ? `${selectedIds.length} seleccionados` : "Seleccionar todo"}
            </span>
          </div>

          {/* Vista Desktop */}
          <div className="hidden sm:block space-y-2">
            {tiendas.map((tienda, i) => (
              <div key={tienda.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <StoreCard
                  tienda={tienda}
                  selected={selectedIds.includes(tienda.id)}
                  onSelect={handleSelect}
                  onAction={handleAccion}
                  menuOpen={menuOpen}
                  onMenuToggle={setMenuOpen}
                />
              </div>
            ))}
          </div>

          {/* Vista Mobile */}
          <div className="sm:hidden space-y-3">
            {tiendas.map((tienda, i) => (
              <div key={tienda.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <StoreCardMobile
                  tienda={tienda}
                  selected={selectedIds.includes(tienda.id)}
                  onSelect={handleSelect}
                  onAction={handleAccion}
                  menuOpen={menuOpen}
                  onMenuToggle={setMenuOpen}
                />
              </div>
            ))}
          </div>

          {/* Paginación */}
          <Paginacion
            pagina={pagina}
            totalRegistros={totalRegistros}
            porPagina={porPagina}
            onPageChange={setPagina}
          />
        </>
      )}
        </>
      ) : (
        <SolicitudesTiendas />
      )}

      {/* ========== MODALES ========== */}

      {/* Modal Crear Tienda */}
      <ModalCrearTienda
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        onCreated={handleCreated}
      />

      {/* Modal Detalle Completo */}
      <ModalDetalleCompleto
        isOpen={modalDetalle.open}
        onClose={() => setModalDetalle({ open: false, id: null, tienda: null })}
        tiendaId={modalDetalle.id}
        tienda={modalDetalle.tienda}
        onAction={handleAccion}
      />

      {/* Modal Productos */}
      <ModalProductosTienda
        isOpen={modalProductos.open}
        onClose={() => setModalProductos({ open: false, id: null, nombre: "" })}
        tiendaId={modalProductos.id}
        tiendaNombre={modalProductos.nombre}
      />

      {/* Modal Confirmación */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={ejecutarConfirmAction}
          title={confirmConfig.title}
          message={confirmConfig.message}
          icon={confirmConfig.icon}
          confirmText={confirmConfig.confirmText}
          confirmColor={confirmConfig.confirmColor}
        />
      )}
    </div>
  );
}
