import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  PawPrint, CheckCircle, XCircle, AlertCircle, MapPin, Calendar,
  Phone, MessageCircle, Search, Clock, ChevronRight, Dog, Cat,
  Heart, ClipboardList, UserCheck, FileText, Home, Loader2, FileDown,
} from "lucide-react";
import { misSolicitudes } from "../../api/solicitudes";
import ReporteGeneralModal from "../../components/ReporteGeneralModal";

// Mapea codigos del backend al status que usa la UI
const ESTADO_DISPLAY = {
  pendiente:   "pending",
  en_revision: "pending",
  contactado:  "pending",
  finalizada:  "approved",
  cerrada:     "rejected",
};

const STATUS_CONFIG = {
  approved: {
    icon: CheckCircle,
    color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200",
    label: "Aprobada", gradient: "from-emerald-400 to-emerald-500", progressColor: "bg-emerald-500",
  },
  pending: {
    icon: AlertCircle,
    color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200",
    label: "En revision", gradient: "from-amber-400 to-amber-500", progressColor: "bg-amber-500",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600", bg: "bg-red-50", border: "border-red-200",
    label: "Rechazada", gradient: "from-red-400 to-red-500", progressColor: "bg-red-500",
  },
};

const FILTER_TABS = [
  { key: "all",      label: "Todas",       icon: ClipboardList },
  { key: "approved", label: "Aprobadas",   icon: CheckCircle },
  { key: "pending",  label: "En revision", icon: AlertCircle },
  { key: "rejected", label: "Rechazadas",  icon: XCircle },
];

const PROCESS_STEPS = [
  { icon: FileText,    label: "Solicitud enviada",    key: 0 },
  { icon: UserCheck,   label: "Revision de datos",    key: 1 },
  { icon: MessageCircle, label: "Entrevista",         key: 2 },
  { icon: Home,        label: "Visita domiciliaria",  key: 3 },
  { icon: Heart,       label: "Adopcion completada",  key: 4 },
];

export default function AdoptionHistory() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAdoption, setSelectedAdoption] = useState(null);
  const [adoptions, setAdoptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReporteModal, setShowReporteModal] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await misSolicitudes();
      setAdoptions(data.map((s) => ({
        id: s.id,
        name: s.mascota_nombre || "Mascota",
        breed: "",
        type: s.mascota_tipo?.toLowerCase() === "gato" ? "cat" : "dog",
        age: "",
        shelter: "",
        location: s.ubicacion || "",
        status: ESTADO_DISPLAY[s.estado] || "pending",
        date: s.creada_en ? new Date(s.creada_en).toLocaleDateString("es-CO") : "",
        phone: "",
        notes: s.mensaje || s.notas || "",
        followUpDate: null,
        progress: s.progreso || 0,
      })));
    } catch (e) {
      setError(e?.message || "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filteredAdoptions = adoptions.filter((ad) => {
    const matchFilter = activeFilter === "all" || ad.status === activeFilter;
    const matchSearch = !searchTerm ||
      ad.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.shelter.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
        <p>Cargando historial de adopciones...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">
              Mis Solicitudes de Adopcion
            </h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
              Seguimiento de todas tus solicitudes
            </p>
          </div>
          {/* Boton Reporte General: abre el modal de descarga PDF/Excel */}
          <button
            onClick={() => setShowReporteModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-md whitespace-nowrap flex-shrink-0"
          >
            <FileDown className="w-4 h-4" />
            Reporte General
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
        )}

        {/* Filtros y busqueda */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por mascota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeFilter === tab.key
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md"
                      : "bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de solicitudes */}
        {filteredAdoptions.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border">
            <PawPrint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {adoptions.length === 0 ? "Sin solicitudes" : "Sin resultados"}
            </h3>
            <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
              {adoptions.length === 0
                ? "Aun no has enviado ninguna solicitud de adopcion"
                : "Prueba con otros filtros o terminos de busqueda"}
            </p>
            {adoptions.length === 0 && (
              <Link
                to="/animals"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all"
              >
                <PawPrint className="w-5 h-5" /> Ver mascotas disponibles
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAdoptions.map((ad) => {
              const cfg = STATUS_CONFIG[ad.status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              const AnimalIcon = ad.type === "cat" ? Cat : Dog;
              return (
                <div
                  key={ad.id}
                  className={`bg-white dark:bg-dark-card rounded-2xl border ${cfg.border} dark:border-dark-border shadow-sm hover:shadow-md transition-all`}
                >
                  <div className="p-5 flex items-center gap-4">
                    {/* Icono animal */}
                    <div className={`w-14 h-14 rounded-2xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <AnimalIcon className={`w-7 h-7 ${cfg.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{ad.name}</h3>
                          {ad.shelter && (
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{ad.shelter}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                          <StatusIcon className="w-3.5 h-3.5" />{cfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
                        {ad.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />{ad.date}
                          </span>
                        )}
                        {ad.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />{ad.location}
                          </span>
                        )}
                      </div>

                      {/* Barra de progreso para las pendientes */}
                      {ad.status === "pending" && ad.progress > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progreso</span><span>{ad.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${cfg.gradient} rounded-full`}
                              style={{ width: `${ad.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <ChevronRight
                      className="w-5 h-5 text-gray-300 flex-shrink-0 cursor-pointer hover:text-rose-500 transition-colors"
                      onClick={() => setSelectedAdoption(selectedAdoption?.id === ad.id ? null : ad)}
                    />
                  </div>

                  {/* Detalle expandible */}
                  {selectedAdoption?.id === ad.id && (
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-dark-border pt-4 space-y-3">
                      {ad.notes && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase mb-1">
                            Notas
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{ad.notes}</p>
                        </div>
                      )}

                      {/* Pasos del proceso */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase mb-3">
                          Proceso de Adopcion
                        </p>
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {PROCESS_STEPS.map((step, idx) => {
                            const done = ad.status === "approved" || (ad.status === "pending" && idx < 2);
                            const StepIcon = step.icon;
                            return (
                              <React.Fragment key={step.key}>
                                <div className={`flex flex-col items-center gap-1 min-w-[56px] ${done ? cfg.color : "text-gray-300"}`}>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? cfg.bg : "bg-gray-100 dark:bg-dark-border"}`}>
                                    <StepIcon className="w-4 h-4" />
                                  </div>
                                  <span className="text-[9px] text-center leading-tight">{step.label}</span>
                                </div>
                                {idx < PROCESS_STEPS.length - 1 && (
                                  <div className={`flex-1 h-0.5 min-w-[12px] ${done ? `bg-gradient-to-r ${cfg.gradient}` : "bg-gray-100 dark:bg-dark-border"}`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Reporte General (PDF/Excel) */}
      <ReporteGeneralModal
        isOpen={showReporteModal}
        onClose={() => setShowReporteModal(false)}
      />
    </div>
  );
}
