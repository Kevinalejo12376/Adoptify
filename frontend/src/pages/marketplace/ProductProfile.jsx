import React, { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { formatPrice } from "../../utils/price";
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Star,
  Package,
  CheckCircle,
  XCircle,
  Shield,
  Ruler,
  Box,
  Tag,
  MessageCircle,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Award,
  Edit3,
  Save,
  X,
  Truck,
  RotateCcw,
  Image,
  Store,
  PawPrint,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Share2,
  Maximize2,
  Loader2,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useAuth } from "../../context/AuthContext";
import { categoryIcons, categoryColors } from "../../data/products";
import {
  obtenerProducto, listarResenas, crearResena, actualizarResena, eliminarResena,
} from "../../api/productos";

// Convierte una reseña del backend a la forma que usa la vista de comentarios.
const mapResena = (r) => ({
  id: r.id,
  userId: r.usuario_id,
  userName: r.usuario_nombre || "Usuario",
  rating: r.calificacion,
  text: r.comentario || "",
  date: r.creada_en,
  editedAt: r.editada_en,
});

const getQualityBadge = (quality) => {
  if (quality === "Premium") {
    return {
      icon: Award,
      gradient: "from-amber-400 to-yellow-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-700",
      label: "Premium",
    };
  }
  return {
    icon: CheckCircle,
    gradient: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-700",
    label: "Estándar",
  };
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StarRating({ rating, interactive = false, onRate, size = "md" }) {
  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? "button" : undefined}
          onClick={interactive ? () => onRate?.(star) : undefined}
          disabled={!interactive}
          className={`${
            interactive
              ? "cursor-pointer hover:scale-125 transition-transform duration-150"
              : "cursor-default"
          } ${interactive && star <= rating ? "scale-105" : ""}`}
        >
          <Star
            className={`${sizeClass} ${
              star <= rating
                ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                : "text-gray-200 dark:text-gray-600"
            } transition-all duration-150`}
          />
        </button>
      ))}
    </div>
  );
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/10 dark:bg-white/5 animate-float"
          style={{
            width: `${Math.random() * 80 + 40}px`,
            height: `${Math.random() * 80 + 40}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 6 + 4}s`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: Math.random() * 0.3 + 0.1,
          }}
        />
      ))}
    </div>
  );
}

export default function ProductProfile() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const { addToCart } = useCart();
  const { isStoreFavorite, toggleStoreFavorite } = useFavorites();
  const { user } = useAuth();

  const [addedToCart, setAddedToCart] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isHoveringGallery, setIsHoveringGallery] = useState(false);
  const [addedToWishlist, setAddedToWishlist] = useState(false);
  // Estado del envío de reseñas: null | "loading" | "success" | "error"
  const [reviewStatus, setReviewStatus] = useState(null);

  const galleryRef = useRef(null);

  // Carga el producto real desde la base de datos.
  useEffect(() => {
    let activo = true;
    setLoadingProduct(true);
    (async () => {
      try {
        const p = await obtenerProducto(id);
        if (!activo) return;
        setProduct({
          ...p,
          name: p.nombre,
          category: p.categoria,
          price: Number(p.precio) || 0,
          quality: p.calidad || "Estándar",
          brand: p.marca || "—",
          material: p.material || "—",
          sizes: p.tallas
            ? String(p.tallas).split(",").map((s) => s.trim()).filter(Boolean)
            : ["Único"],
          color: categoryColors[p.categoria] || "from-gray-400 to-gray-500",
          // Galería desde las imágenes persistentes de Cloudinary
          // (producto_imagenes) devueltas por el backend.
          gallery: (p.imagenes || []).map((img, index) => ({
            id: img.id,
            src: img.url,
            label: img.etiqueta || (p.imagenes.length > 1 ? `Vista ${index + 1}` : ""),
            color: categoryColors[p.categoria] || "from-gray-400 to-gray-500",
          })),
          longDescription: p.descripcion_larga || p.descripcion || "",
          features: [],
          careInstructions: null,
          rating: Number(p.rating) || 0,
          reviews: p.ventas || 0,
          reviews: p.resenas_count || 0,
          stock: p.stock ?? 0,
        });
      } catch (e) {
        if (activo) setProduct(null);
      } finally {
        if (activo) setLoadingProduct(false);
      }
    })();
    return () => { activo = false; };
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!product?.id) return;
    let activo = true;
    listarResenas(product.id)
      .then((data) => { if (activo) setComments((data || []).map(mapResena)); })
      .catch(() => {});
    return () => { activo = false; };
  }, [product?.id]);

  useEffect(() => {
    if (addedToWishlist) {
      const timer = setTimeout(() => setAddedToWishlist(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [addedToWishlist]);

  if (loadingProduct) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex flex-col items-center justify-center text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando producto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-200/30 dark:shadow-rose-900/20 animate-pulse">
            <Package className="w-14 h-14 text-rose-400 dark:text-rose-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-dark-text mb-3 font-display">
            Producto no encontrado
          </h1>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-10 max-w-sm mx-auto leading-relaxed">
            El producto que buscas no existe o ha sido eliminado de nuestro catálogo.
          </p>
          <Link
            to="/store"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-2xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 shadow-xl shadow-rose-200/50 dark:shadow-rose-500/20 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]"
          >
            <Package className="w-5 h-5" />
            Volver a la Tienda
          </Link>
        </div>
      </div>
    );
  }

  const CatIcon = categoryIcons[product.category] || Package;
  const catColor = categoryColors[product.category] || "from-gray-400 to-gray-500";
  const isFav = isStoreFavorite(product.id);
  const qualityBadge = getQualityBadge(product.quality);
  const QualityIcon = qualityBadge.icon;
  // La info del vendedor se omite: el detalle de producto proviene de la BD
  // y no incluye los datos completos del refugio/tienda.
  const sellerInfo = { type: null };
  const productShelter = null;
  const productStore = null;
  const previewCommentsCount = 3;
  const displayComments = showAllComments ? comments : comments.slice(0, previewCommentsCount);
  const gallery = product.gallery || [];
  const currentImage = gallery[activeImageIndex] || { color: product.color };

  const handleAddToCart = () => {
    addToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleToggleFavorite = () => {
    toggleStoreFavorite(product);
    if (!isFav) {
      setAddedToWishlist(true);
    }
  };

  const recargarResenas = async () => {
    try {
      const data = await listarResenas(product.id);
      setComments((data || []).map(mapResena));
    } catch (e) { /* noop */ }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    // Evita envíos duplicados si el usuario presiona el botón varias veces.
    if (!newComment.trim() || reviewStatus === "loading") return;
    setReviewStatus("loading");
    try {
      await crearResena(product.id, { calificacion: newRating, comentario: newComment.trim() });
      await recargarResenas();
      setNewComment("");
      setNewRating(5);
      setReviewStatus("success");
      setTimeout(() => setReviewStatus(null), 1800);
    } catch (e2) {
      setReviewStatus("error");
      setTimeout(() => setReviewStatus(null), 2500);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await eliminarResena(product.id, commentId);
      await recargarResenas();
    } catch (e) { /* noop */ }
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
    setEditRating(comment.rating);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
    setEditRating(5);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await actualizarResena(product.id, commentId, { calificacion: editRating, comentario: editText.trim() });
      await recargarResenas();
    } catch (e) { /* noop */ }
    setEditingCommentId(null);
    setEditText("");
    setEditRating(5);
  };

  const averageRating =
    comments.length > 0
      ? (comments.reduce((sum, c) => sum + c.rating, 0) / comments.length).toFixed(1)
      : product.rating;

  const isOwnComment = (comment) =>
    user && (user?.id === comment.userId || user?.name === comment.userName);

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1));
  };

  const discountPercent = 15;
  const originalPrice = product.price * (1 + discountPercent / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section className="relative pt-28 pb-12 sm:pb-16 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-amber-500/5 to-rose-500/5 dark:from-rose-500/10 dark:via-amber-500/5 dark:to-rose-500/10" />
        <div
          className={`absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br ${catColor} opacity-[0.08] dark:opacity-[0.12] blur-3xl`}
        />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-rose-400 to-amber-400 opacity-[0.06] dark:opacity-[0.08] blur-3xl" />

        {/* Floating decorative elements */}
        <FloatingParticles />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <div className="flex items-center justify-between mb-8">
            <Link
              to="/store"
              className="inline-flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border border-gray-200/80 dark:border-dark-border/80 flex items-center justify-center shadow-lg shadow-black/5 group-hover:shadow-rose-200/30 dark:group-hover:shadow-rose-900/20 group-hover:-translate-x-1 transition-all duration-300">
                <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-dark-text-secondary group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
              </div>
              <span className="text-sm font-semibold text-gray-400 dark:text-dark-text-secondary group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors hidden sm:inline">
                Volver a la Tienda
              </span>
            </Link>

            {/* Share button */}
            <button className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border border-gray-200/80 dark:border-dark-border/80 flex items-center justify-center shadow-lg shadow-black/5 hover:shadow-rose-200/30 dark:hover:shadow-rose-900/20 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-300 group">
              <Share2 className="w-4 h-4 text-gray-400 dark:text-dark-text-secondary group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors" />
            </button>
          </div>

          {/* Hero content */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-16">
            {/* Left - Icon sphere */}
            <div className="flex-shrink-0 flex justify-center lg:justify-start">
              <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-br ${catColor} rounded-[3rem] blur-2xl opacity-30 dark:opacity-40 group-hover:opacity-50 transition-opacity duration-500 animate-pulse`} />
                <div
                  className={`relative w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-[3rem] bg-gradient-to-br ${catColor} flex items-center justify-center shadow-2xl shadow-black/20 group-hover:shadow-3xl group-hover:scale-105 transition-all duration-500 overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/20" />
                  <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/10 blur-xl" />
                  <div className="absolute bottom-6 left-6 w-28 h-28 rounded-full bg-black/5 blur-xl" />
                  <CatIcon className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 text-white drop-shadow-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500" />
                </div>
                {/* Floating badges */}
                <div className="absolute -top-2 -right-2 animate-bounce">
                  <div className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${qualityBadge.gradient} text-white text-[10px] font-bold shadow-xl shadow-black/20 flex items-center gap-1`}>
                    <QualityIcon className="w-3 h-3" />
                    {product.quality}
                  </div>
                </div>
                <div className="absolute -bottom-2 -left-2">
                  <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-dark-card/90 backdrop-blur-md text-rose-600 dark:text-rose-400 text-xs font-bold shadow-xl flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {product.category}
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Product title & quick info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-xs font-semibold mb-4 border border-rose-200/50 dark:border-rose-800/30">
                <Sparkles className="w-3 h-3" />
                {product.brand}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-dark-text mb-4 font-display leading-[1.1] tracking-tight">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start mb-6">
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(averageRating)} />
                  <span className="text-lg font-bold text-gray-800 dark:text-dark-text">
                    {averageRating}
                  </span>
                  <span className="text-sm text-gray-400 dark:text-dark-text-secondary">
                    ({comments.length} {comments.length === 1 ? "reseña" : "reseñas"})
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-12 gap-8 xl:gap-12 items-start">

          {/* ════════════ LEFT COLUMN ════════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">

            {/* ─── GALLERY ─── */}
            <div
              ref={galleryRef}
              className="group relative bg-white dark:bg-dark-card rounded-[2.5rem] shadow-2xl dark:shadow-dark-border/20 border border-gray-100/80 dark:border-dark-border/80 overflow-hidden"
              onMouseEnter={() => setIsHoveringGallery(true)}
              onMouseLeave={() => setIsHoveringGallery(false)}
            >
              {/* Main Image */}
              <div className="relative overflow-hidden">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${currentImage.color} opacity-60 dark:opacity-40 transition-all duration-700 ease-out`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />

                {/* Decorative orbs */}
                <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-20 right-20 w-56 h-56 rounded-full bg-white/5 blur-3xl" />

                {/* Nav arrows */}
                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/80 dark:bg-dark-card/80 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/50 dark:border-dark-border/50 text-gray-700 dark:text-dark-text hover:bg-white dark:hover:bg-dark-card transition-all duration-300 z-10 ${
                        isHoveringGallery ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/80 dark:bg-dark-card/80 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/50 dark:border-dark-border/50 text-gray-700 dark:text-dark-text hover:bg-white dark:hover:bg-dark-card transition-all duration-300 z-10 ${
                        isHoveringGallery ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Expand button */}
                <button
                  onClick={() => setIsImageExpanded(!isImageExpanded)}
                  className={`absolute top-5 right-5 w-10 h-10 rounded-2xl bg-white/80 dark:bg-dark-card/80 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/50 dark:border-dark-border/50 text-gray-500 dark:text-dark-text-secondary hover:bg-white dark:hover:bg-dark-card hover:text-rose-500 dark:hover:text-rose-400 transition-all duration-300 z-10 ${
                    isHoveringGallery ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Image label */}
                {gallery[activeImageIndex]?.label && (
                  <div className="absolute top-5 left-5 z-10">
                    <span className="px-4 py-2 bg-black/50 backdrop-blur-md text-white text-xs font-medium rounded-xl border border-white/10 shadow-lg inline-flex items-center gap-1.5">
                      <Image className="w-3 h-3" />
                      {gallery[activeImageIndex].label}
                    </span>
                  </div>
                )}

                {/* Category badge */}
                <div className="absolute bottom-5 left-5 z-10">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r ${catColor} text-white text-sm font-bold rounded-xl shadow-xl shadow-black/20`}
                  >
                    <CatIcon className="w-4 h-4" />
                    {product.category}
                  </span>
                </div>

                {/* Stock badge */}
                <div className="absolute bottom-5 right-5 z-10">
                  <div
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-md shadow-xl ${
                      product.stock > 0
                        ? "bg-white/90 dark:bg-dark-card/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/30"
                        : "bg-white/90 dark:bg-dark-card/90 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-700/30"
                    }`}
                  >
                    {product.stock > 0 ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {product.stock < 10
                            ? `¡Solo quedan ${product.stock}!`
                            : "En stock"}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Agotado
                      </>
                    )}
                  </div>
                </div>

                {/* Center image / icon */}
                <div className={`relative h-72 sm:h-96 lg:h-[460px] flex items-center justify-center ${isImageExpanded ? "h-[600px]" : ""} transition-all duration-500`}>
                  {currentImage.src ? (
                    <img
                      src={currentImage.src}
                      alt={product.name}
                      className="w-full h-full object-contain p-6 drop-shadow-2xl"
                    />
                  ) : (
                    <div
                      className={`bg-white/20 dark:bg-white/10 backdrop-blur-xl rounded-[3rem] flex items-center justify-center shadow-2xl ring-1 ring-white/20 transition-all duration-500 ${
                        isImageExpanded ? "w-64 h-64" : "w-48 h-48 sm:w-56 sm:h-56"
                      }`}
                    >
                      <CatIcon
                        className={`text-white drop-shadow-2xl transition-all duration-500 ${
                          isImageExpanded ? "w-32 h-32" : "w-24 h-24 sm:w-28 sm:h-28"
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {gallery.length > 0 && (
                <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-black/10">
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
                    {gallery.map((img, index) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImageIndex(index)}
                        className={`relative group/thumb flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden transition-all duration-300 ${
                          activeImageIndex === index
                            ? "ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-dark-card scale-110 shadow-xl shadow-rose-200/50 dark:shadow-rose-500/30"
                            : "ring-1 ring-gray-200 dark:ring-dark-border opacity-60 hover:opacity-100 hover:ring-rose-300 dark:hover:ring-rose-700 hover:scale-105"
                        }`}
                      >
                        {img.src ? (
                          <img src={img.src} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${img.color} transition-transform duration-300 group-hover/thumb:scale-110`}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <CatIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                            </div>
                          </>
                        )}
                        {activeImageIndex === index && (
                          <div className="absolute inset-0 bg-rose-500/10" />
                        )}
                        <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl" />
                      </button>
                    ))}
                    {/* Image counter */}
                    <div className="flex-shrink-0 ml-auto px-3 py-1.5 bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm rounded-xl text-xs font-semibold text-gray-500 dark:text-dark-text-secondary border border-gray-100 dark:border-dark-border">
                      {activeImageIndex + 1} / {gallery.length}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── DESCRIPTION ─── */}
            <div className="bg-white dark:bg-dark-card rounded-[2.5rem] shadow-2xl dark:shadow-dark-border/20 p-6 sm:p-8 xl:p-10 border border-gray-100/80 dark:border-dark-border/80">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text font-display">
                    Descripción
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-dark-text-secondary">
                    Detalles del producto
                  </p>
                </div>
              </div>

              <div className="relative pl-6 border-l-2 border-rose-200 dark:border-rose-800/50">
                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-rose-500" />
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed text-[15px]">
                  {showFullDescription
                    ? product.longDescription
                    : product.longDescription.slice(0, 320)}
                  {product.longDescription.length > 320 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="ml-2 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                    >
                      {showFullDescription ? (
                        <>Ver menos <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Ver más <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  )}
                </p>
              </div>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-5 flex items-center gap-2.5 font-display">
                    <span className="w-1 h-6 bg-gradient-to-b from-rose-500 to-amber-500 rounded-full" />
                    Características destacadas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.features.map((feature, index) => (
                      <div
                        key={index}
                        className="group/feat flex items-center gap-3 p-4 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-900/10 dark:to-amber-900/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/20 hover:shadow-xl hover:shadow-rose-200/20 dark:hover:shadow-rose-900/20 transition-all duration-300 hover:-translate-y-1 hover:border-rose-200 dark:hover:border-rose-700/50"
                      >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 group-hover/feat:scale-110 transition-transform">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-dark-text-secondary font-medium leading-snug">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Care Instructions */}
              {product.careInstructions && (
                <div className="mt-8 p-5 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 hover:shadow-lg hover:shadow-blue-200/20 dark:hover:shadow-blue-900/20 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200/40 dark:shadow-blue-900/30">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-2">
                        <span>Instrucciones de cuidado</span>
                        <span className="px-2 py-0.5 bg-blue-200/50 dark:bg-blue-800/40 text-blue-600 dark:text-blue-300 text-[10px] font-bold rounded-full">
                          Recomendado
                        </span>
                      </h4>
                      <p className="text-sm text-blue-600/80 dark:text-blue-300/80 leading-relaxed">
                        {product.careInstructions}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── COMMENTS ─── */}
            <div className="bg-white dark:bg-dark-card rounded-[2.5rem] shadow-2xl dark:shadow-dark-border/20 p-6 sm:p-8 xl:p-10 border border-gray-100/80 dark:border-dark-border/80" id="comments">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-xl shadow-rose-200/40 dark:shadow-rose-500/20">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text font-display">
                      Comentarios
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-dark-text-secondary">
                      Opiniones de los clientes
                    </p>
                  </div>
                  <span className="px-3 py-1.5 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-full ml-2 border border-rose-200/50 dark:border-rose-800/30">
                    {comments.length}
                  </span>
                </div>
              </div>

              {/* New Comment Form */}
              {user ? (
                <form onSubmit={handleSubmitComment} className="mb-8 p-6 sm:p-7 bg-gradient-to-br from-gray-50 via-rose-50/30 to-amber-50/30 dark:from-dark-bg dark:via-rose-900/5 dark:to-amber-900/5 rounded-2xl border border-gray-100/80 dark:border-dark-border/80 shadow-inner">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md shadow-rose-200/40 dark:shadow-rose-500/20">
                      {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-dark-text">
                        {user?.name || user?.email || "Usuario"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                          Tu calificación:
                        </span>
                        <StarRating rating={newRating} interactive onRate={setNewRating} size="sm" />
                        <span className="text-xs text-gray-400 dark:text-dark-text-secondary font-medium">
                          ({newRating}/5)
                        </span>
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Comparte tu experiencia con este producto..."
                    rows="3"
                    className="w-full px-5 py-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 resize-none dark:text-dark-text dark:placeholder-dark-text-secondary mb-4 transition-all duration-200"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 dark:text-dark-text-secondary flex items-center gap-1.5">
                      <Send className="w-3 h-3" />
                      Tu opinión ayuda a otros usuarios
                    </p>
                    <button
                      type="submit"
                      disabled={!newComment.trim() || reviewStatus === "loading"}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold rounded-2xl hover:from-rose-600 hover:to-amber-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-rose-200/40 dark:shadow-rose-500/20 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      {reviewStatus === "loading" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Publicando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Publicar
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-8 p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <Link
                        to="/login"
                        className="font-bold underline decoration-2 decoration-amber-300 dark:decoration-amber-700 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                      >
                        Inicia sesión
                      </Link>{" "}
                      para dejar un comentario y calificar este producto.
                    </p>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {comments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/20 dark:to-amber-900/20 rounded-[2rem] flex items-center justify-center shadow-inner">
                    <MessageCircle className="w-12 h-12 text-rose-400 dark:text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2 font-display">
                    Sin comentarios aún
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary max-w-xs mx-auto leading-relaxed">
                    Sé el primero en compartir tu opinión sobre este producto y ayuda a otros adoptantes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-5 sm:p-6 bg-gray-50 dark:bg-dark-bg rounded-2xl border border-gray-100 dark:border-dark-border transition-all duration-200 hover:border-gray-200 dark:hover:border-dark-border hover:shadow-lg hover:shadow-gray-200/30 dark:hover:shadow-black/20"
                    >
                      {editingCommentId === comment.id ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                              Editando calificación:
                            </span>
                            <StarRating
                              rating={editRating}
                              interactive
                              onRate={setEditRating}
                              size="sm"
                            />
                            <span className="text-xs text-gray-400 dark:text-dark-text-secondary font-medium">
                              ({editRating}/5)
                            </span>
                          </div>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows="3"
                            className="w-full px-5 py-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 resize-none dark:text-dark-text transition-all duration-200"
                          />
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={handleCancelEdit}
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-dark-text-secondary bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all duration-200"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveEdit(comment.id)}
                              disabled={!editText.trim()}
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-2xl hover:from-rose-600 hover:to-amber-600 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-md shadow-rose-200/40 dark:shadow-rose-500/20">
                                {comment.userName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-dark-text">
                                  {comment.userName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <StarRating rating={comment.rating} size="sm" />
                                  <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                                    {formatDate(comment.date)}
                                  </span>
                                  {comment.editedAt && (
                                    <span className="text-[10px] text-gray-400 dark:text-dark-text-secondary italic bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded-full">
                                      editado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isOwnComment(comment) && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEdit(comment)}
                                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200"
                                  title="Editar comentario"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                                  title="Eliminar comentario"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="relative pl-11">
                            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-rose-200 to-amber-200 dark:from-rose-800/30 dark:to-amber-800/30" />
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                              {comment.text}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {comments.length > previewCommentsCount && (
                    <button
                      onClick={() => setShowAllComments(!showAllComments)}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gray-50 dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-dark-border text-sm font-bold text-rose-600 dark:text-rose-400 rounded-2xl border border-gray-100 dark:border-dark-border transition-all duration-200 hover:shadow-lg hover:shadow-rose-200/20 dark:hover:shadow-rose-900/20"
                    >
                      {showAllComments ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Mostrar menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Mostrar todos los comentarios ({comments.length})
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ════════════ RIGHT COLUMN (SIDEBAR) ════════════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">

            {/* ─── PURCHASE CARD ─── */}
            <div className="bg-white dark:bg-dark-card rounded-[2.5rem] shadow-2xl dark:shadow-dark-border/20 border border-gray-100/80 dark:border-dark-border/80 overflow-hidden group hover:shadow-3xl hover:shadow-rose-200/20 dark:hover:shadow-rose-900/20 transition-all duration-300">
              {/* Price header */}
              <div className="p-6 sm:p-7 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-900/10 dark:to-amber-900/10 border-b border-rose-100/50 dark:border-rose-900/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-rose-600/80 dark:text-rose-400/80 uppercase tracking-widest font-bold">
                    Precio
                  </p>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">
                    {discountPercent}% OFF
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-dark-text font-display tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-400 dark:text-dark-text-secondary line-through">
                      {formatPrice(originalPrice)}
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full text-center mt-0.5">
                      Ahorras {formatPrice(originalPrice - product.price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-4">
                {/* Stock warning */}
                {product.stock > 0 && product.stock < 10 && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">
                        ¡Stock bajo!
                      </p>
                      <p className="text-[11px] text-red-500/80 dark:text-red-400/80">
                        Solo quedan <strong>{product.stock}</strong> unidades
                      </p>
                    </div>
                  </div>
                )}

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={addedToCart || product.stock === 0}
                  className={`w-full inline-flex items-center justify-center gap-3 px-6 py-4 text-sm font-bold rounded-2xl transition-all duration-300 ${
                    addedToCart
                      ? "bg-emerald-500 text-white shadow-xl shadow-emerald-200/50 scale-[0.98]"
                      : product.stock === 0
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-xl shadow-rose-200/40 dark:shadow-rose-500/20 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]"
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <CheckCircle className="w-5 h-5 animate-bounce" />
                      ¡Agregado al Carrito!
                    </>
                  ) : product.stock === 0 ? (
                    <>
                      <XCircle className="w-5 h-5" />
                      Agotado
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Agregar al Carrito
                    </>
                  )}
                </button>

                {/* Favorite */}
                <button
                  onClick={handleToggleFavorite}
                  className={`w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold rounded-2xl transition-all duration-200 border-2 ${
                    isFav || addedToWishlist
                      ? "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-200/30 dark:shadow-rose-900/20"
                      : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 hover:shadow-lg hover:shadow-rose-200/20 dark:hover:shadow-rose-900/10"
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 transition-all duration-200 ${
                      isFav ? "fill-rose-500 text-rose-500" : ""
                    } ${addedToWishlist ? "animate-bounce fill-rose-500 text-rose-500" : ""}`}
                  />
                  {isFav ? "Quitar de Favoritos" : addedToWishlist ? "¡Añadido!" : "Agregar a Favoritos"}
                </button>

                {/* Trust badges */}
                <div className="pt-5 border-t border-gray-100 dark:border-dark-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Truck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          Envío rápido
                        </p>
                        <p className="text-[10px] text-emerald-500/80 dark:text-emerald-400/80">
                          2-4 días hábiles
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <RotateCcw className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                          Devoluciones
                        </p>
                        <p className="text-[10px] text-blue-500/80 dark:text-blue-400/80">
                          30 días gratis
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-dark-text-secondary p-2 bg-gray-50/50 dark:bg-dark-bg/50 rounded-2xl">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Compra 100% segura</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SELLER CARD (Dinámica: Refugio o Tienda) ─── */}
            {(productShelter || productStore) && (
              <div className="bg-white dark:bg-dark-card rounded-[2.5rem] shadow-2xl dark:shadow-dark-border/20 border border-gray-100/80 dark:border-dark-border/80 overflow-hidden group hover:shadow-3xl hover:shadow-rose-200/20 dark:hover:shadow-rose-900/20 transition-all duration-300">
                {sellerInfo.type === 'shelter' ? (
                  <>
                    {/* ─── SHELTER HEADER ─── */}
                    <div className="relative h-32 bg-gradient-to-br from-rose-500 via-rose-400 to-amber-400 dark:from-rose-600 dark:via-rose-500 dark:to-amber-500 overflow-hidden">
                      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-amber-300/20 blur-3xl" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{
                          backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.2) 0%, transparent 50%)'
                        }} />
                      </div>
                      <div className="relative h-full flex items-end px-6 pb-6">
                        <div className="flex items-end gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <PawPrint className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                          <div className="pb-1">
                            <p className="text-[10px] text-white/80 uppercase tracking-widest font-bold">
                              Refugio
                            </p>
                            <h3 className="text-lg font-bold text-white font-display drop-shadow-sm">
                              {productShelter.name}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 pt-2 space-y-4">
                      {/* Location */}
                      {productShelter.location && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-900/10 dark:to-amber-900/10 rounded-2xl border border-rose-100/30 dark:border-rose-900/20 group-hover:shadow-md group-hover:shadow-rose-200/20 dark:group-hover:shadow-rose-900/20 transition-all duration-300">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <MapPin className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                            {productShelter.location}
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      {productShelter.description && (
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary leading-relaxed px-1 italic border-l-2 border-rose-200 dark:border-rose-800/50 pl-3">
                          "{productShelter.description}"
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-3 pt-2">
                        <Link
                          to={`/shelter/${productShelter.id}`}
                          className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-2xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 shadow-xl shadow-rose-200/40 dark:shadow-rose-500/20 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] group/btn"
                        >
                          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform duration-200">
                            <PawPrint className="w-4 h-4" />
                          </div>
                          <span className="flex-1 text-left">Ver mascotas de este refugio</span>
                          <div className="flex items-center">
                            <span className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
                              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                            </span>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ─── STORE HEADER ─── */}
                    <div className={`relative h-32 bg-gradient-to-br ${productStore.color || 'from-purple-500 to-pink-500'} overflow-hidden`}>
                      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-pink-300/20 blur-3xl" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{
                          backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.2) 0%, transparent 50%)'
                        }} />
                      </div>
                      <div className="relative h-full flex items-end px-6 pb-6">
                        <div className="flex items-end gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                            <Store className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                          <div className="pb-1">
                            <p className="text-[10px] text-white/80 uppercase tracking-widest font-bold">
                              Tienda Asociada
                            </p>
                            <h3 className="text-lg font-bold text-white font-display drop-shadow-sm">
                              {productStore.name}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 pt-2 space-y-4">
                      {/* Location */}
                      {productStore.location && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-2xl border border-purple-100/30 dark:border-purple-900/20 group-hover:shadow-md group-hover:shadow-purple-200/20 dark:group-hover:shadow-purple-900/20 transition-all duration-300">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <MapPin className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
                            {productStore.location}
                          </span>
                        </div>
                      )}

                      {/* Rating */}
                      {productStore.rating && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 rounded-2xl border border-amber-100/30 dark:border-amber-900/20">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Star className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-dark-text">
                              {productStore.rating}
                            </span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${
                                    star <= Math.round(productStore.rating)
                                      ? "text-amber-400 fill-amber-400"
                                      : "text-gray-200 dark:text-gray-600"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-400 dark:text-dark-text-secondary">
                              ({productStore.reviews} reseñas)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {productStore.description && (
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary leading-relaxed px-1 italic border-l-2 border-purple-200 dark:border-purple-800/50 pl-3">
                          "{productStore.description}"
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-3 pt-2">
                        <Link
                          to={`/store-profile/${productStore.id}`}
                          className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-xl shadow-purple-200/40 dark:shadow-purple-500/20 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] group/btn"
                        >
                          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform duration-200">
                            <Store className="w-4 h-4" />
                          </div>
                          <span className="flex-1 text-left">Ver perfil de la tienda</span>
                          <div className="flex items-center">
                            <span className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
                              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                            </span>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── PRODUCT SPECS ─── */}
            <div className="lg:sticky lg:top-[11.5rem] bg-white dark:bg-dark-card rounded-[2.5rem] shadow-2xl dark:shadow-dark-border/20 p-6 sm:p-7 border border-gray-100/80 dark:border-dark-border/80">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20">
                  <Box className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
                    Detalles del Producto
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-dark-text-secondary">
                    Especificaciones técnicas
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <SpecItem icon={Tag} label="Marca" value={product.brand} />
                <SpecItem icon={Shield} label="Material" value={product.material} />
                <SpecItem
                  icon={Ruler}
                  label="Tamaños disponibles"
                  value={product.sizes.map((s, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-900/20 dark:to-amber-900/20 text-gray-700 dark:text-dark-text-secondary text-xs font-semibold rounded-xl border border-rose-100/50 dark:border-rose-900/30"
                    >
                      {s}
                    </span>
                  ))}
                />
                <SpecItem
                  icon={Award}
                  label="Calidad"
                  value={
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border ${qualityBadge.bg} ${qualityBadge.text} ${qualityBadge.border}`}
                    >
                      {product.quality === "Premium" ? (
                        <Sparkles className="w-3 h-3" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {product.quality}
                    </span>
                  }
                />
                <SpecItem
                  icon={Package}
                  label="Stock disponible"
                  value={
                    <span
                      className={`inline-flex items-center gap-1.5 font-bold ${
                        product.stock > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {product.stock > 0 ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {product.stock > 0
                        ? `${product.stock} unidades`
                        : "Agotado"}
                    </span>
                  }
                />
              </div>
            </div>

            {/* ─── RATING SUMMARY ─── */}
            {comments.length > 0 && (
              <div className="bg-white dark:bg-dark-card rounded-[2.5rem] shadow-2xl dark:shadow-dark-border/20 p-6 sm:p-7 border border-gray-100/80 dark:border-dark-border/80">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-200/40 dark:shadow-amber-900/20">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
                      Resumen de calificaciones
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-dark-text-secondary">
                      Basado en {comments.length} {comments.length === 1 ? "opinión" : "opiniones"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="text-center flex-shrink-0">
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 rounded-[1.5rem] flex flex-col items-center justify-center shadow-inner">
                      <span className="text-3xl font-bold text-gray-900 dark:text-dark-text font-display">
                        {averageRating}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-dark-text-secondary">
                        de 5
                      </span>
                    </div>
                    <div className="mt-2 flex justify-center">
                      <StarRating rating={Math.round(averageRating)} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = comments.filter((c) => c.rating === star).length;
                      const percentage = comments.length > 0 ? (count / comments.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 mb-2 last:mb-0 group/bar">
                          <span className="text-xs text-gray-500 dark:text-dark-text-secondary w-3 flex-shrink-0 font-semibold">
                            {star}
                          </span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                          <div className="flex-1 h-3 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500 group-hover/bar:from-amber-500 group-hover/bar:to-amber-600"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 dark:text-dark-text-secondary w-5 text-right flex-shrink-0 font-semibold">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modal de publicación de reseña ─── */}
      {reviewStatus && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-modal-content">
            {reviewStatus === "loading" ? (
              <>
                <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-1.5 font-display">
                  Publicando tu comentario...
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-5">
                  Esto puede tomar unos segundos
                </p>
                <div className="h-2 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full animate-pulse" />
                </div>
              </>
            ) : reviewStatus === "success" ? (
              <>
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-1.5 font-display">
                  ¡Comentario publicado!
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                  Gracias por compartir tu opinión
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-1.5 font-display">
                  No se pudo publicar
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                  Inténtalo de nuevo en unos momentos
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── CSS for floating animation ─── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(2deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
          75% { transform: translateY(-20px) rotate(1deg); }
        }
        .animate-float {
          animation: float var(--duration, 6s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }
        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #374151;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float, .animate-pulse, .animate-bounce {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function SpecItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/20 dark:to-amber-900/20 flex items-center justify-center flex-shrink-0 group-hover:shadow-lg group-hover:shadow-rose-200/30 dark:group-hover:shadow-rose-900/20 group-hover:scale-105 transition-all duration-200">
        <Icon className="w-4 h-4 text-rose-500 dark:text-rose-400" />
      </div>
      <div className="min-w-0 mt-0.5">
        <p className="text-xs text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider font-medium">
          {label}
        </p>
        <div className="mt-1.5">
          {typeof value === "string" ? (
            <p className="text-sm font-bold text-gray-900 dark:text-dark-text">{value}</p>
          ) : (
            <div className="flex flex-wrap gap-2">{value}</div>
          )}
        </div>
      </div>
    </div>
  );
}
