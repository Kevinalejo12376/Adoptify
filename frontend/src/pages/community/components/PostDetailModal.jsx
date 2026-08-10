import { useEffect, useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import {
  Bookmark,
  Flag,
  ArrowLeft,
  Clock,
  User,
  Shield,
  MessageCircle,
  Share2,
  Edit3,
  Trash2,
} from "lucide-react";
import ReactionButton from "./ReactionPicker";
import CommentsSection from "./CommentsSection";
import ReactionsModal from "./ReactionsModal";
import ShareMenu from "./ShareMenu";
import ConfirmModal from "../../../components/ConfirmModal";
import { obtenerReacciones } from "../../../api/foro";
import { mapComentario, REACTION_TYPES, getTotalReactions } from "../forumData";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};

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
            <span key={r.id} className={`w-6 h-6 rounded-full flex items-center justify-center ring-2 ${r.softBg} ${r.darkSoftBg} ${r.softBorder.replace("border-", "ring-")} ${r.darkSoftBorder.replace("dark:border-", "dark:ring-")}`}>
              <Icon className={`w-3.5 h-3.5 ${r.color}`} fill="currentColor" />
            </span>
          );
        })}
      </span>
      {total} {total === 1 ? "reacción" : "reacciones"}
    </button>
  );
}

export default function PostDetailModal({
  post,
  isOpen,
  onClose,
  onReact,
  currentUserId,
  notify,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onToggleCommentLike,
  onShare,
  onToggleSave,
  isSaved,
}) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [comments, setComments] = useState([]);
  const [showReactions, setShowReactions] = useState(false);
  const [reactionsList, setReactionsList] = useState([]);
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentUserIdResolved = currentUserId ?? user?.id;

  useEffect(() => {
    if (!post || !isOpen) return;
    // Se difiere para no llamar setState de forma síncrona dentro del efecto.
    const t = setTimeout(() => {
      setComments((post.comments || []).map((c) => mapComentario(c, currentUserIdResolved)));
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, isOpen]);

  if (!isOpen || !post) return null;

  const isShelter = post.accountType === "shelter";
  const isOwnPost = post.autorId != null && user != null && post.autorId === user?.id;
  const shareUrl = `${window.location.origin}${window.location.pathname}?post=${post.id}`;

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
          <div className="flex items-center gap-1">
            {isOwnPost && (
              <>
                <button onClick={() => notify?.("La edición se realiza desde tu publicación en el feed", "info")} className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5" : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"}`} title="Editar">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={() => onToggleSave?.(post.id)} className={`p-2 rounded-lg transition-all ${isSaved ? "text-amber-500 bg-amber-100 dark:bg-amber-500/15" : isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"}`} title={isSaved ? "Quitar de guardadas" : "Guardar"}>
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500" : ""}`} />
            </button>
            <button onClick={() => setShowShare(true)} className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5" : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"}`} title="Compartir">
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={() => notify?.("Reporte enviado. ¡Gracias!", "success")} className={`p-2 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} title="Reportar">
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Author */}
          <div className="flex items-center gap-3 mb-4">
            {post.avatar ? (
              <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isDark ? "border-dark-border" : "border-gray-100"} shrink-0`}>
                <img src={post.avatar} alt={post.author} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${isShelter ? "from-orange-500 to-rose-500" : "from-amber-400 to-orange-500"} flex items-center justify-center text-white text-base font-bold shrink-0`}>
                {getInitials(post.author)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>{post.author}</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isShelter ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"}`}>
                  {isShelter ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {isShelter ? "Refugio" : "Usuario"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs flex items-center gap-1 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                  <Clock className="w-3 h-3" />
                  {post.time}
                </span>
                <span className={`w-1 h-1 rounded-full ${isDark ? "bg-dark-border" : "bg-gray-300"}`}></span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? "bg-rose-500/10 text-rose-300" : "bg-rose-50 text-rose-700"}`}>{post.category}</span>
              </div>
            </div>
          </div>

          {/* Title & content */}
          <h2 className={`text-2xl font-bold mb-3 font-display ${isDark ? "text-dark-text" : "text-gray-900"}`}>{post.title}</h2>
          <p className={`text-sm sm:text-base leading-relaxed mb-4 whitespace-pre-line ${isDark ? "text-dark-text-secondary" : "text-gray-600"}`}>{post.content}</p>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className={`mb-4 rounded-xl overflow-hidden ${post.images.length === 1 ? "" : "grid grid-cols-2 gap-1.5"}`}>
              {post.images.map((img, idx) => (
                <img key={idx} src={typeof img === "string" ? img : img?.url} alt="" className="w-full h-56 object-cover" />
              ))}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <span key={tag} className={`text-xs px-2.5 py-1 rounded-lg ${isDark ? "bg-white/5 text-dark-text-secondary" : "bg-gray-100 text-gray-600"}`}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats + actions */}
          <div className={`border-t pt-3 ${isDark ? "border-dark-border" : "border-gray-100"}`}>
            <div className="flex items-center justify-between">
              <ReactionSummary reactions={post.reactions} onOpen={openReactions} />
              <span className={`text-sm font-medium ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                {comments.length} {comments.length === 1 ? "comentario" : "comentarios"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 mt-2">
              <ReactionButton postId={post.id} myReaction={post.miReaccion} onReact={onReact} compact className="w-full" />
              <button
                onClick={() => document.getElementById("forum-comments")?.scrollIntoView({ behavior: "smooth", block: "center" })}
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
          </div>

          {/* Comments */}
          <div id="forum-comments" className={`mt-6 pt-5 border-t scroll-mt-24 ${isDark ? "border-dark-border" : "border-gray-100"}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-dark-text" : "text-gray-900"}`}>
              Comentarios ({comments.length})
            </h3>
            <CommentsSection
              postId={post.id}
              comments={comments}
              currentUserId={currentUserIdResolved}
              onAddComment={handleAddComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onToggleCommentLike={handleToggleCommentLike}
              notify={notify}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReactionsModal isOpen={showReactions} onClose={() => setShowReactions(false)} reactions={reactionsList} loading={reactionsLoading} />
      <ShareMenu isOpen={showShare} onClose={() => setShowShare(false)} url={shareUrl} title={post.title} notify={notify} onTrack={() => onShare?.(post.id).catch(() => {})} />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { setShowDeleteConfirm(false); onClose(); }}
        title="Eliminar publicación"
        message="Para eliminar esta publicación ve a tu perfil y usa la opción de eliminar en la tarjeta."
        confirmText="Entendido"
        cancelText="Cerrar"
        type="warning"
      />
    </div>
  );
}
