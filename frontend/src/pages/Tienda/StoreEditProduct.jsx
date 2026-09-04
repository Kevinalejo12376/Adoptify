import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Save, X, Plus, Loader2, CheckCircle2, AlertCircle,
  ImagePlus, Trash2, Package, Tag, Info, Layers, Eye, Sparkles, ImageOff,
} from "lucide-react";
import { obtenerMiProducto, crearMiProducto, crearMiProductoConImagenes, actualizarMiProducto } from "../../api/tienda";
import { getCategoriasProducto } from "../../api/catalogos";
import { formatPrice, normalizarPrecioInput, parsePrecio, parsearPrecioInput, precioConDescuento } from "../../utils/price";
import { readAndValidateImage, fileToBase64, MAX_IMAGE_SIZE_MB } from "../../utils/imageUtils";
import ImageEditorModal from "../../components/ImageEditorModal";

const defaultForm = {
  nombre: "", descripcion: "", descripcion_larga: "", precio: "", descuento: "", categoria: "",
  marca: "", material: "", calidad: "", stock: "", tallas: [], colores: [],
  ingredientes: "", ingredientes_activos: "", aroma: "", instrucciones_cuidado: "",
  tipo_mascota: "", edad_recomendada: "", peso: "", fabricante: "",
  registro_sanitario: "", advertencias: "", informacion_adicional: "",
  activo: true,
};

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-gray-900 dark:text-dark-text";

// ============================================================
// Subidor de imágenes del producto
// Flujo: seleccionar/arrastrar → editar (recortar/rotar/voltear) →
// "Aplicar" agrega la imagen a la galería. Máximo 5 imágenes.
// ============================================================
function SubidaImagenesProducto({ value = [], onChange, maxImages = 5 }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [editingSrc, setEditingSrc] = useState(null); // imagen en edición (base64)
  const [queue, setQueue] = useState([]); // cola de imágenes por editar
  const [error, setError] = useState("");

  const imagenes = value || [];

  const addError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const remaining = maxImages - imagenes.length;
    if (remaining <= 0) {
      addError(`Solo se permiten hasta ${maxImages} imágenes por producto.`);
      return;
    }
    const validas = [];
    for (const f of files.slice(0, remaining)) {
      const res = await readAndValidateImage(f);
      if (res.ok) validas.push(res.base64);
      else addError(res.error);
    }
    if (validas.length === 0) return;
    setEditingSrc(validas[0]);
    setQueue(validas.slice(1));
  };

  const handleApply = async (result) => {
    let base64 = result;
    if (result instanceof Blob || result instanceof File) {
      try {
        base64 = await fileToBase64(result);
      } catch {
        return;
      }
    }
    if (base64) onChange?.([...imagenes, base64]);
    // Continuar con la siguiente imagen en cola (si existe).
    if (queue.length > 0) {
      setEditingSrc(queue[0]);
      setQueue((q) => q.slice(1));
    } else {
      setEditingSrc(null);
    }
  };

  const handleCancel = () => {
    setEditingSrc(null);
    setQueue([]);
  };

  const removeImage = (index) => {
    onChange?.(imagenes.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Zona de arrastre / selección */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer?.files); }}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-rose-500 bg-rose-50/60 dark:bg-rose-500/10"
            : "border-gray-300 dark:border-dark-border hover:border-rose-400 dark:hover:border-rose-500/50 bg-gray-50/50 dark:bg-transparent"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <ImagePlus size={24} className="text-rose-500" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Arrastra tus imágenes aquí
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
            o haz clic para seleccionar archivos · JPG, PNG, WEBP, GIF, AVIF · máx. {MAX_IMAGE_SIZE_MB} MB
          </p>
          <p className="text-xs text-rose-500/80 font-medium">
            ✂️ Podrás recortar, rotar y voltear antes de aplicar
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <p className="text-xs text-red-700 dark:text-red-300 flex-1">{error}</p>
        </div>
      )}

      {/* Galería de imágenes */}
      {imagenes.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary">
              {imagenes.length} de {maxImages} imágenes
            </p>
            {imagenes.length >= maxImages && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Máximo alcanzado
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {imagenes.map((img, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border">
                <img
                  src={img}
                  alt={`Imagen ${i + 1}`}
                  className="w-full h-24 object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2VjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5YWEzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TSU4gSU1BR0VOPC90ZXh0Pjwvc3ZnPg==";
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  className="absolute top-1 right-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-semibold opacity-90 hover:bg-red-500 transition-all"
                  title="Quitar imagen"
                >
                  <Trash2 className="w-3 h-3" /> Quitar
                </button>
                <span className="absolute bottom-1 left-1 w-5 h-5 rounded-lg bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor de imagen */}
      <ImageEditorModal
        isOpen={!!editingSrc}
        imageSrc={editingSrc}
        aspectRatio={1}
        onApply={handleApply}
        onCancel={handleCancel}
      />
    </div>
  );
}

// ============================================================
// Campos específicos según la categoría seleccionada (mismas reglas que en el
// rol Refugio): Alimentos -> talla/tamaño (peso/volumen), Accesorios -> S/M/L/XL,
// Juguetes -> S/M/L, Ropa -> XS..XXL, Salud -> dosis/tabletas, Higiene -> volumen.
// ============================================================
const categoryFields = {
  Ropa: { sizes: true, material: true, colors: true, sizeOptions: ["XS", "S", "M", "L", "XL", "XXL"], label: "Prenda de vestir" },
  Accesorios: { sizes: true, material: true, colors: true, sizeOptions: ["S", "M", "L", "XL"], label: "Accesorio" },
  Alimentos: { sizes: true, material: false, colors: false, sizeOptions: ["250g", "500g", "1kg", "2kg", "5kg", "250ml", "500ml", "1L", "1.5L"], label: "Alimento" },
  Juguetes: { sizes: true, material: true, colors: true, sizeOptions: ["S", "M", "L"], label: "Juguete" },
  Salud: { sizes: true, material: false, colors: false, sizeOptions: ["3 dosis", "6 dosis", "12 dosis", "30 tabletas", "60 tabletas", "120 tabletas"], label: "Producto de salud" },
  Higiene: { sizes: true, material: false, colors: false, sizeOptions: ["250ml", "500ml", "1L"], label: "Producto de higiene" },
};

const CategorySpecificFields = ({ data, setData, colorInput, setColorInput, onAddColor, onRemoveColor }) => {
  const fields = categoryFields[data.categoria];
  if (!fields) return null;

  return (
    <>
      {fields.sizes && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Tallas / Tamaños</label>
          <div className="flex flex-wrap gap-2">
            {fields.sizeOptions.map((size) => {
              const isSelected = (data.tallas || []).includes(size);
              return (
                <button key={size} type="button"
                  onClick={() => {
                    const current = data.tallas || [];
                    setData("tallas", isSelected ? current.filter((s) => s !== size) : [...current, size]);
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
      {fields.material && (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Material</label>
          <input type="text" value={data.material || ""} onChange={(e) => setData("material", e.target.value)}
            className={inputCls} placeholder="Ej: Cuero sintético, Algodón, Caucho" />
        </div>
      )}
      {fields.colors && (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Colores Disponibles</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={colorInput} onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddColor(); } }}
              className="flex-1 px-3.5 py-2 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              placeholder="Ej: Negro, Marrón, Rojo" />
            <button type="button" onClick={onAddColor}
              className="px-3 py-2 bg-gray-100 dark:bg-dark-border rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.colores || []).map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-dark-bg rounded-lg text-xs font-medium text-gray-700 dark:text-dark-text">
                {item}
                <button type="button" onClick={() => onRemoveColor(item)} className="text-gray-400 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// Modal de confirmación moderno
// ============================================================
function ConfirmDialog({ isOpen, onClose, onConfirm, saving, conImagenes }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md my-auto bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border animate-scale-in p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
            ¿Deseas publicar este producto en tu tienda?
          </h3>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-2">
            Se guardarán {conImagenes ? "las imágenes y " : ""}los datos del producto. Quedará
            registrado en la base de datos y asociado automáticamente a tu tienda.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-border rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border/80 transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {saving ? "Publicando..." : "Sí, publicar producto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function StoreEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !id || id === "nuevo";

  const [form, setForm] = useState(defaultForm);
  const [categorias, setCategorias] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [nuevoColor, setNuevoColor] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  // Imágenes del producto (base64 para crear / URLs para editar).
  const [imagenes, setImagenes] = useState([]);
  const fromBarcode = location.state?.fromBarcode;
  const fromIA = location.state?.fromAI || !!sessionStorage.getItem("adoptify_ai_analysis");

  // Cargar datos de IA o del escáner de código de barras (solo al crear).
  useEffect(() => {
    if (!isNew) return;

    const state = location.state;
    const sessionData = sessionStorage.getItem("adoptify_ai_analysis");

    let datosIA = null;
    let fotosIA = [];

    if (state?.fromAI && state?.resultadoIA) {
      datosIA = state.resultadoIA?.datos || state.resultadoIA;
      fotosIA = state.fotos || [];
    } else if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        datosIA = parsed.resultadoIA?.datos || parsed.resultadoIA;
        fotosIA = parsed.fotos || [];
      } catch (e) { /* ignorar */ }
    }

    if (datosIA) {
      setImagenes(Array.isArray(fotosIA) ? fotosIA : []);
      setForm((prev) => ({
        ...prev,
        nombre: datosIA.nombre || "",
        descripcion: datosIA.descripcion || "",
        descripcion_larga: datosIA.descripcion_larga || "",
        marca: datosIA.marca || "",
        categoria: datosIA.categoria || "",
        material: datosIA.material || "",
        calidad: datosIA.calidad || "",
        ingredientes: datosIA.ingredientes || "",
        ingredientes_activos: datosIA.ingredientes_activos || "",
        aroma: datosIA.aroma || "",
        instrucciones_cuidado: datosIA.instrucciones_cuidado || "",
        tallas: datosIA.tallas ? String(datosIA.tallas).split(",").map((s) => s.trim()).filter(Boolean) : [],
        colores: datosIA.colores ? String(datosIA.colores).split(",").map((s) => s.trim()).filter(Boolean) : [],
      }));
    }

    // Cargar datos desde el escáner de código de barras
    if (state?.fromBarcode && state?.barcodeData) {
      const bd = state.barcodeData;
      setForm((prev) => ({
        ...prev,
        nombre: bd.nombre || "",
        marca: bd.marca || "",
        categoria: bd.categoria || "",
        descripcion: bd.descripcion || bd.presentacion || "",
        descripcion_larga: bd.descripcion || "",
        ingredientes: bd.ingredientes || "",
        fabricante: bd.fabricante || "",
        peso: bd.peso || "",
      }));
      if (bd.imagen_url) {
        setImagenes([bd.imagen_url]);
      }
    }
  }, [isNew, location.state]);

  useEffect(() => {
    getCategoriasProducto().then(setCategorias).catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const p = await obtenerMiProducto(id);
        setForm({
          nombre: p.nombre || "",
          descripcion: p.descripcion || "",
          descripcion_larga: p.descripcion_larga || "",
          precio: p.precio != null ? normalizarPrecioInput(p.precio) : "",
          descuento: p.descuento != null ? String(p.descuento) : "",
          categoria: p.categoria || "",
          marca: p.marca || "",
          material: p.material || "",
          calidad: p.calidad || "",
          stock: p.stock != null ? String(p.stock) : "",
          tallas: p.tallas ? String(p.tallas).split(",").map((s) => s.trim()).filter(Boolean) : [],
          colores: p.colores ? String(p.colores).split(",").map((s) => s.trim()).filter(Boolean) : [],
          ingredientes: p.ingredientes || "",
          ingredientes_activos: p.ingredientes_activos || "",
          aroma: p.aroma || "",
          instrucciones_cuidado: p.instrucciones_cuidado || "",
          tipo_mascota: "",
          edad_recomendada: "",
          peso: "",
          fabricante: "",
          registro_sanitario: "",
          advertencias: "",
          informacion_adicional: "",
          activo: p.activo,
        });
        if (p.imagenes && p.imagenes.length > 0) {
          setImagenes(p.imagenes.map((img) => img.url));
        }
      } catch (e) { /* producto no encontrado */ }
      finally { setLoading(false); }
    })();
  }, [id, isNew]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Al cambiar la categoría se limpian los campos específicos (tallas, colores
  // y material) para que se elijan según la nueva categoría seleccionada.
  const handleCategoriaChange = (value) => {
    setForm((prev) => ({ ...prev, categoria: value, tallas: [], colores: [], material: "" }));
    if (errors.categoria) setErrors((prev) => ({ ...prev, categoria: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    const precioNum = parsearPrecioInput(form.precio);
    if (!form.precio || !precioNum || precioNum <= 0) e.precio = "Precio inválido";
    if (!form.categoria) e.categoria = "Selecciona una categoría";
    if (form.stock === "" || isNaN(form.stock) || Number(form.stock) < 0) e.stock = "Stock inválido";
    if (form.descuento !== "" && (isNaN(form.descuento) || Number(form.descuento) < 0 || Number(form.descuento) > 100)) {
      e.descuento = "El descuento debe estar entre 0 y 100";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    nombre: form.nombre,
    categoria: form.categoria,
    // El precio se ingresa con formato colombiano (p. ej. "15.000") y se
    // convierte a número antes de enviarlo al backend.
    precio: parsearPrecioInput(form.precio),
    descuento: parseInt(form.descuento) || 0,
    stock: parseInt(form.stock) || 0,
    descripcion: form.descripcion,
    descripcion_larga: form.descripcion_larga,
    calidad: form.calidad,
    marca: form.marca,
    material: form.material,
    tallas: form.tallas.join(","),
    colores: form.colores.join(","),
    ingredientes: form.ingredientes,
    ingredientes_activos: form.ingredientes_activos,
    aroma: form.aroma,
    instrucciones_cuidado: form.instrucciones_cuidado,
    activo: form.activo,
  });

  // Guardar al editar (no modifica las imágenes existentes).
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await actualizarMiProducto(id, buildPayload());
      setSuccessMsg("Producto actualizado correctamente");
      setTimeout(() => navigate(`/tienda/productos/${id}`), 1500);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err?.message || "No se pudo actualizar el producto. Intenta de nuevo.",
      }));
      setSaving(false);
    }
  };

  // Crear: valida y abre el diálogo de confirmación.
  const handleCrearClick = (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setShowConfirm(true);
  };

  const handleConfirmAndSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      // El backend de "con-imagenes" espera imágenes en base64; se filtran
      // las que no lo son (p. ej. URLs provenientes del escáner de barras).
      const imagenesBase64 = (Array.isArray(imagenes) ? imagenes : []).filter(
        (img) => typeof img === "string" && img.startsWith("data:")
      );
      if (imagenesBase64.length > 0) {
        await crearMiProductoConImagenes({
          ...buildPayload(),
          imagenes: imagenesBase64,
        });
      } else {
        await crearMiProducto(buildPayload());
      }
      sessionStorage.removeItem("adoptify_ai_analysis");
      setSuccessMsg("✅ Producto creado correctamente");
      setTimeout(() => navigate("/tienda/productos"), 2000);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err?.message || "Error al guardar. Las imágenes y datos están seguros, intenta de nuevo.",
      }));
      setSaving(false);
    }
  };

  const addItem = (field, value, reset) => {
    const v = (value || "").trim();
    if (v && !form[field].includes(v)) handleChange(field, [...form[field], v]);
    reset("");
  };
  const removeItem = (field, value) => handleChange(field, form[field].filter((x) => x !== value));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando producto...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/tienda/productos" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">
            {isNew ? "Nuevo Producto" : "Editar Producto"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            {isNew
              ? (fromBarcode
                  ? "Datos obtenidos desde el código de barras. Revisa, completa la información y agrega las imágenes."
                  : "Completa la información y agrega las imágenes de tu producto.")
              : "Actualiza la información del producto."}
          </p>
        </div>
      </div>

      {/* Mensaje de éxito */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 size={18} />
          {successMsg}
        </div>
      )}

      {errors.general && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
          <AlertCircle size={18} />
          {errors.general}
        </div>
      )}

      {/* Banner de datos de IA */}
      {isNew && fromIA && imagenes.length > 0 && (
        <div className="bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 border border-rose-100 dark:border-rose-500/10 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-dark-text">
                Producto analizado con IA
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                Datos precargados automáticamente. Revisa y completa lo que falte.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ===== Imágenes del producto ===== */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
              <ImagePlus size={16} className="text-rose-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Imágenes del producto</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-4 ml-10">
            Agrega hasta 5 imágenes. La primera será la imagen principal del producto.
          </p>

          {isNew ? (
            <SubidaImagenesProducto value={imagenes} onChange={setImagenes} maxImages={5} />
          ) : imagenes.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {imagenes.map((img, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border">
                  <img src={img} alt={`Imagen ${i + 1}`} className="w-full h-24 object-cover" />
                  <span className="absolute bottom-1 left-1 w-5 h-5 rounded-lg bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-gray-300 dark:text-dark-border">
              <ImageOff size={32} />
              <p className="text-sm text-gray-400 dark:text-dark-text-secondary">Este producto no tiene imágenes.</p>
            </div>
          )}
        </div>

        {/* ===== Información básica ===== */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Package size={16} className="text-blue-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Información Básica</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Nombre del producto *</label>
              <input type="text" value={form.nombre} onChange={(e) => handleChange("nombre", e.target.value)}
                className={`${inputCls} ${errors.nombre ? "border-red-300 focus:border-red-500" : ""}`} placeholder="Ej: Cama Ortopédica para Perros" />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Descripción corta</label>
              <input type="text" value={form.descripcion} onChange={(e) => handleChange("descripcion", e.target.value)} className={inputCls} placeholder="Resumen breve del producto" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Descripción larga</label>
              <textarea value={form.descripcion_larga} onChange={(e) => handleChange("descripcion_larga", e.target.value)} rows={3}
                className={`${inputCls} resize-none`} placeholder="Detalles completos del producto..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Categoría *</label>
              <select value={form.categoria} onChange={(e) => handleCategoriaChange(e.target.value)}
                className={`${inputCls} ${errors.categoria ? "border-red-300" : ""}`}>
                <option value="">Seleccionar categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                ))}
              </select>
              {errors.categoria && <p className="text-xs text-red-500 mt-1">{errors.categoria}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Marca</label>
              <input type="text" value={form.marca} onChange={(e) => handleChange("marca", e.target.value)} className={inputCls} placeholder="Ej: PetComfort" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Material</label>
              <input type="text" value={form.material} onChange={(e) => handleChange("material", e.target.value)} className={inputCls} placeholder="Ej: Espuma viscoelástica" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Calidad</label>
              <input type="text" value={form.calidad} onChange={(e) => handleChange("calidad", e.target.value)} className={inputCls} placeholder="Ej: Premium" />
            </div>
          </div>
        </div>

        {/* Detalles específicos según la categoría (tallas/tamaños, material, colores) */}
        {categoryFields[form.categoria] && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">
              Detalles de {categoryFields[form.categoria].label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CategorySpecificFields
                data={form}
                setData={handleChange}
                colorInput={nuevoColor}
                setColorInput={setNuevoColor}
                onAddColor={() => addItem("colores", nuevoColor, setNuevoColor)}
                onRemoveColor={(c) => removeItem("colores", c)}
              />
              {form.categoria === "Alimentos" && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Ingredientes</label>
                  <input type="text" value={form.ingredientes || ""} onChange={(e) => handleChange("ingredientes", e.target.value)}
                    className={inputCls} placeholder="Ej: Pollo, arroz, verduras" />
                </div>
              )}
              {form.categoria === "Salud" && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Ingredientes Activos</label>
                  <input type="text" value={form.ingredientes_activos || ""} onChange={(e) => handleChange("ingredientes_activos", e.target.value)}
                    className={inputCls} placeholder="Ej: Ivermectina, Praziquantel" />
                </div>
              )}
              {form.categoria === "Higiene" && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Aroma / Tipo</label>
                  <input type="text" value={form.aroma || ""} onChange={(e) => handleChange("aroma", e.target.value)}
                    className={inputCls} placeholder="Ej: Avena, Manzanilla, Neutro" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Precio y Stock (unicos campos que debe llenar el vendedor si viene de IA) */}
        <div className={`bg-white dark:bg-dark-card rounded-2xl border ${fromIA && isNew ? "border-rose-200 dark:border-rose-500/20 ring-2 ring-rose-500/10" : "border-gray-100 dark:border-dark-border"} p-5 sm:p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Tag size={16} className="text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Precio y Stock</h3>
            {fromIA && isNew && (
              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full">
                COMPLETAR
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Precio *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input type="text" inputMode="numeric" value={form.precio}
                  onChange={(e) => handleChange("precio", normalizarPrecioInput(e.target.value))}
                  className={`${inputCls} pl-7 ${errors.precio ? "border-red-300" : ""}`} placeholder="0" />
              </div>
              {errors.precio && <p className="text-xs text-red-500 mt-1">{errors.precio}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Stock *</label>
              <input type="number" value={form.stock} onChange={(e) => handleChange("stock", e.target.value)}
                className={`${inputCls} ${errors.stock ? "border-red-300" : ""}`} placeholder="0" />
              {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">
                Descuento (%)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                <input type="number" min="0" max="100" value={form.descuento}
                  onChange={(e) => handleChange("descuento", e.target.value)}
                  className={`${inputCls} pl-7 ${errors.descuento ? "border-red-300" : ""}`} placeholder="0" />
              </div>
              {errors.descuento && <p className="text-xs text-red-500 mt-1">{errors.descuento}</p>}
            </div>
          </div>

          {/* Vista previa: precio final con el descuento aplicado */}
          {(() => {
            const precioBase = parsearPrecioInput(form.precio);
            const descuentoAplicado = Math.min(100, Math.max(0, parseInt(form.descuento) || 0));
            if (!precioBase) return null;
            const precioFinal = descuentoAplicado > 0
              ? precioBase * (1 - descuentoAplicado / 100)
              : precioBase;
            return (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                {descuentoAplicado > 0 ? (
                  <span>
                    Precio con {descuentoAplicado}% de descuento:{" "}
                    <strong className="font-bold">${precioFinal.toLocaleString("es-CO")}</strong>
                  </span>
                ) : (
                  <span>Precio final: <strong className="font-bold">${precioBase.toLocaleString("es-CO")}</strong></span>
                )}
              </div>
            );
          })()}
        </div>

        {/* ===== Información adicional (detectada por IA / completa) ===== */}
        {(form.ingredientes || form.ingredientes_activos || form.aroma || form.instrucciones_cuidado) && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Info size={16} className="text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Información del Producto</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.ingredientes && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Ingredientes</label>
                  <textarea value={form.ingredientes} onChange={(e) => handleChange("ingredientes", e.target.value)}
                    className={`${inputCls} resize-none`} rows={2} />
                </div>
              )}
              {form.ingredientes_activos && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Ingredientes activos</label>
                  <textarea value={form.ingredientes_activos} onChange={(e) => handleChange("ingredientes_activos", e.target.value)}
                    className={`${inputCls} resize-none`} rows={2} />
                </div>
              )}
              {form.aroma && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Aroma</label>
                  <input type="text" value={form.aroma} onChange={(e) => handleChange("aroma", e.target.value)} className={inputCls} />
                </div>
              )}
              {form.instrucciones_cuidado && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Instrucciones de cuidado</label>
                  <input type="text" value={form.instrucciones_cuidado} onChange={(e) => handleChange("instrucciones_cuidado", e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== Variantes ===== */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <Layers size={16} className="text-violet-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Variantes (opcional)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { field: "tallas", label: "Tallas", value: nuevaTalla, setValue: setNuevaTalla },
              { field: "colores", label: "Colores", value: nuevoColor, setValue: setNuevoColor },
            ].map((v) => (
              <div key={v.field}>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">{v.label}</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={v.value} onChange={(e) => v.setValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(v.field, v.value, v.setValue); } }}
                    className="flex-1 px-3.5 py-2 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder={`Agregar ${v.label.toLowerCase()}...`} />
                  <button type="button" onClick={() => addItem(v.field, v.value, v.setValue)}
                    className="px-3 py-2 bg-gray-100 dark:bg-dark-border rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form[v.field].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-dark-bg rounded-lg text-xs font-medium text-gray-700 dark:text-dark-text">
                      {item}
                      <button type="button" onClick={() => removeItem(v.field, item)} className="text-gray-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Publicación ===== */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center">
                <Eye size={16} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">Producto visible</p>
                <p className="text-xs text-gray-400">Mostrar en la tienda pública</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={(e) => handleChange("activo", e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-amber-500" />
            </label>
          </div>
        </div>

        {/* ===== Botones (un solo botón de acción) ===== */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <Link to="/tienda/productos"
            className="px-5 py-3 text-sm font-semibold text-center text-gray-600 dark:text-dark-text-secondary bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all">
            Cancelar
          </Link>
          {isNew ? (
            <button type="button" onClick={handleCrearClick} disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Publicando..." : "Crear Producto"}
            </button>
          ) : (
            <button type="submit" disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          )}
        </div>
      </form>

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmAndSave}
        saving={saving}
        conImagenes={imagenes.length > 0}
      />
    </div>
  );
}
