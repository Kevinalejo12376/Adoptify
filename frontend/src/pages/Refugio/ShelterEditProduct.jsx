import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Save, X, Package, Edit3,
  DollarSign, ChevronDown, Info, Tag, AlertCircle,
  Shirt, Bone, Stethoscope, Droplets, Dog, Scissors, Sparkles
} from "lucide-react";
import { categoryIcons, categoryColors } from "../../data/products";
import { actualizarProducto } from "../../api/productos";
import ConfirmModal from "../../components/ConfirmModal";
import ImageUploader from "../../components/ImageUploader";
import FieldError from "../../components/FieldError";
import { useImageUpload } from "../../hooks/useImageUpload";
import { claseInput, limpiarEspacios } from "../../utils/validaciones";
import { normalizarPrecioInput, parsearPrecioInput } from "../../utils/price";

const categories = ["Alimentos", "Accesorios", "Juguetes", "Salud", "Higiene"];
const MAX_IMAGES = 5;

const toPayload = (d) => ({
  nombre: d.name,
  categoria: d.category,
  // El precio se ingresa en formato colombiano (p. ej. "15.000") y se convierte
  // a número antes de enviarlo al backend.
  precio: parsearPrecioInput(d.price),
  descuento: parseInt(d.discount) || 0,
  stock: parseInt(d.stock) || 0,
  descripcion: d.description,
  marca: d.brand,
  material: d.material,
  colores: d.colors,
  tallas: Array.isArray(d.sizes) ? d.sizes.join(",") : (d.sizes || ""),
});

const categoryFields = {
  Ropa: { sizes: true, material: true, colors: true, sizeOptions: ["XS", "S", "M", "L", "XL", "XXL"], label: "Prenda de vestir" },
  Accesorios: { sizes: true, material: true, colors: true, sizeOptions: ["S", "M", "L", "XL"], label: "Accesorio" },
  Alimentos: { sizes: true, material: false, colors: false, sizeOptions: ["250g", "500g", "1kg", "2kg", "5kg", "250ml", "500ml", "1L", "1.5L"], label: "Alimento" },
  Juguetes: { sizes: true, material: true, colors: true, sizeOptions: ["S", "M", "L"], label: "Juguete" },
  Salud: { sizes: true, material: false, colors: false, sizeOptions: ["3 dosis", "6 dosis", "12 dosis", "30 tabletas", "60 tabletas", "120 tabletas"], label: "Producto de salud" },
  Higiene: { sizes: true, material: false, colors: false, sizeOptions: ["250ml", "500ml", "1L"], label: "Producto de higiene" },
};


const CategorySpecificFields = ({ data, setData, category }) => {
  const fields = categoryFields[category];
  if (!fields) return null;
  const InputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white";

  return (
    <>
      {fields.material && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Material</label>
          <input type="text" value={data.material || ""} onChange={(e) => setData({...data, material: e.target.value})}
            className={InputClass} placeholder="Ej: Cuero sintético, Algodón, Caucho" />
        </div>
      )}
      {fields.colors && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Colores Disponibles</label>
          <input type="text" value={data.colors || ""} onChange={(e) => setData({...data, colors: e.target.value})}
            className={InputClass} placeholder="Ej: Negro, Marrón, Rojo, Azul" />
        </div>
      )}
      {fields.sizes && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tallas / Tamaños</label>
          <div className="flex flex-wrap gap-2">
            {fields.sizeOptions.map(size => {
              const isSelected = (data.sizes || []).includes(size);
              return (
                <button key={size} type="button" onClick={() => {
                  const current = data.sizes || [];
                  setData({ ...data, sizes: isSelected ? current.filter(s => s !== size) : [...current, size] });
                }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? "bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400"
                      : "bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-rose-300 dark:hover:border-rose-500/40"
                  }`}>
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

const FormSection = ({ icon: Icon, title, children, color = "text-rose-500" }) => (
  <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-dark-border">
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="text-sm font-bold text-gray-900 dark:text-white font-display">{title}</span>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export default function ShelterEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialProduct = location.state?.product;

  const [productData, setProductData] = useState(initialProduct ? {
    ...initialProduct,
    price: normalizarPrecioInput(initialProduct.price),
    discount: initialProduct.discount != null ? String(initialProduct.discount) : "",
    stock: initialProduct.stock?.toString() || "",
    features: Array.isArray(initialProduct.features) ? initialProduct.features.join(", ") : (initialProduct.features || ""),
    sizes: initialProduct.sizes || [],
    // Normaliza las imágenes a { id, url } para que ImageUploader las muestre
    // correctamente y se puedan enviar al guardar.
    images: (initialProduct.images || []).map((img) => ({
      id: img.id,
      url: img.url || img.src,
      label: img.label || "",
    }))
  } : null);

  const [isSaving, setIsSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  // Subida a Cloudinary SOLO al guardar (las imágenes se aplican localmente
  // con "Aplicar" y se suben aquí, no antes).
  const { upload, uploadDataUrl } = useImageUpload({ tipo: "producto" });
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  if (!productData) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-rose-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Producto no encontrado</h3>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-6">No se pudo cargar la información para editar.</p>
          <button onClick={() => navigate("/refugio/tienda")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg">
            <ArrowLeft className="w-4 h-4" /> Volver a tienda
          </button>
        </div>
      </div>
    );
  }

  // Validación por tipo de campo (mensajes específicos, sin iconos).
  const validarCampo = (campo, valor) => {
    switch (campo) {
      case "name":
        if (!limpiarEspacios(valor)) return "El nombre del producto es obligatorio.";
        return "";
      case "price": {
        if (valor === "" || valor == null) return "El precio es obligatorio.";
        const precio = parsearPrecioInput(valor);
        if (isNaN(precio) || precio <= 0) return "El precio debe ser un número mayor a 0.";
        return "";
      }
      case "stock": {
        if (valor === "" || valor == null) return "El stock es obligatorio.";
        const stock = parseInt(valor, 10);
        if (isNaN(stock) || stock < 0) return "El stock debe ser un número mayor o igual a 0.";
        return "";
      }
      case "discount": {
        if (valor === "" || valor == null) return "";
        const d = parseInt(valor, 10);
        if (isNaN(d) || d < 0 || d > 100) return "El descuento debe estar entre 0 y 100.";
        return "";
      }
      case "description":
        if (!limpiarEspacios(valor)) return "La descripción es obligatoria.";
        return "";
      default:
        return "";
    }
  };

  // Sube las imágenes a Cloudinary con el flujo unificado y guarda su URL.
  const handleImagesChange = (newImages) => {
    setProductData(prev => ({ ...prev, images: newImages }));
    setHasChanges(true);
  };

  const handleChange = (field, value) => {
    setProductData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (["name", "price", "stock", "discount", "description"].includes(field)) {
      setErrors(prev => ({ ...prev, [field]: validarCampo(field, value) }));
      setSubmitError("");
    }
  };

  const handleCategoryChange = (cat) => {
    setProductData(prev => ({ ...prev, category: cat, sizes: [], material: "", colors: "" }));
    setHasChanges(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const nuevosErrores = {
      name: validarCampo("name", productData.name),
      price: validarCampo("price", productData.price),
      stock: validarCampo("stock", productData.stock),
      discount: validarCampo("discount", productData.discount),
      description: validarCampo("description", productData.description),
    };
    setErrors(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    setIsSaving(true);
    try {
      // Las imágenes locales (diferidas con "Aplicar") se suben a Cloudinary
      // ÚNICAMENTE aquí, al presionar "Guardar cambios".
      const imagenesFinales = [];
      const images = productData.images || [];
      for (const img of images) {
        if (!img.url) continue;
        if (img.file && img.url.startsWith("blob:")) {
          const res = await upload(img.file);
          if (!res.ok) throw new Error(res.error || "No se pudo subir una imagen");
          imagenesFinales.push(res.url);
        } else if (img.url.startsWith("data:")) {
          const res = await uploadDataUrl(img.url);
          if (!res.ok) throw new Error(res.error || "No se pudo subir una imagen");
          imagenesFinales.push(res.url);
        } else {
          // Imagen existente: URL permanente de Cloudinary.
          imagenesFinales.push(img.url);
        }
      }

      await actualizarProducto(productData.id, {
        ...toPayload(productData),
        imagenes: imagenesFinales,
      });
      navigate("/refugio/tienda", { state: { updatedProduct: true } });
    } catch (err) {
      setIsSaving(false);
      setSubmitError(
        err?.message || "No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo."
      );
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowCancelModal(true);
    } else {
      navigate("/refugio/tienda");
    }
  };

  const InputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white transition-all";
  const SelectClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none cursor-pointer";

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-left">
          <div>
            <button onClick={handleCancel}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3 group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Volver a tienda
            </button>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium mb-3 shadow-sm">
              <Edit3 className="w-4 h-4" />
              <span>Editar Producto</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">{productData.name}</h1>
            <p className="text-gray-500 dark:text-dark-text-secondary mt-1">Modifica los datos del producto</p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <FormSection icon={Info} title="Información Básica" color="text-blue-500">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nombre del Producto *</label>
                <input type="text" value={productData.name} onChange={(e) => handleChange("name", e.target.value)}
                  className={claseInput(InputClass, !!errors.name)} placeholder="Ej: Collar Premium Ajustable" />
                <FieldError mensaje={errors.name} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Categoría</label>
                <div className="relative">
                  <select value={productData.category} onChange={(e) => handleCategoryChange(e.target.value)}
                    className={SelectClass}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Marca</label>
                <input type="text" value={productData.brand || ""} onChange={(e) => handleChange("brand", e.target.value)}
                  className={InputClass} placeholder="Ej: PetStyle" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Precio ($) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" inputMode="numeric" value={productData.price}
                    onChange={(e) => handleChange("price", normalizarPrecioInput(e.target.value))}
                    className={claseInput("w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white", !!errors.price)}
                    placeholder="0" />
                </div>
                <FieldError mensaje={errors.price} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Stock *</label>
                <input type="number" min="0" value={productData.stock}
                  onChange={(e) => handleChange("stock", e.target.value)}
                  className={claseInput(InputClass, !!errors.stock)} placeholder="0" />
                <FieldError mensaje={errors.stock} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Descuento (%)</label>
                <input type="number" min="0" max="100" value={productData.discount ?? ""}
                  onChange={(e) => handleChange("discount", e.target.value)}
                  className={InputClass} placeholder="0" />
              </div>
            </div>
          </FormSection>

          {/* Category Specific Fields */}
          {["Ropa", "Accesorios", "Alimentos", "Juguetes", "Salud", "Higiene"].includes(productData.category) && (
            <FormSection icon={Tag} title={`Detalles de ${categoryFields[productData.category]?.label || productData.category}`} color="text-amber-500">
              <CategorySpecificFields data={productData} setData={(data) => { setProductData(data); setHasChanges(true); }} category={productData.category} />
              {productData.category === "Alimentos" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Ingredientes</label>
                  <input type="text" value={productData.ingredients || ""} onChange={(e) => handleChange("ingredients", e.target.value)}
                    className={InputClass} placeholder="Ej: Pollo, arroz, verduras" />
                </div>
              )}
              {productData.category === "Salud" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Ingredientes Activos</label>
                  <input type="text" value={productData.activeIngredients || ""} onChange={(e) => handleChange("activeIngredients", e.target.value)}
                    className={InputClass} placeholder="Ej: Ivermectina, Praziquantel" />
                </div>
              )}
              {productData.category === "Higiene" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Aroma / Tipo</label>
                  <input type="text" value={productData.scent || ""} onChange={(e) => handleChange("scent", e.target.value)}
                    className={InputClass} placeholder="Ej: Avena, Manzanilla, Neutro" />
                </div>
              )}
            </FormSection>
          )}

          {/* Description & Features */}
          <FormSection icon={Tag} title="Descripción y Características" color="text-emerald-500">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Descripción *</label>
              <textarea rows={3} value={productData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={claseInput("w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none", !!errors.description)}
                placeholder="Describe el producto y sus beneficios..." />
              <FieldError mensaje={errors.description} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Características (separado por comas)</label>
              <input type="text" value={productData.features || ""} onChange={(e) => handleChange("features", e.target.value)}
                className={InputClass} placeholder="Ej: Hebilla ajustable, Costuras reforzadas, Resistente al agua" />
            </div>
          </FormSection>

          {/* Images (Cloudinary unificado) */}
          <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
            <ImageUploader
              tipo="producto"
              multiple
              maxFiles={MAX_IMAGES}
              label={`Imágenes del Producto (Máx. ${MAX_IMAGES})`}
              value={productData.images || []}
              onChange={handleImagesChange}
              onUploadingChange={setIsUploadingImages}
              // "Aplicar" solo recorta/rota y deja la imagen local; se sube a
              // Cloudinary únicamente al presionar "Guardar cambios".
              diferirSubida
            />
          </div>

          {/* General submit error */}
          {submitError && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-red-500 leading-snug">
                <span className="font-bold">*</span> {submitError}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
            <button type="submit" disabled={isSaving || isUploadingImages}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all hover:shadow-lg hover:shadow-rose-200 dark:hover:shadow-rose-500/20 disabled:opacity-75 text-sm">
              {isSaving || isUploadingImages ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Guardando...</>
              ) : (
                <><Save className="w-4 h-4" />Guardar Cambios</>
              )}
            </button>
            <button type="button" onClick={handleCancel}
              className="inline-flex items-center justify-center gap-2 py-3 px-8 text-gray-600 dark:text-gray-400 font-semibold rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg transition-all text-sm">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </form>
      </section>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => { setShowCancelModal(false); navigate("/refugio/tienda"); }}
        title="¿Descartar cambios?"
        message="Tienes cambios sin guardar. Si sales, se perderán todas las modificaciones realizadas."
        confirmText="Descartar"
        cancelText="Seguir editando"
        type="warning"
      />
    </div>
  );
}
