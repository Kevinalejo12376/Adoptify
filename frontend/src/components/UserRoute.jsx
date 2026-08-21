import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guard para las rutas del PANEL DE USUARIO (comprador) y de las páginas
 * de consumo del usuario normal (animales, refugios, tienda, foro, carrito...).
 *
 * Solo el rol "usuario" autenticado puede acceder:
 * - Sin sesión          -> redirige a /login
 * - Refugio (repr/empl) -> redirige a /refugio/dashboard
 * - Tienda aliada       -> redirige a /tienda/dashboard
 * - Administrador       -> redirige a /admin/dashboard
 * - Cualquier otro rol  -> redirige a /login
 */
export default function UserRoute({ children }) {
  const { user, loading, isShelter, isStore, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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

  return children;
}
