import React, { useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { reaccionarComentario } from "../../../api/foro";
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  ArrowLeft,
  Clock,
  User,
  Shield,
  ThumbsUp,
  Star,
  Smile,
  ShieldCheck,
  Reply,
  MoreHorizontal,
  Sparkles,
  Send,
  Image as ImageIcon,
} from "lucide-react";

const reactionTypes = [
  { id: "like", icon: ThumbsUp, label: "Me gusta", color: "text-blue-500", activeBg: "bg-blue-100 dark:bg-blue-500/15" },
  { id: "love", icon: Heart, label: "Me encanta", color: "text-rose-500", activeBg: "bg-rose-100 dark:bg-rose-500/15" },
  { id: "celebrate", icon: Star, label: "Felicidades", color: "text-amber-500", activeBg: "bg-amber-100 dark:bg-amber-500/15" },
  { id: "support", icon: ShieldCheck, label: "Apoyo", color: "text-emerald-500", activeBg: "bg-emerald-100 dark:bg-emerald-500/15" },
  { id: "funny", icon: Smile, label: "Divertido", color: "text-violet-500", activeBg: "bg-violet-100 dark:bg-violet-500/15" },
];

function CommentItem({ comment, depth = 0, isDark }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes || 0);
  const [likeBusy, setLikeBusy] = useState(false);

  const isShelter = comment.isShelter;

  const handleLikeComment = async () => {
    if (!comment.id || likeBusy) return;
    setLikeBusy(true);
    // Actualizacion optimista
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      const res = await reaccionarComentario(comment.id);
      if (res) {
        setLiked(!!res.activo);
        if (typeof res.likes === "number") setLikeCount(res.likes);
      }
    } catch {
      // revierte si falla
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeBusy(false);
    }
  };

  return (
    <div className={`${depth > 0 ? "ml-8 pl-4 border-l-2 border-gray-100 dark:border-dark-border" : ""}`}>
      <div className="flex gap-3 py-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${
          isShelter ? "from-emerald-500 to-teal-500" : "from-rose-500 to-amber-500"
        } flex items-center justify-center text-white text-sm font-bold shrink-0`}>
          {comment.author.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>
              {comment.author}
            </span>
            {isShelter && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
                isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"
              }`}>
                <Shield className="w-3 h-3" />
                Refugio
              </span>
            )}
            {comment.isAuthor && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                isDark ? "bg-rose-500/10 text-rose-300" : "bg-rose-50 text-rose-600"
              }`}>Autor</span>
            )}
            <span className={`text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
              {comment.time}
            </span>
          </div>

          <p className={`text-sm leading-relaxed mb-2 ${
            isDark ? "text-dark-text-secondary" : "text-gray-600"
          }`}>
            {comment.content}
          </p>

          {/* Comment Images */}
          {comment.images && comment.images.length > 0 && (
            <div className="flex gap-2 mb-2">
              {comment.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="w-24 h-24 rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleLikeComment}
              disabled={likeBusy || !comment.id}
              className={`flex items-center gap-1 text-xs font-medium transition-all disabled:opacity-60 ${
                liked
                  ? "text-rose-500"
                  : isDark
                  ? "text-dark-text-secondary hover:text-dark-text"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-500" : ""}`} />
              {likeCount}
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className={`flex items-center gap-1 text-xs font-medium transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-dark-text"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Reply className="w-3.5 h-3.5" />
              Responder
            </button>
          </div>

          {/* Reply Input */}
          {showReplyInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escribe una respuesta..."
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isDark
                    ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary"
                    : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"
                }`}
              />
              <button className={`p-1.5 rounded-lg transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5"
                  : "text-gray-500 hover:text-rose-500 hover:bg-rose-50"
              }`}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies?.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              isDark={isDark}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PostDetailModal({ post, isOpen, onClose, onComment, onReact }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [newComment, setNewComment] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const [sending, setSending] = useState(false);

  if (!isOpen || !post) return null;

  const isShelter = post.accountType === "shelter";

  const handleSendComment = async () => {
    const text = newComment.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onComment?.(post.id, text);
      setNewComment("");
    } catch (e) {
      // se conserva el texto si falla
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(" ");
    return names.length >= 2
      ? (names[0][0] + names[1][0]).toUpperCase()
      : names[0][0].toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${
          isDark ? "bg-dark-card border border-dark-border" : "bg-white"
        } animate-modal-content`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? "border-dark-border" : "border-gray-100"
        }`}>
          <button
            onClick={onClose}
            className={`flex items-center gap-2 text-sm font-medium transition-all ${
              isDark
                ? "text-dark-text-secondary hover:text-dark-text"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al foro
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-2 rounded-lg transition-all ${
                isSaved
                  ? "text-amber-500 bg-amber-100 dark:bg-amber-500/15"
                  : isDark
                  ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                  : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500" : ""}`} />
            </button>
            <button className={`p-2 rounded-lg transition-all ${
              isDark
                ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}>
              <Share2 className="w-4 h-4" />
            </button>
            <button className={`p-2 rounded-lg transition-all ${
              isDark
                ? "text-dark-text-secondary hover:text-red-400 hover:bg-red-500/10"
                : "text-gray-400 hover:text-red-500 hover:bg-red-50"
            }`}>
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Author Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${
              isShelter ? "from-emerald-500 to-teal-500" : "from-rose-500 to-amber-500"
            } flex items-center justify-center text-white text-lg font-bold shrink-0`}>
              {getInitials(post.author)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>
                  {post.author}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isShelter
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                }`}>
                  {isShelter ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {isShelter ? "Refugio" : "Usuario"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs flex items-center gap-1 ${
                  isDark ? "text-dark-text-secondary" : "text-gray-500"
                }`}>
                  <Clock className="w-3 h-3" />
                  {post.time}
                </span>
                <span className={`w-1 h-1 rounded-full ${
                  isDark ? "bg-dark-border" : "bg-gray-300"
                }`}></span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isDark
                    ? "bg-rose-500/10 text-rose-300"
                    : "bg-rose-50 text-rose-700"
                }`}>
                  {post.category}
                </span>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <h2 className={`text-2xl font-bold mb-3 font-display ${
            isDark ? "text-dark-text" : "text-gray-900"
          }`}>
            {post.title}
          </h2>
          <p className={`text-sm leading-relaxed mb-4 ${
            isDark ? "text-dark-text-secondary" : "text-gray-600"
          }`}>
            {post.content}
          </p>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className={`mb-4 rounded-xl overflow-hidden ${
              post.images.length === 1 ? "" : "grid grid-cols-2 gap-2"
            }`}>
              {post.images.map((img, idx) => (
                <img
                  key={idx}
                  src={typeof img === "string" ? img : img?.url}
                  alt=""
                  className="w-full h-64 object-cover"
                />
              ))}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs px-2.5 py-1 rounded-lg ${
                    isDark
                      ? "bg-white/5 text-dark-text-secondary"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Reactions Bar */}
          <div className="flex items-center gap-2 mb-4">
            {reactionTypes.map((reaction) => {
              const Icon = reaction.icon;
              const isActive = userReaction === reaction.id;
              return (
                <button
                  key={reaction.id}
                  onClick={() => {
                    setUserReaction(isActive ? null : reaction.id);
                    onReact?.(post.id, reaction.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? `${reaction.activeBg} ${reaction.color}`
                      : isDark
                      ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title={reaction.label}
                >
                  <Icon className={`w-4 h-4 ${isActive ? reaction.color : ""}`} />
                  <span>{post.reactions?.[reaction.id] || 0}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className={`border-t mb-4 ${
            isDark ? "border-dark-border" : "border-gray-100"
          }`}></div>

          {/* Comments Section */}
          <div className="mb-4">
            <h3 className={`text-lg font-semibold mb-4 ${
              isDark ? "text-dark-text" : "text-gray-900"
            }`}>
              Comentarios ({post.comments?.length || 0})
            </h3>

            {/* AI Comment Summary - AI Ready */}
            {post.comments?.length > 8 && (
              <div className={`mb-4 p-3 rounded-xl ${
                isDark
                  ? "bg-violet-500/10 border border-violet-500/20"
                  : "bg-violet-50 border border-violet-100"
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${isDark ? "text-violet-300" : "text-violet-600"}`} />
                  <span className={`text-sm font-medium ${isDark ? "text-violet-300" : "text-violet-700"}`}>
                    Resumen de comentarios
                  </span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                    isDark ? "bg-violet-500/15 text-violet-300" : "bg-violet-100 text-violet-600"
                  }`}>
                    IA
                  </span>
                </div>
                <p className={`text-xs mt-1 ${
                  isDark ? "text-dark-text-secondary" : "text-gray-500"
                }`}>
                  La mayoría de los usuarios recomiendan consultar con un veterinario y compartir experiencias positivas. Haz clic para ver el resumen completo.
                </p>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-1">
              {post.comments?.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Comment Input Footer */}
        <div className={`p-4 border-t ${
          isDark ? "border-dark-border" : "border-gray-100"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {getInitials("Tú")}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                placeholder="Escribe un comentario..."
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isDark
                    ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary"
                    : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"
                }`}
              />
              <button className={`p-2 rounded-xl transition-all ${
                isDark
                  ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5"
                  : "text-gray-500 hover:text-rose-500 hover:bg-rose-50"
              }`}>
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleSendComment}
                className={`p-2.5 rounded-xl transition-all ${
                  newComment.trim() && !sending
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg"
                    : isDark
                    ? "bg-dark-border text-dark-text-secondary"
                    : "bg-gray-100 text-gray-400"
                }`}
                disabled={!newComment.trim() || sending}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
