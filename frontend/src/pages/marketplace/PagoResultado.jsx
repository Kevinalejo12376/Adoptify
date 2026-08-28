import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { consultarEstadoPago } from "../../api/pagos";
import { CheckCircle, XCircle, Clock, Loader2, ShoppingBag, ArrowRight, RotateCcw } from "lucide-react";

export default function PagoResultado() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");
  const pagoId = searchParams.get("pago_id");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [pago, setPago] = useState(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      setError("");
      try {
        // Consulta el estado REAL del pago. La URL de retorno (success_url) NO
        // es fuente de verdad: la confirmación real viene del webhook de Stripe.
        const data = await consultarEstadoPago({ session_id: sessionId, order_id: orderId, pago_id: pagoId });
        if (!activo) return;
        setPago(data);
      } catch (e) {
        if (activo) setError(e?.message || "No se pudo verificar el estado del pago.");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [sessionId, orderId, pagoId]);

  if (cargando) {
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
  const final = !esPendiente;

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
    ? "Tu pago fue confirmado por Stripe y tu pedido ya está en proceso."
    : esReembolsado
    ? "Este pago fue reembolsado."
    : esCancelado
    ? "El pago fue cancelado. Puedes intentarlo de nuevo desde tu pedido."
    : esFallido
    ? "No pudimos procesar el pago. Revisa tus datos e inténtalo de nuevo."
    : esPendiente
    ? "Tu pago está pendiente de confirmación. Te notificaremos cuando Stripe lo confirme."
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
        {pago.estado_stripe && (
          <p className="text-sm text-gray-400 dark:text-dark-text-secondary mb-8">
            Estado en Stripe: <span className="font-semibold">{pago.estado_stripe}</span>
          </p>
        )}

        {!esPendiente && (
          <p className="text-gray-500 dark:text-dark-text-secondary mb-8">{mensaje}</p>
        )}
        {esPendiente && !final && (
          <p className="text-gray-500 dark:text-dark-text-secondary mb-8">{mensaje}</p>
        )}

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
