import React, { useState, useRef, useEffect } from "react";
import {
  Building2, MapPin, Phone, Mail, Globe, PawPrint, Heart, Users,
  Calendar, Edit3, Camera, CheckCircle, X, ChevronRight, Dog, Cat,
  Image, Upload, Trash2, ArrowUp, ArrowDown, Clock, AlertCircle,
  ClipboardList, MessageSquare, Settings,
  ChevronLeft, Sparkles, ShieldCheck, Star, Target, Trophy,
  Eye, EyeOff, Loader2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { miPerfil, misEstadisticas, actualizarPerfil } from "../../api/refugios";

const MAX_SHELTER_IMAGES = 6;

export default function ShelterProfile() {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("resumen");
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statsData, setStatsData] = useState(null);

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    location: user?.location || "",
    address: "",
    description: "",
    facebook: "",
    instagram: "",
    founded: "",
    website: "",
    images: [],
  });

  const [editForm, setEditForm] = useState({ ...profile });
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Carga el perfil y las estadisticas reales del refugio autenticado.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [perfil, stats] = await Promise.all([miPerfil(), misEstadisticas()]);
        if (!activo) return;
        const p = {
          name: perfil.nombre || "",
          email: perfil.email || "",
          phone: perfil.telefono || "",
          location: perfil.ubicacion || "",
          address: perfil.direccion || "",
          description: perfil.descripcion || "",
          facebook: perfil.facebook || "",
          instagram: perfil.instagram || "",
          founded: stats?.anio_fundacion ? String(stats.anio_fundacion) : "",
          website: "",
          images: [],
        };
        setProfile(p);
        setEditForm(p);
        setStatsData(stats);
      } catch (e) {
        // se mantiene el perfil vacio si falla la carga
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // ─── Image handlers ───────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const remaining = MAX_SHELTER_IMAGES - (editForm.images?.length || 0);
    const toAdd = files.slice(0, remaining);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newImg = {
          id: Date.now() + Math.random(),
          src: ev.target.result,
          file,
        };
        setEditForm((prev) => ({
          ...prev,
          images: [...(prev.images || []), newImg],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (imgId) => {
    setEditForm((prev) => ({
      ...prev,
      images: (prev.images || []).filter((img) => img.id !== imgId),
    }));
  };

  const moveImage = (index, direction) => {
    const imgs = [...(editForm.images || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= imgs.length) return;
    [imgs[index], imgs[newIndex]] = [imgs[newIndex], imgs[index]];
    setEditForm((prev) => ({ ...prev, images: imgs }));
  };

  // ─── Datos derivados de la API ────────────────────────────────────
  const aniosTrayectoria = profile.founded
    ? new Date().getFullYear() - parseInt(profile.founded)
    : null;

  const stats = [
    {
      icon: PawPrint,
      label: "Rescatados",
      value: String(statsData?.rescatados ?? 0),
      sublabel: `${statsData?.mascotas ?? 0} en el refugio`,
      color: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-500/10",
      progress: 78,
    },
    {
      icon: Heart,
      label: "Adoptados",
      value: String(statsData?.exitosas ?? 0),
      sublabel: `${statsData?.solicitudes ?? 0} solicitudes`,
      color: "text-pink-500",
      bg: "bg-pink-50 dark:bg-pink-500/10",
      progress: 84,
    },
    {
      icon: Users,
      label: "Voluntarios",
      value: String(statsData?.voluntarios ?? 0),
      sublabel: "activos",
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      progress: 60,
    },
    {
      icon: Calendar,
      label: "Trayectoria",
      value: aniosTrayectoria != null ? `${aniosTrayectoria} años` : "—",
      sublabel: profile.founded ? `Desde ${profile.founded}` : "Sin definir",
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      progress: 100,
    },
  ];

  const quickActions = [
    {
      icon: Dog,
      label: "Mis Mascotas",
      desc: `${statsData?.mascotas ?? 0} registradas`,
      path: "/refugio/mascotas",
      gradient: "from-rose-500 to-pink-500",
    },
    {
      icon: ClipboardList,
      label: "Solicitudes",
      desc: `${statsData?.pendientes ?? 0} pendientes`,
      path: "/refugio/solicitudes",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Heart,
      label: "Adopciones",
      desc: `${statsData?.exitosas ?? 0} exitosas`,
      path: "/refugio/historial",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: Settings,
      label: "Configuración",
      desc: "Ajustes del refugio",
      path: "/refugio/configuracion",
      gradient: "from-violet-500 to-purple-500",
    },
  ];

  // La actividad reciente se alimentara de eventos reales; por ahora vacia.
  const recentActivity = [];

  const alerts = [
    {
      icon: AlertCircle,
      title: "Solicitudes pendientes",
      desc: `Tienes ${statsData?.pendientes ?? 0} solicitudes por revisar`,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      action: "Revisar",
      path: "/refugio/solicitudes",
    },
    {
      icon: PawPrint,
      title: "Mascotas registradas",
      desc: `${statsData?.mascotas ?? 0} mascotas en tu refugio`,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      action: "Ver",
      path: "/refugio/mascotas",
    },
    {
      icon: ShieldCheck,
      title: "Completa tu perfil",
      desc: "Agrega fotos e información para destacar",
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-500/10",
      action: "Completar",
      path: "/refugio/configuracion",
    },
  ];

  const tabs = [
    { id: "resumen", label: "Resumen", icon: Sparkles },
    { id: "galeria", label: "Galería", icon: Image },
    { id: "informacion", label: "Información", icon: Building2 },
  ];

  // ─── Save handler ─────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await actualizarPerfil({
        nombre: editForm.name,
        telefono: editForm.phone,
        ubicacion: editForm.location,
        direccion: editForm.address,
        descripcion: editForm.description,
        facebook: editForm.facebook,
        instagram: editForm.instagram,
      });
      setProfile({ ...editForm });
      login({
        ...user,
        name: editForm.name,
        location: editForm.location,
        address: editForm.address,
        description: editForm.description,
      });
      setIsEditing(false);
    } catch (e) {
      // el error se refleja manteniendo el modo edicion
    } finally {
      setSaving(false);
    }
  };

  // ─── Image preview modal ──────────────────────────────────────────
  const ImagePreviewModal = () => {
    if (!selectedImage) return null;
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 gallery-modal-backdrop animate-modal-overlay p-4"
        onClick={() => setSelectedImage(null)}
      >
        <div
          className="relative max-w-4xl w-full max-h-[90vh] animate-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-3 -right-3 w-10 h-10 bg-white dark:bg-dark-card rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-10"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-white" />
          </button>
          <img
            src={selectedImage}
            alt="Vista previa"
            className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* ===== HERO / COVER SECTION ===== */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-rose-400 to-amber-500 dark:from-rose-900 dark:via-rose-800 dark:to-amber-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float-1" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-black/10 rounded-full blur-3xl animate-float-2" />
          <div className="absolute top-40 right-40 w-48 h-48 bg-amber-300/20 rounded-full blur-3xl animate-float-3" />
        </div>

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-12 pb-28 sm:pb-32">
          <div className="max-w-6xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium mb-6 animate-fade-in-down">
              <Building2 className="w-4 h-4" />
              <span>Perfil del Refugio</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 animate-fade-in-up">
              <div className="flex items-end gap-5">
                {/* Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-2xl overflow-hidden transition-all duration-300 group-hover:scale-105">
                    <Building2 className="w-14 h-14 sm:w-16 sm:h-16 text-white/80" />
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-9 h-9 bg-white dark:bg-dark-card rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border-2 border-white dark:border-dark-card"
                    >
                      <Camera className="w-4 h-4 text-rose-500" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                {/* Title */}
                <div className="pb-1">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-display drop-shadow-lg leading-tight">
                    {profile.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-white/80" />
                      <span className="text-sm text-white/90">{profile.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-white/80" />
                      <span className="text-sm text-white/90">Miembro desde {profile.founded}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-300" />
                      <span className="text-sm text-amber-200 font-medium">Refugio Verificado</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    if (!isEditing) setEditForm({ ...profile });
                  }}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg ${
                    isEditing
                      ? "bg-red-500/90 hover:bg-red-600 text-white shadow-red-500/30"
                      : "bg-white/90 hover:bg-white text-gray-700 shadow-white/30 hover:shadow-xl hover:scale-105"
                  }`}
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4" /> Cancelar
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" /> Editar Perfil
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TABS NAVIGATION ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 mb-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-dark-border p-1.5 inline-flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-200/50 dark:shadow-rose-500/20"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-border"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── TAB: RESUMEN ───────────────────────────────────────── */}
        {activeTab === "resumen" && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Alertas */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((alert, i) => {
                const Icon = alert.icon;
                return (
                  <Link
                    key={i}
                    to={alert.path}
                    className="flex items-start gap-4 p-4 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl ${alert.bg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`w-5 h-5 ${alert.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                        {alert.desc}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1">
                      {alert.action}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Stats + Quick Actions Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left: Stats */}
              <div className="lg:col-span-2 space-y-6">
                {/* Estadísticas */}
                <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                      <Target className="w-5 h-5 text-rose-500" />
                      Estadísticas del Refugio
                    </h2>
                    <span className="text-xs text-gray-400 dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-border px-3 py-1 rounded-full">
                      Últimos 30 días
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    {stats.map((stat, index) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={index}
                          className="relative p-4 rounded-2xl bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div
                              className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}
                            >
                              <Icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white font-display">
                              {stat.value}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {stat.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                            {stat.sublabel}
                          </p>
                          {/* Progress bar */}
                          <div className="mt-3 w-full h-1.5 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-500 transition-all duration-1000`}
                              style={{ width: `${stat.progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actividad Reciente */}
                <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Actividad Reciente
                  </h2>
                  <div className="space-y-1">
                    {recentActivity.length === 0 && (
                      <div className="text-center py-10">
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-7 h-7 text-gray-300 dark:text-dark-text-secondary" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                          No hay actividad reciente
                        </p>
                      </div>
                    )}
                    {recentActivity.map((activity, index) => {
                      const Icon = activity.icon;
                      return (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors group"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl ${activity.bg} flex items-center justify-center shrink-0`}
                          >
                            <Icon className={`w-5 h-5 ${activity.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {activity.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                              {activity.desc}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-dark-text-secondary shrink-0 mt-1">
                            {activity.time}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Quick Actions + Info */}
              <div className="space-y-6">
                {/* Acceso Rápido */}
                <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-5 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Acceso Rápido
                  </h2>
                  <div className="space-y-3">
                    {quickActions.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={index}
                          to={item.path}
                          className="group flex items-center gap-4 p-3.5 rounded-xl bg-gray-50 dark:bg-dark-bg/50 hover:bg-gradient-to-r hover:from-rose-50 hover:to-amber-50 dark:hover:from-rose-500/10 dark:hover:to-amber-500/10 transition-all duration-300 border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20"
                        >
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110`}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                              {item.desc}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Miembro desde */}
                <div className="bg-gradient-to-br from-rose-500 to-amber-500 rounded-3xl p-6 shadow-lg text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                  <div className="relative z-10">
                    <Trophy className="w-10 h-10 text-amber-200 mx-auto mb-3" />
                    <p className="text-sm text-rose-100 font-medium">Trayectoria</p>
                    <p className="text-3xl font-bold text-white font-display mt-1">
                      {profile.founded || "—"}
                    </p>
                    <p className="text-xs text-rose-200 mt-2">
                      {aniosTrayectoria != null
                        ? `${aniosTrayectoria} años de compromiso animal`
                        : "Agrega tu año de fundación"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: GALERÍA ────────────────────────────────────────── */}
        {activeTab === "galeria" && (
          <div className="animate-fade-in-up space-y-6">
            <div className="bg-white dark:bg-dark-card rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-dark-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display flex items-center gap-2">
                    <Image className="w-5 h-5 text-rose-500" />
                    Galería del Refugio
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                    {(isEditing ? editForm.images : profile.images)?.length || 0}{" "}
                    de {MAX_SHELTER_IMAGES} imágenes
                  </p>
                </div>
                {isEditing && (
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 shadow-md"
                  >
                    <Upload className="w-4 h-4" />
                    Agregar Fotos
                  </button>
                )}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {isEditing ? (
                <>
                  {/* Edit mode gallery */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {(editForm.images || []).map((img, index) => (
                      <div
                        key={img.id}
                        className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-border border border-gray-200 dark:border-dark-border img-zoom-container"
                      >
                        <img
                          src={img.src}
                          alt={`Refugio ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveImage(index, -1)}
                              className="p-2 bg-white/90 text-gray-700 rounded-full hover:bg-white transition-colors shadow-lg"
                              title="Mover izquierda"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                          )}
                          {index < (editForm.images?.length || 0) - 1 && (
                            <button
                              type="button"
                              onClick={() => moveImage(index, 1)}
                              className="p-2 bg-white/90 text-gray-700 rounded-full hover:bg-white transition-colors shadow-lg"
                              title="Mover derecha"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-black/60 text-white px-2 py-1 rounded-lg backdrop-blur-sm">
                          #{index + 1}
                        </span>
                        {index === 0 && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold bg-gradient-to-r from-rose-500 to-amber-500 text-white px-2 py-1 rounded-lg shadow-lg">
                            Portada
                          </span>
                        )}
                      </div>
                    ))}
                    {(editForm.images?.length || 0) < MAX_SHELTER_IMAGES && (
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-rose-400 dark:hover:border-rose-500 flex flex-col items-center justify-center gap-2 transition-all hover:bg-rose-50/50 dark:hover:bg-rose-500/5 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 group-hover:text-rose-500 transition-colors" />
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          Subir foto
                        </span>
                        <span className="text-[10px] text-gray-300 dark:text-dark-text-secondary">
                          {MAX_SHELTER_IMAGES - (editForm.images?.length || 0)} restantes
                        </span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
                    <InfoIcon className="w-3.5 h-3.5" />
                    La primera imagen se usará como portada del perfil. Arrastra para reordenar.
                  </p>
                </>
              ) : (
                <>
                  {/* View mode gallery */}
                  {(profile.images || []).length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {(profile.images || []).map((img, index) => (
                        <div
                          key={img.id}
                          className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-border border border-gray-200 dark:border-dark-border img-zoom-container cursor-pointer group"
                          onClick={() => setSelectedImage(img.src)}
                        >
                          <img
                            src={img.src}
                            alt={`Refugio ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all transform scale-0 group-hover:scale-100 duration-300" />
                          </div>
                          {index === 0 && (
                            <span className="absolute top-2 right-2 text-[10px] font-bold bg-gradient-to-r from-rose-500 to-amber-500 text-white px-2 py-1 rounded-lg shadow-lg">
                              Portada
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-gray-300 dark:text-dark-text-secondary" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">
                        No hay imágenes del refugio aún
                      </p>
                      <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1">
                        Activa el modo edición para agregar fotos
                      </p>
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setActiveTab("galeria");
                        }}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar Galería
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: INFORMACIÓN ────────────────────────────────────── */}
        {activeTab === "informacion" && (
          <div className="grid lg:grid-cols-3 gap-8 animate-fade-in-up">
            {/* Left: Description + Contact */}
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <div className="bg-white dark:bg-dark-card rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-dark-border">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-rose-500" />
                  Acerca del Refugio
                </h2>
                {isEditing ? (
                  <textarea
                    rows={5}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none"
                    placeholder="Describe la misión y visión de tu refugio..."
                  />
                ) : (
                  <div className="relative">
                    <div className="absolute -left-2 top-0 w-1 h-full bg-gradient-to-b from-rose-500 to-amber-500 rounded-full" />
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed pl-4">
                      {profile.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="bg-white dark:bg-dark-card rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-dark-border">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display mb-6 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-rose-500" />
                  Información de Contacto
                </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {[
                    {
                      icon: Mail,
                      label: "Email",
                      value: "email",
                      type: "email",
                      bg: "bg-rose-50 dark:bg-rose-500/10",
                      color: "text-rose-600 dark:text-rose-400",
                    },
                    {
                      icon: Phone,
                      label: "Teléfono",
                      value: "phone",
                      type: "text",
                      bg: "bg-blue-50 dark:bg-blue-500/10",
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      icon: MapPin,
                      label: "Dirección",
                      value: "address",
                      type: "text",
                      bg: "bg-amber-50 dark:bg-amber-500/10",
                      color: "text-amber-600 dark:text-amber-400",
                    },
                    {
                      icon: Globe,
                      label: "Sitio Web",
                      value: "website",
                      type: "text",
                      bg: "bg-emerald-50 dark:bg-emerald-500/10",
                      color: "text-emerald-600 dark:text-emerald-400",
                    },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-dark-bg/50"
                      >
                        <div
                          className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}
                        >
                          <Icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                            {item.label}
                          </p>
                          {isEditing ? (
                            <input
                              type={item.type}
                              value={editForm[item.value]}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  [item.value]: e.target.value,
                                })
                              }
                              className="w-full mt-0.5 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {profile[item.value]}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Social + Quick info */}
            <div className="space-y-6">
              {/* Redes Sociales */}
              <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-5 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  Redes Sociales
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      icon: Globe,
                      label: "Facebook",
                      value: "facebook",
                      bg: "bg-blue-50 dark:bg-blue-500/10",
                      color: "text-blue-600 dark:text-blue-400",
                      prefix: "/",
                    },
                    {
                      icon: Camera,
                      label: "Instagram",
                      value: "instagram",
                      bg: "bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-500/10 dark:to-purple-500/10",
                      color: "text-pink-600 dark:text-pink-400",
                      prefix: "",
                    },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-dark-bg/50"
                      >
                        <div
                          className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}
                        >
                          <Icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                            {item.label}
                          </p>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm[item.value]}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  [item.value]: e.target.value,
                                })
                              }
                              className="w-full mt-0.5 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.prefix}
                              {profile[item.value]}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen rápido */}
              <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-dark-border">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  Detalles
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                        Fundado
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {profile.founded}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                        Ubicación
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {profile.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                      <Star className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                        Estado
                      </p>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Refugio Verificado
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── SAVE BUTTON (visible when editing on any tab) ──────── */}
        {isEditing && (
          <div className="mt-8 flex justify-center animate-fade-in-up">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-10 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-2xl shadow-xl shadow-rose-200/50 dark:shadow-rose-500/20 hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <CheckCircle className="w-6 h-6" />
              )}
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        )}
      </div>

      {/* Image preview modal */}
      <ImagePreviewModal />
    </div>
  );
}

// Helper component for info icon
function InfoIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
