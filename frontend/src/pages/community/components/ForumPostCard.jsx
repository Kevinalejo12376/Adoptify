import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import ConfirmModal from "../../../components/ConfirmModal";
import {
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  MoreHorizontal,
  Clock,
  User,
  Shield,
  Pin,
  Trash2,
  Edit3,
  Loader2,
} from "lucide-react";
import ReactionButton from "./ReactionPicker";
import CommentsSection from "./CommentsSection";
import ReactionsModal from "./ReactionsModal";
import ShareMenu from "./ShareMenu";
import { listarComentarios, obtenerPost, obtenerReacciones } from "../../../api/foro";
import { mapComentario, REACTION_TYPES, getTotalReactions } from "../forumData";

const accountTypes = {
  user: { label: "Usuario", icon: User, bg: "bg-blue-100 dark:bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
  shelter: { label: "Refugio", icon: Shield, bg: "bg-orange-100 dark:bg-orange-500/15", text: "text-orange-700 dark:text-orange-300" },
};

const getInitials = (name) => {
  if (!name) return "?";
  const names = name.split(/\s+/);
  if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
  return names[0][0].toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-600",
    "from-orange-400 to-red-500",
    "from-violet-400 to-purple-600",
    "from-cyan-400 to-blue-600",
    "from-emerald-400 to-teal-600",
  ];
  if (!name) return colors[0];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

// Resumen visual de reacciones: iconos apilados + total.
function ReactionSummary({ reactions, onOpen }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const present = REACTION_TYPES.filter((r) => (reactions?.[r.id] || 0) > 0);
  const total = getTotalReactions(reactions);
  if (total === 0) return null;

  return (
    <button
      onClick={onOpen}
      className={`flex items-center gap-2 text-sm font-medium transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-500 hover:text-gray-700"}`}
      title="Ver quiénes reaccionaron"
    >
      <span className="flex -space-x-1.5">
        {present.slice(0, 3).map((r) => {
          const Icon = r.icon;
          return (
            <span
              key={r.id}
              className={`w-6 h-6 rounded-full flex items-center justify-center ring-2 ${r.softBg} ${r.darkSoftBg} ${r.softBorder.replace("border-", "ring-")} ${r.darkSoftBorder.replace("dark:border-", "dark:ring-")}`}
            >
              <Icon className={`w-3.5 h-3.5 ${r.color}`} fill="currentColor" />
            </span>
          );
        })}
      </span>
      {total} {total === 1 ? "reacción" : "reacciones"}
    </button>
  );
}

export default function ForumPostCard({
  post,
  onPostClick,
  onReact,
  onDeletePost,
  isSaved,
  onToggleSave,
  onTogglePin,
  pinnedCount = 0,
  onEditPost,
  isPinnedAnim,
  currentUserId,
  notify,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onToggleCommentLike,
  onShare,
}) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [showOptions, setShowOptions] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pinToast, setPinToast] = useState(null);

  // Comentarios
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const commentsRef = useRef(null);
  const loadedCommentsForRef = useRef(null);

  // Modal de reacciones
  const [showReactions, setShowReactions] = useState(false);
  const [reactionsList, setReactionsList] = useState([]);
  const [reactionsLoading, setReactionsLoading] = useState(false);

  // Modal compartir
  const [showShare, setShowShare] = useState(false);

  const isOwnPost = post.autorId != null && user != null && post.autorId === user?.id;
  const isShelter = post.accountType === "shelter";
  const accountInfo = isShelter ? accountTypes.shelter : accountTypes.user;
  const AccountIcon = accountInfo.icon;

  const shareUrl = `${window.location.origin}${window.location.pathname}?post=${post.id}`;

  const loadComments = async (force = false) => {
    if (!force && loadedCommentsForRef.current === post.id) return;
    loadedCommentsForRef.current = post.id;
    setCommentsLoading(true);
    try {
      const data = await listarComentarios(post.id);
      setComments((data || []).map((c) => mapComentario(c, currentUserId ?? user?.id)));
    } catch {
      // Respaldo: si el endpoint de comentarios no está disponible, se usa el
      // detalle de la publicación (que también incluye los comentarios).
      try {
        const detalle = await obtenerPost(post.id);
        setComments((detalle.comentarios || []).map((c) => mapComentario(c, currentUserId ?? user?.id)));
      } catch {
        notify?.("No se pudieron cargar los comentarios", "error");
      }
    } finally {
      setCommentsLoading(false);
    }
  };

  // Carga automática de comentarios cuando la publicación tiene comentarios,
  // para que se muestren debajo de la publicación sin tener que pulsar nada.
  useEffect(() => {
    if ((post.commentsCount || 0) <= 0) return;
    const t = setTimeout(() => loadComments(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const openReactions = async () => {
    setShowReactions(true);
    setReactionsLoading(true);
    try {
      const data = await obtenerReacciones(post.id);
      setReactionsList(data || []);
    } catch {
      setReactionsList([]);
      notify?.("No se pudieron cargar las reacciones", "error");
    } finally {
      setReactionsLoading(false);
    }
  };

  const handleAddComment = async (postId, text, parentId) => {
    const mapped = await onAddComment(postId, text, parentId);
    setComments((prev) => [...prev, mapped]);
    return mapped;
  };

  const handleEditComment = async (comentarioId, text) => {
    const mapped = await onEditComment(comentarioId, text);
    setComments((prev) => prev.map((c) => (c.id === comentarioId ? { ...c, ...mapped, replies: c.replies } : c)));
    return mapped;
  };

  const handleDeleteComment = async (comentarioId) => {
    await onDeleteComment(post.id, comentarioId);
    setComments((prev) => prev.filter((c) => c.id !== comentarioId));
  };

  const handleToggleCommentLike = async (comment) => {
    const res = await onToggleCommentLike(comment);
    setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, liked: !!res.activo, likes: res.likes } : c)));
  };

  const handleShare = () => {
    onShare?.(post.id).catch(() => {});
  };

  const renderOptions = () => {
    if (isOwnPost) {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditPost?.(post)}
            className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5" : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"}`}
            title="Editar publicación"
          >
            <Edit3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
            title="Eliminar publicación"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      );
    }
    return (
      <div className="relative">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
        {showOptions && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)}></div>
            <div className={`absolute right-0 top-full mt-1 w-52 py-2 rounded-2xl shadow-xl z-20 ${isDark ? "bg-dark-card border border-dark-border" : "bg-white border border-gray-100"}`}>
              <button
                onClick={() => { onToggleSave?.(post.id); setShowOptions(false); }}
                className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500 text-amber-500" : ""}`} />
                {isSaved ? "Guardado" : "Guardar"}
              </button>
              <button
                onClick={() => { setShowOptions(false); notify?.("Reporte enviado. ¡Gracias!", "success"); }}
                className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${isDark ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
              >
                <Flag className="w-4 h-4" />
                Reportar
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <article
      className={`rounded-2xl overflow-hidden transition-all duration-300 hover-lift ${
        isDark ? "bg-dark-card border border-dark-border" : "bg-white shadow-md shadow-gray-100/50"
      } ${
        post.isPinned
          ? isDark
            ? "border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent shadow-lg shadow-amber-900/20"
            : "border border-amber-300/60 bg-gradient-to-b from-amber-50/70 to-white shadow-lg shadow-amber-100/40"
          : ""
      } ${isPinnedAnim ? "animate-pinned-in" : ""}`}
    >
      {/* Pinned Indicator */}
      {post.isPinned && (
        <div className={`flex items-center gap-2 px-5 sm:px-7 py-3 text-sm font-semibold border-b ${
          isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-700 border-amber-200"
        }`}>
          <Pin className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-500"}`} />
          Publicación destacada
        </div>
      )}

      <div className="p-5 sm:p-6">
        {/* ===== Header ===== */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => onPostClick?.(post)} className="relative shrink-0">
              {post.avatar ? (
                <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isDark ? "border-dark-border" : "border-gray-100"}`}>
                  <img src={post.avatar} alt={post.author} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(post.author)} flex items-center justify-center text-white text-base font-bold`}>
                  {getInitials(post.author)}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${accountInfo.bg} border-2 ${isDark ? "border-dark-card" : "border-white"} flex items-center justify-center`}
              >
                <AccountIcon className={`w-3 h-3 ${accountInfo.text}`} />
              </span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPostClick?.(post)}
                  className={`font-bold text-sm sm:text-base truncate hover:text-rose-500 transition-colors ${isDark ? "text-dark-text" : "text-gray-900"}`}
                >
                  {post.author}
                </button>
                {post.badges?.includes("verified") && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${isDark ? "bg-orange-500/15 text-orange-300" : "bg-orange-100 text-orange-700"}`}>
                    <Shield className="w-3 h-3" />
                    Refugio
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-xs flex items-center gap-1 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  <Clock className="w-3 h-3" />
                  {post.time}
                </span>
                <span className={`w-1 h-1 rounded-full ${isDark ? "bg-dark-border" : "bg-gray-300"}`}></span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? "bg-rose-500/10 text-rose-300" : "bg-rose-50 text-rose-700"}`}>
                  {post.category}
                </span>
                {post.compartidos > 0 && (
                  <span className={`text-xs flex items-center gap-1 ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
                    <Share2 className="w-3 h-3" />
                    {post.compartidos}
                  </span>
                )}
              </div>
            </div>
          </div>

          {renderOptions()}
        </div>

        {/* ===== Content ===== */}
        <button onClick={() => onPostClick?.(post)} className="w-full text-left">
          <h3 className={`text-xl sm:text-2xl font-bold mb-2 font-display hover:text-rose-500 transition-colors leading-tight ${isDark ? "text-dark-text" : "text-gray-900"}`}>
            {post.title}
          </h3>
          <p className={`text-sm sm:text-base leading-relaxed mb-3 whitespace-pre-line ${isDark ? "text-dark-text-secondary" : "text-gray-600"}`}>
            {post.content}
          </p>
        </button>

        {/* ===== Images ===== */}
        {post.images && post.images.length > 0 && (
          <div className={`mb-3 rounded-xl overflow-hidden ${post.images.length === 1 ? "" : "grid grid-cols-2 gap-1.5"}`}>
            {post.images.slice(0, 4).map((img, idx) => {
              const imgUrl = typeof img === "string" ? img : img?.url;
              return (
                <button key={idx} onClick={() => setExpandedImage(imgUrl)} className="relative overflow-hidden">
                  <img
                    src={imgUrl}
                    alt={`Imagen ${idx + 1}`}
                    className="w-full h-48 sm:h-56 object-cover hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  {idx === 3 && post.images.length > 4 && (
                    <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
                      +{post.images.length - 4}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ===== Tags ===== */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.map((tag) => (
              <button
                key={tag}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all ${isDark ? "bg-white/5 text-dark-text-secondary hover:bg-rose-500/20 hover:text-rose-300" : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700"}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* ===== Stats row ===== */}
        <div className={`flex items-center justify-between border-t pt-3 mt-1 ${isDark ? "border-dark-border" : "border-gray-100"}`}>
          <ReactionSummary reactions={post.reactions} onOpen={openReactions} />
          <button
            onClick={() => { loadComments(true); commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }}
            className={`text-sm font-medium transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-500 hover:text-gray-700"}`}
          >
            {post.commentsCount || 0} {post.commentsCount === 1 ? "comentario" : "comentarios"}
          </button>
        </div>

        {/* ===== Actions row ===== */}
        <div className="grid grid-cols-3 gap-1 mt-2">
          <ReactionButton postId={post.id} myReaction={post.miReaccion} onReact={onReact} compact className="w-full" />
          <button
            onClick={() => { loadComments(true); commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all active:scale-95 ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
          >
            <MessageCircle className="w-5 h-5" />
            Comentar
          </button>
          <button
            onClick={() => setShowShare(true)}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all active:scale-95 ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
          >
            <Share2 className="w-5 h-5" />
            Compartir
          </button>
        </div>

        {/* Save / Pin (secundarios) */}
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => onToggleSave?.(post.id)}
            className={`p-2 rounded-lg transition-all ${isSaved ? "text-amber-500 bg-amber-100 dark:bg-amber-500/15" : isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"}`}
            title={isSaved ? "Quitar de guardadas" : "Guardar publicación"}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500" : ""}`} />
          </button>
          {!isOwnPost && (
            <button
              onClick={() => {
                if (!post.isPinned && pinnedCount >= 3) {
                  setPinToast("Máximo 3 publicaciones fijadas");
                  setTimeout(() => setPinToast(null), 2500);
                  return;
                }
                const nuevoEstado = !post.isPinned;
                setPinToast(nuevoEstado ? "Publicación fijada" : "Publicación desfijada");
                setTimeout(() => setPinToast(null), 2500);
                onTogglePin?.(post.id);
              }}
              className={`p-2 rounded-lg transition-all ${post.isPinned ? "text-amber-500 bg-amber-100 dark:bg-amber-500/15" : isDark ? "text-dark-text-secondary hover:text-amber-400 hover:bg-white/5" : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"}`}
              title={post.isPinned ? "Desfijar publicación" : "Fijar publicación"}
            >
              <Pin className={`w-4 h-4 ${post.isPinned ? "fill-amber-500" : ""}`} />
            </button>
          )}
        </div>

        {/* ===== Comments section (siempre visible) ===== */}
        <div
          ref={commentsRef}
          id={`forum-comments-${post.id}`}
          className={`mt-4 pt-4 border-t ${isDark ? "border-dark-border" : "border-gray-100"}`}
        >
          {commentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`} />
            </div>
          ) : (
            <CommentsSection
              postId={post.id}
              comments={comments}
              currentUserId={currentUserId}
              onAddComment={handleAddComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onToggleCommentLike={handleToggleCommentLike}
              notify={notify}
            />
          )}
        </div>
      </div>

      {/* ===== Toast de fijado ===== */}
      {pinToast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold animate-scale-in ${isDark ? "bg-dark-card border border-dark-border text-dark-text" : "bg-white text-gray-900"}`}>
          <Pin className="w-4 h-4 text-amber-500" />
          {pinToast}
        </div>
      )}

      {/* ===== Modal quién reaccionó ===== */}
      <ReactionsModal
        isOpen={showReactions}
        onClose={() => setShowReactions(false)}
        reactions={reactionsList}
        loading={reactionsLoading}
      />

      {/* ===== Modal compartir ===== */}
      <ShareMenu
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        url={shareUrl}
        title={post.title}
        notify={notify}
        onTrack={handleShare}
      />

      {/* ===== Confirmar eliminación de la publicación ===== */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDeletePost?.(post.id);
        }}
        title="¿Estás seguro de eliminar esta publicación?"
        message="Esta publicación se eliminará permanentemente y no podrás recuperarla. Sus comentarios y reacciones también se borrarán."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* ===== Imagen expandida ===== */}
      {expandedImage &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-modal-overlay" onClick={() => setExpandedImage(null)}>
            <img src={expandedImage} alt="Imagen ampliada" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
          </div>,
          document.body
        )}
    </article>
  );
}
