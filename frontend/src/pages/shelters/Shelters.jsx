import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search, MapPin, Phone, Mail, Star, Heart, Users, PawPrint, ArrowRight,
  ChevronDown, Home, Loader2, Building2, RotateCcw, X, Navigation, Locate,
} from "lucide-react";
import ScrollToTop from "../../components/ScrollToTop";
import { useFavorites } from "../../context/FavoritesContext";
import { listarRefugios } from "../../api/refugios";
import { useAuth } from "../../context/AuthContext";
import { ciudadesCoinciden, obtenerCiudadActual } from "../../utils/ubicacion";

// Logo del refugio con fallback: si hay un logo válido se muestra solo el
// logo; si no hay logo o la imagen falla (eliminada o URL inválida), se
// muestra únicamente el ícono como imagen predeterminada.
function ShelterCardLogo({ logo, name }) {
  const [failed, setFailed] = useState(false);
  const showLogo = logo && !failed;
  return (
    <div className="relative w-full h-48 bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center overflow-hidden">
      {showLogo ? (
        <img
          src={logo}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Home className="w-20 h-20 text-rose-400" />
      )}
    </div>
  );
}

// Tarjeta de refugio reutilizable (misma lógica y estilos que la vista original).
function ShelterCard({ shelter, isFavorite, onToggleFavorite }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group border border-gray-100 dark:border-dark-border">
      <div className="relative">
        <ShelterCardLogo logo={shelter.logo} name={shelter.name} />
        {shelter.rating > 0 && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            {shelter.rating}
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(shelter);
          }}
          className={`absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-300 hover:scale-110 ${
            isFavorite
              ? "bg-rose-500 text-white"
              : "bg-white/90 backdrop-blur-sm text-gray-400 hover:text-rose-500"
          }`}
          title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? "fill-white" : ""}`} />
        </button>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2 font-display">
          {shelter.name}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
          <MapPin className="w-4 h-4 text-rose-500" />
          <span>{shelter.location}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4 line-clamp-2">
          {shelter.description}
        </p>

        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-dark-text-secondary">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            Activo
          </span>
        </div>

        <div className="space-y-2 mb-4">
          {shelter.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
              <Phone className="w-4 h-4 text-rose-500" />
              <span>{shelter.phone}</span>
            </div>
          )}
          {shelter.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
              <Mail className="w-4 h-4 text-rose-500" />
              <span className="truncate">{shelter.email}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {shelter.phone && (
            <a
              href={`https://wa.me/${shelter.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-all"
            >
              <Phone className="w-4 h-4" />
              WhatsApp
            </a>
          )}
          <Link
            to={`/shelter/${shelter.id}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
          >
            Ver más
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Shelters() {
  const { isShelterFavorite, toggleShelterFavorite } = useFavorites();
  const { currentCity, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // "Cerca de mí": modo de vista + ciudad del usuario (detectada o registrada).
  const [viewMode, setViewMode] = useState("todos"); // 'cerca' | 'todos'
  const [miCiudad, setMiCiudad] = useState("");
  const [detectando, setDetectando] = useState(false);
  const [detectado, setDetectado] = useState(false);

  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga los refugios reales desde la base de datos.
  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const data = await listarRefugios();
        if (!activo) return;
        setShelters((data || []).map((r) => ({
          id: r.id,
          name: r.nombre,
          location: r.ubicacion || "Sin ciudad",
          address: r.direccion || "",
          phone: r.telefono || "",
          email: r.email || "",
          rating: 0,
          logo: r.logo_url || null,
          description: r.descripcion || "Refugio comprometido con el bienestar animal.",
        })));
      } catch (e) {
        if (activo) setError(e?.message || "No se pudieron cargar los refugios");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Inicializa la ciudad del usuario: prioriza la detectada en vivo (currentCity)
  // y, si no está, usa la ciudad registrada en su cuenta (perfil). Si hay ciudad,
  // la vista arranca mostrando los refugios "Cerca de mí".
  useEffect(() => {
    const ciudadRegistrada =
      user?.location || user?.ubicacion || user?.ciudad || user?.municipio || "";
    if (currentCity) {
      setMiCiudad(currentCity);
      setDetectado(true);
      setViewMode("cerca");
    } else if (ciudadRegistrada) {
      setMiCiudad(ciudadRegistrada);
      setDetectado(true);
      setViewMode("cerca");
    } else {
      setViewMode("todos");
    }
  }, [currentCity, user]);

  // Detecta la ubicación actual del dispositivo (solo si el usuario ya concedió
  // el permiso) y activa el modo "Cerca de mí".
  const detectarMiUbicacion = async () => {
    setDetectando(true);
    try {
      const ciudad = await obtenerCiudadActual();
      if (ciudad) {
        setMiCiudad(ciudad);
        setDetectado(true);
        setViewMode("cerca");
        setSelectedCity("all");
        setSearchTerm("");
      } else {
        // Sin permiso/ubicación: si hay ciudad registrada se usa esa; si no, se
        // informa que no se pudo detectar.
        const ciudadRegistrada =
          user?.location || user?.ubicacion || user?.ciudad || user?.municipio || "";
        if (ciudadRegistrada) {
          setMiCiudad(ciudadRegistrada);
          setDetectado(true);
          setViewMode("cerca");
        } else {
          setDetectado(false);
          setViewMode("todos");
        }
      }
    } finally {
      setDetectando(false);
    }
  };

  // Activa el modo "Cerca de mí": si aún no hay ciudad, intenta detectarla.
  const activarCercaDeMi = async () => {
    if (!miCiudad) {
      await detectarMiUbicacion();
    } else {
      setViewMode("cerca");
      setSelectedCity("all");
      setSearchTerm("");
    }
  };

  // Ciudades generadas dinamicamente a partir de los refugios reales.
  const cities = ["all", ...Array.from(new Set(shelters.map((s) => s.location).filter(Boolean)))];

  // Prioriza los refugios activos de la ciudad/municipio actual del usuario
  // (si fue detectada al iniciar sesión): primero los de su ciudad y después
  // los de otras ciudades. Si no hay ubicación, se conserva el orden original.
  const priorizarPorCiudad = (lista) => {
    if (!currentCity) return lista;
    return [...lista].sort((a, b) => {
      const aLocal = ciudadesCoinciden(a.location, currentCity);
      const bLocal = ciudadesCoinciden(b.location, currentCity);
      if (aLocal !== bLocal) return aLocal ? -1 : 1;
      return 0;
    });
  };

  const filteredShelters = priorizarPorCiudad(
    shelters.filter((shelter) => {
      const matchesSearch =
        shelter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shelter.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = selectedCity === "all" || shelter.location === selectedCity;
      return matchesSearch && matchesCity;
    })
  );

  // En modo "Cerca de mí" se separan los refugios de la misma ciudad del resto.
  const cercaDeMi = filteredShelters.filter((s) => ciudadesCoinciden(s.location, miCiudad));
  const otrosRefugios = filteredShelters.filter((s) => !ciudadesCoinciden(s.location, miCiudad));

  const hasActiveFilters = selectedCity !== "all" || searchTerm !== "";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCity("all");
  };

  const renderCard = (shelter) => (
    <ShelterCard
      key={shelter.id}
      shelter={shelter}
      isFavorite={isShelterFavorite(shelter.id)}
      onToggleFavorite={toggleShelterFavorite}
    />
  );

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500/10 to-amber-500/10 dark:from-rose-900/20 dark:to-amber-900/20 text-rose-600 dark:text-rose-400 rounded-full text-sm font-semibold mb-4 border border-rose-200/50 dark:border-rose-800/30">
            <Building2 className="w-4 h-4" />
            Refugios
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-dark-text mb-4 font-display leading-tight">
            Refugios{" "}
            <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
              Asociados
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-dark-text-secondary max-w-2xl">
            Conoce a los refugios que trabajan incansablemente por el bienestar de los animales
          </p>
        </div>

        {/* Toggle: Cerca de mí / Todos los refugios */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="inline-flex bg-white dark:bg-dark-card rounded-2xl p-1.5 border border-gray-100 dark:border-dark-border shadow-sm">
            <button
              onClick={activarCercaDeMi}
              disabled={detectando}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                viewMode === "cerca"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20"
                  : "text-gray-600 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              }`}
            >
              {detectando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              {detectando ? "Detectando..." : "Cerca de mí"}
            </button>
            <button
              onClick={() => setViewMode("todos")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                viewMode === "todos"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20"
                  : "text-gray-600 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              }`}
            >
              <Home className="w-4 h-4" />
              Todos los refugios
            </button>
          </div>

          {viewMode === "cerca" && (
            <div className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-4 py-2 rounded-xl">
              {detectado ? (
                <Locate className="w-4 h-4" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              {detectado
                ? `Mostrando refugios de ${miCiudad}`
                : "Activa tu ubicación o regístrala en tu perfil para ver refugios cerca de ti"}
            </div>
          )}
        </div>

        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar refugio por nombre o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-36 py-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm dark:text-dark-text dark:placeholder-dark-text-secondary"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 bg-gray-100 dark:bg-dark-border rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
                  title="Limpiar filtros"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  showFilters
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                    : "bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400"
                }`}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
                />
                <span className="hidden sm:inline">Filtros</span>
              </button>
            </div>
          </div>

          {/* Filter Panel: ciudad */}
          {showFilters && (
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-dark-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">Ciudad</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedCity === city
                        ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                        : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400"
                    }`}
                  >
                    {city === "all" ? "Todas" : city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Estado de carga / error */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center text-gray-500 dark:text-dark-text-secondary">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
            <p>Cargando refugios...</p>
          </div>
        )}
        {error && !loading && (
          <div className="py-6 mb-6 text-center text-red-600 bg-red-50 rounded-xl border border-red-100">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600 dark:text-dark-text-secondary">
                Mostrando{" "}
                <span className="font-semibold text-gray-900 dark:text-dark-text">{filteredShelters.length}</span>{" "}
                {filteredShelters.length === 1 ? "refugio" : "refugios"}
              </p>
            </div>

            {/* ─── MODO "CERCA DE MÍ" ─────────────────────────────────── */}
            {viewMode === "cerca" && (
              <>
                {/* Cuadro azul destacado: refugios de la misma ciudad */}
                {cercaDeMi.length > 0 ? (
                  <section className="mb-10 rounded-3xl border-2 border-rose-200 dark:border-rose-500/30 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/10 dark:to-amber-500/5 p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-5 flex-wrap">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20">
                        <Navigation className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                          Refugios cerca de ti
                        </h2>
                        <p className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {miCiudad}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-full text-sm font-semibold">
                        {cercaDeMi.length} {cercaDeMi.length === 1 ? "refugio" : "refugios"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {cercaDeMi.map(renderCard)}
                    </div>
                  </section>
                ) : (
                  <div className="mb-10 rounded-3xl border-2 border-dashed border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-rose-500 dark:text-rose-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-display">
                      No hay refugios en {miCiudad || "tu ciudad"} todavía
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary max-w-md mx-auto mb-4">
                      Aún no hay refugios registrados en tu ciudad. Explora los demás refugios
                      para conocer su labor.
                    </p>
                    <button
                      onClick={() => setViewMode("todos")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
                    >
                      Ver todos los refugios
                    </button>
                  </div>
                )}

                {/* Demás refugios */}
                {otrosRefugios.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-rose-500" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">
                          Otros refugios
                        </h2>
                      </div>
                      <span className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-sm font-semibold">
                        {otrosRefugios.length} {otrosRefugios.length === 1 ? "refugio" : "refugios"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {otrosRefugios.map(renderCard)}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* ─── MODO "TODOS LOS REFUGIOS" ─────────────────────────── */}
            {viewMode === "todos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredShelters.map(renderCard)}
              </div>
            )}

            {/* No Results */}
            {filteredShelters.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center">
                  <Home className="w-10 h-10 text-rose-400 dark:text-rose-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
                  No se encontraron refugios
                </h3>
                <p className="text-gray-500 dark:text-dark-text-secondary mb-6 max-w-md mx-auto">
                  {hasActiveFilters
                    ? "Intenta con otros filtros o términos de búsqueda."
                    : "Aún no hay refugios registrados."}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 hover:scale-105 active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <ScrollToTop />
    </div>
  );
}
