import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package, PlusCircle, Search, Edit3, Eye, EyeOff,
  Trash2, Star, Grid3X3, List, MoreHorizontal, Loader2,
} from "lucide-react";
import { misProductosTienda, actualizarMiProducto, eliminarMiProducto } from "../../api/tienda";
import { getCategoriasProducto } from "../../api/catalogos";
import ProductSelectionModal from "../../components/ProductSelectionModal";

// Normaliza un producto del backend a la forma que usa esta vista.
const mapProducto = (p) => ({
  id: p.id,
  nombre: p.nombre,
  categoria: p.categoria || "",
  precio: Number(p.precio) || 0,
  stock: p.stock ?? 0,
  stockMinimo: 0,
  estado: p.activo ? "visible" : "oculto",
  calificacion: Number(p.rating) || 0,
  totalValoraciones: 0,
  vendidos: p.ventas || 0,
});

function StatusBadge({ estado }) {
  const config = {
    visible: { label: "Visible", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    oculto: { label: "Oculto", color: "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" },
  };
  const c = config[estado] || config.visible;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${c.color}`}>
      {estado === "visible" ? <Eye size={12} /> : <EyeOff size={12} />}
      {c.label}
    </span>
  );
}

function StockBadge({ stock }) {
  if (stock === 0) {
    return <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">Agotado</span>;
  }
  if (stock <= 5) {
    return <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">Bajo stock</span>;
  }
  return <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">{stock} uds</span>;
}

export default function StoreProducts() {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [vista, setVista] = useState("grid");
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const cargar = async () => {
    try {
      const data = await misProductosTienda();
      setProductos((data || []).map(mapProducto));
    } catch (e) {
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    getCategoriasProducto().then(setCategorias).catch(() => setCategorias([]));
  }, []);

  const filteredProducts = productos.filter((p) => {
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
    if (estadoFiltro && p.estado !== estadoFiltro) return false;
    return true;
  });

  const toggleDisponibilidad = async (product) => {
    const nuevoActivo = product.estado !== "visible";
    setProductos((prev) => prev.map((p) => p.id === product.id ? { ...p, estado: nuevoActivo ? "visible" : "oculto" } : p));
    try {
      await actualizarMiProducto(product.id, { activo: nuevoActivo });
    } catch (e) { cargar(); }
  };

  const handleEliminar = async (id) => {
    setProductos((prev) => prev.filter((p) => p.id !== id));
    try {
      await eliminarMiProducto(id);
    } catch (e) { cargar(); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Productos</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            Gestiona el catálogo de productos de tu tienda.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
        >
          <PlusCircle size={16} />
          Nuevo Producto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
              ))}
            </select>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            >
              <option value="">Todos los estados</option>
              <option value="visible">Visible</option>
              <option value="oculto">Oculto</option>
            </select>
            <div className="flex bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
              <button onClick={() => setVista("grid")} className={`p-2.5 ${vista === "grid" ? "bg-rose-500 text-white" : "text-gray-400 hover:text-gray-600"}`}>
                <Grid3X3 size={16} />
              </button>
              <button onClick={() => setVista("list")} className={`p-2.5 ${vista === "list" ? "bg-rose-500 text-white" : "text-gray-400 hover:text-gray-600"}`}>
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p>Cargando productos...</p>
        </div>
      ) : vista === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden hover:shadow-lg transition-all group">
              <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-border flex items-center justify-center relative">
                <Package size={48} className="text-gray-300 dark:text-gray-600" />
              </div>
              <div className="p-4 space-y-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/tienda/productos/${product.id}`} className="text-sm font-semibold text-gray-900 dark:text-dark-text hover:text-rose-500 transition-colors line-clamp-2">
                    {product.nombre}
                  </Link>
                  <p className="text-[10px] text-gray-400 mt-0.5">{product.categoria}</p>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-dark-text">
                  ${product.precio.toLocaleString("es-CO")}
                </span>
                <div className="flex items-center justify-between">
                  <StockBadge stock={product.stock} />
                  <StatusBadge estado={product.estado} />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Star size={12} className="text-amber-400" />
                    {product.calificacion}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleDisponibilidad(product)} className={`p-1.5 rounded-lg transition-colors ${product.estado === "visible" ? "text-emerald-500" : "text-gray-400 hover:text-emerald-500"} hover:bg-gray-50`} title={product.estado === "visible" ? "Ocultar" : "Mostrar"}>
                      {product.estado === "visible" ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <Link to={`/tienda/productos/editar/${product.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-50 transition-colors" title="Editar">
                      <Edit3 size={14} />
                    </Link>
                    <button onClick={() => handleEliminar(product.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-50 transition-colors" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Precio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Vendidos</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center">
                          <Package size={16} className="text-gray-400" />
                        </div>
                        <Link to={`/tienda/productos/${product.id}`} className="text-sm font-semibold text-gray-900 dark:text-dark-text hover:text-rose-500">
                          {product.nombre}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.categoria}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-dark-text">${product.precio.toLocaleString("es-CO")}</span>
                    </td>
                    <td className="px-4 py-3"><StockBadge stock={product.stock} /></td>
                    <td className="px-4 py-3"><StatusBadge estado={product.estado} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.vendidos}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleDisponibilidad(product)} className={`p-1.5 rounded-lg ${product.estado === "visible" ? "text-emerald-500" : "text-gray-400"} hover:bg-gray-100`} title={product.estado === "visible" ? "Ocultar" : "Mostrar"}>
                          {product.estado === "visible" ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <Link to={`/tienda/productos/editar/${product.id}`} className="p-1.5 rounded-lg text-blue-500 hover:bg-gray-100" title="Editar">
                          <Edit3 size={14} />
                        </Link>
                        <button onClick={() => handleEliminar(product.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                        <Link to={`/tienda/productos/${product.id}`} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="Ver detalle">
                          <MoreHorizontal size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">No hay productos</h3>
          <p className="text-sm text-gray-500 mt-1">Crea tu primer producto para empezar a vender.</p>
        </div>
      )}

      {/* Modal de selección */}
      <ProductSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
