// Llamadas al backend para el foro / comunidad.
import { apiFetch } from "./client";

const base = "/api/foro";

/**
 * Lista publicaciones del foro. categoria opcional (codigo o 'all').
 * Envía el token JWT si existe para que el backend incluya 'mi_reaccion'
 * (la reacción actual del usuario en cada publicación). Sin token funciona
 * igual para visitantes anónimos.
 */
export async function listarPosts(categoria) {
  const q = categoria && categoria !== "all" ? `?categoria=${encodeURIComponent(categoria)}` : "";
  return apiFetch(`${base}/posts${q}`);
}

/** Detalle de una publicacion (incluye comentarios y mi_reaccion). */
export const obtenerPost = (id) => apiFetch(`${base}/posts/${id}`);

/** Lista los comentarios de una publicación con la info de su autor
 *  (no incrementa el contador de vistas). */
export const listarComentarios = (postId) =>
  apiFetch(`${base}/posts/${postId}/comentarios`, { method: "GET" });

/** Crea una publicacion (requiere sesion). */
export const crearPost = (payload) =>
  apiFetch(`${base}/posts`, { method: "POST", body: payload });

/** Agrega un comentario a una publicacion. */
export const comentar = (postId, payload) =>
  apiFetch(`${base}/posts/${postId}/comentarios`, { method: "POST", body: payload });

/** Edita un comentario (solo su autor o admin). Devuelve el comentario actualizado. */
export const editarComentario = (comentarioId, contenido) =>
  apiFetch(`${base}/comentarios/${comentarioId}`, { method: "PUT", body: { contenido } });

/** Elimina un comentario (solo su autor o admin). */
export const eliminarComentario = (comentarioId) =>
  apiFetch(`${base}/comentarios/${comentarioId}`, { method: "DELETE" });

/**
 * Registra/actualiza/elimina la reacción del usuario en una publicación.
 * El backend garantiza UNA reacción por usuario. Devuelve
 * { activo, mi_reaccion, reacciones }.
 */
export const reaccionar = (postId, tipo = "like") =>
  apiFetch(`${base}/posts/${postId}/reacciones`, { method: "POST", body: { tipo } });

/** Lista los usuarios que reaccionaron a una publicación (con su tipo). */
export const obtenerReacciones = (postId) =>
  apiFetch(`${base}/posts/${postId}/reacciones`, { method: "GET" });

/** Alterna el "me gusta" de un comentario (toggle). Devuelve { activo, likes }. */
export const reaccionarComentario = (comentarioId) =>
  apiFetch(`${base}/comentarios/${comentarioId}/like`, { method: "POST" });

/** Incrementa el contador de compartidos de una publicación. */
export const compartirPost = (postId) =>
  apiFetch(`${base}/posts/${postId}/compartir`, { method: "POST" });

/** Elimina una publicacion del foro (solo su autor o un administrador). */
export const eliminarPost = (postId) =>
  apiFetch(`${base}/posts/${postId}`, { method: "DELETE" });

/** Edita una publicacion del foro (solo su autor o un administrador). */
export const actualizarPost = (postId, payload) =>
  apiFetch(`${base}/posts/${postId}`, { method: "PUT", body: payload });

/** Guarda o desguarda una publicacion del foro (toggle). Devuelve { activo }. */
export const guardarPost = (postId) =>
  apiFetch(`${base}/posts/${postId}/guardar`, { method: "POST" });

/** Fija o desfija una publicacion (solo su autor o admin). Devuelve { fijado }. */
export const fijarPost = (postId) =>
  apiFetch(`${base}/posts/${postId}/fijar`, { method: "POST" });

/** Lista las publicaciones guardadas por el usuario autenticado. */
export const listarPostsGuardados = () =>
  apiFetch(`${base}/posts/guardados`, { method: "GET" });

/** Lista las publicaciones creadas por el usuario autenticado. */
export const misPosts = () =>
  apiFetch(`${base}/posts/mios`, { method: "GET" });
