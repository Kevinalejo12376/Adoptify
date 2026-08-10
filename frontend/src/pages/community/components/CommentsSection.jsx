import { useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import ConfirmModal from "../../../components/ConfirmModal";
import {
  Send,
  MoreHorizontal,
  Pencil,
  Trash2,
  Heart,
  Reply,
  Loader2,
  X,
  Check,
} from "lucide-react";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};

function CommentItem({ comment, currentUserId, depth = 0, isDark, onEdit, onDelete, onReply, onToggleLike }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Se usa autorId (campo que genera mapComentario) para saber si el comentario
  // pertenece al usuario actual y así mostrar las opciones Editar/Eliminar.
  const isOwn =
    (comment.autorId != null || comment.autor_id != null) &&
    currentUserId != null &&
    (comment.autorId ?? comment.autor_id) === currentUserId;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(comment.id);
      setConfirmDelete(false);
    } catch {
      // el error se notifica en el padre
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={depth > 0 ? "ml-9 sm:ml-11 pl-3 sm:pl-4 border-l-2 border-gray-100 dark:border-dark-border" : ""}>
      <div className="flex gap-3 py-3">
        {/* Avatar */}
        <div className="shrink-0">
          {comment.avatar ? (
            <div className={`w-9 h-9 rounded-full overflow-hidden border ${isDark ? "border-dark-border" : "border-gray-100"}`}>
              <img src={comment.avatar} alt={comment.author} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${
                comment.isShelter ? "from-orange-500 to-rose-500" : "from-amber-400 to-orange-500"
              } flex items-center justify-center text-white text-xs font-bold`}
            >
              {getInitials(comment.author)}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className={`rounded-2xl px-4 py-3 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-semibold ${isDark ? "text-dark-text" : "text-gray-900"}`}>{comment.author}</span>
              {comment.editado && (
                <span className={`text-[11px] ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>(editado)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
              <span className={`text-[11px] font-semibold ${
                comment.isShelter
                  ? isDark ? "text-orange-300" : "text-orange-600"
                  : isDark ? "text-blue-300" : "text-blue-600"
              }`}>
                {comment.isShelter ? "Refugio" : "Usuario"}
              </span>
              <span className={`text-[11px] ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>· {comment.time}</span>
            </div>
            <p className={`text-sm leading-relaxed whitespace-pre-line break-words ${isDark ? "text-dark-text-secondary" : "text-gray-600"}`}>
              {comment.content}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button
              onClick={() => onToggleLike?.(comment)}
              className={`flex items-center gap-1 text-[11px] font-semibold transition-all ${comment.liked ? "text-rose-500" : isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Heart className={`w-3.5 h-3.5 ${comment.liked ? "fill-rose-500" : ""}`} />
              {comment.likes || 0}
            </button>
            <button
              onClick={() => onReply?.(comment)}
              className={`flex items-center gap-1 text-[11px] font-semibold transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Reply className="w-3 h-3" />
              Responder
            </button>

            {/* Menú de opciones (solo propios) */}
            {isOwn && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className={`p-1 rounded-lg transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}></div>
                    <div className={`absolute right-0 top-full mt-1 w-44 py-1.5 rounded-xl shadow-xl z-20 ${isDark ? "bg-dark-card border border-dark-border" : "bg-white border border-gray-100"}`}>
                      <button
                        onClick={() => { setMenuOpen(false); onEdit?.(comment); }}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm w-full transition-colors ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm w-full transition-colors ${isDark ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Respuestas */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-1">
              {comment.replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                  isDark={isDark}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReply={onReply}
                  onToggleLike={onToggleLike}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="¿Eliminar comentario?"
        message="Esta acción no se puede deshacer."
        confirmText={deleting ? "Eliminando..." : "Eliminar"}
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

/**
 * Sección de comentarios: lista con editar/eliminar/respuestas y un campo
 * para crear comentarios. Reutilizada en la tarjeta y en el modal de detalle.
 */
export default function CommentsSection({
  postId,
  comments = [],
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onToggleCommentLike,
}) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const currentUserIdResolved = currentUserId ?? user?.id;

  // Construye el árbol de comentarios a partir de la lista plana.
  const buildTree = (flat) => {
    const byId = new Map();
    flat.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
    const roots = [];
    byId.forEach((c) => {
      if (c.comentario_padre_id && byId.has(c.comentario_padre_id)) {
        byId.get(c.comentario_padre_id).replies.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  };

  const tree = buildTree(comments);

  const handleAdd = async (parentId = null, content = null) => {
    const value = (content ?? text).trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onAddComment?.(postId, value, parentId);
      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setText("");
      }
    } catch {
      // el error se notifica en el padre; se conserva el texto
    } finally {
      setSending(false);
      setSendingReply(false);
    }
  };

  const handleEdit = async (comment) => {
    if (!editText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await onEditComment?.(comment.id, editText.trim());
      setEditingId(null);
      setEditText("");
    } catch {
      // el error se notifica en el padre
    } finally {
      setSavingEdit(false);
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
  };

  const myInitials = getInitials(user?.nombre ? `${user.nombre} ${user.apellido || ""}` : user?.name || "Tú");

  return (
    <div>
      {/* Lista de comentarios */}
      {tree.length === 0 ? (
        <div className={`text-center py-6 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
          <p className="text-sm">No hay comentarios aún. Sé el primero en comentar.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {tree.map((c) =>
            editingId === c.id ? (
              <div key={c.id} className="ml-12 py-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none ${
                    isDark ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary" : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"
                  }`}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(c)}
                    disabled={savingEdit || !editText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all shadow-md disabled:opacity-50"
                  >
                    {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Guardar
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditText(""); }}
                    disabled={savingEdit}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={currentUserIdResolved}
                isDark={isDark}
                onEdit={startEdit}
                onDelete={(id) => onDeleteComment?.(id)}
                onReply={(comment) => setReplyTo(replyTo === comment.id ? null : comment.id)}
                onToggleLike={(comment) => onToggleCommentLike?.(comment)}
              />
            )
          )}

          {/* Respuesta en línea */}
          {replyTo && (
            <div className="ml-12 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd(replyTo, replyText)}
                  placeholder="Escribe una respuesta..."
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                    isDark ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary" : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"
                  }`}
                />
                <button
                  onClick={() => { setSendingReply(true); handleAdd(replyTo, replyText); }}
                  disabled={sendingReply || !replyText.trim()}
                  className={`p-2.5 rounded-xl transition-all disabled:opacity-50 ${isDark ? "text-dark-text-secondary hover:text-rose-400 hover:bg-white/5" : "text-gray-500 hover:text-rose-500 hover:bg-rose-50"}`}
                >
                  {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de carga mientras se publica el comentario */}
      {sending && (
        <div className="mt-4 animate-fade-in-up">
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-dark-border" : "bg-gray-100"}`}>
            <div className="h-full w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" />
          </div>
          <p className={`text-[11px] mt-1.5 font-medium flex items-center gap-1.5 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
            <Loader2 className="w-3 h-3 animate-spin" />
            Publicando comentario...
          </p>
        </div>
      )}

      {/* Campo para nuevo comentario */}
      <div className="flex items-center gap-3 mt-4">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {myInitials}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Escribe un comentario..."
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
              isDark ? "bg-[#15151f] border border-dark-border text-dark-text placeholder-dark-text-secondary" : "bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400"
            }`}
          />
          <button
            onClick={() => handleAdd()}
            disabled={sending || !text.trim()}
            className={`p-2.5 rounded-xl transition-all disabled:opacity-50 ${
              text.trim() && !sending
                ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg hover:from-rose-600 hover:to-amber-600"
                : isDark
                ? "bg-dark-border text-dark-text-secondary"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
