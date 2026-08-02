import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StoreSidebar from "./components/StoreSidebar";
import StoreHeader from "./components/StoreHeader";

export default function StoreLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const storeNombre = user?.nombre || "Tienda";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Sidebar */}
      <StoreSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        storeNombre={storeNombre}
        onLogout={handleLogout}
      />

      {/* Contenido principal */}
      <div
        className={`
          transition-all duration-300
          lg:ml-[260px] pb-16 lg:pb-0
          ${sidebarCollapsed ? "lg:!ml-[72px]" : ""}
        `}
      >
        {/* Header */}
        <StoreHeader
          storeNombre={storeNombre}
          onLogout={handleLogout}
        />

        {/* Main Content (Outlet) */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom spacing for mobile nav */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
