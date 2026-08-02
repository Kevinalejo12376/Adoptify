import React, { useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import ConfirmModal from "../../../components/ConfirmModal";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  MoreHorizontal,
  ThumbsUp,
  Smile,
  Sparkles,
  Star,
  Clock,
  User,
  Shield,
  ShieldCheck,
  Award,
  Pin,
  Trash2,
  Edit3,
} from "lucide-react";

const accountTypes = {
  user: {
    label: "Usuario",
    icon: User,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-100 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  shelter: {
    label: "Refugio",
    icon: Shield,
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

const reactionTypes = [
  { id: "like", icon: ThumbsUp, label: "Me gusta", color: "text-blue-500", activeBg: "bg-blue-100 dark:bg-blue-500/15" },
  { id: "love", icon: Heart, label: "Me encanta", color: "text-rose-500", activeBg: "bg-rose-100 dark:bg-rose-500/15" },
  { id: "celebrate", icon: Star, label: "Felicidades", color: "text-amber-500", activeBg: "bg-amber-100 dark:bg-amber-500/15" },
  { id: "support", icon: ShieldCheck, label: "Apoyo", color: "text-emerald-500", activeBg: "bg-emerald-100 dark:bg-emerald-500/15" },
  { id: "funny", icon: Smile, label: "Divertido", color: "text-violet-500", activeBg: "bg-violet-100 dark:bg-violet-500/15" },
];

const userBadges = {
  expert: { label: "Experto", icon: Award, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-500/15" },
  contributor: { label: "Top Colaborador", icon: Star, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-500/15" },
  helper: { label: "Ayudante", icon: Heart, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-500/15" },
  verified: { label: "Verificado", icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/15" },
};

function ReactionBar({ postId, reactions: initialReactions, onReactionChange }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [userReaction, setUserReaction] = useState(null);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState(initialReactions);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  const handleReaction = (reactionId) => {
    if (userReaction === reactionId) {
      setReactions((prev) => ({ ...prev, [reactionId]: prev[reactionId] - 1 }));
      setUserReaction(null);
    } else {
      if (userReaction) {
        setReactions((prev) => ({ ...prev, [userReaction]: prev[userReaction] - 1 }));
      }
      setReactions((prev) => ({ ...prev, [reactionId]: prev[reactionId] + 1 }));
      setUserReaction(reactionId);
    }
    setShowReactions(false);
    onReactionChange?.(postId, reactionId);
  };

  const getActiveReaction = () => {
    if (!userReaction) return null;
    return reactionTypes.find((r) => r.id === userReaction);
  };

  const activeReaction = getActiveReaction();

  return (
    <div className="relative">
      <button
        onClick={() => setShowReactions(!showReactions)}
        onMouseEnter={() => setShowReactions(true)}
        onMouseLeave={() => setShowReactions(false)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
          userReaction
            ? `${activeReaction.activeBg} ${activeReaction.color}`
            : isDark
            ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        }`}
      >
        {userReaction ? (
          <activeReaction.icon className={`w-5 h-5 ${activeReaction.color}`} />
        ) : (
          <ThumbsUp className="w-5 h-5" />
        )}
        <span className="text-base">{totalReactions > 0 ? totalReactions : ""}</span>
      </button>

      {/* Reactions Popup */}
      {showReactions && (
        <div
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
          className={`absolute bottom-full left-0 mb-2 flex items-center gap-1 px-4 py-3 rounded-2xl shadow-xl ${
            isDark
              ? "bg-dark-card border border-dark-border"
              : "bg-white border border-gray-100"
          } animate-scale-in z-30`}
        >
          {reactionTypes.map((reaction) => {
            const Icon = reaction.icon;
            const isActive = userReaction === reaction.id;
            return (
              <button
                key={reaction.id}
                onClick={() => handleReaction(reaction.id)}
                className={`p-2 rounded-xl transition-all ${
                  isActive
                    ? `${reaction.activeBg} ${reaction.color} scale-110`
                    : isDark
                    ? "text-dark-text-secondary hover:bg-white/5 hover:text-dark-text"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
                title={reaction.label}
              >
                <Icon className={`w-6 h-6 ${isActive ? reaction.color : ""}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommentsPreview({ comments, onViewAll }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-dark-border">
      {comments.slice(0, 2).map((comment) => (
        <div key={comment.id} className="flex gap-3 mb-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${
            comment.isShelter ? "from-emerald-500 to-teal-500" : "from-rose-500 to-amber-500"
          } flex items-center justify-center text-white text-sm font-bold shrink-0`}>
            {comment.author.charAt(0)}
          </div>
          <div className={`flex-1 rounded-xl px-4 py-3 ${
            isDark ? "bg-white/5" : "bg-gray-50"
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-sm font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                {comment.author}
              </span>
              {comment.isShelter && (
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? "text-dark-text-secondary" : "text-gray-600"}`}>
              {comment.content}
            </p>
          </div>
        </div>
      ))}
      {comments.length > 2 && (
        <button
          onClick={onViewAll}
          className={`text-sm font-semibold transition-all ${
            isDark ? "text-rose-400 hover:text-rose-300" : "text-rose-600 hover:text-rose-700"
          }`}
        >
          Ver los {comments.length} comentarios
        </button>
      )}
    </div>
  );
}

function CommentInput({ onSend }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim()) {
      onSend?.(text);
      setText("");
    }
  };

  return (
    <div className="flex items-center gap-3 mt-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Escribe un comentario..."
        className={`flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
          isDark
            ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary"
            : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"
        }`}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className={`p-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          isDark
            ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5"
            : "text-gray-500 hover:text-rose-500 hover:bg-rose-50"
        }`}
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function ForumPostCard({ post, onPostClick, onReactionChange, onDeletePost, isSaved, onToggleSave, onTogglePin, pinnedCount = 0, onEditPost, isPinnedAnim }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const [showOptions, setShowOptions] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pinToast, setPinToast] = useState(null);

  // Solo el autor de la publicacion puede eliminarla o fijarla.
  const isOwnPost = post.autorId != null && user != null && post.autorId === user?.id;

  const isShelter = post.accountType === "shelter";
  const accountInfo = isShelter ? accountTypes.shelter : accountTypes.user;

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      "from-rose-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-violet-500 to-purple-600",
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-cyan-500 to-blue-600",
    ];
    if (!name) return colors[0];
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <article
      className={`rounded-2xl overflow-hidden transition-all duration-300 hover-lift ${
        isDark
          ? "bg-dark-card border border-dark-border"
          : "bg-white shadow-md shadow-gray-100/50"
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
        <div className={`flex items-center gap-2 px-7 py-3 text-sm font-semibold border-b ${
          isDark
            ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
            : "bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-700 border-amber-200"
        }`}>
          <Pin className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-500"}`} />
          Publicación destacada
        </div>
      )}

      <div className="p-7">
        {/* Header: Avatar + Author Info + Category + Options */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            {/* Avatar - MUCH BIGGER */}
            <button
              onClick={() => onPostClick?.(post)}
              className="relative shrink-0"
            >
              <div
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarColor(post.author)} flex items-center justify-center text-white text-xl font-bold`}
              >
                {getInitials(post.author)}
              </div>
              {/* Account Type Badge */}
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${accountInfo.bg} border-2 ${
                  isDark ? "border-dark-card" : "border-white"
                } flex items-center justify-center`}
              >
                <accountInfo.icon className={`w-3.5 h-3.5 ${accountInfo.text}`} />
              </div>
            </button>

            {/* Author Info */}
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPostClick?.(post)}
                  className={`font-bold text-base hover:text-rose-500 transition-colors ${
                    isDark ? "text-dark-text" : "text-gray-900"
                  }`}
                >
                  {post.author}
                </button>
                {/* Badges - BIGGER */}
                {post.badges?.map((badge) => {
                  const badgeInfo = userBadges[badge];
                  if (!badgeInfo) return null;
                  const BadgeIcon = badgeInfo.icon;
                  return (
                    <span
                      key={badge}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badgeInfo.bg} ${badgeInfo.color}`}
                      title={badgeInfo.label}
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                      {badgeInfo.label}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className={`text-sm flex items-center gap-1.5 ${
                  isDark ? "text-dark-text-secondary" : "text-gray-500"
                }`}>
                  <Clock className="w-4 h-4" />
                  {post.time}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isDark ? "bg-dark-border" : "bg-gray-300"
                }`}></span>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  isDark
                    ? "bg-rose-500/10 text-rose-300"
                    : "bg-rose-50 text-rose-700"
                }`}>
                  {post.category}
                </span>
                {/* AI Summary Badge - AI Ready */}
                {post.comments?.length > 5 && (
                  <span className={`text-sm px-2 py-1 rounded-full flex items-center gap-1.5 ${
                    isDark ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-600"
                  }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Resumir
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Options / Edit / Delete */}
          <div className="relative">
            {isOwnPost ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEditPost?.(post)}
                  className={`p-2 rounded-lg transition-all ${
                    isDark
                      ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5"
                      : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                  }`}
                  title="Editar publicación"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`p-2 rounded-lg transition-all ${
                    isDark
                      ? "text-dark-text-secondary hover:text-red-400 hover:bg-red-500/10"
                      : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                  }`}
                  title="Eliminar publicación"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className={`p-2 rounded-lg transition-all ${
                    isDark
                      ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>
                {showOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)}></div>
                    <div className={`absolute right-0 top-full mt-1 w-52 py-2 rounded-2xl shadow-xl z-20 ${
                      isDark
                        ? "bg-dark-card border border-dark-border"
                        : "bg-white border border-gray-100"
                    }`}>
                      <button
                        onClick={() => { onToggleSave?.(post.id); setShowOptions(false); }}
                        className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${
                          isDark
                            ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500 text-amber-500" : ""}`} />
                        {isSaved ? "Guardado" : "Guardar"}
                      </button>
                      <button
                        onClick={() => { setShowOptions(false); navigator.clipboard?.writeText(window.location.href); }}
                        className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${
                          isDark
                            ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        <Share2 className="w-4 h-4" />
                        Compartir
                      </button>
                      <button
                        onClick={() => setShowOptions(false)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm w-full transition-colors ${
                          isDark
                            ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            : "text-red-600 hover:bg-red-50"
                        }`}
                      >
                        <Flag className="w-4 h-4" />
                        Reportar
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content - BIGGER TEXT */}
        <button
          onClick={() => onPostClick?.(post)}
          className="w-full text-left"
        >
          <h3 className={`text-2xl font-bold mb-3 font-display hover:text-rose-500 transition-colors leading-tight ${
            isDark ? "text-dark-text" : "text-gray-900"
          }`}>
            {post.title}
          </h3>
          <p className={`text-base leading-relaxed mb-4 ${
            isDark ? "text-dark-text-secondary" : "text-gray-600"
          }`}>
            {post.content}
          </p>
        </button>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className={`mb-4 rounded-xl overflow-hidden ${
            post.images.length === 1 ? "" : "grid grid-cols-2 gap-2"
          }`}>
            {post.images.slice(0, 4).map((img, idx) => (
              <button
                key={idx}
                onClick={() => setExpandedImage(img)}
                className={`relative overflow-hidden ${
                  idx === 3 && post.images.length > 4 ? "cursor-pointer" : ""
                }`}
              >
                <img
                  src={img}
                  alt={`Imagen ${idx + 1}`}
                  className="w-full h-56 object-cover hover:scale-105 transition-transform duration-500"
                />
                {idx === 3 && post.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">+{post.images.length - 4}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tags - BIGGER */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <button
                key={tag}
                className={`text-sm px-3 py-1.5 rounded-xl transition-all ${
                  isDark
                    ? "bg-white/5 text-dark-text-secondary hover:bg-rose-500/20 hover:text-rose-300"
                    : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className={`border-t ${
          isDark ? "border-dark-border" : "border-gray-100"
        } mb-4`}></div>

        {/* Actions Bar - BIGGER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Reactions - BIGGER */}
            <ReactionBar
              postId={post.id}
              reactions={post.reactions || { like: 0, love: 0, celebrate: 0, support: 0, funny: 0 }}
              onReactionChange={onReactionChange}
            />

            {/* Comments Count - BIGGER */}
            <button
              onClick={() => onPostClick?.(post)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              {post.commentsCount ?? post.comments?.length ?? 0}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Save - BIGGER */}
            <button
              onClick={() => onToggleSave?.(post.id)}
              className={`p-2 rounded-xl transition-all ${
                isSaved
                  ? "text-amber-500 bg-amber-100 dark:bg-amber-500/15"
                  : isDark
                  ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                  : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
              }`}
              title={isSaved ? "Quitar de guardadas" : "Guardar publicación"}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? "fill-amber-500" : ""}`} />
            </button>

            {/* Pin - solo disponible en publicaciones de OTROS usuarios (maximo 3 fijadas) */}
            {!isOwnPost && (
              <button
                onClick={() => {
                  // Límite de 3 publicaciones fijadas a la vez.
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
                className={`p-2 rounded-xl transition-all ${
                  post.isPinned
                    ? "text-amber-500 bg-amber-100 dark:bg-amber-500/15"
                    : isDark
                    ? "text-dark-text-secondary hover:text-amber-400 hover:bg-white/5"
                    : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
                }`}
                title={post.isPinned ? "Desfijar publicación" : "Fijar publicación"}
              >
                <Pin className={`w-5 h-5 ${post.isPinned ? "fill-amber-500" : ""}`} />
              </button>
            )}

            {/* Share - BIGGER */}
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className={`p-2 rounded-xl transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5"
                  : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"
              }`}
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Report - BIGGER */}
            <button
              className={`p-2 rounded-xl transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-red-400 hover:bg-red-500/10"
                  : "text-gray-400 hover:text-red-500 hover:bg-red-50"
              }`}
              title="Reportar"
            >
              <Flag className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comments Preview */}
        {post.comments && post.comments.length > 0 && (
          <CommentsPreview
            comments={post.comments}
            onViewAll={() => onPostClick?.(post)}
          />
        )}

        {/* Comment Input */}
        <CommentInput onSend={(text) => console.log("Comment:", text)} />
      </div>

      {/* AI Summary Button - AI Ready (shown on posts with many comments) */}
      {post.comments?.length > 10 && (
        <div className={`px-7 py-3 border-t ${
          isDark ? "border-dark-border bg-violet-500/5" : "border-gray-100 bg-violet-50/50"
        }`}>
          <button className={`flex items-center gap-2 text-sm font-medium transition-all ${
            isDark ? "text-violet-300 hover:text-violet-200" : "text-violet-600 hover:text-violet-700"
          }`}>
            <Sparkles className="w-4 h-4" />
            Resumir comentarios con IA
          </button>
        </div>
      )}

      {/* Toast de fijado */}
      {pinToast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold animate-scale-in ${
          isDark ? "bg-dark-card border border-dark-border text-dark-text" : "bg-white text-gray-900"
        }`}>
          <Pin className="w-4 h-4 text-amber-500" />
          {pinToast}
        </div>
      )}

      {/* Confirmar eliminacion de la publicacion */}
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
    </article>
  );
}
