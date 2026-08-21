// Utilidades compartidas para descargar archivos generados en el backend.
// Evita duplicar la lógica de blob/Content-Disposition en cada módulo de API.

/** Extrae el nombre de archivo del header Content-Disposition. */
export function nombreArchivoDesdeDisposition(contentDisposition, fallback = "reporte") {
  const match = /filename="?([^";]+)"?/.exec(contentDisposition || "");
  return (match && match[1]) || fallback;
}

/** Dispara la descarga de un Blob en el navegador. */
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
