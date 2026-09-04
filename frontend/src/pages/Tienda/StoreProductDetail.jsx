import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Package, ArrowLeft, Eye, EyeOff, Star, DollarSign, ShoppingCart,
  Calendar, BarChart3, Loader2, Plus, Minus, Check, Trash2,
} from "lucide-react";
import {
  obtenerMiProducto, actualizarMiProducto, actualizarStockMiProducto, eliminarMiProducto,
} from "../../api/tienda";
import { listarResenas } from "../../api/productos";
import { useStore } from "../../context/StoreContext";
import ConfirmModal from "../../components/ConfirmModal";
import { parsePrecio } from "../../utils/price";

export default function StoreProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tienePermiso } = useStore();

  const puedeEliminar = tienePermiso("productos.eliminar");
  const puedeStock = tienePermiso("inventario.actualizar_stock");
  const puedeActivar = tienePermiso("productos.activar");
  const puedeDesactivar = tienePermiso("productos.desactivar");

  const [product, setProduct] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockDraft, setStockDraft] = useState(null);
  const [stockSaving, setStockSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cargar = async () => {
    try {
      const p = await obtenerMiProducto(id);
      setProduct({
        ...p,
        estado: p.activo ? "visible" : "oculto",
        calificacion: Number(p.rating) || 0,
        vendidos: p.ventas || 0,
        tallas: p.tallas ? String(p.tallas).split(",").map((s) => s.trim()).filter(Boolean) : [],
        colores: p.colores ? String(p.colores).split(",").map((s) => s.trim()).filter(Boolean) : [],
        precio: parsePrecio(p.precio),
      });
      setStockDraft(p.stock ?? 0);
      const rs = await listarResenas(id).catch(() => []);
      setResenas(rs || []);
    } catch (e) {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [id]);

  const toggleVisible = async () => {
    const nuevoActivo = !product.activo;
    setProduct((prev) => ({ ...prev, activo: nuevoActivo, estado: nuevoActivo ? "visible" : "oculto" }));
    try { await actualizarMiProducto(id, { activo: nuevoActivo }); } catch (e) { cargar(); }
  };

  const ajustarStock = (delta) => {
    setStockDraft((prev) => Math.max(0, (prev ?? product.stock) + delta));
  };

  const guardarStock = async () => {
    if (!puedeStock || stockSaving || stockDraft === product.stock) return;
    if (!Number.isInteger(stockDraft) || stockDraft < 0) return;
    setStockSaving(true);
    try {
      const actualizado = await actualizarStockMiProducto(id, stockDraft);
      setProduct((prev) => ({ ...prev, stock: actualizado?.stock ?? stockDraft }));
      setStockDraft(actualizado?.stock ?? stockDraft);
    } catch (e) {
      cargar();
    } finally {
      setStockSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await eliminarMiProducto(id);
      navigate("/tienda/productos");
    } catch (e) {
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando producto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package size={64} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Producto no encontrado</h2>
        <p className="text-gray-500 mt-2">El producto que buscas no existe o no es de tu tienda.</p>
        <Link to="/tienda/productos" className="inline-flex items-center gap-2 mt-4 text-rose-500 hover:text-rose-600 font-medium">
          <ArrowLeft size={16} /> Volver a productos
        </Link>
      </div>
    );
  }

  const detalles = [
    { label: "Marca", value: product.marca || "-" },
    { label: "Categoría", value: product.categoria || "-" },
    { label: "Material", value: product.material || "-" },
    { label: "Calidad", value: product.calidad || "-" },
    { label: "Fecha publicación", value: product.creado_en ? new Date(product.creado_en).toLocaleDateString("es-CO") : "-" },
  ];

  const colorStock = (stock) =>
    stock === 0 ? "text-red-500" : stock <= 5 ? "text-amber-500" : "text-emerald-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/tienda/productos" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">{product.nombre}</h1>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">{product.categoria}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Product Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {product.imagen_url || (product.imagenes && product.imagenes[0]?.url) ? (
                <img
                  src={product.imagen_url || product.imagenes[0].url}
                  alt={product.nombre}
                  className="w-full sm:w-48 h-48 object-cover rounded-xl flex-shrink-0 border border-gray-100 dark:border-dark-border"
                />
              ) : (
                <div className="w-full sm:w-48 h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-border rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={64} className="text-gray-300 dark:text-gray-600" />
                </div>
              )}
              <div className="flex-1 space-y-4">
                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${product.estado === "visible" ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-500"}`}>
                  {product.estado === "visible" ? "Visible" : "Oculto"}
                </span>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{product.descripcion || product.descripcion_larga || "Sin descripción"}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Precio</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">${product.precio.toLocaleString("es-CO")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Stock</p>
                    <p className={`text-lg font-bold ${colorStock(product.stock)}`}>
                      {product.stock} unidades
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Detalles del Producto</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {detalles.map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-dark-text mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            {product.tallas?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2">Tallas disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {product.tallas.map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-dark-bg text-xs font-medium text-gray-700 dark:text-dark-text">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {product.colores?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">Colores disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {product.colores.map((c) => (
                    <span key={c} className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-dark-bg text-xs font-medium text-gray-700 dark:text-dark-text">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Valoraciones reales */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Valoraciones</h3>
              {resenas.length > 0 && (
                <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  {product.calificacion} ({resenas.length})
                </span>
              )}
            </div>
            {resenas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay valoraciones aún</p>
            ) : (
              <div className="space-y-3">
                {resenas.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-dark-text">{r.usuario_nombre}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((sVal) => (
                          <Star key={sVal} size={12} className={sVal <= r.calificacion ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"} />
                        ))}
                      </div>
                    </div>
                    {r.comentario && (
                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{r.comentario}</p>
                    )}
                    {r.creada_en && (
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(r.creada_en).toLocaleDateString("es-CO")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right - Stats & Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-rose-500" /> Estadísticas
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                <div className="flex items-center gap-2"><ShoppingCart size={14} className="text-blue-500" /><span className="text-xs text-gray-500">Vendidos</span></div>
                <span className="text-sm font-bold text-gray-900 dark:text-dark-text">{product.vendidos}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                <div className="flex items-center gap-2"><DollarSign size={14} className="text-emerald-500" /><span className="text-xs text-gray-500">Ingresos estimados</span></div>
                <span className="text-sm font-bold text-gray-900 dark:text-dark-text">${(product.vendidos * product.precio).toLocaleString("es-CO")}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                <div className="flex items-center gap-2"><Star size={14} className="text-amber-500" /><span className="text-xs text-gray-500">Calificación</span></div>
                <span className="text-sm font-bold text-gray-900 dark:text-dark-text">{product.calificacion}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-bg">
                <div className="flex items-center gap-2"><Calendar size={14} className="text-purple-500" /><span className="text-xs text-gray-500">Publicado</span></div>
                <span className="text-sm font-bold text-gray-900 dark:text-dark-text">
                  {product.creado_en ? new Date(product.creado_en).toLocaleDateString("es-CO", { month: "short", day: "numeric" }) : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Acciones</h3>
            <div className="space-y-2">
              {(puedeActivar || puedeDesactivar) && (
                <button onClick={toggleVisible}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                  {product.estado === "visible" ? <EyeOff size={16} /> : <Eye size={16} />}
                  {product.estado === "visible" ? "Ocultar producto" : "Mostrar producto"}
                </button>
              )}
              {puedeEliminar && (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <Trash2 size={16} /> Eliminar producto
                </button>
              )}
            </div>

            {puedeStock && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-border">
                <p className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-2">Ajustar stock</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => ajustarStock(-1)}
                    disabled={stockSaving || (stockDraft ?? 0) <= 0}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-dark-border text-gray-500 hover:text-white hover:bg-rose-500 hover:border-rose-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                    title="Disminuir stock"
                  >
                    <Minus size={15} />
                  </button>
                  <span className={`flex-1 text-center text-base font-bold tabular-nums ${colorStock(stockDraft ?? 0)}`}>{stockDraft ?? 0}</span>
                  <button
                    onClick={() => ajustarStock(1)}
                    disabled={stockSaving}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-dark-border text-gray-500 hover:text-white hover:bg-emerald-500 hover:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                    title="Aumentar stock"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    onClick={guardarStock}
                    disabled={stockSaving || stockDraft === product.stock}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Guardar stock"
                  >
                    {stockSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        type="warning"
        title="Eliminar producto"
        message={`¿Seguro que deseas eliminar "${product.nombre}"? Pasará a Borradores y se eliminará definitivamente a los 30 días. Podrás restaurarlo mientras tanto.`}
        confirmText="Mover a Borradores"
      />
    </div>
  );
}
