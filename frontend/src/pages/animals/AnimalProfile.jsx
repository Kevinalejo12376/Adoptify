import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, PawPrint, MapPin, Calendar, Phone, MessageCircle, Share2, ArrowLeft, Star, CheckCircle, XCircle, AlertCircle, FileText, Send, X, Home, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { obtenerMascota } from "../../api/mascotas";
import { crearSolicitud } from "../../api/solicitudes";

export default function AnimalProfile() {
  const { id } = useParams();
  const { addFavorite, removeFavorite, isFavorite, user } = useAuth();
  const [showAdoptionModal, setShowAdoptionModal] = useState(false);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [compatibilityScore, setCompatibilityScore] = useState(null);
  const [adoptionStatus, setAdoptionStatus] = useState(null);
  const [adoptionError, setAdoptionError] = useState(null);

  // Datos reales desde la BD
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formulario de solicitud
  const [form, setForm] = useState({ nombre: "", telefono: "", mensaje: "" });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const m = await obtenerMascota(id);
        if (!activo) return;
        setAnimal({
          id: m.id,
          name: m.nombre,
          type: m.tipo || "Perro",
          breed: m.raza || "Sin raza",
          age: m.edad || "—",
          size: m.tamano || "—",
          gender: m.genero || "—",
          weight: m.peso || "—",
          color: m.color || "—",
          shelter: m.refugio_nombre || "Refugio",
          shelterPhone: m.refugio_telefono || "",
          shelterLocation: m.refugio_ubicacion || m.refugio_direccion || "",
          description: m.descripcion || "",
          personality: m.personalidad ? m.personalidad.split(",").map((p) => p.trim()) : [],
          health: [m.vacunado && "Vacunado", m.esterilizado && "Esterilizado", m.desparasitado && "Desparasitado"].filter(Boolean).join(", ") || "Sin información de salud",
          requirements: m.requisitos || "",
        });
      } catch (e) {
        if (activo) setError(e?.message || "No se encontró la mascota");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [id]);

  const handleFavorite = () => {
    if (!animal) return;
    if (isFavorite(animal.id)) {
      removeFavorite(animal.id);
    } else {
      addFavorite(animal);
    }
  };

  const submitAdoptionRequest = async () => {
    if (!animal) return;
    setEnviando(true); setAdoptionError(null);
    try {
      await crearSolicitud({
        mascota_id: animal.id,
        nombre_contacto: form.nombre || (user?.nombre || user?.name || ""),
        email_contacto: user?.email || "",
        telefono_contacto: form.telefono,
        mensaje: form.mensaje,
      });
      setAdoptionStatus("pending");
      setShowAdoptionModal(false);
    } catch (e) {
      setAdoptionError(e?.message || "No se pudo enviar la solicitud");
    } finally {
      setEnviando(false);
    }
  };

  const cancelAdoptionRequest = () => {
    setAdoptionStatus(null);
  };

  const startCompatibilityTest = () => {
    setShowCompatibilityModal(true);
  };

  const calculateCompatibility = (answers) => {
    // Simular cálculo de compatibilidad
    const score = Math.floor(Math.random() * 30) + 70; // 70-100%
    setCompatibilityScore(score);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link to="/animals" className="inline-flex items-center gap-2 text-gray-600 hover:text-rose-600 mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Volver a animales
        </Link>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
            <p>Cargando información de la mascota...</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-12 text-center">
            <PawPrint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{error}</p>
          </div>
        )}

        {!loading && !error && animal && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative">
                <div className="w-full h-96 bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center">
                  <PawPrint className="w-32 h-32 text-rose-400" />
                </div>
                <button
                  onClick={handleFavorite}
                  className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                >
                  <Heart 
                    className={`w-6 h-6 ${isFavorite(animal.id) ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}`} 
                  />
                </button>
                <button className="absolute top-4 left-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all">
                  <Share2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2 font-display">{animal.name}</h1>
                  <p className="text-lg text-gray-600">{animal.breed}</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
                    {animal.type}
                  </span>
                  <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                    {animal.age}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Tamaño</p>
                  <p className="font-semibold text-gray-900">{animal.size}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Género</p>
                  <p className="font-semibold text-gray-900">{animal.gender}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <PawPrint className="w-5 h-5 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Peso</p>
                  <p className="font-semibold text-gray-900">{animal.weight}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <Star className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Color</p>
                  <p className="font-semibold text-gray-900">{animal.color}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h3>
                <p className="text-gray-600 leading-relaxed">{animal.description}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Personalidad</h3>
                <div className="flex flex-wrap gap-2">
                  {animal.personality.map((trait, index) => (
                    <span key={index} className="px-4 py-2 bg-gradient-to-r from-rose-100 to-amber-100 text-gray-700 rounded-full text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Salud</h3>
                <p className="text-gray-600">{animal.health}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Requisitos</h3>
                <p className="text-gray-600">{animal.requirements}</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shelter Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Refugio</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{animal.shelter}</p>
                    <p className="text-sm text-gray-600">{animal.shelterLocation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{animal.shelterPhone}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <a
                  href={`https://wa.me/${animal.shelterPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
                <Link
                  to={`/shelter/${animal.shelterId}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
                >
                  <Home className="w-4 h-4" />
                  Ver refugio
                </Link>
              </div>
            </div>

            {/* Adoption Status */}
            {adoptionStatus && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Adopción</h3>
                <div className={`flex items-center gap-3 p-4 rounded-xl ${
                  adoptionStatus === 'pending' ? 'bg-amber-50' :
                  adoptionStatus === 'approved' ? 'bg-green-50' :
                  'bg-red-50'
                }`}>
                  {adoptionStatus === 'pending' && <AlertCircle className="w-6 h-6 text-amber-500" />}
                  {adoptionStatus === 'approved' && <CheckCircle className="w-6 h-6 text-green-500" />}
                  {adoptionStatus === 'rejected' && <XCircle className="w-6 h-6 text-red-500" />}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {adoptionStatus === 'pending' && 'Solicitud Enviada'}
                      {adoptionStatus === 'approved' && 'Solicitud Aprobada'}
                      {adoptionStatus === 'rejected' && 'Solicitud Rechazada'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {adoptionStatus === 'pending' && 'El refugio revisará tu solicitud'}
                      {adoptionStatus === 'approved' && '¡Felicidades! Contacta al refugio'}
                      {adoptionStatus === 'rejected' && 'Puedes intentar con otra mascota'}
                    </p>
                  </div>
                </div>
                {adoptionStatus === 'pending' && (
                  <button
                    onClick={cancelAdoptionRequest}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-600 font-semibold rounded-xl hover:bg-red-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Cancelar Solicitud
                  </button>
                )}
              </div>
            )}

            {/* Compatibility Test */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Test de Compatibilidad</h3>
              {compatibilityScore ? (
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{compatibilityScore}%</span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {compatibilityScore >= 80 && '¡Excelente compatibilidad! Son perfectos el uno para el otro.'}
                    {compatibilityScore >= 60 && compatibilityScore < 80 && 'Buena compatibilidad. Podrían ser grandes compañeros.'}
                    {compatibilityScore < 60 && 'Compatibilidad moderada. Considera si puedes cumplir sus necesidades.'}
                  </p>
                  <button
                    onClick={() => setCompatibilityScore(null)}
                    className="text-sm text-rose-600 hover:text-rose-700"
                  >
                    Volver a realizar test
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Descubre qué tan compatible eres con {animal.name} respondiendo algunas preguntas sobre tu estilo de vida.
                  </p>
                  <button
                    onClick={startCompatibilityTest}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Iniciar Test
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!adoptionStatus && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <button
                  onClick={() => setShowAdoptionModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg"
                >
                  <Heart className="w-5 h-5" />
                  Solicitar Adopción
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">
                  Al solicitar, el refugio recibirá una notificación para contactarte
                </p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Adoption Modal */}
      {showAdoptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 font-display">Solicitar Adopción</h3>
              <button onClick={() => setShowAdoptionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            {adoptionError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-sm">{adoptionError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo *</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Tu nombre" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="+57 300 123 4567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje al refugio</label>
                <textarea rows="3" value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  placeholder={`Cuéntanos por qué quieres adoptar a ${animal?.name}...`} />
              </div>
              <button onClick={submitAdoptionRequest} disabled={enviando || !form.nombre.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all disabled:opacity-60">
                <Send className="w-4 h-4" />
                {enviando ? "Enviando..." : "Enviar Solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compatibility Modal */}
      {showCompatibilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 font-display">Test de Compatibilidad</h3>
              <button
                onClick={() => setShowCompatibilityModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Responde estas preguntas para calcular tu compatibilidad con {animal.name}.
              </p>
              {[
                "¿Tienes experiencia con perros?",
                "¿Cuánto tiempo puedes dedicar diariamente?",
                "¿Vives en casa o apartamento?",
                "¿Tienes otros animales?",
                "¿Cuál es tu nivel de actividad?"
              ].map((question, index) => (
                <div key={index}>
                  <p className="text-sm font-medium text-gray-700 mb-2">{question}</p>
                  <div className="flex gap-2">
                    {['Sí', 'A veces', 'No'].map((option) => (
                      <button
                        key={option}
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:border-rose-300 hover:text-rose-600 transition-all"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  calculateCompatibility();
                  setShowCompatibilityModal(false);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
              >
                <Star className="w-4 h-4" />
                Calcular Compatibilidad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
