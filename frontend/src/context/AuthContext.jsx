
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { loginRequest, registerRequest, fetchMe, logoutRequest, fetchProfile, googleLoginRequest } from "../api/auth";
import { getToken } from "../api/client";
import { useTheme } from "./ThemeContext";
import {
  listarMascotasFavoritas,
  agregarMascotaFavorita,
  quitarMascotaFavorita,
} from "../api/favoritos";
import { obtenerCiudadActual } from "../utils/ubicacion";

// Normaliza una mascota del backend a la forma que usan las vistas de favoritos.
const mapMascotaFav = (m) => ({
  id: m.id,
  name: m.nombre,
  type: m.tipo,
  breed: m.raza,
  age: m.edad,
  size: m.tamano,
  gender: m.genero,
  shelter: m.refugio_nombre,
  // Imagen principal de la mascota (Cloudinary) para mostrarla en las cards.
  image: m.imagen_url || (m.imagenes && m.imagenes[0]?.url) || null,
});

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { markAuthenticated, loadUserTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  // Evita sincronizar el perfil completo más de una vez por usuario (anti-bucle).
  const syncUserRef = useRef(null);
  // Ciudad/municipio actual detectado al iniciar sesión (solo si el usuario ya
  // concedió permiso de ubicación). Es independiente de la ciudad del perfil y
  // se usa únicamente para priorizar Refugios y Mascotas. null => sin priorización.
  const [currentCity, setCurrentCity] = useState(null);

  // ─── Verificar si el perfil del usuario está completo ───
  const checkProfileStatus = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      const isComplete = profile.perfil_completo === true;
      setProfileCompleted(isComplete);

      // Sincroniza el perfil completo (avatar_url, cover_url, bio, redes, etc.)
      // con el user del contexto para que las imágenes persistan tras el login
      // sin depender únicamente del endpoint /me. Se aplica una sola vez por
      // usuario para evitar bucles de actualización.
      const profileKey = profile?.id ?? user?.id ?? null;
      if (profile && profileKey != null && syncUserRef.current !== profileKey) {
        syncUserRef.current = profileKey;
        setUser((prev) => ({ ...prev, ...profile }));
      }

      // Solo mostrar el modal automaticamente a usuarios con JWT real que
      // NO tengan el perfil completo, que NO sean admin/store mock y SOLO
      // la primera vez (bandera por usuario guardada en localStorage).
      // Si el usuario cierra el modal sin completar el perfil, no vuelve a
      // aparecer automaticamente; puede abrirlo desde su perfil manualmente.
      if (!isComplete && getToken()) {
        const role = user?.role || user?.rol;
        // Solo para usuarios normales y refugios
        if (role === "usuario" || role === "refugio") {
          const userKey = user?.email || user?.id || "default";
          let shown = {};
          try {
            shown = JSON.parse(localStorage.getItem("adoptify_profile_modal_shown") || "{}") || {};
          } catch { /* localStorage corrupto, se ignora */ }
          if (!shown[userKey]) {
            setShowProfileModal(true);
            shown[userKey] = true;
            localStorage.setItem("adoptify_profile_modal_shown", JSON.stringify(shown));
          }
        }
      }
    } catch {
      // Si hay error (ej: no autenticado), ignorar
    }
  }, [user]);

  // Al montar: si hay token JWT, restaura la sesion real desde el backend.
  // Si no, restaura una sesion mock (admin/tienda) guardada en localStorage.
  useEffect(() => {
    const restore = async () => {
      const token = getToken();
      if (token) {
        try {
          const me = await fetchMe();
          setUser(me);
          // Marca sesión activa y recupera la preferencia de tema del usuario
          // para que el sistema vuelva a su último modo (claro u oscuro).
          markAuthenticated(true);
          loadUserTheme();
          // Prioriza el contenido según la ciudad/municipio actual (si hay permiso).
          detectarUbicacionActual();
          // Carga los favoritos de mascotas reales desde la base de datos.
          try {
            const favs = await listarMascotasFavoritas();
            setFavorites((favs || []).map(mapMascotaFav));
          } catch { /* sin favoritos */ }
        } catch {
          logoutRequest();
          markAuthenticated(false);
        }
      } else {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
            markAuthenticated(true);
          } catch { /* ignore */ }
        } else {
          markAuthenticated(false);
        }
      }
      setLoading(false);
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando el usuario se cargue, verificar estado del perfil
  useEffect(() => {
    if (user && getToken()) {
      checkProfileStatus();
    }
  }, [user, checkProfileStatus]);

  // ─── Ubicación actual (priorización de Refugios y Mascotas) ───
  // Detecta la ciudad/municipio actual del usuario SOLO si ya concedió permiso
  // de ubicación. No modifica la ciudad registrada del perfil. Si no se puede
  // obtener (permiso denegado/indefinido, error, etc.) queda null y el sistema
  // conserva su comportamiento actual. Se dispara en cada inicio de sesión para
  // que un cambio de ciudad se refleje al volver a iniciar sesión.
  const detectarUbicacionActual = useCallback(async () => {
    let ciudad = null;
    try {
      ciudad = await obtenerCiudadActual();
    } catch {
      ciudad = null;
    }
    setCurrentCity(ciudad);
  }, []);

  // ===== AUTENTICACION REAL (usuario / refugio) contra el backend =====
  /** Login real. Devuelve el usuario (incluye .role). */
  const apiLogin = async (email, password) => {
    const me = await loginRequest(email, password);
    setUser(me);
    // Recupera la preferencia de tema guardada del usuario.
    markAuthenticated(true);
    loadUserTheme();
    // Prioriza el contenido según la ciudad/municipio actual (si hay permiso).
    detectarUbicacionActual();
    try {
      const favs = await listarMascotasFavoritas();
      setFavorites((favs || []).map(mapMascotaFav));
    } catch { /* sin favoritos */ }
    return me;
  };

  /** Registro real de usuario/refugio en la base de datos. */
  const apiRegister = async (payload) => {
    return registerRequest(payload);
  };

  /** Login con Google. Recibe el credential token de Google Identity Services. */
  const googleLogin = async (credential) => {
    const me = await googleLoginRequest(credential);
    setUser(me);
    // Recupera la preferencia de tema guardada del usuario.
    markAuthenticated(true);
    loadUserTheme();
    // Prioriza el contenido según la ciudad/municipio actual (si hay permiso).
    detectarUbicacionActual();
    try {
      const favs = await listarMascotasFavoritas();
      setFavorites((favs || []).map(mapMascotaFav));
    } catch { /* sin favoritos */ }
    return me;
  };

  /** Refresca los datos del usuario autenticado desde el backend (/me).
   *  Útil tras guardar el avatar u otros cambios de perfil para que el
   *  contexto quede sincronizado sin recargar la aplicación. */
  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  /** Marcar perfil como completado tras guardar (llamar desde el modal).
   *  Recibe el resultado del backend (PUT /profile) para reflejar el estado
   *  REAL: si aún faltan campos obligatorios, el perfil sigue incompleto. */
  const markProfileCompleted = (result) => {
    setProfileCompleted(true);
    setShowProfileModal(false);
    const completo = result?.perfil_completo === true;
    setProfileCompleted(completo);
    setUser((prev) => ({ ...prev, perfil_completo: completo, ...(result || {}) }));
    // Revalida contra la BD por si hubo cambios adicionales.
    if (getToken()) checkProfileStatus();
  };

  /** Abrir el modal de completar perfil manualmente. */
  const openProfileModal = () => {
    setShowProfileModal(true);
  };

  // ===== Setters mock (admin / tienda) =====
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const register = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    logoutRequest();            // limpia token JWT
    setUser(null);
    setFavorites([]);
    setShowProfileModal(false);
    setProfileCompleted(false);
    setCurrentCity(null);       // la ubicación se vuelve a detectar al iniciar sesión
    localStorage.removeItem("user");
    localStorage.removeItem("favorites");
    // IMPORTANTE: la preferencia de tema del usuario NO se elimina. Solo se
    // marca que ya no hay sesión para que las vistas públicas (Inicio, Login y
    // Register) vuelvan a mostrarse SIEMPRE en modo claro.
    markAuthenticated(false);
    window.location.href = "/";
  };

  const isAdmin = () => {
    const r = user?.role || user?.rol;
    return r === "administrador_principal" || r === "administrador";
  };
  const isStore = () => (user?.role || user?.rol) === "tienda_aliada";

  // ===== Refugio (representante + empleados) =====
  /** El usuario pertenece a un refugio (representante o empleado). */
  const isShelter = () => {
    const r = user?.role || user?.rol;
    return r === "refugio" || r === "empleado_refugio";
  };
  /** El usuario es el representante del refugio. */
  const esRepresentanteRefugio = () => {
    if (user?.es_representante !== undefined) {
      return user.es_representante === true;
    }
    return (user?.role || user?.rol) === "refugio";
  };
  /** Códigos de permisos del usuario en su refugio (desde la BD). */
  const permisosRefugio = () => user?.permisos || [];
  /** ¿El usuario posee un permiso específico en su refugio? El representante
   *  siempre los tiene todos; el empleado solo los asignados. */
  const tienePermisoRefugio = (codigo) => {
    if (esRepresentanteRefugio()) return true;
    return (user?.permisos || []).includes(codigo);
  };

  // ===== Favoritos de mascotas (persistidos en la base de datos) =====
  const addFavorite = (animal) => {
    setFavorites((prev) =>
      prev.some((f) => f.id === animal.id) ? prev : [...prev, animal]
    );
    agregarMascotaFavorita(animal.id).catch(() => {});
  };

  const removeFavorite = (animalId) => {
    setFavorites((prev) => prev.filter((fav) => fav.id !== animalId));
    quitarMascotaFavorita(animalId).catch(() => {});
  };

  const isFavorite = (animalId) => favorites.some((fav) => fav.id === animalId);

  return (
    <AuthContext.Provider
      value={{
        user, loading, favorites, currentCity,
        showProfileModal, setShowProfileModal,
        profileCompleted,
        apiLogin, apiRegister, googleLogin,  // reales (usuario/refugio/google)
        login, register, logout,     // mock setters
        isAdmin, isStore,
        isShelter, esRepresentanteRefugio, permisosRefugio, tienePermisoRefugio,
        addFavorite, removeFavorite, isFavorite,
        checkProfileStatus, markProfileCompleted, openProfileModal,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
