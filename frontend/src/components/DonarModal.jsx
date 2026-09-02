// Modal "¿Cómo deseas ayudar?" — punto de entrada del sistema de donaciones.
// - 💰 Dinero: seleccionar refugio y continuar hacia la página de la pasarela
//   de pagos (/donar/:refugioId), que queda preparada para integrarse después.
// - 🐾 Ropa, accesorios u otros: mostrar refugios con nombre, dirección y
//   teléfono; el usuario registra su donación física y coordina la entrega.
// Funciona para usuarios anónimos y registrados. Si hay sesión, la donación
// queda asociada a la cuenta; si no, se registra como "Donación anónima" con
// una referencia única para dar seguimiento.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HandHeart, Banknote, Package, MapPin, Phone, Mail, X, Check,
  Loader2, ArrowRight, Search, AlertCircle, Sparkles, User,
} from "lucide-react";
import { listarRefugios } from "../api/refugios";
import { crearDonacion, consultarDonacionPorReferencia } from "../api/donaciones";
import { useAuth } from "../context/AuthContext";

const ESTADOS_TEXTO = {
  pendiente: "Pendiente",
  pago_confirmado: "Pago confirmado",
  recibida: "Recibida",
  no_recibida: "No recibida",
  fallida: "Fallida",
};

// Normaliza el refugio (tanto la forma de la API como la del perfil de
// ShelterDetails) a la forma interna que usa el modal. Así el componente se
// puede reutilizar desde Home, "Mis donaciones" o el perfil de un refugio.
function normalizarRefugio(r) {
  return {
    id: r?.id,
    nombre: r?.nombre || r?.name || "Refugio",
    logo_url: r?.logo_url || r?.logo || null,
    ubicacion: r?.ubicacion || r?.location || r?.municipio || "",
    direccion: r?.direccion || r?.address || "",
    telefono: r?.telefono || r?.phone || "",
    email: r?.email || "",
  };
}

export default function DonarModal({ isOpen, onClose, refugioInicial = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paso, setPaso] = useState("elegir"); // elegir | dinero | fisica | fisica-form | exito | consultar
  const [refugios, setRefugios] = useState([]);
  const [refugiosLoading, setRefugiosLoading] = useState(false);
  const [refugiosError, setRefugiosError] = useState(null);
  const [refugioSel, setRefugioSel] = useState(null);
  const [form, setForm] = useState({ detalle: "", nombre: "", telefono: "", email: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [donacionCreada, setDonacionCreada] = useState(null);
  const [busquedaRef, setBusquedaRef] = useState("");
  const [consulta, setConsulta] = useState(null);
  const [consultando, setConsultando] = useState(false);

  // Reinicia el estado interno al abrir/cerrar el modal. Si llega un
  // `refugioInicial` (p. ej. desde el perfil del refugio), queda preseleccionado.
  useEffect(() => {
    if (isOpen) {
      setPaso("elegir");
      setForm({ detalle: "", nombre: "", telefono: "", email: "" });
      setError(null);
      setDonacionCreada(null);
      setConsulta(null);
      setBusquedaRef("");
      setRefugioSel(refugioInicial ? normalizarRefugio(refugioInicial) : null);
      cargarRefugios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, refugioInicial]);

  const cargarRefugios = async () => {
    setRefugiosLoading(true);
    setRefugiosError(null);
    try {
      const data = await listarRefugios();
      setRefugios(Array.isArray(data) ? data : []);
    } catch (e) {
      setRefugiosError(e?.message || "No se pudieron cargar los refugios");
    } finally {
      setRefugiosLoading(false);
    }
  };

  const irADinero = () => setPaso("dinero");
  const irAFisica = () => {
    // Si ya viene un refugio preseleccionado (perfil), ir directo al formulario.
    setPaso(refugioSel ? "fisica-form" : "fisica");
  };

  const continuarPago = () => {
    if (!refugioSel) {
      setError("Selecciona un refugio para continuar");
      return;
    }
    navigate(`/donar/${refugioSel.id}`);
  };

  const crearFisica = async (e) => {
    e.preventDefault();
    setError(null);
    if (!refugioSel) {
      setError("Selecciona un refugio");
      return;
    }
    if ((form.detalle || "").trim().length < 5) {
      setError("Describe brevemente qué deseas donar");
      return;
    }
    setEnviando(true);
    try {
      const donacion = await crearDonacion({
        refugio_id: refugioSel.id,
        tipo: "fisica",
        detalle: form.detalle.trim(),
        nombre_donante: form.nombre.trim() || (user ? undefined : "Donación anónima"),
        telefono_contacto: form.telefono.trim() || undefined,
        email_contacto: form.email.trim() || undefined,
      });
      setDonacionCreada(donacion);
      setPaso("exito");
    } catch (err) {
      setError(err?.message || "No se pudo registrar tu donación. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const consultar = async (e) => {
    e.preventDefault();
    if (!busquedaRef.trim()) return;
    setConsultando(true);
    setConsulta(null);
    try {
      setConsulta(await consultarDonacionPorReferencia(busquedaRef.trim()));
    } catch (err) {
      setConsulta({ error: err?.message || "No se encontró la donación" });
    } finally {
      setConsultando(false);
    }
  };

  if (!isOpen) return null;

  const nombreUsuario = user ? `${user?.name || user?.nombre || ""}`.trim() : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white dark:bg-dark-card rounded-3xl shadow-2xl animate-modal-pop">
        {/* Encabezado */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-rose-500 to-amber-500 px-5 sm:px-7 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <HandHeart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">¿Cómo deseas ayudar?</h2>
              <p className="text-rose-100 text-xs sm:text-sm">
                Tu apoyo hace la diferencia en la vida de los animales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {paso === "elegir" && (
            <>
              <p className="text-center text-gray-600 dark:text-dark-text-secondary">
                Elige cómo quieres apoyar a los refugios aliados de Adoptify.
              </p>

              {refugioSel && (
                <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 border border-rose-100 dark:border-rose-500/20 p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-500/20 dark:to-rose-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {refugioSel.logo_url ? (
                      <img src={refugioSel.logo_url} alt={refugioSel.nombre} className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <HandHeart className="w-6 h-6 text-rose-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Donarás a</p>
                    <p className="font-bold text-gray-900 dark:text-white truncate">{refugioSel.nombre}</p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={irADinero}
                  className="group text-left bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 border-2 border-rose-100 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-400 rounded-2xl p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Banknote className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">💰 Dinero</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                    Haz una donación monetaria a un refugio para cubrir alimentos, medicinas y cuidados.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
                    Continuar <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>

                <button
                  onClick={irAFisica}
                  className="group text-left bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-500/10 dark:to-rose-500/10 border-2 border-amber-100 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-400 rounded-2xl p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">🐾 Ropa, accesorios u otros</h3>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                    Dona alimentos, ropa, camas, juguetes y más. Te mostramos cómo contactar al refugio.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Continuar <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              </div>

              {/* Consultar donación por referencia */}
              <div className="border-t border-gray-100 dark:border-dark-border pt-4">
                <button
                  onClick={() => setPaso("consultar")}
                  className="text-sm text-gray-500 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4" /> ¿Ya donaste? Consulta el estado de tu donación
                </button>
              </div>
            </>
          )}

          {paso === "dinero" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Selecciona el refugio</h3>
                <button onClick={() => setPaso("elegir")} className="text-sm text-gray-500 hover:text-rose-600 dark:hover:text-rose-400">
                  Volver
                </button>
              </div>

              {refugioSel && (
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  Donarás a: <span className="text-gray-900 dark:text-white">{refugioSel.nombre}</span>
                </p>
              )}

              {refugiosLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
                  <p className="text-sm">Cargando refugios...</p>
                </div>
              ) : refugiosError ? (
                <div className="text-center py-10 text-red-500 text-sm">{refugiosError}</div>
              ) : refugios.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Aún no hay refugios disponibles</div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {refugios.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRefugioSel(r)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                        refugioSel?.id === r.id
                          ? "border-rose-400 bg-rose-50 dark:bg-rose-500/10 shadow-sm"
                          : "border-gray-100 dark:border-dark-border hover:border-rose-200 dark:hover:border-rose-500/30"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-500/20 dark:to-rose-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {r.logo_url ? (
                          <img src={r.logo_url} alt={r.nombre} className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        ) : (
                          <HandHeart className="w-6 h-6 text-rose-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{r.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">
                          {r.ubicacion || r.municipio || "Colombia"}
                        </p>
                      </div>
                      {refugioSel?.id === r.id && (
                        <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setPaso("elegir")}
                  className="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={continuarPago}
                  disabled={!refugioSel}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold shadow-lg shadow-rose-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl transition-all"
                >
                  Continuar al pago <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {paso === "fisica" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Refugios disponibles</h3>
                <button onClick={() => setPaso("elegir")} className="text-sm text-gray-500 hover:text-rose-600 dark:hover:text-rose-400">
                  Volver
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                Contacta al refugio para coordinar la entrega, o registra tu donación aquí para darle seguimiento.
              </p>

              {refugiosLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
                  <p className="text-sm">Cargando refugios...</p>
                </div>
              ) : refugiosError ? (
                <div className="text-center py-10 text-red-500 text-sm">{refugiosError}</div>
              ) : refugios.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Aún no hay refugios disponibles</div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {refugios.map((r) => (
                    <div key={r.id} className={`rounded-2xl border-2 p-4 transition-all ${refugioSel?.id === r.id ? "border-amber-400 bg-amber-50/50 dark:bg-amber-500/10" : "border-gray-100 dark:border-dark-border"}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-500/20 dark:to-rose-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {r.logo_url ? (
                            <img src={r.logo_url} alt={r.nombre} className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          ) : (
                            <HandHeart className="w-6 h-6 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white">{r.nombre}</p>
                          <div className="mt-1.5 space-y-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                            <p className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" /> {r.direccion || r.ubicacion || r.municipio || "Ubicación no disponible"}</p>
                            <p className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-amber-500 flex-shrink-0" /> {r.telefono || "Sin teléfono registrado"}</p>
                            {r.email && <p className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-amber-500 flex-shrink-0" /> {r.email}</p>}
                          </div>
                          <button
                            onClick={() => { setRefugioSel(r); setPaso("fisica-form"); }}
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700"
                          >
                            Registrar donación a este refugio <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {paso === "fisica-form" && (
            <form onSubmit={crearFisica} className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registrar donación</h3>
                <button type="button" onClick={() => { setPaso("fisica"); setRefugioSel(null); }} className="text-sm text-gray-500 hover:text-rose-600 dark:hover:text-rose-400">
                  Volver
                </button>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-500/10 dark:to-rose-500/10 border border-amber-100 dark:border-amber-500/20 p-4">
                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HandHeart className="w-5 h-5 text-amber-600" /> {refugioSel?.nombre}
                </p>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-amber-500" /> {refugioSel?.telefono || "Sin teléfono"} · <MapPin className="w-4 h-4 text-amber-500" /> {refugioSel?.direccion || refugioSel?.ubicacion || "—"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                  ¿Qué deseas donar? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={form.detalle}
                  onChange={(e) => setForm({ ...form, detalle: e.target.value })}
                  rows={3}
                  placeholder="Ej: 5 cobijas, 3 kilos de concentrado para perro, 2 camas y juguetes"
                  className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                    Tu nombre
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      placeholder={nombreUsuario || "Donación anónima"}
                      className="w-full pl-9 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-amber-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                    Teléfono de contacto
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      placeholder="+57 300 123 4567"
                      className="w-full pl-9 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-amber-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                  Correo de contacto
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full pl-9 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-amber-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => { setPaso("fisica"); setRefugioSel(null); }}
                  className="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold shadow-lg shadow-amber-200 disabled:opacity-60 transition-all"
                >
                  {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {enviando ? "Registrando..." : "Registrar donación"}
                </button>
              </div>
            </form>
          )}

          {paso === "exito" && donacionCreada && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-display">¡Gracias por tu apoyo! 🎉</h3>
              <p className="text-gray-600 dark:text-dark-text-secondary">
                Tu donación fue registrada correctamente. Coordina la entrega con el refugio.
              </p>

              <div className="bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-500/10 dark:to-rose-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 p-5 text-left space-y-2">
                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HandHeart className="w-5 h-5 text-amber-600" /> {donacionCreada.refugio_nombre}
                </p>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-amber-500" /> {donacionCreada.refugio?.telefono || "Sin teléfono registrado"}
                </p>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-500" /> {donacionCreada.refugio?.direccion || donacionCreada.refugio?.ubicacion || "—"}
                </p>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-amber-500" /> {donacionCreada.refugio?.email || "—"}
                </p>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-500/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Referencia de tu donación</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">{donacionCreada.referencia}</p>
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                  Guárdala para darle seguimiento. {donacionCreada.es_anonimo ? "Como donación anónima podrás consultarla por esta referencia." : "También la verás en 'Mis donaciones'."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setPaso("consultar")}
                  className="px-5 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold hover:border-gray-300 transition-colors"
                >
                  Consultar estado
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold shadow-lg shadow-rose-200 hover:shadow-xl transition-all"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          {paso === "consultar" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Consultar donación</h3>
                <button onClick={() => setPaso("elegir")} className="text-sm text-gray-500 hover:text-rose-600 dark:hover:text-rose-400">
                  Volver
                </button>
              </div>

              <form onSubmit={consultar} className="flex flex-col sm:flex-row gap-3">
                <input
                  value={busquedaRef}
                  onChange={(e) => setBusquedaRef(e.target.value.toUpperCase())}
                  placeholder="Ej: ADF-8K3X9Q"
                  className="flex-1 p-3 rounded-xl border-2 border-gray-200 dark:border-dark-border dark:bg-dark-input bg-white text-gray-900 dark:text-white focus:border-rose-400 focus:outline-none uppercase transition-colors"
                />
                <button
                  type="submit"
                  disabled={consultando || !busquedaRef.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold disabled:opacity-50 transition-all"
                >
                  {consultando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Consultar
                </button>
              </form>

              {consulta && (
                consulta.error ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {consulta.error}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-gray-100 dark:border-dark-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 dark:text-white">{consulta.refugio_nombre}</p>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                        {ESTADOS_TEXTO[consulta.estado] || consulta.estado}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                      {consulta.tipo === "dinero"
                        ? `Donación monetaria · ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(consulta.valor)}`
                        : `Donación física · ${consulta.detalle}`}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{consulta.referencia}</p>
                    {consulta.motivo_no_recibida && (
                      <p className="text-sm text-red-600 dark:text-red-400">Motivo: {consulta.motivo_no_recibida}</p>
                    )}
                  </div>
                )
              )}

              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                Si donaste como usuario registrado, también puedes ver el detalle en "Mis donaciones".
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
