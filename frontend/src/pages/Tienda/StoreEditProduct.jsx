import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, X, Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { obtenerMiProducto, crearMiProducto, crearMiProductoConImagenes, actualizarMiProducto } from "../../api/tienda";
import { getCategoriasProducto } from "../../api/catalogos";

const defaultForm = {
  nombre: "", descripcion: "", descripcion_larga: "", precio: "", categoria: "",
  marca: "", material: "", calidad: "", stock: "", tallas: [], colores: [],
  ingredientes: "", ingredientes_activos: "", aroma: "", instrucciones_cuidado: "",
  tipo_mascota: "", edad_recomendada: "", peso: "", fabricante: "",
  registro_sanitario: "", advertencias: "", informacion_adicional: "",
  activo: true,
};

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all";

// Modal de confirmación moderno
function ConfirmDialog({ isOpen, onClose, onConfirm, saving }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border animate-scale-in p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
            ¿Deseas publicar este producto en tu tienda?
          </h3>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-2">
            Se guardarán las imágenes capturadas, la información detectada por la Inteligencia
            Artificial y los datos ingresados por el vendedor. El producto quedará registrado
            en la base de datos y asociado automáticamente a tu tienda.
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
  const [nuevaTalla, setNuevaTalla] = useState("");
  const [nuevoColor, setNuevoColor] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [aiImages, setAiImages] = useState([]);
  const fromBarcode = location.state?.fromBarcode;

  // Cargar datos de IA si vienen del análisis
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
      setAiImages(fotosIA);
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
        // Guardar el código de barras e imagen en sessionStorage para referencia
      }));
      // Guardar imagen si viene del escáner
      if (bd.imagen_url) {
        setAiImages([bd.imagen_url]);
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
          precio: p.precio != null ? String(p.precio) : "",
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
      } catch (e) { /* producto no encontrado */ }
      finally { setLoading(false); }
    })();
  }, [id, isNew]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!form.precio || isNaN(form.precio) || Number(form.precio) <= 0) e.precio = "Precio inválido";
    if (!form.categoria) e.categoria = "Selecciona una categoría";
    if (form.stock === "" || isNaN(form.stock) || Number(form.stock) < 0) e.stock = "Stock inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    nombre: form.nombre,
    categoria: form.categoria,
    precio: parseFloat(form.precio) || 0,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      if (isNew) {
        // Si hay imágenes de IA, usar el endpoint con imágenes
        if (aiImages.length > 0) {
          await crearMiProductoConImagenes({
            ...buildPayload(),
            imagenes: aiImages,
          });
        } else {
          await crearMiProducto(buildPayload());
        }
      } else {
        await actualizarMiProducto(id, buildPayload());
      }
      // Limpiar datos de IA de sessionStorage
      sessionStorage.removeItem("adoptify_ai_analysis");
      setSuccessMsg(isNew ? "Producto creado correctamente" : "Producto actualizado correctamente");
      setTimeout(() => navigate("/tienda/productos"), 1500);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err?.message || "No se pudo guardar el producto. Los datos no se han perdido, puedes intentarlo de nuevo.",
      }));
      setSaving(false);
    }
  };

  const handleConfirmAndSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      if (aiImages.length > 0) {
        await crearMiProductoConImagenes({
          ...buildPayload(),
          imagenes: aiImages,
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

  // Confirmación antes de crear
  const handleCrearClick = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando producto...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
                    ? "Datos obtenidos desde el código de barras. Revisa y completa la información."
                    : aiImages.length > 0
                      ? "Los datos fueron detectados por IA. Solo completa precio, stock y descuento."
                      : "Completa los datos para registrar un nuevo producto.")
                : "Actualiza la información del producto."}
            </p>
          </div>
        </div>
        {isNew ? (
          <button onClick={handleCrearClick} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Crear Producto
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar Cambios
          </button>
        )}
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
      {isNew && aiImages.length > 0 && (
        <div className="bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 border border-rose-100 dark:border-rose-500/10 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-dark-text">
                Producto analizado por IA
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                {aiImages.length} imágenes capturadas · Datos precargados automáticamente
              </p>
            </div>
          </div>
          {/* Miniaturas */}
          <div className="flex gap-2 mt-3">
            {aiImages.map((img, i) => (
              <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border">
                <img src={img} alt={`Vista ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Información Básica</h3>
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
              <select value={form.categoria} onChange={(e) => handleChange("categoria", e.target.value)}
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

        {/* Precio y Stock (únicos campos que debe llenar el vendedor si viene de IA) */}
        <div className={`bg-white dark:bg-dark-card rounded-2xl border ${aiImages.length > 0 ? "border-rose-200 dark:border-rose-500/20 ring-2 ring-rose-500/10" : "border-gray-100 dark:border-dark-border"} p-6`}>
          <div className="flex items-center gap-2 mb-4">
            {aiImages.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full">
                COMPLETAR
              </span>
            )}
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Precio y Stock</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Precio *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input type="number" value={form.precio} onChange={(e) => handleChange("precio", e.target.value)}
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
          </div>
        </div>

        {/* Información adicional detectada por IA */}
        {(form.ingredientes || form.ingredientes_activos || form.aroma || form.instrucciones_cuidado) && (
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Información del Producto (detectada por IA)</h3>
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

        {/* Variantes */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-4">Variantes (opcional)</h3>
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

        {/* Configuración */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-dark-text">Producto visible</p>
              <p className="text-xs text-gray-400">Mostrar en la tienda pública</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={(e) => handleChange("activo", e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-rose-500 peer-checked:to-amber-500" />
            </label>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Link to="/tienda/productos" className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all">
            Cancelar
          </Link>
          {isNew ? (
            <button type="button" onClick={handleCrearClick} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Crear Producto
            </button>
          ) : (
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar Cambios
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
      />
    </div>
  );
}
