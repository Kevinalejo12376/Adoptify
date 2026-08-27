import React, { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import ScrollToTop from "../../components/ScrollToTop";
import { listarProductos } from "../../api/productos";
import { formatPrice, precioConDescuento, parsePrecio } from "../../utils/price";
import {
  ShoppingBag,
  Search,
  Filter,
  Heart,
  ShoppingCart,
  Star,
  ChevronDown,
  X,
  Sparkles,
  Package,
  Tag,
  ArrowRight,
  Award,
  CheckCircle,
  ArrowLeft,
  Store as StoreIcon,
  MapPin,
  PawPrint,
  SlidersHorizontal,
  DollarSign,
  Clock,
  TrendingUp,
  ThumbsUp,
  RotateCcw,
  Building2,
  Store as StoreIcon2,
  Loader2,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useFavorites } from "../../context/FavoritesContext";
import {
  categoryIcons,
  categoryColors,
  categories,
  getShelterById,
  getStoreById,
} from "../../data/products";

// Normaliza un producto del backend a la forma que consume esta vista.
const normalizeProducto = (p) => ({
  ...p,
  name: p.nombre,
  category: p.categoria,
  // Descuento: se conserva el precio original y el porcentaje; el precio que
  // se muestra (y se cobra) es el final, calculado con la fuente única.
  descuento: Number(p.descuento) || 0,
  originalPrice: parsePrecio(p.precio),
  price: precioConDescuento(p.precio, p.descuento),
  rating: Number(p.rating) || 0,
  reviews: p.ventas || 0,
  reviews: p.resenas_count || 0,
  description: p.descripcion || "",
  stock: p.stock ?? 0,
  color: categoryColors[p.categoria] || "from-gray-400 to-gray-500",
  shelterId: p.refugio_id,
  storeId: p.tienda_id,
  // Imagen persistente de Cloudinary (producto_imagenes) devuelta por la API.
  image: p.imagen_url || (p.imagenes && p.imagenes[0]?.url) || null,
});

export default function Store() {
  const { shelterId, storeId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sellerType, setSellerType] = useState("all"); // "all" | "shelter" | "store"
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState(""); // "" | "newest" | "popular" | "topRated"
  const [showFilters, setShowFilters] = useState(false);
  const [addedToCart, setAddedToCart] = useState({});
  const { addToCart, cartCount } = useCart();
  const { storeFavorites, toggleStoreFavorite, isStoreFavorite } = useFavorites();

  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Carga los productos reales desde la base de datos.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await listarProductos();
        if (!activo) return;
        setAllProducts((data || []).map(normalizeProducto));
      } catch (e) {
        // lista vacia si falla
      } finally {
        if (activo) setLoadingProducts(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const shelter = shelterId ? getShelterById(shelterId) : null;
  const store = storeId ? getStoreById(storeId) : null;

  // Base products: if shelterId or storeId is present, filter by that seller
  const baseProducts = useMemo(() => {
    if (shelter) return allProducts.filter((p) => p.shelterId === shelter.id);
    if (store) return allProducts.filter((p) => p.storeId === store.id);
    return allProducts;
  }, [allProducts, shelter, store]);

  const filteredProducts = useMemo(() => {
    let result = [...baseProducts];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Seller type filter (only in general store view)
    if (!shelter && !store && sellerType !== "all") {
      result = result.filter((p) =>
        sellerType === "shelter" ? p.shelterId != null : p.storeId != null
      );
    }

    // Price range filter
    if (priceMin !== "") {
      const min = parsePrecio(priceMin);
      if (min > 0) {
        result = result.filter((p) => p.price >= min);
      }
    }
    if (priceMax !== "") {
      const max = parsePrecio(priceMax);
      if (max > 0) {
        result = result.filter((p) => p.price <= max);
      }
    }

    // Sort
    if (sortBy === "newest") {
      result.sort((a, b) => b.id - a.id); // Higher ID = newer
    } else if (sortBy === "popular") {
      result.sort((a, b) => b.reviews - a.reviews);
    } else if (sortBy === "topRated") {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [baseProducts, searchTerm, selectedCategory, sellerType, priceMin, priceMax, sortBy, shelter, store]);

  const handleAddToCart = (product) => {
    addToCart(product);
    setAddedToCart((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedToCart((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  const ShelterIcon = shelter?.icon || StoreIcon;
  const StoreLogo = store?.logo || StoreIcon;

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSellerType("all");
    setPriceMin("");
    setPriceMax("");
    setSortBy("");
  };

  const hasActiveFilters = searchTerm || selectedCategory !== "all" || sellerType !== "all" || priceMin !== "" || priceMax !== "" || sortBy !== "";

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
      {/* Hero Section */}
      <div className="relative overflow-hidden mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 dark:from-rose-500/5 dark:via-amber-500/5 dark:to-rose-500/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
          {(shelter || store) && (
            <Link
              to={shelter ? `/shelter/${shelter.id}` : "/store"}
              className="inline-flex items-center gap-2 text-gray-400 dark:text-dark-text-secondary hover:text-rose-500 dark:hover:text-rose-400 mb-6 transition-all duration-200 group text-sm font-medium"
            >
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-center group-hover:border-rose-300 dark:group-hover:border-rose-700 group-hover:shadow-md group-hover:-translate-x-0.5 transition-all duration-200">
                <ArrowLeft className="w-4 h-4" />
              </div>
              {shelter ? "Volver al Refugio" : "Volver a la Tienda"}
            </Link>
          )}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center lg:text-left">
              {shelter ? (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500/10 to-amber-500/10 dark:from-rose-900/20 dark:to-amber-900/20 text-rose-600 dark:text-rose-400 rounded-full text-sm font-semibold mb-4 border border-rose-200/50 dark:border-rose-800/30">
                    <StoreIcon className="w-4 h-4" />
                    Tienda del Refugio
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-dark-text mb-4 font-display leading-tight">
                    Tienda{" "}
                    <span
                      className={`bg-gradient-to-r ${shelter.color} bg-clip-text text-transparent`}
                    >
                      {shelter.name}
                    </span>
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-600 dark:text-dark-text-secondary mb-6 max-w-xl">
                    {shelter.description}
                  </p>

                  {/* Shelter quick info row */}
                  <div className="flex flex-wrap items-center gap-5 justify-center lg:justify-start mb-6 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-dark-text-secondary">
                      <MapPin className="w-4 h-4 text-rose-400" />
                      <span>{shelter.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-dark-text-secondary">
                      <Package className="w-4 h-4 text-emerald-400" />
                      <span>{baseProducts.length} productos</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start">
                    <Link
                      to={`/shelter/${shelter.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary border-2 border-gray-200 dark:border-dark-border font-semibold rounded-xl hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 transition-all hover:scale-105 active:scale-95"
                    >
                      <PawPrint className="w-5 h-5" />
                      Perfil del Refugio
                    </Link>
                    <Link
                      to="/store"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary border-2 border-gray-200 dark:border-dark-border font-semibold rounded-xl hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 transition-all hover:scale-105 active:scale-95"
                    >
                      <StoreIcon className="w-5 h-5" />
                      Ver Tienda General
                    </Link>
                    <Link
                      to="/cart"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 hover:scale-105 active:scale-95"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Ver Carrito
                      {cartCount > 0 && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  </div>
                </>
              ) : store ? (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-600 dark:text-purple-400 rounded-full text-sm font-semibold mb-4 border border-purple-200/50 dark:border-purple-800/30">
                    <StoreIcon className="w-4 h-4" />
                    Tienda Asociada
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-dark-text mb-4 font-display leading-tight">
                    {store.name}
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-600 dark:text-dark-text-secondary mb-6 max-w-xl">
                    {store.description}
                  </p>

                  {/* Store quick info row */}
                  <div className="flex flex-wrap items-center gap-5 justify-center lg:justify-start mb-6 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-dark-text-secondary">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span>{store.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-dark-text-secondary">
                      <Package className="w-4 h-4 text-emerald-400" />
                      <span>{baseProducts.length} productos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-dark-text-secondary">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>{store.rating} ({store.reviews} reseñas)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start">
                    <Link
                      to={`/store-profile/${store.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary border-2 border-gray-200 dark:border-dark-border font-semibold rounded-xl hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400 transition-all hover:scale-105 active:scale-95"
                    >
                      <StoreIcon className="w-5 h-5" />
                      Perfil de la Tienda
                    </Link>
                    <Link
                      to="/store"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary border-2 border-gray-200 dark:border-dark-border font-semibold rounded-xl hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 transition-all hover:scale-105 active:scale-95"
                    >
                      <StoreIcon className="w-5 h-5" />
                      Ver Tienda General
                    </Link>
                    <Link
                      to="/cart"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-200/50 dark:shadow-purple-500/20 hover:scale-105 active:scale-95"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Ver Carrito
                      {cartCount > 0 && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-sm font-semibold mb-4">
                    <Sparkles className="w-4 h-4" />
                    ¡Envío gratis en compras mayores a $50!
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-dark-text mb-4 font-display leading-tight">
                    Tienda{" "}
                    <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
                      Adoptify
                    </span>
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-600 dark:text-dark-text-secondary mb-6 max-w-xl">
                    Todo lo que tu mascota necesita para ser feliz. Productos de alta
                    calidad con amor y cuidado.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start">
                    <Link
                      to="/cart"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 hover:scale-105 active:scale-95"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Ver Carrito
                      {cartCount > 0 && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-dark-text-secondary">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>Envío rápido</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span>Calidad premium</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="hidden lg:flex items-center justify-center w-72 h-72">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-amber-400 rounded-full blur-3xl opacity-20 animate-pulse" />
                <div className="relative w-64 h-64 bg-gradient-to-br from-rose-200 via-amber-100 to-rose-200 dark:from-rose-900/40 dark:via-amber-900/20 dark:to-rose-900/40 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                  {shelter ? (
                    <ShelterIcon className="w-32 h-32 text-rose-400/60 dark:text-rose-500/40" />
                  ) : store ? (
                    <StoreLogo className="w-32 h-32 text-purple-400/60 dark:text-purple-500/40" />
                  ) : (
                    <ShoppingBag className="w-32 h-32 text-rose-400/60 dark:text-rose-500/40" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-36 py-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm dark:text-dark-text dark:placeholder-dark-text-secondary"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 bg-gray-100 dark:bg-dark-border rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
                  title="Limpiar filtros"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  showFilters
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                    : "bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 border border-gray-100 dark:border-dark-border overflow-hidden">
              {/* Filters Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-rose-50/50 to-amber-50/50 dark:from-rose-900/5 dark:to-amber-900/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
                    Filtros
                  </h3>
                  {hasActiveFilters && (
                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full">
                      Activos
                    </span>
                  )}
                </div>
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-gray-400 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpiar todo
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* ─── SELLER TYPE ─── */}
                {!shelter && !store && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-rose-500" />
                      <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                        Tipo de vendedor
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "all", label: "Todos", icon: Sparkles },
                        { value: "shelter", label: "Refugios", icon: PawPrint },
                        { value: "store", label: "Tiendas asociadas", icon: StoreIcon2 },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setSellerType(value)}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            sellerType === value
                              ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20 scale-105"
                              : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${sellerType === value ? "" : "text-gray-400 dark:text-dark-text-secondary"}`} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── CATEGORY ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                      Categoría
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const Icon = categoryIcons[category] || Sparkles;
                      const isSelected = selectedCategory === category;
                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            isSelected
                              ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                              : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? "" : "text-gray-400 dark:text-dark-text-secondary"}`} />
                          {category === "all" ? "Todas" : category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ─── PRICE RANGE ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                      Rango de precios
                    </h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-dark-text-secondary">$</span>
                      <input
                        type="number"
                        placeholder="Mín"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        min="0"
                        className="w-full pl-7 pr-3 py-2.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 dark:text-dark-text dark:placeholder-dark-text-secondary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <span className="text-gray-400 dark:text-dark-text-secondary font-bold">—</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-dark-text-secondary">$</span>
                      <input
                        type="number"
                        placeholder="Máx"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        min="0"
                        className="w-full pl-7 pr-3 py-2.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 dark:text-dark-text dark:placeholder-dark-text-secondary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── SORT BY ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                      Ordenar por
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "", label: "Predeterminado", icon: Sparkles },
                      { value: "newest", label: "Más recientes", icon: Clock },
                      { value: "popular", label: "Más populares", icon: TrendingUp },
                      { value: "topRated", label: "Mejor valorados", icon: ThumbsUp },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSortBy(value)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          sortBy === value
                            ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                            : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${sortBy === value ? "" : "text-gray-400 dark:text-dark-text-secondary"}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results info */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Mostrando{" "}
              <span className="font-semibold text-gray-900 dark:text-dark-text">
                {filteredProducts.length}
              </span>{" "}
              {filteredProducts.length === 1 ? "producto" : "productos"}
              {shelter && (
                <span className="text-gray-400 dark:text-dark-text-secondary">
                  {" "}de {shelter.name}
                </span>
              )}
              {store && (
                <span className="text-gray-400 dark:text-dark-text-secondary">
                  {" "}de {store.name}
                </span>
              )}
              {hasActiveFilters && (
                <span className="text-gray-400 dark:text-dark-text-secondary">
                  {" "}(con filtros aplicados)
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              {sellerType !== "all" && !shelter && !store && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-rose-100 to-amber-100 dark:from-rose-900/20 dark:to-amber-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full border border-rose-200/50 dark:border-rose-800/30">
                  {sellerType === "shelter" ? "Refugios" : "Tiendas"}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                {storeFavorites.length} {storeFavorites.length === 1 ? "favorito" : "favoritos"}
              </span>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loadingProducts && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
            <p>Cargando productos...</p>
          </div>
        )}

        {/* Products Grid */}
        {!loadingProducts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const CatIcon = categoryIcons[product.category] || Package;
            const catColor = categoryColors[product.category] || "from-gray-400 to-gray-500";
            const isFav = isStoreFavorite(product.id);
            const justAdded = addedToCart[product.id];
            const productSellerInfo = { type: product.shelterId ? "shelter" : product.storeId ? "store" : null };

            return (
              <div
                key={product.id}
                className="group bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 overflow-hidden hover:shadow-xl dark:hover:shadow-dark-border/40 transition-all duration-300 hover:-translate-y-1.5 border border-gray-100 dark:border-dark-border"
              >
                {/* Product Image */}
                <Link to={`/product/${product.id}`}>
                  <div className="relative h-48 overflow-hidden">
                    {/* Gradient Background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-60 dark:opacity-40`}
                    />
                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%)'
                      }} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />

                    {/* Icon / Imagen persistente */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-110 drop-shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-white/30 dark:bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                          <CatIcon className="w-12 h-12 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r ${catColor} text-white text-xs font-semibold rounded-full shadow-lg`}
                      >
                        <CatIcon className="w-3 h-3" />
                        {product.category}
                      </span>
                    </div>

                    {/* Seller Type Badge */}
                    {productSellerInfo.type && !shelter && !store && (
                      <div className="absolute top-12 left-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full shadow-lg backdrop-blur-sm ${
                            productSellerInfo.type === 'shelter'
                              ? "bg-rose-500/90 text-white"
                              : "bg-purple-500/90 text-white"
                          }`}
                        >
                          {productSellerInfo.type === 'shelter' ? (
                            <><PawPrint className="w-2.5 h-2.5" /> Refugio</>
                          ) : (
                            <><StoreIcon className="w-2.5 h-2.5" /> Tienda</>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Discount Badge (porcentaje) */}
                    {product.descuento > 0 && (
                      <div className="absolute top-12 right-3">
                        <span className="inline-flex items-center px-2 py-1 text-[10px] font-bold rounded-full shadow-lg bg-emerald-500 text-white">
                          -{product.descuento}% OFF
                        </span>
                      </div>
                    )}

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleStoreFavorite(product);
                      }}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                        isFav
                          ? "bg-rose-500 text-white scale-110"
                          : "bg-white/90 dark:bg-dark-card/90 text-gray-400 hover:bg-white dark:hover:bg-dark-card opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? "fill-white" : ""
                        }`}
                      />
                    </button>

                    {/* Price Tag (original tachado + precio final si hay descuento) */}
                    <div className="absolute bottom-3 right-3">
                      <div className="px-3 py-1.5 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-xl shadow-lg">
                        {product.descuento > 0 && (
                          <span className="block text-[10px] text-gray-400 dark:text-dark-text-secondary line-through text-right">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                        <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-display">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Product Info */}
                <div className="p-5">
                  {/* Name */}
                  <Link to={`/product/${product.id}`}>
                    <h3 className="text-base font-bold text-gray-900 dark:text-dark-text mb-1.5 font-display line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Description */}
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-3 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Rating & Reviews Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(product.rating)
                                ? "text-amber-500 fill-amber-500"
                                : "text-gray-200 dark:text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-dark-text">
                        {product.rating}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                        ({product.reviews})
                      </span>
                    </div>
                    {/* Stock indicator */}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      product.stock > 10
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                    }`}>
                      {product.stock > 10 ? "En stock" : `Quedan ${product.stock}`}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={justAdded}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                        justAdded
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-200/50"
                          : "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-200/50 dark:shadow-rose-500/20 active:scale-[0.97]"
                      }`}
                    >
                      {justAdded ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            <path className="opacity-50" fill="currentColor" d="M16 12a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12h-4z" />
                          </svg>
                          ¡Agregado!
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Carrito
                        </>
                      )}
                    </button>
                    <Link
                      to={`/product/${product.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary border-2 border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-all active:scale-[0.97]"
                    >
                      Ver más
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/product:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        )}

        {/* No Results */}
        {!loadingProducts && filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-rose-400 dark:text-rose-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 dark:text-dark-text-secondary mb-6 max-w-md mx-auto">
              {shelter
                ? `Este refugio aún no tiene productos en esta categoría.`
                : store
                ? `Esta tienda aún no tiene productos en esta categoría.`
                : `Intenta con otros filtros o términos de búsqueda. ¡Tenemos muchos
              productos para tu mascota!`}
            </p>
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 hover:scale-105 active:scale-95"
            >
              <X className="w-4 h-4" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
      <ScrollToTop />
    </div>
  );
}
