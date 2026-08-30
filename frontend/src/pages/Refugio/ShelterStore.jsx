import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Store, Plus, Search, Package, DollarSign, X, Edit3, Trash2,
  AlertCircle, CheckCircle, Star, ShoppingBag,
  TrendingUp, Eye, EyeOff, Image, Upload, ChevronDown,
  ArrowUp, ArrowDown, Shirt, Bone, Stethoscope, Droplets, Dog,
  Sparkles, Ruler, Weight, Layers, Tag, Palette, Scissors,
  ShoppingCart, Heart, Phone, Mail, Clock, ChevronRight,
  ArrowLeft, Shield, Info, Box, Loader2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { categoryIcons, categoryColors } from "../../data/products";
import { misProductos, crearProducto, actualizarProducto, eliminarProducto } from "../../api/productos";
import ConfirmModal from "../../components/ConfirmModal";
import FieldError from "../../components/FieldError";
import Toast from "../../components/Toast";
import ProductSelectionModal from "../../components/ProductSelectionModal";
import { useImageUpload } from "../../hooks/useImageUpload";
import { claseInput, limpiarEspacios } from "../../utils/validaciones";
import { formatPrice, normalizarPrecioInput, parsearPrecioInput } from "../../utils/price";

const categories = ["Alimentos", "Accesorios", "Juguetes", "Salud", "Higiene"];
const MAX_IMAGES = 5;

// Normaliza un producto del backend a la forma que usa esta vista.
const mapProducto = (p) => ({
  id: p.id,
  name: p.nombre,
  category: p.categoria || "Alimentos",
  price: Number(p.precio) || 0,
  discount: p.descuento ?? 0,
  stock: p.stock ?? 0,
  description: p.descripcion || "",
  brand: p.marca || "",
  material: p.material || "",
  colors: p.colores || "",
  sizes: p.tallas ? String(p.tallas).split(",").map((s) => s.trim()).filter(Boolean) : [],
  active: p.activo,
  rating: Number(p.rating) || 0,
  sales: p.ventas || 0,
  features: [],
  // Imágenes persistentes de Cloudinary (producto_imagenes) devueltas por la API.
  images: (p.imagenes || []).map((img) => ({
    id: img.id,
    url: img.url,
    label: img.etiqueta || "",
  })),
});

// Construye el payload que espera el backend a partir del formulario.
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

export { mapProducto, toPayload };

const categoryFields = {
  Ropa: { sizes: true, material: true, colors: true, sizeOptions: ["XS", "S", "M", "L", "XL", "XXL"], label: "Prenda de vestir" },
  Accesorios: { sizes: true, material: true, colors: true, sizeOptions: ["S", "M", "L", "XL"], label: "Accesorio" },
  Alimentos: { sizes: true, material: false, colors: false, sizeOptions: ["250g", "500g", "1kg", "2kg", "5kg", "250ml", "500ml", "1L", "1.5L"], label: "Alimento" },
  Juguetes: { sizes: true, material: true, colors: true, sizeOptions: ["S", "M", "L"], label: "Juguete" },
  Salud: { sizes: true, material: false, colors: false, sizeOptions: ["3 dosis", "6 dosis", "12 dosis", "30 tabletas", "60 tabletas", "120 tabletas"], label: "Producto de salud" },
  Higiene: { sizes: true, material: false, colors: false, sizeOptions: ["250ml", "500ml", "1L"], label: "Producto de higiene" },
};

const CatIconComponent = ({ category, className }) => {
  const Icon = categoryIcons[category] || Package;
  return <Icon className={className} />;
};

// ============================================================
// COMPONENTES DE FORMULARIO (nivel de módulo — estables)
// ============================================================

const ImageUploadSection = ({ images, onUpload, onRemove, onMove, label }) => {
  const inputRef = useRef(null);
  const count = images?.length || 0;
  const remaining = MAX_IMAGES - count;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} ({count}/{MAX_IMAGES})
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {(images || []).map((img, index) => (
          <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-border border border-gray-200 dark:border-dark-border">
            <img src={img.src} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => onRemove(img.id)}
                className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors" title="Eliminar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {index > 0 && (
                <button type="button" onClick={() => onMove(index, -1)}
                  className="p-1.5 bg-white/90 text-gray-700 rounded-lg hover:bg-white transition-colors" title="Mover izquierda">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
              {index < count - 1 && (
                <button type="button" onClick={() => onMove(index, 1)}
                  className="p-1.5 bg-white/90 text-gray-700 rounded-lg hover:bg-white transition-colors" title="Mover derecha">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded-md">
              {index + 1}
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-rose-400 dark:hover:border-rose-500 flex flex-col items-center justify-center gap-1 transition-all hover:bg-rose-50/50 dark:hover:bg-rose-500/5">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-[10px] text-gray-400 font-medium">{remaining}</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
    </div>
  );
};

const CategorySpecificFields = ({ data, setData, category }) => {
  const fields = categoryFields[category];
  if (!fields) return null;

  return (
    <>
      {fields.material && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
          <input type="text" value={data.material || ""} onChange={(e) => setData({...data, material: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            placeholder="Ej: Cuero sintético, Algodón, Caucho" />
        </div>
      )}
      {fields.colors && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Colores Disponibles</label>
          <input type="text" value={data.colors || ""} onChange={(e) => setData({...data, colors: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            placeholder="Ej: Negro, Marrón, Rojo, Azul" />
        </div>
      )}
      {fields.sizes && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tallas / Tamaños</label>
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

const ProductForm = ({ data, setData, onSubmit, onCancel, title, isEdit }) => {
  const category = data.category || "Alimentos";
  const [selectedCat, setSelectedCat] = useState(category);
  const [newProductImages] = useState(null);
  const [editProductImages] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const baseInputCls = "w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white";

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

  const handleChange = (campo, valor) => {
    setData((prev) => ({ ...prev, [campo]: valor }));
    if (["name", "price", "stock", "discount", "description"].includes(campo)) {
      setErrors((prev) => ({ ...prev, [campo]: validarCampo(campo, valor) }));
      setSubmitError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");
    const nuevosErrores = {
      name: validarCampo("name", data.name),
      price: validarCampo("price", data.price),
      stock: validarCampo("stock", data.stock),
      discount: validarCampo("discount", data.discount),
      description: validarCampo("description", data.description),
    };
    setErrors(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;
    onSubmit(e);
  };

  const handleNewProductImages = (e, setDataFn) => {
    const files = Array.from(e.target.files);
    const remaining = MAX_IMAGES - (data.images?.length || 0);
    const toAdd = files.slice(0, remaining);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newImg = { id: Date.now() + Math.random(), src: ev.target.result, file, label: "" };
        setDataFn(prev => ({ ...prev, images: [...(prev.images || []), newImg] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (imgId, setDataFn) => {
    setDataFn(prev => ({ ...prev, images: (prev.images || []).filter(img => img.id !== imgId) }));
  };

  const moveImage = (index, direction, setDataFn) => {
    const imgs = [...(data.images || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= imgs.length) return;
    [imgs[index], imgs[newIndex]] = [imgs[newIndex], imgs[index]];
    setDataFn(prev => ({ ...prev, images: imgs }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Producto *</label>
          <input type="text" value={data.name} onChange={(e) => handleChange("name", e.target.value)}
            className={claseInput(baseInputCls, !!errors.name)}
            placeholder="Ej: Collar Premium Ajustable" />
          <FieldError mensaje={errors.name} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
          <div className="relative">
            <select value={selectedCat} onChange={(e) => {
              const cat = e.target.value;
              setSelectedCat(cat);
              setData({...data, category: cat, sizes: [], material: "", colors: "" });
            }}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
          <input type="text" value={data.brand || ""} onChange={(e) => setData({...data, brand: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            placeholder="Ej: PetStyle" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio ($) *</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" inputMode="numeric" value={data.price}
              onChange={(e) => handleChange("price", normalizarPrecioInput(e.target.value))}
              className={claseInput(baseInputCls + " pl-10 pr-4", !!errors.price)}
              placeholder="0" />
          </div>
          <FieldError mensaje={errors.price} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descuento (%)</label>
          <input type="number" min="0" max="100" value={data.discount ?? ""}
            onChange={(e) => handleChange("discount", e.target.value)}
            className={baseInputCls}
            placeholder="0" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock *</label>
          <input type="number" min="0" value={data.stock}
            onChange={(e) => handleChange("stock", e.target.value)}
            className={claseInput(baseInputCls, !!errors.stock)}
            placeholder="0" />
          <FieldError mensaje={errors.stock} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descuento (%)</label>
          <input type="number" min="0" max="100" value={data.discount}
            onChange={(e) => handleChange("discount", e.target.value)}
            className={claseInput(baseInputCls, !!errors.discount)}
            placeholder="0" />
          <FieldError mensaje={errors.discount} />
        </div>
        {Number(data.discount) > 0 && parsePrecio(data.price) > 0 && (
          <p className="col-span-2 text-xs text-emerald-600 dark:text-emerald-400">
            Precio con descuento:{" "}
            <strong>{formatPrice(precioConDescuento(data.price, data.discount))}</strong>{" "}
            <span className="text-gray-400 line-through">{formatPrice(data.price)}</span>
          </p>
        )}

        {/* Vista previa: precio final con el descuento aplicado */}
        {(() => {
          const precioBase = parsearPrecioInput(data.price);
          const descuentoAplicado = Math.min(100, Math.max(0, parseInt(data.discount) || 0));
          if (!precioBase) return null;
          const precioFinal = descuentoAplicado > 0
            ? precioBase * (1 - descuentoAplicado / 100)
            : precioBase;
          return (
            <div className="col-span-2">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {descuentoAplicado > 0 ? (
                  <span>
                    Precio con {descuentoAplicado}% de descuento:{" "}
                    <strong className="font-bold">{formatPrice(precioFinal)}</strong>
                  </span>
                ) : (
                  <span>Precio final: <strong className="font-bold">{formatPrice(precioBase)}</strong></span>
                )}
              </div>
            </div>
          );
        })()}

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción *</label>
          <textarea rows={3} value={data.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className={claseInput(baseInputCls + " resize-none", !!errors.description)}
            placeholder="Describe el producto y sus beneficios..." />
          <FieldError mensaje={errors.description} />
        </div>

        {["Ropa", "Accesorios", "Alimentos", "Juguetes", "Salud", "Higiene"].includes(selectedCat) && (
          <>
            <div className="col-span-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-2 ${
                selectedCat === "Ropa" ? "bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-500/10 dark:to-fuchsia-500/10 border-violet-100 dark:border-violet-500/20" :
                selectedCat === "Accesorios" ? "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-purple-100 dark:border-purple-500/20" :
                selectedCat === "Alimentos" ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-emerald-100 dark:border-emerald-500/20" :
                selectedCat === "Juguetes" ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-100 dark:border-amber-500/20" :
                selectedCat === "Salud" ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border-blue-100 dark:border-blue-500/20" :
                "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-rose-100 dark:border-rose-500/20"
              }`}>
                {selectedCat === "Ropa" && <Shirt className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                {selectedCat === "Accesorios" && <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                {selectedCat === "Alimentos" && <Dog className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {selectedCat === "Juguetes" && <Bone className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                {selectedCat === "Salud" && <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                {selectedCat === "Higiene" && <Droplets className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                <span className="text-xs font-medium">{categoryFields[selectedCat]?.label}</span>
              </div>
            </div>
            <CategorySpecificFields data={data} setData={setData} category={selectedCat} />
          </>
        )}

        {selectedCat === "Alimentos" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ingredientes</label>
            <input type="text" value={data.ingredients || ""} onChange={(e) => setData({...data, ingredients: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
              placeholder="Ej: Pollo, arroz, verduras" />
          </div>
        )}

        {selectedCat === "Salud" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ingredientes Activos</label>
            <input type="text" value={data.activeIngredients || ""} onChange={(e) => setData({...data, activeIngredients: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
              placeholder="Ej: Ivermectina, Praziquantel" />
          </div>
        )}

        {selectedCat === "Higiene" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aroma / Tipo</label>
            <input type="text" value={data.scent || ""} onChange={(e) => setData({...data, scent: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
              placeholder="Ej: Avena, Manzanilla, Neutro" />
          </div>
        )}

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Características (separado por comas)</label>
          <input type="text" value={data.features || ""} onChange={(e) => setData({...data, features: e.target.value})}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            placeholder="Ej: Hebilla ajustable, Costuras reforzadas, Resistente al agua" />
        </div>

        <ImageUploadSection
          images={data.images}
          onUpload={(e) => handleNewProductImages(e, setData)}
          onRemove={(imgId) => removeImage(imgId, setData)}
          onMove={(index, direction) => moveImage(index, direction, setData)}
          label="Imágenes del Producto"
        />
      </div>

      {submitError && (
        <p className="text-xs font-medium text-red-500 leading-snug">
          <span className="font-bold">*</span> {submitError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit"
          className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all hover:shadow-lg hover:shadow-rose-200 dark:hover:shadow-rose-500/20 flex items-center justify-center gap-2">
          {isEdit ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {title}
        </button>
        <button type="button" onClick={onCancel}
          className="px-6 py-2.5 text-gray-600 dark:text-gray-400 font-medium rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg transition-all">
          Cancelar
        </button>
      </div>
    </form>
  );
};

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-100 dark:border-dark-border">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <span className={`text-2xl font-bold ${color} font-display`}>{value}</span>
    </div>
    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{label}</p>
  </div>
);


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ShelterStore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("todas");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, productId: null });
  const [confirmToggle, setConfirmToggle] = useState({ isOpen: false, productId: null, newState: false });

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  // Subida de imágenes a Cloudinary al guardar el producto.
  const { upload, uploadDataUrl } = useImageUpload({ tipo: "producto" });

  const recargar = async () => {
    setLoading(true);
    const inicio = Date.now();
    try {
      const data = await misProductos();
      setProducts((data || []).map(mapProducto));
    } catch (e) {
      setProducts([]);
    } finally {
      // Asegura que "Cargando productos..." sea visible al menos un instante,
      // aunque la respuesta del servidor sea inmediata.
      const restante = 400 - (Date.now() - inicio);
      setTimeout(() => setLoading(false), restante > 0 ? restante : 0);
    }
  };

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emptyProduct = { name: "", category: "Alimentos", price: "", discount: "", stock: "", description: "", brand: "", material: "", colors: "", sizes: [], features: "", active: true, images: [] };
  const [newProduct, setNewProduct] = useState({ ...emptyProduct });

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.active).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
  const totalSales = products.reduce((sum, p) => sum + p.sales, 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "todas" || p.category === filterCategory;
    const matchesActive = activeFilter === "todos" ||
      (activeFilter === "activos" && p.active) ||
      (activeFilter === "inactivos" && !p.active) ||
      (activeFilter === "agotados" && p.stock === 0) ||
      (activeFilter === "bajo-stock" && p.stock > 0 && p.stock <= 10);
    return matchesSearch && matchesCategory && matchesActive;
  });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    // Evitar duplicados: mismo nombre (ignorando mayúsculas) ya registrado.
    const nombre = (newProduct.name || "").trim().toLowerCase();
    if (nombre && products.some((p) => (p.name || "").trim().toLowerCase() === nombre)) {
      setToast({ message: "Este producto ya está registrado.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      // Las imágenes locales se suben a Cloudinary SOLO al guardar el producto.
      const imagenesFinales = [];
      const images = newProduct.images || [];
      for (const img of images) {
        if (!img.src && !img.file) continue;
        const res = img.file ? await upload(img.file) : await uploadDataUrl(img.src);
        if (!res.ok) throw new Error(res.error || "No se pudo subir una imagen");
        imagenesFinales.push(res.url);
      }
      await crearProducto({ ...toPayload(newProduct), imagenes: imagenesFinales });
      await recargar();
      setShowAddModal(false);
      setNewProduct({ ...emptyProduct });
    } catch (err) {
      // Si el backend rechaza por duplicado, muestra el mensaje flotante.
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("ya está registrado")) {
        setToast({ message: "Este producto ya está registrado.", type: "error" });
      }
      // se mantiene el modal abierto si falla
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (confirmDelete.productId) {
      try {
        await eliminarProducto(confirmDelete.productId);
        setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.productId));
      } catch (err) {
        // noop
      }
    }
    setConfirmDelete({ isOpen: false, productId: null });
  };

  const handleToggleActive = async () => {
    if (confirmToggle.productId) {
      try {
        await actualizarProducto(confirmToggle.productId, { activo: confirmToggle.newState });
        setProducts((prev) => prev.map((p) => (p.id === confirmToggle.productId ? { ...p, active: confirmToggle.newState } : p)));
      } catch (err) {
        // noop
      }
    }
    setConfirmToggle({ isOpen: false, productId: null, newState: false });
  };

  const openProductDetail = (product) => {
    navigate(`/refugio/tienda/${product.id}`, { state: { product } });
  };

  const openEditPage = (product) => {
    navigate(`/refugio/tienda/editar/${product.id}`, {
      state: {
        product: {
          ...product,
          price: product.price.toString(),
          stock: product.stock.toString(),
          features: product.features ? (Array.isArray(product.features) ? product.features.join(", ") : product.features) : "",
          sizes: product.sizes || [],
          images: product.images || []
        }
      }
    });
  };

  // Al volver de las paginas de edicion/detalle, recarga desde la BD.
  useEffect(() => {
    if (
      location.state?.updatedProduct ||
      location.state?.deletedProductId ||
      location.state?.toggledProductId !== undefined
    ) {
      recargar();
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="animate-fade-in-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-3 shadow-sm">
              <Store className="w-4 h-4" />
              <span>Gestión de Tienda</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Mi Tienda</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Administra los productos de tu refugio para la venta</p>
          </div>
          <button onClick={() => setShowSelectionModal(true)}
            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-200 dark:shadow-rose-500/20 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in-right">
            <Plus className="w-5 h-5 mr-2" /> Agregar Producto
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Total Productos" value={totalProducts} color="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-500/10" />
          <StatCard icon={CheckCircle} label="Productos Activos" value={activeProducts} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-500/10" />
          <StatCard icon={AlertCircle} label="Stock Bajo (≤10)" value={lowStock} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-500/10" />
          <StatCard icon={TrendingUp} label="Ventas Totales" value={totalSales} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-500/10" />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-border">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-shrink-0 sm:w-48">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none cursor-pointer">
                <option value="todas">Todas las categorías</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <input type="text" placeholder="Buscar por nombre, descripción o marca..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "todos", label: "Todos", icon: Layers },
              { id: "activos", label: "Activos", icon: Eye },
              { id: "inactivos", label: "Inactivos", icon: EyeOff },
              { id: "bajo-stock", label: "Stock Bajo", icon: AlertCircle },
              { id: "agotados", label: "Agotados", icon: X },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveFilter(activeFilter === id ? "todos" : id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === id ? "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400" : "bg-gray-50 dark:bg-dark-border/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border"
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
            <p>Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-rose-400 dark:text-rose-400/60" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">No hay productos</h3>
            <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
              {searchTerm || filterCategory !== "todas" || activeFilter !== "todos"
                ? "No se encontraron productos con los filtros actuales"
                : "Comienza agregando tu primer producto a la tienda"}
            </p>
            <button onClick={() => setShowSelectionModal(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> Agregar Producto
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product, idx) => {
              const catColor = categoryColors[product.category] || "from-gray-400 to-gray-500";
              const isLowStock = product.stock > 0 && product.stock <= 10;
              const isOutOfStock = product.stock === 0;
              return (
                <div key={product.id}
                  className={`group bg-white dark:bg-dark-card rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border ${product.active ? "border-gray-100 dark:border-dark-border" : "border-gray-200 dark:border-dark-border opacity-75"} overflow-hidden animate-fade-in-up`}
                  style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className={`relative h-40 bg-gradient-to-br ${catColor}/20 dark:${catColor}/10 flex items-center justify-center overflow-hidden`}>
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <CatIconComponent category={product.category} className={`w-20 h-20 ${catColor.replace('from-', 'text-').split(' ')[0]}/40 transition-transform group-hover:scale-110 duration-500`} />
                        <span className="text-[10px] font-medium text-gray-400 dark:text-dark-text-secondary bg-white/60 dark:bg-dark-bg/60 px-2 py-0.5 rounded-full backdrop-blur-sm">{product.category}</span>
                      </div>
                    )}
                    {product.images && product.images.length > 1 && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium rounded-lg">
                          <Image className="w-3 h-3" />{product.images.length}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                      {product.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100/90 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-medium backdrop-blur-sm">
                          <Eye className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200/90 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] font-medium backdrop-blur-sm">
                          <EyeOff className="w-3 h-3" /> Inactivo
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100/90 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-[10px] font-medium backdrop-blur-sm">
                          <AlertCircle className="w-3 h-3" /> Sin stock
                        </span>
                      )}
                      {isLowStock && !isOutOfStock && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100/90 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-[10px] font-medium backdrop-blur-sm">
                          <AlertCircle className="w-3 h-3" /> Stock bajo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white font-display leading-tight line-clamp-1 mb-1">{product.name}</h3>
                    <p className="text-[11px] text-gray-400 dark:text-dark-text-secondary mb-2 line-clamp-1">{product.brand}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-display">{formatPrice(product.price)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${isOutOfStock ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" : isLowStock ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                        {isOutOfStock ? "Agotado" : `${product.stock} uds`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-dark-text-secondary mb-3">
                      {product.rating > 0 && (
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{product.rating}</span>
                      )}
                      <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{product.sales} vendidos</span>
                    </div>
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {product.sizes.map((size, i) => (
                          <span key={i} className="text-[10px] font-medium text-gray-500 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border px-1.5 py-0.5 rounded-md">{size}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-dark-border">
                        <button onClick={() => openProductDetail(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all">
                          <Eye className="w-3.5 h-3.5" /> Ver perfil
                        </button>
                        <button onClick={() => openEditPage(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all">
                          <Edit3 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button onClick={() => setConfirmDelete({ isOpen: true, productId: product.id })}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 animate-modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                Nuevo Producto
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <ProductForm data={newProduct} setData={setNewProduct} onSubmit={handleAddProduct} onCancel={() => setShowAddModal(false)} title="Registrar Producto" isEdit={false} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, productId: null })}
        onConfirm={handleDeleteProduct}
        title="¿Eliminar producto?"
        message="Esta acción no se puede deshacer. El producto será eliminado permanentemente de la tienda."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Toggle Active Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmToggle.isOpen}
        onClose={() => setConfirmToggle({ isOpen: false, productId: null, newState: false })}
        onConfirm={handleToggleActive}
        title={confirmToggle.newState ? "¿Activar producto?" : "¿Desactivar producto?"}
        message={confirmToggle.newState ? "El producto será visible y estará disponible para la venta en la tienda." : "El producto dejará de ser visible para los usuarios en la tienda."}
        confirmText={confirmToggle.newState ? "Activar" : "Desactivar"}
        cancelText="Cancelar"
        type={confirmToggle.newState ? "info" : "warning"}
      />

      {/* Toast independiente (duplicados y otros avisos) */}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      {/* Modal de selección de método de agregado (IA, código de barras, manual) */}
      <ProductSelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        onSeleccionarManual={() => setShowAddModal(true)}
        onSeleccionarIA={() => navigate("/tienda/productos/analizar")}
        onSeleccionarBarcode={() => navigate("/tienda/productos/escanear")}
      />
    </div>
  );
}
