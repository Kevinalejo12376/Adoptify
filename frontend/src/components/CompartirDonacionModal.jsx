// Modal "Compartir donación en el foro".
// Usa la IA Gemini (ya integrada en el backend) para generar un borrador de
// publicación basado en la donación y el refugio. El usuario puede editar el
// título, el contenido y las etiquetas ANTES de publicar. Si no desea
// compartir, simplemente cierra el modal sin crear ninguna publicación.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, X, Loader2, Send, AlertCircle, Check, RefreshCw, MessageSquare, Tag,
} from "lucide-react";
import { generarPublicacion, publicarDonacion } from "../api/donaciones";

export default function CompartirDonacionModal({ isOpen, onClose, donacion, onPublicado }) {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState(null);
  const [borrador, setBorrador] = useState({ titulo: "", contenido: "", tags: "" });
  const [publicado, setPublicado] = useState(false);
  const [postId, setPostId] = useState(null);

  // Al abrir: genera el borrador con Gemini.
  useEffect(() => {
    if (isOpen && donacion?.id) {
      setPublicado(false);
      setPostId(null);
      setError(null);
      generar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, donacion?.id]);

  const generar = async () => {
    if (!donacion?.id) return;
    setGenerando(true);
    setError(null);
    try {
      const res = await generarPublicacion(donacion.id);
      if (res?.ok) {
        setBorrador({
          titulo: res.borrador?.titulo || "",
          contenido: res.borrador?.contenido || "",
          tags: res.borrador?.tags || "",
        });
      } else {
        // Gemini no respondió: se abre el editor vacío para que el usuario
        // escriba su publicación manualmente (no se bloquea el flujo).
        setBorrador({ titulo: "", contenido: "", tags: "" });
        setError(res?.error || "No se pudo generar con IA; puedes escribirla manualmente.");
      }
    } catch (e) {
      setBorrador({ titulo: "", contenido: "", tags: "" });
      setError(e?.message || "No se pudo generar la publicación con IA.");
    } finally {
      setGenerando(false);
    }
  };

  const publicar = async () => {
    setError(null);
    if ((borrador.titulo || "").trim().length < 3) {
      setError("El título debe tener al menos 3 caracteres");
      return;
    }
    if ((borrador.contenido || "").trim().length < 10) {
      setError("El contenido debe tener al menos 10 caracteres");
      return;
    }
    setPublicando(true);
    try {
      const res = await publicarDonacion(donacion.id, {
        titulo: borrador.titulo.trim(),
        contenido: borrador.contenido.trim(),
        tags: (borrador.tags || "").trim() || undefined,
      });
      setPostId(res?.post_id || null);
      setPublicado(true);
      onPublicado?.(res);
    } catch (e) {
      setError(e?.message || "No se pudo publicar. Intenta de nuevo.");
    } finally {
      setPublicando(false);
    }
  };

  if (!isOpen) return null;

  const nf = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay" onClick={onClose} />

      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white dark:bg-dark-card rounded-3xl shadow-2xl animate-modal-pop">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 sm:px-7 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                {publicado ? "¡Publicada!" : "Comparte tu donación"}
              </h2>
              <p className="text-fuchsia-100 text-xs sm:text-sm">
                Inspira a más personas a ayudar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          {publicado ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-display">
                Tu donación ya inspira a otros 🐾
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary">
                La publicación fue creada en el foro. ¡Gracias por compartir tu historia!
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-gray-300 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => { onClose(); navigate("/forum"); }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-200 hover:shadow-xl transition-all"
                >
                  <MessageSquare className="w-5 h-5" /> Ver publicación
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Resumen de la donación */}
              <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 border border-rose-100 dark:border-rose-500/20 p-4 text-sm">
                <p className="font-bold text-gray-900 dark:text-white">
                  {donacion?.refugio_nombre || "Refugio"}
                </p>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                  {donacion?.tipo === "dinero"
                    ? `Donación monetaria · ${nf.format(donacion.valor)}`
                    : `Donación física · ${donacion?.detalle || ""}`}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-1">{donacion?.referencia}</p>
              </div>

              {generando ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <Loader2 className="w-9 h-9 animate-spin text-violet-500 mb-3" />
                  <p className="text-sm">La IA está redactando tu publicación...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5" /> Borrador generado con IA
                    </span>
                    <button
                      onClick={generar}
                      disabled={generando}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerar
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm border border-amber-100 dark:border-amber-500/20">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">Título</label>
                    <input
                      value={borrador.titulo}
                      onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
                      maxLength={120}
                      placeholder="Un título emotivo para tu publicación"
                      className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-violet-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">Contenido</label>
                    <textarea
                      value={borrador.contenido}
                      onChange={(e) => setBorrador({ ...borrador, contenido: e.target.value })}
                      rows={6}
                      maxLength={10000}
                      placeholder="Escribe o edita el contenido de tu publicación..."
                      className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-violet-400 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{borrador.contenido.length}/10000</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5 flex items-center gap-1.5">
                      <Tag className="w-4 h-4" /> Etiquetas (separadas por coma)
                    </label>
                    <input
                      value={borrador.tags}
                      onChange={(e) => setBorrador({ ...borrador, tags: e.target.value })}
                      placeholder="#donaciones, #Adoptify"
                      className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-violet-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={onClose}
                      className="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-gray-300 transition-colors"
                    >
                      No compartir
                    </button>
                    <button
                      onClick={publicar}
                      disabled={publicando}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-200 disabled:opacity-60 hover:shadow-xl transition-all"
                    >
                      {publicando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {publicando ? "Publicando..." : "Publicar en el foro"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
