import React, { useState } from "react";
import { Link } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { formatPrice } from "../../utils/price";
import {
  PawPrint,
  Heart,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  Star,
  Package,
  ShoppingCart,
  Eye,
  Dog,
  Cat,
  Bone,
  Shirt,
  Stethoscope,
  Droplets,
  Sparkles,
  Trash2,
  X,
  RefreshCw,
  Home,
  Users,
  Phone,
  Mail,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useCart } from "../../context/CartContext";

const categoryIcons = {
  Alimentos: Dog,
  Accesorios: Shirt,
  Juguetes: Bone,
  Salud: Stethoscope,
  Higiene: Droplets,
};

const categoryColors = {
  Alimentos: "from-emerald-500 to-teal-500",
  Accesorios: "from-violet-500 to-purple-500",
  Juguetes: "from-amber-500 to-orange-500",
  Salud: "from-blue-500 to-cyan-500",
  Higiene: "from-rose-500 to-pink-500",
};

const categoryGradients = {
  Alimentos: "from-emerald-300 to-teal-400",
  Accesorios: "from-violet-300 to-purple-400",
  Juguetes: "from-amber-300 to-orange-400",
  Salud: "from-blue-300 to-cyan-400",
  Higiene: "from-rose-300 to-pink-400",
};

export default function Favorites() {
  const { favorites: petFavorites, removeFavorite } = useAuth();
  const { storeFavorites, removeStoreFavorite, toggleStoreFavorite, shelterFavorites, removeShelterFavorite, toggleShelterFavorite } = useFavorites();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState("pets");
  const [addedToCart, setAddedToCart] = useState({});
  // Modal de "Limpiar favoritos": selección de categorías a eliminar.
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearSel, setClearSel] = useState({ pets: true, shelters: true, store: true });

  const totalFavorites = petFavorites.length + storeFavorites.length + shelterFavorites.length;

  const handleAddToCart = (product) => {
    addToCart(product);
    setAddedToCart((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedToCart((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  const abrirLimpiar = () => {
    // Por defecto se marcan todas las categorías que tengan al menos un favorito.
    setClearSel({
      pets: petFavorites.length > 0,
      shelters: shelterFavorites.length > 0,
      store: storeFavorites.length > 0,
    });
    setShowClearModal(true);
  };

  // Ejecuta la eliminación SOLO después de confirmar en el modal.
  const confirmarLimpiar = () => {
    if (clearSel.pets) petFavorites.forEach((a) => removeFavorite(a.id));
    if (clearSel.shelters) shelterFavorites.forEach((s) => removeShelterFavorite(s.id));
    if (clearSel.store) storeFavorites.forEach((p) => removeStoreFavorite(p.id));
    setShowClearModal(false);
  };

  const toggleClearSel = (key) => {
    setClearSel((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const haySeleccion = clearSel.pets || clearSel.shelters || clearSel.store;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <BackButton fallback="/dashboard" label="Volver" className="mb-4" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2 font-display">
                Mis{" "}
                <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
                  Favoritos
                </span>
              </h1>
              <p className="text-lg text-gray-600">
                {totalFavorites === 0
                  ? "Aún no has guardado ningún favorito"
                  : `Tienes ${totalFavorites} favorito${totalFavorites !== 1 ? "s" : ""} en total`
                }
              </p>
            </div>

            {totalFavorites > 0 && (
              <button
                onClick={abrirLimpiar}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 rounded-full font-semibold hover:bg-red-100 transition-colors"
                title="Quitar favoritos seleccionados"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar todos
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab("pets")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "pets"
                ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/50"
                : "text-gray-600 hover:text-rose-600 hover:bg-rose-50"
            }`}
          >
            <PawPrint className="w-4 h-4" />
            <span>Mascotas</span>
            {petFavorites.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === "pets"
                    ? "bg-white/20 text-white"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                {petFavorites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("shelters")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "shelters"
                ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/50"
                : "text-gray-600 hover:text-rose-600 hover:bg-rose-50"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Refugios</span>
            {shelterFavorites.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === "shelters"
                    ? "bg-white/20 text-white"
                    : "bg-violet-100 text-violet-600"
                }`}
              >
                {shelterFavorites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("store")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "store"
                ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/50"
                : "text-gray-600 hover:text-rose-600 hover:bg-rose-50"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Tienda</span>
            {storeFavorites.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === "store"
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                {storeFavorites.length}
              </span>
            )}
          </button>
        </div>

        {/* ===================== PET FAVORITES TAB ===================== */}
        {activeTab === "pets" && (
          <>
            {petFavorites.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-amber-100 rounded-full flex items-center justify-center">
                  <Heart className="w-10 h-10 text-rose-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No tienes mascotas favoritas
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Explora nuestra sección de animales y guarda tus favoritos para
                  adoptarlos después.
                </p>
                <Link
                  to="/animals"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50"
                >
                  <PawPrint className="w-5 h-5" />
                  Explorar Animales
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {petFavorites.map((animal) => (
                  <div
                    key={animal.id}
                    className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                  >
                    <div className="relative">
                      <div className="w-full h-48 bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center overflow-hidden">
                        {animal.image ? (
                          <img
                            src={animal.image}
                            alt={animal.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <PawPrint className="w-20 h-20 text-rose-400/60" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                      </div>
                      <button
                        onClick={() => removeFavorite(animal.id)}
                        className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Quitar de favoritos"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                      <div className="absolute bottom-3 left-3 flex gap-2">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 shadow-sm">
                          {animal.type}
                        </span>
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 shadow-sm">
                          {animal.age}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900 font-display">
                          {animal.name}
                        </h3>
                        <button
                          onClick={() => removeFavorite(animal.id)}
                          className="shrink-0 p-1 rounded-full hover:bg-rose-50 transition-colors"
                          title="Quitar de favoritos"
                        >
                          <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{animal.breed}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                        <MapPin className="w-3 h-3" />
                        <span>{animal.shelter}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 text-xs">
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-600 font-medium rounded-lg">
                            {animal.size}
                          </span>
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 font-medium rounded-lg">
                            {animal.gender}
                          </span>
                        </div>
                        <Link
                          to={`/animal/${animal.id}`}
                          className="px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-full hover:from-rose-600 hover:to-amber-600 transition-all shadow-md shadow-rose-200/50"
                        >
                          Ver más
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===================== SHELTER FAVORITES TAB ===================== */}
        {activeTab === "shelters" && (
          <>
            {shelterFavorites.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center">
                  <Home className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No tienes refugios favoritos
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Explora los refugios y guarda tus favoritos para visitarlos después.
                </p>
                <Link
                  to="/shelters"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50"
                >
                  <Home className="w-5 h-5" />
                  Explorar Refugios
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {shelterFavorites.map((shelter) => (
                  <div
                    key={shelter.id}
                    className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                  >
                    <div className="relative">
                      <div className="w-full h-40 bg-gradient-to-br from-violet-200 to-purple-200 flex items-center justify-center overflow-hidden">
                        {shelter.logo_url ? (
                          <img
                            src={shelter.logo_url}
                            alt={shelter.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <Home className="w-16 h-16 text-violet-400/60" />
                        )}
                      </div>
                      <button
                        onClick={() => removeShelterFavorite(shelter.id)}
                        className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Quitar de favoritos"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                      <div className="absolute bottom-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 shadow-sm flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {shelter.rating}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900 font-display">
                          {shelter.name}
                        </h3>
                        <button
                          onClick={() => removeShelterFavorite(shelter.id)}
                          className="shrink-0 p-1 rounded-full hover:bg-rose-50 transition-colors"
                          title="Quitar de favoritos"
                        >
                          <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <span>{shelter.location}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{shelter.description}</p>
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <PawPrint className="w-4 h-4" />
                          {shelter.animals} animales
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Activo
                        </span>
                      </div>
                      <Link
                        to={`/shelter/${shelter.id}`}
                        className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-md"
                      >
                        Ver refugio
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===================== STORE FAVORITES TAB ===================== */}
        {activeTab === "store" && (
          <>
            {storeFavorites.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-rose-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No tienes productos favoritos
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Explora nuestra tienda y guarda tus productos favoritos para
                  comprarlos después.
                </p>
                <Link
                  to="/store"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Ir a la Tienda
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {storeFavorites.map((product) => {
                  const CatIcon = categoryIcons[product.category] || Package;
                  const catColor = categoryColors[product.category] || "from-gray-400 to-gray-500";
                  const catGrad = categoryGradients[product.category] || "from-gray-300 to-gray-400";
                  const justAdded = addedToCart[product.id];

                  return (
                    <div
                      key={product.id}
                      className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                    >
                      {/* Product Image */}
                      <div className="relative h-48 overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${catGrad} flex items-center justify-center`}>
                            <CatIcon className="w-12 h-12 text-white/80" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r ${catColor} text-white text-xs font-semibold rounded-full shadow-lg`}
                          >
                            <CatIcon className="w-3 h-3" />
                            {product.category}
                          </span>
                        </div>

                        {/* Remove Favorite Button */}
                        <button
                          onClick={() => removeStoreFavorite(product.id)}
                          className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          title="Quitar de favoritos"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>

                        {/* Price Tag (original tachado + final si hay descuento) */}
                        <div className="absolute bottom-3 right-3">
                          <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
                            {product.descuento > 0 && (
                              <span className="block text-[10px] text-gray-400 line-through text-right">
                                {formatPrice(product.originalPrice)}
                              </span>
                            )}
                            <span className="text-lg font-bold text-rose-600 font-display">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="text-base font-bold text-gray-900 font-display line-clamp-1">
                            {product.name}
                          </h3>
                          <button
                            onClick={() => removeStoreFavorite(product.id)}
                            className="shrink-0 p-1 rounded-full hover:bg-rose-50 transition-colors"
                            title="Quitar de favoritos"
                          >
                            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < Math.floor(product.rating)
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-semibold text-gray-700">
                              {product.rating}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            ({product.reviews})
                          </span>
                        </div>

                        {/* Actions: agregar al carrito + ver perfil */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={justAdded}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                              justAdded
                                ? "bg-emerald-500 text-white"
                                : "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-200/50"
                            }`}
                          >
                            {justAdded ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
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
                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl bg-white text-gray-700 border-2 border-gray-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                            Ver perfil
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Bottom CTA when empty */}
        {totalFavorites === 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Empieza explorando{" "}
                <Link to="/animals" className="text-rose-500 hover:text-rose-600 font-semibold underline">
                  animales
                </Link>
                ,{" "}
                <Link to="/shelters" className="text-rose-500 hover:text-rose-600 font-semibold underline">
                  refugios
                </Link>{" "}
                o la{" "}
                <Link to="/store" className="text-amber-500 hover:text-amber-600 font-semibold underline">
                  tienda
                </Link>
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Modal: Limpiar favoritos */}
      {showClearModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowClearModal(false); }}
        >
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-dark-border flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">
                    Limpiar favoritos
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                    Selecciona qué favoritos deseas eliminar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClearModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3">
              {/* Advertencia */}
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>¿Estás seguro de que quieres eliminar estos favoritos?</strong>{" "}
                  Esta acción no se puede deshacer.
                </p>
              </div>

              {/* Opciones de selección */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleClearSel("pets")}
                  disabled={petFavorites.length === 0}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                    clearSel.pets
                      ? "border-rose-300 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-500/10"
                      : "border-gray-200 dark:border-dark-border hover:border-rose-200 dark:hover:border-rose-500/30"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      clearSel.pets ? "bg-rose-500 border-rose-500" : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {clearSel.pets && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </span>
                  <PawPrint className="w-5 h-5 text-rose-500" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Mascotas</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                      {petFavorites.length} {petFavorites.length === 1 ? "favorito" : "favoritos"}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => toggleClearSel("shelters")}
                  disabled={shelterFavorites.length === 0}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                    clearSel.shelters
                      ? "border-rose-300 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-500/10"
                      : "border-gray-200 dark:border-dark-border hover:border-rose-200 dark:hover:border-rose-500/30"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      clearSel.shelters ? "bg-rose-500 border-rose-500" : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {clearSel.shelters && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </span>
                  <Home className="w-5 h-5 text-rose-500" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Refugios</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                      {shelterFavorites.length} {shelterFavorites.length === 1 ? "favorito" : "favoritos"}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => toggleClearSel("store")}
                  disabled={storeFavorites.length === 0}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                    clearSel.store
                      ? "border-rose-300 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-500/10"
                      : "border-gray-200 dark:border-dark-border hover:border-rose-200 dark:hover:border-rose-500/30"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      clearSel.store ? "bg-rose-500 border-rose-500" : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {clearSel.store && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </span>
                  <ShoppingBag className="w-5 h-5 text-rose-500" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Tienda</p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                      {storeFavorites.length} {storeFavorites.length === 1 ? "favorito" : "favoritos"}
                    </p>
                  </div>
                </button>
              </div>

              {/* Resumen de lo que se eliminará */}
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary text-center pt-1">
                {haySeleccion ? (
                  <>Se eliminarán: {[
                    clearSel.pets ? "mascotas" : null,
                    clearSel.shelters ? "refugios" : null,
                    clearSel.store ? "productos de la tienda" : null,
                  ].filter(Boolean).join(", ")}.</>
                ) : (
                  "No seleccionaste ningún favorito para eliminar."
                )}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-border rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarLimpiar}
                disabled={!haySeleccion}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-500 rounded-xl hover:from-rose-600 hover:to-red-600 transition-all shadow-md shadow-rose-200/50 dark:shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar favoritos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
