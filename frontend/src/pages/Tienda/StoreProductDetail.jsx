import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Package, ArrowLeft, Edit3, Eye, EyeOff, Star, DollarSign, ShoppingCart,
  Calendar, BarChart3, Loader2,
} from "lucide-react";
import { obtenerMiProducto, actualizarMiProducto } from "../../api/tienda";
import { listarResenas } from "../../api/productos";

export default function StoreProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(true);

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
        precio: Number(p.precio) || 0,
      });
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
        <Link to={`/tienda/productos/editar/${product.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all">
          <Edit3 size={16} /> Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Product Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-48 h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-border rounded-xl flex items-center justify-center flex-shrink-0">
                <Package size={64} className="text-gray-300 dark:text-gray-600" />
              </div>
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
                    <p className={`text-lg font-bold ${product.stock === 0 ? "text-red-500" : product.stock <= 5 ? "text-amber-500" : "text-emerald-600"}`}>
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
              <Link to={`/tienda/productos/editar/${product.id}`}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                <Edit3 size={16} /> Editar producto
              </Link>
              <button onClick={toggleVisible}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                {product.estado === "visible" ? <EyeOff size={16} /> : <Eye size={16} />}
                {product.estado === "visible" ? "Ocultar producto" : "Mostrar producto"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
