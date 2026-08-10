import React from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";

/**
 * Guard de rutas del modulo Tienda basado en permisos.
 *
 * Debe usarse DENTRO del StoreProvider (es decir, dentro de StoreLayout).
 * - `permiso`: codigo de permiso requerido para acceder a la ruta.
 * - `superAdmin`: si es true, solo el Super Administrador puede acceder.
 *
 * Si el usuario no posee el permiso se redirige a /tienda/notificaciones
 * (seccion siempre disponible para cualquier miembro), evitando bucles.
 */
export default function StorePermisoRuta({ permiso, superAdmin = false, children }) {
  const { loading, esSuperAdmin, tienePermiso } = useStore();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Cargando permisos...</p>
      </div>
    );
  }

  if (superAdmin && !esSuperAdmin) {
    return <Navigate to="/tienda/notificaciones" replace />;
  }

  if (permiso && !tienePermiso(permiso)) {
    return <Navigate to="/tienda/notificaciones" replace />;
  }

  return children;
}
