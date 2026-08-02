import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, Mail, Phone, Sparkles } from "lucide-react";
import logo from "../assets/logo.png";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";

export default function Footer() {
  const { t } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = !!user;
  const isShelter = user?.role === "refugio";
  const isStoreEnabled = user?.settings?.storeEnabled ?? false;

  const navigateWithScroll = (path) => {
    navigate(path);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const scrollToSection = (sectionId) => {
    if (location.pathname === "/") {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  const scrollToTop = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate("/");
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      {/* Decorative top gradient line */}
      <div className="h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center group">
              <img
                src={logo}
                alt="Adoptify Logo"
                className="h-12 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t("footer.brand_desc")}
            </p>
            <div className="flex items-center gap-3 pt-2">
              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="group p-2.5 bg-gray-800 hover:bg-blue-600 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-600/25 flex items-center justify-center"
              >
                <svg className="h-4 w-4 fill-current text-gray-400 group-hover:text-white transition-colors duration-300" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="group p-2.5 bg-gray-800 hover:bg-gradient-to-tr hover:from-purple-600 hover:to-pink-500 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-600/25 flex items-center justify-center"
              >
                <svg className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              {/* TikTok */}
              <a
                href="#"
                aria-label="TikTok"
                className="group p-2.5 bg-gray-800 hover:bg-gray-900 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-gray-900/25 flex items-center justify-center border border-gray-700 hover:border-gray-500"
              >
                <svg className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              {t("footer.explore")}
            </h3>
            <ul className="space-y-3 text-sm">
              {isAuthenticated ? (
                <>
                  {isShelter ? (
                    /* === ACCESOS RÁPIDOS PARA REFUGIO === */
                    <>
                      <li>
                        <button onClick={() => navigateWithScroll("/refugio/dashboard")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          Inicio
                        </button>
                      </li>
                      <li>
                        <button onClick={() => navigateWithScroll("/refugio/mascotas")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          Mascotas
                        </button>
                      </li>
                      <li>
                        <button onClick={() => navigateWithScroll("/refugio/solicitudes")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          Solicitudes
                        </button>
                      </li>
                      <li>
                        <button onClick={() => navigateWithScroll("/refugio/foro")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          Foro
                        </button>
                      </li>
                      {isStoreEnabled && (
                        <li>
                          <button onClick={() => navigateWithScroll("/refugio/tienda")}
                            className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                            <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                            Tienda
                          </button>
                        </li>
                      )}
                    </>
                  ) : (
                    /* === ACCESOS RÁPIDOS PARA USUARIO NORMAL === */
                    <>
                      <li>
                        <button onClick={() => navigateWithScroll("/dashboard")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          {t("nav.inicio")}
                        </button>
                      </li>
                      <li>
                        <button onClick={() => navigateWithScroll("/animals")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          {t("nav.animales")}
                        </button>
                      </li>
                      <li>
                        <button onClick={() => navigateWithScroll("/shelters")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          {t("nav.refugios")}
                        </button>
                      </li>
                      <li>
                        <button onClick={() => navigateWithScroll("/store")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          {t("nav.tienda")}
                        </button>
                      </li>
                      <li>
                        <button onClick={() => navigateWithScroll("/forum")}
                          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left">
                          <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                          {t("nav.foro")}
                        </button>
                      </li>
                    </>
                  )}
                </>
              ) : (
                <>
                  <li>
                    <button
                      onClick={scrollToTop}
                      className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left"
                    >
                      <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                      {t("nav.inicio")}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("animals")}
                      className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left"
                    >
                      <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                      {t("nav.animales")}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("shelters")}
                      className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left"
                    >
                      <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                      {t("nav.refugios")}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("store")}
                      className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left"
                    >
                      <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                      {t("nav.tienda")}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("forum")}
                      className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 cursor-pointer w-full text-left"
                    >
                      <span className="w-1 h-1 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:w-2" />
                      {t("nav.foro")}
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" />
              {t("footer.contact")}
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="group flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-all duration-300 hover:translate-x-1">
                <div className="p-2 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 transition-all duration-300">
                  <Phone className="h-4 w-4 text-rose-400 group-hover:text-rose-300 transition-colors duration-300" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Teléfono</p>
                  <span className="text-gray-300 group-hover:text-white transition-colors duration-300 font-medium">+57 300 123 4567</span>
                </div>
              </li>
              <li className="group flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-all duration-300 hover:translate-x-1">
                <div className="p-2 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 transition-all duration-300">
                  <Mail className="h-4 w-4 text-rose-400 group-hover:text-rose-300 transition-colors duration-300" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Email</p>
                  <span className="text-gray-300 group-hover:text-white transition-colors duration-300 font-medium">adoptifyOficial@gmail.com</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-rose-400 inline-block animate-pulse" />
            © {new Date().getFullYear()} Adoptify. {t("footer.rights")}
          </p>
          <div className="flex space-x-6">
            <Link to="/settings" className="relative text-gray-500 hover:text-rose-400 transition-all duration-300 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-rose-400 after:transition-all after:duration-300 hover:after:w-full">
              {t("footer.privacy")}
            </Link>
            <Link to="/settings" className="relative text-gray-500 hover:text-rose-400 transition-all duration-300 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-rose-400 after:transition-all after:duration-300 hover:after:w-full">
              {t("footer.terms")}
            </Link>
            <Link to="/settings" className="relative text-gray-500 hover:text-rose-400 transition-all duration-300 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-rose-400 after:transition-all after:duration-300 hover:after:w-full">
              {t("footer.cookies")}
            </Link>
            <Link to="/settings" className="relative text-gray-500 hover:text-rose-400 transition-all duration-300 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-rose-400 after:transition-all after:duration-300 hover:after:w-full">
              {t("footer.legal_notice")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
