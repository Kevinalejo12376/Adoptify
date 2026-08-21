import { createPortal } from "react-dom";

// ========================================================
// ADMIN MODAL PORTAL — Contenedor global para modales del Admin
// --------------------------------------------------------
// Renderiza el contenido (overlay + panel) mediante un portal
// directo a <body>, lo que garantiza que el modal quede SIEMPRE
// en el stacking context raíz, por encima del navbar (z-40),
// del sidebar (z-50) y de cualquier contenedor animado de las
// páginas (`.animate-fade-in*`), que podrían crear stacking
// contexts anidados y "atrapar" al modal por debajo de ellos.
//
// No altera el diseño ni el contenido: solo cambia el contenedor
// DOM. El modal conserva su posición, tamaño, scroll interno e
// interactividad (eventos, estado, formularios).
// ========================================================
export default function AdminModalPortal({ children }) {
  return createPortal(children, document.body);
}
