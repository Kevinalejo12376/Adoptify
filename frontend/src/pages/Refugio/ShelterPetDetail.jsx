import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, PawPrint, Dog, Cat, Calendar, Heart, Edit3, Trash2,
  CheckCircle, Clock, Ruler, Tag, Syringe, Weight, Star, Info,
  ChevronRight, Scissors, Droplets, Loader2, Venus, Mars, XCircle
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import { obtenerMascota } from "../../api/mascotas";

// Convierte un valor vacío (null/undefined/"") en un texto amigable.
const mostrarValor = (v) => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s === "" ? "No especificado" : s;
};

const formatearFecha = (fecha) => {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
};

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

// Convierte la respuesta del backend (m.nombre, m.peso, ...) a la forma que usa
// el detalle, garantizando que TODOS los datos estén disponibles.
const mapearMascota = (m) => ({
  id: m.id,
  name: m.nombre,
  type: m.tipo || "Perro",
  breed: m.raza || "",
  age: m.edad || "",
  size: m.tamano || "",
  gender: m.genero || "",
  status: (m.estado || "disponible").replace("_", " "),
  description: m.descripcion || "",
  weight: m.peso || "",
  color: m.color || "",
  health: m.salud || "",
  personality: Array.isArray(m.personalidad)
    ? m.personalidad
    : (m.personalidad ? m.personalidad.split(",").map((t) => t.trim()).filter(Boolean) : []),
  vaccinated: !!m.vacunado,
  sterilized: !!m.esterilizado,
  fecha_ingreso: m.fecha_ingreso || null,
  creado_en: m.creado_en || null,
  imagenes: m.imagenes || [],
  images: (m.imagenes || []).map((img) => ({ id: img.id, url: img.url, publicId: img.public_id })),
});

// Tarjeta de detalle individual (ícono + etiqueta + valor).
const DetailTile = ({ Icon: IconComp, iconCls, label, value }) => {
  const texto = mostrarValor(value);
  const esVacio = texto === "No especificado";
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconCls.bg}`}>
          <IconComp className={`w-4 h-4 ${iconCls.text}`} />
        </span>
        <span className="text-[11px] font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className={`text-sm font-semibold truncate ${esVacio ? "text-gray-400 dark:text-dark-text-secondary italic" : "text-gray-900 dark:text-white"}`}>{texto}</p>
    </div>
  );
};

// Fila de estado de salud (sí/no con indicador visual).
const HealthRow = ({ Icon: IconComp, label, valor, ok, iconCls = "text-emerald-500" }) => (
  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
    <span className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-dark-text-secondary min-w-0">
      <IconComp className={`w-4 h-4 ${iconCls} shrink-0`} />
      <span className="truncate">{label}</span>
    </span>
    <span className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
      {ok ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {valor}
    </span>
  </div>
);

export default function ShelterPetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [pet, setPet] = useState(location.state?.pet ? { ...location.state.pet } : null);
  const [loading, setLoading] = useState(!location.state?.pet);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deleted, setDeleted] = useState(false);

  // Consulta siempre a la BD para garantizar que se muestren TODOS los datos de
  // la mascota (peso, color, personalidad, salud, etc.), aunque se llegue
  // directo por URL o el estado de navegación no los incluya.
  useEffect(() => {
    let activo = true;
    obtenerMascota(id)
      .then((m) => { if (activo) setPet(mapearMascota(m)); })
      .catch(() => { if (activo && !location.state?.pet) setPet(null); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="flex flex-col items-center text-gray-500 animate-fade-in-up">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p>Cargando información de la mascota...</p>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <PawPrint className="w-10 h-10 text-rose-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Mascota no encontrada</h3>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-6">No se pudo cargar la información de esta mascota.</p>
          <button onClick={() => navigate("/refugio/mascotas")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg">
            <ArrowLeft className="w-4 h-4" /> Volver a mascotas
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    setDeleted(true);
    setShowDeleteModal(false);
    setTimeout(() => navigate("/refugio/mascotas", { state: { deletedPetId: pet.id } }), 300);
  };

  const handleEdit = () => {
    navigate(`/refugio/mascotas/editar/${pet.id}`, { state: { pet } });
  };

  const images = pet.images || [];
  const GenderIcon = pet.gender === "Hembra" ? Venus : pet.gender === "Macho" ? Mars : Tag;
  const statusLabel = pet.status === "en proceso" ? "En proceso" : pet.status === "adoptado" ? "Adoptado" : "Disponible";
  const statusColor = pet.status === "disponible"
    ? "text-emerald-600 dark:text-emerald-400"
    : pet.status === "adoptado"
      ? "text-blue-600 dark:text-blue-400"
      : "text-amber-600 dark:text-amber-400";
  const fechaIngreso = formatearFecha(pet.fecha_ingreso || pet.creado_en);

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header Navigation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center justify-between animate-fade-in-left">
          <button onClick={() => navigate("/refugio/mascotas")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Volver a mascotas
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Mascota eliminada</h3>
            <p className="text-gray-500 dark:text-dark-text-secondary">{pet.name} ha sido eliminado del sistema.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Images, Descripción y Personalidad */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden animate-fade-in-up">
                {images.length > 0 ? (
                  <>
                    <div className="relative h-72 sm:h-96 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20">
                      <img src={images[currentImageIndex]?.url || images[currentImageIndex]?.src} alt={pet.name}
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
                          <img src={img.url || img.src} alt={`${pet.name} ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-72 sm:h-96 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center">
                    {pet.type === "Perro" ? (
                      <Dog className="w-32 h-32 text-rose-400/40 dark:text-rose-400/30" />
                    ) : (
                      <Cat className="w-32 h-32 text-amber-400/40 dark:text-amber-400/30" />
                    )}
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  Sobre {pet.name}
                </h3>
                {pet.description ? (
                  <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed whitespace-pre-line">{pet.description}</p>
                ) : (
                  <p className="text-gray-400 dark:text-dark-text-secondary italic">No se ha registrado una descripción.</p>
                )}
              </div>

              {/* Personalidad */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Personalidad
                </h3>
                {pet.personality && pet.personality.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {pet.personality.map((trait, i) => (
                      <span key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-500/20">
                        <Star className="w-3 h-3" /> {trait}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-dark-text-secondary italic">No se registraron rasgos de personalidad.</p>
                )}
              </div>
            </div>

            {/* Right Column - Resumen, Detalles, Estado y salud, Acciones */}
            <div className="space-y-6">
              {/* Hero Info */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/20 dark:to-amber-500/20 flex items-center justify-center shrink-0">
                    {pet.type === "Perro" ? (
                      <Dog className="w-8 h-8 text-rose-500/60 dark:text-rose-400/50" />
                    ) : (
                      <Cat className="w-8 h-8 text-amber-500/60 dark:text-amber-400/50" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display truncate">{pet.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">{mostrarValor(pet.breed)}</p>
                  </div>
                </div>
                {getStatusBadge(pet.status)}
              </div>

              {/* Detalles de la mascota */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-rose-500" />
                  Detalles de la mascota
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <DetailTile
                    Icon={pet.type === "Perro" ? Dog : Cat}
                    iconCls={{ bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-500" }}
                    label="Tipo" value={pet.type} />
                  <DetailTile
                    Icon={Tag}
                    iconCls={{ bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-500" }}
                    label="Raza" value={pet.breed} />
                  <DetailTile
                    Icon={Calendar}
                    iconCls={{ bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-500" }}
                    label="Edad" value={pet.age} />
                  <DetailTile
                    Icon={Weight}
                    iconCls={{ bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-500" }}
                    label="Peso" value={pet.weight} />
                  <DetailTile
                    Icon={Droplets}
                    iconCls={{ bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-500" }}
                    label="Color" value={pet.color} />
                  <DetailTile
                    Icon={GenderIcon}
                    iconCls={{ bg: "bg-pink-50 dark:bg-pink-500/10", text: "text-pink-500" }}
                    label="Sexo" value={pet.gender} />
                  <DetailTile
                    Icon={Ruler}
                    iconCls={{ bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-500" }}
                    label="Tamaño" value={pet.size} />
                </div>
              </div>

              {/* Estado y salud */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                  <Syringe className="w-4 h-4 text-emerald-500" />
                  Estado y salud
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
                    <span className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-dark-text-secondary min-w-0">
                      <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="truncate">Estado de adopción</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <HealthRow
                    Icon={Syringe}
                    label="Vacunado"
                    valor={pet.vaccinated ? "Sí" : "No"}
                    ok={!!pet.vaccinated} />
                  <HealthRow
                    Icon={Scissors}
                    label="Esterilizado"
                    valor={pet.sterilized ? "Sí" : "No"}
                    ok={!!pet.sterilized} />
                </div>
                {pet.health ? (
                  <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 dark:text-dark-text-secondary bg-rose-50 dark:bg-rose-500/10 rounded-xl p-3">
                    <Info className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <span className="leading-snug">{pet.health}</span>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-400 dark:text-dark-text-secondary italic">
                    No se registró información adicional de salud.
                  </p>
                )}
              </div>

              {/* Fecha de ingreso */}
              {fechaIngreso && (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Ingresó el</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{fechaIngreso}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-6 animate-fade-in-up">
                <div className="space-y-3">
                  <button onClick={handleEdit}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all">
                    <Edit3 className="w-4 h-4" />
                    Editar {pet.name}
                  </button>
                  <button onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">
                    <Trash2 className="w-4 h-4" />
                    Eliminar mascota
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
        title="¿Eliminar mascota?"
        message={`Esta acción no se puede deshacer. ${pet.name} será eliminado permanentemente del sistema.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
