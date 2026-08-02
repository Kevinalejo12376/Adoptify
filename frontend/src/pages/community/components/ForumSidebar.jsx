import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import {
  User,
  MessageSquare,
  Heart,
  Settings,
  Bookmark,
  PawPrint,
  Newspaper,
  Calendar,
  Syringe,
  Gift,
  AlertTriangle,
  Star,
  Shield,
  HelpCircle,
  Lightbulb,
  Camera,
  ThumbsUp,
} from "lucide-react";

const accountTypes = {
  user: {
    label: "Usuario",
    icon: User,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  shelter: {
    label: "Refugio",
    icon: Shield,
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
};

const categories = [
  { id: "all", label: "Todas las publicaciones", icon: Newspaper },
  { id: "historias", label: "Historias de adopción", icon: Heart },
  { id: "consejos", label: "Consejos y cuidados", icon: Lightbulb },
  { id: "preguntas", label: "Preguntas", icon: HelpCircle },
  { id: "jornadas", label: "Jornadas de adopción", icon: Calendar },
  { id: "campañas", label: "Campañas", icon: Syringe },
  { id: "donaciones", label: "Solicitudes de donación", icon: Gift },
  { id: "eventos", label: "Eventos", icon: Star },
  { id: "experiencias", label: "Experiencias", icon: Camera },
  { id: "salud", label: "Salud y bienestar", icon: AlertTriangle },
  { id: "entrenamiento", label: "Entrenamiento", icon: ThumbsUp },
];

const quickLinks = [
  { label: "Mi Perfil", path: "/profile", icon: User },
  { label: "Mis Favoritos", path: "/favorites", icon: Heart },
  { label: "Mis Publicaciones", path: "/profile?tab=posts", icon: MessageSquare },
  { label: "Guardados", path: "/profile?tab=saved", icon: Bookmark },
  { label: "Configuración", path: "/settings", icon: Settings },
];

export default function ForumSidebar({
  selectedCategory,
  onCategoryChange,
  postTypeFilter,
  onPostTypeChange,
  sortBy,
  onSortChange,
  petTypeFilter,
  onPetTypeChange,
}) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const isShelter = user?.accountType === "shelter";
  const accountInfo = isShelter ? accountTypes.shelter : accountTypes.user;

  const getUserInitials = () => {
    if (!user?.name) return "?";
    const names = user.name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const getAvatarColor = () => {
    const colors = [
      "from-rose-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-violet-500 to-purple-600",
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-cyan-500 to-blue-600",
    ];
    if (!user?.name) return colors[0];
    const index = user.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <aside className="space-y-5">
      {/* ===== User Profile Summary ===== */}
      <div
        className={`rounded-2xl p-5 ${
          isDark
            ? "bg-dark-card border border-dark-border"
            : "bg-white shadow-md shadow-gray-100/50"
        }`}
      >
        <Link to="/profile" className="flex items-center gap-4 group">
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor()} flex items-center justify-center text-white text-lg font-bold shrink-0`}
            >
              {getUserInitials()}
            </div>
            {/* Account Type Badge */}
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${accountInfo.bg} border-2 ${
                isDark ? "border-dark-card" : "border-white"
              } flex items-center justify-center`}
            >
              <accountInfo.icon className={`w-3 h-3 ${accountInfo.text}`} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-semibold truncate group-hover:text-rose-500 transition-colors ${
                isDark ? "text-dark-text" : "text-gray-900"
              }`}
            >
              {user?.name || "Invitado"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${accountInfo.bg} ${accountInfo.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${accountInfo.dot}`}></span>
                {accountInfo.label}
              </span>
            </div>
          </div>
        </Link>

        {/* User Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-dark-border">
          <div className="text-center">
            <p className={`text-lg font-bold ${isDark ? "text-dark-text" : "text-gray-900"}`}>24</p>
            <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>Publicaciones</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${isDark ? "text-dark-text" : "text-gray-900"}`}>156</p>
            <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>Reacciones</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${isDark ? "text-dark-text" : "text-gray-900"}`}>12</p>
            <p className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>Insignias</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {["🐾 Experto", "⭐ Top Colaborador", "❤️ Amigo Animal"].map((badge) => (
            <span
              key={badge}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isDark
                  ? "bg-rose-500/10 text-rose-300"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {badge}
            </span>
          ))}
        </div>

        {/* AI Assistant Quick Access - AI Ready */}
        <button
          className={`w-full mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isDark
              ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 hover:from-violet-500/30 hover:to-fuchsia-500/30 border border-violet-500/20"
              : "bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 hover:from-violet-100 hover:to-fuchsia-100 border border-violet-200/50"
          }`}
        >
          <span className="text-lg">🤖</span>
          <span>Pregunta a la IA</span>
          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
            isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-600"
          }`}>Próximamente</span>
        </button>
      </div>

      {/* ===== Quick Links ===== */}
      <div
        className={`rounded-2xl p-4 ${
          isDark
            ? "bg-dark-card border border-dark-border"
            : "bg-white shadow-md shadow-gray-100/50"
        }`}
      >
        <h3
          className={`text-sm font-semibold uppercase tracking-wider mb-3 ${
            isDark ? "text-dark-text-secondary" : "text-gray-500"
          }`}
        >
          Accesos Rápidos
        </h3>
        <nav className="space-y-1">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ===== Filters Section ===== */}
      <div
        className={`rounded-2xl p-4 ${
          isDark
            ? "bg-dark-card border border-dark-border"
            : "bg-white shadow-md shadow-gray-100/50"
        }`}
      >
        <h3
          className={`text-sm font-semibold uppercase tracking-wider mb-3 ${
            isDark ? "text-dark-text-secondary" : "text-gray-500"
          }`}
        >
          Filtros
        </h3>

        {/* Post Type Filter */}
        <div className="mb-4">
          <label
            className={`block text-xs font-medium mb-2 ${
              isDark ? "text-dark-text-secondary" : "text-gray-500"
            }`}
          >
            Tipo de publicación
          </label>
          <select
            value={postTypeFilter}
            onChange={(e) => onPostTypeChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
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
        <div className="mb-4">
          <label
            className={`block text-xs font-medium mb-2 ${
              isDark ? "text-dark-text-secondary" : "text-gray-500"
            }`}
          >
            Ordenar por
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
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
        <div className="mb-4">
          <label
            className={`block text-xs font-medium mb-2 ${
              isDark ? "text-dark-text-secondary" : "text-gray-500"
            }`}
          >
            Tipo de mascota
          </label>
          <select
            value={petTypeFilter}
            onChange={(e) => onPetTypeChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
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
      </div>

      {/* ===== Categories ===== */}
      <div
        className={`rounded-2xl p-4 ${
          isDark
            ? "bg-dark-card border border-dark-border"
            : "bg-white shadow-md shadow-gray-100/50"
        }`}
      >
        <h3
          className={`text-sm font-semibold uppercase tracking-wider mb-3 ${
            isDark ? "text-dark-text-secondary" : "text-gray-500"
          }`}
        >
          Categorías
        </h3>
        <div className="space-y-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? isDark
                      ? "bg-gradient-to-r from-rose-500/20 to-amber-500/20 text-rose-300"
                      : "bg-gradient-to-r from-rose-50 to-amber-50 text-rose-700"
                    : isDark
                    ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{cat.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
