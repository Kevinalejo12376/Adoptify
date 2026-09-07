import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  CalendarDays,
  Server,
  UserCog,
  Mail,
} from "lucide-react";
import { ADOPTIFY_LOGO as logo } from "../../constants/assets";
import { useAuth } from "../../context/AuthContext";
// Memoria de navegación: saber desde qué vista llegó el usuario y restaurar su scroll.
import { getPreviousPath, requestScrollRestore } from "../../utils/navigationMemory";

// Etiqueta descriptiva del botón "Volver" según la vista de la que proviene el usuario.
export function etiquetaOrigen(path) {
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

/**
 * Lógica compartida del botón "Volver" de las páginas legales.
 * Regresa a la vista anterior (con su scroll) cuando es posible; si no hay vista
 * previa (acceso directo/recarga) cae al inicio correspondiente según rol/sesión.
 */
export function useLegalBack() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isShelter, isStore, isAdmin } = useAuth();

  let homePath = "/";
  if (user) {
    if (isShelter()) homePath = "/refugio/dashboard";
    else if (isStore()) homePath = "/tienda/dashboard";
    else if (isAdmin()) homePath = "/admin/dashboard";
    else homePath = "/dashboard";
  }

  const prevPath = getPreviousPath();
  const origen = prevPath && prevPath !== location.pathname ? prevPath : null;
  const backLabel = origen ? etiquetaOrigen(origen) || "Volver" : "Volver al inicio";

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

  return { homePath, backLabel, handleBack };
}

// Encabezado reutilizable y consistente para cada sección de un documento legal.
export function LegalSectionHeader({
  numero,
  icono: Icono,
  titulo,
  subtitulo,
  gradiente,
  colorIcono,
}) {
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

// Iconos y tonos disponibles para los datos del documento en el hero.
export const HERO_META_ICONS = {
  calendar: { icon: CalendarDays, box: "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  version: { icon: Server, box: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  entidad: { icon: UserCog, box: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  correo: { icon: Mail, box: "bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400" },
};

/**
 * Estructura compartida de las páginas legales (Política de Privacidad,
 * Términos y Condiciones, etc.):
 * - Barra superior con botón "Volver" contextual.
 * - Hero legible (claro/oscuro) con datos del documento.
 * - Índice rápido "En esta página".
 * - Contenido (children: las secciones del documento).
 * - Cierre con fecha de actualización, versión y botón de retorno.
 */
export default function LegalLayout({
  onBack,
  backLabel,
  homePath,
  hero,
  indice = [],
  fecha,
  version,
  docName,
  children,
}) {
  const HeroIcon = hero?.icon || ShieldCheck;

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSeccion = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-rose-50/40 dark:from-dark-bg dark:to-[#14141c] text-gray-900 dark:text-dark-text">
      {/* Barra superior: botón "Volver" contextual (sin navbar del rol) */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-dark-card/85 backdrop-blur-xl border-b border-gray-100 dark:border-dark-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
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
        {/* Hero legible con buen contraste en claro/oscuro */}
        <section className="relative overflow-hidden rounded-[2rem] border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

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
                {hero?.overline && (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                    <HeroIcon size={13} />
                    {hero.overline}
                  </span>
                )}

                <h1 className="mt-5 text-3xl sm:text-4xl lg:text-[2.7rem] font-display font-extrabold leading-[1.1] text-gray-900 dark:text-dark-text">
                  {hero?.title}
                </h1>

                {hero?.subtitle && (
                  <p className="mt-4 text-[15px] sm:text-base text-gray-500 dark:text-dark-text-secondary leading-relaxed max-w-2xl">
                    {hero.subtitle}
                  </p>
                )}
              </div>

              {/* Emblema decorativo de seguridad (solo visual) */}
              <div className="hidden lg:flex flex-shrink-0 items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-rose-500 to-amber-500 opacity-20 blur-lg" />
                  <div className="relative w-28 h-28 rounded-[1.75rem] bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/20">
                    <HeroIcon size={52} strokeWidth={1.6} />
                  </div>
                </div>
              </div>
            </div>

            {/* Datos de identificación del documento */}
            {hero?.meta?.length > 0 && (
              <div className="relative mt-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {hero.meta.map((m, i) => {
                  const MetaIcon = m.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50"
                    >
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-xl ${m.box} flex-shrink-0`}
                      >
                        <MetaIcon size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-text-secondary">
                          {m.label}
                        </p>
                        {m.href ? (
                          <a
                            href={m.href}
                            className="text-sm font-bold leading-snug break-words text-gray-900 dark:text-dark-text hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          >
                            {m.value}
                          </a>
                        ) : (
                          <p className="text-sm font-bold leading-snug text-gray-900 dark:text-dark-text">
                            {m.value}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Índice rápido */}
        {indice.length > 0 && (
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
            <div className="flex flex-wrap gap-2">
              {indice.map((item) => (
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
        )}

        {/* Contenido del documento (secciones) */}
        <div className="mt-6 space-y-6">{children}</div>

        {/* Cierre: fecha de actualización, versión y botón de retorno */}
        <section className="mt-6 overflow-hidden rounded-[2rem] border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
          <div className="px-6 sm:px-8 py-8 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-dark-text-secondary mb-4">
              <ShieldCheck className="w-5 h-5 text-rose-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Compromiso con tu experiencia
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-600 dark:text-dark-text-secondary mb-7">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-dark-border font-medium">
                <CalendarDays size={15} className="text-rose-500" />
                Última actualización: {fecha}
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-dark-border font-medium">
                <Server size={15} className="text-rose-500" />
                Versión del sistema: {version}
              </span>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold shadow-lg shadow-rose-500/25 hover:from-rose-600 hover:to-amber-600 hover:shadow-xl hover:shadow-rose-500/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
              {backLabel}
            </button>

            <p className="mt-7 text-xs text-gray-400 dark:text-dark-text-secondary">
              © {new Date().getFullYear()} Adoptify · {docName} · Todos los derechos
              reservados.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
