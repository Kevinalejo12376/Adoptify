import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Controla si el menú lateral está fijado para ajustar el margen del contenido.
  const [sidebarFijado, setSidebarFijado] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const adminNombre = user?.nombre || "Admin";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Sidebar */}
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        fijado={sidebarFijado}
        onToggleFijar={() => setSidebarFijado((prev) => !prev)}
      />

      {/* Contenido principal - margen izquierdo dinámico según si el menú está fijado.
          Colapsado: 80px · Expandido/fijado: 280px (ancho real del sidebar) */}
      <div
        className={`
          transition-all duration-[280ms] ease-out
          pb-16 lg:pb-0
          ${sidebarFijado ? "lg:ml-[280px]" : "lg:ml-[80px]"}
        `}
      >
        {/* Header */}
        <AdminHeader
          adminNombre={adminNombre}
          onLogout={handleLogout}
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
        />

        {/* Main Content (Outlet) con animación fade-in */}
        <main className="p-4 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Bottom spacing for mobile */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
