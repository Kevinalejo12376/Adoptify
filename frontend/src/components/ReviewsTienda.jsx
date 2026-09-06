// Componente de reseñas de una TIENDA ALIADA (perfil público).
// Muestra las reseñas guardadas y permite al usuario autenticado crear/
// actualizar la suya (una por usuario). Usa /api/tiendas/{id}/resenas.
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Star, Loader2, MessageSquareText, User } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { listarResenasTienda, crearResenaTienda } from "../api/resenas";

function fechaLegible(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReviewsTienda({ tiendaId, tiendaNombre, onCambio }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarResenasTienda(tiendaId);
      const lista = Array.isArray(data) ? data : [];
      setReviews(lista);
      if (onCambio) {
        const prom = lista.length
          ? (lista.reduce((a, r) => a + Number(r.calificacion || 0), 0) / lista.length).toFixed(1)
          : 0;
        onCambio({ total: lista.length, rating: Number(prom) || 0 });
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiendaId]);

  useEffect(() => {
    // Se difiere para no invocar setState de forma síncrona dentro del efecto.
    const t = setTimeout(() => { cargar(); }, 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!user) {
      setError("Inicia sesión para dejar tu calificación y reseña.");
      return;
    }
    if (!userRating || userRating < 1) {
      setError("Selecciona entre 1 y 5 estrellas.");
      return;
    }
    setSubmitting(true);
    try {
      await crearResenaTienda(tiendaId, { calificacion: userRating, comentario: comment.trim() || null });
      setComment("");
      setUserRating(0);
      setSuccess("¡Gracias por calificar esta tienda!");
      await cargar();
    } catch (e) {
      setError(e?.message || "No se pudo enviar la reseña. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
      <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 dark:border-dark-border">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl blur-lg opacity-40" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg">
              <MessageSquareText className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-dark-text font-display">
                Reseñas de {tiendaNombre}
              </h2>
              <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-dark-text-secondary text-[11px] font-bold rounded-full">
                {reviews.length} {reviews.length === 1 ? "reseña" : "reseñas"}
              </span>
            </div>
            <p className="text-sm text-gray-400 dark:text-dark-text-secondary mt-0.5">
              Opiniones de clientes que ya compraron en esta tienda
            </p>
          </div>
        </div>

        {/* Formulario de calificación */}
        <div className={`rounded-2xl p-5 mb-6 border ${isDark ? "bg-dark-bg border-dark-border" : "bg-gray-50 border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Califica esta tienda</h3>
          </div>

          {!user && (
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2 mb-3">
              <Link to="/login" className="font-semibold underline">Inicia sesión</Link> para dejar tu calificación y reseña.
            </p>
          )}

          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setUserRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={!user}
                className="transition-all duration-200 hover:scale-125 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Star
                  className={`w-7 h-7 ${
                    (hoverRating || userRating) >= star
                      ? "text-amber-500 fill-amber-500 drop-shadow-sm"
                      : "text-gray-300 hover:text-amber-300"
                  } transition-all duration-200`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
            {userRating > 0
              ? `Tu calificación: ${userRating} estrella${userRating !== 1 ? "s" : ""}`
              : "Haz clic en las estrellas para calificar"}
          </p>

          {user && (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={`Cuéntale a otros cómo fue tu experiencia con ${tiendaNombre || "esta tienda"} (opcional)...`}
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none mb-3 ${
                  isDark
                    ? "bg-dark-card border-dark-border text-dark-text placeholder-dark-text-secondary"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                }`}
              />
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 mb-3">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-2 mb-3">{success}</p>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!userRating || submitting}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-white" />}
                {submitting ? "Enviando..." : "Publicar reseña"}
              </button>
            </>
          )}
        </div>

        {/* Lista de reseñas */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10">
            <Star className="w-10 h-10 text-gray-200 dark:text-dark-border mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Aún no hay reseñas para esta tienda.</p>
            <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1">Sé el primero en dejar tu calificación.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl p-4 border ${isDark ? "bg-dark-bg border-dark-border" : "bg-gradient-to-br from-gray-50 to-white border-gray-100"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {r.usuario_avatar ? (
                      <img src={r.usuario_avatar} alt={r.usuario_nombre} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-dark-text text-sm truncate">
                        {r.usuario_nombre || "Usuario"}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-dark-text-secondary whitespace-nowrap">
                        {fechaLegible(r.creada_en)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5 mb-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= r.calificacion ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-600"}`}
                        />
                      ))}
                    </div>
                    {r.comentario && (
                      <p className="text-xs text-gray-600 dark:text-dark-text-secondary leading-relaxed">{r.comentario}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
