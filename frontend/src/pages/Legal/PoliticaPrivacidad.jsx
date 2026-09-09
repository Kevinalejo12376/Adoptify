import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Mail,
  CalendarDays,
  Database,
  Server,
  Lock,
  FileText,
  Scale,
  Cookie,
  UserCog,
  ClipboardList,
  ShoppingCart,
  HeartHandshake,
  Wrench,
  Eye,
  RefreshCcw,
  Ban,
  UserX,
  HelpCircle,
  MessageCircle,
  Building2,
  MonitorSmartphone,
  FileSearch,
  User,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ADOPTIFY_LOGO as logo } from "../../constants/assets";
import { useAuth } from "../../context/AuthContext";
// Memoria de navegación: permite saber desde qué vista llegó el usuario y pedir
// la restauración del scroll de esa vista al volver.
import { getPreviousPath, requestScrollRestore } from "../../utils/navigationMemory";

// ─────────────────────────────────────────────────────────────────────────────
// Índice rápido de la página (navegación interna por anclas).
// ─────────────────────────────────────────────────────────────────────────────
const INDICE = [
  { id: "pp-intro", n: "01", label: "Introducción" },
  { id: "pp-recopilamos", n: "02", label: "Qué recopilamos" },
  { id: "pp-finalidad", n: "03", label: "Finalidad de los datos" },
  { id: "pp-seguridad", n: "04", label: "Almacenamiento y seguridad" },
  { id: "pp-arco", n: "05", label: "Derechos ARCO" },
  { id: "pp-cookies", n: "06", label: "Cookies y sesión" },
  { id: "pp-modificaciones", n: "07", label: "Modificaciones" },
  { id: "pp-contacto", n: "08", label: "Contacto" },
];

// Etiqueta descriptiva del botón "Volver" según la vista de la que proviene el
// usuario. Si no se reconoce la ruta devuelve null (se usaría "Volver al inicio"
// o el texto genérico "Volver").
function etiquetaOrigen(path) {
  if (!path) return null;
  const limpia = path.split("?")[0];
  if (limpia === "/") return "Volver al inicio";
  if (limpia === "/register") return "Volver a Registro";
  if (limpia === "/login") return "Volver a Iniciar Sesión";
  if (limpia === "/registrar-refugio") return "Volver al Registro de Refugio";
  if (limpia === "/registrar-tienda") return "Volver al Registro de Tienda";
  if (limpia === "/settings") return "Volver a Configuración";
  if (limpia === "/profile" || limpia === "/dashboard") return "Volver al Inicio";
  if (limpia.startsWith("/animal/")) return "Volver a la Mascota";
  if (limpia.startsWith("/animals")) return "Volver a Animales";
  if (limpia.startsWith("/shelter/")) return "Volver al Refugio";
  if (limpia.startsWith("/shelters")) return "Volver a Refugios";
  if (limpia.startsWith("/product/")) return "Volver al Producto";
  if (limpia.startsWith("/store")) return "Volver al Marketplace";
  if (limpia.startsWith("/forum")) return "Volver al Foro";
  if (limpia.startsWith("/mis-") || limpia.startsWith("/favorites")) return "Volver a Mi Cuenta";
  if (limpia.startsWith("/refugio")) return "Volver al Panel del Refugio";
  if (limpia.startsWith("/tienda")) return "Volver al Panel de la Tienda";
  if (limpia.startsWith("/admin")) return "Volver al Panel de Administración";
  return "Volver";
}

// Cabecera reutilizable y consistente para cada sección del documento.
function CabeceraSeccion({ numero, icono: Icono, titulo, subtitulo, gradiente, colorIcono }) {
  return (
    <header className="flex items-center gap-4 px-5 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-gray-100 dark:border-dark-border">
      <span
        className={`hidden sm:flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br ${gradiente} text-white font-display font-extrabold text-base shadow-md shadow-black/5 flex-shrink-0`}
      >
        {numero}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg sm:text-[1.4rem] font-display font-bold text-gray-900 dark:text-dark-text leading-snug flex items-center gap-2 flex-wrap">
          <span
            className={`sm:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${gradiente} text-white font-extrabold text-xs flex-shrink-0`}
          >
            {numero}
          </span>
          <Icono size={20} className={`${colorIcono} flex-shrink-0`} strokeWidth={2.2} />
          {titulo}
        </h2>
        {subtitulo && (
          <p className="text-xs sm:text-sm text-gray-400 dark:text-dark-text-secondary mt-1">
            {subtitulo}
          </p>
        )}
      </div>
    </header>
  );
}

/**
 * Página global de "Política de Privacidad" de Adoptify.
 *
 * Es una página independiente y accesible para TODOS los roles (Usuario,
 * Refugio, Tienda, Administrador) y para usuarios no autenticados. NO renderiza
 * Navbar, Sidebar ni menús del rol: cada acceso a esta página proviene de un
 * enlace único (`/politica-privacidad`). El botón "Volver" regresa a la vista
 * anterior (restaurando su scroll si aplica); solo si no hay una vista previa
 * (acceso directo/recarga) lleva al inicio correspondiente según el rol/sesión.
 */
export default function PoliticaPrivacidad() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isShelter, isStore, isAdmin } = useAuth();

  // Determina el "inicio" correcto según el rol autenticado:
  // - Sin sesión  → inicio público (/)
  // - Usuario     → /dashboard
  // - Refugio     → /refugio/dashboard
  // - Tienda      → /tienda/dashboard
  // - Admin       → /admin/dashboard
  let homePath = "/";
  if (user) {
    if (isShelter()) homePath = "/refugio/dashboard";
    else if (isStore()) homePath = "/tienda/dashboard";
    else if (isAdmin()) homePath = "/admin/dashboard";
    else homePath = "/dashboard";
  }

  // Vista desde la que llegó el usuario (registrada de forma global al navegar).
  const prevPath = getPreviousPath();
  const origen = prevPath && prevPath !== location.pathname ? prevPath : null;
  const backLabel = origen ? etiquetaOrigen(origen) || "Volver" : "Volver al inicio";

  // Regresa EXACTAMENTE a la vista anterior (con su scroll) cuando es posible.
  const handleBack = () => {
    if (origen) {
      requestScrollRestore(origen);
      if (location.key !== "default" && window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(origen);
      }
    } else {
      navigate(homePath);
    }
  };

  // Navegación suave hacia una sección del documento (índice).
  const scrollToSeccion = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-rose-50/40 dark:from-dark-bg dark:to-[#14141c] text-gray-900 dark:text-dark-text">
      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Barra superior: botón "Volver" contextual (sin navbar del rol)  */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-dark-card/85 backdrop-blur-xl border-b border-gray-100 dark:border-dark-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text hover:border-rose-300 dark:hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-400 hover:shadow-sm shadow-rose-500/5 active:scale-[0.97] cursor-pointer"
          >
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center group-hover:shadow group-hover:shadow-rose-500/30 transition-shadow">
              <ArrowLeft size={13} className="text-white" strokeWidth={3} />
            </span>
            {backLabel}
          </button>

          <Link
            to={homePath}
            onClick={scrollTop}
            className="hidden sm:flex items-center gap-2.5"
            title="Adoptify"
          >
            <img
              src={logo}
              alt="Adoptify Logo"
              className="h-8 w-auto opacity-90 hover:opacity-100 transition-opacity"
            />
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-gray-500 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v1.0 · Producción
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ════════════════════════════════════════════════════════════ */}
        {/* Hero: encabezado legible con buen contraste en claro/oscuro   */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden rounded-[2rem] border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm">
          {/* Línea superior de acento de marca */}
          <div className="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

          {/* Decoración sutil de fondo */}
          <div className="pointer-events-none absolute -top-24 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-rose-100/80 to-amber-100/40 dark:from-rose-500/10 dark:to-amber-500/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-blue-100/40 dark:bg-blue-500/5 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(244,63,94,0.06) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative px-6 sm:px-10 py-9 sm:py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
              <div className="max-w-2xl">
                {/* Etiqueta superior */}
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                  <ShieldCheck size={13} />
                  Privacidad y Seguridad
                </span>

                <h1 className="mt-5 text-3xl sm:text-4xl lg:text-[2.7rem] font-display font-extrabold leading-[1.1] text-gray-900 dark:text-dark-text">
                  Política de Privacidad de Adoptify
                </h1>

                <p className="mt-4 text-[15px] sm:text-base text-gray-500 dark:text-dark-text-secondary leading-relaxed max-w-2xl">
                  Conoce cómo recopilamos, usamos y protegemos tu información dentro
                  del ecosistema digital de adopción, comunidad y comercio de Adoptify.
                </p>
              </div>

              {/* Emblema decorativo de seguridad (solo visual) */}
              <div className="hidden lg:flex flex-shrink-0 items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-rose-500 to-amber-500 opacity-20 blur-lg" />
                  <div className="relative w-28 h-28 rounded-[1.75rem] bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/20">
                    <ShieldCheck size={52} strokeWidth={1.6} />
                  </div>
                </div>
              </div>
            </div>

            {/* Datos de identificación del documento */}
            <div className="relative mt-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex-shrink-0">
                  <CalendarDays size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary">
                    Última actualización
                  </p>
                  <p className="text-sm font-bold leading-snug text-gray-900 dark:text-dark-text">Agosto de 2026</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <Server size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary">
                    Versión del sistema
                  </p>
                  <p className="text-sm font-bold leading-snug text-gray-900 dark:text-dark-text">1.0 (Producción)</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <UserCog size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary">
                    Entidad responsable
                  </p>
                  <p className="text-sm font-bold leading-snug text-gray-900 dark:text-dark-text">Equipo de Desarrollo de Adoptify</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex-shrink-0">
                  <Mail size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary">
                    Correo de contacto
                  </p>
                  <a
                    href="mailto:adoptifyoficial@gmail.com"
                    className="text-sm font-bold leading-snug break-words text-gray-900 dark:text-dark-text hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    adoptifyoficial@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* Índice rápido (navegación intuitiva dentro del documento)     */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section className="mt-6 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm px-5 sm:px-7 py-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20 flex-shrink-0">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-base font-display font-bold text-gray-900 dark:text-dark-text leading-tight">
                En esta página
              </h2>
              <p className="text-xs text-gray-400 dark:text-dark-text-secondary">
                Toca una sección para ir directamente a ella
              </p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {INDICE.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSeccion(item.id)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/60 text-gray-600 dark:text-dark-text-secondary hover:border-rose-200 dark:hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200"
              >
                <span className="text-[10px] font-extrabold text-rose-500">{item.n}</span>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* Contenido del documento                                      */}
        {/* ════════════════════════════════════════════════════════════ */}
        <div className="mt-6 space-y-6">
          {/* 1. Introducción */}
          <article
            id="pp-intro"
            className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
          >
            <CabeceraSeccion
              numero="1"
              icono={FileText}
              titulo="Introducción"
              subtitulo="Alcance y aceptación de la política"
              gradiente="from-blue-500 to-indigo-600"
              colorIcono="text-blue-500"
            />
            <div className="px-5 sm:px-8 py-7 space-y-5">
              <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                La presente Política de Privacidad establece los términos bajo los
                cuales{" "}
                <strong className="font-semibold text-gray-800 dark:text-dark-text">Adoptify</strong>{" "}
                (en adelante,{" "}
                <strong className="font-semibold text-gray-800 dark:text-dark-text">
                  "la Plataforma" o "el Sistema"
                </strong>
                ), un ecosistema digital multiplataforma diseñado para centralizar la
                adopción de mascotas, la interacción comunitaria y el comercio
                especializado, recopila, utiliza, almacena y protege la información
                personal de sus usuarios.
              </p>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-500/10 p-4">
                <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[15px] leading-7 text-gray-700 dark:text-dark-text-secondary">
                  Al acceder, registrarse o interactuar con nuestra plataforma web SPA
                  (Single Page Application), usted acepta los términos descritos en este
                  documento.
                </p>
              </div>
            </div>
          </article>

          {/* 2. Información que Recopilamos */}
          <article
            id="pp-recopilamos"
            className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
          >
            <CabeceraSeccion
              numero="2"
              icono={Database}
              titulo="Información que Recopilamos"
              subtitulo="Datos personales según el perfil y el tipo de uso de la plataforma"
              gradiente="from-rose-500 to-rose-600"
              colorIcono="text-rose-500"
            />
            <div className="px-5 sm:px-8 py-7 space-y-6">
              <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                Dependiendo de su perfil dentro de la matriz de roles y permisos de la
                Plataforma (Usuario/Adoptante, Refugio/Rescatista, Tienda o
                Administrador), recopilamos distintos tipos de datos.
              </p>

              {/* 2.1 */}
              <section className="rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
                <h3 className="flex items-center gap-2.5 px-5 py-3.5 font-display font-bold text-gray-900 dark:text-dark-text bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/10 border-b border-gray-100 dark:border-dark-border text-[15px]">
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex-shrink-0">
                    <ClipboardList size={15} />
                  </span>
                  2.1. Información proporcionada directamente por el usuario
                </h3>
                <div className="px-5 py-5 space-y-5 bg-gray-50/50 dark:bg-dark-bg/30">
                  <ul className="space-y-4">
                    <li className="flex gap-3">
                      <span className="mt-[13px] h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" />
                      <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                        <strong className="font-semibold text-gray-800 dark:text-dark-text">
                          Datos de identificación y contacto:
                        </strong>{" "}
                        Nombre, correo electrónico y credenciales únicas de acceso
                        vinculadas al rol correspondiente.
                      </p>
                    </li>

                    <li className="flex gap-3">
                      <span className="mt-[13px] h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                          <strong className="font-semibold text-gray-800 dark:text-dark-text">
                            Información de perfil por rol:
                          </strong>
                        </p>
                        <div className="mt-3 grid sm:grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-sm">
                            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-dark-text mb-1.5">
                              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <User size={14} />
                              </span>
                              Usuarios (Adoptantes / Compradores):
                            </p>
                            <p className="text-sm leading-6 text-gray-500 dark:text-dark-text-secondary">
                              Datos requeridos para la postulación a procesos de adopción
                              y procesamiento de compras dentro del Marketplace.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-sm">
                            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-dark-text mb-1.5">
                              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <Building2 size={14} />
                              </span>
                              Refugios / Rescatistas y Tiendas:
                            </p>
                            <p className="text-sm leading-6 text-gray-500 dark:text-dark-text-secondary">
                              Datos de identificación institucional o comercial,
                              catalogación de inventarios/productos y soporte técnico de
                              verificación de perfil.
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>

                    <li className="flex gap-3">
                      <span className="mt-[13px] h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" />
                      <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                        <strong className="font-semibold text-gray-800 dark:text-dark-text">
                          Contenido generado por el usuario:
                        </strong>{" "}
                        Publicaciones, comentarios e interacciones realizadas en el Foro
                        Comunitario, así como la información de insumos en el Módulo de
                        Donaciones Inter-Refugios.
                      </p>
                    </li>
                  </ul>
                </div>
              </section>

              {/* 2.2 */}
              <section className="rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
                <h3 className="flex items-center gap-2.5 px-5 py-3.5 font-display font-bold text-gray-900 dark:text-dark-text bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-b border-gray-100 dark:border-dark-border text-[15px]">
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex-shrink-0">
                    <MonitorSmartphone size={15} />
                  </span>
                  2.2. Información recopilada automáticamente y de carácter técnico
                </h3>
                <ul className="px-5 py-5 space-y-4 bg-gray-50/50 dark:bg-dark-bg/30">
                  <li className="flex gap-3">
                    <span className="mt-[13px] h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                      <strong className="font-semibold text-gray-800 dark:text-dark-text">
                        Datos de sesión y autenticación:
                      </strong>{" "}
                      Tokens de acceso y seguridad utilizados para mantener la sesión
                      activa mediante la arquitectura del sistema.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-[13px] h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                      <strong className="font-semibold text-gray-800 dark:text-dark-text">
                        Archivos e imágenes:
                      </strong>{" "}
                      Fotografías cargadas por los usuarios (productos, animales o
                      publicaciones) alojadas mediante proveedores de infraestructura en
                      la nube.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-[13px] h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                      <strong className="font-semibold text-gray-800 dark:text-dark-text">
                        Información técnica del dispositivo:
                      </strong>{" "}
                      Tipo de navegador, dirección IP y datos de tráfico necesarios para
                      las peticiones realizadas mediante protocolo HTTPS.
                    </p>
                  </li>
                </ul>
              </section>
            </div>
          </article>

          {/* 3. Finalidad del Tratamiento de los Datos */}
          <article
            id="pp-finalidad"
            className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
          >
            <CabeceraSeccion
              numero="3"
              icono={Wrench}
              titulo="Finalidad del Tratamiento de los Datos"
              subtitulo="Uso exclusivo dentro del alcance funcional del sistema"
              gradiente="from-amber-500 to-orange-500"
              colorIcono="text-amber-500"
            />
            <div className="px-5 sm:px-8 py-7">
              <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary mb-5">
                Los datos recopilados son procesados exclusivamente para responder al
                alcance funcional del sistema, lo cual incluye:
              </p>
              <ol className="space-y-3.5">
                {[
                  {
                    icon: UserCog,
                    title: "Gestión de roles y control de acceso:",
                    text: "Validar credenciales y renderizar dashboards, menús y permisos personalizados según el tipo de actor (Usuario, Refugio, Tienda o Administrador).",
                    chip: "from-rose-500 to-rose-600",
                    iconColor: "text-rose-500",
                    soft: "bg-rose-50 dark:bg-rose-500/5",
                  },
                  {
                    icon: HeartHandshake,
                    title: "Procesos de adopción de mascotas:",
                    text: "Facilitar la gestión de postulaciones entre los usuarios adoptantes y los refugios registrados.",
                    chip: "from-emerald-500 to-teal-600",
                    iconColor: "text-emerald-500",
                    soft: "bg-emerald-50 dark:bg-emerald-500/5",
                  },
                  {
                    icon: ShoppingCart,
                    title: "Gestión del Marketplace:",
                    text: "Habilitar el catálogo de productos para Tiendas y Refugios, y procesar las solicitudes e interacciones de compra de los Usuarios habilitados.",
                    chip: "from-amber-500 to-orange-500",
                    iconColor: "text-amber-500",
                    soft: "bg-amber-50 dark:bg-amber-500/5",
                  },
                  {
                    icon: MessageCircle,
                    title: "Red de donaciones e interacción comunitaria:",
                    text: "Permitir el intercambio de insumos exclusivamente entre cuentas verificadas de Refugios y moderar la participación en el Foro Comunitario.",
                    chip: "from-violet-500 to-purple-600",
                    iconColor: "text-violet-500",
                    soft: "bg-violet-50 dark:bg-violet-500/5",
                  },
                  {
                    icon: FileSearch,
                    title: "Auditoría y soporte técnico:",
                    text: "Monitorear el historial operativo global por parte del rol Administrador y brindar solución a inconvenientes de acceso o fallas de sesión.",
                    chip: "from-blue-500 to-indigo-600",
                    iconColor: "text-blue-500",
                    soft: "bg-blue-50 dark:bg-blue-500/5",
                  },
                ].map((item, i) => {
                  const Icono = item.icon;
                  return (
                    <li
                      key={i}
                      className={`flex items-start gap-4 p-4 rounded-2xl ${item.soft} border border-gray-100 dark:border-dark-border`}
                    >
                      <div className="relative flex-shrink-0">
                        <span
                          className={`flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br ${item.chip} text-white shadow-md shadow-black/5`}
                        >
                          <Icono size={19} />
                        </span>
                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-[10px] font-extrabold text-gray-600 dark:text-dark-text-secondary shadow-sm">
                          {i + 1}
                        </span>
                      </div>
                      <div className="pt-0.5 min-w-0">
                        <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                          <strong className="font-semibold text-gray-800 dark:text-dark-text">
                            {item.title}
                          </strong>{" "}
                          {item.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </article>

          {/* 4. Almacenamiento, Seguridad y Transferencia de Datos */}
          <article
            id="pp-seguridad"
            className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
          >
            <CabeceraSeccion
              numero="4"
              icono={Server}
              titulo="Almacenamiento, Seguridad y Transferencia de Datos"
              subtitulo="Infraestructura, cifrado y política frente a terceros"
              gradiente="from-emerald-500 to-teal-600"
              colorIcono="text-emerald-500"
            />
            <div className="px-5 sm:px-8 py-7">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/40 p-5">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3">
                    <Database size={19} />
                  </span>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text mb-1.5">
                    Infraestructura de almacenamiento
                  </h3>
                  <p className="text-sm leading-6 text-gray-500 dark:text-dark-text-secondary">
                    Adoptify utiliza una arquitectura basada en React (Frontend), FastAPI
                    (Backend) y PostgreSQL / Supabase para la base de datos y la carga de
                    archivos o imágenes.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/40 p-5">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3">
                    <Lock size={19} />
                  </span>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text mb-1.5">
                    Medidas de seguridad
                  </h3>
                  <p className="text-sm leading-6 text-gray-500 dark:text-dark-text-secondary">
                    Toda comunicación entre el navegador del usuario y los servidores se
                    realiza mediante tráfico cifrado bajo el protocolo HTTPS.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/40 p-5">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3">
                    <RefreshCcw size={19} />
                  </span>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text mb-1.5">
                    Transferencia a terceros
                  </h3>
                  <p className="text-sm leading-6 text-gray-500 dark:text-dark-text-secondary">
                    Adoptify{" "}
                    <strong className="font-semibold text-gray-800 dark:text-dark-text">
                      no vende ni alquila
                    </strong>{" "}
                    datos personales a terceros con fines publicitarios. La transferencia
                    de información se limita estrictamente a la infraestructura en la
                    nube requerida para la operatividad técnica del servicio.
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* 5. Derechos del Usuario (ARCO) */}
          <article
            id="pp-arco"
            className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
          >
            <CabeceraSeccion
              numero="5"
              icono={Scale}
              titulo="Derechos del Usuario (ARCO) y Gestión de Datos"
              subtitulo="Acceso, Rectificación, Cancelación y Oposición"
              gradiente="from-violet-500 to-purple-600"
              colorIcono="text-violet-500"
            />
            <div className="px-5 sm:px-8 py-7 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Eye, label: "Acceder", grad: "from-blue-500 to-blue-600" },
                  { icon: RefreshCcw, label: "Rectificar", grad: "from-emerald-500 to-teal-600" },
                  { icon: Ban, label: "Cancelar", grad: "from-amber-500 to-orange-500" },
                  { icon: UserX, label: "Oponerse", grad: "from-rose-500 to-pink-600" },
                ].map((chip) => {
                  const ChipIcon = chip.icon;
                  return (
                    <div
                      key={chip.label}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-br ${chip.grad} text-white shadow-md shadow-black/5`}
                    >
                      <ChipIcon size={16} className="flex-shrink-0" />
                      <span className="text-sm font-semibold leading-tight">{chip.label}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                Usted tiene derecho a{" "}
                <strong className="font-semibold text-gray-800 dark:text-dark-text">
                  Acceder, Rectificar, Cancelar u Oponerse
                </strong>{" "}
                al tratamiento de sus datos personales almacenados en el sistema.
              </p>

              <ul className="space-y-3.5">
                <li className="flex gap-3.5 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-bg/40 p-4">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex-shrink-0">
                    <Eye size={16} />
                  </span>
                  <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                    <strong className="font-semibold text-gray-800 dark:text-dark-text">
                      Actualización de información:
                    </strong>{" "}
                    Puede modificar los datos de su perfil ingresando directamente a su
                    Dashboard correspondiente.
                  </p>
                </li>
                <li className="flex gap-3.5 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-bg/40 p-4">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex-shrink-0">
                    <RefreshCcw size={16} />
                  </span>
                  <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                    <strong className="font-semibold text-gray-800 dark:text-dark-text">
                      Validaciones de perfiles especiales:
                    </strong>{" "}
                    La verificación o modificación del estado de cuentas institucionales,
                    como Refugios o Tiendas, es gestionada y auditada por el rol
                    Administrador.
                  </p>
                </li>
                <li className="flex gap-3.5 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-bg/40 p-4">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex-shrink-0">
                    <HelpCircle size={16} />
                  </span>
                  <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                    <strong className="font-semibold text-gray-800 dark:text-dark-text">
                      Solicitudes de eliminación o soporte:
                    </strong>{" "}
                    Para solicitar la baja de su cuenta o la eliminación de sus datos,
                    puede enviar una solicitud formal a la Mesa de Ayuda.
                  </p>
                </li>
              </ul>
            </div>
          </article>

          {/* 6. Cookies y Sesión */}
          <article
            id="pp-cookies"
            className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
          >
            <CabeceraSeccion
              numero="6"
              icono={Cookie}
              titulo="Uso de Cookies y Tecnologías de Sesión"
              subtitulo="Almacenamiento local propio de una aplicación SPA"
              gradiente="from-orange-500 to-amber-500"
              colorIcono="text-orange-500"
            />
            <div className="px-5 sm:px-8 py-7 space-y-5">
              <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                Al operar como una SPA (Single Page Application), la plataforma utiliza
                tecnologías de almacenamiento local en el navegador (
                <em className="font-medium text-gray-700 dark:text-dark-text">
                  Local Storage
                </em>
                , <em className="font-medium text-gray-700 dark:text-dark-text">Session Storage</em>{" "}
                y cookies de autenticación) exclusivamente para:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3.5 rounded-2xl border border-gray-100 dark:border-dark-border bg-amber-50/50 dark:bg-amber-500/5 p-4">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex-shrink-0 shadow-sm">
                    <Lock size={16} />
                  </span>
                  <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                    Mantener activa la sesión autenticada mediante tokens de seguridad.
                  </p>
                </li>
                <li className="flex gap-3.5 rounded-2xl border border-gray-100 dark:border-dark-border bg-amber-50/50 dark:bg-amber-500/5 p-4">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex-shrink-0 shadow-sm">
                    <User size={16} />
                  </span>
                  <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                    Recordar el perfil y rol del usuario durante la navegación sin
                    necesidad de recargar la página.
                  </p>
                </li>
              </ul>
            </div>
          </article>

          {/* 7. Modificaciones */}
          <article
            id="pp-modificaciones"
            className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
          >
            <CabeceraSeccion
              numero="7"
              icono={RefreshCcw}
              titulo="Modificaciones a la Política de Privacidad"
              subtitulo="Actualización de la política vigente"
              gradiente="from-sky-500 to-cyan-600"
              colorIcono="text-sky-500"
            />
            <div className="px-5 sm:px-8 py-7">
              <div className="rounded-2xl border-l-4 border-sky-400 dark:border-sky-500 bg-sky-50/60 dark:bg-sky-500/5 px-5 py-4">
                <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                  Adoptify se reserva el derecho de actualizar la presente Política de
                  Privacidad para reflejar mejoras en la plataforma o cambios normativos.
                  Cualquier actualización sustancial será comunicada a través de la
                  interfaz del sistema o mediante la actualización de este documento en
                  producción.
                </p>
              </div>
            </div>
          </article>

          {/* 8. Canales de Contacto */}
          <article
            id="pp-contacto"
            className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
          >
            <CabeceraSeccion
              numero="8"
              icono={HelpCircle}
              titulo="Canales de Contacto"
              subtitulo="Atención y soporte para dudas sobre tus datos"
              gradiente="from-pink-500 to-rose-600"
              colorIcono="text-pink-500"
            />
            <div className="px-5 sm:px-8 py-7 space-y-5">
              <p className="text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
                Si tiene preguntas, dudas o solicitudes relacionadas con el tratamiento
                de sus datos personales o la operatividad del sistema, puede comunicarse
                con nuestros canales de atención:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <a
                  href="mailto:adoptifyoficial@gmail.com"
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gradient-to-r from-rose-50/60 to-amber-50/40 dark:from-rose-500/10 dark:to-amber-500/5 hover:border-rose-200 dark:hover:border-rose-500/40 hover:shadow-md hover:shadow-rose-500/5 transition-all"
                >
                  <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20 flex-shrink-0">
                    <Building2 size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="font-semibold text-gray-800 dark:text-dark-text block group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors text-[15px]">
                      Mesa de Ayuda y Soporte Técnico
                    </strong>
                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary break-words">
                      adoptifyoficial@gmail.com
                    </span>
                  </span>
                  <Mail size={17} className="text-gray-300 dark:text-dark-border group-hover:text-rose-400 transition-colors flex-shrink-0" />
                </a>
                <a
                  href="mailto:adoptifyoficial@gmail.com"
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gradient-to-r from-emerald-50/60 to-teal-50/40 dark:from-emerald-500/10 dark:to-teal-500/5 hover:border-emerald-200 dark:hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 transition-all"
                >
                  <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
                    <HeartHandshake size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="font-semibold text-gray-800 dark:text-dark-text block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-[15px]">
                      Atención a Entidades / Refugios
                    </strong>
                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary break-words">
                      adoptifyoficial@gmail.com
                    </span>
                  </span>
                  <Mail size={17} className="text-gray-300 dark:text-dark-border group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                </a>
              </div>
            </div>
          </article>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* Cierre: fecha de actualización, versión y botón de retorno      */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section className="mt-6 overflow-hidden rounded-[2rem] border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
          <div className="px-6 sm:px-8 py-8 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-dark-text-secondary mb-4">
              <HeartHandshake className="w-5 h-5 text-rose-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Compromiso con tus datos
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-600 dark:text-dark-text-secondary mb-7">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-dark-border font-medium">
                <CalendarDays size={15} className="text-rose-500" />
                Última actualización: agosto de 2026
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-dark-border font-medium">
                <Server size={15} className="text-rose-500" />
                Versión del sistema: 1.0 (Producción)
              </span>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow-lg shadow-rose-500/25 hover:from-rose-600 hover:to-amber-600 hover:shadow-xl hover:shadow-rose-500/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
              {backLabel}
            </button>

            <p className="mt-7 text-xs text-gray-400 dark:text-dark-text-secondary">
              © {new Date().getFullYear()} Adoptify · Política de Privacidad · Todos los
              derechos reservados.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
