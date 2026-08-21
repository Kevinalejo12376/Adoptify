import React, { useState, useEffect, useCallback } from "react";
import { ClipboardList, Calendar, Clock, User, Dog, Cat, Heart, Search, Filter, CheckCircle, XCircle, AlertCircle, FileDown, ArrowUp, ChevronDown, MapPin, Loader2 } from "lucide-react";
import { solicitudesRecibidas, descargarReporteHistorialRefugio } from "../../api/solicitudes";
import ReporteGeneralModal from "../../components/ReporteGeneralModal";

export default function ShelterAdoptionHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [timeFilter, setTimeFilter] = useState("todos");
  const [adoptions, setAdoptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reporteAbierto, setReporteAbierto] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await solicitudesRecibidas();
      // Historial: solo finalizadas o cerradas
      const historial = data.filter((s) => ["finalizada", "cerrada"].includes(s.estado));
      setAdoptions(historial.map((s) => ({
        id: s.id,
        user: s.nombre_contacto,
        pet: s.mascota_nombre || `Mascota #${s.mascota_id}`,
        petType: s.mascota_tipo || "Perro",
        status: s.estado,
        date: s.creada_en ? new Date(s.creada_en).toLocaleDateString("es-CO") : "",
        time: s.creada_en ? new Date(s.creada_en).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "",
        location: s.ubicacion || "",
        notes: s.notas || s.mensaje || "",
        completedDate: "",
      })));
    } catch (e) {
      setError(e?.message || "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);



  const getStatusBadge = (status) => {
    const config = {
      "finalizada": { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400", icon: Heart },
      "cerrada": { color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400", icon: XCircle },
    };
    const c = config[status] || config["finalizada"];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredAdoptions = adoptions.filter(ad => {
    const matchesSearch = ad.user.toLowerCase().includes(searchTerm.toLowerCase()) || ad.pet.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todas" || ad.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const finalizadas = adoptions.filter(a => a.status === "finalizada").length;
  const cerradas = adoptions.filter(a => a.status === "cerrada").length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
      <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
      <p>Cargando historial...</p>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16">
      {error && <div className="mx-auto max-w-7xl px-4 mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 rounded-full text-sm font-medium mb-3">
              <Heart className="w-4 h-4" />
              <span>Historial de Solicitudes</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-display">Historial</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Todas las solicitudes de adopción procesadas</p>
          </div>
          <button
            onClick={() => setReporteAbierto(true)}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border transition-all"
          >
            <FileDown className="w-4 h-4 mr-2 text-rose-500" />
            Reporte general
            <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-2xl p-5 text-center border border-emerald-100 dark:border-emerald-500/20">
            <Heart className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-display">{finalizadas}</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Finalizadas</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-500/10 dark:to-slate-500/10 rounded-2xl p-5 text-center border border-gray-100 dark:border-gray-500/20">
            <XCircle className="w-6 h-6 text-gray-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 font-display">{cerradas}</p>
            <p className="text-xs text-gray-500/70 dark:text-gray-400/70">Cerradas</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-2xl p-5 text-center border border-amber-100 dark:border-amber-500/20">
            <ClipboardList className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-display">{adoptions.length}</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Total</p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white">
              <option value="todas">Todos los estados</option>
              <option value="finalizada">Finalizadas</option>
              <option value="cerrada">Cerradas</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-bg">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Solicitante</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Mascota</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Fecha Solicitud</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Fecha Cierre</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filteredAdoptions.map((ad) => (
                  <tr key={ad.id} className="hover:bg-gray-50 dark:hover:bg-[#20202c] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                          {ad.user.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{ad.user}</p>
                          <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{ad.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {ad.petType === "Perro" ? <Dog className="w-4 h-4 text-emerald-500" /> : <Cat className="w-4 h-4 text-teal-500" />}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{ad.pet}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(ad.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-secondary">
                        <Calendar className="w-3.5 h-3.5" />
                        {ad.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-secondary">
                        <Calendar className="w-3.5 h-3.5" />
                        {ad.completedDate}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{ad.notes}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAdoptions.length === 0 && (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-gray-300 dark:text-dark-text-secondary mx-auto mb-3" />
              <p className="text-gray-500 dark:text-dark-text-secondary">No se encontraron registros</p>
            </div>
          )}
        </div>
      </section>

      {/* Reporte general: descarga PDF/Excel de las solicitudes del refugio */}
      <ReporteGeneralModal
        isOpen={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        descargar={descargarReporteHistorialRefugio}
      />
    </div>
  );
}