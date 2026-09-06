// ============================================================
// Destino de las notificaciones según el rol del usuario
// ============================================================
// Las notificaciones guardan un "enlace" genérico (ej: /mis-pedidos/5,
// /forum?post=3). Según el rol (usuario | refugio | tienda_aliada) ese enlace
// debe apuntar al panel correcto:
//   - usuario  -> /mis-pedidos..., /adoption-history...
//   - refugio  -> /refugio/pedidos..., /refugio/solicitudes...
//   - tienda   -> /tienda/pedidos..., /tienda/perfil...
// Las rutas públicas/compartidas (/forum, /shelter/:id, /store-profile/:id,
// /animal/:id, /product/:id) se respetan tal cual.

const ROL = (user) => (user && (user.role || user.rol)) || "usuario";

// Reemplazos de rutas genéricas del panel de "usuario" por las del panel del rol.
const REEMPLAZOS = {
  refugio: [
    [/^\/mis-pedidos/, "/refugio/pedidos"],
    [/^\/mis-donaciones/, "/refugio/donaciones"],
    [/^\/adoption-history/, "/refugio/solicitudes"],
    [/^\/profile/, "/refugio/perfil"],
    [/^\/settings/, "/refugio/configuracion"],
  ],
  tienda_aliada: [
    [/^\/mis-pedidos/, "/tienda/pedidos"],
    [/^\/mis-donaciones/, "/tienda/donaciones"],
    [/^\/adoption-history/, "/tienda/dashboard"],
    [/^\/profile/, "/tienda/perfil"],
    [/^\/settings/, "/tienda/configuracion"],
  ],
};

// Rutas que NO se reescriben (ya son públicas o propias del rol).
const RUTAS_INALTERABLES = /^\/(refugio|tienda|admin|shelter|shelters|store|store-profile|animal|animals|product|forum|donar|cart)/;

/** Página "Ver todas las notificaciones" apropiada para el rol. */
export function verTodasNotificaciones(user) {
  const rol = ROL(user);
  if (rol === "tienda_aliada") return "/tienda/notificaciones";
  if (rol === "refugio") return "/refugio/configuracion"; // sin página propia: configuración del refugio
  return "/notificaciones";
}

/**
 * Devuelve la URL a la que debe navegar el clic en una notificación,
 * corregida según el rol del usuario. Si la notificación no trae enlace
 * devuelve null (no se navega).
 */
export function destinoNotificacion(notif, user) {
  const rol = ROL(user);
  const enlace = (notif && notif.enlace) || "";
  if (!enlace) return null;

  if (RUTAS_INALTERABLES.test(enlace)) return enlace;

  const maps = REEMPLAZOS[rol] || [];
  let destino = enlace;
  for (const [re, ruta] of maps) {
    destino = destino.replace(re, ruta);
  }
  return destino;
}
