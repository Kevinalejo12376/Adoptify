import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Store,
  MapPin,
  Star,
  Package,
  ShoppingBag,
  ShoppingCart,
  Heart,
  Phone,
  Mail,
  Globe,
  Clock,
  MessageCircle,
  Camera,
  Image,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Tag,
  DollarSign,
  TrendingUp,
  ThumbsUp,
  RotateCcw,
  Sparkles,
  X,
  Check,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import ScrollToTop from "../../components/ScrollToTop";
import {
  getStoreById,
  getProductsByStore,
  categoryIcons,
  categoryColors,
  categories,
} from "../../data/products";
import { useCart } from "../../context/CartContext";
import { useFavorites } from "../../context/FavoritesContext";

const SG = "from-rose-500 to-amber-500";

// ──── Entrance Animation Hook ────
function useEntrance(delay = 0) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return [ref, visible];
}

// ──── Animated Section Wrapper ────
function AnimatedSection({ children, delay = 0, className = "" }) {
  const [ref, visible] = useEntrance(delay);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ──── Floating Orbs Component ────
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float-1" />
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float-2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-black/10 rounded-full blur-3xl animate-float-3" />
      <div className="absolute top-10 left-1/3 w-2 h-2 bg-white/30 rounded-full animate-float-4" />
      <div className="absolute top-20 right-1/4 w-3 h-3 bg-white/20 rounded-full animate-float-5" />
      <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-white/25 rounded-full animate-float-6" />
    </div>
  );
}

// ──── Section Header ────
function SectionHeader({ icon: Icon, title, subtitle, badge }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="relative flex-shrink-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${SG} rounded-2xl blur-xl opacity-40`} />
        <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${SG} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-dark-text font-display">
            {title}
          </h2>
          {badge && (
            <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-dark-text-secondary text-[11px] font-bold rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-400 dark:text-dark-text-secondary mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ──── Star Rating ────
function StarRating({ rating, size = "sm" }) {
  const sizeClasses = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rating);
        const half = !filled && star - 0.5 <= rating;
        return (
          <Star
            key={star}
            className={`${sizeClasses} ${
              filled
                ? "text-amber-400 fill-amber-400"
                : half
                ? "text-amber-300 fill-amber-300/50"
                : "text-gray-200 dark:text-gray-600"
            } transition-colors duration-200`}
          />
        );
      })}
    </div>
  );
}

export default function StoreProfile() {
  const { storeId } = useParams();
  const store = getStoreById(storeId);
  const storeProducts = store ? getProductsByStore(store.id) : [];
  const { addToCart } = useCart();
  const { isStoreFavorite, toggleStoreFavorite } = useFavorites();
  const [addedToCart, setAddedToCart] = useState({});

  // ──── Gallery State ────
  const [selectedImage, setSelectedImage] = useState(null);

  // ──── Filters State ────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ──── Hero animation state ────
  const [heroLoaded, setHeroLoaded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ──── Filtered Products ────
  const filteredProducts = useMemo(() => {
    let result = [...storeProducts];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (priceMin !== "") {
      const min = parseFloat(priceMin);
      if (!isNaN(min)) result = result.filter((p) => p.price >= min);
    }
    if (priceMax !== "") {
      const max = parseFloat(priceMax);
      if (!isNaN(max)) result = result.filter((p) => p.price <= max);
    }

    if (sortBy === "newest") result.sort((a, b) => b.id - a.id);
    else if (sortBy === "popular") result.sort((a, b) => b.reviews - a.reviews);
    else if (sortBy === "topRated") result.sort((a, b) => b.rating - a.rating);

    return result;
  }, [storeProducts, searchTerm, selectedCategory, priceMin, priceMax, sortBy]);

  const hasActiveFilters =
    searchTerm ||
    selectedCategory !== "all" ||
    priceMin !== "" ||
    priceMax !== "" ||
    sortBy !== "";

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setPriceMin("");
    setPriceMax("");
    setSortBy("");
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    setAddedToCart((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(
      () => setAddedToCart((prev) => ({ ...prev, [product.id]: false })),
      1500
    );
  };

  // ──── Not Found State ────
  if (!store) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
        <div className="max-w-lg mx-auto text-center py-20 animate-fade-in-up">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-amber-500 rounded-[2.5rem] blur-2xl opacity-60 animate-pulse-soft" />
            <div className="relative w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-2xl">
              <Store className="w-14 h-14 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-dark-text mb-3 font-display">
            Tienda no encontrada
          </h1>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-10 max-w-sm mx-auto leading-relaxed">
            La tienda que buscas no existe o no está disponible actualmente.
          </p>
          <Link
            to="/store"
            className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl shadow-rose-200/50 dark:shadow-rose-500/20 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]"
          >
            <Store className="w-5 h-5 transition-transform group-hover:scale-110" />
            Volver a la Tienda
          </Link>
        </div>
      </div>
    );
  }

  const StoreLogo = store.logo || Store;
  const gallery = store.gallery || [];

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
      {/* ═══════════════════════════════════════════════
           HERO / BANNER SECTION
           ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${store.color} dark:opacity-90 animate-gradient`}
          style={{ backgroundSize: "200% 200%" }}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <FloatingOrbs />
        </div>

        <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-24 sm:pb-32 lg:pb-36">
          <div className="max-w-7xl mx-auto">
            {/* Back Button */}
            <div
              className={`transition-all duration-700 delay-100 ${
                heroLoaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              }`}
            >
              <Link
                to="/store"
                className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-all duration-200 group text-sm font-medium"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/30 group-hover:-translate-x-0.5 transition-all duration-200">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                Volver a la Tienda
              </Link>
            </div>

            {/* Store Info */}
            <div className="flex flex-col lg:flex-row items-center lg:items-center gap-8 lg:gap-16">
              {/* Logo */}
              <div
                className={`flex-shrink-0 relative z-10 transition-all duration-700 delay-200 ${
                  heroLoaded ? "opacity-100 scale-100" : "opacity-0 scale-75"
                }`}
              >
                <div className="relative">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${store.color} rounded-[2.5rem] blur-2xl opacity-60`}
                  />
                  <div
                    className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] bg-gradient-to-br ${store.color} flex items-center justify-center shadow-2xl shadow-black/30 ring-4 ring-white/30 overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10" />
                    <StoreLogo className="w-16 h-16 sm:w-20 sm:h-20 text-white drop-shadow-2xl relative z-10" />
                  </div>
                  {/* Decorative ring */}
                  <div className="absolute -inset-3 rounded-[3rem] border border-white/10 animate-pulse-soft" />
                </div>
              </div>

              {/* Info */}
              <div
                className={`flex-1 text-center lg:text-left relative z-10 transition-all duration-700 delay-300 ${
                  heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold mb-4 border border-white/20 hover:bg-white/30 transition-colors">
                  <Store className="w-4 h-4" />
                  Tienda Asociada
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 font-display leading-tight drop-shadow-lg">
                  {store.name}
                </h1>
                <p className="text-base sm:text-lg text-white/80 mb-6 max-w-2xl drop-shadow leading-relaxed">
                  {store.description}
                </p>

                {/* Quick Info Pills */}
                <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 text-sm text-white/80">
                    <MapPin className="w-4 h-4 text-white/60" />
                    <span>{store.location}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 text-sm text-white/80">
                    <Package className="w-4 h-4 text-emerald-300" />
                    <span className="font-semibold">{storeProducts.length}</span>
                    <span>productos</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 text-sm text-white/80">
                    <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span className="font-semibold text-white">{store.rating}</span>
                    <span className="text-white/60">({store.reviews} reseñas)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curved bottom divider */}
        <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-24">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 120V60C240 20 480 0 720 0C960 0 1200 20 1440 60V120H0Z"
              className="fill-white dark:fill-dark-bg"
              opacity="0.3"
            />
            <path
              d="M0 120V70C240 30 480 10 720 10C960 10 1200 30 1440 70V120H0Z"
              className="fill-white dark:fill-dark-bg"
            />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           STORE INFO CARDS
           ═══════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-10 mb-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Contact Card */}
          <AnimatedSection delay={100}>
            <div className="group bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${SG} rounded-xl blur-md opacity-40`} />
                  <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${SG} flex items-center justify-center`}>
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text font-display">
                  Contacto
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-3 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors group/item"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-dark-bg flex items-center justify-center flex-shrink-0 group-hover/item:bg-rose-50 dark:group-hover/item:bg-rose-500/10 transition-colors">
                      <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-dark-text-secondary group-hover/item:text-rose-500 transition-colors" />
                    </div>
                    <span className="truncate">{store.phone}</span>
                  </a>
                )}
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="flex items-center gap-3 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors group/item"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-dark-bg flex items-center justify-center flex-shrink-0 group-hover/item:bg-amber-50 dark:group-hover/item:bg-amber-500/10 transition-colors">
                      <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-dark-text-secondary group-hover/item:text-amber-500 transition-colors" />
                    </div>
                    <span className="truncate">{store.email}</span>
                  </a>
                )}
                {store.website && (
                  <a
                    href={`https://${store.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors group/item"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-dark-bg flex items-center justify-center flex-shrink-0 group-hover/item:bg-rose-50 dark:group-hover/item:bg-rose-500/10 transition-colors">
                      <Globe className="w-3.5 h-3.5 text-gray-400 dark:text-dark-text-secondary group-hover/item:text-rose-500 transition-colors" />
                    </div>
                    <span className="truncate">{store.website}</span>
                  </a>
                )}
                {!store.phone && !store.email && !store.website && (
                  <p className="text-gray-400 dark:text-dark-text-secondary italic flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No disponible
                  </p>
                )}
              </div>
            </div>
          </AnimatedSection>

          {/* Hours Card */}
          <AnimatedSection delay={200}>
            <div className="group bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${SG} rounded-xl blur-md opacity-40`} />
                  <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${SG} flex items-center justify-center`}>
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text font-display">
                  Horario
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                {store.hours?.weekdays && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Lunes a Viernes
                      </p>
                      <p className="text-gray-500 dark:text-dark-text-secondary">
                        {store.hours.weekdays}
                      </p>
                    </div>
                  </div>
                )}
                {store.hours?.weekends && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Fines de Semana
                      </p>
                      <p className="text-gray-500 dark:text-dark-text-secondary">
                        {store.hours.weekends}
                      </p>
                    </div>
                  </div>
                )}
                {!store.hours && (
                  <p className="text-gray-400 dark:text-dark-text-secondary italic flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No especificado
                  </p>
                )}
              </div>
            </div>
          </AnimatedSection>

          {/* Social Media Card */}
          <AnimatedSection delay={300}>
            <div className="group bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${SG} rounded-xl blur-md opacity-40`} />
                  <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${SG} flex items-center justify-center`}>
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text font-display">
                  Redes Sociales
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                {store.socialMedia?.facebook && (
                  <a
                    href={`https://facebook.com/${store.socialMedia.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors group/item"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:bg-blue-100 dark:group-hover/item:bg-blue-500/20 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="truncate">{store.socialMedia.facebook}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-300 dark:text-gray-600 group-hover/item:text-blue-500 transition-colors" />
                  </a>
                )}
                {store.socialMedia?.instagram && (
                  <a
                    href={`https://instagram.com/${store.socialMedia.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors group/item"
                  >
                    <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:bg-pink-100 dark:group-hover/item:bg-pink-500/20 transition-colors">
                      <Camera className="w-3.5 h-3.5 text-pink-500" />
                    </div>
                    <span className="truncate">{store.socialMedia.instagram}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-300 dark:text-gray-600 group-hover/item:text-pink-500 transition-colors" />
                  </a>
                )}
                {!store.socialMedia && (
                  <p className="text-gray-400 dark:text-dark-text-secondary italic flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No disponible
                  </p>
                )}
              </div>
            </div>
          </AnimatedSection>

          {/* Rating Card */}
          <AnimatedSection delay={400}>
            <div className="group bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${SG} rounded-xl blur-md opacity-40`} />
                  <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${SG} flex items-center justify-center`}>
                    <Star className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text font-display">
                  Calificación
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${SG} rounded-xl blur-md opacity-30`} />
                  <div className={`relative w-16 h-16 rounded-xl bg-gradient-to-br ${SG} flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-white font-display">
                      {store.rating}
                    </span>
                  </div>
                </div>
                <div>
                  <StarRating rating={store.rating} size="md" />
                  <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1.5">
                    {store.reviews} reseñas de clientes
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
           GALLERY SECTION
           ═══════════════════════════════════════════════ */}
      {gallery.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
          <AnimatedSection delay={100}>
            <SectionHeader
              icon={Image}
              title="Galería"
              subtitle="Conoce nuestras instalaciones"
              badge={`${gallery.length} fotos`}
            />
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {gallery.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-border border border-gray-200 dark:border-dark-border hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    animationDelay: `${index * 80}ms`,
                  }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${img.color} transition-all duration-500 group-hover:scale-110`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:scale-125 group-hover:bg-white/30">
                      <Store className="w-8 h-8 text-white/60 group-hover:text-white/90 transition-all duration-300" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 transition-all">
                    <span className="text-[10px] font-medium text-white bg-black/50 backdrop-blur-sm px-2.5 py-1.5 rounded-lg block text-center truncate">
                      {img.label}
                    </span>
                  </div>
                  {/* Image number */}
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </AnimatedSection>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
           PRODUCT CATALOG
           ═══════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <AnimatedSection delay={100}>
          <SectionHeader
            icon={Package}
            title="Catálogo de productos"
            subtitle={`Todos los productos disponibles en ${store.name}`}
            badge={`${filteredProducts.length} ${
              filteredProducts.length === 1 ? "producto" : "productos"
            }`}
          />
        </AnimatedSection>

        {/* ──── Search & Filters ──── */}
        <AnimatedSection delay={200}>
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Buscar productos en esta tienda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-40 py-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 dark:focus:border-rose-500 shadow-sm dark:text-dark-text dark:placeholder-dark-text-secondary transition-all duration-200"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-dark-border rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    title="Limpiar filtros"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Limpiar</span>
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 border ${
                    showFilters
                      ? `bg-gradient-to-r ${SG} text-white shadow-lg border-transparent`
                      : "bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700"
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
            <div
              className={`transition-all duration-300 ease-out overflow-hidden ${
                showFilters ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 border border-gray-100 dark:border-dark-border">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${SG} flex items-center justify-center`}>
                      <SlidersHorizontal className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
                      Filtros
                    </h3>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full">
                        Activos
                      </span>
                    )}
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-semibold text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Limpiar todo
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* ──── CATEGORY ──── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-gray-500" />
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
                                ? `bg-gradient-to-r ${SG} text-white shadow-lg border-transparent`
                                : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 hover:bg-gray-100/50 dark:hover:bg-gray-800/30"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 ${
                                isSelected
                                  ? ""
                                  : "text-gray-400 dark:text-dark-text-secondary"
                              }`}
                            />
                            {category === "all" ? "Todas" : category}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ──── PRICE RANGE ──── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                        Rango de precios
                      </h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          placeholder="Mín"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          min="0"
                          className="w-full pl-7 pr-3 py-2.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 dark:focus:border-rose-500 dark:text-dark-text dark:placeholder-dark-text-secondary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-200"
                        />
                      </div>
                      <span className="text-gray-400 font-bold">—</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          placeholder="Máx"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          min="0"
                          className="w-full pl-7 pr-3 py-2.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 dark:focus:border-rose-500 dark:text-dark-text dark:placeholder-dark-text-secondary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ──── SORT BY ──── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
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
                              ? `bg-gradient-to-r ${SG} text-white shadow-lg border-transparent`
                              : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 hover:bg-gray-100/50 dark:hover:bg-gray-800/30"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${
                              sortBy === value
                                ? ""
                                : "text-gray-400 dark:text-dark-text-secondary"
                            }`}
                          />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Info */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                Mostrando{" "}
                <span className="font-semibold text-gray-900 dark:text-dark-text">
                  {filteredProducts.length}
                </span>{" "}
                {filteredProducts.length === 1 ? "producto" : "productos"}
                {hasActiveFilters && (
                  <span className="text-gray-400 dark:text-dark-text-secondary">
                    {" "}
                    (con filtros aplicados)
                  </span>
                )}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Quitar filtros
                </button>
              )}
            </div>
          </div>
        </AnimatedSection>

        {/* ──── Products Grid ──── */}
        {filteredProducts.length === 0 ? (
          <AnimatedSection delay={300} className="w-full">
            <div className="text-center py-20">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 rounded-full blur-xl" />
                <div className="relative w-24 h-24 bg-white dark:bg-dark-card rounded-full flex items-center justify-center shadow-lg border border-gray-100 dark:border-dark-border">
                  {storeProducts.length === 0 ? (
                    <Package className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  ) : (
                    <Search className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2 font-display">
                {storeProducts.length === 0
                  ? "Sin productos aún"
                  : "No se encontraron productos"}
              </h3>
              <p className="text-gray-500 dark:text-dark-text-secondary mb-8 max-w-md mx-auto leading-relaxed">
                {storeProducts.length === 0
                  ? "Esta tienda no ha publicado productos todavía. Vuelve pronto para descubrir sus novedades."
                  : "Intenta con otros filtros o términos de búsqueda para encontrar lo que buscas."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </AnimatedSection>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product, index) => {
              const CatIcon = categoryIcons[product.category] || Package;
              const catColor = categoryColors[product.category] || "from-gray-400 to-gray-500";
              const isFav = isStoreFavorite(product.id);
              const justAdded = addedToCart[product.id];

              return (
                <div
                  key={product.id}
                  className="group bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 overflow-hidden hover:shadow-xl dark:hover:shadow-dark-border/40 transition-all duration-300 hover:-translate-y-1.5 border border-gray-100 dark:border-dark-border animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: "both",
                  }}
                >
                  {/* Product Image */}
                  <Link to={`/product/${product.id}`}>
                    <div className="relative h-52 overflow-hidden">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-60 dark:opacity-40 transition-transform duration-500 group-hover:scale-105`}
                      />
                      <div className="absolute inset-0 opacity-20">
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage:
                              'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%)',
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 bg-white/30 dark:bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-125 group-hover:bg-white/40 dark:group-hover:bg-white/20">
                          <CatIcon className="w-12 h-12 text-white drop-shadow-lg transition-transform duration-500 group-hover:scale-110" />
                        </div>
                      </div>

                      {/* Category Badge */}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r ${catColor} text-white text-xs font-semibold rounded-full shadow-lg`}
                        >
                          <CatIcon className="w-3 h-3" />
                          {product.category}
                        </span>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleStoreFavorite(product);
                        }}
                        className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                          isFav
                            ? "bg-rose-500 text-white scale-110 shadow-rose-500/30"
                            : "bg-white/90 dark:bg-dark-card/90 text-gray-400 hover:bg-white dark:hover:bg-dark-card opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                        }`}
                      >
                        <Heart
                          className={`w-4.5 h-4.5 ${
                            isFav ? "fill-white" : ""
                          }`}
                        />
                      </button>

                      {/* Price Tag */}
                      <div className="absolute bottom-3 right-3">
                        <div className="px-3 py-1.5 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-xl shadow-lg">
                          <span className="text-lg font-bold text-gray-800 dark:text-gray-200 font-display">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Hover overlay with "Ver más" */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="px-5 py-2.5 bg-white/20 backdrop-blur-md text-white text-sm font-semibold rounded-xl border border-white/30 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                          Ver detalle
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-5">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="text-base font-bold text-gray-900 dark:text-dark-text mb-1.5 font-display line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-3 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Rating & Stock Row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={product.rating} />
                        <span className="text-xs font-semibold text-gray-700 dark:text-dark-text ml-1">
                          {product.rating}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                          ({product.reviews})
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                          product.stock > 10
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {product.stock > 10
                          ? "En stock"
                          : `Quedan ${product.stock}`}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={justAdded}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                          justAdded
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-500/20 scale-[0.98]"
                            : "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:opacity-90 shadow-md shadow-rose-200/50 dark:shadow-rose-500/20 active:scale-[0.97] hover:shadow-lg"
                        }`}
                      >
                        {justAdded ? (
                          <>
                            <Check className="w-4 h-4 animate-wiggle" />
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
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary border-2 border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-500/5 transition-all active:scale-[0.97]"
                      >
                        Ver más
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
           IMAGE PREVIEW MODAL
           ═══════════════════════════════════════════════ */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-modal-overlay p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl w-full animate-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-4 -right-4 w-11 h-11 bg-white dark:bg-dark-card rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 z-10 group"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-white group-hover:rotate-90 transition-transform duration-200" />
            </button>

            {/* Image container */}
            <div
              className={`w-full aspect-video rounded-2xl bg-gradient-to-br ${selectedImage.color} flex items-center justify-center shadow-2xl overflow-hidden relative`}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex flex-col items-center gap-4">
                <Store className="w-24 h-24 sm:w-32 sm:h-32 text-white/30" />
                {selectedImage.label && (
                  <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/20">
                    {selectedImage.label}
                  </span>
                )}
              </div>
            </div>

            {/* Image caption */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-white/70 text-sm font-medium">
                {selectedImage.label}
              </p>
              <p className="text-white/40 text-xs">
                {gallery.findIndex((g) => g.id === selectedImage.id) + 1} /{" "}
                {gallery.length}
              </p>
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
}
