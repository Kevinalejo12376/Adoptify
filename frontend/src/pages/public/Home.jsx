import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, PawPrint, Users, Search, ShoppingBag, MessageCircle, Home as HomeIcon, HandHeart, ArrowRight, ChevronRight, ShoppingCart, Star, ArrowUp, MessageSquare, ThumbsUp, Share2, User, Check, Loader2, AlertCircle } from "lucide-react";
import ScrollToTop from "../../components/ScrollToTop";
import AnimatedSection from "../../components/AnimatedSection";
import AutoFadingImage from "../../components/AutoFadingImage";
import { useAuth } from "../../context/AuthContext";
import { CAROUSEL_IMAGES } from "../../assets/images";
import { estadisticasPublicas, listarRefugios } from "../../api/refugios";
import { listarMascotas } from "../../api/mascotas";
import { listarProductos } from "../../api/productos";
import { listarPosts } from "../../api/foro";
import { formatPrice } from "../../utils/price";
// Carrusel automático: imágenes servidas desde Cloudinary (carpeta
// "frontend-assets/assets-extras"). Centralizadas en src/assets/images.js.
const carruselImages = CAROUSEL_IMAGES;

function tiempoRelativo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "hace un momento";
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// Logo del refugio con fallback: si hay un logo válido se muestra solo el
// logo; si no hay logo o la imagen falla (eliminada o URL inválida), se
// muestra únicamente el ícono como imagen predeterminada.
function ShelterLogo({ logo, name }) {
  const [failed, setFailed] = useState(false);
  const showLogo = logo && !failed;
  return (
    <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center group-hover:from-amber-200 group-hover:to-rose-200 transition-all duration-300 overflow-hidden">
      {showLogo ? (
        <img
          src={logo}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <HomeIcon className="w-10 h-10 text-amber-600" />
      )}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("");
  // Estadisticas reales de la plataforma
  const [stats, setStats] = useState(null);
  const [pets, setPets] = useState([]);
  const [refugios, setRefugios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [topics, setTopics] = useState([]);

  // Estados independientes por sección: loading / success / empty / error.
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState(null);
  const [refugiosLoading, setRefugiosLoading] = useState(true);
  const [refugiosError, setRefugiosError] = useState(null);
  const [productosLoading, setProductosLoading] = useState(true);
  const [productosError, setProductosError] = useState(null);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState(null);

  useEffect(() => {
    estadisticasPublicas().then(setStats).catch(() => setStats(null));
  }, []);

  // Mascotas: estados loading / success / empty / error independientes.
  useEffect(() => {
    let activo = true;
    (async () => {
      setPetsLoading(true); setPetsError(null);
      try {
        const data = await listarMascotas();
        if (!activo) return;
        // Filtro defensivo: no mostrar mascotas de refugios inactivos.
        setPets(Array.isArray(data) ? data.filter((m) => m.refugio_activo !== false).slice(0, 4) : []);
      } catch (e) {
        if (activo) setPetsError(e?.message || "No se pudieron cargar las mascotas");
      } finally {
        if (activo) setPetsLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Refugios: estados loading / success / empty / error independientes.
  useEffect(() => {
    let activo = true;
    (async () => {
      setRefugiosLoading(true); setRefugiosError(null);
      try {
        const data = await listarRefugios();
        if (!activo) return;
        setRefugios(Array.isArray(data) ? data.slice(0, 3) : []);
      } catch (e) {
        if (activo) setRefugiosError(e?.message || "No se pudieron cargar los refugios");
      } finally {
        if (activo) setRefugiosLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Productos de las tiendas: estados loading / success / empty / error.
  useEffect(() => {
    let activo = true;
    (async () => {
      setProductosLoading(true); setProductosError(null);
      try {
        const data = await listarProductos();
        if (!activo) return;
        setProductos(Array.isArray(data) ? data.slice(0, 3) : []);
      } catch (e) {
        if (activo) setProductosError(e?.message || "No se pudieron cargar los productos");
      } finally {
        if (activo) setProductosLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Temas recientes del foro: estados loading / success / empty / error.
  useEffect(() => {
    let activo = true;
    (async () => {
      setTopicsLoading(true); setTopicsError(null);
      try {
        const data = await listarPosts();
        if (!activo) return;
        if (Array.isArray(data)) {
          setTopics(data.slice(0, 3));
          setPostsTotal(data.length);
        }
      } catch (e) {
        if (activo) setTopicsError(e?.message || "No se pudieron cargar los temas del foro");
      } finally {
        if (activo) setTopicsLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Detect active section
      const sections = ['forum', 'how-it-works', 'animals', 'shelters', 'store'];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50 overflow-hidden animate-fade-in-up">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-40 h-40 bg-rose-200/30 rounded-full blur-3xl animate-float-1" />
          <div className="absolute top-40 right-32 w-48 h-48 bg-amber-200/30 rounded-full blur-3xl animate-float-2" />
          <div className="absolute bottom-32 left-40 w-44 h-44 bg-rose-300/20 rounded-full blur-3xl animate-float-3" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium mb-6">
                <Heart className="w-4 h-4" />
                <span>Conectando corazones con patitas</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 font-display tracking-tight leading-tight">
                Adopta, Ama y
                <span className="block bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
                  Cambia una vida
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-xl">
                En Adoptify conectamos personas con animales que buscan un hogar lleno de amor. Tu compañero ideal te espera.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all duration-300 hover:scale-105">
                  <PawPrint className="w-5 h-5 mr-2" />
                  Quiero Adoptar
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-rose-300 hover:text-rose-600 transition-all duration-300">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Ir a la Tienda
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PawPrint className="w-5 h-5 text-rose-500" />
                    <div className="text-2xl font-bold text-gray-900 font-display">{stats ? stats.mascotas_disponibles : "—"}</div>
                  </div>
                  <div className="text-sm text-gray-600">Mascotas disponibles</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-5 h-5 text-amber-500" />
                    <div className="text-2xl font-bold text-gray-900 font-display">{stats ? stats.adopciones_exitosas : "—"}</div>
                  </div>
                  <div className="text-sm text-gray-600">Adopciones exitosas</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <HomeIcon className="w-5 h-5 text-rose-500" />
                    <div className="text-2xl font-bold text-gray-900 font-display">{stats ? stats.refugios : "—"}</div>
                  </div>
                  <div className="text-sm text-gray-600">Refugios aliados</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <AutoFadingImage
                images={carruselImages}
                alt="Perros y gatos - Adoptify"
                className="rounded-3xl shadow-2xl w-full object-cover"
                wrapperClassName="rounded-3xl"
                interval={5000}
                fadeDuration={1000}
              />
              {!user && (
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">¡Únete ahora!</div>
                    <div className="text-sm text-gray-600">Es gratis</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-br from-rose-100/50 to-amber-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/login" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-200 transition-colors">
                <Search className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Explorar mascotas</h3>
              <p className="text-sm text-gray-600">Encuentra a tu nuevo mejor amigo</p>
            </Link>
            <Link to="/login" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
                <ShoppingBag className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Tienda Online</h3>
              <p className="text-sm text-gray-600">Todo lo que tu mascota necesita</p>
            </Link>
            <Link to="/login" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-200 transition-colors">
                <MessageCircle className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Únete al Foro</h3>
              <p className="text-sm text-gray-600">Comparte, pregunta y aprende</p>
            </Link>
            <Link to="/login" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
                <HandHeart className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Ayuda y colabora</h3>
              <p className="text-sm text-gray-600">Tu apoyo hace la diferencia</p>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <AnimatedSection animation="fadeInUp" delay={100}>
      <section id="how-it-works" className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/30 via-white to-amber-50/30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium mb-6">
              <Heart className="w-4 h-4" />
              <span>Proceso simple y seguro</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 font-display">
              En Adoptify es más fácil de lo que imaginas
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              En Adoptify te acompañamos en cada proceso hasta que encuentres a tu compañero ideal.
            </p>
          </div>
          
          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-rose-300 via-amber-300 to-amber-300 rounded-full" />
            
            <div className="grid md:grid-cols-5 gap-8 items-start">
              {[
                { icon: Search, title: "Explora", desc: "Busca entre cientos de perritos y gatitos que esperan por un hogar", color: "from-rose-400 to-rose-500" },
                { icon: Star, title: "Conoce", desc: "Revisa sus perfiles, fotos y personalidades para encontrar tu match perfecto", color: "from-amber-400 to-amber-500" },
                { icon: MessageCircle, title: "Conecta", desc: "Habla con el refugio y resuelve todas tus dudas", color: "from-rose-400 to-rose-500" },
                { icon: HomeIcon, title: "Adopta", desc: "Completa el proceso de adopción de forma segura y responsable", color: "from-amber-400 to-amber-500" },
                { icon: PawPrint, title: "Cambia vidas", desc: "Dale un hogar lleno de amor y recibe compañía leal", color: "from-rose-400 to-amber-500" }
              ].map((step, index) => (
                <div key={index} className="text-center relative group">
                  <div className="relative z-10">
                    <div className={`w-24 h-24 mx-auto mb-6 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300`}>
                      <step.icon className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-8 h-8 bg-white rounded-full flex items-center justify-center border-4 border-rose-200 font-bold text-rose-600 text-sm">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 font-display">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* Pets Section */}
      <section id="animals" className="py-20 bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 font-display mb-2">
                Ellos están esperando una familia
              </h2>
              <p className="text-gray-600">Conoce a algunos de nuestros amigos disponibles</p>
            </div>
            <Link to="/login" className="text-rose-600 hover:text-rose-700 font-semibold text-lg flex items-center shrink-0">
              Ver todos los animales <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          
          {petsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
              <p className="text-gray-500">Cargando mascotas…</p>
            </div>
          ) : petsError ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-gray-500">{petsError}</p>
            </div>
          ) : pets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay mascotas disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pets.map((pet) => (
                <div key={pet.id} className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center overflow-hidden">
                    {pet.imagen_url || (pet.imagenes && pet.imagenes[0]?.url) ? (
                      <img
                        src={pet.imagen_url || (pet.imagenes && pet.imagenes[0]?.url)}
                        alt={pet.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <PawPrint className="w-16 h-16 text-rose-500" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display">{pet.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-4">{pet.refugio_nombre || pet.raza || pet.tipo}</p>
                  <Link to={user ? `/animal/${pet.id}` : "/login"} className="inline-block px-6 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-full hover:from-rose-600 hover:to-amber-600 transition-all">
                    Ver más
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Shelters Section */}
      <AnimatedSection animation="fadeInUp" delay={200}>
      <section id="shelters" className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-white to-rose-50/30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
                <HomeIcon className="w-4 h-4" />
                <span>Refugios aliados</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 font-display mb-2">
                Conoce nuestros Refugios
              </h2>
              <p className="text-gray-600">Espacios dedicados al cuidado y bienestar animal</p>
            </div>
            <Link to="/login" className="text-rose-600 hover:text-rose-700 font-semibold text-lg flex items-center shrink-0">
              Ver todos los refugios <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          {refugiosLoading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
              <p className="text-gray-500">Cargando refugios…</p>
            </div>
          ) : refugiosError ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-gray-500">{refugiosError}</p>
            </div>
          ) : refugios.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <HomeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aún no hay refugios registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {refugios.map((shelter) => (
                <div key={shelter.id} className="group bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100">
                  <ShelterLogo logo={shelter.logo_url} name={shelter.nombre} />
                  <h3 className="text-xl font-bold text-gray-900 mb-1 text-center font-display">{shelter.nombre}</h3>
                  <p className="text-sm text-amber-600 font-medium mb-3 text-center">{shelter.ubicacion || "Colombia"}</p>
                  <p className="text-sm text-gray-600 mb-4 text-center leading-relaxed line-clamp-3">
                    {shelter.descripcion || "Refugio comprometido con el bienestar y la adopción responsable."}
                  </p>
                  <div className="text-center">
                    <Link
                      to={user ? `/shelter/${shelter.id}` : "/login"}
                      className="inline-block px-6 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold rounded-full hover:from-amber-600 hover:to-rose-600 transition-all text-sm cursor-pointer"
                    >
                      Ver refugio
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA: Haz parte de la comunidad Adoptify */}
          <div className="mt-16 mb-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium mb-5">
                <Users className="w-4 h-4" aria-hidden="true" />
                <span>Únete a nuestra comunidad</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 font-display mb-3">
                Haz parte de la comunidad Adoptify
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Elige cómo quieres formar parte de nuestra comunidad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
              {/* Card Refugio */}
              <div className="group relative h-full bg-white rounded-3xl shadow-lg shadow-rose-100/60 border border-rose-50 p-8 flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-rose-200/60 hover:border-rose-200">
                <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-rose-500 to-amber-500 rounded-b-full opacity-80 transition-all duration-300 group-hover:opacity-100" aria-hidden="true" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <PawPrint className="w-8 h-8 text-rose-600" aria-hidden="true" />
                </div>
                <span className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-wide mb-4">
                  Refugio
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 font-display mb-3">
                  ¿Buscas darle más visibilidad a tu refugio?
                </h3>
                <p className="text-gray-600 leading-relaxed mb-5">
                  Conecta tus mascotas con personas que buscan brindarles un hogar y haz que tu refugio llegue a más personas.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-rose-600 mb-7">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Conecta
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Comparte
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Encuentra hogares
                  </span>
                </div>
                <div className="mt-auto">
                  <Link
                    to="/registrar-refugio"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:from-rose-600 hover:to-amber-600 transition-all duration-300 shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300"
                  >
                    Registrar mi refugio
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Card Tienda Aliada */}
              <div className="group relative h-full bg-white rounded-3xl shadow-lg shadow-amber-100/60 border border-amber-50 p-8 flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-200/60 hover:border-amber-200">
                <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-amber-500 to-rose-500 rounded-b-full opacity-80 transition-all duration-300 group-hover:opacity-100" aria-hidden="true" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <ShoppingBag className="w-8 h-8 text-amber-600" aria-hidden="true" />
                </div>
                <span className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold uppercase tracking-wide mb-4">
                  Tienda Aliada
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 font-display mb-3">
                  ¿Quieres llevar tu tienda a más personas?
                </h3>
                <p className="text-gray-600 leading-relaxed mb-5">
                  Conecta tus productos con una comunidad que ama, cuida y apoya a los animales.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-amber-600 mb-7">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Conecta
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Ofrece
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Crece
                  </span>
                </div>
                <div className="mt-auto">
                  <Link
                    to="/registrar-tienda"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold hover:from-amber-600 hover:to-rose-600 transition-all duration-300 shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
                  >
                    Registrar mi tienda
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* Store Section */}
      <AnimatedSection animation="fadeInUp" delay={150}>
      <section id="store" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 font-display mb-2">
                Tienda Online
              </h2>
              <p className="text-gray-600">Todo lo que tu mascota necesita en un solo lugar</p>
            </div>
            <Link to="/login" className="text-rose-600 hover:text-rose-700 font-semibold text-lg flex items-center shrink-0">
              Ver tienda completa <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          
          {productosLoading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
              <p className="text-gray-500">Cargando productos…</p>
            </div>
          ) : productosError ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-gray-500">{productosError}</p>
            </div>
          ) : productos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productos.map((product) => {
                // Imagen real del producto (Cloudinary) devuelta por la API.
                const productImage =
                  product.imagen_url ||
                  (product.imagenes && product.imagenes[0]?.url) ||
                  null;
                return (
                  <div key={product.id} className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="w-full h-48 mb-4 rounded-xl bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center overflow-hidden">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={product.nombre}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <ShoppingBag className="w-16 h-16 text-rose-500" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{product.nombre}</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-rose-600 font-display">{formatPrice(product.precio)}</span>
                      <Link to={user ? `/product/${product.id}` : "/login"} className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-full hover:from-rose-600 hover:to-amber-600 transition-all">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Ver
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      </AnimatedSection>

      {/* Help CTA Section */}
      <section className="py-20 bg-gradient-to-r from-rose-500 to-amber-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <PawPrint className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-2 font-display">
                  Tu ayuda hace la diferencia
                </h3>
                <p className="text-rose-100 text-lg">
                  Además de adoptar, puedes apoyar a los animales compartiendo o donando.
                </p>
              </div>
            </div>
            <Link to="/login" className="inline-flex items-center px-8 py-4 bg-white text-rose-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              Quiero ayudar
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Forum Section */}
      <AnimatedSection animation="fadeInUp" delay={250}>
      <section id="forum" className="py-20 bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium mb-6">
              <MessageSquare className="w-4 h-4" />
              <span>Comunidad Activa</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 font-display">
              Únete a nuestro Foro
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comparte experiencias, haz preguntas y conecta con otros amantes de los animales.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: MessageSquare,
                title: "Discusiones",
                desc: "Participa en conversaciones sobre cuidado, entrenamiento y más",
                count: String(postsTotal),
                color: "from-rose-400 to-rose-500"
              },
              {
                icon: ThumbsUp,
                title: "Consejos",
                desc: "Recibe y comparte tips de la comunidad",
                count: String(postsTotal),
                color: "from-amber-400 to-amber-500"
              },
              {
                icon: Share2,
                title: "Historias",
                desc: "Comparte tu experiencia de adopción",
                count: String(postsTotal),
                color: "from-rose-400 to-amber-500"
              }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className={`w-16 h-16 mb-4 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-display">{item.title}</h3>
                <p className="text-gray-600 mb-4">{item.desc}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User className="w-4 h-4" />
                  <span>{item.count} temas activos</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 font-display">Temas Recientes</h3>
            {topicsLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
                <p className="text-gray-500">Cargando temas recientes…</p>
              </div>
            ) : topicsError ? (
              <div className="text-center py-10">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-gray-500">{topicsError}</p>
              </div>
            ) : topics.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay temas recientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topics.map((topic) => (
                  <Link key={topic.id} to={user ? "/forum" : "/login"} className="block p-4 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 transition-all duration-300 cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{topic.titulo}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {topic.autor}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {topic.comentarios_count} respuestas
                          </span>
                          <span>{tiempoRelativo(topic.creado_en)}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-rose-500 mt-2" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link to="/login" className="mt-6 inline-flex items-center px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all">
              Ver todos los temas
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
