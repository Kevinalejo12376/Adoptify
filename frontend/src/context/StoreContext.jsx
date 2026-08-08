// Contexto centralizado de la Tienda Aliada autenticada.
//
// Este contexto se alimenta del endpoint /api/tienda/contexto, que el backend
// construye con la informacion REAL de la base de datos:
//   - tienda: datos basicos de la tienda (nombre, slug, logo, estado).
//   - usuario: tipo de miembro (super_admin | admin) y datos de la persona.
//   - permisos: codigos de permiso que el backend resolvio desde la BD.
//
// Toda la interfaz (sidebar, menu desplegable, botones, rutas) se construye
// exclusivamente con estos permisos, de modo que cualquier cambio en la BD se
// refleja de inmediato sin recargar la aplicacion.
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { contextoTienda, miPerfilTienda, actualizarMiPerfilTienda } from "../api/tienda";

const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
  const [contexto, setContexto] = useState(null);      // { tienda, usuario, es_super_admin, permisos }
  const [store, setStore] = useState(null);            // perfil completo (solo si tiene permiso de verlo)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Recarga el contexto (tienda + tipo + permisos) desde la base de datos.
  const refresh = useCallback(async () => {
    try {
      const ctx = await contextoTienda();
      setContexto(ctx);
      setError(null);

      // Si el usuario puede ver el perfil completo, tambien se carga.
      if (ctx?.permisos?.includes("tienda.ver_perfil")) {
        try {
          const perfil = await miPerfilTienda();
          setStore(perfil);
        } catch {
          setStore(null);
        }
      } else {
        setStore(null);
      }
      return ctx;
    } catch (e) {
      setError(e?.message || "No se pudo cargar el contexto de la tienda");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial al montar el proveedor.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const ctx = await contextoTienda();
        if (!activo) return;
        setContexto(ctx);
        setError(null);
        if (ctx?.permisos?.includes("tienda.ver_perfil")) {
          try {
            const perfil = await miPerfilTienda();
            if (activo) setStore(perfil);
          } catch {
            if (activo) setStore(null);
          }
        }
      } catch (e) {
        if (activo) setError(e?.message || "No se pudo cargar el contexto de la tienda");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Sincronizacion: al volver al foco de la pestana se recarga el contexto,
  // de modo que cambios en permisos/tienda hechos en otra sesion se reflejan.
  useEffect(() => {
    const onFocus = () => { if (contexto) refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [contexto, refresh]);

  // Guarda cambios de la tienda en la BD y sincroniza el contexto al instante.
  const actualizarStore = useCallback(async (payload) => {
    const actualizado = await actualizarMiPerfilTienda(payload);
    setStore(actualizado);
    // Sincroniza el nombre/logo del contexto para el sidebar y menu.
    setContexto((prev) => (prev ? {
      ...prev,
      tienda: {
        ...prev.tienda,
        nombre: actualizado.nombre ?? prev.tienda.nombre,
        logo_url: actualizado.logo_url ?? prev.tienda.logo_url,
      },
    } : prev));
    return actualizado;
  }, []);

  // Actualiza localmente datos del representante sin llamar a la BD.
  const actualizarRepresentante = useCallback((datos) => {
    setStore((prev) => (prev ? { ...prev, ...datos } : prev));
  }, []);

  const permisos = new Set(contexto?.permisos || []);
  const esSuperAdmin = contexto?.es_super_admin === true;
  const tipoUsuario = contexto?.usuario?.tipo || null;
  const usuarioNombre = contexto?.usuario?.nombre || null;
  const storeNombre = contexto?.tienda?.nombre || store?.nombre || null;
  const storeLogo = contexto?.tienda?.logo_url || store?.logo_url || null;
  const representanteNombre = store?.responsable_nombre || null;
  const representanteEmail = store?.responsable_email || null;
  const representanteTelefono = store?.responsable_telefono || null;

  /** Consulta si el usuario posee un permiso especifico (desde la BD). */
  const tienePermiso = useCallback((codigo) => permisos.has(codigo), [contexto]);

  /** Consulta si el usuario posee al menos uno de los permisos indicados. */
  const tieneAlgunoPermiso = useCallback((codigos) => {
    if (!Array.isArray(codigos)) return false;
    return codigos.some((c) => permisos.has(c));
  }, [contexto]);

  return (
    <StoreContext.Provider
      value={{
        contexto, store, loading, error, refresh,
        actualizarStore, actualizarRepresentante,
        permisos, esSuperAdmin, tipoUsuario, usuarioNombre,
        storeNombre, storeLogo,
        representanteNombre, representanteEmail, representanteTelefono,
        tienePermiso, tieneAlgunoPermiso,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
