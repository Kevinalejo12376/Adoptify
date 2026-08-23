import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Package, Edit3, Trash2, DollarSign, ShoppingBag,
  Star, TrendingUp, Eye, EyeOff, Info, CheckCircle, Tag,
  AlertCircle, ChevronRight, Box
} from "lucide-react";
import { categoryIcons, categoryColors } from "../../data/products";
import { actualizarProducto, eliminarProducto } from "../../api/productos";
import ConfirmModal from "../../components/ConfirmModal";
import { formatPrice } from "../../utils/price";

const CatIconComponent = ({ category, className }) => {
  const Icon = categoryIcons[category] || Package;
  return <Icon className={className} />;
};

export default function ShelterProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const product = location.state?.product;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deleted, setDeleted] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <Package className="w-10 h-10 text-rose-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Producto no encontrado</h3>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-6">No se pudo cargar la información de este producto.</p>
          <button onClick={() => navigate("/refugio/tienda")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg">
            <ArrowLeft className="w-4 h-4" /> Volver a tienda
          </button>
        </div>
      </div>
    );
  }

  const catColor = categoryColors[product.category] || "from-gray-400 to-gray-500";
  const isLowStock = product.stock > 0 && product.stock <= 10;
  const isOutOfStock = product.stock === 0;
  const images = product.images || [];

  const handleDelete = async () => {
    setShowDeleteModal(false);
    try {
      await eliminarProducto(product.id);
      setDeleted(true);
      setTimeout(() => navigate("/refugio/tienda", { state: { deletedProductId: product.id } }), 300);
    } catch (err) {
      // noop
    }
  };

  const handleEdit = () => {
    navigate(`/refugio/tienda/editar/${product.id}`, { state: { product } });
  };

  const handleToggleActive = async () => {
    try {
      await actualizarProducto(product.id, { activo: !product.active });
      navigate("/refugio/tienda", { state: { toggledProductId: product.id, newActiveState: !product.active } });
    } catch (err) {
      // noop
    }
  };

  const features = Array.isArray(product.features) ? product.features
    : typeof product.features === "string" ? product.features.split(",").map(f => f.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header Navigation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center justify-between animate-fade-in-left">
          <button onClick={() => navigate("/refugio/tienda")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Volver a tienda
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all">
              <Edit3 className="w-4 h-4" /> Editar
            </button>
            <button onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {deleted ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/10 dark:to-teal-500/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Producto eliminado</h3>
            <p className="text-gray-500 dark:text-dark-text-secondary">{product.name} ha sido eliminado de la tienda.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden animate-fade-in-up">
                {images.length > 0 ? (
                  <>
                    <div className="relative h-72 sm:h-96 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-border dark:to-dark-bg">
                      <img src={images[currentImageIndex]?.src} alt={product.name}
                        className="w-full h-full object-cover" />
                      {images.length > 1 && (
                        <>
                          <button onClick={() => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 dark:bg-dark-bg/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-dark-bg transition-all">
                            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300 rotate-180" />
                          </button>
                          <button onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 dark:bg-dark-bg/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-dark-bg transition-all">
                            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                          </button>
                        </>
                      )}
                      <span className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-lg">
                        {currentImageIndex + 1} / {images.length}
                      </span>
                    </div>
                    <div className="flex gap-2 p-3 overflow-x-auto">
                      {images.map((img, idx) => (
                        <button key={img.id} onClick={() => setCurrentImageIndex(idx)}
                          className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                            idx === currentImageIndex
                              ? "border-rose-500 ring-2 ring-rose-200 dark:ring-rose-500/30"
                              : "border-gray-200 dark:border-dark-border opacity-70 hover:opacity-100"
                          }`}>
                          <img src={img.src} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-72 sm:h-96 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-border dark:to-dark-bg flex items-center justify-center">
                    <CatIconComponent category={product.category} className="w-32 h-32 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-rose-500" />
                  Descripción
                </h3>
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">{product.description}</p>

                {features.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Características
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {features.map((feature, i) => (
                        <span key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Specifications */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-500" />
                  Especificaciones
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {product.brand && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
                      <span className="text-xs text-gray-500 dark:text-dark-text-secondary">Marca</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{product.brand}</p>
                    </div>
                  )}
                  {product.material && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
                      <span className="text-xs text-gray-500 dark:text-dark-text-secondary">Material</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{product.material}</p>
                    </div>
                  )}
                  {product.colors && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
                      <span className="text-xs text-gray-500 dark:text-dark-text-secondary">Colores</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{product.colors}</p>
                    </div>
                  )}
                  {product.sizes && product.sizes.length > 0 && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
                      <span className="text-xs text-gray-500 dark:text-dark-text-secondary">Tallas disponibles</span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {product.sizes.map((s, i) => (
                          <span key={i}
                            className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-card px-2.5 py-1 rounded-lg border border-gray-200 dark:border-dark-border">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Hero Info */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center shrink-0">
                    <CatIconComponent category={product.category} className="w-8 h-8 text-rose-500/60" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display">{product.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500 dark:text-dark-text-secondary">{product.brand}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-dark-border" />
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/15 dark:to-amber-500/15 text-rose-700 dark:text-rose-300">
                        {product.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Stock */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold text-rose-600 dark:text-rose-400 font-display">{formatPrice(product.price)}</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isOutOfStock ? "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                      : isLowStock ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  }`}>
                    <ShoppingBag className="w-3 h-3" />
                    {isOutOfStock ? "Agotado" : `${product.stock} en stock`}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-dark-text-secondary">
                  {product.rating > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{product.rating}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{product.sales || 0}</span> vendidos
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      product.active ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-gray-50 dark:bg-dark-border"
                    }`}>
                      {product.active ? (
                        <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Estado</p>
                      <p className={`text-xs font-medium ${product.active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
                        {product.active ? "Producto activo en tienda" : "Producto oculto"}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleToggleActive}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      product.active
                        ? "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-bg"
                        : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                    }`}>
                    {product.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <div className="space-y-3">
                  <button onClick={handleEdit}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all">
                    <Edit3 className="w-4 h-4" />
                    Editar {product.name}
                  </button>
                  <button onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">
                    <Trash2 className="w-4 h-4" />
                    Eliminar producto
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="¿Eliminar producto?"
        message={`Esta acción no se puede deshacer. ${product.name} será eliminado permanentemente de la tienda.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
