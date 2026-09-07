// ============================================================================
// Memoria de navegación (SPA) para el botón "Volver" de páginas legales.
//
// Permite que una página legal (Política de Privacidad, etc.) sepa desde qué
// vista llegó el usuario y devuelva exactamente a esa vista conservando, si es
// posible, la posición de scroll. Funciona para toda la plataforma y todos los
// roles (y visitantes) sin alterar la navegación existente.
//
// Se usa sessionStorage porque es persistente durante la sesión de la pestaña y
// no interfiere con otras pestañas ni con el almacenamiento persistente.
// ============================================================================

const LS_PREV = "adoptify:nav:prev";
const LS_SCROLL_PREFIX = "adoptify:nav:scroll:";
const LS_RESTORE_PREFIX = "adoptify:nav:restore:";

// Última ruta que se ha renderizado en la raíz de la app. Se mantiene en memoria
// para conocer la ruta inmediatamente anterior a la actual de forma síncrona
// (durante el render del contenedor raíz, ANTES de que la página legal se
// renderice y necesite leerla).
let lastPathname = null;

/**
 * Debe llamarse en CADA render del contenedor raíz con la ruta actual
 * (location.pathname). Devuelve la ruta anterior y la deja disponible para la
 * siguiente lectura mediante getPreviousPath().
 */
export function trackPathname(pathname) {
  const prev = lastPathname;
  if (prev !== pathname) {
    lastPathname = pathname;
    if (prev) {
      try {
        sessionStorage.setItem(LS_PREV, prev);
      } catch {
        // almacenamiento no disponible: se ignora
      }
    }
  }
  return prev;
}

/** Ruta inmediatamente anterior (desde la que llegó el usuario), o null. */
export function getPreviousPath() {
  try {
    return sessionStorage.getItem(LS_PREV);
  } catch {
    return null;
  }
}

/** Guarda la posición vertical actual de la vista (se llama en cada scroll). */
export function saveScrollForPath(pathname) {
  try {
    sessionStorage.setItem(
      LS_SCROLL_PREFIX + pathname,
      String(Math.max(0, window.scrollY || 0))
    );
  } catch {
    // almacenamiento no disponible: se ignora
  }
}

/** Posición vertical guardada para una vista concreta. */
export function readScrollForPath(pathname) {
  try {
    return Number(sessionStorage.getItem(LS_SCROLL_PREFIX + pathname)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Marca que, al volver a `pathname`, se debe restaurar su scroll. Guarda el
 * valor objetivo (el guardado de esa vista) para que la restauración no dependa
 * de sobreescrituras posteriores del registro de scroll.
 */
export function requestScrollRestore(pathname) {
  try {
    const target = readScrollForPath(pathname);
    sessionStorage.setItem(LS_RESTORE_PREFIX + pathname, String(target));
  } catch {
    // almacenamiento no disponible: se ignora
  }
}

/**
 * Consume (una sola vez) la solicitud de restauración de scroll de `pathname`.
 * Devuelve el valor objetivo en píxeles, o 0 si no hay nada que restaurar.
 */
export function consumeScrollRestore(pathname) {
  try {
    const key = LS_RESTORE_PREFIX + pathname;
    const value = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
}
