import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PawPrint, Plus, Search, Dog, Cat, Calendar, Heart, Edit3, Trash2,
  ChevronDown, X, AlertCircle, CheckCircle, Clock, Ruler, Syringe,
  Image, Upload, Info, Tag, Weight, Scissors,
  Sparkles, Camera, Eye, MapPin, Phone, Star,
  Shield, ArrowLeft, MessageCircle, Home, ChevronRight
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import { Loader2 } from "lucide-react";
import { misMascotas, crearMascota, eliminarMascota } from "../../api/mascotas";
import FieldError from "../../components/FieldError";
import { claseInput, limpiarEspacios } from "../../utils/validaciones";

// Mapea las etiquetas del formulario a los codigos de catalogo del backend.
const TIPO_MAP = { Perro: "perro", Gato: "gato" };
const TAMANO_MAP = { "Pequeño": "pequeno", Mediano: "mediano", Grande: "grande" };
const GENERO_MAP = { Macho: "macho", Hembra: "hembra" };
const ESTADO_MAP = { disponible: "disponible", "en proceso": "en_proceso", adoptado: "adoptado" };

// ============================================================
// COMPONENTES DE FORMULARIO (nivel de módulo — estables)
// ============================================================

const ImageUploadSection = ({ images, onUpload, onRemove, label = "Fotos" }) => {
  const inputRef = useRef(null);
  const count = images?.length || 0;
  const remaining = 3 - count;

  return (
    <div className="col-span-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
        <Camera className="w-4 h-4 text-rose-500" />
        {label} <span className="text-xs text-gray-400">({count}/3)</span>
      </label>
      <div className="flex gap-2">
        {(images || []).map((img, index) => (
          <div key={img.id} className="relative group w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-border border border-gray-200 dark:border-dark-border flex-shrink-0">
            <img src={img.src} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => onRemove(img.id)}
                className="p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <span className="absolute bottom-0.5 right-1 text-[9px] font-medium bg-black/50 text-white px-1 rounded">
              {index + 1}
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-rose-400 dark:hover:border-rose-500 flex flex-col items-center justify-center gap-0.5 transition-all hover:bg-rose-50/50 dark:hover:bg-rose-500/5 flex-shrink-0">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-[9px] text-gray-400 font-medium">Subir</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
    </div>
  );
};

const FormSection = ({ icon: Icon, title, children, color = "text-rose-500" }) => (
  <div className="sm:col-span-3">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-dark-border">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {children}
    </div>
  </div>
);

const FormField = ({ label, children, span = "col-span-1" }) => (
  <div className={span}>
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
    {children}
  </div>
);

const PetForm = ({ petData, setPetData, onSubmit, onCancel, title, isEdit }) => {
  const inputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  // Validación por tipo de campo (mensajes específicos, sin iconos).
  const validarCampo = (campo, valor) => {
    switch (campo) {
      case "name":
        if (!limpiarEspacios(valor)) return "El nombre de la mascota es obligatorio.";
        if (limpiarEspacios(valor).length > 60) return "El nombre no puede superar los 60 caracteres.";
        return "";
      case "breed":
        if (!limpiarEspacios(valor)) return "La raza es obligatoria.";
        if (limpiarEspacios(valor).length > 60) return "La raza no puede superar los 60 caracteres.";
        return "";
      case "age":
        if (!limpiarEspacios(valor)) return "La edad es obligatoria.";
        if (limpiarEspacios(valor).length > 20) return "La edad no puede superar los 20 caracteres.";
        return "";
      case "description":
        if (!valor) return "";
        if (limpiarEspacios(valor).length > 1000) return "La descripción no puede superar los 1000 caracteres.";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (campo, valor) => {
    setPetData((prev) => ({ ...prev, [campo]: valor }));
    if (["name", "breed", "age", "description"].includes(campo)) {
      setErrors((prev) => ({ ...prev, [campo]: validarCampo(campo, valor) }));
      setSubmitError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");
    const nuevosErrores = {
      name: validarCampo("name", petData.name),
      breed: validarCampo("breed", petData.breed),
      age: validarCampo("age", petData.age),
      description: validarCampo("description", petData.description),
    };
    setErrors(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;
    onSubmit(e);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 3 - (petData.images?.length || 0);
    const toAdd = files.slice(0, remaining);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newImg = { id: Date.now() + Math.random(), src: ev.target.result, file };
        setPetData(prev => ({ ...prev, images: [...(prev.images || []), newImg] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (imgId) => {
    setPetData(prev => ({
      ...prev, images: (prev.images || []).filter(img => img.id !== imgId)
    }));
  };

  const InputClass = "w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white transition-all";
  const SelectClass = "w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
        <FormSection icon={Info} title="Información Básica" color="text-blue-500">
          <FormField label="Nombre *" span="col-span-3">
            <input type="text" value={petData.name} onChange={(e) => handleChange("name", e.target.value)}
              className={claseInput(InputClass, !!errors.name)} placeholder="Nombre de la mascota" />
            <FieldError mensaje={errors.name} />
          </FormField>
          <FormField label="Tipo">
            <div className="relative">
              <select value={petData.type} onChange={(e) => handleChange("type", e.target.value)} className={SelectClass}>
                <option>Perro</option>
                <option>Gato</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </FormField>
          <FormField label="Raza *">
            <input type="text" value={petData.breed} onChange={(e) => handleChange("breed", e.target.value)}
              className={claseInput(InputClass, !!errors.breed)} placeholder="Ej: Golden Retriever" />
            <FieldError mensaje={errors.breed} />
          </FormField>
          <FormField label="Edad *">
            <input type="text" value={petData.age} onChange={(e) => handleChange("age", e.target.value)}
              className={claseInput(InputClass, !!errors.age)} placeholder="Ej: 2 años" />
            <FieldError mensaje={errors.age} />
          </FormField>
        </FormSection>

        <FormSection icon={Tag} title="Características Físicas" color="text-amber-500">
          <FormField label="Sexo">
            <div className="relative">
              <select value={petData.gender} onChange={(e) => setPetData({...petData, gender: e.target.value})} className={SelectClass}>
                <option>Macho</option>
                <option>Hembra</option>
              </select>
            </div>
          </FormField>
          <FormField label="Tamaño">
            <div className="relative">
              <select value={petData.size} onChange={(e) => setPetData({...petData, size: e.target.value})} className={SelectClass}>
                <option>Pequeño</option>
                <option>Mediano</option>
                <option>Grande</option>
              </select>
            </div>
          </FormField>
          <FormField label="Estado">
            <div className="relative">
              <select value={petData.status} onChange={(e) => setPetData({...petData, status: e.target.value})} className={SelectClass}>
                <option value="disponible">Disponible</option>
                <option value="en proceso">En proceso</option>
                <option value="adoptado">Adoptado</option>
              </select>
            </div>
          </FormField>
        </FormSection>

        <FormSection icon={Syringe} title="Salud" color="text-emerald-500">
          <FormField label="Vacunado" span="col-span-1">
            <label className="flex items-center gap-2 h-[38px] px-3 border border-gray-200 dark:border-dark-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg transition-all">
              <input type="checkbox" checked={petData.vaccinated} onChange={(e) => setPetData({...petData, vaccinated: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
              <span className={`text-sm font-medium ${petData.vaccinated ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {petData.vaccinated ? 'Sí' : 'No'}
              </span>
            </label>
          </FormField>
          <FormField label="Esterilizado" span="col-span-1">
            <label className="flex items-center gap-2 h-[38px] px-3 border border-gray-200 dark:border-dark-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg transition-all">
              <input type="checkbox" checked={petData.sterilized} onChange={(e) => setPetData({...petData, sterilized: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
              <span className={`text-sm font-medium ${petData.sterilized ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {petData.sterilized ? 'Sí' : 'No'}
              </span>
            </label>
          </FormField>
          <FormField label=" " span="col-span-1">
            <div className="h-[38px] flex items-center">
              {petData.vaccinated && petData.sterilized && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  <CheckCircle className="w-3 h-3" />
                  Completo
                </span>
              )}
            </div>
          </FormField>
        </FormSection>

        <div className="col-span-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-dark-border">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descripción</span>
          </div>
          <textarea rows={3} value={petData.description} onChange={(e) => handleChange("description", e.target.value)}
            className={claseInput("w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none", !!errors.description)}
            placeholder="Describe la personalidad y características de la mascota..." />
          <FieldError mensaje={errors.description} />
        </div>

        <ImageUploadSection
          images={petData.images}
          onUpload={handleImageUpload}
          onRemove={handleRemoveImage}
          label="Fotos de la Mascota"
        />
      </div>

      {submitError && (
        <p className="text-xs font-medium text-red-500 leading-snug">
          <span className="font-bold">*</span> {submitError}
        </p>
      )}

      <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-dark-border">
        <button type="submit"
          className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all hover:shadow-lg hover:shadow-rose-200 dark:hover:shadow-rose-500/20 flex items-center justify-center gap-2 text-sm">
          {isEdit ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {title}
        </button>
        <button type="button" onClick={onCancel}
          className="px-6 py-2.5 text-gray-600 dark:text-gray-400 font-medium rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg transition-all text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
};


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ShelterPets() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("todas");
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, petId: null });

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga las mascotas del refugio desde la base de datos.
  const cargarPets = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await misMascotas();
      setPets(data.map((m) => ({
        id: m.id,
        name: m.nombre,
        type: m.tipo || "Perro",
        breed: m.raza || "",
        age: m.edad || "",
        size: m.tamano || "",
        gender: m.genero || "",
        status: (m.estado || "disponible").replace("_", " "),
        description: m.descripcion || "",
        vaccinated: m.vacunado,
        sterilized: m.esterilizado,
        image: null,
      })));
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las mascotas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarPets(); }, [cargarPets]);

  const emptyPet = {
    name: "", type: "Perro", breed: "", age: "", size: "Mediano",
    gender: "Macho", status: "disponible", description: "",
    vaccinated: false, sterilized: false, images: []
  };

  const [newPet, setNewPet] = useState({ ...emptyPet });

  const filteredPets = pets.filter(pet => {
    const matchesSearch = pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "todas" || pet.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const config = {
      "disponible": { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400", icon: CheckCircle },
      "en proceso": { color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400", icon: Clock },
      "adoptado": { color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400", icon: Heart },
    };
    const c = config[status] || config["disponible"];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {status === "disponible" ? "Disponible" : status === "en proceso" ? "En proceso" : "Adoptado"}
      </span>
    );
  };

  const handleAddPet = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await crearMascota({
        nombre: newPet.name,
        tipo: TIPO_MAP[newPet.type] || "perro",
        tamano: TAMANO_MAP[newPet.size] || null,
        genero: GENERO_MAP[newPet.gender] || null,
        estado: ESTADO_MAP[newPet.status] || "disponible",
        raza: newPet.breed,
        edad: newPet.age,
        descripcion: newPet.description,
        vacunado: !!newPet.vaccinated,
        esterilizado: !!newPet.sterilized,
      });
      setShowAddModal(false);
      setNewPet({ ...emptyPet });
      await cargarPets();
    } catch (err) {
      setError(err?.message || "No se pudo registrar la mascota");
    }
  };

  const handleDeletePet = async () => {
    const id = confirmDelete.petId;
    setConfirmDelete({ isOpen: false, petId: null });
    if (!id) return;
    try {
      await eliminarMascota(id);
      await cargarPets();
    } catch (err) {
      setError(err?.message || "No se pudo eliminar la mascota");
    }
  };

  const openPetDetail = (pet) => {
    navigate(`/refugio/mascotas/${pet.id}`, { state: { pet } });
  };

  const openEditPage = (pet) => {
    navigate(`/refugio/mascotas/editar/${pet.id}`, { state: { pet: { ...pet, images: pet.images || [] } } });
  };

  // Al volver de editar/eliminar en otra pagina, recarga desde la BD.
  useEffect(() => {
    if (location.state?.updatedPet || location.state?.deletedPetId) {
      cargarPets();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, cargarPets]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="animate-fade-in-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 rounded-full text-sm font-medium mb-3 shadow-sm">
              <PawPrint className="w-4 h-4" />
              <span>Gestión de Mascotas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Mis Mascotas</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Registra y administra las mascotas de tu refugio</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-200 dark:shadow-rose-500/20 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in-right">
            <Plus className="w-5 h-5 mr-2" />
            Agregar Mascota
          </button>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Buscar por nombre o raza..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white appearance-none cursor-pointer">
              <option value="todas">Todas las mascotas</option>
              <option value="Perro">🐶 Perros</option>
              <option value="Gato">🐱 Gatos</option>
            </select>
          </div>
        </div>
      </section>

      {/* Pet Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-9 h-9 animate-spin text-rose-500 mb-3" />
            <p>Cargando mascotas...</p>
          </div>
        ) : filteredPets.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
              <PawPrint className="w-10 h-10 text-rose-400 dark:text-rose-400/60" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">No hay mascotas registradas</h3>
            <p className="text-gray-500 dark:text-dark-text-secondary mb-6">Comienza registrando tu primera mascota</p>
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> Agregar Mascota
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredPets.map((pet, idx) => (
              <div key={pet.id} className="group bg-white dark:bg-dark-card rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 dark:border-dark-border overflow-hidden animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="relative h-44 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center overflow-hidden">
                  {pet.type === "Perro" ? (
                    <Dog className="w-24 h-24 text-rose-400/50 dark:text-rose-400/30 transition-transform group-hover:scale-110 duration-500" />
                  ) : (
                    <Cat className="w-24 h-24 text-amber-400/50 dark:text-amber-400/30 transition-transform group-hover:scale-110 duration-500" />
                  )}
                  <div className="absolute top-3 right-3">{getStatusBadge(pet.status)}</div>
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/80 dark:bg-dark-bg/80 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur-sm shadow-sm">
                      {pet.type === "Perro" ? <Dog className="w-3 h-3" /> : <Cat className="w-3 h-3" />}
                      {pet.type}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">{pet.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-3">{pet.breed}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border px-2 py-1 rounded-lg">
                      <Calendar className="w-3 h-3" /> {pet.age}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border px-2 py-1 rounded-lg">
                      <Ruler className="w-3 h-3" /> {pet.size}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border px-2 py-1 rounded-lg">
                      {pet.gender === "Macho" ? "♂" : "♀"} {pet.gender}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {pet.vaccinated && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                        <Syringe className="w-3 h-3" /> Vacunado
                      </span>
                    )}
                    {pet.sterilized && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg">
                        Esterilizado
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-dark-border">
                    <button onClick={() => openPetDetail(pet)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all">
                      <Eye className="w-3.5 h-3.5" /> Ver perfil
                    </button>
                    <button onClick={() => openEditPage(pet)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all">
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button onClick={() => setConfirmDelete({ isOpen: true, petId: pet.id })}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 animate-modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                Nueva Mascota
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <PetForm petData={newPet} setPetData={setNewPet} onSubmit={handleAddPet}
              onCancel={() => setShowAddModal(false)} title="Registrar Mascota" isEdit={false} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, petId: null })}
        onConfirm={handleDeletePet}
        title="¿Eliminar mascota?"
        message="Esta acción no se puede deshacer. La mascota será eliminada permanentemente del sistema."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
