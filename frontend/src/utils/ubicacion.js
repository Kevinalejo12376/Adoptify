// Utilidades de ubicación basadas en ciudad/municipio (NO coordenadas).
// ----------------------------------------------------------------------------
// El objetivo es identificar la ciudad/municipio ACTUAL del usuario (solo si ya
// concedió el permiso de ubicación) para priorizar el contenido. No se calculan
// distancias ni kilómetros: solo se compara la ciudad detectada con la ciudad
// registrada de refugios/mascotas. Si no se puede obtener la ubicación, se
// devuelve null y el sistema conserva su comportamiento actual.

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

/**
 * Obtiene la ubicación detallada actual del dispositivo (departamento, municipio
 * y dirección aproximada) usando geolocalización + geocodificación inversa de
 * Nominatim/OSM. Reutiliza la misma lógica que el registro de refugios
 * ("Usar mi ubicación actual") para autocompletar los campos del perfil.
 *
 * @returns {Promise<{departamento:string, municipio:string, direccion:string}>}
 * @throws {Error} Si el navegador no soporta geolocalización, el usuario niega
 *                 el permiso o no se puede resolver la dirección.
 */
export function obtenerUbicacionDetallada() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Tu navegador no soporta geolocalización"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `${NOMINATIM_REVERSE}?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`,
            { headers: { "User-Agent": "AdoptifyApp/1.0" } }
          );
          if (!res.ok) throw new Error("geo");
          const data = await res.json();
          const a = data.address || {};
          const departamento = a.state || a.region || "";
          const municipio = a.city || a.town || a.village || a.municipality || a.county || "";
          const direccion = [a.road, a.neighbourhood, a.suburb, a.hamlet].filter(Boolean).join(", ");
          resolve({ departamento, municipio, direccion });
        } catch {
          reject(new Error("No se pudo determinar la dirección exacta"));
        }
      },
      () => reject(new Error("No se pudo acceder a tu ubicación. Completa los campos manualmente.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

/**
 * Devuelve la ciudad/municipio actual del dispositivo, o null si:
 * - El navegador no soporta geolocalización.
 * - El usuario aún no ha concedido el permiso de ubicación (no se fuerza el
 *   diálogo del navegador: solo se usa si YA tiene permitido el acceso).
 * - No se puede resolver la coordenada a un nombre de ciudad legible.
 *
 * NO expone coordenadas ni latitud/longitud al resto de la aplicación.
 */
export async function obtenerCiudadActual() {
  // 1) ¿El navegador soporta geolocalización?
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }

  // 2) ¿El usuario YA permitió el acceso a su ubicación?
  //    No forzamos el permiso: si el estado no es "granted" (denegado o nunca
  //    preguntado) se mantiene el comportamiento actual sin priorización.
  if (navigator.permissions?.query) {
    try {
      const permiso = await navigator.permissions.query({ name: "geolocation" });
      if (permiso.state !== "granted") return null;
    } catch {
      // No se pudo consultar el permiso: no arriesgarse a mostrar un diálogo
      // inesperado, simplemente no se prioriza.
      return null;
    }
  } else {
    // Navegador sin API de permisos: no forzar el diálogo de ubicación.
    return null;
  }

  // 3) Obtener la posición (el permiso ya está concedido).
  let posicion;
  try {
    posicion = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  } catch {
    return null;
  }

  const { latitude, longitude } = posicion.coords;

  // 4) Geocodificación inversa: coordenadas → ciudad/municipio legible.
  try {
    const res = await fetch(
      `${NOMINATIM_REVERSE}?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`,
      { headers: { "User-Agent": "AdoptifyApp/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const ciudad =
      a.city || a.town || a.village || a.municipality || a.county || null;
    return ciudad ? String(ciudad).trim() : null;
  } catch {
    return null;
  }
}

/**
 * Normaliza un nombre de ciudad para compararlo de forma tolerante:
 * minúsculas, sin tildes, separadores convertidos a espacios y sin espacios
 * sobrantes. Ej: "Ibagué, Tolima" → "ibague tolima".
 */
export function normalizarCiudad(texto = "") {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s,.;·/–—-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Indica si dos nombres de ciudad se refieren a la misma ciudad/municipio.
 * Comparación tolerante a tildes, mayúsculas y variaciones de formato
 * (p. ej. "Ibagué" vs "Ibagué, Tolima" vs "IBAGUE").
 */
export function ciudadesCoinciden(ciudadA, ciudadB) {
  const a = normalizarCiudad(ciudadA);
  const b = normalizarCiudad(ciudadB);
  if (!a || !b) return false;

  if (a === b) return true;
  // Una es subcadena de la otra (p. ej. "ibague" en "ibague tolima").
  if (a.includes(b) || b.includes(a)) return true;

  // Comparten al menos una palabra clave significativa (>3 letras).
  const palabrasA = new Set(a.split(" ").filter((p) => p.length > 3));
  const palabrasB = new Set(b.split(" ").filter((p) => p.length > 3));
  for (const palabra of palabrasA) {
    if (palabrasB.has(palabra)) return true;
  }
  return false;
}
