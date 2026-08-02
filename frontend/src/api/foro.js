// Llamadas al backend para el foro / comunidad.
import { apiFetch } from "./client";

const base = "/api/foro";

/** Lista publicaciones del foro. categoria opcional (codigo o 'all'). */
export async function listarPosts(categoria) {
  const q = categoria && categoria !== "all" ? `?categoria=${encodeURIComponent(categoria)}` : "";
  return apiFetch(`${base}/posts${q}`, { auth: false });
}

/** Detalle de una publicacion (incluye comentarios). */
export const obtenerPost = (id) => apiFetch(`${base}/posts/${id}`, { auth: false });

/** Crea una publicacion (requiere sesion). */
export const crearPost = (payload) =>
  apiFetch(`${base}/posts`, { method: "POST", body: payload });

/** Agrega un comentario a una publicacion. */
export const comentar = (postId, payload) =>
  apiFetch(`${base}/posts/${postId}/comentarios`, { method: "POST", body: payload });

/** Alterna una reaccion en una publicacion (toggle). */
export const reaccionar = (postId, tipo = "like") =>
  apiFetch(`${base}/posts/${postId}/reacciones`, { method: "POST", body: { tipo } });

/** Alterna el "me gusta" de un comentario (toggle). Devuelve { activo, likes }. */
export const reaccionarComentario = (comentarioId) =>
  apiFetch(`${base}/comentarios/${comentarioId}/like`, { method: "POST" });

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
