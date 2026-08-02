import React, { useState, useEffect, useRef, useCallback } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  MessageSquare,
  Search,
  Plus,
  ThumbsUp,
  MessageCircle,
  Share2,
  Clock,
  Filter,
  ChevronDown,
  Heart,
  Bookmark,
  Send,
  X,
  Image as ImageIcon,
  Hash,
  Edit3,
  Trash2,
  Archive,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Save,
  FileText,
  Bell,
  TrendingUp,
  Users,
  Shield,
  Star,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Reply,
  Calendar,
  MapPin,
  ExternalLink,
  LayoutGrid,
  List,
  ArrowLeft,
  Sparkles,
  Camera,
  HelpCircle,
  Clock3,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CATEGORIES = [
  { id: "adopciones", label: "Adopciones", icon: "🐾", color: "from-rose-500 to-pink-500", bg: "bg-rose-100 dark:bg-rose-500/15", text: "text-rose-700 dark:text-rose-300" },
  { id: "eventos", label: "Eventos", icon: "📅", color: "from-blue-500 to-cyan-500", bg: "bg-blue-100 dark:bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
  { id: "campanas", label: "Campañas", icon: "📢", color: "from-amber-500 to-orange-500", bg: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
  { id: "donaciones", label: "Donaciones", icon: "🎁", color: "from-rose-500 to-pink-500", bg: "bg-rose-100 dark:bg-rose-500/15", text: "text-rose-700 dark:text-rose-300" },
  { id: "rescates", label: "Rescates", icon: "🆘", color: "from-red-500 to-rose-500", bg: "bg-red-100 dark:bg-red-500/15", text: "text-red-700 dark:text-red-300" },
  { id: "historias", label: "Historias de éxito", icon: "🌟", color: "from-violet-500 to-purple-500", bg: "bg-violet-100 dark:bg-violet-500/15", text: "text-violet-700 dark:text-violet-300" },
  { id: "voluntariado", label: "Voluntariado", icon: "🤝", color: "from-teal-500 to-emerald-500", bg: "bg-teal-100 dark:bg-teal-500/15", text: "text-teal-700 dark:text-teal-300" },
  { id: "general", label: "General", icon: "💬", color: "from-gray-500 to-slate-500", bg: "bg-gray-100 dark:bg-gray-500/15", text: "text-gray-700 dark:text-gray-300" },
];

const SORT_OPTIONS = [
  { id: "newest", label: "Más recientes", icon: Clock },
  { id: "popular", label: "Más populares", icon: TrendingUp },
  { id: "commented", label: "Más comentadas", icon: MessageCircle },
];

const POST_STATUS = { ALL: "all", PUBLISHED: "published", DRAFTS: "drafts", ARCHIVED: "archived" };

// ============================================================
// UTILIDADES DE BORRADORES
// ============================================================

const DRAFTS_KEY_PREFIX = "shelter_forum_drafts_";
const getDraftsKey = (u) => `${DRAFTS_KEY_PREFIX}${u || "anonymous"}`;
const loadDrafts = (u) => { try { const r = localStorage.getItem(getDraftsKey(u)); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveDrafts = (u, d) => localStorage.setItem(getDraftsKey(u), JSON.stringify(d));

// ============================================================
// DRAFTS LIST MODAL
// ============================================================

function DraftsListModal({ isOpen, onClose, onSelect, onDelete, drafts, isDark }) {
  const [search, setSearch] = useState("");
  if (!isOpen) return null;
  const filtered = drafts.filter(d => !search.trim() || (d.title||"").toLowerCase().includes(search.toLowerCase()) || (d.content||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const fmt = (s) => { try { const d = new Date(s), n = new Date(), m = Math.floor((n-d)/60000); if (m<1) return "Ahora"; if (m<60) return `Hace ${m} min`; const h = Math.floor(m/60); if (h<24) return `Hace ${h} h`; const da = Math.floor(h/24); if (da<7) return `Hace ${da} días`; return d.toLocaleDateString("es-CO",{day:"numeric",month:"short"}); } catch { return ""; } };
  const prev = (c) => !c ? "Sin contenido" : c.length > 100 ? c.substring(0,100)+"..." : c;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-modal-overlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${isDark ? "bg-dark-card border border-dark-border" : "bg-white"} animate-modal-content`}>
        <div className={`relative px-6 pt-6 pb-5 ${isDark ? "bg-gradient-to-b from-amber-500/10 to-transparent" : "bg-gradient-to-b from-amber-50 to-transparent"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-amber-400 to-orange-500">
                <Bookmark className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>Mis Borradores</h2>
                <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>{drafts.length} {drafts.length===1?"guardado":"guardados"}</p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-xl transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mt-4">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar borradores..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${isDark ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary" : "bg-white border border-gray-200 text-gray-700 placeholder-gray-400 shadow-sm"}`} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2.5 mt-2">
          {filtered.length === 0 ? (
            <div className={`text-center py-14 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                <FileText className="w-7 h-7 opacity-50" />
              </div>
              <p className="text-sm font-semibold">{search ? "Sin resultados" : "No hay borradores"}</p>
              <p className="text-xs mt-1 opacity-70">{search ? "Prueba con otros términos" : "Guarda un borrador desde el editor"}</p>
            </div>
          ) : filtered.map(d => (
            <div key={d.id} onClick={() => onSelect(d)}
              className={`group relative rounded-xl overflow-hidden transition-all cursor-pointer border ${isDark ? "bg-[#15151f] border-dark-border hover:border-amber-500/30" : "bg-gray-50/80 border border-gray-100 hover:border-amber-300 hover:bg-white hover:shadow-md"}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDark ? "bg-amber-500/30" : "bg-amber-400"}`}></div>
              <div className="pl-5 pr-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold truncate ${isDark ? "text-dark-text" : "text-gray-900"}`}>{d.title || <span className="italic opacity-60">Sin título</span>}</h3>
                    <p className={`text-xs mt-1 line-clamp-2 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>{prev(d.content)}</p>
                    <div className={`flex items-center gap-2.5 mt-2 text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmt(d.updatedAt)}</span>
                      {d.category && <><span className="w-1 h-1 rounded-full bg-current opacity-30"></span><span>{CATEGORIES.find(c=>c.id===d.category)?.label||d.category}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); onDelete(d.id); }}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`} title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onSelect(d); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${isDark ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}>
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SAMPLE_POSTS = [
  {
    id: 1,
    title: "🐾 ¡Gran Jornada de Adopción! 30 animales esperan un hogar",
    content: "Este sábado 20 de julio los esperamos en nuestra jornada de adopción en el Parque Central. Tendremos 30 perros y gatos de todas las edades buscando un hogar lleno de amor. Todos están desparasitados, vacunados y esterilizados. ¡No faltes! 🐶🐱",
    category: "adopciones",
    tags: ["AdopciónResponsable", "JornadaAdopción", "Bogotá"],
    images: [],
    status: "published",
    isPinned: true,
    likes: 89,
    comments: [
      { id: 101, author: "Ana López", content: "¡Allí estaré! Busco un compañero para mi hija.", time: "hace 4 horas", likes: 7 },
      { id: 102, author: "Carlos Ruiz", content: "¿Llevo mi propia transportadora?", time: "hace 3 horas", likes: 4 },
    ],
    shares: 23,
    time: "hace 2 horas",
    views: 345,
  },
  {
    id: 2,
    title: "🆘 Caso urgente: Max necesita cirugía de cadera",
    content: "Max es un pastor alemán de 5 años rescatado de una situación de maltrato. Necesita una cirugía de cadera urgente con un costo de $2,500,000. Hemos reunido el 40% pero necesitamos su ayuda. Cualquier donación nos acerca a salvar a Max. 🐾",
    category: "rescates",
    tags: ["RescateAnimal", "CasoUrgente", "Donación"],
    images: [],
    status: "published",
    isPinned: true,
    likes: 156,
    comments: [
      { id: 201, author: "María García", content: "Acabo de donar. ¡Fuerza Max! 🐶❤️", time: "hace 2 días", likes: 23 },
    ],
    shares: 67,
    time: "hace 1 día",
    views: 892,
  },
  {
    id: 3,
    title: "📢 Campaña de Vacunación Gratuita en la Comuna 13",
    content: "Este fin de semana estaremos realizando una jornada de vacunación gratuita para perros y gatos. Tendremos 500 dosis disponibles de vacuna múltiple y antirrábica. ¡No es necesario agendar! Lleguen con sus mascotas con correa o en transportadora.",
    category: "campanas",
    tags: ["Vacunación", "SaludAnimal", "Gratuito"],
    images: [],
    status: "published",
    isPinned: false,
    likes: 98,
    comments: [
      { id: 301, author: "Laura Sánchez", content: "¡Excelente iniciativa! Allí estaremos.", time: "hace 4 días", likes: 10 },
    ],
    shares: 45,
    time: "hace 3 días",
    views: 567,
  },
  {
    id: 4,
    title: "🌟 Historia de éxito: Luna encontró su hogar",
    content: "Hoy es un día especial. Luna, una gata de 4 años que llegó a nosotros desnutrida y asustada, finalmente encontró una familia que la ama. Después de 8 meses de cuidados, rehabilitación y mucho cariño, Luna se fue a su nuevo hogar. Gracias a todos los que hicieron esto posible. ❤️",
    category: "historias",
    tags: ["HistoriasDeÉxito", "GatosAdorables", "Adopción"],
    images: [],
    status: "published",
    isPinned: false,
    likes: 234,
    comments: [
      { id: 401, author: "Pedro Martínez", content: "Qué hermoso. Gracias por todo lo que hacen.", time: "hace 5 días", likes: 34 },
    ],
    shares: 89,
    time: "hace 5 días",
    views: 1203,
  },
  {
    id: 5,
    title: "🤝 Necesitamos voluntarios para el evento del sábado",
    content: "Estamos organizando la jornada de adopción de este sábado y necesitamos manos amigas. Buscamos voluntarios para: recibir a los asistentes, pasear a los perros, ayudar con la logística y tomar fotografías. Si puedes ayudarnos aunque sea medio día, escríbenos. ¡Toda ayuda cuenta!",
    category: "voluntariado",
    tags: ["Voluntariado", "JornadaAdopción", "AyudaAnimal"],
    images: [],
    status: "published",
    isPinned: false,
    likes: 67,
    comments: [],
    shares: 34,
    time: "hace 6 días",
    views: 456,
  },
  {
    id: 6,
    title: "Borrador: Post para revisión interna",
    content: "Este es un borrador que estamos preparando para la próxima publicación sobre nuestros rescates recientes. Pendiente de revisión por el equipo de comunicaciones.",
    category: "general",
    tags: ["Interno", "Borrador"],
    images: [],
    status: "draft",
    isPinned: false,
    likes: 0,
    comments: [],
    shares: 0,
    time: "hace 2 días",
    views: 12,
  },
  {
    id: 7,
    title: "Archivado: Campaña de diciembre 2025",
    content: "Resumen de la campaña navideña del año pasado. Mantenemos este registro para referencia futura.",
    category: "campanas",
    tags: ["Archivado", "CampañaNavideña"],
    images: [],
    status: "archived",
    isPinned: false,
    likes: 45,
    comments: [],
    shares: 12,
    time: "hace 3 meses",
    views: 89,
  },
];

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function SkeletonCard({ isDark }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? "bg-dark-card border border-dark-border" : "bg-white shadow-md shadow-gray-100/50"}`}>
      <div className="p-7">
        <div className="flex items-center gap-4 mb-5">
          <div className={`w-14 h-14 rounded-full ${isDark ? "bg-dark-border" : "bg-gray-200"} animate-pulse`}></div>
          <div className="flex-1">
            <div className={`h-4 w-48 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-lg animate-pulse mb-2`}></div>
            <div className={`h-3 w-32 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-lg animate-pulse`}></div>
          </div>
        </div>
        <div className={`h-6 w-3/4 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-lg animate-pulse mb-3`}></div>
        <div className={`h-4 w-full ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-lg animate-pulse mb-2`}></div>
        <div className={`h-4 w-2/3 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-lg animate-pulse mb-4`}></div>
        <div className="flex gap-2 mb-4">
          <div className={`h-6 w-16 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-lg animate-pulse`}></div>
          <div className={`h-6 w-20 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-lg animate-pulse`}></div>
          <div className={`h-6 w-14 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-lg animate-pulse`}></div>
        </div>
        <div className={`h-px w-full ${isDark ? "bg-dark-border" : "bg-gray-100"} mb-4`}></div>
        <div className="flex gap-4">
          <div className={`h-8 w-20 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-xl animate-pulse`}></div>
          <div className={`h-8 w-20 ${isDark ? "bg-dark-border" : "bg-gray-200"} rounded-xl animate-pulse`}></div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ isDark, onClearFilters, onCreatePost, icon: Icon, title, description, showActions = true }) {
  return (
    <div className={`text-center py-16 px-8 rounded-2xl ${isDark ? "bg-dark-card border border-dark-border" : "bg-white shadow-md"}`}>
      <div className={`w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center`}>
        {Icon ? <Icon className={`w-10 h-10 ${isDark ? "text-rose-400" : "text-rose-500"}`} /> : (
          <MessageSquare className={`w-10 h-10 ${isDark ? "text-rose-400" : "text-rose-500"}`} />
        )}
      </div>
      <h3 className={`text-xl font-bold mb-2 font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>
        {title || "No hay publicaciones"}
      </h3>
      <p className={`text-sm mb-6 max-w-md mx-auto ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
        {description || "Aún no has creado ninguna publicación. Comienza a compartir novedades con la comunidad."}
      </p>
      {showActions && (
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {onCreatePost && (
            <button onClick={onCreatePost} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-95">
              <Plus className="w-4 h-4" />
              Crear publicación
            </button>
          )}
          {onClearFilters && (
            <button onClick={onClearFilters} className={`px-6 py-3 rounded-xl font-semibold transition-all ${isDark ? "bg-white/5 text-dark-text-secondary hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, gradient, isDark }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover-lift group ${isDark ? "bg-dark-card border border-dark-border" : "bg-white shadow-md shadow-gray-100/50"}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`text-3xl font-bold font-display tracking-tight ${isDark ? "text-dark-text" : "text-gray-900"}`}>
            {value}
          </p>
          <p className={`text-sm mt-1 font-medium ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
            {label}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({ category, isDark }) {
  const cat = CATEGORIES.find(c => c.id === category);
  if (!cat) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cat.bg} ${cat.text}`}>
      <span>{cat.icon}</span>
      {cat.label}
    </span>
  );
}

function TagChip({ tag, isDark, onClick }) {
  return (
    <button onClick={onClick} className={`text-xs px-2.5 py-1 rounded-lg transition-all ${isDark ? "bg-white/5 text-dark-text-secondary hover:bg-rose-500/20 hover:text-rose-300" : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700"}`}>
      #{tag}
    </button>
  );
}

function PostStatusBadge({ status, isDark }) {
  const config = {
    published: { label: "Publicado", icon: CheckCircle2, bg: "bg-rose-100 dark:bg-rose-500/15", text: "text-rose-700 dark:text-rose-300" },
    draft: { label: "Borrador", icon: FileText, bg: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
    archived: { label: "Archivado", icon: Archive, bg: "bg-gray-100 dark:bg-gray-500/15", text: "text-gray-600 dark:text-gray-400" },
  };
  const s = config[status] || config.published;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

// ============================================================
// CREATE POST MODAL
// ============================================================

function CreatePostModal({ isOpen, onClose, onSave, editPost, isDark, user }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [confirm, setConfirm] = useState({ isOpen: false, title: "", message: "", confirmText: "Confirmar", type: "danger", onConfirm: () => {} });

  const uid = user?.id || user?.email || "anonymous";

  useEffect(() => { if (isOpen) { setDrafts(loadDrafts(uid)); setSaveFeedback(false); } }, [isOpen, uid]);
  const refreshDrafts = useCallback(() => setDrafts(loadDrafts(uid)), [uid]);

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title||""); setContent(editPost.content||""); setCategory(editPost.category||""); setTags(editPost.tags||[]); setImages(editPost.images||[]); setCurrentDraftId(null);
    } else if (!currentDraftId) {
      setTitle(""); setContent(""); setCategory(""); setTags([]); setImages([]);
    }
    setErrors({});
  }, [editPost, isOpen, uid, currentDraftId]);

  if (!isOpen) return null;

  const validate = () => { const e={}; if(!title.trim()) e.title="El título es obligatorio"; if(!content.trim()) e.content="El contenido es obligatorio"; if(!category) e.category="Selecciona una categoría"; setErrors(e); return Object.keys(e).length===0; };
  const hasContent = title.trim()||content.trim()||category||tags.length>0;
  const canPublish = title.trim()&&content.trim()&&category;
  const form = () => ({ title: title.trim(), content: content.trim(), category, tags, images });
  const reset = () => { setCurrentDraftId(null); setTitle(""); setContent(""); setCategory(""); setTags([]); setImages([]); setSaveFeedback(false); };

  const saveDraft = () => {
    const all = loadDrafts(uid), data = form(), now = new Date().toISOString();
    if (currentDraftId) saveDrafts(uid, all.map(d => d.id===currentDraftId ? {...d,...data,updatedAt:now} : d));
    else { const nd = {id:`draft_${Date.now()}`,...data,savedAt:now,updatedAt:now}; saveDrafts(uid, [nd,...all]); setCurrentDraftId(nd.id); }
    setDrafts(loadDrafts(uid)); setSaveFeedback(true);
    setTimeout(() => { setSaveFeedback(false); reset(); }, 1200);
  };

  const delDraft = (id) => setConfirm({ isOpen: true, title: "Eliminar borrador", message: "Se eliminará permanentemente. No podrás recuperarlo.", confirmText: "Eliminar", type: "danger", onConfirm: () => { const a=loadDrafts(uid); saveDrafts(uid,a.filter(d=>d.id!==id)); setDrafts(loadDrafts(uid)); setConfirm(p=>({...p,isOpen:false})); if(currentDraftId===id) reset(); } });
  const delCurrent = () => currentDraftId && setConfirm({ isOpen: true, title: "Eliminar borrador", message: "Se eliminará permanentemente. No podrás recuperarlo.", confirmText: "Eliminar", type: "danger", onConfirm: () => { const a=loadDrafts(uid); saveDrafts(uid,a.filter(d=>d.id!==currentDraftId)); setDrafts(loadDrafts(uid)); reset(); setConfirm(p=>({...p,isOpen:false})); } });
  const selectDraft = (d) => { setTitle(d.title||""); setContent(d.content||""); setCategory(d.category||""); setTags(d.tags||[]); setImages(d.images||[]); setCurrentDraftId(d.id); setShowDraftsModal(false); };

  const publish = () => {
    if (!validate()) return;
    if (currentDraftId) { const a=loadDrafts(uid); saveDrafts(uid, a.filter(d=>d.id!==currentDraftId)); }
    onSave({ title:title.trim(), content:content.trim(), category, tags, images, status:"published", isPinned:false });
    reset(); onClose();
  };

  const cancel = () => {
    if (hasContent) setConfirm({ isOpen: true, title: "Descartar cambios", message: "Los cambios no guardados se perderán. ¿Salir?", confirmText: "Salir sin guardar", type: "warning", onConfirm: () => { reset(); onClose(); setConfirm(p=>({...p,isOpen:false})); } });
    else { reset(); onClose(); }
  };

  const addTag = (t) => { const c = t.trim().replace(/^#/,""); if(c&&!tags.includes(c)&&tags.length<10) setTags([...tags,c]); setTagInput(""); };
  const removeTag = (t) => setTags(tags.filter(tag => tag !== t));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-overlay">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancel}></div>
        <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${isDark ? "bg-dark-card border border-dark-border" : "bg-white"} animate-modal-content`}>
          <div className={`sticky top-0 z-10 flex items-center justify-between p-5 border-b bg-inherit ${isDark ? "border-dark-border" : "border-gray-100"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isDark ? "bg-gradient-to-br from-rose-500/20 to-amber-500/20" : "bg-gradient-to-br from-rose-100 to-amber-100"}`}>
                <MessageSquare className={`w-5 h-5 ${isDark ? "text-rose-400" : "text-rose-600"}`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>{editPost ? "Editar publicación" : "Crear publicación"}</h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>Comparte novedades con la comunidad</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {drafts.length>0 && (
                <button onClick={()=>{refreshDrafts();setShowDraftsModal(true);}}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-sm ${isDark ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20" : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"}`}>
                  <Bookmark className="w-3.5 h-3.5" /> Borradores
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-200 text-amber-800"}`}>{drafts.length}</span>
                </button>
              )}
              <button onClick={cancel} className={`p-2 rounded-xl transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div><label className={`block text-sm font-medium mb-2 ${isDark?"text-dark-text":"text-gray-700"}`}>Título <span className="text-rose-500">*</span></label>
              <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Escribe un título descriptivo..."
                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${isDark?"bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary":"bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"}`} />
              {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
            </div>

            <div><label className={`block text-sm font-medium mb-2 ${isDark?"text-dark-text":"text-gray-700"}`}>Categoría <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={()=>setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${category===cat.id?`${cat.bg} ${cat.text} ring-2 ring-rose-500/50`:isDark?"bg-[#15151f] border border-dark-border text-dark-text-secondary hover:border-rose-500/30":"bg-gray-50 border border-gray-200 text-gray-600 hover:border-rose-300"}`}>
                    <span>{cat.icon}</span><span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
              {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category}</p>}
            </div>

            <div><label className={`block text-sm font-medium mb-2 ${isDark?"text-dark-text":"text-gray-700"}`}>Contenido <span className="text-rose-500">*</span></label>
              <textarea value={content} onChange={e=>setContent(e.target.value)} rows="6" placeholder="Comparte detalles sobre esta publicación..."
                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none ${isDark?"bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary":"bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"}`} />
              {errors.content && <p className="text-xs text-rose-500 mt-1">{errors.content}</p>}
            </div>

            <div><label className={`block text-sm font-medium mb-2 ${isDark?"text-dark-text":"text-gray-700"}`}>Etiquetas <span className={`text-xs ml-2 ${isDark?"text-dark-text-secondary":"text-gray-400"}`}>({tags.length}/10)</span></label>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${isDark?"bg-[#15151f] border border-dark-border":"bg-gray-50 border border-gray-200"}`}>
                <Hash className={`w-4 h-4 ${isDark?"text-dark-text-secondary":"text-gray-400"}`} />
                <input type="text" value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTag(tagInput);}}} placeholder="Escribe y presiona Enter"
                  className={`flex-1 bg-transparent text-sm focus:outline-none ${isDark?"text-dark-text placeholder-dark-text-secondary":"text-gray-700 placeholder-gray-400"}`} />
              </div>
              {tags.length>0 && <div className="flex flex-wrap gap-1.5 mt-2">{tags.map(tag=>(<span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm ${isDark?"bg-rose-500/15 text-rose-300":"bg-rose-50 text-rose-700"}`}>#{tag}<button onClick={()=>removeTag(tag)} className="hover:text-rose-400"><X className="w-3 h-3" /></button></span>))}</div>}
            </div>

            <div><label className={`block text-sm font-medium mb-2 ${isDark?"text-dark-text":"text-gray-700"}`}>Imágenes <span className={`text-xs ml-2 ${isDark?"text-dark-text-secondary":"text-gray-400"}`}>(máx. 5)</span></label>
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDark?"border-dark-border hover:border-rose-500/30":"border-gray-200 hover:border-rose-300 bg-gray-50/50"}`}>
                <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${isDark?"text-dark-text-secondary":"text-gray-400"}`} />
                <p className={`text-sm font-medium ${isDark?"text-dark-text":"text-gray-700"}`}>Arrastra tus imágenes aquí</p>
                <p className={`text-xs mt-1 ${isDark?"text-dark-text-secondary":"text-gray-500"}`}>o haz clic para seleccionar</p>
              </div>
              {images.length>0 && <div className="flex gap-2 mt-2">{images.map((img,idx)=>(<div key={idx} className="relative"><img src={img} alt="" className="w-16 h-16 rounded-lg object-cover" /><button onClick={()=>setImages(images.filter((_,i)=>i!==idx))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600"><X className="w-3 h-3" /></button></div>))}</div>}
            </div>
          </div>

          <div className={`sticky bottom-0 flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-t gap-3 bg-inherit ${isDark?"border-dark-border":"border-gray-100"}`}>
            <div className={`flex items-center gap-1.5 text-xs ${isDark?"text-dark-text-secondary":"text-gray-500"}`}><Eye className="w-3.5 h-3.5" /> Visible para todos</div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {currentDraftId && <button onClick={delCurrent} className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isDark?"text-red-400 hover:bg-red-500/10 border border-red-500/20":"text-red-600 hover:bg-red-50 border border-red-200"}`}><Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Eliminar</span></button>}
              <button onClick={cancel} className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isDark?"text-dark-text-secondary hover:text-dark-text hover:bg-white/5":"text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}><X className="w-4 h-4" /><span className="hidden sm:inline">Cancelar</span></button>
              <button onClick={saveDraft} disabled={!hasContent} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${hasContent?isDark?"text-amber-400 hover:bg-amber-500/10 border border-amber-500/20":"text-amber-700 hover:bg-amber-50 border border-amber-200":isDark?"text-dark-text-secondary cursor-not-allowed":"text-gray-400 cursor-not-allowed"}`}><Save className="w-4 h-4" />{saveFeedback?"¡Guardado!":<span className="hidden sm:inline">Guardar</span>}</button>
              <button onClick={publish} disabled={!canPublish} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg ${canPublish?"bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 active:scale-95":"bg-gray-300 cursor-not-allowed dark:bg-dark-border"}`}><Send className="w-4 h-4" />{editPost?"Actualizar":"Publicar"}</button>
            </div>
          </div>
        </div>
      </div>

      <DraftsListModal isOpen={showDraftsModal} onClose={()=>setShowDraftsModal(false)} onSelect={selectDraft} onDelete={delDraft} drafts={drafts} isDark={isDark} />
      <ConfirmModal isOpen={confirm.isOpen} onClose={()=>setConfirm(p=>({...p,isOpen:false}))} onConfirm={confirm.onConfirm} title={confirm.title} message={confirm.message} confirmText={confirm.confirmText} type={confirm.type} />
    </>
  );
}

// ============================================================
// POST DETAIL MODAL
// ============================================================

function PostDetailModal({ post, isOpen, onClose, isDark, user, onDelete, onArchive, onPin, onEdit }) {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(post?.comments || []);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false });

  useEffect(() => {
    if (post) setComments(post.comments || []);
  }, [post]);

  if (!isOpen || !post) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now(),
      author: user?.name || "Refugio",
      content: newComment.trim(),
      time: "justo ahora",
      likes: 0,
      isShelter: true,
      replies: [],
    };
    setComments([...comments, comment]);
    setNewComment("");
  };

  const handleAddReply = (parentId) => {
    if (!replyText.trim()) return;
    const reply = {
      id: Date.now() + 1,
      author: user?.name || "Refugio",
      content: replyText.trim(),
      time: "justo ahora",
      likes: 0,
      isShelter: true,
    };
    const updateComments = (cmts) => cmts.map(c => {
      if (c.id === parentId) return { ...c, replies: [...(c.replies || []), reply] };
      if (c.replies) return { ...c, replies: updateComments(c.replies) };
      return c;
    });
    setComments(updateComments(comments));
    setReplyText("");
    setReplyTo(null);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-overlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${isDark ? "bg-dark-card border border-dark-border" : "bg-white"} animate-modal-content`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-dark-border" : "border-gray-100"}`}>
          <button onClick={onClose} className={`flex items-center gap-2 text-sm font-medium transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-600 hover:text-gray-900"}`}>
            <ArrowLeft className="w-4 h-4" />
            Volver al foro
          </button>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button onClick={() => { onEdit(post); onClose(); }} className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5" : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"}`} title="Editar">
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onPin && (
              <button onClick={() => { onPin(post.id); }} className={`p-2 rounded-lg transition-all ${post.isPinned ? "text-rose-500" : isDark ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5" : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"}`} title={post.isPinned ? "Desfijar" : "Fijar"}>
                {post.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            )}
            {onArchive && post.status !== "archived" && (
              <button onClick={() => { onArchive(post.id); onClose(); }} className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-gray-400 hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`} title="Archivar">
                <Archive className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={() => setConfirmDelete({ isOpen: true })} className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Author & Meta */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {getInitials(user?.name || "Refugio")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                  {user?.name || "Mi Refugio"}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300`}>
                  <Shield className="w-3 h-3" />
                  Refugio
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs flex items-center gap-1 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  <Clock className="w-3 h-3" />
                  {post.time}
                </span>
                <span className={`w-1 h-1 rounded-full ${isDark ? "bg-dark-border" : "bg-gray-300"}`}></span>
                <CategoryBadge category={post.category} isDark={isDark} />
                {post.status !== "published" && <PostStatusBadge status={post.status} isDark={isDark} />}
              </div>
            </div>
          </div>

          {/* Title & Content */}
          <h2 className={`text-2xl font-bold mb-3 font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>
            {post.title}
          </h2>
          <p className={`text-sm leading-relaxed mb-4 whitespace-pre-line ${isDark ? "text-dark-text-secondary" : "text-gray-600"}`}>
            {post.content}
          </p>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className={`mb-4 rounded-xl overflow-hidden ${post.images.length === 1 ? "" : "grid grid-cols-2 gap-2"}`}>
              {post.images.map((img, idx) => (
                <img key={idx} src={img} alt="" className="w-full h-56 object-cover rounded-lg" />
              ))}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map(tag => <TagChip key={tag} tag={tag} isDark={isDark} />)}
            </div>
          )}

          {/* Stats Bar */}
          <div className={`flex items-center gap-4 mb-4 p-3 rounded-xl ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
            <div className={`flex items-center gap-1.5 text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              <Eye className="w-4 h-4" />
              <span>{post.views || 0} vistas</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              <ThumbsUp className="w-4 h-4" />
              <span>{post.likes || 0} likes</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length} comentarios</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              <Share2 className="w-4 h-4" />
              <span>{post.shares || 0} compartidos</span>
            </div>
          </div>

          {/* Divider */}
          <div className={`border-t mb-4 ${isDark ? "border-dark-border" : "border-gray-100"}`}></div>

          {/* Comments */}
          <div className="mb-4">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-dark-text" : "text-gray-900"}`}>
              Comentarios ({comments.length})
            </h3>

            {comments.length === 0 && (
              <div className={`text-center py-8 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay comentarios aún. Sé el primero en comentar.</p>
              </div>
            )}

            <div className="space-y-1">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} isDark={isDark}
                  replyTo={replyTo} setReplyTo={setReplyTo}
                  replyText={replyText} setReplyText={setReplyText}
                  onSendReply={handleAddReply} />
              ))}
            </div>
          </div>
        </div>

        {/* Comment Input */}
        <div className={`p-4 border-t ${isDark ? "border-dark-border" : "border-gray-100"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {getInitials(user?.name || "R")}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddComment(); }}
                placeholder="Escribe un comentario..."
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${isDark ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary" : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"}`} />
              <button onClick={handleAddComment}
                className={`p-2.5 rounded-xl transition-all ${newComment.trim() ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg hover:from-rose-600 hover:to-amber-600" : isDark ? "bg-dark-border text-dark-text-secondary" : "bg-gray-100 text-gray-400"}`}
                disabled={!newComment.trim()}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false })}
        onConfirm={() => { onDelete(post.id); onClose(); }}
        title="¿Eliminar publicación?"
        message="Esta acción no se puede deshacer. La publicación será eliminada permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

function CommentItem({ comment, isDark, replyTo, setReplyTo, replyText, setReplyText, onSendReply, depth = 0 }) {
  const [liked, setLiked] = useState(false);

  return (
    <div className={depth > 0 ? "ml-8 pl-4 border-l-2 border-gray-100 dark:border-dark-border" : ""}>
      <div className="flex gap-3 py-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${comment.isShelter ? "from-rose-500 to-amber-500" : "from-rose-400 to-pink-500"} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
          {comment.author?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>
              {comment.author}
            </span>
            {comment.isShelter && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300`}>
                <Shield className="w-3 h-3" />
                Refugio
              </span>
            )}
            <span className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
              {comment.time}
            </span>
          </div>
          <p className={`text-sm leading-relaxed mb-2 ${isDark ? "text-dark-text-secondary" : "text-gray-600"}`}>
            {comment.content}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1 text-xs font-medium transition-all ${liked ? "text-rose-500" : isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-500 hover:text-gray-700"}`}>
              <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-500" : ""}`} />
              {comment.likes || 0}
            </button>
            <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className={`flex items-center gap-1 text-xs font-medium transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-500 hover:text-gray-700"}`}>
              <Reply className="w-3.5 h-3.5" />
              Responder
            </button>
          </div>

          {replyTo === comment.id && (
            <div className="flex items-center gap-2 mt-2">
              <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") onSendReply(comment.id); }}
                placeholder="Escribe una respuesta..."
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${isDark ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary" : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"}`} />
              <button onClick={() => onSendReply(comment.id)} className={`p-1.5 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5" : "text-gray-500 hover:text-rose-500 hover:bg-rose-50"}`}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          {comment.replies?.map(reply => (
            <CommentItem key={reply.id} comment={reply} isDark={isDark}
              replyTo={replyTo} setReplyTo={setReplyTo}
              replyText={replyText} setReplyText={setReplyText}
              onSendReply={onSendReply} depth={depth + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// POST CARD
// ============================================================

function PostCard({ post, isDark, onPostClick, onLike, onSave, onEdit, onDelete, onArchive, onPin, index, user: propUser }) {
  const [showOptions, setShowOptions] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false });

  const displayUser = propUser || { name: "Mi Refugio" };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike?.(post.id);
  };

  const handleSave = () => {
    setSaved(!saved);
    onSave?.(post.id);
  };

  return (
    <article
      className={`rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in-up ${isDark ? "bg-dark-card border border-dark-border hover:border-rose-500/20" : "bg-white shadow-md shadow-gray-100/50 hover:shadow-xl"} hover-lift`}
      style={{ animationDelay: `${(index % 10) * 0.05}s` }}
    >
      {/* Pinned indicator */}
      {post.isPinned && (
        <div className={`flex items-center gap-2 px-7 py-3 text-sm font-medium ${isDark ? "bg-rose-500/10 text-rose-300" : "bg-rose-50 text-rose-700"}`}>
          <Pin className="w-4 h-4" />
          Publicación destacada
        </div>
      )}

      <div className="p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-rose-500/20">
              {displayUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "RF"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                  {displayUser.name}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300`}>
                  <Shield className="w-3 h-3" />
                  Refugio
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs flex items-center gap-1 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  <Clock className="w-3 h-3" />
                  {post.time}
                </span>
                {post.status !== "published" && <PostStatusBadge status={post.status} isDark={isDark} />}
              </div>
            </div>
          </div>

          {/* Options menu */}
          <div className="relative">
            <button onClick={() => setShowOptions(!showOptions)} className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showOptions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)}></div>
                <div className={`absolute right-0 top-full mt-1 w-48 py-2 rounded-2xl shadow-xl z-20 ${isDark ? "bg-dark-card border border-dark-border" : "bg-white border border-gray-100"}`}>
                  <button onClick={() => { onEdit(post); setShowOptions(false); }} className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                  <button onClick={() => { onPin(post.id); setShowOptions(false); }} className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
                    {post.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    {post.isPinned ? "Desfijar" : "Fijar publicación"}
                  </button>
                  {post.status !== "archived" && (
                    <button onClick={() => { onArchive(post.id); setShowOptions(false); }} className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
                      <Archive className="w-4 h-4" /> Archivar
                    </button>
                  )}
                  <div className={`border-t ${isDark ? "border-dark-border" : "border-gray-100"}`}></div>
                  <button onClick={() => { setConfirmDelete({ isOpen: true }); setShowOptions(false); }} className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${isDark ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}>
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Category & Tags */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <CategoryBadge category={post.category} isDark={isDark} />
          {post.tags?.slice(0, 3).map(tag => <TagChip key={tag} tag={tag} isDark={isDark} />)}
          {post.tags?.length > 3 && (
            <span className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>+{post.tags.length - 3}</span>
          )}
        </div>

        {/* Content */}
        <button onClick={() => onPostClick(post)} className="w-full text-left">
          <h3 className={`text-lg font-bold mb-2 font-display hover:text-rose-500 transition-colors leading-tight ${isDark ? "text-dark-text" : "text-gray-900"}`}>
            {post.title}
          </h3>
          <p className={`text-sm leading-relaxed line-clamp-3 ${isDark ? "text-dark-text-secondary" : "text-gray-600"}`}>
            {post.content}
          </p>
        </button>

        {/* Images preview */}
        {post.images && post.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {post.images.slice(0, 2).map((img, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden">
                <img src={img} alt="" className="w-full h-28 object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          onClose={() => setConfirmDelete({ isOpen: false })}
          onConfirm={() => { onDelete(post.id); }}
          title="¿Eliminar publicación?"
          message="Esta acción no se puede deshacer. La publicación será eliminada permanentemente."
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
        />

        {/* Divider */}
        <div className={`border-t my-4 ${isDark ? "border-dark-border" : "border-gray-100"}`}></div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${liked ? "text-rose-500 bg-rose-100 dark:bg-rose-500/15" : isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              {likeCount}
            </button>
            <button onClick={() => onPostClick(post)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>
              <MessageCircle className="w-4 h-4" />
              {post.comments?.length || 0}
            </button>
            <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>
              <Share2 className="w-4 h-4" />
              {post.shares || 0}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleSave} className={`p-2 rounded-xl transition-all ${saved ? "text-rose-500" : isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
              <Bookmark className={`w-4 h-4 ${saved ? "fill-rose-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Comments preview */}
        {post.comments && post.comments.length > 0 && (
          <div className={`mt-4 pt-4 border-t ${isDark ? "border-dark-border" : "border-gray-100"}`}>
            {post.comments.slice(0, 2).map(c => (
              <div key={c.id} className="flex gap-2 mb-2">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${c.isShelter ? "from-rose-500 to-amber-500" : "from-rose-400 to-pink-500"} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {c.author?.charAt(0) || "?"}
                </div>
                <div className={`flex-1 rounded-lg px-3 py-2 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-xs font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>{c.author}</span>
                    {c.isShelter && <Shield className="w-3 h-3 text-rose-500" />}
                  </div>
                  <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-600"} line-clamp-1`}>{c.content}</p>
                </div>
              </div>
            ))}
            {post.comments.length > 2 && (
              <button onClick={() => onPostClick(post)} className={`text-xs font-semibold transition-all ${isDark ? "text-rose-400 hover:text-rose-300" : "text-rose-600 hover:text-rose-700"}`}>
                Ver los {post.comments.length} comentarios
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================
// RIGHT PANEL
// ============================================================

function ForumRightPanel({ isDark, onCreatePost }) {
  const cardClass = `rounded-2xl p-5 ${isDark ? "bg-dark-card border border-dark-border" : "bg-white shadow-md shadow-gray-100/50"}`;
  const sectionTitleClass = `text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`;

  const tips = [
    { icon: Camera, title: "Añade imágenes", desc: "Las publicaciones con imágenes reciben 3x más interacción." },
    { icon: Hash, title: "Usa etiquetas", desc: "Ayuda a otros a encontrar tus publicaciones por tema." },
    { icon: Clock3, title: "Publica seguido", desc: "Mantén a la comunidad informada con actualizaciones regulares." },
    { icon: MessageCircle, title: "Responde comentarios", desc: "La interacción genera confianza y cercanía." },
  ];

  return (
    <aside className="space-y-5">
      {/* Tips */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-500"}`} />
          <h3 className={sectionTitleClass}>Consejos para mejores publicaciones</h3>
        </div>
        <div className="space-y-3">
          {tips.map((tip, idx) => {
            const Icon = tip.icon;
            return (
              <div key={idx} className="flex gap-3">
                <div className={`w-9 h-9 rounded-lg ${isDark ? "bg-rose-500/10" : "bg-rose-50"} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${isDark ? "text-rose-400" : "text-rose-500"}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>{tip.title}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>{tip.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className={`w-4 h-4 ${isDark ? "text-rose-400" : "text-rose-500"}`} />
          <h3 className={sectionTitleClass}>Actividad reciente</h3>
        </div>
        <div className="space-y-3">
          {[
            { action: "Publicaste", detail: "Jornada de Adopción", time: "hace 2 horas", icon: MessageSquare, color: "text-rose-500" },
            { action: "Recibiste", detail: "15 likes en tu publicación", time: "hace 1 día", icon: ThumbsUp, color: "text-rose-500" },
            { action: "Comentaste", detail: "en una publicación", time: "hace 2 días", icon: MessageCircle, color: "text-blue-500" },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`flex gap-3 p-3 rounded-xl ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-all cursor-pointer`}>
                <div className={`w-8 h-8 rounded-lg ${isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                    <span className="font-semibold">{item.action}</span>{' '}
                    <span className={isDark ? "text-dark-text-secondary" : "text-gray-500"}>{item.detail}</span>
                  </p>
                  <span className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>{item.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forum Stats Mini */}
      <div className={`${cardClass} bg-gradient-to-br from-rose-500/5 to-amber-500/5 dark:from-rose-500/10 dark:to-amber-500/10`}>
        <h3 className={sectionTitleClass}>Impacto del foro</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Publicaciones", value: "156", icon: MessageSquare },
            { label: "Interacciones", value: "2.3K", icon: TrendingUp },
            { label: "Alcance", value: "8.5K", icon: Eye },
            { label: "Seguidores", value: "456", icon: Users },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="text-center p-2">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${isDark ? "text-rose-400" : "text-rose-500"}`} />
                <p className={`text-lg font-bold font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>{stat.value}</p>
                <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// NOTIFICATIONS PANEL
// ============================================================

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ShelterForum() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  // Data
  const [posts, setPosts] = useState(SAMPLE_POSTS);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [viewMode, setViewMode] = useState("feed");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);


  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Stats
  const stats = {
    total: posts.filter(p => p.status === "published").length,
    drafts: posts.filter(p => p.status === "draft").length,
    totalComments: posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0),
    totalLikes: posts.reduce((acc, p) => acc + (p.likes || 0), 0),
  };

  // Filter & Sort posts
  const filteredPosts = posts
    .filter(post => {
      // Status filter
      if (statusFilter === "drafts") return post.status === "draft";
      if (statusFilter === "archived") return post.status === "archived";
      if (statusFilter === "published" || statusFilter === "all") {
        if (post.status === "archived") return false;
      }
      // Show only mine
      if (showOnlyMine && post.author !== user?.name) return false;
      // Show pinned only
      if (showPinnedOnly && !post.isPinned) return false;
      // Category
      if (selectedCategory !== "all" && post.category !== selectedCategory) return false;
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          post.title.toLowerCase().includes(term) ||
          post.content.toLowerCase().includes(term) ||
          post.tags?.some(t => t.toLowerCase().includes(term)) ||
          CATEGORIES.find(c => c.id === post.category)?.label.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Sort
      switch (sortBy) {
        case "popular": return (b.likes || 0) - (a.likes || 0);
        case "commented": return (b.comments?.length || 0) - (a.comments?.length || 0);
        default: return 0;
      }
    });

  // Handlers
  const handleCreatePost = (data) => {
    const newPost = {
      id: Date.now(),
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      images: data.images || [],
      status: data.status || "published",
      isPinned: data.isPinned || false,
      likes: 0,
      comments: [],
      shares: 0,
      time: "justo ahora",
      views: 0,
      author: user?.name || "Mi Refugio",
    };
    setPosts([newPost, ...posts]);
  };

  const handleEditPost = (postData) => {
    setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...postData } : p));
    setEditingPost(null);
  };

  const handleDeletePost = (id) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  const handleArchivePost = (id) => {
    setPosts(posts.map(p => p.id === id ? { ...p, status: "archived" } : p));
  };

  const handlePinPost = (id) => {
    setPosts(posts.map(p => p.id === id ? { ...p, isPinned: !p.isPinned } : p));
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setShowDetailModal(true);
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setShowCreateModal(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setStatusFilter("all");
    setShowOnlyMine(false);
    setShowPinnedOnly(false);
    setSortBy("newest");
  };

  const activeFiltersCount = [
    selectedCategory !== "all",
    showOnlyMine,
    showPinnedOnly,
    statusFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className={`min-h-screen pt-20 pb-12 transition-colors duration-300 ${isDark ? "bg-dark-bg" : "bg-gradient-to-br from-rose-50 via-white to-amber-50"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ===== HEADER SECTION ===== */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              {/* Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-3 ${isDark ? "bg-rose-500/10 text-rose-300" : "bg-rose-100 text-rose-700"}`}>
                <Shield className="w-4 h-4" />
                <span>Foro del Refugio</span>
              </div>
              <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                Novedades del Refugio
              </h1>
              <p className={`text-base sm:text-lg mt-2 max-w-2xl ${isDark ? "text-dark-text-secondary" : "text-gray-600"}`}>
                Comparte rescates, campañas, eventos e historias de éxito. Mantén a la comunidad informada sobre el impacto de tu labor.
              </p>
              {/* Quick Stats */}
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <span className={`flex items-center gap-1.5 text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  <CheckCircle2 className="w-4 h-4 text-rose-500" />
                  <span className="font-semibold">{stats.total}</span> publicadas
                </span>
                <span className={`flex items-center gap-1.5 text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">{stats.drafts}</span> borradores
                </span>
                <span className={`flex items-center gap-1.5 text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span className="font-semibold">{stats.totalLikes}</span> reacciones
                </span>
                <span className={`flex items-center gap-1.5 text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold">{stats.totalComments}</span> comentarios
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setEditingPost(null); setShowCreateModal(true); }}
                className="relative inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-95 group"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Crear publicación</span>
                <span className="sm:hidden">Crear</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===== STATS BAR ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={MessageSquare} label="Publicaciones" value={stats.total} gradient="from-rose-500 to-pink-500" isDark={isDark} />
          <StatCard icon={FileText} label="Borradores" value={stats.drafts} gradient="from-amber-500 to-orange-500" isDark={isDark} />
          <StatCard icon={Heart} label="Reacciones" value={stats.totalLikes} gradient="from-rose-500 to-pink-500" isDark={isDark} />
          <StatCard icon={Users} label="Alcance estimado" value="12.3K" gradient="from-violet-500 to-purple-500" isDark={isDark} />
        </div>

        {/* ===== SEARCH & FILTERS ===== */}
        <div className="mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`} />
            <input
              type="text"
              placeholder="Buscar publicaciones por palabra clave, título, categoría o contenido..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-40 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all ${isDark ? "bg-dark-card border border-dark-border text-dark-text placeholder-dark-text-secondary" : "bg-white border border-gray-200 text-gray-700 placeholder-gray-400 shadow-sm"}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchTerm && (
                <>
                  <span className={`text-xs hidden sm:inline ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
                    {filteredPosts.length} resultados
                  </span>
                  <button onClick={() => setSearchTerm("")} className={`p-1.5 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${showFilters ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md" : isDark ? "bg-white/5 text-dark-text-secondary hover:text-dark-text hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200"}`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className={`mt-3 p-5 rounded-2xl transition-all ${isDark ? "bg-dark-card border border-dark-border" : "bg-white shadow-lg border border-gray-100"}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                    Categoría
                  </label>
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${isDark ? "bg-[#15151f] border border-dark-border text-dark-text" : "bg-gray-50 border border-gray-200 text-gray-700"}`}>
                    <option value="all">Todas las categorías</option>
                    {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>)}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                    Ordenar por
                  </label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${isDark ? "bg-[#15151f] border border-dark-border text-dark-text" : "bg-gray-50 border border-gray-200 text-gray-700"}`}>
                    {SORT_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                    Estado
                  </label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${isDark ? "bg-[#15151f] border border-dark-border text-dark-text" : "bg-gray-50 border border-gray-200 text-gray-700"}`}>
                    <option value="all">Todas</option>
                    <option value="published">Publicadas</option>
                    <option value="drafts">Borradores</option>
                    <option value="archived">Archivadas</option>
                  </select>
                </div>

                {/* Toggles */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                    Opciones
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all ${showOnlyMine ? (isDark ? "bg-rose-500/10 text-rose-300" : "bg-rose-50 text-rose-700") : isDark ? "text-dark-text-secondary hover:bg-white/5" : "text-gray-600 hover:bg-gray-50"}`}>
                      <input type="checkbox" checked={showOnlyMine} onChange={e => setShowOnlyMine(e.target.checked)} className="rounded accent-rose-500" />
                      Solo mis publicaciones
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all ${showPinnedOnly ? (isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700") : isDark ? "text-dark-text-secondary hover:bg-white/5" : "text-gray-600 hover:bg-gray-50"}`}>
                      <input type="checkbox" checked={showPinnedOnly} onChange={e => setShowPinnedOnly(e.target.checked)} className="rounded accent-amber-500" />
                      Solo fijadas
                    </label>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-dark-border">
                <div className="flex flex-wrap gap-2">
                  {selectedCategory !== "all" && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-700"}`}>
                      {CATEGORIES.find(c => c.id === selectedCategory)?.icon} {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                      <button onClick={() => setSelectedCategory("all")}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {showOnlyMine && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                      Solo mis publicaciones
                      <button onClick={() => setShowOnlyMine(false)}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {showPinnedOnly && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                      Fijadas
                      <button onClick={() => setShowPinnedOnly(false)}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {statusFilter !== "all" && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? "bg-gray-500/15 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                      {statusFilter === "drafts" ? "Borradores" : statusFilter === "archived" ? "Archivadas" : "Publicadas"}
                      <button onClick={() => setStatusFilter("all")}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {activeFiltersCount === 0 && (
                    <span className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>Sin filtros activos</span>
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className={`text-xs font-medium transition-all ${isDark ? "text-rose-400 hover:text-rose-300" : "text-rose-600 hover:text-rose-700"}`}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === "all" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md" : isDark ? "bg-white/5 text-dark-text-secondary hover:bg-white/10" : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"}`}
            >
              <Sparkles className="w-3 h-3" />
              Todas
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat.id ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md" : isDark ? "bg-white/5 text-dark-text-secondary hover:bg-white/10" : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"}`}>
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== TWO COLUMN LAYOUT ===== */}
        <div className="flex gap-6">
          {/* ===== MAIN FEED ===== */}
          <div className="flex-1 min-w-0">
            {/* Feed Controls */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  {filteredPosts.length} {filteredPosts.length === 1 ? "publicación" : "publicaciones"}
                </span>
                {(statusFilter !== "all" || searchTerm || selectedCategory !== "all") && (
                  <button onClick={clearFilters} className={`text-xs font-medium transition-all ${isDark ? "text-rose-400 hover:text-rose-300" : "text-rose-600 hover:text-rose-700"}`}>
                    <RefreshCw className="w-3 h-3 inline mr-1" />
                    Restablecer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setViewMode("feed")} className={`p-2 rounded-lg transition-all ${viewMode === "feed" ? (isDark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-600") : isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-400 hover:text-gray-600"}`}>
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? (isDark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-600") : isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-400 hover:text-gray-600"}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <SkeletonCard key={i} isDark={isDark} />)}
              </div>
            ) : filteredPosts.length === 0 ? (
              /* Empty State */
              searchTerm || selectedCategory !== "all" || statusFilter !== "all" || showOnlyMine || showPinnedOnly ? (
                <EmptyState
                  isDark={isDark}
                  icon={Search}
                  title="Sin resultados"
                  description="No encontramos publicaciones con los filtros aplicados. Intenta con otros términos o limpia los filtros."
                  onClearFilters={clearFilters}
                  showActions={true}
                />
              ) : (
                <EmptyState
                  isDark={isDark}
                  icon={MessageSquare}
                  title="No hay publicaciones aún"
                  description="Comienza a compartir las novedades de tu refugio. Publica rescates, campañas, eventos e historias de éxito para mantener informada a la comunidad."
                  onCreatePost={() => { setEditingPost(null); setShowCreateModal(true); }}
                  showActions={true}
                />
              )
            ) : (
              /* Posts */
              viewMode === "feed" ? (
                <div className="space-y-4">
                  {filteredPosts.map((post, idx) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      index={idx}
                      isDark={isDark}
                      user={user}
                      onPostClick={handlePostClick}
                      onLike={() => {}}
                      onSave={() => {}}
                      onEdit={handleEdit}
                      onDelete={handleDeletePost}
                      onArchive={handleArchivePost}
                      onPin={handlePinPost}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredPosts.map((post, idx) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      index={idx}
                      isDark={isDark}
                      user={user}
                      onPostClick={handlePostClick}
                      onLike={() => {}}
                      onSave={() => {}}
                      onEdit={handleEdit}
                      onDelete={handleDeletePost}
                      onArchive={handleArchivePost}
                      onPin={handlePinPost}
                    />
                  ))}
                </div>
              )
            )}

            {/* Load More */}
            {!loading && filteredPosts.length > 0 && filteredPosts.length >= 6 && (
              <div className="mt-6 text-center">
                <button className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all ${isDark ? "bg-white/5 text-dark-text-secondary hover:bg-white/10 hover:text-dark-text" : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"}`}>
                  Cargar más publicaciones
                </button>
              </div>
            )}
          </div>

          {/* ===== RIGHT SIDEBAR ===== */}
          <div className="hidden xl:block w-[320px] shrink-0">
            <ForumRightPanel
              isDark={isDark}
              onCreatePost={() => { setEditingPost(null); setShowCreateModal(true); }}
            />
          </div>
        </div>
      </div>

      {/* ===== CREATE / EDIT POST MODAL ===== */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingPost(null); }}
        onSave={editingPost ? handleEditPost : handleCreatePost}
        editPost={editingPost}
        isDark={isDark}
        user={user}
      />

      {/* ===== POST DETAIL MODAL ===== */}
      <PostDetailModal
        post={selectedPost}
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedPost(null); }}
        isDark={isDark}
        user={user}
        onDelete={handleDeletePost}
        onArchive={handleArchivePost}
        onPin={handlePinPost}
        onEdit={handleEdit}
      />
    </div>
  );
}
