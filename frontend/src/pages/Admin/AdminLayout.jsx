import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
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
      />

      {/* Contenido principal - se ajusta automáticamente */}
      <div
        className="
          transition-all duration-[280ms] ease-out
          lg:ml-[80px] pb-16 lg:pb-0
        "
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
