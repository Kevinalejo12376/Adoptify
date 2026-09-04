import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import BackButton from "../../components/BackButton";
import {
  ArrowLeft, MapPin, Phone, Mail, Star, Heart, Clock, PawPrint,
  CheckCircle, Store, Eye, X, ShoppingBag, ChevronRight, ChevronLeft,
  Package, Sparkles, Shield, Award, Dog, Shirt, Bone, Stethoscope, Droplets,
  HandHeart,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useFavorites } from "../../context/FavoritesContext";
import { obtenerRefugio } from "../../api/refugios";
import DonarModal from "../../components/DonarModal";
import { listarMascotas } from "../../api/mascotas";
import { formatPrice } from "../../utils/price";

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

export default function ShelterDetails() {
  const { id } = useParams();
  const { isShelterFavorite, toggleShelterFavorite } = useFavorites();
  const [isFavorite, setIsFavorite] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Datos reales del refugio
  const [shelter, setShelter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modal "¿Cómo deseas ayudar?" (reutilizado con Home / Mis donaciones).
  // Se guarda también el refugio tal como lo devuelve la API para poder
  // preseleccionarlo automáticamente en el modal.
  const [showDonarModal, setShowDonarModal] = useState(false);
  const [refugioDatos, setRefugioDatos] = useState(null);

  // Las resenas aun no tienen endpoint publico -> lista vacia por ahora
  const reviews = [];
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  // Get initials for review avatars
  const getReviewInitials = (name) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  useEffect(() => {
    setIsVisible(true);
    let activo = true;
    (async () => {
      setLoading(true); setNotFound(false);
      try {
        const r = await obtenerRefugio(id);
        setRefugioDatos(r);
        // Trae las mascotas del refugio (filtra por refugio en cliente)
        let pets = [];
        try {
          const todas = await listarMascotas();
          pets = todas
            .filter((m) => m.refugio_id === r.id)
            .slice(0, 8)
            .map((m) => ({ id: m.id, uuid: m.uuid, name: m.nombre, age: m.edad || "", image: null }));
        } catch { /* ignore */ }

        if (!activo) return;
        setShelter({
          id: r.id,
          name: r.nombre,
          location: r.ubicacion || "",
          verified: r.verificado,
          // Estado real de la tienda del refugio desde la BD (tiendas.estado
          // / refugios.tienda_habilitada). Controla el botón "Ver Tienda".
          tiendaHabilitada: Boolean(r.tienda_habilitada),
          rating: 0,
          totalRatings: 0,
          logo: r.logo_url || null,
          description: r.descripcion || "Refugio comprometido con el bienestar animal.",
          availablePets: pets.length,
          adoptionsThisMonth: null,
          vaccinated: true,
          sterilized: true,
          hours: "",
          phone: r.telefono || "",
          email: r.email || "",
          address: r.direccion || r.ubicacion || "",
          gallery: (r.imagenes || []).map((img) => ({ id: img.id, image: img.url })),
          pets,
        });
      } catch (e) {
        if (activo) setNotFound(true);
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [id]);

  // Los productos por refugio se conectaran cuando exista el endpoint
  const shelterProducts = [];

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando refugio...</p>
      </div>
    );
  }

  if (notFound || !shelter) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 text-center">
        <PawPrint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Refugio no encontrado</p>
        <Link to="/shelters" className="text-rose-500 hover:underline mt-2 inline-block">Volver a refugios</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50 relative overflow-hidden">
      {/* Decorative floating background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-40 h-40 bg-rose-200/20 rounded-full blur-3xl animate-float-1" />
        <div className="absolute top-40 right-32 w-48 h-48 bg-amber-200/20 rounded-full blur-3xl animate-float-2" />
        <div className="absolute bottom-32 left-40 w-44 h-44 bg-rose-300/15 rounded-full blur-3xl animate-float-3" />
        <div className="absolute bottom-60 right-60 w-36 h-36 bg-amber-300/15 rounded-full blur-3xl animate-float-4" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Back Button */}
        <BackButton
          fallback="/shelters"
          label="Volver"
          className={`px-4 py-2 mb-6 hover:scale-105 ${isVisible ? "animate-fade-in-left" : "opacity-0"}`}
        />

        {/* ===== HEADER SECTION ===== */}
        <div className={`bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 hover:shadow-xl transition-all duration-300 ${
          isVisible ? "animate-fade-in-down" : "opacity-0"
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-6 flex-1">
              {/* Logo */}
              <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                {shelter.logo ? (
                  <img
                    src={shelter.logo}
                    alt={shelter.name}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <PawPrint className="w-12 h-12 text-rose-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 font-display">{shelter.name}</h1>
                  {shelter.verified && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                      <CheckCircle className="w-4 h-4" />
                      Verificado
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600 mb-3">
                  <MapPin className="w-5 h-5 text-rose-500" />
                  <span className="text-lg">{shelter.location}</span>
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">{shelter.description}</p>
                <div className="flex flex-wrap gap-3">
                  <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95">
                    <Phone className="w-5 h-5" />
                    Contactar
                  </button>
                  {/* "Ver Tienda" solo aparece si la tienda del refugio está
                      activa en la BD (refugios.tienda_habilitada). */}
                  {shelter.tiendaHabilitada && (
                    <Link
                      to={`/shelter-store/${shelter.id}`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-600 border-2 border-emerald-500 font-semibold rounded-xl hover:bg-emerald-50 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                    >
                      <Store className="w-5 h-5" />
                      Ver Tienda
                    </Link>
                  )}
                  <button
                    onClick={() => setShowDonarModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-amber-600 border-2 border-amber-500 font-semibold rounded-xl hover:bg-amber-50 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                  >
                    <HandHeart className="w-5 h-5" />
                    Quiero donar
                  </button>
                  <button
                    onClick={() => toggleShelterFavorite(shelter)}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                      isShelterFavorite(shelter.id)
                        ? "bg-rose-500 text-white shadow-md"
                        : "bg-white border-2 border-rose-500 text-rose-500 hover:bg-rose-50"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isShelterFavorite(shelter.id) ? "fill-white animate-heartbeat" : ""} transition-all`} />
                    {isShelterFavorite(shelter.id) ? "Guardado" : "Favorito"}
                  </button>
                </div>
              </div>
            </div>
            {/* Rating Badge */}
            <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-amber-50 to-rose-50 rounded-xl transition-all duration-300 hover:shadow-md hover:scale-105 border border-amber-100">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{shelter.rating}</p>
                <p className="text-xs text-gray-600">{shelter.totalRatings} calificaciones</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* ===== LEFT COLUMN (2/3) ===== */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Section */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${
              isVisible ? "animate-fade-in-up animation-delay-100" : "opacity-0"
            }`}>
              <div className="bg-white rounded-2xl shadow-lg p-5 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 group">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-rose-200 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <PawPrint className="w-6 h-6 text-rose-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{shelter.availablePets}</p>
                <p className="text-sm text-gray-600">Disponibles</p>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-5 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 group">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Heart className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{shelter.adoptionsThisMonth}</p>
                <p className="text-sm text-gray-600">Adopciones/mes</p>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-5 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 ${
                  shelter.vaccinated ? "bg-gradient-to-br from-green-100 to-emerald-100" : "bg-gray-100"
                }`}>
                  <CheckCircle className={`w-6 h-6 ${shelter.vaccinated ? "text-green-500" : "text-gray-400"}`} />
                </div>
                <p className={`text-lg font-bold ${shelter.vaccinated ? "text-green-600" : "text-gray-400"}`}>{shelter.vaccinated ? "Sí" : "No"}</p>
                <p className="text-sm text-gray-600">Vacunados</p>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-5 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 ${
                  shelter.sterilized ? "bg-gradient-to-br from-green-100 to-emerald-100" : "bg-gray-100"
                }`}>
                  <Shield className={`w-6 h-6 ${shelter.sterilized ? "text-green-500" : "text-gray-400"}`} />
                </div>
                <p className={`text-lg font-bold ${shelter.sterilized ? "text-green-600" : "text-gray-400"}`}>{shelter.sterilized ? "Sí" : "No"}</p>
                <p className="text-sm text-gray-600">Esterilizados</p>
              </div>
            </div>

            {/* Hours + User Rating - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Hours Section */}
              <div className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                isVisible ? "animate-fade-in-up animation-delay-200" : "opacity-0"
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-rose-100 to-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-rose-500" />
                  </div>
                  Horario de atención
                </h3>
                <p className="text-xl font-bold text-gray-900">{shelter.hours}</p>
                <p className="text-sm text-gray-600 mt-1">Lunes a Sábado</p>
              </div>

              {/* User Rating Section */}
              <div className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                isVisible ? "animate-fade-in-up animation-delay-250" : "opacity-0"
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-rose-100 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-amber-500" />
                  </div>
                  Califica este refugio
                </h3>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-all duration-200 hover:scale-125 active:scale-90"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          (hoverRating || userRating) >= star
                            ? "text-amber-500 fill-amber-500 drop-shadow-sm"
                            : "text-gray-300 hover:text-amber-300"
                        } transition-all duration-200`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  {userRating > 0
                    ? `Tu calificación: ${userRating} estrella${userRating !== 1 ? "s" : ""}`
                    : "Haz clic en las estrellas para calificar"}
                </p>
              </div>
            </div>

            {/* Pets for Adoption Section */}
            <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 ${
              isVisible ? "animate-fade-in-up animation-delay-300" : "opacity-0"
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-xl flex items-center justify-center">
                    <PawPrint className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">Mascotas en adopción</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Conoce a nuestros rescatados</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-gradient-to-r from-rose-100 to-amber-100 dark:from-rose-900/40 dark:to-amber-900/40 text-rose-700 dark:text-rose-300 rounded-full text-sm font-medium">
                  {shelter.pets.length} disponibles
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shelter.pets.map((pet, index) => (
                  <div
                    key={pet.id}
                    className="bg-gradient-to-br from-rose-50 to-amber-50 dark:from-dark-bg/80 dark:to-dark-card rounded-xl p-4 hover:shadow-md transition-all duration-300 group hover:-translate-y-1"
                    style={{ animationDelay: `${350 + index * 100}ms` }}
                  >
                    <div className="w-full h-36 bg-white dark:bg-dark-bg rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 group-hover:scale-105 transition-transform duration-500">
                        <PawPrint className="w-16 h-16 text-rose-300 dark:text-rose-500 group-hover:text-rose-400 transition-colors duration-300" />
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/80 dark:bg-dark-bg/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                        {pet.age}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">{pet.name}</h3>
                    </div>
                    <Link
                      to={`/animal/${pet.uuid || pet.id}`}
                      className="block w-full px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-lg hover:from-rose-600 hover:to-amber-600 transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-95 text-center"
                    >
                      Ver perfil
                    </Link>
                  </div>
                ))}
              </div>

              {/* "Ver más mascotas" button */}
              <div className="mt-6 text-center">
                <Link
                  to={`/shelter/${shelter.id}/animals`}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 group"
                >
                  <Eye className="w-5 h-5 group-hover:animate-wiggle" />
                  Ver más mascotas
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            </div>

            {/* ===== STORE PRODUCTS SECTION (NEW) ===== */}
            {shelterProducts.length > 0 && (
              <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 ${
                isVisible ? "animate-fade-in-up animation-delay-350" : "opacity-0"
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl flex items-center justify-center">
                      <Store className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">Tienda del Refugio</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Productos para tu mascota</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                    {shelterProducts.length} productos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {shelterProducts.map((product, index) => {
                    const CatIcon = categoryIcons[product.category] || Package;
                    const catColor = categoryColors[product.category] || "from-gray-400 to-gray-500";
                    const isPremium = product.quality === "Premium";

                    return (
                      <Link
                        key={product.id}
                        to={`/product/${product.uuid || product.id}`}
                        className="group bg-gradient-to-br from-gray-50 to-white dark:from-dark-bg dark:to-dark-card rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex"
                      >
                        {/* Product color bar */}
                        <div className={`w-2 bg-gradient-to-b ${catColor} flex-shrink-0`} />

                        <div className="flex-1 p-4 flex gap-3">
                          {/* Image placeholder */}
                          <div className={`w-16 h-16 bg-gradient-to-br ${product.color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                            <CatIcon className="w-7 h-7 text-white" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-rose-600 transition-colors line-clamp-1">
                                {product.name}
                              </h3>
                              {isPremium && (
                                <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-base font-bold text-rose-600 font-display">
                                {formatPrice(product.price)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span className="text-xs font-semibold text-gray-700">{product.rating}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* "Ver más productos" button */}
                <div className="mt-6 text-center">
                  <Link
                    to={`/shelter-store/${shelter.id}`}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 group"
                  >
                    <ShoppingBag className="w-5 h-5 group-hover:animate-wiggle" />
                    Ver más productos de este refugio
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ===== RIGHT COLUMN (1/3) ===== */}
          <div className="flex flex-col gap-2.5">
            {/* Photo Gallery */}
            <div className={`bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 ${
              isVisible ? "animate-fade-in-right animation-delay-100" : "opacity-0"
            }`}>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-rose-100 to-amber-100 rounded-lg flex items-center justify-center">
                  <PawPrint className="w-3.5 h-3.5 text-rose-500" />
                </div>
                Galería de fotos
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {shelter.gallery.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setSelectedPhotoIndex(idx);
                    }}
                    className="aspect-square bg-gradient-to-br from-rose-100 to-amber-100 rounded-lg overflow-hidden group cursor-pointer relative hover:shadow-md transition-all duration-300"
                  >
                    {photo.image ? (
                      <img
                        src={photo.image}
                        alt={`Foto ${photo.id}`}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center transition-all duration-300 group-hover:bg-rose-200">
                        <PawPrint className="w-5 h-5 text-rose-300 group-hover:text-rose-500 group-hover:scale-125 transition-all duration-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-all duration-300 text-[10px] font-medium bg-black/40 px-1.5 py-0.5 rounded-full">
                        Ver
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location - Mapa de Google embebido (usa la dirección real de la BD) */}
            <div className={`bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
              isVisible ? "animate-fade-in-right animation-delay-150" : "opacity-0"
            }`}>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-rose-100 to-amber-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                </div>
                Ubicación
              </h3>

              {/* Mapa: se genera automáticamente con la dirección guardada */}
              {(() => {
                const query = encodeURIComponent(shelter.address || shelter.location || shelter.name);
                return (
                  <div className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-dark-border">
                    <iframe
                      title={`Mapa de ${shelter.name}`}
                      src={`https://www.google.com/maps?q=${query}&z=15&output=embed`}
                      className="w-full h-52 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                );
              })()}

              <p className="text-sm font-semibold text-gray-900 mt-3">{shelter.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shelter.address || shelter.location || shelter.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Ver en Google Maps
                <ChevronRight className="w-3 h-3" />
              </a>
            </div>

            {/* Contact Information */}
            <div className={`bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 flex flex-col ${
              isVisible ? "animate-fade-in-right animation-delay-200" : "opacity-0"
            }`}>
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-rose-100 to-amber-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  Contacto
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-rose-50 transition-colors duration-300 group">
                    <div className="p-1.5 bg-rose-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <Phone className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Teléfono</p>
                      <p className="text-sm font-semibold text-gray-900">{shelter.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-rose-50 transition-colors duration-300 group">
                    <div className="p-1.5 bg-rose-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <Mail className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Email</p>
                      <p className="text-sm font-semibold text-gray-900 break-all">{shelter.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-rose-50 transition-colors duration-300 group">
                    <div className="p-1.5 bg-rose-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Dirección</p>
                      <p className="text-sm font-semibold text-gray-900">{shelter.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media - pushes to bottom with flex-1 */}
              <div className="mt-auto pt-5 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2.5">Síguenos en redes</p>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 active:scale-95">
                    Facebook
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-105 active:scale-95">
                    Instagram
                  </button>
                </div>
              </div>
            </div>

            {/* ===== REVIEWS SECTION ===== */}
            <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 ${
              isVisible ? "animate-fade-in-right animation-delay-250" : "opacity-0"
            }`}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-900/30 dark:to-rose-900/30 rounded-lg flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                </div>
                Reseñas y comentarios
                <span className="ml-auto text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-border px-2 py-0.5 rounded-full">
                  {reviews.length}
                </span>
              </h3>

              <div className="space-y-3">
                {displayedReviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-gradient-to-br from-gray-50 to-white dark:from-dark-bg dark:to-dark-card rounded-xl p-3.5 border border-gray-100 dark:border-dark-border hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-rose-400 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getReviewInitials(review.user)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{review.user}</p>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{review.date}</span>
                        </div>
                        {/* Stars */}
                        <div className="flex items-center gap-0.5 mt-0.5 mb-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= review.rating
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-gray-300 dark:text-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {reviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="w-full mt-3 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition-all duration-300 hover:shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {showAllReviews ? (
                    <>Mostrar menos <span className="text-xs">▲</span></>
                  ) : (
                    <>Ver todas las reseñas ({reviews.length}) <span className="text-xs">▼</span></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 gallery-modal-backdrop animate-modal-overlay"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Previous arrow */}
            {shelter.gallery.length > 1 && (
              <button
                onClick={() => {
                  const prevIndex = selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : shelter.gallery.length - 1;
                  setSelectedPhotoIndex(prevIndex);
                  setSelectedPhoto(shelter.gallery[prevIndex]);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-20"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Next arrow */}
            {shelter.gallery.length > 1 && (
              <button
                onClick={() => {
                  const nextIndex = selectedPhotoIndex < shelter.gallery.length - 1 ? selectedPhotoIndex + 1 : 0;
                  setSelectedPhotoIndex(nextIndex);
                  setSelectedPhoto(shelter.gallery[nextIndex]);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-20"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Image counter */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 text-white text-xs font-medium rounded-full z-20 backdrop-blur-sm">
              {selectedPhotoIndex + 1} / {shelter.gallery.length}
            </div>

            {/* Image */}
            <div className="w-full h-96 sm:h-[500px] bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center relative">
              {selectedPhoto.image ? (
                <img
                  src={selectedPhoto.image}
                  alt={`Foto ${selectedPhoto.id}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <PawPrint className="w-24 h-24 text-rose-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Foto {selectedPhoto.id}</p>
                </div>
              )}
            </div>

            {/* Thumbnails bar */}
            <div className="p-4 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600 font-medium">
                Galería de {shelter.name}
              </p>
              <div className="flex gap-2">
                {shelter.gallery.map((photo, idx) => (
                  <button
                    key={photo.id}
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setSelectedPhotoIndex(idx);
                    }}
                    className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      selectedPhoto.id === photo.id
                        ? "border-rose-500 scale-110"
                        : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center">
                      <PawPrint className="w-4 h-4 text-rose-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal "¿Cómo deseas ayudar?" (reutilizado; el refugio del perfil queda preseleccionado) */}
      <DonarModal
        isOpen={showDonarModal}
        onClose={() => setShowDonarModal(false)}
        refugioInicial={refugioDatos}
      />
    </div>
  );
}
