import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, PawPrint, Heart, User, Mail, Lock, ArrowRight,
  Eye, EyeOff, CheckCircle, XCircle, Phone, FileText,
  Shield, KeyRound, Loader2, Send
} from "lucide-react";
import AutoFadingImage from "../../components/AutoFadingImage";
import GoogleIcon from "../../components/GoogleIcon";
import { CAROUSEL_IMAGES } from "../../assets/images";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { getTiposDocumento } from "../../api/catalogos";
import { sendVerificationCode, verifyCode, registerWithCodeRequest } from "../../api/auth";

// Carrusel de fotos: imágenes servidas desde Cloudinary (carpeta
// "frontend-assets/assets-extras"). Centralizadas en src/assets/images.js.
const authCarouselImages = CAROUSEL_IMAGES;

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Register() {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [role, setRole] = useState("adopter");
  // Tipos de documento traidos de la base de datos (tabla tipos_documento)
  const [tiposDocumento, setTiposDocumento] = useState([]);

  useEffect(() => {
    getTiposDocumento()
      .then((data) => setTiposDocumento(data))
      .catch((err) => {
        console.warn("[Register] No se pudieron cargar los tipos de documento:", err?.message || err);
        setTiposDocumento([]);
      });
  }, []);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Estados para verificación de email
  const [step, setStep] = useState("form"); // 'form' | 'code' | 'loading'
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeInputsRef = useRef([]);

  // Timer para reenvío de código
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Validar formato de email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar contraseña (mayúscula, minúscula, número, especial)
  const validatePassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasUppercase && hasLowercase && hasNumber && hasSpecial;
  };

  // Validar documento (solo números)
  const validateDocumentNumber = (number) => {
    return /^\d+$/.test(number) && number.length >= 10;
  };

  // Validar teléfono
  const validatePhone = (phone) => {
    return /^\+?\d{10,15}$/.test(phone.replace(/\s/g, ''));
  };

  // Validar espacios (no al inicio/final, no dobles)
  const validateSpaces = (value) => {
    return value === value.trim() && !/\s{2,}/.test(value);
  };

  // Validar campo individual
  const validateField = (field, value) => {
    let error = "";

    switch (field) {
      case "firstName":
        if (!value.trim()) {
          error = "El nombre es obligatorio";
        } else if (!validateSpaces(value)) {
          error = "No se permiten espacios al inicio/final ni espacios dobles";
        }
        break;
      case "lastName":
        if (!value.trim()) {
          error = "Los apellidos son obligatorios";
        } else if (!validateSpaces(value)) {
          error = "No se permiten espacios al inicio/final ni espacios dobles";
        }
        break;
      case "documentType":
        if (!value) {
          error = "El tipo de documento es obligatorio";
        }
        break;
      case "documentNumber":
        if (!value.trim()) {
          error = "El número de documento es obligatorio";
        } else if (!validateDocumentNumber(value)) {
          error = "Debe contener solo números y mínimo 10 dígitos";
        }
        break;
      case "phone":
        if (!value.trim()) {
          error = "El teléfono es obligatorio";
        } else if (!validatePhone(value)) {
          error = "Formato inválido (ej: 300 123 4567)";
        }
        break;
      case "email":
        if (!value.trim()) {
          error = "El correo es obligatorio";
        } else if (!validateEmail(value)) {
          error = "Formato de correo inválido";
        } else if (!validateSpaces(value)) {
          error = "No se permiten espacios al inicio/final ni espacios dobles";
        }
        break;
      case "password":
        if (!value) {
          error = "La contraseña es obligatoria";
        } else if (!validatePassword(value)) {
          error = "Debe tener mayúscula, minúscula, número y carácter especial";
        }
        break;
      case "confirmPassword":
        if (!value) {
          error = "Confirmar contraseña es obligatorio";
        } else if (value !== password) {
          error = "Las contraseñas no coinciden";
        }
        break;
      case "terms":
        if (!value) {
          error = "Debes aceptar los términos y condiciones";
        }
        break;
    }

    return error;
  };

  // Manejar cambio de campo con validación
  const handleFieldChange = (field, value) => {
    const setter = {
      firstName: setFirstName,
      lastName: setLastName,
      documentType: setDocumentType,
      documentNumber: setDocumentNumber,
      phone: setPhone,
      email: setEmail,
      password: setPassword,
      confirmPassword: setConfirmPassword,
      terms: setTerms,
      role: setRole,
    }[field];

    setter(value);

    if (field !== "terms" && field !== "role") {
      const error = validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  // Validar todos los campos
  const validateAll = () => {
    const newErrors = {
      firstName: validateField("firstName", firstName),
      lastName: validateField("lastName", lastName),
      documentType: validateField("documentType", documentType),
      documentNumber: validateField("documentNumber", documentNumber),
      phone: validateField("phone", phone),
      email: validateField("email", email),
      password: validateField("password", password),
      confirmPassword: validateField("confirmPassword", confirmPassword),
      terms: validateField("terms", terms),
    };

    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  };

  // ─── PASO 1: Enviar código de verificación ──────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();

    if (!validateAll()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendVerificationCode(email, "registro", firstName);
      setIsLoading(false);

      // Verificar si el correo realmente se envió
      if (result && result.enviado === false) {
        setErrors((prev) => ({
          ...prev,
          email:
            "El código se generó pero no se pudo enviar el correo. " +
            "Verifica la configuración de Brevo o contacta al administrador.",
        }));
        return;
      }

      setCodeSent(true);
      setStep("code");
      setCountdown(60); // 60 segundos para reenviar
      // Enfocar el primer input del código
      setTimeout(() => {
        if (codeInputsRef.current[0]) {
          codeInputsRef.current[0].focus();
        }
      }, 100);
    } catch (err) {
      setIsLoading(false);
      setErrors((prev) => ({
        ...prev,
        email: err?.message || "No se pudo enviar el código de verificación",
      }));
    }
  };

  // ─── Manejar entrada del código de 6 dígitos ────────────────────
  const handleCodeChange = (index, value) => {
    if (value.length > 1) {
      // Si pegan un código completo, distribuir
      const digits = value.replace(/\D/g, "").slice(0, 6);
      const newCode = [...verificationCode];
      digits.split("").forEach((d, i) => {
        if (i < 6) newCode[i] = d;
      });
      setVerificationCode(newCode);
      // Enfocar el último campo llenado o el siguiente vacío
      const lastFilled = Math.min(digits.length, 5);
      if (codeInputsRef.current[lastFilled]) {
        codeInputsRef.current[lastFilled].focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newCode = [...verificationCode];
    newCode[index] = digit;
    setVerificationCode(newCode);

    // Auto-avanzar al siguiente campo
    if (digit && index < 5 && codeInputsRef.current[index + 1]) {
      codeInputsRef.current[index + 1].focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      if (codeInputsRef.current[index - 1]) {
        codeInputsRef.current[index - 1].focus();
      }
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...verificationCode];
    pasted.split("").forEach((d, i) => {
      if (i < 6) newCode[i] = d;
    });
    setVerificationCode(newCode);
    const lastFilled = Math.min(pasted.length - 1, 5);
    if (codeInputsRef.current[lastFilled >= 0 ? lastFilled : 0]) {
      codeInputsRef.current[lastFilled >= 0 ? lastFilled : 0].focus();
    }
  };

  // ─── PASO 2: Verificar código y registrar ───────────────────────
  const handleVerifyAndRegister = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setCodeError("Ingresa el código completo de 6 dígitos");
      return;
    }

    setCodeError("");
    setIsLoading(true);

    const rol = role === "shelter" || role === "refugio" ? "refugio" : "usuario";

    try {
      await registerWithCodeRequest({
        nombre: firstName,
        apellido: lastName,
        email,
        password,
        codigo_verificacion: code,
        telefono: phone,
        tipo_documento: documentType,
        numero_documento: documentNumber,
        rol,
        ...(rol === "refugio" ? { nombre_refugio: `${firstName} ${lastName}`.trim() } : {}),
      });

      setIsLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      setCodeError(err?.message || "Código inválido o expirado");
    }
  };

  // ─── Reenviar código ─────────────────────────────────────────────
  const handleResendCode = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    try {
      await sendVerificationCode(email, "registro", firstName);
      setCountdown(60);
      setCodeError("");
    } catch (err) {
      setCodeError(err?.message || "No se pudo reenviar el código");
    }
    setIsLoading(false);
  };

  // ─── Volver al formulario ────────────────────────────────────────
  const handleBackToForm = () => {
    setStep("form");
    setVerificationCode(["", "", "", "", "", ""]);
    setCodeError("");
  };

  // ─── Google Sign-In ─────────────────────────────────────────────
  const handleGoogleLogin = async (credential) => {
    try {
      setIsLoading(true);
      const loggedUser = await googleLogin(credential);
      setIsLoading(false);
      setSuccess(true);
      const role = loggedUser?.role;
      setTimeout(() => {
        if (role === "administrador" || role === "administrador_principal") {
          navigate("/admin/dashboard");
        } else if (role === "refugio" || role === "empleado_refugio") {
          navigate("/refugio/dashboard");
        } else if (role === "tienda_aliada") {
          navigate("/tienda/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      setErrors((prev) => ({
        ...prev,
        email: err?.message || "Error al iniciar sesion con Google",
      }));
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              handleGoogleLogin(response.credential);
            }
          },
        });
        setGoogleLoaded(true);
      }
    };
    document.body.appendChild(script);
    return () => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) existing.remove();
    };
  }, []);

  // ─── Google Sign-In (botón personalizado) ─────────────────────
  // El flujo de autenticación no cambia: `initialize` con client_id y callback
  // continúa igual; solo se dispara desde un botón limpio [G] Google.
  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert(
        'Para habilitar el inicio de sesion con Google:\n\n' +
        '1. Ve a https://console.cloud.google.com/apis/credentials\n' +
        '2. Crea un OAuth 2.0 Client ID (Web application)\n' +
        '3. Agrega http://localhost:5173 en "Authorized JavaScript origins"\n' +
        '4. Copia el Client ID en frontend/.env'
      );
      return;
    }
    if (window.google?.accounts?.id) {
      // Abre el flujo de selector de cuenta de Google (One Tap / popup).
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="auth-page">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="auth-bg-circle auth-bg-circle-1" />
        <div className="auth-bg-circle auth-bg-circle-2" />
        <div className="auth-bg-circle auth-bg-circle-3" />
        <div className="auth-bg-circle auth-bg-circle-4" />
        <div className="auth-bg-circle auth-bg-circle-5" />
        <div className="auth-bg-circle auth-bg-circle-6" />
      </div>

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-modal-overlay">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-modal-content">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display">¡Cuenta creada exitosamente!</h3>
            <p className="text-gray-500 mb-6">Redirigiendo al inicio de sesión...</p>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF4D7A] to-[#FFA726] rounded-full animate-loading-bar" />
            </div>
          </div>
        </div>
      )}

      {/* Main Card - Two columns */}
      <div className="auth-card">
        {/* ===== LEFT PANEL - Form ===== */}
        <div className="auth-form-panel auth-form-panel--register auth-animate-fade-in-left">
          <div className="auth-form-container">
            {/* Logo */}
            <div className="flex justify-center mb-1">
              <img
                src={logo}
                alt="Adoptify Logo"
                className="auth-logo"
              />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-5">
              <h2 className="auth-title">
                {step === "code" ? "Verifica tu correo" : "Crea tu cuenta"}
              </h2>
              {step === "code" ? (
                <p className="auth-subtitle">
                  Ingresa el código de 6 dígitos enviado a <strong>{email}</strong>
                  <br />
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className="auth-link text-sm mt-1 inline-block"
                  >
                    Cambiar correo
                  </button>
                </p>
              ) : (
                <p className="auth-subtitle">
                  ¿Ya tienes cuenta?{" "}
                  <Link to="/login" className="auth-link font-semibold">
                    Inicia sesión
                  </Link>
                </p>
              )}
            </div>

            {/* ===== STEP: Verification Code ===== */}
            {step === "code" ? (
              <div className="space-y-6 my-auto w-full">
                {/* 6-digit code inputs */}
                <div className="flex justify-center gap-1.5 sm:gap-3 w-full max-w-[22rem] mx-auto">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (codeInputsRef.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      onPaste={index === 0 ? handleCodePaste : undefined}
                      className={`flex-1 min-w-0 max-w-[3.5rem] aspect-square text-center text-lg sm:text-2xl font-bold rounded-xl border-2 transition-all duration-200 outline-none
                        ${codeError
                          ? "border-red-400 bg-red-50 text-red-600"
                          : digit
                            ? "border-[#FF8C00] bg-orange-50 text-[#ea580c]"
                            : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300"
                        }
                        focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 focus:bg-orange-50/50`}
                      aria-label={`Digito ${index + 1}`}
                    />
                  ))}
                </div>

                {codeError && (
                  <p className="text-center text-sm text-red-500 flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    {codeError}
                  </p>
                )}

                {/* Verify button */}
                <button
                  type="button"
                  onClick={handleVerifyAndRegister}
                  disabled={isLoading || verificationCode.join("").length !== 6}
                  className="auth-primary-btn w-full"
                >
                  <div className="auth-btn-shimmer" />
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-5 h-5" />
                      <span>Verificar y crear cuenta</span>
                    </>
                  )}
                </button>

                {/* Resend code */}
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    ¿No recibiste el código?{" "}
                    {countdown > 0 ? (
                      <span className="text-gray-400">
                        Reenviar en {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="auth-link font-semibold hover:underline"
                      >
                        Reenviar código
                      </button>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              /* ===== STEP: Registration Form ===== */
              <form onSubmit={handleSendCode}>
                {/* Scrollable form fields container */}
                <div className="auth-form-scroll">
                  <div className="space-y-3.5 pr-2">
                    {/* Document Type and Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label htmlFor="documentType" className="auth-label">
                          Tipo Doc.
                        </label>
                        <div className={`auth-input-wrapper ${errors.documentType ? 'auth-input-error' : documentType && !errors.documentType ? 'auth-input-success' : ''}`}>
                          <FileText className="auth-input-icon" />
                          <select
                            id="documentType"
                            value={documentType}
                            onChange={(e) => handleFieldChange("documentType", e.target.value)}
                            className="auth-input auth-select"
                          >
                            <option value="">Seleccionar</option>
                            {tiposDocumento.map((td) => (
                              <option key={td.id} value={td.codigo}>
                                {td.nombre}
                              </option>
                            ))}
                          </select>
                          {errors.documentType ? (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                          ) : documentType ? (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          ) : null}
                        </div>
                        {errors.documentType && (
                          <p className="auth-error-text">
                            <XCircle className="w-3 h-3" />
                            {errors.documentType}
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-3 space-y-1.5">
                        <label htmlFor="documentNumber" className="auth-label">
                          N° Documento
                        </label>
                        <div className={`auth-input-wrapper ${errors.documentNumber ? 'auth-input-error' : documentNumber && !errors.documentNumber ? 'auth-input-success' : ''}`}>
                          <FileText className="auth-input-icon" />
                          <input
                            id="documentNumber"
                            type="text"
                            inputMode="numeric"
                            placeholder="1234567890"
                            value={documentNumber}
                            onChange={(e) => handleFieldChange("documentNumber", e.target.value)}
                            className="auth-input"
                          />
                          {errors.documentNumber ? (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                          ) : documentNumber ? (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          ) : null}
                        </div>
                        {errors.documentNumber && (
                          <p className="auth-error-text">
                            <XCircle className="w-3 h-3" />
                            {errors.documentNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Name and Last Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor="firstName" className="auth-label">
                          Nombres
                        </label>
                        <div className={`auth-input-wrapper ${errors.firstName ? 'auth-input-error' : firstName && !errors.firstName ? 'auth-input-success' : ''}`}>
                          <User className="auth-input-icon" />
                          <input
                            id="firstName"
                            type="text"
                            placeholder="Juan"
                            value={firstName}
                            onChange={(e) => handleFieldChange("firstName", e.target.value)}
                            className="auth-input"
                          />
                          {errors.firstName ? (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                          ) : firstName ? (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          ) : null}
                        </div>
                        {errors.firstName && (
                          <p className="auth-error-text">
                            <XCircle className="w-3 h-3" />
                            {errors.firstName}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="lastName" className="auth-label">
                          Apellidos
                        </label>
                        <div className={`auth-input-wrapper ${errors.lastName ? 'auth-input-error' : lastName && !errors.lastName ? 'auth-input-success' : ''}`}>
                          <User className="auth-input-icon" />
                          <input
                            id="lastName"
                            type="text"
                            placeholder="Pérez"
                            value={lastName}
                            onChange={(e) => handleFieldChange("lastName", e.target.value)}
                            className="auth-input"
                          />
                          {errors.lastName ? (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                          ) : lastName ? (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          ) : null}
                        </div>
                        {errors.lastName && (
                          <p className="auth-error-text">
                            <XCircle className="w-3 h-3" />
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="auth-label">
                        Teléfono
                      </label>
                      <div className={`auth-input-wrapper ${errors.phone ? 'auth-input-error' : phone && !errors.phone ? 'auth-input-success' : ''}`}>
                        <Phone className="auth-input-icon" />
                        <input
                          id="phone"
                          type="tel"
                          placeholder="300 123 4567"
                          value={phone}
                          onChange={(e) => handleFieldChange("phone", e.target.value)}
                          className="auth-input"
                        />
                        {errors.phone ? (
                          <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                        ) : phone ? (
                          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                      {errors.phone && (
                        <p className="auth-error-text">
                          <XCircle className="w-3 h-3" />
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="auth-label">
                        Correo electrónico
                      </label>
                      <div className={`auth-input-wrapper ${errors.email ? 'auth-input-error' : email && !errors.email ? 'auth-input-success' : ''}`}>
                        <Mail className="auth-input-icon" />
                        <input
                          id="email"
                          type="email"
                          placeholder="ejemplo@correo.com"
                          value={email}
                          onChange={(e) => handleFieldChange("email", e.target.value)}
                          className="auth-input"
                        />
                        {errors.email ? (
                          <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                        ) : email ? (
                          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                      {errors.email && (
                        <p className="auth-error-text">
                          <XCircle className="w-3 h-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Password and Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Password */}
                      <div className="space-y-1.5">
                        <label htmlFor="password" className="auth-label">
                          Contraseña
                        </label>
                        <div className={`auth-input-wrapper ${errors.password ? 'auth-input-error' : password && !errors.password ? 'auth-input-success' : ''}`}>
                          <Lock className="auth-input-icon" />
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => handleFieldChange("password", e.target.value)}
                            className="auth-input"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="auth-eye-btn"
                            >
                              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                            </button>
                            {errors.password ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : password ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : null}
                          </div>
                        </div>
                        {errors.password && (
                          <p className="auth-error-text">
                            <XCircle className="w-3 h-3" />
                            {errors.password}
                          </p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-1.5">
                        <label htmlFor="confirmPassword" className="auth-label">
                          Confirmar
                        </label>
                        <div className={`auth-input-wrapper ${errors.confirmPassword ? 'auth-input-error' : confirmPassword && !errors.confirmPassword ? 'auth-input-success' : ''}`}>
                          <Lock className="auth-input-icon" />
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => handleFieldChange("confirmPassword", e.target.value)}
                            className="auth-input"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="auth-eye-btn"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                            </button>
                            {errors.confirmPassword ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : confirmPassword ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : null}
                          </div>
                        </div>
                        {errors.confirmPassword && (
                          <p className="auth-error-text">
                            <XCircle className="w-3 h-3" />
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Terms */}
                    <div className="flex items-start pt-1">
                      <label htmlFor="terms" className="relative mt-0.5 cursor-pointer">
                        <input
                          id="terms"
                          type="checkbox"
                          checked={terms}
                          onChange={(e) => handleFieldChange("terms", e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          terms
                            ? 'border-[#FF4D7A] bg-gradient-to-br from-[#FF4D7A] to-[#FFA726]'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}>
                          {terms && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </label>
                      <label htmlFor="terms" className="ml-2.5 text-sm text-gray-500 leading-relaxed cursor-pointer select-none">
                        Acepto los{" "}
                        <a href="#" className="font-semibold text-[#FF4D7A] hover:text-[#e04060] hover:underline underline-offset-2 transition-colors">
                          Términos y Condiciones
                        </a>{" "}
                        y la{" "}
                        <a href="#" className="font-semibold text-[#FF4D7A] hover:text-[#e04060] hover:underline underline-offset-2 transition-colors">
                          Política de Privacidad
                        </a>
                      </label>
                    </div>
                    {errors.terms && (
                      <p className="auth-error-text">
                        <XCircle className="w-3 h-3" />
                        {errors.terms}
                      </p>
                    )}

                    {/* Google Sign-In Button - dentro del scroll del formulario */}
                    <div className="pt-4">
                      <div className="auth-divider mb-4">
                        <span className="auth-divider-text">o continúa con</span>
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={handleGoogleClick}
                          disabled={GOOGLE_CLIENT_ID ? !googleLoaded : false}
                          className="auth-google-btn"
                        >
                          <GoogleIcon className="auth-google-icon" />
                          <span>Google</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button - Outside scroll (fijo, no se desplaza) */}
                <div className="auth-form-submit">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="auth-primary-btn"
                  >
                    <div className="auth-btn-shimmer" />
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enviando código...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Enviar código de verificación</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ===== RIGHT PANEL - Decorative / Branding ===== */}
        <div className="auth-decorative-panel auth-animate-fade-in-right">
          {/* Back to Home */}
          <Link
            to="/"
            className="auth-back-btn"
          >
            <div className="auth-back-btn-icon">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Volver al inicio</span>
          </Link>

          {/* Decorative circles background */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#FF4D7A]/10 rounded-full blur-3xl -translate-x-20 -translate-y-20" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#FFA726]/10 rounded-full blur-3xl translate-x-20 translate-y-20" />

          {/* Content */}
          <div className="auth-decorative-content">
            {/* Image with gradient border */}
            <div className="auth-image-wrapper">
              <div className="auth-image-border">
                <div className="auth-image-container">
                  <AutoFadingImage
                    images={authCarouselImages}
                    alt="Adoptify - Conectando corazones con patitas"
                    className="w-full h-full object-cover"
                    interval={5000}
                    fadeDuration={1000}
                  />
                </div>
              </div>
            </div>

            {/* Three circular gradient icons */}
            <div className="auth-icon-row">
              {[
                { Icon: PawPrint, delay: "0s" },
                { Icon: Heart, delay: "0.15s" },
                { Icon: Shield, delay: "0.3s" },
              ].map(({ Icon, delay }, i) => (
                <div
                  key={i}
                  className="auth-icon-circle"
                  style={{ animationDelay: delay }}
                >
                  <Icon className="w-6 h-6" />
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
