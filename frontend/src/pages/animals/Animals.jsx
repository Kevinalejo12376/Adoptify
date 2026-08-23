import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  PawPrint,
  Heart,
  MapPin,
  ChevronDown,
  X,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Dog,
  Cat,
  Ruler,
  Calendar,
  VenetianMask,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ScrollToTop from "../../components/ScrollToTop";
import { listarMascotas } from "../../api/mascotas";

export default function Animals() {
  const { addFavorite, removeFavorite, isFavorite } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedAge, setSelectedAge] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");

  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Trae las mascotas reales desde la base de datos.
  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listarMascotas();
        if (!activo) return;
        setAnimals(
          // Filtro defensivo: nunca mostrar mascotas de refugios inactivos.
          data
            .filter((m) => m.refugio_activo !== false)
            .map((m) => ({
            id: m.id,
            name: m.nombre,
            type: m.tipo || "",
            breed: m.raza || "Sin raza",
            age: m.edad || "—",
            size: m.tamano || "—",
            gender: m.genero || "—",
            shelter: m.refugio_nombre || "Refugio",
            image:
              m.imagen_url ||
              (m.imagenes && m.imagenes[0]?.url) ||
              null,
          }))
        );
      } catch (e) {
        if (activo) setError(e?.message || "No se pudieron cargar las mascotas");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [reloadKey]);

  const toggleFavorite = (animal) => {
    if (isFavorite(animal.id)) {
      removeFavorite(animal.id);
    } else {
      addFavorite(animal);
    }
  };

  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = animal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         animal.breed.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || animal.type === selectedType;
    const matchesSize = selectedSize === "all" || animal.size === selectedSize;
    const matchesAge = selectedAge === "all" || animal.age.includes(selectedAge);
    const matchesGender = selectedGender === "all" || animal.gender === selectedGender;
    
    return matchesSearch && matchesType && matchesSize && matchesAge && matchesGender;
  });

  const hasActiveFilters = selectedType !== "all" || selectedSize !== "all" || selectedAge !== "all" || selectedGender !== "all" || searchTerm !== "";

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedSize("all");
    setSelectedAge("all");
    setSelectedGender("all");
    setSearchTerm("");
  };

  const getAnimalGradient = (animal) => {
    if (animal.type === "Perro") {
      return animal.gender === "Macho"
        ? "from-blue-400 to-indigo-500"
        : "from-rose-400 to-pink-500";
    } else {
      return animal.gender === "Macho"
        ? "from-amber-400 to-orange-500"
        : "from-violet-400 to-purple-500";
    }
  };

  const getAnimalIcon = (type) => {
    return type === "Perro" ? Dog : Cat;
  };

  // Filter options
  const typeOptions = [
    { value: "all", label: "Todos", icon: Sparkles },
    { value: "Perro", label: "Perros", icon: Dog },
    { value: "Gato", label: "Gatos", icon: Cat },
  ];

  const sizeOptions = [
    { value: "all", label: "Todos", icon: Sparkles },
    { value: "Pequeño", label: "Pequeño", icon: Ruler },
    { value: "Mediano", label: "Mediano", icon: Ruler },
    { value: "Grande", label: "Grande", icon: Ruler },
  ];

  const ageOptions = [
    { value: "all", label: "Todas", icon: Sparkles },
    { value: "meses", label: "Cachorros", icon: Calendar },
    { value: "año", label: "1 año", icon: Calendar },
    { value: "años", label: "Adultos", icon: Calendar },
  ];

  const genderOptions = [
    { value: "all", label: "Todos", icon: Sparkles },
    { value: "Macho", label: "Macho", icon: VenetianMask },
    { value: "Hembra", label: "Hembra", icon: VenetianMask },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500/10 to-amber-500/10 dark:from-rose-900/20 dark:to-amber-900/20 text-rose-600 dark:text-rose-400 rounded-full text-sm font-semibold mb-4 border border-rose-200/50 dark:border-rose-800/30">
            <PawPrint className="w-4 h-4" />
            Adopción
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-dark-text mb-4 font-display leading-tight">
            Explorar{" "}
            <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
              Mascotas
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-dark-text-secondary max-w-2xl">
            Encuentra a tu compañero perfecto entre cientos de animales esperando un hogar
          </p>
        </div>

        {/* Search & Filters (en la parte superior) */}
        <div className="mb-8">
          {/* Buscador + Botón de filtros al lado */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o raza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-28 py-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm dark:text-dark-text dark:placeholder-dark-text-secondary"
              />
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 bg-gray-100 dark:bg-dark-border rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
                  title="Limpiar filtros"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl transition-all whitespace-nowrap shadow-sm ${
                showFilters
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                  : "bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Ver filtros</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Panel de filtros desplegable, acomodado en columnas */}
          {showFilters && (
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 border border-gray-100 dark:border-dark-border overflow-hidden">
              {/* Filters Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-rose-50/50 to-amber-50/50 dark:from-rose-900/5 dark:to-amber-900/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center">
                    <Filter className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
                    Filtros
                  </h3>
                  {hasActiveFilters && (
                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full">
                      Activos
                    </span>
                  )}
                </div>
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-gray-400 dark:text-dark-text-secondary hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpiar todo
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* ─── TYPE ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <PawPrint className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                      Tipo
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typeOptions.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedType(value)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          selectedType === value
                            ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20 scale-105"
                            : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${selectedType === value ? "" : "text-gray-400 dark:text-dark-text-secondary"}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── SIZE ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Ruler className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                      Tamaño
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedSize(value)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          selectedSize === value
                            ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                            : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${selectedSize === value ? "" : "text-gray-400 dark:text-dark-text-secondary"}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── AGE ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                      Edad
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ageOptions.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedAge(value)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          selectedAge === value
                            ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                            : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${selectedAge === value ? "" : "text-gray-400 dark:text-dark-text-secondary"}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── GENDER ─── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <VenetianMask className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text">
                      Género
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {genderOptions.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedGender(value)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          selectedGender === value
                            ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-500/20"
                            : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${selectedGender === value ? "" : "text-gray-400 dark:text-dark-text-secondary"}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results info */}
        {!loading && !error && (
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Mostrando{" "}
              <span className="font-semibold text-gray-900 dark:text-dark-text">
                {filteredAnimals.length}
              </span>{" "}
              {filteredAnimals.length === 1 ? "mascota" : "mascotas"}
              {hasActiveFilters && (
                <span className="text-gray-400 dark:text-dark-text-secondary">
                  {" "}(con filtros aplicados)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
            <p className="text-lg font-medium text-gray-600 dark:text-dark-text-secondary">
              Cargando animales…
            </p>
          </div>
        )}

        {/* Estado de error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-400 dark:text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
              Error al cargar los animales
            </h3>
            <p className="text-gray-500 dark:text-dark-text-secondary mb-6 max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 hover:scale-105 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        )}

        {/* Animals Grid */}
        {!loading && !error && filteredAnimals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAnimals.map((animal) => {
            const AnimalIcon = getAnimalIcon(animal.type);
            const gradient = getAnimalGradient(animal);
            const isFav = isFavorite(animal.id);

            return (
              <div
                key={animal.id}
                className="group bg-white dark:bg-dark-card rounded-2xl shadow-lg dark:shadow-dark-border/20 overflow-hidden hover:shadow-xl dark:hover:shadow-dark-border/40 transition-all duration-300 hover:-translate-y-1.5 border border-gray-100 dark:border-dark-border"
              >
                {/* Animal Image */}
                <Link to={`/animal/${animal.id}`}>
                  <div className="relative h-48 overflow-hidden">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60 dark:opacity-40`} />
                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%)'
                      }} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />

                    {/* Placeholder (icono): visible si no hay imagen o si la imagen falla */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 bg-white/30 dark:bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                        <AnimalIcon className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                    </div>

                    {/* Imagen real de la mascota (Cloudinary) */}
                    {animal.image && (
                      <img
                        src={animal.image}
                        alt={animal.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-full shadow-lg">
                        <AnimalIcon className="w-3 h-3" />
                        {animal.type}
                      </span>
                    </div>

                    {/* Age Badge */}
                    <div className="absolute top-12 left-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm text-gray-700 dark:text-dark-text text-xs font-bold rounded-full shadow-lg">
                        <Calendar className="w-2.5 h-2.5 text-rose-500" />
                        {animal.age}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(animal);
                      }}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                        isFav
                          ? "bg-rose-500 text-white scale-110"
                          : "bg-white/90 dark:bg-dark-card/90 text-gray-400 hover:bg-white dark:hover:bg-dark-card opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? "fill-white" : ""
                        }`}
                      />
                    </button>
                  </div>
                </Link>

                {/* Animal Info */}
                <div className="p-5">
                  {/* Name */}
                  <Link to={`/animal/${animal.id}`}>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-1.5 font-display line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {animal.name}
                    </h3>
                  </Link>

                  {/* Breed */}
                  <p className="text-base text-gray-500 dark:text-dark-text-secondary mb-3 leading-relaxed">
                    {animal.breed}
                  </p>

                  {/* Shelter */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                      {animal.shelter}
                    </span>
                  </div>

                  {/* Size & Gender Tags */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg">
                        <Ruler className="w-2.5 h-2.5" />
                        {animal.size}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg">
                        <VenetianMask className="w-2.5 h-2.5" />
                        {animal.gender}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <Link
                    to={`/animal/${animal.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-200/50 dark:shadow-rose-500/20 active:scale-[0.97] transition-all duration-300"
                  >
                    <PawPrint className="w-4 h-4" />
                    Conocer más
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredAnimals.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center">
              <PawPrint className="w-10 h-10 text-rose-400 dark:text-rose-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
              No se encontraron animales
            </h3>
            <p className="text-gray-500 dark:text-dark-text-secondary mb-6 max-w-md mx-auto">
              Intenta con otros filtros o términos de búsqueda. ¡Tenemos muchas mascotas esperando por ti!
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200/50 dark:shadow-rose-500/20 hover:scale-105 active:scale-95"
            >
              <X className="w-4 h-4" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
      <ScrollToTop />
    </div>
  );
}
