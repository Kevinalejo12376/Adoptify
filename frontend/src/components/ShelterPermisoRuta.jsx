import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guard de rutas del módulo Refugio basado en permisos.
 *
 * - `permiso`: código de permiso requerido para acceder a la ruta
 *   (ej: "mascotas", "solicitudes", "marketplace", "configuracion", ...).
 *   Si es null/undefined, basta con pertenecer a un refugio (representante
 *   o empleado activo).
 * - El representante siempre tiene todos los permisos.
 * - Si el usuario no es del refugio se redirige a /dashboard.
 * - Si no posee el permiso se redirige a /refugio/dashboard (evita bucles).
 */
export default function ShelterPermisoRuta({ permiso, children }) {
  const { user, loading, isShelter, tienePermisoRefugio } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p>Cargando permisos...</p>
      </div>
    );
  }

  if (!user || !isShelter()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permiso && !tienePermisoRefugio(permiso)) {
    return <Navigate to="/refugio/dashboard" replace />;
  }

  return children;
}
