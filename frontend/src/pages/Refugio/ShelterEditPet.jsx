import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Save, X, Info, Tag, Heart, Syringe,
  Edit3, ChevronDown, AlertCircle, Sparkles, Loader2
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import ImageUploader from "../../components/ImageUploader";
import FieldError from "../../components/FieldError";
import { claseInput, limpiarEspacios } from "../../utils/validaciones";
import { actualizarMascota } from "../../api/mascotas";
import { getRazasMascota } from "../../api/catalogos";
import BreedSelector from "../../components/BreedSelector";
import PersonalitySelector from "../../components/PersonalitySelector";

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

const InputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white transition-all";
const SelectClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none cursor-pointer";

// Mapea las etiquetas del formulario a los codigos de catalogo del backend
// (mismo comportamiento que en la creación de mascotas).
const TIPO_MAP = { Perro: "perro", Gato: "gato" };
const TAMANO_MAP = { "Pequeño": "pequeno", Mediano: "mediano", Grande: "grande" };
const GENERO_MAP = { Macho: "macho", Hembra: "hembra" };
const ESTADO_MAP = { disponible: "disponible", "en proceso": "en_proceso", adoptado: "adoptado" };

export default function ShelterEditPet() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialPet = location.state?.pet;

  const [petData, setPetData] = useState(initialPet ? { ...initialPet, images: initialPet.images || [] } : null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // subida de imágenes en curso
  const savingRef = useRef(false); // bloqueo síncrono contra doble envío
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [razas, setRazas] = useState([]);
  const [breedValue, setBreedValue] = useState(petData?.breed ? String(petData.breed) : "");
  const [breedCustom, setBreedCustom] = useState(false);

  // Carga las razas según el tipo de mascota (perro/gato) y detecta si la raza
  // guardada es personalizada ("Otro"). Se recarga al cambiar el tipo; la
  // detección de la raza inicial solo ocurre en la primera carga.
  const primeraCargaRazasRef = useRef(true);
  useEffect(() => {
    let activo = true;
    const tipo = petData?.type === "Gato" ? "gato" : "perro";
    getRazasMascota(tipo)
      .then((data) => {
        if (!activo) return;
        setRazas(data);
        if (primeraCargaRazasRef.current) {
          primeraCargaRazasRef.current = false;
          const inicial = petData?.breed ? String(petData.breed) : "";
          if (inicial) {
            const enLista = data.some((r) => r.nombre.toLowerCase() === inicial.toLowerCase());
            setBreedCustom(!enLista);
          }
        }
      })
      .catch(() => { if (activo) setRazas([]); });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petData?.type]);

  // Edad: valor numérico + unidad (meses/años) — mismo formato que en la creación.
  const inicializarEdad = () => {
    const actual = petData?.age || "";
    const m = String(actual).match(/^(\d+)\s+(meses|años|mes|año)$/i);
    return m ? { val: m[1], unit: /mes/i.test(m[2]) ? "meses" : "años" } : { val: "", unit: "meses" };
  };
  const [edadInit] = useState(inicializarEdad);
  const [edadValor, setEdadValor] = useState(edadInit.val);
  const [edadUnidad, setEdadUnidad] = useState(edadInit.unit);

  if (!petData) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-rose-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Mascota no encontrada</h3>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-6">No se pudo cargar la información para editar.</p>
          <button onClick={() => navigate("/refugio/mascotas")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg">
            <ArrowLeft className="w-4 h-4" /> Volver a mascotas
          </button>
        </div>
      </div>
    );
  }

  // Validación por tipo de campo (mensajes específicos, sin iconos).
  const validarCampo = (campo, valor) => {
    switch (campo) {
      case "name":
        if (!limpiarEspacios(valor)) return "El nombre de la mascota es obligatorio.";
        if (limpiarEspacios(valor).length > 60) return "El nombre no puede superar los 60 caracteres.";
        return "";
      case "description":
        if (!valor) return "";
        if (limpiarEspacios(valor).length > 1000) return "La descripción no puede superar los 1000 caracteres.";
        return "";
      default:
        return "";
    }
  };

  const validarRaza = (valor) => {
    if (!limpiarEspacios(valor)) return "La raza es obligatoria.";
    if (limpiarEspacios(valor).length > 60) return "La raza no puede superar los 60 caracteres.";
    return "";
  };

  const validarEdadCon = (valor, unidad) => {
    const v = (valor || "").toString().trim();
    if (!v) return "La edad es obligatoria.";
    if (!/^\d+$/.test(v)) return "La edad debe ser un número entero.";
    if (Number(v) <= 0) return "La edad debe ser mayor que 0.";
    if (Number(v) > 999) return "La edad no puede superar 999.";
    if (!unidad) return "La unidad de edad es obligatoria.";
    return "";
  };

  // Sube las imágenes a Cloudinary con el flujo unificado y guarda su URL.
  const handleImagesChange = (newImages) => {
    setPetData(prev => ({ ...prev, images: newImages }));
    setHasChanges(true);
  };

  const handleChange = (field, value) => {
    setPetData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (["name", "description"].includes(field)) {
      setErrors(prev => ({ ...prev, [field]: validarCampo(field, value) }));
      setSubmitError("");
    }
  };

  // Al cambiar el tipo (perro/gato) se limpia la raza seleccionada, porque la
  // lista de razas cambia (el useEffect de razas recarga según petData.type).
  const handleTypeChange = (valor) => {
    setBreedValue("");
    setBreedCustom(false);
    setErrors(prev => ({ ...prev, breed: "" }));
    handleChange("type", valor);
  };

  // Raza (selector de la BD + opción "Otro").
  const handleBreedSelect = (nombre) => {
    setBreedValue(nombre);
    setBreedCustom(false);
    setErrors(prev => ({ ...prev, breed: validarRaza(nombre) }));
    setHasChanges(true);
    setSubmitError("");
  };

  const handleBreedOtro = () => {
    setBreedValue("");
    setBreedCustom(true);
    setErrors(prev => ({ ...prev, breed: validarRaza("") }));
    setHasChanges(true);
    setSubmitError("");
  };

  const handleBreedTyped = (valor) => {
    setBreedValue(valor);
    setErrors(prev => ({ ...prev, breed: validarRaza(valor) }));
    setHasChanges(true);
    setSubmitError("");
  };

  // Input de edad: solo números enteros (filtra letras y caracteres especiales).
  const handleEdadValorChange = (valor) => {
    const limpio = (valor || "").replace(/[^\d]/g, "").slice(0, 3);
    setEdadValor(limpio);
    setErrors(prev => ({ ...prev, age: validarEdadCon(limpio, edadUnidad) }));
    setHasChanges(true);
    setSubmitError("");
  };

  const handleEdadUnidadChange = (valor) => {
    setEdadUnidad(valor);
    setErrors(prev => ({ ...prev, age: validarEdadCon(edadValor, valor) }));
    setHasChanges(true);
    setSubmitError("");
  };

  // Personalidad (chips seleccionables).
  const handlePersonalityChange = (rasgos) => {
    setPetData(prev => ({ ...prev, personality: rasgos }));
    setHasChanges(true);
    setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Bloqueo síncrono: ignora doble clic / Enter repetido mientras se guarda.
    if (savingRef.current) return;
    setSubmitError("");

    const razaFinal = limpiarEspacios(breedValue);
    const nuevosErrores = {
      name: validarCampo("name", petData.name),
      breed: validarRaza(breedValue),
      age: validarEdadCon(edadValor, edadUnidad),
      description: validarCampo("description", petData.description),
    };
    setErrors(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    savingRef.current = true;
    setIsSaving(true);
    try {
      await actualizarMascota(petData.id, {
        nombre: petData.name,
        tipo: TIPO_MAP[petData.type] || petData.type,
        tamano: TAMANO_MAP[petData.size] || null,
        genero: GENERO_MAP[petData.gender] || null,
        estado: ESTADO_MAP[petData.status] || petData.status,
        raza: razaFinal,
        edad_valor: edadValor ? Number(edadValor) : null,
        edad_unidad: edadUnidad,
        peso: petData.weight || null,
        color: petData.color || "",
        descripcion: petData.description,
        personalidad: Array.isArray(petData.personality) ? petData.personality : [],
        salud: petData.health || "",
        vacunado: !!petData.vaccinated,
        esterilizado: !!petData.sterilized,
        // Imágenes desde Cloudinary (secure_url) guardadas en mascota_imagenes.
        imagenes: (petData.images || []).map((img) => ({
          url: img.url,
          public_id: img.publicId || img.public_id,
        })),
      });
      navigate("/refugio/mascotas", { state: { updatedPet: true, successToast: "Mascota actualizada exitosamente" } });
    } catch (err) {
      savingRef.current = false;
      setIsSaving(false);
      setSubmitError(
        err?.message || "No se pudo guardar la mascota. Revisa los datos e inténtalo de nuevo."
      );
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowCancelModal(true);
    } else {
      navigate("/refugio/mascotas");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-left">
          <div>
            <button onClick={handleCancel}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3 group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Volver a mascotas
            </button>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium mb-3 shadow-sm">
              <Edit3 className="w-4 h-4" />
              <span>Editar Mascota</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">{petData.name}</h1>
            <p className="text-gray-500 dark:text-dark-text-secondary mt-1">Modifica los datos de {petData.name}</p>
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
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nombre *</label>
                <input type="text" value={petData.name} onChange={(e) => handleChange("name", e.target.value)}
                  className={claseInput(InputClass, !!errors.name)} placeholder="Nombre de la mascota" />
                <FieldError mensaje={errors.name} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tipo</label>
                <div className="relative">
                  <select value={petData.type} onChange={(e) => handleTypeChange(e.target.value)} className={SelectClass}>
                    <option>Perro</option>
                    <option>Gato</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Raza *</label>
                <BreedSelector
                  razas={razas}
                  value={breedValue}
                  isCustom={breedCustom}
                  error={errors.breed}
                  onSelect={handleBreedSelect}
                  onOtro={handleBreedOtro}
                  onTyped={handleBreedTyped}
                />
                <FieldError mensaje={errors.breed} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Edad *</label>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-[3.5rem]">
                    <input type="text" inputMode="numeric" autoComplete="off" value={edadValor}
                      onChange={(e) => handleEdadValorChange(e.target.value)} placeholder="Ej: 2"
                      className={claseInput(InputClass, !!errors.age)} />
                  </div>
                  <div className="relative w-28 flex-shrink-0">
                    <select value={edadUnidad} onChange={(e) => handleEdadUnidadChange(e.target.value)} className={SelectClass}>
                      <option value="meses">Meses</option>
                      <option value="años">Años</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <FieldError mensaje={errors.age} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Peso</label>
                <input type="text" value={petData.weight || ""} onChange={(e) => handleChange("weight", e.target.value)}
                  className={InputClass} placeholder="Ej: 30 kg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Color</label>
                <input type="text" value={petData.color || ""} onChange={(e) => handleChange("color", e.target.value)}
                  className={InputClass} placeholder="Ej: Dorado" />
              </div>
            </div>
          </FormSection>

          {/* Physical Characteristics */}
          <FormSection icon={Tag} title="Características Físicas" color="text-amber-500">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Sexo</label>
                <div className="relative">
                  <select value={petData.gender} onChange={(e) => handleChange("gender", e.target.value)} className={SelectClass}>
                    <option>Macho</option>
                    <option>Hembra</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tamaño</label>
                <div className="relative">
                  <select value={petData.size} onChange={(e) => handleChange("size", e.target.value)} className={SelectClass}>
                    <option>Pequeño</option>
                    <option>Mediano</option>
                    <option>Grande</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Estado</label>
                <div className="relative">
                  <select value={petData.status} onChange={(e) => handleChange("status", e.target.value)} className={SelectClass}>
                    <option value="disponible">Disponible</option>
                    <option value="en proceso">En proceso</option>
                    <option value="adoptado">Adoptado</option>
                  </select>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Health */}
          <FormSection icon={Syringe} title="Estado de Salud" color="text-emerald-500">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg transition-all">
                <input type="checkbox" checked={petData.vaccinated} onChange={(e) => handleChange("vaccinated", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vacunado</span>
              </label>
              <label className="flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg transition-all">
                <input type="checkbox" checked={petData.sterilized} onChange={(e) => handleChange("sterilized", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Esterilizado</span>
              </label>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Información adicional de salud</label>
              <input type="text" value={petData.health || ""} onChange={(e) => handleChange("health", e.target.value)}
                className={InputClass} placeholder="Ej: Vacunado, esterilizado, desparasitado" />
            </div>
          </FormSection>

          {/* Personality */}
          <FormSection icon={Sparkles} title="Personalidad" color="text-amber-500">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Rasgos de personalidad (puedes elegir varios)</label>
              <PersonalitySelector
                value={petData.personality || []}
                onChange={handlePersonalityChange}
              />
            </div>
          </FormSection>

          {/* Description */}
          <FormSection icon={Heart} title="Descripción" color="text-rose-500">
            <textarea rows={4} value={petData.description} onChange={(e) => handleChange("description", e.target.value)}
              className={claseInput("w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none", !!errors.description)}
              placeholder="Describe la personalidad y características de la mascota..." />
            <FieldError mensaje={errors.description} />
          </FormSection>

          {/* Images (Cloudinary unificado) */}
          <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
            <ImageUploader
              tipo="mascota"
              multiple
              maxFiles={3}
              label="Fotos de la Mascota (Máx. 3)"
              value={petData.images || []}
              onChange={handleImagesChange}
              onUploadingChange={setIsUploading}
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

          {/* Barra de carga al guardar cambios / subir imágenes */}
          {(isSaving || isUploading) && (
            <div className="pt-1">
              <div className="h-1.5 w-full bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full animate-progress" />
              </div>
              <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                {isUploading
                  ? "Subiendo imágenes, esto puede tomar unos segundos..."
                  : "Guardando cambios, esto puede tomar unos segundos..."}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
            <button type="submit" disabled={isSaving || isUploading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all hover:shadow-lg hover:shadow-rose-200 dark:hover:shadow-rose-500/20 disabled:opacity-75 text-sm">
              {isSaving ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Guardando cambios...</>
              ) : isUploading ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Procesando imágenes...</>
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
        onConfirm={() => { setShowCancelModal(false); navigate("/refugio/mascotas"); }}
        title="¿Descartar cambios?"
        message="Tienes cambios sin guardar. Si sales, se perderán todas las modificaciones realizadas."
        confirmText="Descartar"
        cancelText="Seguir editando"
        type="warning"
      />
    </div>
  );
}
