// ============================================================
// Utilidades compartidas del foro: normalización de datos que
// llegan del backend. Reutilizadas por Forum, la tarjeta de
// publicación y el modal de detalle (sin duplicar lógica).
// ============================================================
import { ThumbsUp, Heart, Laugh, Sparkles, Frown, Angry } from "lucide-react";

// Reacciones de Adoptify (comportamiento tipo red social, diseño propio).
// Se usan iconos de lucide-react (la misma librería del proyecto), cada uno con
// su color identificativo. El estado activo usa un FONDO muy suave + icono/texto
// con color intenso + borde contrastante (nunca un botón completamente coloreado).
export const REACTION_TYPES = [
  { id: "like", label: "Me gusta", icon: ThumbsUp, color: "text-amber-500", softBg: "bg-amber-50", softBorder: "border-amber-300", darkSoftBg: "dark:bg-amber-500/15", darkSoftBorder: "dark:border-amber-400/50", ring: "ring-amber-300", darkRing: "dark:ring-amber-400/60" },
  { id: "love", label: "Me encanta", icon: Heart, color: "text-rose-500", softBg: "bg-rose-50", softBorder: "border-rose-300", darkSoftBg: "dark:bg-rose-500/15", darkSoftBorder: "dark:border-rose-400/50", ring: "ring-rose-300", darkRing: "dark:ring-rose-400/60" },
  { id: "funny", label: "Me divierte", icon: Laugh, color: "text-orange-500", softBg: "bg-orange-50", softBorder: "border-orange-300", darkSoftBg: "dark:bg-orange-500/15", darkSoftBorder: "dark:border-orange-400/50", ring: "ring-orange-300", darkRing: "dark:ring-orange-400/60" },
  { id: "wow", label: "Me asombra", icon: Sparkles, color: "text-violet-500", softBg: "bg-violet-50", softBorder: "border-violet-300", darkSoftBg: "dark:bg-violet-500/15", darkSoftBorder: "dark:border-violet-400/50", ring: "ring-violet-300", darkRing: "dark:ring-violet-400/60" },
  { id: "sad", label: "Me entristece", icon: Frown, color: "text-blue-600", softBg: "bg-blue-50", softBorder: "border-blue-300", darkSoftBg: "dark:bg-blue-500/15", darkSoftBorder: "dark:border-blue-400/50", ring: "ring-blue-300", darkRing: "dark:ring-blue-400/60" },
  { id: "angry", label: "Me enoja", icon: Angry, color: "text-red-600", softBg: "bg-red-50", softBorder: "border-red-300", darkSoftBg: "dark:bg-red-500/15", darkSoftBorder: "dark:border-red-400/50", ring: "ring-red-300", darkRing: "dark:ring-red-400/60" },
];

export const getReaction = (id) => REACTION_TYPES.find((r) => r.id === id) || null;

export const getTotalReactions = (reactions = {}) =>
  Object.values(reactions || {}).reduce((a, b) => a + (Number(b) || 0), 0);

export const EMPTY_REACCIONES = {
  like: 0,
  love: 0,
  funny: 0,
  wow: 0,
  sad: 0,
  angry: 0,
  celebrate: 0,
  support: 0,
};

// Convierte una fecha ISO en texto relativo ("hace 2 h").
export function tiempoRelativo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

// Normaliza un comentario del backend.
export function mapComentario(c, currentUserId) {
  return {
    id: c.id,
    autorId: c.autor_id,
    autor_id: c.autor_id,
    author: c.autor,
    avatar: c.autor_avatar || "",
    content: c.contenido,
    isShelter: c.autor_rol === "refugio",
    isAuthor: c.autor_id != null && currentUserId != null && c.autor_id === currentUserId,
    editado: !!c.editado,
    time: tiempoRelativo(c.creado_en),
    likes: c.likes || 0,
    liked: false,
    comentario_padre_id: c.comentario_padre_id ?? null,
    replies: [],
  };
}

// Normaliza una publicacion del backend a la forma que consumen los componentes.
export function mapPost(p) {
  return {
    id: p.id,
    autorId: p.autor_id,
    createdAt: p.creado_en,
    title: p.titulo,
    author: p.autor,
    avatar: p.autor_avatar || "",
    accountType: p.autor_rol === "refugio" ? "shelter" : "user",
    badges: p.autor_rol === "refugio" ? ["verified"] : [],
    time: tiempoRelativo(p.creado_en),
    category: p.categoria || "General",
    content: p.contenido || "",
    tags: p.tags || [],
    // Imágenes almacenadas en Cloudinary (solo secure_url + id en la BD).
    images: (p.imagenes || []).map((img) => ({
      id: img.id,
      url: img.url,
      publicId: img.public_id || "",
    })),
    reactions: { ...EMPTY_REACCIONES, ...(p.reacciones || {}) },
    miReaccion: p.mi_reaccion || null,
    comments: [],
    commentsCount: p.comentarios_count || 0,
    compartidos: p.compartidos || 0,
    isPinned: p.fijado,
    isSaved: false,
  };
}
