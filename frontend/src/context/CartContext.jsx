import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

// Clave usada para los visitantes SIN sesión. Mantiene compatibilidad con el
// carrito que ya existía bajo "adoptify_cart".
const GUEST_CART_KEY = "adoptify_cart";

// Cada cuenta autenticada tiene SU PROPIO carrito bajo "adoptify_cart_<id>".
// ANTES se usaba una única clave global compartida por todos los usuarios del
// mismo navegador, por lo que un usuario recién registrado "heredaba" los
// productos que otro usuario o visitante anterior había dejado en el carrito.
// Con esta separación, un usuario nuevo (sin clave guardada) inicia con el
// carrito vacío y solo ve los productos que ÉL agrega.
const cartKeyFor = (userId) => (userId ? `adoptify_cart_${userId}` : GUEST_CART_KEY);

// Lee y valida el carrito almacenado bajo una clave. Devuelve siempre un array.
function readStoredCart(key) {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // localStorage corrupto o no disponible: se asume carrito vacío.
    return [];
  }
}

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  // Identifica la cuenta activa: id real del backend (con email de respaldo si
  // el id no está disponible). null => visitante sin sesión (carrito invitado).
  const userId = user?.id || user?.email || null;
  const storageKey = cartKeyFor(userId);

  // Estado inicial: carrito del visitante (se usa mientras la sesión aún no se
  // resuelve; AuthContext restaura la cuenta de forma asíncrona).
  const [cart, setCart] = useState(() => readStoredCart(GUEST_CART_KEY));
  // Clave de la cuenta a la que pertenece el carrito que hay en memoria.
  const [activeKey, setActiveKey] = useState(storageKey);

  // Cuando cambia la cuenta activa (login/logout/registro), se carga el carrito
  // EXCLUSIVO de esa cuenta. Se hace ajustando el estado durante el render
  // (patrón recomendado por React para derivar estado de un cambio), NO dentro
  // de un efecto, para evitar persistir el carrito de una cuenta sobre otra.
  // Un usuario nuevo no tiene clave guardada => su carrito inicia vacío ([]).
  if (activeKey !== storageKey) {
    setActiveKey(storageKey);
    setCart(readStoredCart(storageKey));
  }

  // Persistencia: guarda el carrito de la cuenta activa cuando cambia (agregar,
  // quitar, cantidad, vaciar). Tras un cambio de cuenta, `activeKey` ya apunta a
  // la nueva cuenta y `cart` ya contiene su carrito hidratado.
  useEffect(() => {
    try {
      localStorage.setItem(activeKey, JSON.stringify(cart));
    } catch {
      // Almacenamiento no disponible: el carrito solo vive en memoria.
    }
  }, [activeKey, cart]);

  const addToCart = useCallback((product, quantity = 1) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id, delta) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }, []);

  const setItemQuantity = useCallback((id, quantity) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, quantity);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        setItemQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
