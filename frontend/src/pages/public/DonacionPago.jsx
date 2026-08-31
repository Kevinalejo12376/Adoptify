// Página de donación monetaria (pasarela de pagos).
//
// IMPORTANTE: la pasarela de pagos REAL todavía NO está integrada. Esta página
// deja preparado todo el flujo y el espacio para conectarla después:
//   1. El usuario selecciona el refugio y el monto.
//   2. Se crea la donación en la BD (estado "pendiente").
//   3. Se simula el procesamiento del pago.
//   4. Al confirmarse, el backend pasa la donación a "pago_confirmado" mediante
//      POST /api/donaciones/{id}/pago-confirmado — el mismo endpoint que
//      invocará el webhook de la pasarela real cuando se integre.
//   5. Si el pago falla, se marca como "fallida" y se muestra
//      "Tu donación no pudo completarse" sin dejar estados engañosos.
//
// Para probar el escenario de fallo, en desarrollo aparece un enlace
// "Simular pago rechazado (demo)".
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  HandHeart, Banknote, MapPin, Phone, ShieldCheck, Check, X, Loader2,
  AlertCircle, ArrowLeft, ArrowRight, Lock, User, Sparkles, RefreshCw,
} from "lucide-react";
import { obtenerRefugio } from "../../api/refugios";
import { crearDonacion, confirmarPago, pagoFallido } from "../../api/donaciones";
import { useAuth } from "../../context/AuthContext";
import CompartirDonacionModal from "../../components/CompartirDonacionModal";

const MONTOS_PREDETERMINADOS = [10000, 25000, 50000, 100000, 200000, 500000];

const nf = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default function DonacionPago() {
  const { refugioId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [refugio, setRefugio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [monto, setMonto] = useState(25000);
  const [montoCustom, setMontoCustom] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  const [paso, setPaso] = useState("form"); // form | procesando | exito | fallo
  const [donacion, setDonacion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const autenticado = !!user;

  useEffect(() => {
    setCargando(true);
    obtenerRefugio(refugioId)
      .then((r) => {
        setRefugio(r);
        if (user?.name || user?.nombre) setNombre(user?.name || user?.nombre);
        if (user?.email) setEmail(user?.email);
        if (user?.telefono) setTelefono(user?.telefono);
      })
      .catch(() => setError("No se pudo cargar el refugio. Intenta de nuevo."))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refugioId]);

  const valorFinal = montoCustom ? parseInt(montoCustom.replace(/[^\d]/g, ""), 10) || 0 : monto;

  const seleccionarMonto = (m) => {
    setMonto(m);
    setMontoCustom("");
  };

  const iniciarPago = async (simularFallo = false) => {
    setError(null);
    if (valorFinal < 1000) {
      setError("Indica un monto válido para tu donación (mínimo $1.000)");
      return;
    }
    if (!refugio) {
      setError("No se encontró el refugio");
      return;
    }
    setProcesando(true);
    setPaso("procesando");
    try {
      // 1. Crea la donación (anónima o asociada a la cuenta) con estado "pendiente".
      const donacionCreada = await crearDonacion({
        refugio_id: refugio.id,
        tipo: "dinero",
        valor: valorFinal,
        nombre_donante: nombre.trim() || (autenticado ? undefined : "Donación anónima"),
        telefono_contacto: telefono.trim() || undefined,
        email_contacto: email.trim() || undefined,
      });
      setDonacion(donacionCreada);

      // 2. Simula el procesamiento del pago (aquí se conectará la pasarela real).
      await new Promise((r) => setTimeout(r, 1800));

      if (simularFallo) {
        await pagoFallido(donacionCreada.id, { motivo: "Pago rechazado por el proveedor (demo)" });
        setPaso("fallo");
      } else {
        // 3. Confirma el pago: punto de integración del webhook de la pasarela.
        const confirmada = await confirmarPago(donacionCreada.id, {
          transaccion_id: `SIM-${Date.now()}`,
          pasarela_datos: { proveedor: "demo", estado: "aprobado" },
        });
        setDonacion(confirmada);
        setPaso("exito");
      }
    } catch (e) {
      setError(e?.message || "Tu donación no pudo completarse. Intenta de nuevo.");
      setPaso("form");
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando refugio...</p>
      </div>
    );
  }

  if (error && !refugio) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-700 mb-6">{error}</p>
        <Link to="/" className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="max-w-3xl mx-auto">
        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="w-10 h-10 rounded-xl bg-white dark:bg-dark-card shadow-sm flex items-center justify-center text-gray-500 hover:text-rose-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Donación monetaria</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">Tu ayuda llega directo al refugio</p>
          </div>
        </div>

        {paso === "form" && (
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden">
            {/* Info del refugio */}
            <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {refugio?.logo_url ? (
                  <img src={refugio.logo_url} alt={refugio.nombre} className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <HandHeart className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display truncate">{refugio?.nombre}</h2>
                <p className="text-rose-100 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {refugio?.ubicacion || refugio?.municipio || "Colombia"}
                </p>
                {refugio?.telefono && (
                  <p className="text-rose-100 text-sm flex items-center gap-1.5">
                    <Phone className="w-4 h-4" /> {refugio.telefono}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Monto */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  ¿Cuánto deseas donar?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {MONTOS_PREDETERMINADOS.map((m) => (
                    <button
                      key={m}
                      onClick={() => seleccionarMonto(m)}
                      className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                        !montoCustom && monto === m
                          ? "border-rose-400 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary hover:border-rose-200"
                      }`}
                    >
                      {nf.format(m)}
                    </button>
                  ))}
                </div>
                <div className="mt-3 relative">
                  <Banknote className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={montoCustom}
                    onChange={(e) => setMontoCustom(e.target.value)}
                    placeholder="Otro monto..."
                    inputMode="numeric"
                    className="w-full pl-9 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-rose-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Datos del donante */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                  Tus datos {autenticado ? "(prellenados de tu cuenta)" : "(opcionales)"}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder={autenticado ? "Tu nombre" : "Nombre (o deja en blanco para ser anónimo)"}
                      className="w-full pl-9 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-rose-400 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Teléfono"
                      className="w-full pl-9 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-rose-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="relative">
                  <span className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">@</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    className="w-full pl-9 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-rose-400 focus:outline-none transition-colors"
                  />
                </div>
                {!autenticado && (
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Sin sesión tu donación se registrará como "Donación anónima" con una referencia para darle seguimiento.
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Acciones */}
              <div className="space-y-3">
                <button
                  onClick={() => iniciarPago(false)}
                  disabled={procesando}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-lg shadow-lg shadow-rose-200 disabled:opacity-60 hover:shadow-xl transition-all"
                >
                  {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                  Donar {valorFinal >= 1000 ? nf.format(valorFinal) : ""}
                </button>

                {/* Punto de integración de la pasarela real */}
                <div className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-4">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                    🔒 Pasarela de pagos — próximamente
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
                    El flujo ya está preparado: al confirmarse el pago, el backend registra la donación y notifica al refugio.
                    Aquí se integrará el proveedor de pagos (webhook → pago-confirmado).
                  </p>
                  {import.meta.env.DEV && (
                    <button
                      onClick={() => iniciarPago(true)}
                      disabled={procesando}
                      className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400 underline hover:text-amber-700 disabled:opacity-50"
                    >
                      Simular pago rechazado (demo) — validar el caso "Tu donación no pudo completarse"
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {paso === "procesando" && (
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border p-10 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Procesando tu pago...</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary">
              Estamos confirmando tu donación de {valorFinal >= 1000 ? nf.format(valorFinal) : ""} a {refugio?.nombre}.
            </p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        )}

        {paso === "exito" && donacion && (
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border p-8 sm:p-10 text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-display">¡Gracias por tu donación! 🎉</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary max-w-lg mx-auto">
              Tu donación de <strong className="text-rose-600">{nf.format(donacion.valor)}</strong> a{" "}
              <strong>{donacion.refugio_nombre}</strong> fue confirmada y ya está en camino para ayudar a los animales.
            </p>

            <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-500/30 p-4 max-w-xs mx-auto">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Referencia de tu donación</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{donacion.referencia}</p>
              {donacion.transaccion_id && (
                <p className="text-xs text-gray-400 mt-1">Transacción: {donacion.transaccion_id}</p>
              )}
            </div>

            {/* Pregunta de compartir en el foro (solo registrados) */}
            {autenticado && !donacion.compartida && (
              <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-500/10 dark:to-fuchsia-500/10 border border-violet-100 dark:border-violet-500/20 p-5 max-w-lg mx-auto">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" /> ¿Quieres compartir tu donación en el foro?
                </p>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  Inspira a más personas. La IA te ayudará a redactar la publicación y podrás editarla antes de publicar.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    onClick={() => setShareOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-200 hover:shadow-xl transition-all"
                  >
                    <Sparkles className="w-5 h-5" /> Sí, compartir
                  </button>
                  <button
                    onClick={() => navigate("/")}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-gray-300 transition-colors"
                  >
                    No, gracias
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {autenticado && (
                <Link
                  to="/mis-donaciones"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-rose-300 hover:text-rose-600 transition-colors"
                >
                  Ver mis donaciones <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold shadow-lg shadow-rose-200 hover:shadow-xl transition-all"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        )}

        {paso === "fallo" && donacion && (
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border p-8 sm:p-10 text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
              <X className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-display">Tu donación no pudo completarse</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary max-w-lg mx-auto">
              El pago no fue aprobado por el proveedor. No se registró ningún cargo y tu donación queda como intento fallido.
              Puedes intentarlo de nuevo.
            </p>

            <div className="rounded-2xl border-2 border-dashed border-red-200 dark:border-red-500/30 p-4 max-w-xs mx-auto">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Referencia del intento</p>
              <p className="text-lg font-bold text-gray-700 dark:text-white font-mono">{donacion.referencia}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => { setPaso("form"); setDonacion(null); setError(null); }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold shadow-lg shadow-rose-200 hover:shadow-xl transition-all"
              >
                <RefreshCw className="w-5 h-5" /> Reintentar
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-gray-300 transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modal para compartir en el foro (Gemini) */}
      <CompartirDonacionModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        donacion={donacion}
        onPublicado={() => { setShareOpen(false); }}
      />
    </div>
  );
}
