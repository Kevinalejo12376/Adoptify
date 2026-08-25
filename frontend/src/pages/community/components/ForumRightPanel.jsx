import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import {
  Pin,
  Star,
  Sparkles,
  Shield,
  MapPin,
  Users,
  ExternalLink,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { listarPosts } from "../../../api/foro";
import { listarRefugios } from "../../../api/refugios";

const SHELTER_COLORS = [
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-blue-500 to-indigo-500",
  "from-violet-500 to-purple-500",
];

export default function ForumRightPanel() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [featuredShelters, setFeaturedShelters] = useState([]);

  useEffect(() => {
    let activo = true;
    // Publicaciones del foro -> destacados (fijados) + etiquetas populares
    listarPosts()
      .then((posts) => {
        if (!activo) return;
        const lista = posts || [];

        // Destacados: los fijados; si no hay, los más comentados
        const fijados = lista.filter((p) => p.fijado);
        const base = fijados.length > 0
          ? fijados
          : [...lista].sort((a, b) => (b.comentarios_count || 0) - (a.comentarios_count || 0));
        setFeaturedPosts(base.slice(0, 3).map((p) => ({
          id: p.id,
          title: p.titulo,
          excerpt: p.contenido || "",
          author: p.autor,
          category: p.categoria || "General",
        })));

        // Etiquetas populares: frecuencia real de los tags de las publicaciones
        const conteo = {};
        lista.forEach((p) => {
          (p.tags || []).forEach((t) => {
            const tag = String(t).trim();
            if (tag) conteo[tag] = (conteo[tag] || 0) + 1;
          });
        });
        const tags = Object.entries(conteo)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setPopularTags(tags);
      })
      .catch(() => {});

    // Refugios destacados reales
    listarRefugios()
      .then((refs) => {
        if (!activo) return;
        setFeaturedShelters((refs || []).slice(0, 3).map((r, i) => ({
          id: r.id,
          name: r.nombre,
          city: r.ubicacion || "Colombia",
          color: SHELTER_COLORS[i % SHELTER_COLORS.length],
        })));
      })
      .catch(() => {});

    return () => { activo = false; };
  }, []);

  const cardClass = `rounded-2xl p-5 ${
    isDark
      ? "bg-dark-card border border-dark-border"
      : "bg-white shadow-md shadow-gray-100/50"
  }`;

  const sectionTitleClass = `text-sm font-semibold uppercase tracking-wider mb-4 ${
    isDark ? "text-dark-text-secondary" : "text-gray-500"
  }`;

  return (
    <aside className="space-y-5">
      {/* ===== Recomendaciones IA (próximamente) ===== */}
      <div
        className={`${cardClass} border-2 border-dashed ${
          isDark ? "border-violet-500/30" : "border-violet-300/50"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className={`w-4 h-4 ${isDark ? "text-violet-400" : "text-violet-500"}`} />
          <h3
            className={`text-sm font-semibold uppercase tracking-wider ${
              isDark ? "text-violet-300" : "text-violet-700"
            }`}
          >
            Recomendaciones IA
          </h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <Lightbulb className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-violet-400" : "text-violet-500"}`} />
            <p className={`text-sm font-medium ${isDark ? "text-dark-text" : "text-gray-900"}`}>
              Recomendaciones inteligentes
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
              Próximamente: Contenido personalizado para ti
            </p>
          </div>
        </div>
      </div>

      {/* ===== Destacados (publicaciones fijadas reales) ===== */}
      {featuredPosts.length > 0 && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Pin className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-500"}`} />
            <h3 className={sectionTitleClass}>Destacados</h3>
          </div>
          <div className="space-y-3">
            {featuredPosts.map((post) => (
              <div
                key={post.id}
                className={`w-full text-left p-3 rounded-xl transition-all group ${
                  isDark ? "hover:bg-white/5" : "hover:bg-amber-50"
                }`}
              >
                <p
                  className={`text-sm font-semibold leading-snug group-hover:text-rose-500 transition-colors ${
                    isDark ? "text-dark-text" : "text-gray-900"
                  }`}
                >
                  {post.title}
                </p>
                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {post.category}
                  </span>
                  <span className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
                    {post.author}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Etiquetas Populares (reales, según los tags de las publicaciones) ===== */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className={`w-4 h-4 ${isDark ? "text-emerald-400" : "text-emerald-500"}`} />
          <h3 className={sectionTitleClass}>Etiquetas Populares</h3>
        </div>
        {popularTags.length === 0 ? (
          <p className={`text-sm ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
            Aún no hay etiquetas en el foro.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <span
                key={tag.name}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium ${
                  isDark
                    ? "bg-white/5 text-dark-text-secondary"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span>#</span>
                {tag.name}
                <span className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
                  {tag.count}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ===== Refugios Destacados (reales) ===== */}
      {featuredShelters.length > 0 && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className={`w-4 h-4 ${isDark ? "text-emerald-400" : "text-emerald-500"}`} />
            <h3 className={sectionTitleClass}>Refugios Destacados</h3>
          </div>
          <div className="space-y-3">
            {featuredShelters.map((shelter) => (
              <Link
                key={shelter.id}
                to={`/shelter/${shelter.id}`}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${shelter.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                >
                  {shelter.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold group-hover:text-rose-500 transition-colors ${
                      isDark ? "text-dark-text" : "text-gray-900"
                    }`}
                  >
                    {shelter.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MapPin className={`w-3 h-3 ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`} />
                    <span className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                      {shelter.city}
                    </span>
                  </div>
                </div>
                <ExternalLink
                  className={`w-4 h-4 shrink-0 ${
                    isDark
                      ? "text-dark-text-secondary group-hover:text-rose-400"
                      : "text-gray-400 group-hover:text-rose-500"
                  } transition-colors`}
                />
              </Link>
            ))}
          </div>
          <Link
            to="/shelters"
            className={`flex items-center justify-center gap-1 mt-3 text-xs font-medium transition-all ${
              isDark ? "text-rose-400 hover:text-rose-300" : "text-rose-600 hover:text-rose-700"
            }`}
          >
            Ver todos los refugios
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </aside>
  );
}
