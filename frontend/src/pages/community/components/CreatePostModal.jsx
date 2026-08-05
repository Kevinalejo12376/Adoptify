import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import {
  X,
  Send,
  Image as ImageIcon,
  Hash,
  MapPin,
  Sparkles,
  ChevronDown,
  Lightbulb,
  Eye,
  Shield,
  Save,
  Trash2,
  FileText,
  Bookmark,
  Search,
  Calendar,
  MessageSquare,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import ConfirmModal from "../../../components/ConfirmModal";
import ImageUploader from "../../../components/ImageUploader";
import { eliminarImagen } from "../../../api/upload";

const postTypes = [
  { id: "story", label: "Historia", icon: "📖", desc: "Comparte tu historia de adopción" },
  { id: "question", label: "Pregunta", icon: "❓", desc: "Haz una pregunta a la comunidad" },
  { id: "tip", label: "Consejo", icon: "💡", desc: "Comparte un consejo útil" },
  { id: "photo", label: "Foto", icon: "📸", desc: "Comparte una foto de tu mascota" },
];

const shelterPostTypes = [
  { id: "adoption_day", label: "Jornada de Adopción", icon: "🐾", desc: "Anuncia una jornada de adopción" },
  { id: "campaign", label: "Campaña", icon: "📢", desc: "Campaña de esterilización o vacunación" },
  { id: "donation", label: "Donación", icon: "🎁", desc: "Solicitud de donación" },
  { id: "event", label: "Evento", icon: "📅", desc: "Anuncia un evento especial" },
  { id: "special_case", label: "Caso Especial", icon: "🆘", desc: "Caso que requiere atención urgente" },
];

const categories = [
  "Cuidado",
  "Entrenamiento",
  "Salud",
  "Nutrición",
  "Historias",
  "Consejos",
  "Adopción",
  "Eventos",
  "Campañas",
  "Donaciones",
];

const suggestedTags = [
  "AdopciónResponsable", "CuidadosBásicos", "PerrosFelices", "GatosAdorables", "SaludAnimal",
  "EntrenamientoCanino", "Alimentación", "RescateAnimal", "Esterilización", "Vacunación",
];

// ============================================================
// Utilidades de localStorage para borradores
// ============================================================

const DRAFTS_KEY_PREFIX = "forum_drafts_";

const getDraftsKey = (userId) => `${DRAFTS_KEY_PREFIX}${userId || "anonymous"}`;

const loadDraftsFromStorage = (userId) => {
  try {
    const raw = localStorage.getItem(getDraftsKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveDraftsToStorage = (userId, drafts) => {
  localStorage.setItem(getDraftsKey(userId), JSON.stringify(drafts));
};

// ============================================================
// Modal de lista de borradores
// ============================================================

function DraftsListModal({ isOpen, onClose, onSelectDraft, onDeleteDraft, drafts, isDark }) {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filteredDrafts = drafts
    .filter((d) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (d.title || "").toLowerCase().includes(term) ||
        (d.content || "").toLowerCase().includes(term)
      );
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Ahora";
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return date.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const getContentPreview = (content) => {
    if (!content) return "Sin contenido";
    const plain = content.replace(/<[^>]+>/g, "");
    return plain.length > 100 ? plain.substring(0, 100) + "..." : plain;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-modal-overlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div
        className={`relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? "bg-dark-card border border-dark-border" : "bg-white"
        } animate-modal-content`}
      >
        {/* Header con degradado */}
        <div
          className={`relative px-6 pt-6 pb-5 ${
            isDark
              ? "bg-gradient-to-b from-amber-500/10 to-transparent"
              : "bg-gradient-to-b from-amber-50 to-transparent"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${
                  isDark
                    ? "bg-gradient-to-br from-amber-400 to-orange-500"
                    : "bg-gradient-to-br from-amber-400 to-orange-500"
                }`}
              >
                <Bookmark className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2
                  className={`text-lg font-bold font-display ${
                    isDark ? "text-dark-text" : "text-gray-900"
                  }`}
                >
                  Mis Borradores
                </h2>
                <p
                  className={`text-xs ${
                    isDark ? "text-dark-text-secondary" : "text-gray-500"
                  }`}
                >
                  {drafts.length} {drafts.length === 1 ? "guardado" : "guardados"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Buscador */}
          <div className="relative mt-4">
            <Search
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDark ? "text-dark-text-secondary" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar borradores por título o contenido..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                isDark
                  ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary"
                  : "bg-white border border-gray-200 text-gray-700 placeholder-gray-400 shadow-sm"
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded ${
                  isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de borradores */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2.5">
          {filteredDrafts.length === 0 ? (
            <div
              className={`text-center py-14 ${
                isDark ? "text-dark-text-secondary" : "text-gray-500"
              }`}
            >
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  isDark ? "bg-white/5" : "bg-gray-100"
                }`}
              >
                <FileText className="w-7 h-7 opacity-50" />
              </div>
              <p className="text-sm font-semibold">
                {searchTerm ? "Sin resultados" : "No hay borradores"}
              </p>
              <p className="text-xs mt-1 opacity-70">
                {searchTerm
                  ? "Prueba con otros términos"
                  : "Guarda un borrador desde el editor"}
              </p>
            </div>
          ) : (
            filteredDrafts.map((draft) => (
              <div
                key={draft.id}
                className={`group relative rounded-xl overflow-hidden transition-all cursor-pointer border ${
                  isDark
                    ? "bg-[#15151f] border-dark-border hover:border-amber-500/30"
                    : "bg-gray-50/80 border border-gray-100 hover:border-amber-300 hover:bg-white hover:shadow-md"
                }`}
                onClick={() => onSelectDraft(draft)}
              >
                {/* Barra lateral de color */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isDark ? "bg-amber-500/30" : "bg-amber-400"
                  }`}
                ></div>

                <div className="pl-5 pr-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm font-semibold truncate ${
                          isDark ? "text-dark-text" : "text-gray-900"
                        }`}
                      >
                        {draft.title || (
                          <span className="italic opacity-60">Sin título</span>
                        )}
                      </h3>

                      <p
                        className={`text-xs mt-1 line-clamp-2 ${
                          isDark ? "text-dark-text-secondary" : "text-gray-500"
                        }`}
                      >
                        {getContentPreview(draft.content)}
                      </p>

                      <div
                        className={`flex items-center gap-2.5 mt-2 text-xs ${
                          isDark ? "text-dark-text-secondary" : "text-gray-400"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(draft.updatedAt)}
                        </span>
                        {draft.category && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
                            <span>{draft.category}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDraft(draft.id);
                        }}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                          isDark
                            ? "text-red-400 hover:bg-red-500/10"
                            : "text-red-500 hover:bg-red-50"
                        }`}
                        title="Eliminar borrador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDraft(draft);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                          isDark
                            ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CreatePostModal principal
// ============================================================

export default function CreatePostModal({ isOpen, onClose, onCreate, editingPost, onUpdate }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const isShelter = user?.accountType === "shelter";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [postType, setPostType] = useState("");
  const [showPostTypes, setShowPostTypes] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  // Imágenes de la publicación: [{url, publicId, id?}] (id = imágenes ya guardadas).
  const [images, setImages] = useState([]);
  // Snapshot de imágenes existentes al abrir (para calcular eliminaciones).
  const initialImagesRef = useRef([]);
  // publicIds de imágenes NUEVAS subidas en esta sesión (para limpiar huérfanos).
  const uploadedThisSession = useRef([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Estados de borradores
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  // Estado del envío de la publicación: null | "loading" | "success" | "error"
  const [publishingStatus, setPublishingStatus] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    type: "danger",
    onConfirm: () => {},
  });

  const userId = user?.id || user?.email || "anonymous";

  // Cargar borradores al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setDrafts(loadDraftsFromStorage(userId));
      setSaveFeedback(false);
    }
  }, [isOpen, userId]);

  // En modo edicion, precargar los datos de la publicacion.
  useEffect(() => {
    if (isOpen && editingPost) {
      setTitle(editingPost.title || "");
      setContent(editingPost.content || "");
      setCategory(editingPost.category && editingPost.category !== "General" ? editingPost.category : "");
      setTags(editingPost.tags || []);
      setPublishingStatus(null);
      const preloaded = (editingPost.images || []).map((img) => ({
        id: img.id,
        url: img.url,
        publicId: img.publicId || "",
      }));
      setImages(preloaded);
      initialImagesRef.current = preloaded;
      uploadedThisSession.current = [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingPost]);

  const refreshDrafts = useCallback(() => {
    setDrafts(loadDraftsFromStorage(userId));
  }, [userId]);

  // Silenciosamente restaurar borrador cuando se selecciona desde el modal
  const handleSelectDraftSilent = useCallback((draft) => {
    setTitle(draft.title || "");
    setContent(draft.content || "");
    setCategory(draft.category || "");
    setPostType(draft.postType || "");
    setTags(draft.tags || []);
    setImages(draft.images || []);
    setLocation(draft.location || "");
    setCurrentDraftId(draft.id);
    setShowDraftsModal(false);
  }, []);

  if (!isOpen) return null;

  const availablePostTypes = isShelter
    ? [...postTypes, ...shelterPostTypes]
    : postTypes;

  const addTag = (tag) => {
    const cleanTag = tag.trim().replace(/^#/, "");
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
      setTags([...tags, cleanTag]);
    }
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const getFilteredTagSuggestions = () => {
    if (!tagInput.trim()) return [];
    const search = tagInput.toLowerCase().replace(/^#/, "");
    return suggestedTags.filter(
      (tag) => tag.toLowerCase().includes(search) && !tags.includes(tag)
    );
  };

  const selectedPostType = availablePostTypes.find((t) => t.id === postType);

  // ============================================================
  // Funciones de borradores
  // ============================================================

  const hasContent = title.trim() || content.trim() || category || tags.length > 0;

  const getFormData = () => ({
    title: title.trim(),
    content: content.trim(),
    category,
    postType,
    tags,
    images,
    location: location ? location.name : "",
  });

  const handleSaveDraft = () => {
    const allDrafts = loadDraftsFromStorage(userId);
    const formData = getFormData();
    const now = new Date().toISOString();

    if (currentDraftId) {
      const updated = allDrafts.map((d) =>
        d.id === currentDraftId
          ? { ...d, ...formData, updatedAt: now }
          : d
      );
      saveDraftsToStorage(userId, updated);
      setDrafts(updated);
    } else {
      const newDraft = {
        id: `draft_${Date.now()}`,
        ...formData,
        savedAt: now,
        updatedAt: now,
      };
      const updated = [newDraft, ...allDrafts];
      saveDraftsToStorage(userId, updated);
      setDrafts(updated);
    }

    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
      resetForm();
    }, 1200);
  };

  const handleDeleteDraft = (draftId) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar borrador?",
      message: "Este borrador se eliminará permanentemente. No podrás recuperarlo.",
      confirmText: "Eliminar",
      type: "danger",
      onConfirm: () => {
        const allDrafts = loadDraftsFromStorage(userId);
        const updated = allDrafts.filter((d) => d.id !== draftId);
        saveDraftsToStorage(userId, updated);
        setDrafts(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));

        if (currentDraftId === draftId) {
          resetForm();
        }
      },
    });
  };

  const handleDeleteCurrentDraft = () => {
    if (!currentDraftId) return;
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar borrador?",
      message: "Este borrador se eliminará permanentemente. No podrás recuperarlo.",
      confirmText: "Eliminar",
      type: "danger",
      onConfirm: () => {
        const allDrafts = loadDraftsFromStorage(userId);
        const updated = allDrafts.filter((d) => d.id !== currentDraftId);
        saveDraftsToStorage(userId, updated);
        setDrafts(updated);
        resetForm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const resetForm = () => {
    setCurrentDraftId(null);
    setTitle("");
    setContent("");
    setCategory("");
    setPostType("");
    setTags([]);
    setImages([]);
    initialImagesRef.current = [];
    uploadedThisSession.current = [];
    setLocation(null);
    setLocationLoading(false);
    setLocationError(null);
    setSaveFeedback(false);
  };

  // Elimina de Cloudinary las imágenes NUEVAS subidas si el usuario cancela
  // (evita almacenar imágenes huérfanas). Las ya guardadas NO se tocan.
  const cleanupOrphanImages = () => {
    const pendientes = uploadedThisSession.current;
    uploadedThisSession.current = [];
    pendientes.forEach((pid) => {
      if (pid) eliminarImagen(pid).catch(() => {});
    });
  };

  // Handler del ImageUploader: registra nuevas subidas para limpieza posterior.
  const handleImagesChange = (newImages) => {
    newImages.forEach((img) => {
      if (!img.id && img.publicId && !uploadedThisSession.current.includes(img.publicId)) {
        uploadedThisSession.current.push(img.publicId);
      }
    });
    setImages(newImages);
  };

  // Obtener ubicación del usuario vía Geolocation API + geocodificación inversa
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no soporta geolocalización");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`,
            { headers: { "User-Agent": "AdoptifyApp/1.0" } }
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.municipality ||
            data.address?.county ||
            "";
          const region = data.address?.state || "";
          const country = data.address?.country || "";
          const displayName = [city, region, country].filter(Boolean).join(", ") || data.display_name || "Ubicación actual";

          setLocation({ name: displayName, lat: latitude, lng: longitude });
          setLocationLoading(false);
        } catch {
          // Si falla la geocodificación, guardamos coordenadas
          setLocation({ name: `Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, lat: latitude, lng: longitude });
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Permiso denegado. Puedes publicar sin ubicación.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("No se pudo obtener la ubicación. Intenta de nuevo.");
            break;
          case error.TIMEOUT:
            setLocationError("La solicitud de ubicación expiró. Intenta de nuevo.");
            break;
          default:
            setLocationError("Error al obtener ubicación.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const removeLocation = () => {
    setLocation(null);
    setLocationError(null);
  };

  const handlePublish = async () => {
    // Evita publicaciones duplicadas si el usuario presiona el botón varias veces.
    // El contenido debe tener mas de 10 caracteres para publicar.
    if (!title.trim() || content.trim().length < 10 || !category || publishingStatus === "loading") return;
    setPublishingStatus("loading");
    // Calcular imágenes nuevas (sin id) y eliminaciones de imágenes existentes.
    const idsIniciales = initialImagesRef.current.map((i) => i.id);
    const idsActuales = images.map((i) => i.id).filter(Boolean);
    const imagenesEliminar = idsIniciales.filter((id) => !idsActuales.includes(id));
    const imagenesNuevas = images
      .filter((i) => !i.id)
      .map((i) => ({ url: i.url, public_id: i.publicId || "" }));

    const payload = {
      titulo: title.trim(),
      contenido: content.trim(),
      categoria: category,
      tags: tags.join(","),
      imagenes: imagenesNuevas,
      imagenes_eliminar: imagenesEliminar,
    };
    try {
      if (editingPost) {
        await onUpdate?.(editingPost.id, payload);
      } else {
        await onCreate?.(payload);
      }
    } catch (e) {
      // si falla la creacion, se mantiene el formulario
      setPublishingStatus("error");
      setTimeout(() => setPublishingStatus(null), 2500);
      return;
    }
    if (currentDraftId) {
      const allDrafts = loadDraftsFromStorage(userId);
      const updated = allDrafts.filter((d) => d.id !== currentDraftId);
      saveDraftsToStorage(userId, updated);
      setDrafts(updated);
    }
    setPublishingStatus("success");
    // Las imágenes nuevas ya quedaron guardadas: no deben eliminarse al cerrar.
    uploadedThisSession.current = [];
    setTimeout(() => {
      setPublishingStatus(null);
      resetForm();
      onClose();
    }, 1200);
  };

  const handleCancel = () => {
    if (hasContent) {
      setConfirmModal({
        isOpen: true,
        title: "¿Descartar cambios?",
        message: "Los cambios que no hayas guardado se perderán. ¿Estás seguro de que deseas salir?",
        confirmText: "Salir sin guardar",
        type: "warning",
        onConfirm: () => {
          cleanupOrphanImages();
          resetForm();
          onClose();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      cleanupOrphanImages();
      resetForm();
      onClose();
    }
  };

  // El contenido debe tener mas de 10 caracteres para poder publicar.
  const canPublish = title.trim() && content.trim().length > 10 && category;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-overlay">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel}></div>

        <div
          className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
            isDark ? "bg-dark-card border border-dark-border" : "bg-white"
          } animate-modal-content`}
        >
          {/* ===== HEADER ===== */}
          <div
            className={`sticky top-0 z-10 flex items-center justify-between p-5 border-b bg-inherit ${
              isDark ? "border-dark-border" : "border-gray-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                  isDark
                    ? "bg-gradient-to-br from-rose-500/20 to-amber-500/20"
                    : "bg-gradient-to-br from-rose-100 to-amber-100"
                }`}
              >
                <MessageSquare
                  className={`w-5 h-5 ${
                    isDark ? "text-rose-400" : "text-rose-600"
                  }`}
                />
              </div>
              <div>
                <h2
                  className={`text-xl font-bold font-display ${
                    isDark ? "text-dark-text" : "text-gray-900"
                  }`}
                >
                  {editingPost ? "Editar Publicación" : "Crear Publicación"}
                </h2>
                <p
                  className={`text-xs mt-0.5 ${
                    isDark ? "text-dark-text-secondary" : "text-gray-500"
                  }`}
                >
                  {isShelter ? "Publica como refugio" : "Comparte con la comunidad"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Botón Borradores */}
              {drafts.length > 0 && (
                <button
                  onClick={() => {
                    refreshDrafts();
                    setShowDraftsModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-sm ${
                    isDark
                      ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Borradores
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      isDark
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-amber-200 text-amber-800"
                    }`}
                  >
                    {drafts.length}
                  </span>
                </button>
              )}
              <button
                onClick={handleCancel}
                className={`p-2 rounded-xl transition-all ${
                  isDark
                    ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ===== BODY ===== */}
          <div className="p-5 space-y-5">
            {/* Post Type Selection */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-dark-text" : "text-gray-700"
                }`}
              >
                Tipo de publicación
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowPostTypes(!showPostTypes)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isDark
                      ? "bg-[#15151f] border border-dark-border text-dark-text hover:border-rose-500/30"
                      : "bg-gray-50 border border-gray-200 text-gray-700 hover:border-rose-300"
                  }`}
                >
                  {selectedPostType ? (
                    <>
                      <span className="text-lg">{selectedPostType.icon}</span>
                      <div className="text-left">
                        <p className="font-medium">{selectedPostType.label}</p>
                        <p
                          className={`text-xs ${
                            isDark ? "text-dark-text-secondary" : "text-gray-500"
                          }`}
                        >
                          {selectedPostType.desc}
                        </p>
                      </div>
                    </>
                  ) : (
                    <span
                      className={
                        isDark ? "text-dark-text-secondary" : "text-gray-400"
                      }
                    >
                      Selecciona un tipo de publicación
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 ml-auto transition-transform ${
                      showPostTypes ? "rotate-180" : ""
                    } ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}
                  />
                </button>

                {showPostTypes && (
                  <div
                    className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl z-10 overflow-hidden ${
                      isDark
                        ? "bg-dark-card border border-dark-border"
                        : "bg-white border border-gray-100"
                    }`}
                  >
                    {availablePostTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setPostType(type.id);
                          setShowPostTypes(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                          postType === type.id
                            ? isDark
                              ? "bg-rose-500/10 text-rose-300"
                              : "bg-rose-50 text-rose-700"
                            : isDark
                            ? "text-dark-text-secondary hover:bg-white/5"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-lg">{type.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{type.label}</p>
                          <p
                            className={`text-xs ${
                              isDark ? "text-dark-text-secondary" : "text-gray-500"
                            }`}
                          >
                            {type.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-dark-text" : "text-gray-700"
                }`}
              >
                Título <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Escribe un título descriptivo..."
                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                  isDark
                    ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary"
                    : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"
                }`}
              />
            </div>

            {/* Category */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-dark-text" : "text-gray-700"
                }`}
              >
                Categoría <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                  isDark
                    ? "bg-[#15151f] border border-dark-border text-dark-text"
                    : "bg-gray-50 border border-gray-200 text-gray-700"
                }`}
              >
                <option value="">Selecciona una categoría</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-dark-text" : "text-gray-700"
                }`}
              >
                Contenido <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows="6"
                placeholder="Comparte tu experiencia, pregunta o consejo..."
                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none ${
                  isDark
                    ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary"
                    : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"
                }`}
              />
              {content.length > 0 && content.trim().length < 10 && (
                <p
                  className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${
                    isDark ? "text-red-400" : "text-red-500"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  El contenido debe tener al menos 10 caracteres.
                </p>
              )}
              {content.length > 50 && (
                <div
                  className={`mt-2 p-3 rounded-xl ${
                    isDark
                      ? "bg-violet-500/10 border border-violet-500/20"
                      : "bg-violet-50 border border-violet-100"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb
                      className={`w-4 h-4 mt-0.5 ${
                        isDark ? "text-violet-300" : "text-violet-600"
                      }`}
                    />
                    <div>
                      <p
                        className={`text-xs font-medium ${
                          isDark ? "text-violet-300" : "text-violet-700"
                        }`}
                      >
                        Publicaciones similares encontradas
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          isDark ? "text-dark-text-secondary" : "text-gray-500"
                        }`}
                      >
                        Puede que tu pregunta ya haya sido respondida.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-dark-text" : "text-gray-700"
                }`}
              >
                Etiquetas
                <span
                  className={`text-xs ml-2 ${
                    isDark ? "text-dark-text-secondary" : "text-gray-400"
                  }`}
                >
                  ({tags.length}/10)
                </span>
              </label>
              <div className="relative">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                    isDark
                      ? "bg-[#15151f] border border-dark-border"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <Hash
                    className={`w-4 h-4 ${
                      isDark ? "text-dark-text-secondary" : "text-gray-400"
                    }`}
                  />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="Añade etiquetas (Enter)"
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${
                      isDark
                        ? "text-dark-text placeholder-dark-text-secondary"
                        : "text-gray-700 placeholder-gray-400"
                    }`}
                  />
                  <button
                    onClick={() => setShowAiSuggestions(!showAiSuggestions)}
                    className={`p-1.5 rounded-lg transition-all ${
                      isDark
                        ? "text-violet-400 hover:bg-violet-500/15"
                        : "text-violet-500 hover:bg-violet-50"
                    }`}
                    title="Sugerir etiquetas con IA"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>

                {showTagSuggestions && tagInput.trim() && (
                  <div
                    className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl z-10 overflow-hidden ${
                      isDark
                        ? "bg-dark-card border border-dark-border"
                        : "bg-white border border-gray-100"
                    }`}
                  >
                    {getFilteredTagSuggestions().length > 0 ? (
                      getFilteredTagSuggestions()
                        .slice(0, 5)
                        .map((tag) => (
                          <button
                            key={tag}
                            onClick={() => addTag(tag)}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-all ${
                              isDark
                                ? "text-dark-text-secondary hover:bg-white/5"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <Hash className="w-3 h-3" />
                            {tag}
                          </button>
                        ))
                    ) : (
                      <p
                        className={`px-4 py-2.5 text-sm ${
                          isDark ? "text-dark-text-secondary" : "text-gray-500"
                        }`}
                      >
                        Sin sugerencias
                      </p>
                    )}
                  </div>
                )}

                {showAiSuggestions && (
                  <div
                    className={`mt-2 p-3 rounded-xl ${
                      isDark
                        ? "bg-violet-500/10 border border-violet-500/20"
                        : "bg-violet-50 border border-violet-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles
                        className={`w-4 h-4 ${
                          isDark ? "text-violet-300" : "text-violet-600"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          isDark ? "text-violet-300" : "text-violet-700"
                        }`}
                      >
                        Etiquetas sugeridas
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "AnsiedadCanina",
                        "CuidadoEmocional",
                        "ConsejosVeterinarios",
                        "PerrosFelices",
                      ].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                            tags.includes(tag)
                              ? "bg-rose-500 text-white"
                              : isDark
                              ? "bg-white/5 text-dark-text-secondary hover:bg-rose-500/20 hover:text-rose-300"
                              : "bg-white text-gray-600 hover:bg-rose-50 hover:text-rose-700"
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm ${
                        isDark
                          ? "bg-rose-500/15 text-rose-300"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Image Upload (Cloudinary) */}
            <div>
              <ImageUploader
                tipo="foro"
                multiple
                maxFiles={5}
                label="Imágenes (Máx. 5)"
                value={images}
                onChange={handleImagesChange}
              />
            </div>

            {/* Location - Estilo WhatsApp */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-dark-text" : "text-gray-700"
                }`}
              >
                Ubicación
                <span
                  className={`text-xs ml-2 ${
                    isDark ? "text-dark-text-secondary" : "text-gray-400"
                  }`}
                >
                  (opcional)
                </span>
              </label>

              {location ? (
                /* Vista previa de ubicación */
                <div
                  className={`rounded-xl overflow-hidden border transition-all ${
                    isDark
                      ? "bg-[#15151f] border-dark-border"
                      : "bg-white border-gray-200 shadow-sm"
                  }`}
                >
                  {/* Barra decorativa superior */}
                  <div className="h-1.5 bg-gradient-to-r from-rose-500 to-amber-500"></div>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icono de mapa */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isDark
                            ? "bg-rose-500/15"
                            : "bg-rose-50"
                        }`}
                      >
                        <MapPin
                          className={`w-6 h-6 ${
                            isDark ? "text-rose-400" : "text-rose-500"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            isDark ? "text-dark-text" : "text-gray-900"
                          }`}
                        >
                          Ubicación compartida
                        </p>
                        <p
                          className={`text-xs mt-0.5 line-clamp-2 ${
                            isDark ? "text-dark-text-secondary" : "text-gray-500"
                          }`}
                        >
                          {location.name}
                        </p>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={requestLocation}
                          className={`p-2 rounded-lg transition-all ${
                            isDark
                              ? "text-blue-400 hover:bg-blue-500/10"
                              : "text-blue-600 hover:bg-blue-50"
                          }`}
                          title="Actualizar ubicación"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={removeLocation}
                          className={`p-2 rounded-lg transition-all ${
                            isDark
                              ? "text-red-400 hover:bg-red-500/10"
                              : "text-red-500 hover:bg-red-50"
                          }`}
                          title="Eliminar ubicación"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Botón para compartir ubicación */
                <div>
                  <button
                    onClick={requestLocation}
                    disabled={locationLoading}
                    className={`w-full rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                      isDark
                        ? "border-dark-border hover:border-rose-500/30 bg-transparent"
                        : "border-gray-200 hover:border-rose-300 bg-gray-50/50"
                    } ${locationLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {locationLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
                        <p className={`text-sm font-medium ${isDark ? "text-dark-text" : "text-gray-700"}`}>
                          Obteniendo ubicación...
                        </p>
                        <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                          Por favor, espera un momento
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isDark ? "bg-rose-500/10" : "bg-rose-50"
                          }`}
                        >
                          <MapPin
                            className={`w-6 h-6 ${
                              isDark ? "text-rose-400" : "text-rose-500"
                            }`}
                          />
                        </div>
                        <p className={`text-sm font-medium ${isDark ? "text-dark-text" : "text-gray-700"}`}>
                          Compartir mi ubicación actual
                        </p>
                        <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                          Tu ubicación se mostrará en la publicación
                        </p>
                      </div>
                    )}
                  </button>

                  {/* Mensaje de error si existe */}
                  {locationError && (
                    <div
                      className={`mt-2 flex items-start gap-2 p-3 rounded-xl ${
                        isDark
                          ? "bg-red-500/10 border border-red-500/20"
                          : "bg-red-50 border border-red-100"
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isDark ? "text-red-400" : "text-red-500"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <div className="flex-1">
                        <p
                          className={`text-xs font-medium ${
                            isDark ? "text-red-300" : "text-red-700"
                          }`}
                        >
                          {locationError}
                        </p>
                        {locationError.includes("Permiso denegado") && (
                          <p
                            className={`text-xs mt-0.5 ${
                              isDark ? "text-dark-text-secondary" : "text-gray-500"
                            }`}
                          >
                            Puedes continuar creando la publicación sin ubicación.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setLocationError(null)}
                        className={`p-1 rounded ${
                          isDark
                            ? "text-dark-text-secondary hover:text-dark-text"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===== FOOTER - 4 Botones ===== */}
          <div
            className={`sticky bottom-0 flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-t gap-3 bg-inherit ${
              isDark ? "border-dark-border" : "border-gray-100"
            }`}
          >
            {/* Info */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 text-xs ${
                  isDark ? "text-dark-text-secondary" : "text-gray-500"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Visible para todos
              </div>
              {isShelter && (
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isDark ? "text-emerald-400" : "text-emerald-600"
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  Refugio
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Eliminar */}
              {currentDraftId && (
                <button
                  onClick={handleDeleteCurrentDraft}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isDark
                      ? "text-red-400 hover:bg-red-500/10 border border-red-500/20"
                      : "text-red-600 hover:bg-red-50 border border-red-200"
                  }`}
                  title="Eliminar borrador"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              )}

              {/* Cancelar */}
              <button
                onClick={handleCancel}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isDark
                    ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Cancelar</span>
              </button>

              {/* Guardar */}
              <button
                onClick={handleSaveDraft}
                disabled={!hasContent}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  hasContent
                    ? isDark
                      ? "text-amber-400 hover:bg-amber-500/10 border border-amber-500/20"
                      : "text-amber-700 hover:bg-amber-50 border border-amber-200"
                    : isDark
                    ? "text-dark-text-secondary cursor-not-allowed"
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                <Save className="w-4 h-4" />
                {saveFeedback ? "¡Guardado!" : (
                  <>
                    <span className="hidden sm:inline">Guardar</span>
                    <span className="sm:hidden">Guardar</span>
                  </>
                )}
              </button>

              {/* Publicar */}
              <button
                onClick={handlePublish}
                disabled={!canPublish || publishingStatus === "loading"}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg ${
                  canPublish && publishingStatus !== "loading"
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 active:scale-95"
                    : "bg-gray-300 cursor-not-allowed dark:bg-dark-border"
                }`}
              >
                {publishingStatus === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {editingPost ? "Guardando..." : "Publicando..."}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {editingPost ? "Guardar cambios" : "Publicar"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de borradores */}
      <DraftsListModal
        isOpen={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
        onSelectDraft={handleSelectDraftSilent}
        onDeleteDraft={handleDeleteDraft}
        drafts={drafts}
        isDark={isDark}
      />

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
      />

      {/* Modal de publicación con barra de carga */}
      {publishingStatus && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-sm p-8 text-center rounded-2xl shadow-2xl animate-modal-content ${
              isDark ? "bg-dark-card border border-dark-border" : "bg-white"
            }`}
          >
            {publishingStatus === "loading" ? (
              <>
                <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
                <h3 className={`text-lg font-bold font-display mb-1.5 ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                  Publicando tu publicación...
                </h3>
                <p className={`text-sm mb-5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  Esto puede tomar unos segundos
                </p>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-dark-border" : "bg-gray-100"}`}>
                  <div className="h-full w-3/4 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full animate-pulse" />
                </div>
              </>
            ) : publishingStatus === "success" ? (
              <>
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className={`text-lg font-bold font-display mb-1.5 ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                  ¡Publicación creada!
                </h3>
                <p className={`text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  Gracias por compartir con la comunidad
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className={`text-lg font-bold font-display mb-1.5 ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                  No se pudo publicar
                </h3>
                <p className={`text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  Inténtalo de nuevo en unos momentos
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
