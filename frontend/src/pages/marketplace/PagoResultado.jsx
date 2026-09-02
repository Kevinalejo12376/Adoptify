<<<<<<< HEAD
<<<<<<< HEAD
import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { consultarEstadoPago } from "../../api/pagos";
import { useCart } from "../../context/CartContext";
import { CheckCircle, XCircle, Clock, Loader2, ShoppingBag, ArrowRight, RotateCcw } from "lucide-react";

// Polling: cada 3s, máximo 20 intentos (~60s), solo mientras el pago está en
// proceso. Nunca es infinito.
const POLL_INTERVALO_MS = 3000;
const POLL_MAX_INTENTOS = 20;

const ESTADOS_FINALES = new Set(["pagado", "fallido", "cancelado", "reembolsado"]);

=======
import React, { useEffect, useState } from "react";
=======
import React, { useEffect, useRef, useState } from "react";
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
import { Link, useSearchParams } from "react-router-dom";
import { consultarEstadoPago } from "../../api/pagos";
import { useCart } from "../../context/CartContext";
import { CheckCircle, XCircle, Clock, Loader2, ShoppingBag, ArrowRight, RotateCcw } from "lucide-react";

<<<<<<< HEAD
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
// Polling: cada 3s, máximo 20 intentos (~60s), solo mientras el pago está en
// proceso. Nunca es infinito.
const POLL_INTERVALO_MS = 3000;
const POLL_MAX_INTENTOS = 20;

const ESTADOS_FINALES = new Set(["pagado", "fallido", "cancelado", "reembolsado"]);

>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
export default function PagoResultado() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");
  const pagoId = searchParams.get("pago_id");
<<<<<<< HEAD
<<<<<<< HEAD
  const resultado = searchParams.get("resultado"); // 'success' | 'cancel'

  const { clearCart } = useCart();
=======
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
  const resultado = searchParams.get("resultado"); // 'success' | 'cancel'

  const { clearCart } = useCart();
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [pago, setPago] = useState(null);
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
  const carritoLimpio = useRef(false);

  // Sin identificadores y con resultado=cancel -> pantalla de cancelación sin
  // consultar la API (evita "No se pudo verificar el pago").
  const esCancelacionSinRef = !sessionId && !orderId && !pagoId && resultado === "cancel";
<<<<<<< HEAD

  useEffect(() => {
    if (esCancelacionSinRef) {
      setCargando(false);
      return;
    }
    let activo = true;
    let intentos = 0;
    let intervalId = null;

    const consultar = async () => {
      intentos += 1;
      try {
        const data = await consultarEstadoPago({ session_id: sessionId, order_id: orderId, pago_id: pagoId });
        if (!activo) return;
        setPago(data);
        setError("");
        // Limpia el carrito SOLO cuando el pago se confirma (no antes).
        if (data.estado === "pagado" && !carritoLimpio.current) {
          clearCart();
          carritoLimpio.current = true;
        }
        // Detiene el polling cuando el pago llega a un estado final.
        if (ESTADOS_FINALES.has(data.estado) || intentos >= POLL_MAX_INTENTOS) {
          if (intervalId) clearInterval(intervalId);
          setCargando(false);
        }
      } catch (e) {
        if (!activo) return;
        setError(e?.message || "No se pudo verificar el estado del pago.");
        if (intentos >= POLL_MAX_INTENTOS) {
          if (intervalId) clearInterval(intervalId);
          setCargando(false);
        }
      }
    };

    (async () => {
      setCargando(true);
      await consultar();
      if (activo && cargandoPendiente()) {
        intervalId = setInterval(consultar, POLL_INTERVALO_MS);
      }
    })();

    // Helper para saber si debe seguir el polling (leído dentro del closure).
    function cargandoPendiente() {
      return activo && intentos < POLL_MAX_INTENTOS;
    }

    return () => { activo = false; if (intervalId) clearInterval(intervalId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, orderId, pagoId, esCancelacionSinRef]);

  if (cargando && !esCancelacionSinRef) {
=======
=======
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)

  useEffect(() => {
    if (esCancelacionSinRef) {
      setCargando(false);
      return;
    }
    let activo = true;
    let intentos = 0;
    let intervalId = null;

    const consultar = async () => {
      intentos += 1;
      try {
        const data = await consultarEstadoPago({ session_id: sessionId, order_id: orderId, pago_id: pagoId });
        if (!activo) return;
        setPago(data);
        setError("");
        // Limpia el carrito SOLO cuando el pago se confirma (no antes).
        if (data.estado === "pagado" && !carritoLimpio.current) {
          clearCart();
          carritoLimpio.current = true;
        }
        // Detiene el polling cuando el pago llega a un estado final.
        if (ESTADOS_FINALES.has(data.estado) || intentos >= POLL_MAX_INTENTOS) {
          if (intervalId) clearInterval(intervalId);
          setCargando(false);
        }
      } catch (e) {
        if (!activo) return;
        setError(e?.message || "No se pudo verificar el estado del pago.");
        if (intentos >= POLL_MAX_INTENTOS) {
          if (intervalId) clearInterval(intervalId);
          setCargando(false);
        }
      }
    };

    (async () => {
      setCargando(true);
      await consultar();
      if (activo && cargandoPendiente()) {
        intervalId = setInterval(consultar, POLL_INTERVALO_MS);
      }
    })();

<<<<<<< HEAD
  if (cargando) {
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
    // Helper para saber si debe seguir el polling (leído dentro del closure).
    function cargandoPendiente() {
      return activo && intentos < POLL_MAX_INTENTOS;
    }

    return () => { activo = false; if (intervalId) clearInterval(intervalId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, orderId, pagoId, esCancelacionSinRef]);

  if (cargando && !esCancelacionSinRef) {
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
        <div className="max-w-lg mx-auto px-4 text-center py-16">
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display mb-2">
            Verificando tu pago...
          </h1>
          <p className="text-gray-500 dark:text-dark-text-secondary">
            Estamos consultando el estado real de tu pago.
          </p>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
  // Pantalla de cancelación: el usuario abandonó el Checkout.
  if (esCancelacionSinRef) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
        <div className="max-w-lg mx-auto px-4 text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <Clock className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text font-display mb-2">
            Pago cancelado
          </h1>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-2">
            No se completó el pago. Tu carrito sigue disponible.
          </p>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-8">
            Puedes volver a intentarlo cuando quieras.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/cart"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
            >
              <ShoppingBag className="w-4 h-4" /> Volver al carrito
            </Link>
            <Link
              to="/store"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
=======
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
  if (error || !pago) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
        <div className="max-w-lg mx-auto px-4 text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display mb-2">
            No se pudo verificar el pago
          </h1>
          <p className="text-gray-500 dark:text-dark-text-secondary mb-8">
            {error || "No encontramos información de este pago."}
          </p>
          <Link
            to="/mis-pedidos"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
          >
            Ver mis pedidos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const estado = pago.estado;
  const esPagado = estado === "pagado";
  const esPendiente = estado === "pendiente" || estado === "procesando";
  const esReembolsado = estado === "reembolsado";
  const esCancelado = estado === "cancelado";
  const esFallido = estado === "fallido";
<<<<<<< HEAD
<<<<<<< HEAD
=======
  const final = !esPendiente;
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)

  const icono = esPagado ? CheckCircle : esReembolsado ? RotateCcw : (esPendiente ? Clock : XCircle);
  const colorFondo = esPagado
    ? "bg-emerald-100 dark:bg-emerald-900/30"
    : esPendiente
    ? "bg-amber-100 dark:bg-amber-900/30"
    : "bg-red-100 dark:bg-red-900/30";
  const colorIcono = esPagado
    ? "text-emerald-500"
    : esPendiente
    ? "text-amber-500"
    : "text-red-500";

  const titulo = esPagado
    ? "¡Pago confirmado!"
    : esReembolsado
    ? "Pago reembolsado"
    : esCancelado
    ? "Pago cancelado"
    : esFallido
    ? "Pago fallido"
    : esPendiente
    ? "Pago en proceso"
    : "Pago no completado";

  const mensaje = esPagado
<<<<<<< HEAD
<<<<<<< HEAD
    ? "Tu pago fue confirmado y tu pedido ya está en proceso."
=======
    ? "Tu pago fue confirmado por Stripe y tu pedido ya está en proceso."
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
    ? "Tu pago fue confirmado y tu pedido ya está en proceso."
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
    : esReembolsado
    ? "Este pago fue reembolsado."
    : esCancelado
    ? "El pago fue cancelado. Puedes intentarlo de nuevo desde tu pedido."
    : esFallido
    ? "No pudimos procesar el pago. Revisa tus datos e inténtalo de nuevo."
    : esPendiente
<<<<<<< HEAD
<<<<<<< HEAD
    ? "Tu pago está pendiente de confirmación. Te notificaremos cuando dLocal lo confirme."
=======
    ? "Tu pago está pendiente de confirmación. Te notificaremos cuando Stripe lo confirme."
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
    ? "Tu pago está pendiente de confirmación. Te notificaremos cuando dLocal lo confirme."
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
    : "El pago no se completó.";

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
      <div className="max-w-lg mx-auto px-4 text-center py-16">
        <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${colorFondo}`}>
          <IconoComp icono={icono} color={colorIcono} />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text font-display mb-2">
          {titulo}
        </h1>
        <p className="text-gray-500 dark:text-dark-text-secondary mb-2">
          {pago.order_id}
        </p>
<<<<<<< HEAD
<<<<<<< HEAD
        {pago.estado_pasarela && (
          <p className="text-sm text-gray-400 dark:text-dark-text-secondary mb-8">
            Estado en dLocal: <span className="font-semibold">{pago.estado_pasarela}</span>
          </p>
        )}

        <p className="text-gray-500 dark:text-dark-text-secondary mb-8">{mensaje}</p>
=======
        {pago.estado_stripe && (
=======
        {pago.estado_pasarela && (
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)
          <p className="text-sm text-gray-400 dark:text-dark-text-secondary mb-8">
            Estado en dLocal: <span className="font-semibold">{pago.estado_pasarela}</span>
          </p>
        )}

<<<<<<< HEAD
        {!esPendiente && (
          <p className="text-gray-500 dark:text-dark-text-secondary mb-8">{mensaje}</p>
        )}
        {esPendiente && !final && (
          <p className="text-gray-500 dark:text-dark-text-secondary mb-8">{mensaje}</p>
        )}
>>>>>>> c445638 (Migración de dLocal a Stripe)
=======
        <p className="text-gray-500 dark:text-dark-text-secondary mb-8">{mensaje}</p>
>>>>>>> 5b4c0b2 (feat(Pasarela-de-pagos): pasarela de pagos implementada y funcional)

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={pago.pedido_id ? `/mis-pedidos/${pago.pedido_id}` : "/mis-pedidos"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
          >
            Ver mi pedido <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/store"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border transition-all"
          >
            <ShoppingBag className="w-4 h-4" /> Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}

function IconoComp({ icono: Icono, color }) {
  return <Icono className={`w-12 h-12 ${color}`} />;
}
