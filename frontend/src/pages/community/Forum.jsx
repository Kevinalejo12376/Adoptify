import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import ScrollToTop from "../../components/ScrollToTop";
import {
  MessageSquare,
  Search,
  Plus,
  MessageCircle,
  Clock,
  Filter,
  ChevronDown,
  Heart,
  X,
  Grid3X3,
  List,
  Sparkles,
  Shield,
  Zap,
  Loader2,
  Bookmark,
  PawPrint,
} from "lucide-react";
import ForumRightPanel from "./components/ForumRightPanel";
import ForumPostCard from "./components/ForumPostCard";
import CreatePostModal from "./components/CreatePostModal";
import PostDetailModal from "./components/PostDetailModal";
import { listarPosts, obtenerPost, crearPost, comentar, reaccionar, eliminarPost, guardarPost, fijarPost, listarPostsGuardados, actualizarPost } from "../../api/foro";
import { estadisticasPublicas } from "../../api/refugios";

const EMPTY_REACCIONES = { like: 0, love: 0, celebrate: 0, support: 0, funny: 0 };

// Convierte una fecha ISO en texto relativo ("hace 2 h").
function tiempoRelativo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

// Normaliza una publicacion del backend a la forma que consumen los componentes.
function mapPost(p) {
  return {
    id: p.id,
    autorId: p.autor_id,
    createdAt: p.creado_en,
    title: p.titulo,
    author: p.autor,
    accountType: p.autor_rol === "refugio" ? "shelter" : "user",
    badges: p.autor_rol === "refugio" ? ["verified"] : [],
    time: tiempoRelativo(p.creado_en),
    category: p.categoria || "General",
    content: p.contenido || "",
    tags: p.tags || [],
    images: [],
    reactions: { ...EMPTY_REACCIONES, ...(p.reacciones || {}) },
    comments: [],
    commentsCount: p.comentarios_count || 0,
    isPinned: p.fijado,
    isSaved: false,
  };
}

// Normaliza un comentario del backend.
function mapComentario(c) {
  return {
    id: c.id,
    author: c.autor,
    content: c.contenido,
    isShelter: c.autor_rol === "refugio",
    isAuthor: false,
    time: tiempoRelativo(c.creado_en),
    likes: c.likes || 0,
    replies: [],
  };
}

export default function Forum() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  // Datos reales
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refugiosCount, setRefugiosCount] = useState(0);
  const [savedIds, setSavedIds] = useState([]);
  const [savedFilter, setSavedFilter] = useState(false);
  const [myPostsFilter, setMyPostsFilter] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [pinnedAnimId, setPinnedAnimId] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [postTypeFilter, setPostTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [petTypeFilter, setPetTypeFilter] = useState("all");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState("feed");

  // Modal states
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDetail, setShowPostDetail] = useState(false);

  const cargarPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarPosts();
      setPosts((data || []).map(mapPost));
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarGuardados = useCallback(async () => {
    try {
      const data = await listarPostsGuardados();
      setSavedIds((data || []).map((p) => p.id));
    } catch (e) {
      setSavedIds([]);
    }
  }, []);

  useEffect(() => {
    cargarPosts();
    cargarGuardados();
    estadisticasPublicas()
      .then((est) => setRefugiosCount(est?.refugios ?? 0))
      .catch(() => {});
  }, [cargarPosts, cargarGuardados]);

  // Filter and sort posts
  const filteredPosts = posts
    .filter((post) => {
      if (savedFilter && !savedIds.includes(post.id)) return false;
      if (myPostsFilter && post.autorId !== user?.id) return false;
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory =
        selectedCategory === "all" || post.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      switch (sortBy) {
        case "popular": {
          const totalA = Object.values(a.reactions).reduce((x, y) => x + y, 0);
          const totalB = Object.values(b.reactions).reduce((x, y) => x + y, 0);
          return totalB - totalA;
        }
        case "commented":
          return (b.commentsCount || 0) - (a.commentsCount || 0);
        default: {
          const ta = Date.parse(a.createdAt) || 0;
          const tb = Date.parse(b.createdAt) || 0;
          return tb - ta;
        }
      }
    });

  const pinnedCount = posts.filter((p) => p.isPinned).length;

  const handlePostClick = async (post) => {
    setSelectedPost(post);
    setShowPostDetail(true);
    try {
      const detalle = await obtenerPost(post.id);
      setSelectedPost({
        ...mapPost(detalle),
        comments: (detalle.comentarios || []).map(mapComentario),
      });
    } catch (e) {
      // se mantiene el resumen basico si falla el detalle
    }
  };

  const handleReactionChange = (postId, reactionId) => {
    reaccionar(postId, reactionId).catch(() => {});
  };

  const handleCreatePost = async (payload) => {
    await crearPost(payload);
    setEditingPost(null);
    await cargarPosts();
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setShowCreatePost(true);
  };

  const handleUpdatePost = async (postId, payload) => {
    await actualizarPost(postId, payload);
    await cargarPosts();
  };

  const handleDeletePost = async (postId) => {
    try {
      await eliminarPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (selectedPost?.id === postId) setShowPostDetail(false);
    } catch (e) {
      // noop: si falla se mantiene la publicacion en el feed
    }
  };

  const handleToggleSave = async (postId) => {
    const estabaGuardado = savedIds.includes(postId);
    setSavedIds((prev) =>
      estabaGuardado ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
    try {
      await guardarPost(postId);
    } catch (e) {
      setSavedIds((prev) =>
        estabaGuardado ? [...prev, postId] : prev.filter((id) => id !== postId)
      );
    }
  };

  const handleTogglePin = async (postId) => {
    // Actualizacion optimista: al fijar, la publicacion sube de inmediato al
    // inicio del feed y permanece ahi hasta que se desfije.
    const post = posts.find((p) => p.id === postId);
    const seFija = post && !post.isPinned;
    setPosts((prev) => {
      const actualizado = prev.map((p) =>
        p.id === postId ? { ...p, isPinned: !p.isPinned } : p
      );
      if (seFija) {
        const fijado = actualizado.find((p) => p.id === postId);
        return [fijado, ...actualizado.filter((p) => p.id !== postId)];
      }
      return actualizado;
    });
    if (seFija) {
      setPinnedAnimId(postId);
      setTimeout(() => setPinnedAnimId(null), 800);
    }
    try {
      await fijarPost(postId);
    } catch (e) {
      // Revertir si el backend rechaza la operacion.
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isPinned: !p.isPinned } : p))
      );
    }
  };

  const handleAddComment = async (postId, text) => {
    await comentar(postId, { contenido: text });
    const detalle = await obtenerPost(postId);
    setSelectedPost({
      ...mapPost(detalle),
      comments: (detalle.comentarios || []).map(mapComentario),
    });
    // Actualiza el conteo en el feed
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p))
    );
  };

  // Stats data (reales)
  const totalComentarios = posts.reduce((acc, p) => acc + (p.commentsCount || 0), 0);
  const totalReacciones = posts.reduce(
    (acc, p) => acc + Object.values(p.reactions).reduce((x, y) => x + y, 0),
    0
  );
  const forumStats = [
    { label: "Publicaciones", value: posts.length, icon: MessageSquare, gradient: "from-rose-500 to-pink-500" },
    { label: "Comentarios", value: totalComentarios, icon: MessageCircle, gradient: "from-blue-500 to-cyan-500" },
    { label: "Refugios", value: refugiosCount, icon: Shield, gradient: "from-emerald-500 to-teal-500" },
    { label: "Reacciones", value: totalReacciones, icon: Heart, gradient: "from-violet-500 to-fuchsia-500" },
  ];

  return (
    <div className={`min-h-screen pt-20 pb-12 transition-colors duration-300 ${
      isDark
        ? "bg-dark-bg"
        : "bg-gradient-to-br from-rose-50 via-white to-amber-50"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ===== Header Section ===== */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold font-display ${
                  isDark ? "text-dark-text" : "text-gray-900"
                }`}>
                  Comunidad
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isDark ? "bg-rose-500/15 text-rose-300" : "bg-rose-100 text-rose-700"
                }`}>
                  {filteredPosts.length} publicaciones
                </span>
              </div>
              <p className={`text-base sm:text-lg mt-1 ${
                isDark ? "text-dark-text-secondary" : "text-gray-600"
              }`}>
                Comparte experiencias, haz preguntas y conecta con otros amantes de los animales
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Create Post Button */}
              <button
                onClick={() => { setEditingPost(null); setShowCreatePost(true); }}
                className="relative inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Nueva Publicación</span>
                <span className="sm:hidden">Crear</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===== Statistics Bar ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {forumStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all duration-300 hover-lift group ${
                  isDark
                    ? "bg-dark-card border border-dark-border"
                    : "bg-white shadow-md shadow-gray-100/50"
                }`}
              >
                {/* Gradient Decoration */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`}></div>

                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className={`text-3xl sm:text-4xl font-bold font-display tracking-tight ${
                      isDark ? "text-dark-text" : "text-gray-900"
                    }`}>
                      {stat.value}
                    </p>
                    <p className={`text-sm sm:text-base mt-1 font-medium ${
                      isDark ? "text-dark-text-secondary" : "text-gray-500"
                    }`}>
                      {stat.label}
                    </p>
                  </div>
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shrink-0 shadow-lg ${
                    isDark ? "shadow-rose-500/20" : ""
                  }`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== Search Bar ===== */}
        <div className="mb-6">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
              isDark ? "text-dark-text-secondary" : "text-gray-400"
            }`} />
            <input
              type="text"
              placeholder="Buscar publicaciones, etiquetas o usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-36 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all ${
                isDark
                  ? "bg-dark-card border border-dark-border text-dark-text placeholder-dark-text-secondary"
                  : "bg-white border border-gray-200 text-gray-700 placeholder-gray-400 shadow-sm"
              }`}
            />
            {/* Search Meta + Filter Button */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchTerm && (
                <>
                  <span className={`text-xs hidden sm:inline ${
                    isDark ? "text-dark-text-secondary" : "text-gray-400"
                  }`}>
                    {filteredPosts.length} resultados
                  </span>
                  <button
                    onClick={() => setSearchTerm("")}
                    className={`p-1.5 rounded-lg transition-all ${
                      isDark
                        ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  showMobileFilters
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                    : isDark
                    ? "bg-white/10 text-dark-text-secondary hover:text-dark-text hover:bg-white/15"
                    : "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                  showMobileFilters ? "rotate-180" : ""
                }`} />
              </button>
            </div>
          </div>

          {/* ===== Filters Panel (Expandable) ===== */}
          {showMobileFilters && (
            <div className={`mt-3 p-5 rounded-2xl transition-all ${
              isDark
                ? "bg-dark-card border border-dark-border"
                : "bg-white shadow-lg border border-gray-100"
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Post Type Filter */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isDark ? "text-dark-text-secondary" : "text-gray-500"
                  }`}>
                    Tipo de publicación
                  </label>
                  <select
                    value={postTypeFilter}
                    onChange={(e) => setPostTypeFilter(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                      isDark
                        ? "bg-[#15151f] border border-dark-border text-dark-text"
                        : "bg-gray-50 border border-gray-200 text-gray-700"
                    }`}
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="story">Historia</option>
                    <option value="question">Pregunta</option>
                    <option value="tip">Consejo</option>
                    <option value="event">Evento</option>
                    <option value="campaign">Campaña</option>
                    <option value="donation">Donación</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isDark ? "text-dark-text-secondary" : "text-gray-500"
                  }`}>
                    Ordenar por
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                      isDark
                        ? "bg-[#15151f] border border-dark-border text-dark-text"
                        : "bg-gray-50 border border-gray-200 text-gray-700"
                    }`}
                  >
                    <option value="newest">Más recientes</option>
                    <option value="popular">Más populares</option>
                    <option value="commented">Más comentados</option>
                  </select>
                </div>

                {/* Pet Type Filter */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isDark ? "text-dark-text-secondary" : "text-gray-500"
                  }`}>
                    Tipo de mascota
                  </label>
                  <select
                    value={petTypeFilter}
                    onChange={(e) => setPetTypeFilter(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                      isDark
                        ? "bg-[#15151f] border border-dark-border text-dark-text"
                        : "bg-gray-50 border border-gray-200 text-gray-700"
                    }`}
                  >
                    <option value="all">Todos</option>
                    <option value="dog">Perros</option>
                    <option value="cat">Gatos</option>
                    <option value="other">Otros</option>
                  </select>
                </div>

                {/* Active Filters Info */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                    isDark ? "text-dark-text-secondary" : "text-gray-500"
                  }`}>
                    Filtros activos
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {postTypeFilter !== "all" && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        isDark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-700"
                      }`}>
                        {postTypeFilter}
                      </span>
                    )}
                    {petTypeFilter !== "all" && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700"
                      }`}>
                        {petTypeFilter === "dog" ? "Perros" : petTypeFilter === "cat" ? "Gatos" : "Otros"}
                      </span>
                    )}
                    {postTypeFilter === "all" && petTypeFilter === "all" && (
                      <span className={`text-xs ${
                        isDark ? "text-dark-text-secondary" : "text-gray-400"
                      }`}>
                        Ningún filtro adicional
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {(postTypeFilter !== "all" || petTypeFilter !== "all") && (
                <button
                  onClick={() => {
                    setPostTypeFilter("all");
                    setPetTypeFilter("all");
                  }}
                  className={`mt-3 text-xs font-medium transition-all ${
                    isDark ? "text-rose-400 hover:text-rose-300" : "text-rose-600 hover:text-rose-700"
                  }`}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                  : isDark
                  ? "bg-white/5 text-dark-text-secondary hover:bg-white/10"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              <Zap className="w-3 h-3" />
              Para ti
            </button>
            <button
              onClick={() => setSavedFilter(!savedFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                savedFilter
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                  : isDark
                  ? "bg-white/5 text-dark-text-secondary hover:bg-white/10"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              🔖 Guardadas
            </button>
            <button
              onClick={() => setSelectedCategory("Historias")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === "Historias"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                  : isDark
                  ? "bg-white/5 text-dark-text-secondary hover:bg-white/10"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              📖 Historias
            </button>
            <button
              onClick={() => setSelectedCategory("Campañas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === "Campañas"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                  : isDark
                  ? "bg-white/5 text-dark-text-secondary hover:bg-white/10"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              📢 Campañas
            </button>
            <button
              onClick={() => setSelectedCategory("Eventos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === "Eventos"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                  : isDark
                  ? "bg-white/5 text-dark-text-secondary hover:bg-white/10"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              📅 Eventos
            </button>
            <button
              onClick={() => setSelectedCategory("Salud")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === "Salud"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                  : isDark
                  ? "bg-white/5 text-dark-text-secondary hover:bg-white/10"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              🏥 Salud
            </button>
            <button
              onClick={() => setSelectedCategory("Entrenamiento")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === "Entrenamiento"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                  : isDark
                  ? "bg-white/5 text-dark-text-secondary hover:bg-white/10"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              🎯 Entrenamiento
            </button>
            <button
              onClick={() => setSelectedCategory("Nutrición")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === "Nutrición"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                  : isDark
                  ? "bg-white/5 text-dark-text-secondary hover:bg-white/10"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              🥗 Nutrición
            </button>
          </div>
        </div>

        {/* ===== Two Column Layout ===== */}
        <div className="flex gap-6">
          {/* ===== Center Feed ===== */}
          <div className="flex-1 min-w-0">
            {/* Feed Controls */}
            <div className={`flex items-center justify-between mb-4 px-1`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  {sortBy === "newest" ? "Más recientes" : sortBy === "popular" ? "Más populares" : "Más comentados"}
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`text-xs px-2 py-1 rounded-lg focus:outline-none ${
                    isDark
                      ? "bg-dark-card border border-dark-border text-dark-text"
                      : "bg-white border border-gray-200 text-gray-600"
                  }`}
                >
                  <option value="newest">Más recientes</option>
                  <option value="popular">Más populares</option>
                  <option value="commented">Más comentados</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const activar = !savedFilter;
                    setSavedFilter(activar);
                    setMyPostsFilter(false);
                    if (activar) setSelectedCategory("all");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    savedFilter
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                      : isDark
                      ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/10"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title={savedFilter ? "Ver todas las publicaciones" : "Ver tus publicaciones guardadas"}
                >
                  <Bookmark className={`w-4 h-4 ${savedFilter ? "fill-white" : ""}`} />
                  <span className="hidden sm:inline">{savedFilter ? "Ver todas" : "Ver guardados"}</span>
                </button>
                <button
                  onClick={() => {
                    const activar = !myPostsFilter;
                    setMyPostsFilter(activar);
                    setSavedFilter(false);
                    if (activar) setSelectedCategory("all");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    myPostsFilter
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                      : isDark
                      ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/10"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title={myPostsFilter ? "Ver todas las publicaciones" : "Ver tus publicaciones"}
                >
                  <PawPrint className={`w-4 h-4 ${myPostsFilter ? "fill-white" : ""}`} />
                  <span className="hidden sm:inline">{myPostsFilter ? "Ver todas" : "Mis publicaciones"}</span>
                </button>
                <button
                  onClick={() => setViewMode("feed")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "feed"
                      ? isDark
                        ? "bg-rose-500/15 text-rose-300"
                        : "bg-rose-50 text-rose-600"
                      : isDark
                      ? "text-dark-text-secondary hover:text-dark-text"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? isDark
                        ? "bg-rose-500/15 text-rose-300"
                        : "bg-rose-50 text-rose-600"
                      : isDark
                      ? "text-dark-text-secondary hover:text-dark-text"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Encabezado de guardadas */}
            {savedFilter && (
              <div className={`mb-4 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-amber-500/20" : "bg-amber-100"
                  }`}>
                    <Bookmark className={`w-5 h-5 ${isDark ? "text-amber-300" : "text-amber-600"}`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                      Tus publicaciones guardadas
                    </h3>
                    <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                      {savedIds.length} {savedIds.length === 1 ? "publicación guardada" : "publicaciones guardadas"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSavedFilter(false)}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isDark ? "bg-white/10 text-dark-text hover:bg-white/15" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  Ver todas
                </button>
              </div>
            )}

            {/* Encabezado de mis publicaciones */}
            {myPostsFilter && (
              <div className={`mb-4 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? "bg-rose-500/10 border border-rose-500/20" : "bg-rose-50 border border-rose-200"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? "bg-rose-500/20" : "bg-rose-100"
                  }`}>
                    <PawPrint className={`w-5 h-5 ${isDark ? "text-rose-300" : "text-rose-600"}`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                      Mis publicaciones
                    </h3>
                    <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                      Administra aquí las publicaciones que creaste (editar o eliminar)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMyPostsFilter(false)}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isDark ? "bg-white/10 text-dark-text hover:bg-white/15" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  Ver todas
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-dark-text-secondary">
                <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
                <p>Cargando publicaciones...</p>
              </div>
            )}

            {/* Posts Feed */}
            {!loading && (viewMode === "feed" ? (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <ForumPostCard
                    key={post.id}
                    post={post}
                    onPostClick={handlePostClick}
                    onReactionChange={handleReactionChange}
                    onDeletePost={handleDeletePost}
                    isSaved={savedIds.includes(post.id)}
                    onToggleSave={handleToggleSave}
                    onTogglePin={handleTogglePin}
                    pinnedCount={pinnedCount}
                    onEditPost={handleEditPost}
                    isPinnedAnim={post.id === pinnedAnimId}
                  />
                ))}
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPosts.map((post) => (
                  <ForumPostCard
                    key={post.id}
                    post={post}
                    onPostClick={handlePostClick}
                    onReactionChange={handleReactionChange}
                    onDeletePost={handleDeletePost}
                    isSaved={savedIds.includes(post.id)}
                    onToggleSave={handleToggleSave}
                    onTogglePin={handleTogglePin}
                    pinnedCount={pinnedCount}
                    onEditPost={handleEditPost}
                    isPinnedAnim={post.id === pinnedAnimId}
                  />
                ))}
              </div>
            ))}

            {/* No Results */}
            {!loading && filteredPosts.length === 0 && (
              <div className={`text-center py-16 rounded-2xl ${
                isDark ? "bg-dark-card border border-dark-border" : "bg-white shadow-md"
              }`}>
                <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${
                  isDark ? "text-dark-text-secondary" : "text-gray-300"
                }`} />
                <h3 className={`text-xl font-semibold mb-2 ${
                  isDark ? "text-dark-text" : "text-gray-900"
                }`}>
                  {myPostsFilter
                    ? "No has publicado nada aún"
                    : savedFilter
                    ? "No tienes publicaciones guardadas"
                    : "No hay publicaciones aún"}
                </h3>
                <p className={`text-sm mb-6 ${
                  isDark ? "text-dark-text-secondary" : "text-gray-600"
                }`}>
                  {myPostsFilter
                    ? "Crea tu primera publicación para que aparezca aquí"
                    : savedFilter
                    ? "Guarda publicaciones con el botón de marcador para verlas aquí"
                    : "Sé el primero en compartir algo con la comunidad"}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {myPostsFilter ? (
                    <button
                      onClick={() => setMyPostsFilter(false)}
                      className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg"
                    >
                      Ver todas las publicaciones
                    </button>
                  ) : savedFilter ? (
                    <button
                      onClick={() => setSavedFilter(false)}
                      className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg"
                    >
                      Ver todas las publicaciones
                    </button>
                  ) : (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                      setPostTypeFilter("all");
                      setPetTypeFilter("all");
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg"
                  >
                    Limpiar filtros
                  </button>
                  )}
                  <button
                    onClick={() => { setEditingPost(null); setShowCreatePost(true); }}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      isDark
                        ? "bg-white/5 text-dark-text hover:bg-white/10"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Crear publicación
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ===== Right Sidebar (Hidden on tablet/mobile) ===== */}
          <div className="hidden xl:block w-[320px] shrink-0">
            <ForumRightPanel />
          </div>
        </div>
      </div>

      {/* ===== Create / Edit Post Modal ===== */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => {
          setShowCreatePost(false);
          setEditingPost(null);
        }}
        onCreate={handleCreatePost}
        editingPost={editingPost}
        onUpdate={handleUpdatePost}
      />

      {/* ===== Post Detail Modal ===== */}
      <PostDetailModal
        post={selectedPost}
        isOpen={showPostDetail}
        onClose={() => {
          setShowPostDetail(false);
          setSelectedPost(null);
        }}
        onComment={handleAddComment}
        onReact={handleReactionChange}
      />
      <ScrollToTop />
    </div>
  );
}
