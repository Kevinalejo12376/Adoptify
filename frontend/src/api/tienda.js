// Autogestion de la Tienda Aliada autenticada (rol tienda_aliada).
// Todas las funciones consumen la API real; la autorizacion se valida en el
// backend con el sistema RBAC (permisos almacenados en la base de datos).
import { apiFetch } from "./client";

const base = "/api/tienda";

/** Contexto del usuario autenticado dentro de su tienda (tienda + tipo + permisos). */
export const contextoTienda = () => apiFetch(`${base}/contexto`);

/** Perfil completo de mi tienda (requiere permiso tienda.ver_perfil). */
export const miPerfilTienda = () => apiFetch(`${base}/mi-perfil`);

/** Actualiza el perfil de mi tienda (requiere permiso tienda.editar_informacion). */
export const actualizarMiPerfilTienda = (payload) =>
  apiFetch(`${base}/mi-perfil`, { method: "PUT", body: payload });

/** Cambia el logo de la tienda (requiere permiso tienda.cambiar_logo). */
export const cambiarLogoTienda = (imagenBase64, tipo = "logo") =>
  apiFetch(`${base}/cambiar-logo`, { method: "POST", body: { imagen_base64: imagenBase64, tipo } });

/** Elimina el logo de la tienda: de Cloudinary y de la base de datos (requiere tienda.cambiar_logo). */
export const eliminarLogoTienda = () =>
  apiFetch(`${base}/cambiar-logo`, { method: "DELETE" });

/** Catalogo de permisos agrupado por modulo (solo Super Administrador). */
export const catalogoPermisosTienda = () => apiFetch(`${base}/permisos`);

/** Informacion del representante (solo Super Administrador). */
export const representanteTienda = () => apiFetch(`${base}/representante`);

/** Actualiza la informacion personal del representante (solo Super Administrador). */
export const actualizarRepresentanteTienda = (payload) =>
  apiFetch(`${base}/representante`, { method: "PUT", body: payload });

/** Cambia el correo del representante (solo Super Administrador). */
export const cambiarCorreoRepresentanteTienda = (payload) =>
  apiFetch(`${base}/representante/correo`, { method: "PUT", body: payload });

/** Transfiere el rol de Super Administrador a otro miembro (solo Super Administrador). */
export const cambiarRepresentanteTienda = (payload) =>
  apiFetch(`${base}/representante/cambiar`, { method: "POST", body: payload });

/** Lista los administradores de la tienda (solo Super Administrador). */
export const listarAdministradoresTienda = () => apiFetch(`${base}/administradores`);

/** Crea un administrador con permisos individuales (solo Super Administrador). */
export const crearAdministradorTienda = (payload) =>
  apiFetch(`${base}/administradores`, { method: "POST", body: payload });

/** Actualiza informacion y permisos de un administrador (solo Super Administrador). */
export const actualizarAdministradorTienda = (id, payload) =>
  apiFetch(`${base}/administradores/${id}`, { method: "PUT", body: payload });

/** Activa / desactiva un administrador (solo Super Administrador). */
export const cambiarEstadoAdministradorTienda = (id, activo) =>
  apiFetch(`${base}/administradores/${id}/estado`, { method: "PATCH", body: { activo } });

/** Restablece la contrasena de un administrador (solo Super Administrador). */
export const restablecerPasswordAdministradorTienda = (id, password) =>
  apiFetch(`${base}/administradores/${id}/restablecer-password`, { method: "POST", body: { password } });

/** Elimina un administrador (solo Super Administrador). */
export const eliminarAdministradorTienda = (id) =>
  apiFetch(`${base}/administradores/${id}`, { method: "DELETE" });

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

/** Actualiza únicamente el stock de un producto de mi tienda. */
export const actualizarStockMiProducto = (id, stock) =>
  apiFetch(`${base}/productos/${id}/stock`, { method: "PATCH", body: { stock } });

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

/** Cambia la contraseña del usuario autenticado (representante o admin). */
export const cambiarPasswordTienda = (payload) =>
  apiFetch(`${base}/cambiar-password`, { method: "PUT", body: payload });

/**
 * Kardex de inventario de un producto de mi tienda.
 * @param {number|string} productoId Id del producto.
 * @param {object} params Filtros opcionales:
 *   - fecha_inicio: 'YYYY-MM-DD' | fecha_fin: 'YYYY-MM-DD'
 *   - tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO'
 *   - orden: 'asc' | 'desc' (default 'desc')
 */
export const obtenerKardexProducto = (productoId, params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  ).toString();
  return apiFetch(`${base}/kardex/${productoId}${query ? `?${query}` : ""}`);
};
// ============================================================
// Historial de actividad
// ============================================================

/**
 * Historial de actividad de la tienda (requiere permiso historial.ver).
 * @param {object} params { busqueda, usuario_id, tipo_accion, fecha_desde, fecha_hasta, limite }
 */
export const historialActividadTienda = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`${base}/actividades${q}`);
};

// ============================================================
// Donaciones (Tienda Aliada -> Refugio)
// ============================================================

/** Refugios registrados para seleccionar al donar (requiere permiso donaciones.ver). */
export const refugiosParaDonar = () => apiFetch(`${base}/refugios`);

/** Crea una donación (requiere permiso donaciones.crear). */
export const crearDonacion = (payload) =>
  apiFetch(`${base}/donaciones`, { method: "POST", body: payload });

/** Lista las donaciones de la tienda (requiere permiso donaciones.ver). */
export const listarDonaciones = () => apiFetch(`${base}/donaciones`);

/** Detalle de una donación (requiere permiso donaciones.ver). */
export const obtenerDonacion = (id) => apiFetch(`${base}/donaciones/${id}`);

// ============================================================
// PQRS de la Tienda (gestionadas por Admins de Adoptify)
// ============================================================

/** Crea una PQRS desde la tienda (requiere permiso pqrs.crear). */
export const crearPqrsTienda = (payload) =>
  apiFetch(`${base}/pqrs`, { method: "POST", body: payload });

/** Lista las PQRS de la tienda (requiere permiso pqrs.ver). */
export const listarPqrsTienda = () => apiFetch(`${base}/pqrs`);

/** Detalle completo de una PQRS (requiere permiso pqrs.ver). */
export const obtenerPqrsTienda = (id) => apiFetch(`${base}/pqrs/${id}`);

/** La tienda responde una PQRS (requiere permiso pqrs.responder). */
export const responderPqrsTienda = (id, payload) =>
  apiFetch(`${base}/pqrs/${id}/responder`, { method: "POST", body: payload });
