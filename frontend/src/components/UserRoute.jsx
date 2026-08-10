import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guard para las rutas del PANEL DE USUARIO (comprador).
 *
 * - Si el usuario es de un refugio (representante o empleado), lo redirige
 *   al dashboard del refugio, pues su rol corresponde a ese panel.
 * - Si no hay sesión, redirige a la home.
 */
export default function UserRoute({ children }) {
  const { user, loading, isShelter } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (isShelter()) {
    return <Navigate to="/refugio/dashboard" replace />;
  }

  return children;
}
