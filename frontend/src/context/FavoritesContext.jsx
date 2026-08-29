import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  listarProductosFavoritos,
  agregarProductoFavorito,
  quitarProductoFavorito,
  listarRefugiosFavoritos,
  agregarRefugioFavorito,
  quitarRefugioFavorito,
} from "../api/favoritos";
import { getToken } from "../api/client";

const FavoritesContext = createContext(null);

// Normaliza un producto favorito del backend a la forma que usan las vistas.
const mapProductoFav = (p) => ({
  ...p,
  name: p.nombre,
  category: p.categoria,
  price: Number(p.precio) || 0,
  rating: Number(p.rating) || 0,
  reviews: p.resenas_count || p.ventas || 0,
  description: p.descripcion || "",
  stock: p.stock ?? 0,
  // Imagen principal del producto (Cloudinary) para mostrarla en las cards.
  image: p.imagen_url || (p.imagenes && p.imagenes[0]?.url) || null,
});

// Normaliza un refugio favorito del backend a la forma que usan las vistas.
// Tolera el formato del backend (nombre/ubicacion/descripcion) y el ya
// mapeado (name/location/description) por si el frontend lo normalizó.
const mapRefugioFav = (r) => ({
  id: r.id,
  name: r.name || r.nombre || "",
  location: r.location || r.ubicacion || r.municipio || r.departamento || "",
  description: r.description || r.descripcion || "",
  // El logo llega como logo_url (backend) o como logo (vistas públicas) según
  // el origen; se conserva cualquiera de las dos para mostrarlo en favoritos.
  logo_url: r.logo_url || r.logo || null,
  rating: Number(r.rating) || 0,
  animals: Number(r.animals) || 0,
});

export const FavoritesProvider = ({ children }) => {
  // Favoritos de productos: persistidos en la base de datos.
  const [storeFavorites, setStoreFavorites] = useState([]);

  // Favoritos de refugios: persistidos en la base de datos (sin valores locales).
  const [shelterFavorites, setShelterFavorites] = useState([]);

  // Carga los productos favoritos reales cuando hay sesion iniciada.
  useEffect(() => {
    if (!getToken()) return;
    (async () => {
      try {
        const data = await listarProductosFavoritos();
        setStoreFavorites((data || []).map(mapProductoFav));
      } catch { /* sin favoritos */ }
    })();
  }, []);

  // Carga los refugios favoritos reales desde la base de datos ([] = vacío).
  useEffect(() => {
    if (!getToken()) return;
    (async () => {
      try {
        const data = await listarRefugiosFavoritos();
        setShelterFavorites((data || []).map(mapRefugioFav));
      } catch { /* sin favoritos */ }
    })();
  }, []);

  // ─── Store Favorites (base de datos) ───

  const addStoreFavorite = useCallback((product) => {
    setStoreFavorites((prev) =>
      prev.some((item) => item.id === product.id) ? prev : [...prev, product]
    );
    agregarProductoFavorito(product.id).catch(() => {});
  }, []);

  const removeStoreFavorite = useCallback((productId) => {
    setStoreFavorites((prev) => prev.filter((item) => item.id !== productId));
    quitarProductoFavorito(productId).catch(() => {});
  }, []);

  const isStoreFavorite = useCallback(
    (productId) => {
      return storeFavorites.some((item) => item.id === productId);
    },
    [storeFavorites]
  );

  const toggleStoreFavorite = useCallback(
    (product) => {
      setStoreFavorites((prev) => {
        const exists = prev.some((item) => item.id === product.id);
        if (exists) {
          quitarProductoFavorito(product.id).catch(() => {});
          return prev.filter((item) => item.id !== product.id);
        }
        agregarProductoFavorito(product.id).catch(() => {});
        return [...prev, product];
      });
    },
    []
  );

  // ─── Shelter Favorites (base de datos) ───

  const addShelterFavorite = useCallback((shelter) => {
    setShelterFavorites((prev) => {
      if (prev.some((item) => item.id === shelter.id)) return prev;
      agregarRefugioFavorito(shelter.id).catch(() => {});
      return [...prev, mapRefugioFav(shelter)];
    });
  }, []);

  const removeShelterFavorite = useCallback((shelterId) => {
    setShelterFavorites((prev) => prev.filter((item) => item.id !== shelterId));
    quitarRefugioFavorito(shelterId).catch(() => {});
  }, []);

  const isShelterFavorite = useCallback(
    (shelterId) => {
      return shelterFavorites.some((item) => item.id === shelterId);
    },
    [shelterFavorites]
  );

  const toggleShelterFavorite = useCallback(
    (shelter) => {
      setShelterFavorites((prev) => {
        const exists = prev.some((item) => item.id === shelter.id);
        if (exists) {
          quitarRefugioFavorito(shelter.id).catch(() => {});
          return prev.filter((item) => item.id !== shelter.id);
        }
        agregarRefugioFavorito(shelter.id).catch(() => {});
        return [...prev, mapRefugioFav(shelter)];
      });
    },
    []
  );

  return (
    <FavoritesContext.Provider
      value={{
        storeFavorites,
        addStoreFavorite,
        removeStoreFavorite,
        isStoreFavorite,
        toggleStoreFavorite,
        shelterFavorites,
        addShelterFavorite,
        removeShelterFavorite,
        isShelterFavorite,
        toggleShelterFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
