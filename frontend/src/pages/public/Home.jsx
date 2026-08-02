import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, PawPrint, Users, Search, ShoppingBag, MessageCircle, Home as HomeIcon, HandHeart, ArrowRight, ChevronRight, ShoppingCart, Star, ArrowUp, MessageSquare, ThumbsUp, Share2, User } from "lucide-react";
import ScrollToTop from "../../components/ScrollToTop";
import AnimatedSection from "../../components/AnimatedSection";
import AutoFadingImage from "../../components/AutoFadingImage";
import { useAuth } from "../../context/AuthContext";
import { estadisticasPublicas, listarRefugios } from "../../api/refugios";
import { listarMascotas } from "../../api/mascotas";
import { listarProductos } from "../../api/productos";
import { listarPosts } from "../../api/foro";
// Imágenes estáticas servidas desde Cloudinary
const mascotaImg = "https://res.cloudinary.com/kj0wube2/image/upload/v1785347015/frontend-assets/mascotas/mascotas.jpg";
const daycareImg = "https://res.cloudinary.com/kj0wube2/image/upload/v1785347013/frontend-assets/daycare/daycare.jpg";

// Imágenes del carrusel automático (Cloudinary)
const carrusel1 = "https://res.cloudinary.com/kj0wube2/image/upload/v1785347016/frontend-assets/carrusel/carrusel1.jpg";
const carrusel2 = "https://res.cloudinary.com/kj0wube2/image/upload/v1785347017/frontend-assets/carrusel/carrusel2.jpg";
const carrusel3 = "https://res.cloudinary.com/kj0wube2/image/upload/v1785347018/frontend-assets/carrusel/carrusel3.jpg";

const carruselImages = [carrusel1, carrusel2, carrusel3];

function tiempoRelativo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "hace un momento";
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    estadisticasPublicas().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    Promise.all([
      listarMascotas().then(data => setPets(Array.isArray(data) ? data.slice(0, 4) : [])).catch(() => setPets([])),
      listarRefugios().then(data => setRefugios(Array.isArray(data) ? data.slice(0, 3) : [])).catch(() => setRefugios([])),
      listarProductos().then(data => setProductos(Array.isArray(data) ? data.slice(0, 3) : [])).catch(() => setProductos([])),
      listarPosts().then(data => {
        if (Array.isArray(data)) {
          setTopics(data.slice(0, 3));
          setPostsTotal(data.length);
        }
      }).catch(() => { setTopics([]); setPostsTotal(0); }),
    ]).finally(() => setLoading(false));
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
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 font-display mb-2">
                Ellos están esperando una familia
              </h2>
              <p className="text-gray-600">Conoce a algunos de nuestros amigos disponibles</p>
            </div>
            <Link to="/login" className="text-rose-600 hover:text-rose-700 font-semibold text-lg flex items-center">
              Ver todos los animales <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          
          {pets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aún no hay mascotas publicadas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pets.map((pet) => (
                <div key={pet.id} className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center">
                    <PawPrint className="w-16 h-16 text-rose-500" />
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
          <div className="flex justify-between items-center mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
                <HomeIcon className="w-4 h-4" />
                <span>Refugios aliados</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 font-display mb-2">
                Conoce nuestros Refugios
              </h2>
              <p className="text-gray-600">Espacios dedicados al cuidado y bienestar animal</p>
            </div>
            <Link to="/login" className="text-rose-600 hover:text-rose-700 font-semibold text-lg flex items-center">
              Ver todos los refugios <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          {refugios.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <HomeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aún no hay refugios registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {refugios.map((shelter) => (
                <div key={shelter.id} className="group bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center group-hover:from-amber-200 group-hover:to-rose-200 transition-all duration-300">
                    <HomeIcon className="w-10 h-10 text-amber-600" />
                  </div>
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

          {/* CTA dentro de refugios */}
          <div className="mt-12 bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl p-8 text-center border border-amber-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-3 font-display">
              ¿Eres un refugio y quieres unirte?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Registra tu refugio en Adoptify y llega a miles de personas que buscan adoptar y ayudar.
            </p>
            <Link to="/registrar-refugio" className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200 hover:shadow-xl">
              Registrar mi refugio
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* Store Section */}
      <AnimatedSection animation="fadeInUp" delay={150}>
      <section id="store" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 font-display mb-2">
                Tienda Online
              </h2>
              <p className="text-gray-600">Todo lo que tu mascota necesita en un solo lugar</p>
            </div>
            <Link to="/login" className="text-rose-600 hover:text-rose-700 font-semibold text-lg flex items-center">
              Ver tienda completa <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          
          {productos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aún no hay productos publicados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productos.map((product) => (
                <div key={product.id} className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="w-full h-48 mb-4 rounded-xl bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center">
                    <ShoppingBag className="w-16 h-16 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{product.nombre}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-rose-600 font-display">${Number(product.precio).toFixed(2)}</span>
                    <Link to={user ? `/product/${product.id}` : "/login"} className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-full hover:from-rose-600 hover:to-amber-600 transition-all">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
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
            {topics.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aún no hay temas en el foro</p>
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
