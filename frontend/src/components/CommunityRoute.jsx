import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guard para el FORO DE LA COMUNIDAD (feed compartido donde publican usuarios,
 * refugios y tiendas aliadas).
 *
 * A diferencia de UserRoute (que solo permite el rol "usuario"), aquí pueden
 * entrar TODOS los roles autenticados (usuario, refugio/empleado y tienda)
 * para que el refugio/tienda pueda ver las publicaciones de los demás roles.
 * - Sin sesión   -> redirige a /login
 * - Administrador -> usa su panel de administración (/admin/foro)
 */
export default function CommunityRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

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

  if (isAdmin()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
