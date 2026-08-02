import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  listarProductosFavoritos,
  agregarProductoFavorito,
  quitarProductoFavorito,
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
  reviews: p.ventas || 0,
  reviews: p.resenas_count || 0,
  description: p.descripcion || "",
  stock: p.stock ?? 0,
});

export const FavoritesProvider = ({ children }) => {
  // Favoritos de productos: persistidos en la base de datos.
  const [storeFavorites, setStoreFavorites] = useState([]);

  // Favoritos de refugios: locales (no existe tabla en el backend).
  const [shelterFavorites, setShelterFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("adoptify_shelter_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  useEffect(() => {
    localStorage.setItem("adoptify_shelter_favorites", JSON.stringify(shelterFavorites));
  }, [shelterFavorites]);

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

  // ─── Shelter Favorites ───

  const addShelterFavorite = useCallback((shelter) => {
    setShelterFavorites((prev) => {
      if (prev.some((item) => item.id === shelter.id)) return prev;
      return [...prev, shelter];
    });
  }, []);

  const removeShelterFavorite = useCallback((shelterId) => {
    setShelterFavorites((prev) => prev.filter((item) => item.id !== shelterId));
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
          return prev.filter((item) => item.id !== shelter.id);
        }
        return [...prev, shelter];
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
