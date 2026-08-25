import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { StoreProvider, useStore } from "../../context/StoreContext";
import StoreSidebar from "./components/StoreSidebar";
import StoreHeader from "./components/StoreHeader";

function StoreLayoutContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  // Controla si el menú lateral está fijado para ajustar el margen del contenido.
  const [sidebarFijado, setSidebarFijado] = useState(false);
  const { user, logout } = useAuth();
  const {
    storeNombre, storeLogo, usuarioNombre,
    esSuperAdmin, tienePermiso,
  } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Nombre de la tienda proviene del contexto (base de datos).
  const nombreTienda = storeNombre || user?.nombre || "Mi Tienda";
  const logo = storeLogo || null;
  // Nombre de la persona autenticada (representante o admin).
  const nombreUsuario = usuarioNombre || user?.nombre || "Usuario";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Sidebar */}
      <StoreSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        storeNombre={nombreTienda}
        storeLogo={logo}
        onLogout={handleLogout}
        fijado={sidebarFijado}
        onToggleFijar={() => setSidebarFijado((prev) => !prev)}
      />

      {/* Contenido principal - margen izquierdo dinámico según si el menú está fijado.
          Colapsado: 72px · Expandido/fijado: 260px (ancho real del sidebar) */}
      <div
        className={`
          transition-all duration-300
          pb-16 lg:pb-0
          ${sidebarFijado ? "lg:ml-[260px]" : "lg:ml-[72px]"}
        `}
      >
        {/* Header */}
        <StoreHeader
          storeNombre={nombreTienda}
          usuarioNombre={nombreUsuario}
          esSuperAdmin={esSuperAdmin}
          tienePermiso={tienePermiso}
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

export default function StoreLayout() {
  return (
    <StoreProvider>
      <StoreLayoutContent />
    </StoreProvider>
  );
}
