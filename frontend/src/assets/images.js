// =====================================================================
// IMÁGENES DEL CARRUSEL (Cloudinary)
// =====================================================================
// Centraliza las imágenes del carrusel decorativo para que se usen de
// forma idéntica en la Home pública, Login, Register y el Dashboard del
// usuario (después de iniciar sesión).
//
// Las imágenes se suben a Cloudinary mediante el script
// backend/scripts/upload_assets_to_cloudinary.py (carpeta
// "frontend-assets/assets-extras").
//
// Normalización de tamaño (importante):
// Las imágenes originales tienen proporciones muy distintas (16:9, 4:5,
// 2:3, 1:1, 3:2). Para que TODAS llenen el carrusel por completo y sin
// recortes feos, Cloudinary las entrega recortadas a la misma proporción
// 4:3 mediante `c_fill,g_auto`:
//   - c_fill : recorta y rellena exactamente al tamaño pedido.
//   - g_auto : Cloudinary detecta el sujeto y centra el recorte en él,
//              evitando cortar cabezas o partes importantes.
//   - f_auto,q_auto : formato (avif/webp/jpg) y calidad óptimos según
//              el navegador.
//
// El contenedor del carrusel (AutoFadingImage) usa la proporción de la
// primera imagen como referencia; como todas se entregan a 4:3, todas
// encajan perfectamente con object-fit: cover sin deformarse.

const BASE_CLOUDINARY = "https://res.cloudinary.com/kj0wube2/image/upload";

// Transformación común: 4:3 con recorte inteligente centrado en el sujeto.
const CAROUSEL_TRANSFORM = "w_1200,h_900,c_fill,g_auto,f_auto,q_auto";

const CLOUDINARY_CAROUSEL = [
  `${BASE_CLOUDINARY}/${CAROUSEL_TRANSFORM}/frontend-assets/assets-extras/carrusel1`,
  `${BASE_CLOUDINARY}/${CAROUSEL_TRANSFORM}/frontend-assets/assets-extras/carrusel2`,
  `${BASE_CLOUDINARY}/${CAROUSEL_TRANSFORM}/frontend-assets/assets-extras/carrusel3`,
  `${BASE_CLOUDINARY}/${CAROUSEL_TRANSFORM}/frontend-assets/assets-extras/carrusel4`,
  `${BASE_CLOUDINARY}/${CAROUSEL_TRANSFORM}/frontend-assets/assets-extras/carrusel5`,
  `${BASE_CLOUDINARY}/${CAROUSEL_TRANSFORM}/frontend-assets/assets-extras/carrusel6`,
];

/**
 * Carrusel de fotos de mascotas usado en:
 * - Login / Register (panel decorativo)
 * - Home pública (hero)
 * - Dashboard del usuario (hero, tras iniciar sesión)
 *
 * Las URLs provienen de Cloudinary (host "res.cloudinary.com").
 */
export const CAROUSEL_IMAGES = CLOUDINARY_CAROUSEL;
