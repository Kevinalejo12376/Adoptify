import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PawPrint, Search, Heart, MapPin, CheckCircle, Filter, ChevronDown, X, Loader2 } from "lucide-react";
import { obtenerRefugio } from "../../api/refugios";
import { listarMascotas } from "../../api/mascotas";

export default function ShelterAnimals() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedAge, setSelectedAge] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [isVisible, setIsVisible] = useState(false);

  const [shelter, setShelter] = useState(null);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    let activo = true;
    (async () => {
      setLoading(true);
      try {
        const [r, todas] = await Promise.all([
          obtenerRefugio(id).catch(() => null),
          listarMascotas().catch(() => []),
        ]);
        if (!activo) return;
        setShelter(r);
        const mias = (todas || [])
          .filter((m) => m.refugio_id === Number(id) || (r && m.refugio_id === r.id))
          .map((m) => ({
            id: m.id,
            name: m.nombre,
            type: m.tipo || "",
            breed: m.raza || "",
            age: m.edad || "",
            size: m.tamano || "",
            gender: m.genero || "",
          }));
        setPets(mias);
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [id]);

  const filteredPets = pets.filter((pet) => {
    const matchesSearch = pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pet.breed || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || pet.type === selectedType;
    const matchesSize = selectedSize === "all" || pet.size === selectedSize;
    const matchesAge = selectedAge === "all" || (pet.age || "").includes(selectedAge);
    const matchesGender = selectedGender === "all" || pet.gender === selectedGender;
    return matchesSearch && matchesType && matchesSize && matchesAge && matchesGender;
  });

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedSize("all");
    setSelectedAge("all");
    setSelectedGender("all");
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando mascotas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-40 h-40 bg-rose-200/20 rounded-full blur-3xl animate-float-1" />
        <div className="absolute top-40 right-32 w-48 h-48 bg-amber-200/20 rounded-full blur-3xl animate-float-2" />
        <div className="absolute bottom-32 left-40 w-44 h-44 bg-rose-300/15 rounded-full blur-3xl animate-float-3" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 px-4 py-2 mb-6 text-gray-600 hover:text-rose-500 transition-all duration-300 hover:scale-105 ${
            isVisible ? "animate-fade-in-left" : "opacity-0"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al refugio
        </button>

        {/* Header */}
        <div className={`bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 hover-lift ${
          isVisible ? "animate-fade-in-down" : "opacity-0"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <PawPrint className="w-8 h-8 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">{shelter?.nombre || "Refugio"}</h1>
                  {shelter?.verificado && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {shelter?.ubicacion && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      {shelter.ubicacion}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">
                    {pets.length} {pets.length === 1 ? "mascota" : "mascotas"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className={`mb-6 ${
          isVisible ? "animate-fade-in-up animation-delay-100" : "opacity-0"
        }`}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o raza..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
            >
              <Filter className="w-4 h-4" />
              Filtros
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className={`mb-6 bg-white rounded-2xl shadow-lg p-6 ${
            isVisible ? "animate-fade-in-up animation-delay-150" : "opacity-0"
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">Todos</option>
                  <option value="Perro">Perros</option>
                  <option value="Gato">Gatos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tamaño</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">Todos</option>
                  <option value="Pequeño">Pequeño</option>
                  <option value="Mediano">Mediano</option>
                  <option value="Grande">Grande</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Edad</label>
                <select
                  value={selectedAge}
                  onChange={(e) => setSelectedAge(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">Todas</option>
                  <option value="meses">Cachorros (meses)</option>
                  <option value="año">1 año</option>
                  <option value="años">Adultos (años)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Género</label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">Todos</option>
                  <option value="Macho">Macho</option>
                  <option value="Hembra">Hembra</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className={`mb-6 flex justify-between items-center ${
          isVisible ? "animate-fade-in-up animation-delay-200" : "opacity-0"
        }`}>
          <p className="text-gray-600">
            Mostrando <span className="font-semibold text-gray-900">{filteredPets.length}</span> mascotas
          </p>
        </div>

        {/* Pets Grid */}
        <div className={`${
          isVisible ? "animate-slide-up-fade animation-delay-300" : "opacity-0"
        }`}>
          {filteredPets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredPets.map((pet, index) => (
                <div
                  key={pet.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group"
                  style={{ animationDelay: `${200 + index * 80}ms` }}
                >
                  <div className="relative">
                    <div className="w-full h-48 bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center overflow-hidden img-zoom-container">
                      <div className="zoom-content w-full h-full flex items-center justify-center">
                        <PawPrint className="w-20 h-20 text-rose-400 group-hover:text-rose-500 transition-colors duration-300" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      {pet.age && (
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                          {pet.age}
                        </span>
                      )}
                      {pet.type && (
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                          {pet.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-1 font-display">{pet.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{pet.breed || "Sin raza"}</p>
                    <div className="flex gap-2 mb-4">
                      {pet.size && <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs">{pet.size}</span>}
                      {pet.gender && <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs">{pet.gender}</span>}
                    </div>
                    <Link
                      to={`/animal/${pet.id}`}
                      className="block w-full px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-lg hover:from-rose-600 hover:to-amber-600 transition-all duration-300 text-center hover:shadow-md active:scale-95"
                    >
                      Ver perfil
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <PawPrint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {pets.length === 0 ? "Este refugio aún no tiene mascotas publicadas" : "No se encontraron mascotas"}
              </h3>
              <p className="text-gray-500 mb-4">
                {pets.length === 0 ? "Vuelve más tarde para ver nuevas mascotas" : "Intenta con otros filtros o términos de búsqueda"}
              </p>
              {pets.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
