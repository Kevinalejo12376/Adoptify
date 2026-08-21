import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Eye, EyeOff, Lock, KeyRound, CheckCircle2,
  Loader2, AlertCircle, Sparkles,
} from "lucide-react";
import { ADOPTIFY_LOGO as logo } from "../../constants/assets";
import { crearPasswordRefugio } from "../../api/solicitudesRefugio";
import { crearPasswordTienda } from "../../api/solicitudesTienda";

export default function CrearPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const validar = () => {
    if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (password !== confirm) return "Las contraseñas no coinciden.";
    return "";
  };

  const enviar = async (e) => {
    e.preventDefault();
    const err = validar();
    if (err) {
      setError(err);
      return;
    }
    setCargando(true);
    setError("");
    try {
      // Primero se intenta el endpoint de Tienda Aliada (valida contraseña fuerte
      // y registra el historial de la tienda). Si el enlace es de un refugio, el
      // backend responde 404 y se usa el endpoint de refugio.
      try {
        await crearPasswordTienda(token, password);
      } catch (eTienda) {
        if (eTienda?.status === 404) {
          await crearPasswordRefugio(token, password);
        } else {
          throw eTienda;
        }
      }
      setExito(true);
    } catch (e2) {
      setError(e2.message || "No se pudo crear la contraseña. Verifica el enlace.");
    } finally {
      setCargando(false);
    }
  };

  if (exito) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10 text-center animate-bounce-in">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-2xl opacity-40 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-200">
              <CheckCircle2 size={42} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-display font-extrabold text-gray-900 mb-3">
            ¡Contraseña creada!
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            Tu cuenta ya está lista. Ya puedes iniciar sesión en Adoptify
            con tu correo y la nueva contraseña.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200"
          >
            <KeyRound size={18} /> Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-rose-500 to-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
              <img
                src="/FaviconNav.png"
                alt="Adoptify"
                width={36}
                height={36}
                className="w-9 h-9 object-contain"
                loading="eager"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Crear mi contraseña</h2>
              <p className="text-sm text-white/80">Bienvenido a Adoptify</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-100 p-4 flex gap-3">
            <Sparkles size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">
              Tu solicitud fue aprobada. Define la contraseña de acceso para tu cuenta.
            </p>
          </div>

          <form onSubmit={enviar} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white placeholder-gray-400 outline-none transition-all focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar contraseña</label>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white placeholder-gray-400 outline-none transition-all focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-60"
            >
              {cargando ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
              Crear mi contraseña
            </button>
          </form>

          <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-600 transition-colors">
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
