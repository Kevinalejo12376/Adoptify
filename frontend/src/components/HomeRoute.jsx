import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guard para la HOME pública.
 *
 * - Visitantes anónimos y usuarios con rol "usuario" pueden ver la home.
 * - Roles privilegiados autenticados son redirigidos a su propio panel,
 *   para que no vean la home de usuario normal.
 */
export default function HomeRoute({ children }) {
  const { user, loading, isShelter, isStore, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sin sesión: la home es pública.
  if (!user) {
    return children;
  }

  if (isShelter()) {
    return <Navigate to="/refugio/dashboard" replace />;
  }

  if (isStore()) {
    return <Navigate to="/tienda/dashboard" replace />;
  }

  if (isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Usuario normal (rol "usuario"): ve la home.
  return children;
}
