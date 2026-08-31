import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { actualizarProducto } from "../../api/productos";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Package, Store, Search, X,
  Eye, Edit3, ExternalLink, EyeOff, Flag, Trash2, ChevronLeft, ChevronRight,
  Heart, Share2, ImageIcon, Star, Loader2,
  Building2, RefreshCw, BarChart3,
  ShoppingBag,
} from "lucide-react";
import { listarProductos as listarProductosAdmin, eliminarProducto as eliminarProductoAdmin } from "../../api/admin";
import { getResumenTiendas } from "../../api/tiendas";
import { parsePrecio } from "../../utils/price";

// Normaliza un producto del backend admin a la forma que usa esta vista.
const mapProdAdmin = (p) => ({
  id: p.id,
  nombre: p.nombre,
  categoria: p.categoria || "",
  precio: parsePrecio(p.precio),
  stock: p.stock ?? 0,
  estado: p.activo ? "visible" : "oculto",
  tipo_vendedor: p.tipo_vendedor === "Tienda" ? "tienda" : "refugio",
  vendedor_nombre: p.vendedor || "—",
  fecha: p.creado_en ? new Date(p.creado_en).toLocaleDateString("es-CO") : "—",
  reportes: 0,
  favoritos: 0,
  compartidos: 0,
  visitas: 0,
  rating: null,
  vendedor_productos: 0,
  imagen: null,
});

// ========================================================
// CONSTANTES
// ========================================================
const TIPO_VENDEDOR = {
  refugio: { label: "Refugio", icon: Building2, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  tienda: { label: "Tienda Aliada", icon: Store, color: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
};

// ========================================================
// COMPONENTE: Badge de estado
// ========================================================
function EstadoBadge({ estado }) {
  const config = {
    visible: { bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500", label: "Visible" },
    pausado: { bg: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500", label: "Pausado" },
    oculto: { bg: "bg-gray-100 text-gray-500 dark:bg-dark-border dark:text-dark-text-secondary", dot: "bg-gray-400", label: "Oculto" },
  };
  const c = config[estado] || config.visible;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ========================================================
// COMPONENTE: Badge de tipo vendedor
// ========================================================
function TipoVendedorBadge({ tipo }) {
  const c = TIPO_VENDEDOR[tipo] || TIPO_VENDEDOR.refugio;
  const Icono = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${c.color}`}>
      <Icono size={11} />
      {c.label}
    </span>
  );
}

// ========================================================
// COMPONENTE: Paginación
// ========================================================
function Pagination({ pagina, total, porPagina, onPageChange }) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total > 0 ? (pagina - 1) * porPagina + 1 : 0;
  const hasta = Math.min(pagina * porPagina, total);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-dark-text-secondary">Filas por página:</span>
        <select
          value={porPagina}
          onChange={(e) => onPageChange(Number(e.target.value), true)}
          className="px-2 py-1.5 text-xs bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
        >
          {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
          {total > 0
            ? <><span className="font-medium text-gray-700 dark:text-dark-text">{desde}</span>–<span className="font-medium text-gray-700 dark:text-dark-text">{hasta}</span> de <span className="font-medium text-gray-700 dark:text-dark-text">{total}</span></>
            : "Sin resultados"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(pagina - 1)} disabled={pagina <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
          let p;
          if (totalPaginas <= 5) p = i + 1;
          else if (pagina <= 3) p = i + 1;
          else if (pagina >= totalPaginas - 2) p = totalPaginas - 4 + i;
          else p = pagina - 2 + i;
          return (
            <button key={p} onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pagina === p ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-border"}`}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onPageChange(pagina + 1)} disabled={pagina >= totalPaginas}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: Modal de Detalle del Producto
// ========================================================
function ModalProducto({ isOpen, onClose, producto, onToggleEstado, onEliminar }) {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", precio: "", stock: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (producto) {
      setForm({
        nombre: producto.nombre || "",
        precio: String(producto.precio || ""),
        stock: String(producto.stock ?? ""),
      });
    }
    if (!isOpen) {
      setEditando(false);
      setGuardando(false);
      setError("");
    }
  }, [producto, isOpen]);

  if (!isOpen || !producto) return null;

  const tipoVen = producto?.tipo_vendedor === "tienda" ? "tienda" : "refugio";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardar = async () => {
    setError("");
    const precioNum = parsePrecio(form.precio);
    const stockNum = parseInt(form.stock, 10);
    if (!form.nombre.trim()) return setError("El nombre es obligatorio");
    if (isNaN(precioNum) || precioNum < 0) return setError("Precio inválido");
    if (isNaN(stockNum) || stockNum < 0) return setError("Stock inválido");

    setGuardando(true);
    try {
      const payload = { nombre: form.nombre.trim(), precio: precioNum, stock: stockNum };
      await actualizarProducto(producto.id, payload);
      producto.nombre = payload.nombre;
      producto.precio = payload.precio;
      producto.stock = payload.stock;
      setEditando(false);
    } catch (err) {
      setError(err.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    setForm({
      nombre: producto.nombre || "",
      precio: String(producto.precio || ""),
      stock: String(producto.stock ?? ""),
    });
    setError("");
    setEditando(false);
  };

  const handleEliminar = () => {
    if (window.confirm(`¿Eliminar "${producto.nombre}"?`)) {
      onEliminar(producto.id);
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-modal-overlay" />
      <div className="relative w-full max-w-3xl max-h-full flex flex-col bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border animate-modal-content overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/30 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Package size={15} className="text-rose-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-dark-text truncate leading-tight">{producto.nombre}</h2>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate leading-tight">{producto.categoria || "Sin categoría"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <EstadoBadge estado={producto.estado} />
            <TipoVendedorBadge tipo={tipoVen} />
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-dark-border dark:hover:text-dark-text-secondary transition-colors ml-1">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ===== BODY: Image + Stats (izq) | Info (der) ===== */}
        <div className="overflow-y-auto flex-1">
        <div className="p-5">
          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-5">
            {/* ===== COLUMNA IZQUIERDA: Imagen ===== */}
            <div className="w-full sm:w-[220px] flex-shrink-0 flex flex-col gap-3">
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-border shadow-sm">
                {producto.imagen ? (
                  <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <ImageIcon size={36} className="text-gray-300 dark:text-dark-border" />
                    <span className="text-[10px] text-gray-400 dark:text-dark-text-secondary">Sin imagen</span>
                  </div>
                )}
              </div>
            </div>

            {/* ===== COLUMNA DERECHA: Información del producto ===== */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {/* Precio - destacado */}
              <div className="bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 rounded-xl px-4 py-3 border border-gray-100 dark:border-dark-border">
                <p className="text-xs font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Precio</p>
                {editando ? (
                  <input name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={handleChange}
                    className="w-full text-2xl font-bold bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 dark:text-dark-text mt-1">${Number(producto.precio).toLocaleString("es-CO")}</p>
                )}
              </div>

              {/* Nombre editable */}
              {editando && (
                <div className="bg-gray-50 dark:bg-dark-bg rounded-xl px-4 py-3 border border-gray-100 dark:border-dark-border">
                  <p className="text-[9px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Nombre</p>
                  <input name="nombre" value={form.nombre} onChange={handleChange}
                    className="w-full text-sm font-bold bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1.5 mt-1 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" />
                </div>
              )}

              {/* Grid: Stock | Publicación | Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-gray-50 dark:bg-dark-bg rounded-xl px-3.5 py-3 border border-gray-100 dark:border-dark-border">
                  <p className="text-xs font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Stock</p>
                  {editando ? (
                    <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange}
                      className="w-full text-base font-bold bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" />
                  ) : (
                    <p className={`text-base font-bold mt-1 ${producto.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{producto.stock || 0}</p>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-dark-bg rounded-xl px-3.5 py-3 border border-gray-100 dark:border-dark-border">
                  <p className="text-xs font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Categoría</p>
                  <p className="text-base font-bold text-gray-900 dark:text-dark-text mt-1 truncate">{producto.categoria || "—"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-bg rounded-xl px-3.5 py-3 border border-gray-100 dark:border-dark-border">
                  <p className="text-xs font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Publicación</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-dark-text mt-1">{producto.fecha || "—"}</p>
                </div>
              </div>

              {/* Vendedor */}
              <div className="bg-gradient-to-r from-rose-50/50 to-amber-50/50 dark:from-rose-500/5 dark:to-amber-500/5 rounded-xl px-4 py-3 border border-gray-100 dark:border-dark-border">
                <p className="text-xs font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider mb-2">Vendedor</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center text-sm font-bold text-rose-600 dark:text-rose-400 flex-shrink-0 shadow-sm">
                    {(producto.vendedor_nombre || "V")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-base font-bold text-gray-900 dark:text-dark-text truncate">{producto.vendedor_nombre}</p>
                      <TipoVendedorBadge tipo={tipoVen} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-dark-text-secondary flex items-center gap-1"><Star size={11} className="text-amber-500" /> {producto.rating || "—"}</span>
                      <span className="text-xs text-gray-500 dark:text-dark-text-secondary flex items-center gap-1"><Package size={11} className="text-gray-400" /> {producto.vendedor_productos || 0} productos</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1 border border-gray-200 dark:border-dark-border flex-shrink-0">
                    <ExternalLink size={11} /> Perfil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== ESTADÍSTICAS ===== */}
        <div className="border-t border-gray-100 dark:border-dark-border px-5 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-dark-card shadow-sm">
                <Eye size={15} className="text-blue-600" />
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-dark-text leading-none">{producto.visitas || 0}</p>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 leading-none">Visitas</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-dark-card shadow-sm">
                <Heart size={15} className="text-rose-600" />
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-dark-text leading-none">{producto.favoritos || 0}</p>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 leading-none">Favoritos</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-dark-card shadow-sm">
                <Flag size={15} className={producto.reportes > 0 ? "text-red-600" : "text-gray-400"} />
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-dark-text leading-none">{producto.reportes || 0}</p>
              <p className="text-xs font-medium text-red-600 dark:text-red-400 leading-none">Reportes</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-dark-card shadow-sm">
                <Share2 size={15} className="text-violet-600" />
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-dark-text leading-none">{producto.compartidos || 0}</p>
              <p className="text-xs font-medium text-violet-600 dark:text-violet-400 leading-none">Compartido</p>
            </div>
          </div>
        </div>

        {/* ===== ACCIONES ===== */}
        <div className="border-t border-gray-100 dark:border-dark-border px-5 py-3">
          {editando ? (
            <div className="flex gap-2">
              <button onClick={handleCancelar} disabled={guardando}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 dark:bg-dark-border dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={guardando}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all disabled:opacity-50 shadow-sm">
                {guardando ? "Guardando..." : <><Edit3 size={14} /> Guardar</>}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button onClick={() => setEditando(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                <Edit3 size={14} /> Editar
              </button>
              <button onClick={onToggleEstado}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors">
                {producto.estado === "oculto" ? <RefreshCw size={14} /> : <EyeOff size={14} />}
                {producto.estado === "oculto" ? "Publicar" : "Ocultar"}
              </button>
              <button
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                <Flag size={14} /> Reportes
              </button>
              <button onClick={handleEliminar}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 dark:bg-dark-border dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ========================================================
// COMPONENTE PRINCIPAL: Vista de Productos
// ========================================================
function VistaProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [modalProducto, setModalProducto] = useState(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await listarProductosAdmin();
        if (!activo) return;
        setProductos((data || []).map(mapProdAdmin));
      } catch (e) {
        if (activo) setProductos([]);
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];

  const filtrados = productos.filter((p) => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!p.nombre?.toLowerCase().includes(q) && !p.vendedor_nombre?.toLowerCase().includes(q)) return false;
    }
    if (filtroTipo !== "todos" && p.tipo_vendedor !== filtroTipo) return false;
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
    if (filtroCategoria !== "todos" && p.categoria !== filtroCategoria) return false;
    return true;
  });

  const total = filtrados.length;
  const paginados = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  const handlePageChange = (p, changePageSize) => {
    if (changePageSize) {
      setPorPagina(p);
    }
    setPagina(changePageSize ? 1 : p);
  };

  const handleToggleEstado = (id) => {
    setProductos((prev) => prev.map((p) =>
      p.id === id ? { ...p, estado: p.estado === "oculto" ? "visible" : "oculto" } : p
    ));
  };

  const handleEliminar = async (id) => {
    try {
      await eliminarProductoAdmin(id);
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      // noop
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-dark-border rounded-2xl w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-dark-border rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={busqueda} onChange={(e) => {
              setBusqueda(e.target.value);
              if (searchTimeout.current) clearTimeout(searchTimeout.current);
              searchTimeout.current = setTimeout(() => setPagina(1), 300);
            }} placeholder="Buscar productos o vendedor..." className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1); }}
              className="px-3 py-2.5 text-xs bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="todos">Todos</option>
              <option value="refugio">Refugios</option>
              <option value="tienda">Tiendas</option>
            </select>
            <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
              className="px-3 py-2.5 text-xs bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="todos">Estados</option>
              <option value="visible">Visible</option>
              <option value="pausado">Pausado</option>
              <option value="oculto">Oculto</option>
            </select>
            <select value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }}
              className="px-3 py-2.5 text-xs bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20">
              <option value="todos">Categorías</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      {paginados.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border">
          <Package size={48} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">No se encontraron productos</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
          {/* Tabla con grid para perfecta alineación */}
          <div className="hidden lg:grid grid-cols-[2fr_1fr_0.6fr_1.5fr_1fr_1fr_1fr_1.8fr] gap-3 px-6 py-3.5 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/30">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Producto</span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Precio</span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider text-center">Stock</span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Vendedor</span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Tipo</span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider text-center">Estado</span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider text-center">Categoría</span>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider text-right">Acciones</span>
          </div>

          {/* Filas */}
          <div className="divide-y divide-gray-50 dark:divide-dark-border">
            {paginados.map((prod) => (
              <div key={prod.id} className="group lg:grid lg:grid-cols-[2fr_1fr_0.6fr_1.5fr_1fr_1fr_1fr_1.8fr] lg:gap-3 px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-dark-bg/30 transition-colors duration-150">
                {/* Nombre producto */}
                <div className="flex items-center min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    {prod.nombre}
                  </p>
                </div>

                {/* Precio */}
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 lg:hidden font-medium mr-1">Precio:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-dark-text">${Number(prod.precio).toLocaleString("es-CO")}</span>
                </div>

                {/* Stock */}
                <div className="flex items-center justify-center lg:justify-center">
                  <span className="text-xs text-gray-400 lg:hidden font-medium mr-1">Stock:</span>
                  <span className={`text-sm font-semibold ${prod.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    {prod.stock || 0}
                  </span>
                </div>

                {/* Vendedor */}
                <div className="flex items-center min-w-0">
                  <span className="text-xs text-gray-400 lg:hidden font-medium mr-1">Vendedor:</span>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center text-[9px] font-bold text-rose-600 dark:text-rose-400 flex-shrink-0 mr-2">
                    {(prod.vendedor_nombre || "V")[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-text truncate">{prod.vendedor_nombre}</span>
                </div>

                {/* Tipo */}
                <div className="flex items-center">
                  <TipoVendedorBadge tipo={prod.tipo_vendedor || "refugio"} />
                </div>

                {/* Estado */}
                <div className="flex items-center justify-center lg:justify-center">
                  <EstadoBadge estado={prod.estado || "visible"} />
                </div>

                {/* Categoría */}
                <div className="flex items-center justify-center lg:justify-center">
                  <span className="text-xs text-gray-400 lg:hidden font-medium mr-1">Cat:</span>
                  <span className="text-sm text-gray-500 dark:text-dark-text-secondary">{prod.categoria || "—"}</span>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => setModalProducto(prod)} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Ver detalles">
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paginación */}
      <Pagination pagina={pagina} total={total} porPagina={porPagina} onPageChange={handlePageChange} />

      {/* Modal de detalle */}
      <ModalProducto
        isOpen={!!modalProducto}
        onClose={() => setModalProducto(null)}
        producto={modalProducto}
        onToggleEstado={() => handleToggleEstado(modalProducto?.id)}
        onEliminar={handleEliminar}
      />
    </div>
  );
}

// ========================================================
// COMPONENTE: Tiendas Aliadas (vista simplificada)
// ========================================================
function VistaTiendas() {
  return (
    <div className="text-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border">
      <ShoppingBag size={48} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
      <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">Gestión de Tiendas Aliadas</h3>
      <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6 max-w-md mx-auto">
          Administra las tiendas aliadas desde la sección dedicada en el menú lateral.
      </p>
      <button onClick={() => window.location.href = "/admin/tiendas"} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all shadow-sm">
          Ir a Tiendas Aliadas
      </button>
    </div>
  );
}

// ========================================================
// COMPONENTE: Estadísticas (datos reales del marketplace)
// ========================================================
function VistaEstadisticas() {
  const [resumen, setResumen] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [res, prods] = await Promise.all([
          getResumenTiendas().catch(() => null),
          listarProductosAdmin().catch(() => []),
        ]);
        if (!activo) return;
        setResumen(res || {});
        setProductos(Array.isArray(prods) ? prods : []);
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
        <p className="text-sm">Cargando estadísticas del marketplace...</p>
      </div>
    );
  }

  // Productos de tiendas aliadas (el marketplace está asociado a ellas).
  const prodsTienda = productos.filter((p) => p.tipo_vendedor === "Tienda");
  const visibles = prodsTienda.filter((p) => p.activo).length;

  // Distribución por categoría (solo productos visibles de tiendas).
  const porCategoria = {};
  prodsTienda.filter((p) => p.activo).forEach((p) => {
    const cat = p.categoria || "Sin categoría";
    porCategoria[cat] = (porCategoria[cat] || 0) + 1;
  });
  const categorias = Object.entries(porCategoria)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
  const maxCat = Math.max(...categorias.map((c) => c.total), 1);

  const cards = [
    { icon: Package, label: "Productos Totales", value: resumen.total_productos ?? prodsTienda.length, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
    { icon: Eye, label: "Productos Visibles", value: visibles, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { icon: Store, label: "Tiendas Activas", value: resumen.activas ?? 0, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { icon: ShoppingBag, label: "Ventas Totales", value: `$${Number(resumen.total_ventas ?? 0).toLocaleString("es-CO")}`, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon size={20} className={c.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{c.value}</p>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Distribución por categoría */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-rose-500" />
          Distribución por categoría
        </h3>
        {categorias.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorias.map((cat) => (
              <div key={cat.nombre} className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">{cat.nombre}</span>
                  <span className="text-xs text-gray-500 dark:text-dark-text-secondary shrink-0">{cat.total} productos</span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-700"
                    style={{ width: `${Math.max((cat.total / maxCat) * 100, 6)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-dark-text-secondary text-center py-8">
            No hay productos publicados por tiendas aliadas aún.
          </p>
        )}
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE PRINCIPAL: AdminMarketplace
// ========================================================
export default function AdminMarketplace() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathToTab = {
    "/admin/marketplace": "productos",
    "/admin/marketplace/estadisticas": "estadisticas",
  };
  const tabActivo = pathToTab[location.pathname] || "productos";

  const handleTabChange = (tabId) => {
    const routes = {
      productos: "/admin/marketplace",
      tiendas: "/admin/tiendas",
      estadisticas: "/admin/marketplace/estadisticas",
    };
    navigate(routes[tabId] || "/admin/marketplace");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <Store size={20} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">Marketplace</h1>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
              Administra los productos del marketplace
            </p>
          </div>
        </div>
      </div>

      {/* Contenido según subruta */}
      <div className="animate-fade-in" key={tabActivo}>
        {tabActivo === "productos" && <VistaProductos />}
        {tabActivo === "tiendas" && <VistaTiendas />}
        {tabActivo === "estadisticas" && <VistaEstadisticas />}
      </div>
    </div>
  );
}
