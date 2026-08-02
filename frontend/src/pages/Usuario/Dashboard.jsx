import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, PawPrint, Users, Search, ShoppingBag, MessageCircle, Home as HomeIcon, HandHeart, ArrowRight, ChevronRight, ShoppingCart, Star, ArrowUp, MessageSquare, ThumbsUp, Share2, User, Bell, Calendar, MapPin, TrendingUp, Loader2 } from "lucide-react";
// Imagen estática servida desde Cloudinary
const mascotaImg = "https://res.cloudinary.com/kj0wube2/image/upload/v1785347015/frontend-assets/mascotas/mascotas.jpg";
import { listarMascotas } from "../../api/mascotas";
import { listarProductos } from "../../api/productos";
import { listarPosts } from "../../api/foro";
import { estadisticasPublicas } from "../../api/refugios";

const nf = new Intl.NumberFormat("es-CO");

function tiempoRelativo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const horas = Math.floor(diff / 3600000);
  if (horas < 1) return "hace un momento";
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

export default function Dashboard() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [stats, setStats] = useState(null);
  const [pets, setPets] = useState([]);
  const [products, setProducts] = useState([]);
  const [topics, setTopics] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);

  // Carga datos reales para el panel del usuario.
  useEffect(() => {
    let activo = true;
    (async () => {
      const [est, mascotas, prods, posts] = await Promise.all([
        estadisticasPublicas().catch(() => null),
        listarMascotas().catch(() => []),
        listarProductos().catch(() => []),
        listarPosts().catch(() => []),
      ]);
      if (!activo) return;
      setStats(est);
      setPets((mascotas || []).slice(0, 4));
      setProducts((prods || []).slice(0, 3));
      const lista = posts || [];
      setPostsTotal(lista.length);
      setTopics(lista.slice(0, 3));
    })();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);

      const sections = ['forum', 'how-it-works', 'animals', 'store'];
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50 overflow-hidden">
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
                <span>Bienvenido de nuevo</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 font-display tracking-tight leading-tight">
                Encuentra a tu
                <span className="block bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
                  compañero ideal
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-xl">
                Explora mascotas, refugios, tienda y comunidad. Tu nuevo amigo está a un clic de distancia.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/animals" className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all duration-300 hover:scale-105">
                  <PawPrint className="w-5 h-5 mr-2" />
                  Explorar Mascotas
                </Link>
                <Link to="/shelters" className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-rose-300 hover:text-rose-600 transition-all duration-300">
                  <HomeIcon className="w-5 h-5 mr-2" />
                  Ver Refugios
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PawPrint className="w-5 h-5 text-rose-500" />
                    <div className="text-2xl font-bold text-gray-900 font-display">{nf.format(stats?.mascotas_disponibles ?? 0)}</div>
                  </div>
                  <div className="text-sm text-gray-600">Mascotas disponibles</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-5 h-5 text-amber-500" />
                    <div className="text-2xl font-bold text-gray-900 font-display">{nf.format(stats?.adopciones_exitosas ?? 0)}</div>
                  </div>
                  <div className="text-sm text-gray-600">Adopciones exitosas</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-5 h-5 text-rose-500" />
                    <div className="text-2xl font-bold text-gray-900 font-display">{nf.format(stats?.usuarios ?? 0)}</div>
                  </div>
                  <div className="text-sm text-gray-600">Miembros activos</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src={mascotaImg}
                alt="Perro y gato juntos"
                className="rounded-3xl shadow-2xl w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 bg-gradient-to-br from-rose-100/50 to-amber-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/animals" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-200 transition-colors">
                <Search className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Explorar mascotas</h3>
              <p className="text-sm text-gray-600">Encuentra a tu nuevo mejor amigo</p>
            </Link>
            <Link to="/shelters" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
                <HomeIcon className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Refugios</h3>
              <p className="text-sm text-gray-600">Conoce los refugios asociados</p>
            </Link>
            <Link to="/store" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-200 transition-colors">
                <ShoppingBag className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Tienda Online</h3>
              <p className="text-sm text-gray-600">Todo lo que tu mascota necesita</p>
            </Link>
            <Link to="/forum" className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
                <MessageCircle className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Comunidad</h3>
              <p className="text-sm text-gray-600">Comparte, pregunta y aprende</p>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
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
              Te acompañamos en cada proceso hasta que encuentres a tu compañero ideal.
            </p>
          </div>
          
          <div className="relative">
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
            <Link to="/animals" className="text-rose-600 hover:text-rose-700 font-semibold text-lg flex items-center">
              Ver todos los animales <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          
          {pets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay mascotas disponibles por el momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pets.map((pet) => (
                <div key={pet.id} className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center">
                    <PawPrint className="w-16 h-16 text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display">{pet.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-1">{pet.raza || pet.tipo}</p>
                  <p className="text-xs text-gray-500 mb-4">
                    {[pet.edad, pet.refugio_nombre].filter(Boolean).join(" • ")}
                  </p>
                  <Link to={`/animal/${pet.id}`} className="inline-block px-6 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-full hover:from-rose-600 hover:to-amber-600 transition-all">
                    Ver más
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Store Section */}
      <section id="store" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 font-display mb-2">
                Tienda Online
              </h2>
              <p className="text-gray-600">Todo lo que tu mascota necesita en un solo lugar</p>
            </div>
            <Link to="/store" className="text-rose-600 hover:text-rose-700 font-semibold text-lg flex items-center">
              Ver tienda completa <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          
          {products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay productos disponibles por el momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="w-full h-48 mb-4 rounded-xl bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center">
                    <ShoppingBag className="w-16 h-16 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{product.nombre}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-rose-600 font-display">${Number(product.precio).toFixed(2)}</span>
                    <Link to={`/product/${product.id}`} className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-full hover:from-rose-600 hover:to-amber-600 transition-all">
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

      {/* Forum Section */}
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
                  <Link key={topic.id} to="/forum" className="block p-4 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 transition-all duration-300 cursor-pointer">
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
            <Link to="/forum" className="mt-6 inline-flex items-center px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all">
              Ver todos los temas
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50 flex items-center justify-center"
          aria-label="Volver arriba"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
