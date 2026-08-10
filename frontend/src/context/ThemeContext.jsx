import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { obtenerConfiguracion, actualizarConfiguracion } from "../api/configuraciones";
import { getToken } from "../api/client";

const ThemeContext = createContext(null);

// Clave de respaldo local de la preferencia del usuario. Se CONSERVA aunque el
// usuario cierre sesión: la preferencia se recupera al volver a iniciar sesión.
// Se migra el valor de la antigua clave "theme" si existe.
const PREF_KEY = "adoptify_theme_pref";
const LEGACY_KEY = "theme";

const normalize = (value) => (value === "dark" ? "dark" : "light");

function readSavedTheme() {
  const stored = localStorage.getItem(PREF_KEY) || localStorage.getItem(LEGACY_KEY);
  const t = normalize(stored);
  localStorage.setItem(PREF_KEY, t);
  return t;
}

export const ThemeProvider = ({ children }) => {
  // Preferencia REAL del usuario (light | dark). NUNCA se elimina al cerrar
  // sesión; se conserva para recuperarla en el próximo inicio de sesión.
  const [savedTheme, setSavedTheme] = useState(readSavedTheme);

  // Indica si hay una sesión activa (JWT real o sesión mock restaurada). Se
  // arranca según el token para evitar un parpadeo a claro al recargar con
  // sesión iniciada. AuthContext lo mantiene sincronizado mediante
  // `markAuthenticated`.
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());

  // Tema efectivamente aplicado:
  // - Sin sesión  → vistas públicas (Inicio, Login y Register) SIEMPRE en modo
  //   claro, independientemente de la preferencia guardada del usuario.
  // - Con sesión  → se aplica la preferencia guardada del usuario.
  const theme = isAuthenticated ? savedTheme : "light";

  // Sincroniza el tema activo con el documento (sistema externo).
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Guarda la preferencia de inmediato: siempre en localStorage (respaldo) y,
  // si hay sesión, también en el backend para que persista entre sesiones.
  const applyAndPersist = useCallback((value) => {
    const t = normalize(value);
    localStorage.setItem(PREF_KEY, t);
    if (getToken()) {
      actualizarConfiguracion({ tema: t }).catch(() => {
        // Error silencioso: la preferencia local permanece aplicada.
      });
    }
    return t;
  }, []);

  const setTheme = useCallback((value) => {
    setSavedTheme(applyAndPersist(value));
  }, [applyAndPersist]);

  const toggleTheme = useCallback(() => {
    setSavedTheme((prev) => applyAndPersist(prev === "dark" ? "light" : "dark"));
  }, [applyAndPersist]);

  // Recupera la preferencia del usuario desde el backend. Lo llama AuthContext
  // al iniciar sesión o restaurar la sesión. Si falla, se conserva el respaldo
  // local (que nunca se borra al cerrar sesión).
  const loadUserTheme = useCallback(async () => {
    if (!getToken()) return;
    try {
      const cfg = await obtenerConfiguracion();
      if (cfg && cfg.tema) {
        const t = normalize(cfg.tema);
        setSavedTheme(t);
        localStorage.setItem(PREF_KEY, t);
      }
    } catch {
      // Se conserva la preferencia local.
    }
  }, []);

  const markAuthenticated = useCallback((authed) => {
    setIsAuthenticated(authed);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, loadUserTheme, markAuthenticated }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
