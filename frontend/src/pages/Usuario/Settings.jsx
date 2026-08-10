import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Bell, Shield, Eye, EyeOff, Globe, Moon, Sun, ChevronRight, LogOut, Trash2, HelpCircle, Mail, X, Send, FileText, Scale, Cookie, CheckCircle, Loader2, KeyRound, Lock } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useI18n } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";
import { obtenerConfiguracion, actualizarConfiguracion } from "../../api/configuraciones";
import { forgotPasswordRequest, resetPasswordRequest } from "../../api/auth";

// Mapea las claves del frontend con los campos del backend de configuraciones.
const NOTIF_MAP = {
  email: "notif_email",
  push: "notif_push",
  adoptionUpdates: "notif_adopciones",
  forumReplies: "notif_respuestas_foro",
  newAnimals: "notif_nuevos_animales",
};

export default function Settings() {
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    adoptionUpdates: true,
    forumReplies: false,
    newAnimals: true
  });
  const [saving, setSaving] = useState(false);

  // Carga la configuracion real del usuario autenticado.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const cfg = await obtenerConfiguracion();
        if (!activo || !cfg) return;
        setNotifications({
          email: cfg.notif_email,
          push: cfg.notif_push,
          adoptionUpdates: cfg.notif_adopciones,
          forumReplies: cfg.notif_respuestas_foro,
          newAnimals: cfg.notif_nuevos_animales,
        });
      } catch (e) {
        // se mantienen los valores por defecto
      }
    })();
    return () => { activo = false; };
  }, []);

  // Guarda la configuracion en el backend de forma automatica.
  // `overrides` permite enviar el valor recien cambiado sin depender del
  // estado de React (que aun no se ha actualizado al momento del cambio).
  const persistirConfiguracion = async (overrides = {}) => {
    const payload = {
      tema: overrides.tema ?? theme,
      idioma: overrides.idioma ?? language,
      notif_email: overrides.email ?? notifications.email,
      notif_push: overrides.push ?? notifications.push,
      notif_adopciones: overrides.adoptionUpdates ?? notifications.adoptionUpdates,
      notif_respuestas_foro: overrides.forumReplies ?? notifications.forumReplies,
      notif_nuevos_animales: overrides.newAnimals ?? notifications.newAnimals,
    };
    setSaving(true);
    try {
      await actualizarConfiguracion(payload);
    } catch (e) {
      // error silencioso: los cambios locales permanecen aplicados
    } finally {
      setSaving(false);
    }
  };

  const [privacy, setPrivacy] = useState({
    showAdoptionHistory: false
  });

  // ─── Estados para "Cambiar Contraseña" ─────────────────────────
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passStep, setPassStep] = useState("code"); // 'code' | 'success'
  const [passCode, setPassCode] = useState(["", "", "", "", "", ""]);
  const [passCodeError, setPassCodeError] = useState("");
  const [passNewPassword, setPassNewPassword] = useState("");
  const [passConfirmPassword, setPassConfirmPassword] = useState("");
  const [passShowPassword, setPassShowPassword] = useState(false);
  const [passCountdown, setPassCountdown] = useState(0);
  const [passLoading, setPassLoading] = useState(false);
  const codeInputsRef = useRef([]);
  const [codeSent, setCodeSent] = useState(false);

  // Timer para reenvío de código
  useEffect(() => {
    if (passCountdown > 0) {
      const timer = setTimeout(() => setPassCountdown(passCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [passCountdown]);

  // Contact Support Modal State
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [contactSuccess, setContactSuccess] = useState(false);

  // Help Center Modal State
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Legal Information Modal State
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [activeLegalTab, setActiveLegalTab] = useState("privacy");

  const toggleNotification = (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    persistirConfiguracion({ [key]: next[key] });
  };

  const togglePrivacy = (key) => {
    // La privacidad se aplica de inmediato en la interfaz.
    setPrivacy({ ...privacy, [key]: !privacy[key] });
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setShowContactModal(false);
      setContactForm({ name: "", email: "", subject: "", message: "" });
    }, 2000);
  };

  // ─── Funciones para "Cambiar Contraseña" ──────────────────────

  const validatePassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasUppercase && hasLowercase && hasNumber && hasSpecial;
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleOpenPasswordModal = () => {
    setPassStep("code");
    setPassCode(["", "", "", "", "", ""]);
    setPassCodeError("");
    setPassNewPassword("");
    setPassConfirmPassword("");
    setCodeSent(false);
    setShowPasswordModal(true);
    // Enviar código automáticamente al abrir
    setTimeout(() => handleSendPassCode(), 300);
  };

  const handleSendPassCode = async () => {
    const email = user?.email;
    if (!email) {
      setPassCodeError("No se pudo obtener tu correo electrónico");
      return;
    }

    setPassLoading(true);
    setPassCodeError("");

    try {
      const result = await forgotPasswordRequest(email);
      setPassLoading(false);
      setCodeSent(true);
      setPassCountdown(60);
      if (result && result.enviado === false) {
        setPassCodeError("No se pudo enviar el código. Verifica la configuración de Brevo.");
        return;
      }
      setTimeout(() => {
        if (codeInputsRef.current[0]) codeInputsRef.current[0].focus();
      }, 100);
    } catch (err) {
      setPassLoading(false);
      setPassCodeError(err?.message || "No se pudo enviar el código");
    }
  };

  const handlePassCodeChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      const newCode = [...passCode];
      digits.split("").forEach((d, i) => { if (i < 6) newCode[i] = d; });
      setPassCode(newCode);
      const lastFilled = Math.min(digits.length, 5);
      if (codeInputsRef.current[lastFilled]) codeInputsRef.current[lastFilled].focus();
      return;
    }
    const digit = value.replace(/\D/g, "");
    const newCode = [...passCode];
    newCode[index] = digit;
    setPassCode(newCode);
    if (digit && index < 5 && codeInputsRef.current[index + 1]) {
      codeInputsRef.current[index + 1].focus();
    }
  };

  const handlePassCodeKeyDown = (index, e) => {
    if (e.key === "Backspace" && !passCode[index] && index > 0) {
      if (codeInputsRef.current[index - 1]) codeInputsRef.current[index - 1].focus();
    }
  };

  const handlePassCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...passCode];
    pasted.split("").forEach((d, i) => { if (i < 6) newCode[i] = d; });
    setPassCode(newCode);
    const idx = Math.min(pasted.length - 1, 5);
    if (codeInputsRef.current[idx >= 0 ? idx : 0]) codeInputsRef.current[idx >= 0 ? idx : 0].focus();
  };

  const handleResendPassCode = async () => {
    if (passCountdown > 0) return;
    setPassLoading(true);
    try {
      const result = await forgotPasswordRequest(user?.email);
      setPassCountdown(60);
      setPassCodeError("");
    } catch (err) {
      setPassCodeError(err?.message || "No se pudo reenviar el código");
    }
    setPassLoading(false);
  };

  const handleChangePassword = async () => {
    const code = passCode.join("");
    if (code.length !== 6) {
      setPassCodeError("Ingresa el código completo de 6 dígitos");
      return;
    }
    if (!passNewPassword) {
      setPassCodeError("Ingresa una nueva contraseña");
      return;
    }
    if (!validatePassword(passNewPassword)) {
      setPassCodeError("Debe tener mayúscula, minúscula, número y carácter especial");
      return;
    }
    if (passNewPassword !== passConfirmPassword) {
      setPassCodeError("Las contraseñas no coinciden");
      return;
    }

    setPassLoading(true);
    setPassCodeError("");

    try {
      await resetPasswordRequest(user?.email, code, passNewPassword);
      setPassLoading(false);
      setPassStep("success");
    } catch (err) {
      setPassLoading(false);
      setPassCodeError(err?.message || "Error al cambiar la contraseña");
    }
  };

  const legalContent = {
    privacy: {
      icon: Shield,
      title: t("legal.privacy_policy"),
      content: [
        t("legal.privacy_policy_desc"),
        "Recopilamos información como nombre, correo electrónico, dirección y datos de contacto cuando te registras en nuestra plataforma.",
        "Tus datos personales serán utilizados únicamente para procesar solicitudes de adopción, mejorar nuestros servicios y enviar comunicaciones relevantes con tu consentimiento.",
        "Implementamos medidas de seguridad técnicas y organizativas para proteger tu información contra accesos no autorizados, pérdida o alteración.",
        "Puedes solicitar la modificación, eliminación o portabilidad de tus datos en cualquier momento contactándonos a través de nuestro formulario de soporte.",
        "Para más información sobre el tratamiento de tus datos, consulta nuestra política completa de privacidad disponible en el registro."
      ]
    },
    terms: {
      icon: Scale,
      title: t("legal.terms_of_service"),
      content: [
        t("legal.terms_of_service_desc"),
        "Los usuarios deben ser mayores de 18 años o contar con autorización parental para utilizar la plataforma.",
        "Los refugios asociados son responsables de verificar la idoneidad de los adoptantes y garantizar el bienestar de los animales.",
        "No se permite la publicación de contenido ofensivo, discriminatorio o que promueva el maltrato animal en ninguna sección de la plataforma.",
        "Adoptify se reserva el derecho de suspender cuentas que violen estos términos sin previo aviso.",
        "Los precios y disponibilidad de productos en la tienda están sujetos a cambios sin previo aviso."
      ]
    },
    cookies: {
      icon: Cookie,
      title: t("legal.cookies_policy"),
      content: [
        t("legal.cookies_policy_desc"),
        "Cookies esenciales: Necesarias para el funcionamiento básico de la plataforma, como la autenticación y la seguridad.",
        "Cookies de rendimiento: Nos ayudan a entender cómo los usuarios interactúan con el sitio para mejorar su experiencia.",
        "Cookies de funcionalidad: Permiten recordar tus preferencias, como el idioma y el tema seleccionados.",
        "Cookies de terceros: Utilizadas por servicios externos como Google Analytics y redes sociales integradas en la plataforma.",
        "Al continuar navegando en Adoptify, aceptas el uso de cookies según esta política."
      ]
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2 font-display">
            {t("settings.title")}
          </h1>
          <p className="text-xl text-gray-600">
            {t("settings.subtitle")}
          </p>
          {saving && (
            <p className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 text-sm font-medium text-rose-600 bg-rose-50 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando cambios...
            </p>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 font-display">{t("settings.notifications")}</h3>
              <p className="text-sm text-gray-600">{t("settings.notifications_desc")}</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: "email", label: t("settings.notifications_email"), icon: Mail },
              { key: "push", label: t("settings.notifications_push"), icon: Bell },
              { key: "adoptionUpdates", label: t("settings.notifications_adoption"), icon: Bell },
              { key: "forumReplies", label: t("settings.notifications_forum"), icon: Bell },
              { key: "newAnimals", label: t("settings.notifications_new_animals"), icon: Bell }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">{item.label}</span>
                </div>
                <button
                  onClick={() => toggleNotification(item.key)}
                  className={`w-14 h-8 rounded-full transition-all ${
                    notifications[item.key] ? "bg-gradient-to-r from-rose-500 to-amber-500" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    notifications[item.key] ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 font-display">{t("settings.privacy")}</h3>
              <p className="text-sm text-gray-600">{t("settings.privacy_desc")}</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: "showAdoptionHistory", label: t("settings.privacy_history"), icon: Eye }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">{item.label}</span>
                </div>
                <button
                  onClick={() => togglePrivacy(item.key)}
                  className={`w-14 h-8 rounded-full transition-all ${
                    privacy[item.key] ? "bg-gradient-to-r from-rose-500 to-amber-500" : "bg-gray-300"
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    privacy[item.key] ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Appearance - Dark Mode & Language */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 font-display">{t("settings.appearance")}</h3>
              <p className="text-sm text-gray-600">{t("settings.appearance_desc")}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Language Selector */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">{t("settings.language")}</span>
              </div>
              <select
                value={language}
                onChange={(e) => {
                  const nuevoIdioma = e.target.value;
                  setLanguage(nuevoIdioma);
                  persistirConfiguracion({ idioma: nuevoIdioma });
                }}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5 text-gray-600" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-600" />
                )}
                <span className="font-medium text-gray-900">{t("settings.theme")}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTheme("light");
                    persistirConfiguracion({ tema: "light" });
                  }}
                  className={`p-2 rounded-xl transition-all ${
                    theme === "light" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white" : "bg-white border border-gray-200"
                  }`}
                  title={t("settings.light")}
                >
                  <Sun className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    persistirConfiguracion({ tema: "dark" });
                  }}
                  className={`p-2 rounded-xl transition-all ${
                    theme === "dark" ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white" : "bg-white border border-gray-200"
                  }`}
                  title={t("settings.dark")}
                >
                  <Moon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 font-display">{t("settings.legal_info")}</h3>
              <p className="text-sm text-gray-600">{t("settings.legal_info_desc")}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { setShowLegalModal(true); setActiveLegalTab("privacy"); }}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-rose-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900 group-hover:text-rose-600">{t("legal.privacy_policy")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </button>

            <button
              onClick={() => { setShowLegalModal(true); setActiveLegalTab("terms"); }}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-rose-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900 group-hover:text-rose-600">{t("legal.terms_of_service")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </button>

            <button
              onClick={() => { setShowLegalModal(true); setActiveLegalTab("cookies"); }}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-rose-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Cookie className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900 group-hover:text-rose-600">{t("legal.cookies_policy")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 font-display">{t("settings.help_support")}</h3>
              <p className="text-sm text-gray-600">{t("settings.help_support")}</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Help Center - Opens Modal with User Manual */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-rose-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900 group-hover:text-rose-600">{t("settings.help_center")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </button>

            {/* Contact Support - Opens Modal with Form */}
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-rose-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900 group-hover:text-rose-600">{t("settings.contact_support")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </button>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 font-display">{t("settings.account_actions")}</h3>

          <div className="space-y-3">
            <button
              onClick={handleOpenPasswordModal}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-rose-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900 group-hover:text-rose-600">{t("settings.change_password")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </button>

            <Link to="/profile" className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-rose-50 transition-all group">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900 group-hover:text-rose-600">{t("settings.change_email")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
            </Link>

            <button className="w-full flex items-center justify-between p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-all group">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-600">{t("settings.delete_account")}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <button
            onClick={logout}
            className="flex items-center justify-center gap-3 w-full p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-all group"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-600">{t("settings.logout")}</span>
          </button>
        </div>

      </div>

      {/* Contact Support Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowContactModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">{t("contact.title")}</h3>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Form */}
            {contactSuccess ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900">{t("contact.success")}</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact.name")}</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    placeholder={t("contact.name")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact.email")}</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact.subject")}</label>
                  <select
                    required
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  >
                    <option value="">{t("contact.subject_placeholder")}</option>
                    <option value="general">{t("contact.subject_general")}</option>
                    <option value="technical">{t("contact.subject_technical")}</option>
                    <option value="adoption">{t("contact.subject_adoption")}</option>
                    <option value="account">{t("contact.subject_account")}</option>
                    <option value="other">{t("contact.subject_other")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact.message")}</label>
                  <textarea
                    required
                    rows="5"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                    placeholder={t("contact.message_placeholder")}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
                  >
                    {t("contact.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {t("contact.send")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Help Center Modal - User Manual */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHelpModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">{t("help.title")}</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Manual Content */}
            <div className="p-6 space-y-8">
              {/* Introduction */}
              <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-2 font-display">{t("help.intro_title")}</h4>
                <p className="text-gray-600 leading-relaxed">{t("help.intro_desc")}</p>
              </div>

              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2 font-display">{t("help.section1_title")}</h4>
                  <p className="text-gray-600 leading-relaxed">{t("help.section1_desc")}</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2 font-display">{t("help.section2_title")}</h4>
                  <p className="text-gray-600 leading-relaxed">{t("help.section2_desc")}</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2 font-display">{t("help.section3_title")}</h4>
                  <p className="text-gray-600 leading-relaxed">{t("help.section3_desc")}</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">4</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2 font-display">{t("help.section4_title")}</h4>
                  <p className="text-gray-600 leading-relaxed">{t("help.section4_desc")}</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">5</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2 font-display">{t("help.section5_title")}</h4>
                  <p className="text-gray-600 leading-relaxed">{t("help.section5_desc")}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
              >
                {t("help.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Information Modal */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLegalModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">
                  {legalContent[activeLegalTab]?.title}
                </h3>
              </div>
              <button
                onClick={() => setShowLegalModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Legal Tabs */}
            <div className="px-6 pt-4 flex gap-2 border-b border-gray-100">
              {["privacy", "terms", "cookies"].map((tab) => {
                const TabIcon = legalContent[tab].icon;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveLegalTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all ${
                      activeLegalTab === tab
                        ? "bg-rose-50 text-rose-600 border-b-2 border-rose-500"
                        : "text-gray-600 hover:text-rose-500 hover:bg-gray-50"
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                    {legalContent[tab].title}
                  </button>
                );
              })}
            </div>

            {/* Legal Content */}
            <div className="p-6">
              <div className="space-y-4">
                {legalContent[activeLegalTab]?.content.map((paragraph, idx) => (
                  <p key={idx} className="text-gray-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setShowLegalModal(false)}
                className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
              >
                {t("help.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Cambiar Contraseña ═══ */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-overlay">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-modal-content">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {passStep === "success" ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <Lock className="w-8 h-8 text-[#ea580c]" />
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-display">
                {passStep === "success" ? "¡Contraseña cambiada!" : "Cambiar contraseña"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {passStep === "code" && !codeSent && "Enviando código de verificación..."}
                {passStep === "code" && codeSent && (
                  <>Ingresa el código enviado a <strong>{user?.email}</strong></>
                )}
                {passStep === "success" && "Tu contraseña ha sido cambiada exitosamente"}
              </p>
            </div>

            {/* Step: Code + New Password */}
            {passStep === "code" && (
              <div className="space-y-4">
                {passLoading && !codeSent && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#ea580c]" />
                  </div>
                )}

                {codeSent && (
                  <>
                    {/* 6-digit code inputs */}
                    <div className="flex justify-center gap-2">
                      {passCode.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (codeInputsRef.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePassCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handlePassCodeKeyDown(index, e)}
                          onPaste={index === 0 ? handlePassCodePaste : undefined}
                          className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 outline-none
                            ${passCodeError
                              ? "border-red-400 bg-red-50 text-red-600"
                              : digit
                                ? "border-[#FF8C00] bg-orange-50 text-[#ea580c]"
                                : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300"
                            }
                            focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20`}
                          aria-label={`Digito ${index + 1}`}
                        />
                      ))}
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="auth-label">Nueva contraseña</label>
                      <div className="auth-input-wrapper">
                        <Lock className="auth-input-icon" />
                        <input
                          type={passShowPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={passNewPassword}
                          onChange={(e) => setPassNewPassword(e.target.value)}
                          className="auth-input"
                        />
                        <button
                          type="button"
                          onClick={() => setPassShowPassword(!passShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 auth-eye-btn"
                        >
                          {passShowPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="auth-label">Confirmar contraseña</label>
                      <div className="auth-input-wrapper">
                        <Lock className="auth-input-icon" />
                        <input
                          type={passShowPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={passConfirmPassword}
                          onChange={(e) => setPassConfirmPassword(e.target.value)}
                          className="auth-input"
                        />
                      </div>
                    </div>

                    {passCodeError && (
                      <p className="text-sm text-red-500 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        {passCodeError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={passLoading || passCode.join("").length !== 6 || !passNewPassword}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {passLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Cambiando...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-5 h-5" />
                          <span>Cambiar contraseña</span>
                        </>
                      )}
                    </button>

                    {/* Resend code */}
                    <div className="text-center">
                      <p className="text-sm text-gray-500">
                        ¿No recibiste el código?{" "}
                        {passCountdown > 0 ? (
                          <span className="text-gray-400">Reenviar en {passCountdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendPassCode}
                            disabled={passLoading}
                            className="auth-link font-semibold hover:underline"
                          >
                            Reenviar código
                          </button>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step: Success */}
            {passStep === "success" && (
              <div className="text-center space-y-4">
                <p className="text-gray-600 text-sm">
                  Tu contraseña ha sido actualizada correctamente.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Cerrar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
