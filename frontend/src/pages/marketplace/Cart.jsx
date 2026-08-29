import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { listarProductos } from "../../api/productos";
import { crearPedido } from "../../api/pedidos";
import { formatPrice } from "../../utils/price";
import { useAuth } from "../../context/AuthContext";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ShoppingBag,
  Truck,
  CreditCard,
  ShieldCheck,
  Sparkles,
  X,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useCart } from "../../context/CartContext";

const categoryIcons = {
  Alimentos: "🐾",
  Accesorios: "🎒",
  Juguetes: "🎾",
  Salud: "💊",
  Higiene: "🧴",
};

export default function Cart() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    setItemQuantity,
    clearCart,
    cartTotal,
    cartCount,
    addToCart,
  } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderResult, setOrderResult] = useState(null);

  const shipping = cartTotal >= 50 ? 0 : 9.99;
  const discount = promoApplied ? cartTotal * 0.1 : 0;
  const finalTotal = cartTotal + shipping - discount;

  const handleApplyPromo = () => {
    if (promoCode.toLowerCase() === "adoptify10") {
      setPromoApplied(true);
      setPromoError("");
    } else {
      setPromoError("Código inválido. Prueba con 'ADOPTIFY10'");
      setPromoApplied(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(false);
    setPromoCode("");
    setPromoError("");
  };

  const [addedSuggested, setAddedSuggested] = useState({});

  // Productos sugeridos reales desde la base de datos.
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await listarProductos();
        if (!activo) return;
        const mapped = (data || []).slice(0, 3).map((p) => ({
          id: p.id,
          name: p.nombre,
          price: Number(p.precio) || 0,
          category: p.categoria,
          color: "from-rose-300 to-amber-300",
          description: p.descripcion || "",
        }));
        setSuggestedProducts(mapped);
      } catch (e) {
        // sin sugeridos si falla
      }
    })();
    return () => { activo = false; };
  }, []);

  const handleCheckout = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const pedido = await crearPedido({
        items: cart.map((i) => ({ producto_id: i.id, cantidad: i.quantity })),
        costo_envio: shipping,
        descuento: discount,
        codigo_promocion: promoApplied ? promoCode : null,
        metodo_pago: "Contra entrega",
      });
      clearCart();
      setOrderResult(pedido);
    } catch (e) {
      setCheckoutError(e?.message || "No se pudo completar el pedido. Intenta de nuevo.");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleAddSuggested = (product) => {
    addToCart(product);
    setAddedSuggested((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedSuggested((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  // Pantalla de confirmacion tras el checkout
  if (orderResult) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text font-display mb-2">
            ¡Pedido realizado!
          </h1>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-2">
            Tu pedido <span className="font-bold text-gray-900 dark:text-dark-text">{orderResult.numero}</span> fue registrado con éxito.
          </p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-display mb-8">
            Total: {formatPrice(orderResult.total)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/store" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all">
              <ShoppingBag className="w-5 h-5" /> Seguir comprando
            </Link>
            <button onClick={() => setOrderResult(null)} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all">
              Volver al carrito
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <BackButton
              fallback="/store"
              label="Seguir comprando"
              className="text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 mb-4"
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text font-display">
              Carrito de Compras
            </h1>
          </div>

          {/* Empty Cart */}
          <div className="text-center py-20">
            <div className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center">
              <div className="relative">
                <ShoppingCart className="w-14 h-14 text-rose-400 dark:text-rose-500" />
                <X className="w-5 h-5 text-gray-400 absolute -top-1 -right-1 bg-white dark:bg-dark-card rounded-full" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-3 font-display">
              Tu carrito está vacío
            </h2>
            <p className="text-gray-500 dark:text-dark-text-secondary mb-8 max-w-md mx-auto text-lg">
              ¡Explora nuestra tienda y encuentra productos increíbles para tu
              mascota!
            </p>
            <Link
              to="/store"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 text-lg"
            >
              <ShoppingBag className="w-5 h-5" />
              Ir a la Tienda
            </Link>

            {/* Features */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm dark:shadow-dark-border/20 border border-gray-100 dark:border-dark-border">
                <Truck className="w-8 h-8 text-rose-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                  Envío gratis en +$50
                </span>
              </div>
              <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm dark:shadow-dark-border/20 border border-gray-100 dark:border-dark-border">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                  Productos de calidad
                </span>
              </div>
              <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm dark:shadow-dark-border/20 border border-gray-100 dark:border-dark-border">
                <Clock className="w-8 h-8 text-amber-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                  Envío rápido 24/48h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <BackButton
              fallback="/store"
              label="Seguir comprando"
              className="text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 mb-3"
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text font-display">
              Carrito de Compras
            </h1>
            <p className="text-gray-500 dark:text-dark-text-secondary mt-1">
              {cartCount} {cartCount === 1 ? "producto" : "productos"} en tu
              carrito
            </p>
          </div>
          <button
            onClick={clearCart}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all border border-red-100 dark:border-red-900/30"
          >
            <Trash2 className="w-4 h-4" />
            Vaciar carrito
          </button>
        </div>

        {/* Free shipping progress */}
        {cartTotal < 50 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                ¡Te faltan{" "}
                <span className="font-bold">
                  {formatPrice(50 - cartTotal)}
                </span>{" "}
                para envío gratis!
              </p>
            </div>
            <div className="w-full h-2 bg-amber-200 dark:bg-amber-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${(cartTotal / 50) * 100}%` }}
              />
            </div>
          </div>
        )}

        {cartTotal >= 50 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                <span className="font-bold">¡Envío gratis!</span> Disfruta de
                envío sin costo en tu pedido
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 overflow-hidden border border-gray-100 dark:border-dark-border hover:shadow-xl dark:hover:shadow-dark-border/40 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row gap-4 p-5">
                  {/* Product Image */}
                  <div className="w-full sm:w-28 h-28 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-12 h-12 text-rose-400 dark:text-rose-500" />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary text-xs font-medium rounded-full mb-2">
                          {item.category}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">
                          {item.description || "Producto de alta calidad para tu mascota"}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-dark-border">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                          Cant:
                        </span>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-bg rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-dark-text-secondary hover:text-rose-500 hover:bg-white dark:hover:bg-dark-card rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setItemQuantity(item.id, Math.max(1, val));
                            }}
                            className="w-12 text-center text-sm font-semibold text-gray-900 dark:text-dark-text bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-dark-text-secondary hover:text-rose-500 hover:bg-white dark:hover:bg-dark-card rounded-lg transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-display">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        {item.quantity > 1 && (
                          <p className="text-xs text-gray-400 dark:text-dark-text-secondary">
                            {formatPrice(item.price)} c/u
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 border border-gray-100 dark:border-dark-border p-6 sticky top-28">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text font-display mb-6">
                Resumen del Pedido
              </h2>

              {/* Promo Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  ¿Tienes un código de descuento?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="INGRESA CÓDIGO"
                    className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-dark-text dark:placeholder-dark-text-secondary uppercase tracking-wider"
                  />
                  {promoApplied ? (
                    <button
                      onClick={handleRemovePromo}
                      className="px-4 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyPromo}
                      className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
                    >
                      Aplicar
                    </button>
                  )}
                </div>
                {promoError && (
                  <p className="text-xs text-red-500 mt-1.5">{promoError}</p>
                )}
                {promoApplied && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    ¡Código aplicado! 10% de descuento
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-dark-text-secondary">
                    Subtotal ({cartCount} productos)
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-dark-text">
                    {formatPrice(cartTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-dark-text-secondary">
                    Envío
                  </span>
                  <span
                    className={`font-semibold ${
                      shipping === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-900 dark:text-dark-text"
                    }`}
                  >
                    {shipping === 0 ? "GRATIS" : formatPrice(shipping)}
                  </span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Descuento (10%)
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      -{formatPrice(discount)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-dark-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900 dark:text-dark-text">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-display">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              {checkoutError && (
                <p className="text-sm text-red-500 mb-3 text-center">{checkoutError}</p>
              )}
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 text-lg mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                {checkingOut ? "Procesando..." : user ? "Proceder al pago" : "Inicia sesión para comprar"}
              </button>

              {/* Payment methods */}
              <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-dark-text-secondary">
                <div className="flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Pago seguro
                </div>
                <span className="text-gray-300 dark:text-dark-border">|</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  Envío a domicilio
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Products */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">
              También podría interesarte
            </h2>
            <Link
              to="/store"
              className="text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1"
            >
              Ver todo
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 overflow-hidden hover:shadow-xl dark:hover:shadow-dark-border/40 transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-dark-border"
              >
                <div
                  className={`h-32 bg-gradient-to-br ${product.color} opacity-60 dark:opacity-40 flex items-center justify-center`}
                >
                  <ShoppingBag className="w-12 h-12 text-white/60" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-dark-text font-display text-sm mb-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-display">
                      {formatPrice(product.price)}
                    </span>
                    <button
                      onClick={() => handleAddSuggested(product)}
                      disabled={addedSuggested[product.id]}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                        addedSuggested[product.id]
                          ? "bg-emerald-500 text-white"
                          : "bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600"
                      }`}
                    >
                      {addedSuggested[product.id] ? "✓ Agregado" : "+ Agregar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
