import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import HomeRoute from "./components/HomeRoute";
import UserRoute from "./components/UserRoute";
import AdminRoute from "./components/AdminRoute";
import StoreRoute from "./components/StoreRoute";
import StorePermisoRuta from "./components/StorePermisoRuta";
import ShelterPermisoRuta from "./components/ShelterPermisoRuta";
import CompleteProfileModal from "./components/CompleteProfileModal";
import ChatBot from "./components/ChatBot";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider } from "./context/I18nContext";
import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import Home from "./pages/public/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ShelterRegistration from "./pages/public/ShelterRegistration";
import StoreRegistration from "./pages/public/StoreRegistration";
import CrearPassword from "./pages/auth/CrearPassword";

// ========================================================
// IMPORTACIONES DE VISTAS DE USUARIO
// Ubicadas en src/pages/Usuario/
// ========================================================
import Dashboard from "./pages/Usuario/Dashboard";
import UserProfile from "./pages/Usuario/UserProfile";
import AdoptionHistory from "./pages/Usuario/AdoptionHistory";
import Settings from "./pages/Usuario/Settings";
import Favorites from "./pages/Usuario/Favorites";
import UserOrders from "./pages/Usuario/UserOrders";
import UserOrderDetail from "./pages/Usuario/UserOrderDetail";
import UserNotifications from "./pages/Usuario/UserNotifications";

// ========================================================
// IMPORTACIONES DE VISTAS DE REFUGIO
// Ubicadas en src/pages/Refugio/
// ========================================================
import ShelterDashboard from "./pages/Refugio/ShelterDashboard";
import ShelterPets from "./pages/Refugio/ShelterPets";
import ShelterPetDetail from "./pages/Refugio/ShelterPetDetail";
import ShelterEditPet from "./pages/Refugio/ShelterEditPet";
import ShelterRequests from "./pages/Refugio/ShelterRequests";
import ShelterSettings from "./pages/Refugio/ShelterSettings";
import ShelterForum from "./pages/Refugio/ShelterForum";
import ShelterProfile from "./pages/Refugio/ShelterProfile";
import ShelterAdoptionHistory from "./pages/Refugio/ShelterAdoptionHistory";
import ShelterStore from "./pages/Refugio/ShelterStore";
import ShelterProductDetail from "./pages/Refugio/ShelterProductDetail";
import ShelterEditProduct from "./pages/Refugio/ShelterEditProduct";
import ShelterOrders from "./pages/Refugio/ShelterOrders";
import ShelterOrderDetail from "./pages/Refugio/ShelterOrderDetail";
import ShelterTeam from "./pages/Refugio/ShelterTeam";

// ========================================================
// IMPORTACIONES DE VISTAS DE TIENDA ALIADA
// Ubicadas en src/pages/Tienda/
// ========================================================
import StoreLayout from "./pages/Tienda/StoreLayout";
import StoreDashboard from "./pages/Tienda/StoreDashboard";
import StoreProducts from "./pages/Tienda/StoreProducts";
import StoreProductDetail from "./pages/Tienda/StoreProductDetail";
import StoreEditProduct from "./pages/Tienda/StoreEditProduct";
import BarcodeScanner from "./pages/Tienda/BarcodeScanner";
import StoreOrders from "./pages/Tienda/StoreOrders";
import StoreOrderDetail from "./pages/Tienda/StoreOrderDetail";
import StoreProfile from "./pages/Tienda/StoreProfile";
import StoreStatistics from "./pages/Tienda/StoreStatistics";
import StoreNotifications from "./pages/Tienda/StoreNotifications";
import StoreSettings from "./pages/Tienda/StoreSettings";
import StoreAdministradores from "./pages/Tienda/StoreAdministradores";
import StoreActividad from "./pages/Tienda/StoreActividad";
import StoreDonaciones from "./pages/Tienda/StoreDonaciones";
import StorePqrs from "./pages/Tienda/StorePqrs";
import ProductAnalysisView from "./pages/Tienda/ProductAnalysisView";
import KardexView from "./pages/Tienda/KardexView";

// Otras importaciones existentes
import Animals from "./pages/animals/Animals";
import AnimalProfile from "./pages/animals/AnimalProfile";
import ShelterAnimals from "./pages/animals/ShelterAnimals";
import Shelters from "./pages/shelters/Shelters";
import ShelterDetails from "./pages/shelters/ShelterDetails";
import Store from "./pages/marketplace/Store";
import ProductProfile from "./pages/marketplace/ProductProfile";
import Cart from "./pages/marketplace/Cart";
import MarketplaceStoreProfile from "./pages/marketplace/StoreProfile";
import Forum from "./pages/community/Forum";

// ========================================================
// IMPORTACIONES DEL PANEL DE ADMINISTRACIÓN
// Ubicadas en src/pages/Admin/
// ========================================================
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminUsuarios from "./pages/Admin/Usuarios";
import AdminRefugios from "./pages/Admin/Refugios";
import AdminMascotas from "./pages/Admin/Mascotas";
import AdminMarketplace from "./pages/Admin/Marketplace";
import AdminPedidos from "./pages/Admin/Pedidos";
import AdminForo from "./pages/Admin/Foro";
import AdminReportesDescargables from "./pages/Admin/ReportesDescargables";
import AdminPQRS from "./pages/Admin/PQRS";
import AdminAdministradores from "./pages/Admin/Administradores";
import AdminEstadisticas from "./pages/Admin/Estadisticas";
import AdminAuditoria from "./pages/Admin/Auditoria";
import AdminConfiguracion from "./pages/Admin/Configuracion";
import AdminTiendas from "./pages/Admin/GestionTiendas";
import SolicitudRefugioDetalle from "./pages/Admin/SolicitudRefugioDetalle";
import SolicitudesTiendas from "./pages/Admin/SolicitudesTiendas";

function AppContent() {
  const location = useLocation();
  const { showProfileModal, setShowProfileModal, markProfileCompleted } = useAuth();
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/registrar-refugio" ||
    location.pathname === "/registrar-tienda" ||
    location.pathname.startsWith("/crear-password");
  const isAdminPage = location.pathname.startsWith("/admin");
  const isStorePage = location.pathname.startsWith("/tienda");

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <ScrollToTop />
      {!isAuthPage && !isAdminPage && !isStorePage && <Navbar />}
      <main className="flex-grow">
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<HomeRoute><Home /></HomeRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/registrar-refugio" element={<ShelterRegistration />} />
          <Route path="/registrar-tienda" element={<StoreRegistration />} />
          <Route path="/crear-password/:token" element={<CrearPassword />} />

          {/* ================================================ */}
          {/* RUTAS DEL PANEL DE ADMINISTRACIÓN                */}
          {/* ================================================ */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="usuarios" element={<AdminUsuarios />} />
            <Route path="refugios" element={<AdminRefugios />} />
            <Route path="refugios/:id" element={<SolicitudRefugioDetalle />} />
            <Route path="mascotas" element={<AdminMascotas />} />
            <Route path="tiendas" element={<AdminTiendas />} />
            <Route path="tiendas/solicitudes" element={<SolicitudesTiendas />} />
            <Route path="marketplace" element={<AdminMarketplace />} />
            <Route path="marketplace/estadisticas" element={<AdminMarketplace />} />
            <Route path="pedidos" element={<AdminPedidos />} />
            <Route path="foro" element={<AdminForo />} />
            <Route path="reportes-descargables" element={<AdminReportesDescargables />} />
            <Route path="pqrs" element={<AdminPQRS />} />
            <Route path="administradores" element={<AdminAdministradores />} />
            <Route path="estadisticas" element={<AdminEstadisticas />} />
            <Route path="auditoria" element={<AdminAuditoria />} />
            <Route path="configuracion" element={<AdminConfiguracion />} />
          </Route>

          {/* ================================================ */}
          {/* RUTAS DE USUARIO (src/pages/Usuario/)            */}
          {/* ================================================ */}
          <Route path="/dashboard" element={<UserRoute><Dashboard /></UserRoute>} />
          <Route path="/profile" element={<UserRoute><UserProfile /></UserRoute>} />
          <Route path="/adoption-history" element={<UserRoute><AdoptionHistory /></UserRoute>} />
          <Route path="/favorites" element={<UserRoute><Favorites /></UserRoute>} />
          <Route path="/mis-pedidos" element={<UserRoute><UserOrders /></UserRoute>} />
          <Route path="/mis-pedidos/:id" element={<UserRoute><UserOrderDetail /></UserRoute>} />
          <Route path="/notificaciones" element={<UserRoute><UserNotifications /></UserRoute>} />
          <Route path="/settings" element={<UserRoute><Settings /></UserRoute>} />

          {/* ================================================ */}
          {/* RUTAS DE REFUGIO (src/pages/Refugio/)            */}
          {/* ================================================ */}
          <Route path="/refugio/dashboard" element={<ShelterPermisoRuta><ShelterDashboard /></ShelterPermisoRuta>} />
          <Route path="/refugio/mascotas" element={<ShelterPermisoRuta permiso="mascotas"><ShelterPets /></ShelterPermisoRuta>} />
          <Route path="/refugio/mascotas/:id" element={<ShelterPermisoRuta permiso="mascotas"><ShelterPetDetail /></ShelterPermisoRuta>} />
          <Route path="/refugio/mascotas/editar/:id" element={<ShelterPermisoRuta permiso="mascotas"><ShelterEditPet /></ShelterPermisoRuta>} />
          <Route path="/refugio/solicitudes" element={<ShelterPermisoRuta permiso="solicitudes"><ShelterRequests /></ShelterPermisoRuta>} />
          <Route path="/refugio/configuracion" element={<ShelterPermisoRuta permiso="configuracion"><ShelterSettings /></ShelterPermisoRuta>} />
          <Route path="/refugio/foro" element={<ShelterPermisoRuta permiso="foro"><ShelterForum /></ShelterPermisoRuta>} />
          <Route path="/refugio/perfil" element={<ShelterPermisoRuta><ShelterProfile /></ShelterPermisoRuta>} />
          <Route path="/refugio/historial" element={<ShelterPermisoRuta permiso="adopciones"><ShelterAdoptionHistory /></ShelterPermisoRuta>} />
          <Route path="/refugio/tienda" element={<ShelterPermisoRuta permiso="marketplace"><ShelterStore /></ShelterPermisoRuta>} />
          <Route path="/refugio/tienda/:id" element={<ShelterPermisoRuta permiso="marketplace"><ShelterProductDetail /></ShelterPermisoRuta>} />
          <Route path="/refugio/tienda/editar/:id" element={<ShelterPermisoRuta permiso="marketplace"><ShelterEditProduct /></ShelterPermisoRuta>} />
          <Route path="/refugio/pedidos" element={<ShelterPermisoRuta permiso="pedidos"><ShelterOrders /></ShelterPermisoRuta>} />
          <Route path="/refugio/pedidos/:id" element={<ShelterPermisoRuta permiso="pedidos"><ShelterOrderDetail /></ShelterPermisoRuta>} />
          <Route path="/refugio/equipo" element={<ShelterPermisoRuta permiso="administrar_empleados"><ShelterTeam /></ShelterPermisoRuta>} />

          {/* ================================================ */}
          {/* RUTAS DE TIENDA ALIADA (src/pages/Tienda/)       */}
          {/* ================================================ */}
          <Route path="/tienda" element={<StoreRoute><StoreLayout /></StoreRoute>}>
            <Route index element={<Navigate to="/tienda/dashboard" replace />} />
            <Route path="dashboard" element={<StoreDashboard />} />
            <Route path="productos" element={<StoreProducts />} />
            <Route path="productos/nuevo" element={<StoreEditProduct />} />
            <Route path="productos/:id" element={<StoreProductDetail />} />
            <Route path="productos/editar/:id" element={<StoreEditProduct />} />
            <Route path="kardex" element={<KardexView />} />
            <Route path="pedidos" element={<StoreOrders />} />
            <Route path="pedidos/:id" element={<StoreOrderDetail />} />
            <Route path="perfil" element={<StoreProfile />} />
            <Route path="estadisticas" element={<StoreStatistics />} />
            <Route path="notificaciones" element={<StoreNotifications />} />
            <Route path="configuracion" element={<StorePermisoRuta permiso="configuracion.acceder"><StoreSettings /></StorePermisoRuta>} />
            <Route path="administradores" element={<StorePermisoRuta superAdmin><StoreAdministradores /></StorePermisoRuta>} />
            <Route path="actividad" element={<StorePermisoRuta permiso="historial.ver"><StoreActividad /></StorePermisoRuta>} />
            <Route path="donaciones" element={<StorePermisoRuta permiso="donaciones.ver"><StoreDonaciones /></StorePermisoRuta>} />
            <Route path="pqrs" element={<StorePermisoRuta permiso="pqrs.ver"><StorePqrs /></StorePermisoRuta>} />
          </Route>

          {/* Ruta de análisis con IA (fuera del layout de tienda para máxima atención) */}
          <Route
            path="/tienda/productos/analizar"
            element={
              <StoreRoute>
                <StoreProvider>
                  <StorePermisoRuta permiso="productos.crear">
                    <ProductAnalysisView />
                  </StorePermisoRuta>
                </StoreProvider>
              </StoreRoute>
            }
          />

          {/* Ruta de escaneo de código de barras */}
          <Route
            path="/tienda/productos/escanear"
            element={
              <StoreRoute>
                <StoreProvider>
                  <StorePermisoRuta permiso="productos.ver">
                    <BarcodeScanner />
                  </StorePermisoRuta>
                </StoreProvider>
              </StoreRoute>
            }
          />

          {/* Rutas existentes */}
          <Route path="/animals" element={<UserRoute><Animals /></UserRoute>} />
          <Route path="/animal/:id" element={<UserRoute><AnimalProfile /></UserRoute>} />
          <Route path="/shelters" element={<UserRoute><Shelters /></UserRoute>} />
          <Route path="/shelter/:id" element={<UserRoute><ShelterDetails /></UserRoute>} />
          <Route path="/shelter/:id/animals" element={<UserRoute><ShelterAnimals /></UserRoute>} />
          <Route path="/store" element={<UserRoute><Store /></UserRoute>} />
          <Route path="/shelter-store/:shelterId" element={<UserRoute><Store /></UserRoute>} />
          <Route path="/store-profile/:storeId" element={<UserRoute><MarketplaceStoreProfile /></UserRoute>} />
          <Route path="/product/:id" element={<UserRoute><ProductProfile /></UserRoute>} />
          <Route path="/cart" element={<UserRoute><Cart /></UserRoute>} />
          <Route path="/forum" element={<UserRoute><Forum /></UserRoute>} />

          {/* Fallback route */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {!isAuthPage && !isAdminPage && !isStorePage && <Footer />}

      {/* Modal global para completar perfil (solo fuera de páginas de auth) */}
      {!isAuthPage && (
        <CompleteProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onComplete={markProfileCompleted}
        />
      )}

      {/* Chatbot flotante (IA via n8n) — en todas las vistas EXCEPTO Login y Register */}
      {location.pathname !== "/login" && location.pathname !== "/register" && <ChatBot />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <Router>
                <AppContent />
              </Router>
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
