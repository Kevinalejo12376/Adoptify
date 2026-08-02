import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  User,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  Camera,
  Sparkles,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Quote,
  Navigation,
  MapPinned,
  Crosshair,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../api/auth";

// ─── Expresiones regulares de validación ───
const REGEX = {
  telefono: /^[\d\s\+\-\(\)]{7,20}$/,
  website: /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-\.\/?%&=]*)?$/,
};

// ─── Hook personalizado para geolocalización ───
function useGeolocation() {
  const [state, setState] = useState({
    loading: false,
    coords: null,
    address: "",
    error: "",
    denied: false,
  });
  const [manualMode, setManualMode] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`,
        { headers: { "Accept-Language": "es" } }
      );
      if (!res.ok) throw new Error("No se pudo obtener la dirección");
      const data = await res.json();
      const addr = data.address || {};
      // Construir una dirección legible: ciudad, región, país
      const parts = [
        addr.city || addr.town || addr.municipality || addr.county,
        addr.state || addr.region,
        addr.country,
      ].filter(Boolean);
      return parts.join(", ");
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Tu navegador no soporta geolocalización. Puedes escribir tu ubicación manualmente.",
        loading: false,
      }));
      setManualMode(true);
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: "" }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!isMounted.current) return;
        const { latitude, longitude } = position.coords;
        setState((prev) => ({ ...prev, coords: { lat: latitude, lng: longitude } }));

        // Intentar obtener dirección legible
        const address = await reverseGeocode(latitude, longitude);
        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            address,
            loading: false,
          }));
        }
      },
      (error) => {
        if (!isMounted.current) return;
        let msg = "";
        let denied = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = "Permiso de ubicación denegado. Puedes escribir tu ubicación manualmente.";
            denied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            msg = "No se pudo obtener la ubicación. Intenta de nuevo o escríbela manualmente.";
            break;
          case error.TIMEOUT:
            msg = "La solicitud de ubicación expiró. Intenta de nuevo o escríbela manualmente.";
            break;
          default:
            msg = "Error al obtener ubicación. Escríbela manualmente.";
        }
        setState((prev) => ({ ...prev, error: msg, loading: false, denied }));
        setManualMode(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [reverseGeocode]);

  const reset = useCallback(() => {
    setState({ loading: false, coords: null, address: "", error: "", denied: false });
    setManualMode(false);
  }, []);

  return { ...state, manualMode, setManualMode, requestLocation, reset };
}

// ─── Campo de formulario reutilizable (rediseñado) ───
function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  icon: Icon,
  placeholder,
  isTextarea = false,
  maxLength,
  helperText,
  disabled = false,
  rightIcon: RightIcon,
  onRightIconClick,
  rightIconTooltip,
}) {
  const hasError = !!error;
  const isValid = !hasError && value && value.trim().length > 0;
  const charsLeft = maxLength ? maxLength - (value?.length || 0) : null;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="relative">
        {/* Icono izquierdo */}
        {Icon && !isTextarea && (
          <div
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${
              hasError
                ? "text-red-400"
                : isValid
                ? "text-emerald-500"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}

        {isTextarea ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={4}
            disabled={disabled}
            className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800/50 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-0 dark:text-white text-gray-900 transition-all duration-200 resize-none text-sm leading-relaxed ${
              Icon ? "pl-10" : "pl-4"
            } ${
              hasError
                ? "border-red-300 dark:border-red-500 bg-red-50/30 dark:bg-red-900/10 focus:ring-red-400/40 focus:border-red-400"
                : isValid
                ? "border-emerald-400 dark:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 focus:ring-emerald-400/40 focus:border-emerald-500"
                : "border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500 focus:ring-rose-400/40 focus:border-rose-400"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          />
        ) : (
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800/50 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-0 dark:text-white text-gray-900 transition-all duration-200 text-sm ${
              Icon ? "pl-10" : "pl-4"
            } ${
              RightIcon ? "pr-10" : isValid || hasError ? "pr-10" : "pr-4"
            } ${
              hasError
                ? "border-red-300 dark:border-red-500 bg-red-50/30 dark:bg-red-900/10 focus:ring-red-400/40 focus:border-red-400"
                : isValid
                ? "border-emerald-400 dark:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 focus:ring-emerald-400/40 focus:border-emerald-500"
                : "border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500 focus:ring-rose-400/40 focus:border-rose-400"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          />
        )}

        {/* Iconos de validación / acción a la derecha */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              disabled={disabled}
              title={rightIconTooltip}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RightIcon className="w-4 h-4 text-gray-400 hover:text-rose-500 transition-colors" />
            </button>
          )}
          {!isTextarea && value && value.trim().length > 0 && !RightIcon && (
            <>
              {hasError ? (
                <AlertCircle className="w-4.5 h-4.5 text-red-500 animate-slide-in" />
              ) : isValid ? (
                <CheckCircle className="w-4.5 h-4.5 text-emerald-500 animate-slide-in" />
              ) : null}
            </>
          )}
        </div>

        {/* Contador de caracteres para textarea */}
        {isTextarea && charsLeft !== null && (
          <div className="absolute bottom-3 right-3">
            <span
              className={`text-xs font-medium ${
                charsLeft < 50
                  ? "text-amber-500"
                  : charsLeft < 20
                  ? "text-red-500"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {charsLeft}
            </span>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {hasError && (
        <div className="flex items-start gap-1.5 mt-1.5 animate-slide-down">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-500 dark:text-red-400 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Helper text */}
      {helperText && !hasError && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed flex items-center gap-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

// ─── Componente principal: CompleteProfileModal ───
export default function CompleteProfileModal({ isOpen, onClose, onComplete }) {
  const { user } = useAuth();
  const geo = useGeolocation();

  // Estado del formulario
  const [formData, setFormData] = useState({
    telefono: "",
    ubicacion: "",
    bio: "",
    website: "",
    twitter: "",
    instagram: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [bioCharCount, setBioCharCount] = useState(0);

  // Resetear formulario al abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        telefono: user?.phone || "",
        ubicacion: user?.location || "",
        bio: "",
        website: "",
        twitter: "",
        instagram: "",
      });
      setBioCharCount(0);
      setErrors({});
      setSubmitError("");
      setSubmitSuccess(false);
      setStep(1);
      geo.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  // Cuando la geolocalización obtiene una dirección, actualizar el formulario
  useEffect(() => {
    if (geo.address && geo.address !== formData.ubicacion) {
      setFormData((prev) => ({ ...prev, ubicacion: geo.address }));
      // Validar el campo después de actualizar
      const err = validateField("ubicacion", geo.address);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next.ubicacion = err;
        else delete next.ubicacion;
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.address]);

  // Solicitar ubicación al montar el modal
  useEffect(() => {
    if (isOpen && !user?.location) {
      const timer = setTimeout(() => {
        geo.requestLocation();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ─── Validación de campo individual ───
  const validateField = useCallback((name, value) => {
    const val = value?.trim() || "";

    switch (name) {
      case "telefono":
        if (val && !REGEX.telefono.test(val)) {
          return "Formato de teléfono inválido (solo números, +, -, espacios)";
        }
        return "";

      case "ubicacion":
        if (val && val.length > 150) {
          return "La ubicación no puede exceder 150 caracteres";
        }
        return "";

      case "bio":
        if (val && val.length > 500) {
          return "La biografía no puede exceder 500 caracteres";
        }
        return "";

      case "website":
        if (val && !REGEX.website.test(val)) {
          return "Formato de URL inválido (ej: https://ejemplo.com)";
        }
        return "";

      case "twitter":
      case "instagram":
        if (val && val.length > 120) {
          return "Máximo 120 caracteres";
        }
        return "";

      default:
        return "";
    }
  }, []);

  // ─── Manejar cambio en cualquier campo ───
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "bio") {
      setBioCharCount(value.length);
    }

    // Si estamos en modo manual de ubicación y el usuario escribe, actualizar
    if (name === "ubicacion" && geo.manualMode) {
      // validar normal
    }

    // Validar en tiempo real
    const error = validateField(name, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[name] = error;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  // ─── Validar todos los campos antes de enviar ───
  const validateAll = useCallback(() => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  // ─── Enviar formulario ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      // Enviar solo campos con contenido
      const payload = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value.trim()) {
          payload[key] = value.trim();
        }
      });

      const result = await updateProfile(payload);
      setSubmitSuccess(true);
      setStep(2);

      // Notificar al padre después de 1.5s
      setTimeout(() => {
        if (onComplete) onComplete(result);
        onClose();
      }, 2000);
    } catch (err) {
      // Manejar errores del backend por campo
      if (err.data && err.data.detail) {
        if (typeof err.data.detail === "object" && !Array.isArray(err.data.detail)) {
          const serverErrors = {};
          Object.entries(err.data.detail).forEach(([field, msg]) => {
            if (formData.hasOwnProperty(field)) {
              serverErrors[field] = msg;
            }
          });
          if (Object.keys(serverErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...serverErrors }));
          } else {
            setSubmitError(err.data.detail._error || "Error al guardar el perfil");
          }
        } else if (Array.isArray(err.data.detail)) {
          const serverErrors = {};
          err.data.detail.forEach((e) => {
            const field = e.loc?.[e.loc.length - 1];
            if (field && formData.hasOwnProperty(field)) {
              serverErrors[field] = e.msg;
            }
          });
          if (Object.keys(serverErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...serverErrors }));
          } else {
            setSubmitError(err.message || "Error al guardar el perfil");
          }
        } else {
          setSubmitError(typeof err.data.detail === "string" ? err.data.detail : "Error al guardar el perfil");
        }
      } else {
        setSubmitError(err?.message || "Error al guardar el perfil. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Cerrar modal (skip) ───
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      {/* Overlay con backdrop blur mejorado */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal Content - flex column con max-height para scroll */}
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] max-w-xl w-full max-h-[90vh] flex flex-col animate-modal-content overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── HEADER GRADIENTE MÁS COMPACTO ─── */}
        <div className="relative flex-shrink-0 h-24 sm:h-28 bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 overflow-hidden">
          {/* Círculos decorativos */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-sm" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-white/5 rounded-full blur-sm" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-white/8 rounded-full blur-sm" />

          {/* Botón cerrar */}
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white/30 hover:scale-105 transition-all text-white disabled:opacity-50 z-10 shadow-lg shadow-black/5"
          >
            <X className="w-4.5 h-4.5" />
          </button>

          {/* Contenido del header */}
          <div className="absolute bottom-3.5 left-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg shadow-black/5 ring-2 ring-white/20">
              <User className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display tracking-tight leading-tight">
                Completa tu Perfil
              </h2>
              <p className="text-xs text-white/80 font-medium">
                Cuéntanos más sobre ti
              </p>
            </div>
          </div>
        </div>

        {/* ─── STEP 1: FORMULARIO SCROLLABLE ─── */}
        {step === 1 && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 scrollbar-thin">
              {/* Barra de progreso */}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full w-2/3 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 rounded-full transition-all duration-700"
                    style={{ width: "66%" }}
                  />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[11px] font-semibold rounded-full border border-amber-200 dark:border-amber-700/30 whitespace-nowrap">
                  <Sparkles className="w-2.5 h-2.5" />
                  Opcional
                </span>
              </div>

              {/* Mensaje de error general del servidor */}
              {submitError && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl shadow-sm">
                  <AlertCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{submitError}</p>
                </div>
              )}

              {/* ─── INFORMACIÓN PERSONAL ─── */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-rose-500 to-amber-500 rounded-full" />
                  <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Información Personal
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    label="Teléfono"
                    name="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={handleChange}
                    error={errors.telefono}
                    icon={Phone}
                    placeholder="+57 300 123 4567"
                    helperText="Para que los refugios puedan contactarte"
                  />
                  <FormField
                    label="Ubicación"
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleChange}
                    error={errors.ubicacion}
                    icon={geo.loading ? Loader2 : geo.denied ? MapPin : MapPinned}
                    placeholder={
                      geo.loading
                        ? "Obteniendo ubicación..."
                        : "Bogotá, Colombia"
                    }
                    disabled={geo.loading}
                    helperText={
                      geo.loading
                        ? "Detectando tu ubicación..."
                        : geo.denied
                        ? "Permiso denegado — puedes escribir tu ubicación"
                        : !formData.ubicacion && !geo.denied
                        ? "Haz clic en el icono para detectar tu ubicación"
                        : "Tu ciudad o región"
                    }
                    rightIcon={
                      !geo.loading ? (geo.denied ? RefreshCw : Crosshair) : null
                    }
                    onRightIconClick={() => {
                      if (geo.denied) {
                        geo.reset();
                        geo.requestLocation();
                      } else {
                        geo.requestLocation();
                      }
                    }}
                    rightIconTooltip={
                      geo.denied
                        ? "Reintentar geolocalización"
                        : "Detectar mi ubicación"
                    }
                  />
                </div>
              </div>

              {/* ─── SOBRE TI ─── */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-rose-500 to-amber-500 rounded-full" />
                  <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Sobre Ti
                  </h3>
                </div>
                <FormField
                  label="Biografía"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  error={errors.bio}
                  isTextarea
                  icon={Quote}
                  placeholder="Cuéntanos sobre ti, tu experiencia con animales, por qué te gusta adoptar..."
                  maxLength={500}
                  helperText={
                    formData.bio.length > 0
                      ? `${formData.bio.length}/500 caracteres`
                      : "Comparte un poco sobre ti para que los refugios te conozcan mejor"
                  }
                />
              </div>

              {/* ─── REDES Y SITIO WEB ─── */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-rose-500 to-amber-500 rounded-full" />
                  <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Redes y Sitio Web
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    label="Sitio Web"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    error={errors.website}
                    icon={Globe}
                    placeholder="https://tusitio.com"
                    helperText="Tu página personal o proyecto"
                  />
                  <FormField
                    label="Twitter / X"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    error={errors.twitter}
                    icon={MessageCircle}
                    placeholder="@tuusuario"
                    helperText="Tu perfil de Twitter"
                  />
                  <FormField
                    label="Instagram"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    error={errors.instagram}
                    icon={Camera}
                    placeholder="@tuusuario"
                    helperText="Tu perfil de Instagram"
                  />
                </div>
              </div>
            </div>

            {/* ─── ACCIONES FIJAS EN LA PARTE INFERIOR ─── */}
            <div className="flex-shrink-0 flex gap-2.5 px-5 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-900">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all border border-gray-200 dark:border-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:shadow-sm"
              >
                Ahora no
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:via-pink-600 hover:to-amber-600 transition-all duration-300 hover:shadow-lg hover:shadow-rose-200/50 dark:hover:shadow-rose-900/30 disabled:opacity-70 disabled:cursor-not-allowed text-sm active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Perfil</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ─── STEP 2: ÉXITO ─── */}
        {step === 2 && (
          <div className="flex-1 flex items-center justify-center p-8 sm:p-10 text-center">
            <div className="space-y-5">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-full flex items-center justify-center animate-scale-in shadow-lg shadow-emerald-200/30 dark:shadow-emerald-900/20">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white font-display tracking-tight">
                  ¡Perfil completado!
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Tu información ha sido guardada correctamente. Los refugios podrán conocerte mejor.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-rose-500 dark:text-rose-400 animate-pulse-subtle">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-medium">Redirigiendo...</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── DECORACIÓN INFERIOR ─── */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500" />
      </div>

      {/* Estilos adicionales */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-content-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out;
        }
        .animate-modal-content {
          animation: modal-content-in 0.35s ease-out;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        .animate-slide-down {
          animation: slide-down 0.25s ease-out;
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
