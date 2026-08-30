import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Package, PlusCircle, Search, Star, Grid3X3, List, Loader2,
  ChevronRight, TrendingUp, Eye, EyeOff,
} from "lucide-react";
import { misProductosTienda } from "../../api/tienda";
import { getCategoriasProducto } from "../../api/catalogos";
import { useStore } from "../../context/StoreContext";
import ProductSelectionModal from "../../components/ProductSelectionModal";
import { parsePrecio } from "../../utils/price";

// Normaliza un producto del backend a la forma que usa esta vista.
const mapProducto = (p) => ({
  id: p.id,
  nombre: p.nombre,
  categoria: p.categoria || "",
  precio: parsePrecio(p.precio),
  stock: p.stock ?? 0,
  estado: p.activo ? "visible" : "oculto",
  calificacion: Number(p.rating) || 0,
  vendidos: p.ventas || 0,
  // Imagen persistente de Cloudinary (producto_imagenes) devuelta por la API.
  imagen: p.imagen_url || (p.imagenes && p.imagenes[0]?.url) || null,
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

export default function StoreProducts() {
  const { tienePermiso } = useStore();
  const navigate = useNavigate();
  const puedeCrear = tienePermiso("productos.crear");

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [vista, setVista] = useState("grid");
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Carga el catálogo desde la BD. Al volver del detalle o del formulario de
  // edición, este componente se remonta y vuelve a cargar (UI siempre fresca).
  const cargar = async () => {
    setLoading(true);
    const inicio = Date.now();
    try {
      const data = await misProductosTienda();
      setProductos((data || []).map(mapProducto));
    } catch {
      setProductos([]);
    } finally {
      // Asegura que "Cargando productos..." sea visible al menos un instante,
      // aunque la respuesta del servidor sea inmediata.
      const restante = 400 - (Date.now() - inicio);
      setTimeout(() => setLoading(false), restante > 0 ? restante : 0);
    }
  };

  useEffect(() => {
    cargar();
    getCategoriasProducto().then(setCategorias).catch(() => setCategorias([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = productos.filter((p) => {
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
    if (estadoFiltro && p.estado !== estadoFiltro) return false;
    return true;
  });

  const colorStock = (stock) =>
    stock === 0 ? "text-red-500" : stock <= 5 ? "text-amber-500" : "text-emerald-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Productos</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            Haz clic en un producto para ver su detalle, editar su información, ajustar el stock o gestionar su disponibilidad.
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
          >
            <PlusCircle size={16} />
            Nuevo Producto
          </button>
        )}
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
            <Link
              key={product.id}
              to={`/tienda/productos/${product.id}`}
              className="group bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all duration-300 flex flex-col"
            >
              {/* Encabezado con imagen */}
              <div className="relative h-36 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-dark-bg dark:via-dark-border/60 dark:to-dark-border flex items-center justify-center overflow-hidden">
                {product.imagen ? (
                  <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <Package size={48} className="text-rose-200 dark:text-gray-600 group-hover:scale-110 transition-transform duration-300" />
                )}
                <div className="absolute top-3 right-3">
                  <StatusBadge estado={product.estado} />
                </div>
              </div>

              {/* Cuerpo */}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-dark-text line-clamp-2 group-hover:text-rose-500 transition-colors">
                    {product.nombre}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{product.categoria || "Sin categoría"}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-dark-text">
                    ${product.precio.toLocaleString("es-CO")}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    {product.calificacion}
                  </div>
                </div>

                {/* Stock (solo lectura; la edición se hace en el detalle) */}
                <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border px-2.5 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary">Stock</span>
                  <span className={`text-sm font-bold tabular-nums ${colorStock(product.stock)}`}>
                    {product.stock} uds
                  </span>
                </div>

                {/* Pie de tarjeta */}
                <div className="flex items-center justify-between pt-2 mt-auto border-t border-gray-100 dark:border-dark-border">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <TrendingUp size={12} />
                    {product.vendidos} vendidos
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                    Ver detalle <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Precio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Vendidos</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate(`/tienda/productos/${product.id}`)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-border transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center">
                          <Package size={16} className="text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">{product.nombre}</p>
                          <p className="text-xs text-gray-400">{product.categoria}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-dark-text">${product.precio.toLocaleString("es-CO")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold tabular-nums ${colorStock(product.stock)}`}>{product.stock}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge estado={product.estado} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.vendidos}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500">
                        Detalle <ChevronRight size={14} />
                      </span>
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
          <p className="text-sm text-gray-500 mt-1">{puedeCrear ? "Crea tu primer producto para empezar a vender." : "Aún no hay productos en tu tienda."}</p>
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
