// Autogestion de la Tienda Aliada autenticada (rol tienda_aliada).
import { apiFetch } from "./client";

const base = "/api/tienda";

/** Perfil de mi tienda. */
export const miPerfilTienda = () => apiFetch(`${base}/mi-perfil`);

/** Actualiza el perfil de mi tienda. */
export const actualizarMiPerfilTienda = (payload) =>
  apiFetch(`${base}/mi-perfil`, { method: "PUT", body: payload });

/** Productos de mi tienda. */
export const misProductosTienda = () => apiFetch(`${base}/productos`);

/** Detalle de un producto de mi tienda. */
export const obtenerMiProducto = (id) => apiFetch(`${base}/productos/${id}`);

/** Crea un producto en mi tienda. */
export const crearMiProducto = (payload) =>
  apiFetch(`${base}/productos`, { method: "POST", body: payload });

/** Crea un producto con imágenes en mi tienda. */
export const crearMiProductoConImagenes = (payload) =>
  apiFetch(`${base}/productos/con-imagenes`, { method: "POST", body: payload });

/** Actualiza un producto de mi tienda. */
export const actualizarMiProducto = (id, payload) =>
  apiFetch(`${base}/productos/${id}`, { method: "PUT", body: payload });

/** Elimina un producto de mi tienda. */
export const eliminarMiProducto = (id) =>
  apiFetch(`${base}/productos/${id}`, { method: "DELETE" });

/** Envía imágenes para análisis por IA y devuelve datos estructurados del producto. */
export const analizarProductoConIA = (imagenesBase64) =>
  apiFetch(`${base}/productos/analizar-ia`, {
    method: "POST",
    body: { imagenes: imagenesBase64 },
  });

/** Estadisticas de mi tienda (derivadas de productos). */
export const estadisticasTienda = () => apiFetch(`${base}/estadisticas`);

/** Pedidos que contienen productos de mi tienda. */
export const misPedidosTienda = () => apiFetch(`${base}/pedidos`);

/** Detalle de un pedido (solo items de mi tienda). */
export const obtenerPedidoTienda = (id) => apiFetch(`${base}/pedidos/${id}`);

/** Cambia el estado de un pedido. Opcionalmente adjunta numero de guia y transportadora. */
export const cambiarEstadoPedidoTienda = (id, estado, extra = {}) =>
  apiFetch(`${base}/pedidos/${id}/estado`, {
    method: "PATCH",
    body: { estado, ...extra },
  });

/** Cambia la contraseña del responsable de la tienda. */
export const cambiarPasswordTienda = (payload) =>
  apiFetch(`${base}/cambiar-password`, { method: "PUT", body: payload });
