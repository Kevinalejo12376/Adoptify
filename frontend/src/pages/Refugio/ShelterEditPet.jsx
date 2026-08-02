import React, { useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Save, X, PawPrint, Info, Tag, Heart, Syringe,
  Edit3, Upload, Trash2, CheckCircle, Camera, ChevronDown,
  AlertCircle, Sparkles
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

const ImageUploadSection = ({ images, onUpload, onRemove, label = "Fotos" }) => {
  const inputRef = useRef(null);
  const count = images?.length || 0;
  const remaining = 3 - count;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
        <Camera className="w-4 h-4 text-rose-500" />
        {label} <span className="text-xs text-gray-400">({count}/3)</span>
      </label>
      <div className="flex gap-2 flex-wrap">
        {(images || []).map((img, index) => (
          <div key={img.id} className="relative group w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-border border border-gray-200 dark:border-dark-border flex-shrink-0">
            <img src={img.src} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => onRemove(img.id)}
                className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded">
              {index + 1}
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-rose-400 dark:hover:border-rose-500 flex flex-col items-center justify-center gap-1 transition-all hover:bg-rose-50/50 dark:hover:bg-rose-500/5 flex-shrink-0">
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-[10px] text-gray-400 font-medium">Subir</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
    </div>
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

const InputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white transition-all";
const SelectClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none cursor-pointer";

export default function ShelterEditPet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialPet = location.state?.pet;

  const [petData, setPetData] = useState(initialPet ? { ...initialPet, images: initialPet.images || [] } : null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 3 - (petData.images?.length || 0);
    const toAdd = files.slice(0, remaining);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newImg = { id: Date.now() + Math.random(), src: ev.target.result, file };
        setPetData(prev => ({ ...prev, images: [...(prev.images || []), newImg] }));
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (imgId) => {
    setPetData(prev => ({ ...prev, images: (prev.images || []).filter(img => img.id !== imgId) }));
    setHasChanges(true);
  };

  const handleChange = (field, value) => {
    setPetData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate saving
    setTimeout(() => {
      setIsSaving(false);
      navigate("/refugio/mascotas", { state: { updatedPet: petData } });
    }, 800);
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
                <input type="text" required value={petData.name} onChange={(e) => handleChange("name", e.target.value)}
                  className={InputClass} placeholder="Nombre de la mascota" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tipo</label>
                <div className="relative">
                  <select value={petData.type} onChange={(e) => handleChange("type", e.target.value)} className={SelectClass}>
                    <option>Perro</option>
                    <option>Gato</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Raza *</label>
                <input type="text" required value={petData.breed} onChange={(e) => handleChange("breed", e.target.value)}
                  className={InputClass} placeholder="Ej: Golden Retriever" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Edad *</label>
                <input type="text" required value={petData.age} onChange={(e) => handleChange("age", e.target.value)}
                  className={InputClass} placeholder="Ej: 2 años" />
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
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Rasgos de personalidad (separados por coma)</label>
              <input type="text" value={(petData.personality || []).join(", ")}
                onChange={(e) => handleChange("personality", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                className={InputClass} placeholder="Ej: Juguetón, Amigable, Energético" />
            </div>
          </FormSection>

          {/* Description */}
          <FormSection icon={Heart} title="Descripción" color="text-rose-500">
            <textarea rows={4} value={petData.description} onChange={(e) => handleChange("description", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none"
              placeholder="Describe la personalidad y características de la mascota..." />
          </FormSection>

          {/* Images */}
          <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
            <ImageUploadSection
              images={petData.images}
              onUpload={handleImageUpload}
              onRemove={handleRemoveImage}
              label="Fotos de la Mascota"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
            <button type="submit" disabled={isSaving}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all hover:shadow-lg hover:shadow-rose-200 dark:hover:shadow-rose-500/20 disabled:opacity-75 text-sm">
              {isSaving ? (
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
