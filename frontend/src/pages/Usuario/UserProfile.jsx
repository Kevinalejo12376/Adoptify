import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import BackButton from "../../components/BackButton";
import {
  User, Mail, Phone, MapPin, Calendar, Edit, Camera, Save, X,
  PawPrint, Heart, Settings, LogOut, Shield, ChevronRight,
  MessageCircle, Clock, TrendingUp,
  Dog, Cat, CheckCircle, AlertCircle,
  Image, Globe, Plus, Trash2,
  ArrowUp, Quote, Sparkles, Loader2, Navigation
} from "lucide-react";
import { misSolicitudes } from "../../api/solicitudes";
import { idsMascotasFavoritas } from "../../api/favoritos";
import { updateProfile, cambiarAvatar, eliminarAvatar } from "../../api/auth";
import FieldError from "../../components/FieldError";
import {
  validarNombre, validarEmail, validarTelefono, normalizarEmail, limpiarEspacios, claseInput,
} from "../../utils/validaciones";
import { useImageUpload } from "../../hooks/useImageUpload";
import { readAndValidateImage } from "../../utils/imageUtils";
import { obtenerUbicacionDetallada } from "../../utils/ubicacion";
import { getDepartamentos, getMunicipios } from "../../api/catalogos";
import ImageEditorModal from "../../components/ImageEditorModal";

// Perfil base (se completa con los datos reales del usuario autenticado).
const EMPTY_USER = {
  name: "",
  email: "",
  phone: "",
  location: "",
  departamento: "",
  municipio: "",
  direccion: "",
  bio: "",
  joinDate: "",
  avatar: null,
  cover: null,
  website: "",
  social: { twitter: "", instagram: "" },
};


// ─── Animated Counter ───
function AnimatedCounter({ end, duration = 2000, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
    </span>
  );
}

// ─── Section Divider ───
function SectionDivider({ icon: Icon, label, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white font-display">{label}</h3>
      </div>
      {action && (
        <button className="text-sm font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors flex items-center gap-1">
          {action} <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Pet Card ───
function PetCard({ pet, index }) {
  const PetIcon = pet.type === "dog" ? Dog : Cat;
  return (
    <div
      className="group bg-white dark:bg-dark-card rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-100 dark:border-dark-border hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-500 overflow-hidden animate-fadeIn"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-200 to-amber-200 dark:from-rose-900/40 dark:to-amber-900/40 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <PetIcon className="w-8 h-8 text-rose-500 dark:text-rose-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-gray-900 dark:text-white text-lg">{pet.name}</h4>
              <span className="text-xs text-gray-400 dark:text-gray-500">• {pet.age}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{pet.breed}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Adoptado: {pet.adopted}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors duration-300 group-hover:translate-x-1 transform transition-transform" />
        </div>
      </div>
    </div>
  );
}

// ─── Avatar Modal (seleccionar/editar y enviar al backend para subir/eliminar) ───
// La subida a Cloudinary y el borrado de la imagen anterior los realiza el
// backend (POST/DELETE /api/auth/avatar). Este modal solo prepara la imagen
// (recorte/rotación) y delega en `onAvatarChange` la operación persistente.
function AvatarModal({ isOpen, onClose, currentAvatar, onAvatarChange, busy = false }) {
  const fileInputRef = useRef(null);
  const [editingSrc, setEditingSrc] = useState(null);
  const [localError, setLocalError] = useState("");

  if (!isOpen) return null;

  // Selecciona el archivo, valida y abre el editor interactivo.
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || editingSrc || busy) return;
    const res = await readAndValidateImage(file);
    if (res.ok) {
      setLocalError("");
      setEditingSrc(res.base64);
    } else {
      setLocalError(res.error || "No se pudo leer la imagen.");
    }
  };

  // La imagen ya editada se envía al padre, que la sube con el backend.
  const handleEditorApply = async (dataUrl) => {
    setEditingSrc(null);
    await onAvatarChange?.(dataUrl);
    onClose();
  };

  // Quitar la foto: el padre llama al endpoint DELETE y limpia Cloudinary + BD.
  const handleQuitar = async () => {
    await onAvatarChange?.(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay" />
        <div className="relative bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full p-6 animate-modal-content" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-xl flex items-center justify-center">
                <Image className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white font-display">Cambiar Foto</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative group">
                <div className="w-36 h-36 bg-gradient-to-br from-rose-200 to-amber-200 dark:from-rose-900/40 dark:to-amber-900/40 rounded-full flex items-center justify-center border-4 border-white dark:border-dark-card shadow-xl overflow-hidden">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-rose-400 dark:text-rose-500" />
                  )}
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={handleFile}
              disabled={busy}
            />

            <div
              onClick={() => !busy && !editingSrc && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-gray-200 dark:border-dark-border rounded-2xl p-8 text-center transition-all duration-300 group cursor-pointer bg-gray-50/50 dark:bg-dark-bg/50 ${
                busy ? "opacity-60 cursor-not-allowed" : "hover:border-rose-300 dark:hover:border-rose-700"
              }`}
            >
              {busy ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-white">
                    Guardando foto...
                  </p>
                  <div className="w-full max-w-xs h-2 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
                    <div className="h-full w-2/3 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full animate-pulse" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 mx-auto mb-4 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-7 h-7 text-rose-500 dark:text-rose-400" />
                  </div>
                  <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    Subir nueva foto
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    JPG, PNG, WEBP, GIF o AVIF · máx. 10 MB
                  </p>
                  <p className="text-xs text-rose-500/80 font-medium mb-4">
                    ✂️ Podrás recortar, rotar y voltear antes de subir
                  </p>
                  <span className="inline-block px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 hover:shadow-lg">
                    Seleccionar imagen
                  </span>
                </>
              )}
            </div>

            {localError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
                <p className="text-xs text-red-700 dark:text-red-300 flex-1">{localError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {currentAvatar && (
                <button
                  onClick={handleQuitar}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-200 dark:border-red-500/30 disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  {busy ? "Eliminando foto..." : "Quitar foto"}
                </button>
              )}
              <button onClick={onClose} disabled={busy} className="w-full px-6 py-3 bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-dark-border disabled:opacity-60">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor interactivo de la foto de perfil */}
      <ImageEditorModal
        isOpen={!!editingSrc}
        imageSrc={editingSrc}
        aspectRatio={1}
        onApply={handleEditorApply}
        onCancel={() => setEditingSrc(null)}
      />
    </>
  );
}

// ─── Edit Profile Modal ───
function EditProfileModal({ isOpen, user, editedUser, setEditedUser, onSave, onCancel }) {
  const [errors, setErrors] = useState({});
  // Estado de la geolocalización ("Usar mi ubicación actual").
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [geoOk, setGeoOk] = useState(false);
  // Catálogos de ubicación (departamentos y municipios desde la BD).
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [departamentoId, setDepartamentoId] = useState(null);
  const [municipiosCargando, setMunicipiosCargando] = useState(false);
  const [municipioExtra, setMunicipioExtra] = useState("");

  // Carga los departamentos (catálogo) al abrir el modal.
  useEffect(() => {
    let activo = true;
    setDepartamentos([]);
    setMunicipios([]);
    setDepartamentoId(null);
    setMunicipioExtra("");
    getDepartamentos()
      .then((data) => {
        if (!activo) return;
        const lista = data || [];
        setDepartamentos(lista);
        const depto = lista.find((d) => d.nombre === (editedUser?.departamento || ""));
        if (depto) {
          setDepartamentoId(depto.id);
          cargarMunicipios(depto.id, editedUser?.municipio || "");
        }
      })
      .catch(() => {
        if (activo) setDepartamentos([]);
      });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Carga los municipios del departamento seleccionado.
  const cargarMunicipios = async (deptoId, municipioDetectado = "") => {
    setMunicipiosCargando(true);
    setMunicipioExtra("");
    try {
      if (deptoId) {
        const data = await getMunicipios(deptoId);
        const lista = data || [];
        setMunicipios(lista);
        if (municipioDetectado && !lista.some((m) => m.nombre === municipioDetectado)) {
          setMunicipioExtra(municipioDetectado);
        }
      } else {
        setMunicipios([]);
      }
    } catch {
      setMunicipios([]);
    } finally {
      setMunicipiosCargando(false);
    }
  };

  // Al cambiar el departamento se recargan sus municipios y se limpia el previo.
  const handleDepartamentoChange = (nombre, id) => {
    setEditedUser((prev) => ({
      ...prev,
      departamento: nombre,
      municipio: "",
      location: [prev.direccion, nombre].filter(Boolean).join(", "),
    }));
    setMunicipioExtra("");
    setDepartamentoId(id);
    cargarMunicipios(id);
  };

  // Reutiliza la misma función del registro de refugios: autocompleta
  // Departamento, Municipio y Dirección y deriva la ubicación legada.
  const usarMiUbicacion = async () => {
    setGeoLoading(true);
    setGeoError("");
    setGeoOk(false);
    try {
      const ubi = await obtenerUbicacionDetallada();
      setEditedUser((prev) => ({
        ...prev,
        departamento: ubi.departamento,
        municipio: ubi.municipio,
        direccion: ubi.direccion,
        location: [ubi.municipio, ubi.departamento, ubi.direccion].filter(Boolean).join(", "),
      }));
      // Carga los municipios del departamento detectado (si existe en el catálogo).
      const depto = departamentos.find((d) => d.nombre === ubi.departamento);
      if (depto) {
        setDepartamentoId(depto.id);
        await cargarMunicipios(depto.id, ubi.municipio);
      } else {
        setMunicipios([]);
        setDepartamentoId(null);
        setMunicipioExtra(ubi.municipio || "");
      }
      setGeoOk(true);
    } catch (e) {
      setGeoError(e?.message || "No se pudo obtener tu ubicación. Completa los campos manualmente.");
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSaveClick = () => {
    const nuevos = {
      name: validarNombre(editedUser.name, { campo: "nombre" }),
      email: validarEmail(editedUser.email),
      phone: validarTelefono(editedUser.phone, { obligatorio: false }),
    };
    setErrors(nuevos);
    if (Object.values(nuevos).some((m) => m)) return;
    onSave({
      ...editedUser,
      name: limpiarEspacios(editedUser.name),
      email: normalizarEmail(editedUser.email),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay" />
      <div className="relative bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 rounded-xl flex items-center justify-center">
              <Edit className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white font-display">Editar Perfil</h3>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre completo</label>
              <input type="text" value={editedUser.name}
                onChange={e => { setEditedUser({ ...editedUser, name: e.target.value }); setErrors((prev) => ({ ...prev, name: "" })); }}
                className={claseInput("w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all", !!errors.name)} />
              <FieldError mensaje={errors.name} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Correo electrónico</label>
              <input type="email" value={editedUser.email}
                onChange={e => { setEditedUser({ ...editedUser, email: e.target.value }); setErrors((prev) => ({ ...prev, email: "" })); }}
                className={claseInput("w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all", !!errors.email)} />
              <FieldError mensaje={errors.email} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teléfono</label>
              <input type="tel" value={editedUser.phone}
                onChange={e => { setEditedUser({ ...editedUser, phone: e.target.value }); setErrors((prev) => ({ ...prev, phone: "" })); }}
                className={claseInput("w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all", !!errors.phone)} />
              <FieldError mensaje={errors.phone} />
            </div>
          </div>

          {/* ─── Ubicación detallada con "Usar mi ubicación actual" ─── */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border p-4 bg-gray-50/50 dark:bg-dark-bg/40">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ubicación</h4>
              </div>
              <button
                type="button"
                onClick={usarMiUbicacion}
                disabled={geoLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  geoOk
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
                }`}
              >
                {geoLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                {geoLoading ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}
              </button>
            </div>

            {geoError && (
              <div className="flex items-start gap-2 mb-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{geoError}</p>
              </div>
            )}
            {geoOk && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Ubicación detectada. Puedes editar los campos si es necesario.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Departamento</label>
                <select
                  value={editedUser.departamento || ""}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    const depto = departamentos.find((d) => d.nombre === nombre);
                    handleDepartamentoChange(nombre, depto?.id ?? null);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all"
                >
                  <option value="">Selecciona un departamento</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.nombre}>{d.nombre}</option>
                  ))}
                  {editedUser.departamento && !departamentos.some((d) => d.nombre === editedUser.departamento) && (
                    <option value={editedUser.departamento}>{editedUser.departamento}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Municipio</label>
                <select
                  value={editedUser.municipio || ""}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    setEditedUser((prev) => ({
                      ...prev,
                      municipio: nombre,
                      location: [nombre, prev.departamento, prev.direccion].filter(Boolean).join(", "),
                    }));
                  }}
                  disabled={!departamentoId || municipiosCargando}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {municipiosCargando ? "Cargando municipios..." : "Selecciona un municipio"}
                  </option>
                  {municipios.map((m) => (
                    <option key={m.id} value={m.nombre}>{m.nombre}</option>
                  ))}
                  {municipioExtra && (
                    <option value={municipioExtra}>{municipioExtra}</option>
                  )}
                  {editedUser.municipio &&
                    !municipios.some((m) => m.nombre === editedUser.municipio) &&
                    editedUser.municipio !== municipioExtra && (
                      <option value={editedUser.municipio}>{editedUser.municipio}</option>
                    )}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dirección</label>
                <input type="text" value={editedUser.direccion || ""}
                  onChange={e => setEditedUser((prev) => ({
                    ...prev,
                    direccion: e.target.value,
                    location: [prev.municipio, prev.departamento, e.target.value].filter(Boolean).join(", "),
                  }))}
                  placeholder="Calle, carrera, barrio..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Biografía</label>
            <textarea rows="4" value={editedUser.bio}
              onChange={e => setEditedUser({ ...editedUser, bio: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sitio web</label>
              <input type="url" value={editedUser.website || ""}
                onChange={e => setEditedUser({ ...editedUser, website: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Twitter / X</label>
              <input type="text" value={editedUser.social?.twitter || ""}
                onChange={e => setEditedUser({ ...editedUser, social: { ...editedUser.social, twitter: e.target.value } })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instagram</label>
            <input type="text" value={editedUser.social?.instagram || ""}
              onChange={e => setEditedUser({ ...editedUser, social: { ...editedUser.social, instagram: e.target.value } })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-bg border-2 border-gray-100 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent dark:text-white transition-all" />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
          <button onClick={onCancel} className="flex-1 px-6 py-3 bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-dark-border">
            Cancelar
          </button>
          <button onClick={handleSaveClick} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 hover:shadow-lg hover:shadow-rose-200 dark:hover:shadow-rose-900/30">
            <Save className="w-4 h-4" />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function UserProfile() {
  const { user: authUser, profileCompleted, openProfileModal, refreshUser } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(EMPTY_USER);
  const [editedUser, setEditedUser] = useState({ ...EMPTY_USER });
  const [pets, setPets] = useState([]);
  const [favCount, setFavCount] = useState(0);
  const [solTotal, setSolTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Estados de la foto de perfil (subir/eliminar en Cloudinary + BD).
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Sincroniza el perfil con el usuario autenticado del contexto.
  useEffect(() => {
    if (authUser) {
      const u = {
        ...EMPTY_USER,
        name: authUser.name || authUser.nombre || "",
        email: authUser.email || "",
        phone: authUser.phone || "",
        location: authUser.location || "",
        departamento: authUser.departamento || "",
        municipio: authUser.municipio || "",
        direccion: authUser.direccion || "",
        bio: authUser.bio || "",
        // Imágenes persistentes (secure_url de Cloudinary) recuperadas desde
        // el backend (/me o /profile). Permiten reconstruir el perfil después
        // de recargar la página o volver a iniciar sesión.
        avatar: authUser.avatar_url || authUser.avatar || null,
        cover: authUser.cover_url || authUser.cover || null,
        website: authUser.website || "",
        social: {
          twitter: authUser.twitter || "",
          instagram: authUser.instagram || "",
        },
      };
      setUser(u);
      setEditedUser(u);
    }
  }, [authUser]);

  // Carga mascotas adoptadas (solicitudes finalizadas) y numero de favoritos.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [solicitudes, favIds] = await Promise.all([
          misSolicitudes().catch(() => []),
          idsMascotasFavoritas().catch(() => []),
        ]);
        if (!activo) return;
        const lista = solicitudes || [];
        setSolTotal(lista.length);
        const adoptadas = lista
          .filter((s) => s.estado === "finalizada")
          .map((s) => ({
            id: s.id,
            name: s.mascota_nombre || "Mascota",
            type: s.mascota_tipo === "Gato" ? "cat" : "dog",
            breed: s.mascota_tipo || "",
            age: "",
            adopted: s.creada_en
              ? new Date(s.creada_en).toLocaleDateString("es-CO", {
                  day: "2-digit", month: "short", year: "numeric",
                })
              : "",
          }));
        setPets(adoptadas);
        setFavCount((favIds || []).length);
      } catch (e) {
        // se mantienen listas vacias
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Guarda los datos editados en la base de datos y actualiza la interfaz.
  // Si falla la API se conservan los cambios locales para poder reintentar.
  const handleSave = async () => {
    // Deriva la ubicación legada desde los campos detallados si no se llenó.
    const ubicacionDerivada =
      editedUser.location?.trim() ||
      [editedUser.municipio, editedUser.departamento, editedUser.direccion]
        .filter(Boolean)
        .join(", ") ||
      null;
    const payload = {
      telefono: editedUser.phone || null,
      ubicacion: ubicacionDerivada,
      departamento: editedUser.departamento || null,
      municipio: editedUser.municipio || null,
      direccion: editedUser.direccion || null,
      bio: editedUser.bio || null,
      website: editedUser.website || null,
      twitter: editedUser.social?.twitter || null,
      instagram: editedUser.social?.instagram || null,
    };
    try {
      await updateProfile(payload);
      refreshUser();
    } catch {
      // No se bloquea la interfaz; los cambios quedan en el formulario local.
    }
    setUser({ ...editedUser });
    setShowEditModal(false);
  };

  // Sube/elimina la foto de perfil mediante los endpoints dedicados del
  // backend, que también eliminan la imagen anterior de Cloudinary (evita
  // imágenes huérfanas). Después sincroniza el contexto (Navbar y menú
  // desplegable) al instante, sin recargar.
  const handleAvatarChange = async (value) => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError("");
    const nuevoAvatar = value || null;
    try {
      if (value) {
        await cambiarAvatar(value);
      } else {
        await eliminarAvatar();
      }
      setUser((prev) => ({ ...prev, avatar: nuevoAvatar }));
      refreshUser();
    } catch (e) {
      setAvatarError(e?.message || "No se pudo guardar la foto. Intenta de nuevo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleCancel = () => {
    setEditedUser({ ...user });
    setShowEditModal(false);
  };

  const openEdit = () => {
    setEditedUser({ ...user });
    setShowEditModal(true);
  };

  const stats = [
    { label: "Mascotas adoptadas", value: pets.length, icon: PawPrint, color: "from-rose-500 to-rose-600", shadow: "shadow-rose-200 dark:shadow-rose-900/30" },
    { label: "Favoritos", value: favCount, icon: Heart, color: "from-amber-500 to-amber-600", shadow: "shadow-amber-200 dark:shadow-amber-900/30" },
    { label: "Solicitudes", value: solTotal, icon: PawPrint, color: "from-rose-500 to-amber-500", shadow: "shadow-rose-200 dark:shadow-rose-900/30" },
  ];

  const tabs = [
    { id: "overview", label: "Resumen", icon: User },
    { id: "pets", label: "Mis Mascotas", icon: PawPrint },
    { id: "activity", label: "Actividad", icon: Clock },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-[#1a0a0f] dark:via-[#0f0f13] dark:to-[#1a1208] relative">
      {/* ─── Animated Background Orbs ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-rose-200/20 dark:bg-rose-500/5 rounded-full blur-3xl animate-float-1" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-amber-200/20 dark:bg-amber-500/5 rounded-full blur-3xl animate-float-2" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-rose-300/10 dark:bg-rose-600/5 rounded-full blur-3xl animate-float-3" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-violet-200/10 dark:bg-violet-500/5 rounded-full blur-3xl animate-float-4" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <BackButton fallback="/dashboard" label="Volver" className="mb-4" />
        {/* ─── Header ─── */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full text-sm font-medium mb-4 animate-scale-in">
            <Sparkles className="w-4 h-4" />
            <span>Mi espacio personal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-3 font-display tracking-tight">
            Mi{" "}
            <span className="bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
              Perfil
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Gestiona tu información y conecta con la comunidad
          </p>
        </div>

        {/* ─── Profile Card ─── */}
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl dark:shadow-2xl overflow-hidden mb-8 animate-slide-up-fade border border-gray-100 dark:border-dark-border">
          {/* Animated Cover */}
          <div className="relative h-40 sm:h-52 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-gradient overflow-hidden group">
            <div className="absolute inset-0 bg-black/10" />
            {/* Decorative circles on cover */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/30 transition-all text-white">
                <Camera className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Avatar Section */}
          <div className="relative px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-13 sm:-mt-6">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 bg-gradient-to-br from-rose-200 to-amber-200 dark:from-rose-900/40 dark:to-amber-900/40 rounded-3xl flex items-center justify-center border-4 border-white dark:border-dark-card shadow-2xl transition-all duration-500 group-hover:shadow-rose-200 dark:group-hover:shadow-rose-900/30 group-hover:scale-105 overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-14 h-14 sm:w-20 sm:h-20 text-rose-400 dark:text-rose-500" />
                    )}
                    {/* Avatar hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center rounded-3xl">
                      <button
                        onClick={() => setShowAvatarModal(true)}
                        className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white shadow-lg transform translate-y-2 group-hover:translate-y-0"
                      >
                        <Camera className="w-6 h-6 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Name & Location */}
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">
                    {user.name}
                  </h2>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-rose-400 dark:text-rose-500" />
                    <p className="text-gray-600 dark:text-gray-400">{user.location}</p>
                  </div>

                  {/* Acciones de la foto de perfil (Cambiar / Eliminar) */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setAvatarError(""); setShowAvatarModal(true); }}
                      disabled={avatarBusy}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all disabled:opacity-60"
                    >
                      <Camera className="w-4 h-4" />
                      Cambiar foto
                    </button>
                    {user.avatar && (
                      <button
                        type="button"
                        onClick={async () => { setAvatarError(""); await handleAvatarChange(null); }}
                        disabled={avatarBusy}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                        {avatarBusy ? "Eliminando..." : "Eliminar foto"}
                      </button>
                    )}
                  </div>
                  {avatarError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 justify-center sm:justify-start">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {avatarError}
                    </p>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={openEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all duration-300 hover:shadow-lg hover:shadow-rose-200 dark:hover:shadow-rose-900/30 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
              >
                <Edit className="w-4 h-4" />
                Editar Perfil
              </button>
            </div>

            {/* Bio */}
            <div className="mt-5 sm:mt-6 p-4 sm:p-5 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-900/10 dark:to-amber-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20">
              <div className="flex items-start gap-3">
                <Quote className="w-5 h-5 text-rose-400 dark:text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                  "{user.bio}"
                </p>
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-bg rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                  <Globe className="w-4 h-4" /> {user.website.replace("https://", "")}
                </a>
              )}
              {user.social?.twitter && (
                <a href="#" className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-bg rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                  <MessageCircle className="w-4 h-4" /> {user.social.twitter}
                </a>
              )}
              {user.social?.instagram && (
                <a href="#" className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-bg rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                  <Camera className="w-4 h-4" /> {user.social.instagram}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ─── Banner de perfil incompleto ─── */}
        {!profileCompleted && (
          <div className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-2xl shadow-lg p-5 sm:p-6 mb-8 animate-fadeIn relative overflow-hidden group">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Completa tu perfil</h3>
                  <p className="text-sm text-rose-100">
                    Agrega información adicional para que los refugios te conozcan mejor
                  </p>
                </div>
              </div>
              <button
                onClick={openProfileModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-rose-600 font-semibold rounded-xl hover:bg-rose-50 transition-all duration-300 hover:shadow-lg whitespace-nowrap flex-shrink-0 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Completar ahora
              </button>
            </div>
          </div>
        )}

        {/* ─── Stats Grid ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className="group bg-white dark:bg-dark-card rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 border border-gray-100 dark:border-dark-border animate-fadeIn"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">
                    {stat.isText ? (
                      stat.value
                    ) : (
                      <AnimatedCounter end={stat.value} />
                    )}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Tabs Navigation ─── */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-1.5 mb-8 border border-gray-100 dark:border-dark-border overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/30"
                      : "text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Tab Content ─── */}

        {/* ─── Overview Tab ─── */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Personal Information */}
            <div className="bg-white dark:bg-dark-card rounded-3xl shadow-lg p-6 sm:p-8 border border-gray-100 dark:border-dark-border animate-fadeIn">
              <SectionDivider icon={User} label="Información Personal" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: User, label: "Nombre completo", value: user.name, color: "from-rose-500 to-rose-600" },
                  { icon: Mail, label: "Correo electrónico", value: user.email, color: "from-amber-500 to-amber-600" },
                  { icon: Phone, label: "Teléfono", value: user.phone, color: "from-emerald-500 to-emerald-600" },
                  { icon: MapPin, label: "Ubicación", value: user.location, color: "from-violet-500 to-violet-600" },
                ].map((item, idx) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-2xl hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-all duration-300 group animate-fadeIn"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.label}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-dark-card rounded-3xl shadow-lg p-6 sm:p-8 border border-gray-100 dark:border-dark-border animate-fadeIn" style={{ animationDelay: "200ms" }}>
              <SectionDivider icon={TrendingUp} label="Acciones Rápidas" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link to="/adoption-history"
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all duration-300 group border border-transparent hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <PawPrint className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Historial de Adopciones</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Estado de tus solicitudes</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-rose-500 dark:group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link to="/favorites"
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all duration-300 group border border-transparent hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-rose-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Favoritos</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Mascotas guardadas</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link to="/settings"
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all duration-300 group border border-transparent hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Configuración</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ajustes de la cuenta</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 dark:group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link to="/settings"
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all duration-300 group border border-transparent hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Privacidad</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Datos y seguridad</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>

              {/* Logout */}
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-dark-border">
                <Link to="/login"
                  className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-all duration-300 group border border-transparent hover:border-red-200 dark:hover:border-red-800">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <LogOut className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400">Cerrar Sesión</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Salir de tu cuenta</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── Pets Tab ─── */}
        {activeTab === "pets" && (
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-lg p-6 sm:p-8 border border-gray-100 dark:border-dark-border animate-fadeIn">
            <SectionDivider icon={PawPrint} label="Mis Mascotas" action="Ver todas" />

            <div className="space-y-4">
              {pets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-bg flex items-center justify-center mx-auto mb-4">
                    <PawPrint className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Aún no tienes mascotas adoptadas
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Cuando completes una adopción aparecerá aquí
                  </p>
                </div>
              ) : (
                pets.map((pet, idx) => (
                  <PetCard key={pet.id} pet={pet} index={idx} />
                ))
              )}
            </div>

            {/* Add Pet CTA */}
            <div className="mt-6 p-5 border-2 border-dashed border-gray-200 dark:border-dark-border rounded-2xl text-center hover:border-rose-300 dark:hover:border-rose-700 transition-all duration-300 group cursor-pointer bg-gray-50/50 dark:bg-dark-bg/50">
              <div className="w-14 h-14 mx-auto mb-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-7 h-7 text-rose-500 dark:text-rose-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Registrar nueva mascota</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Añade una mascota adoptada a tu perfil</p>
            </div>
          </div>
        )}

        {/* ─── Activity Tab ─── */}
        {activeTab === "activity" && (
          <div className="bg-white dark:bg-dark-card rounded-3xl shadow-lg p-6 sm:p-8 border border-gray-100 dark:border-dark-border animate-fadeIn">
            <SectionDivider icon={Clock} label="Actividad Reciente" action="Ver todo" />

            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-bg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No hay actividad reciente
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Tu actividad en la plataforma aparecerá aquí
              </p>
            </div>
          </div>
        )}

        {/* ─── Footer Note ─── */}
        <div className="text-center mt-10 text-sm text-gray-400 dark:text-gray-600">
          <p>Completa tu perfil para obtener más visibilidad en la comunidad</p>
        </div>
      </div>

      {/* ─── Modals ─── */}
      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatar={user.avatar}
        onAvatarChange={handleAvatarChange}
        busy={avatarBusy}
      />
      <EditProfileModal
        key={showEditModal ? "edit-open" : "edit-closed"}
        isOpen={showEditModal}
        user={user}
        editedUser={editedUser}
        setEditedUser={setEditedUser}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* ─── Scroll to Top ─── */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-full shadow-2xl hover:shadow-rose-200 dark:hover:shadow-rose-900/30 transition-all duration-300 hover:scale-110 active:scale-95 z-50 flex items-center justify-center animate-bounce-subtle"
          aria-label="Volver arriba"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

      {/* ─── Animations ─── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out both;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalContentIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-overlay {
          animation: modalOverlayIn 0.3s ease-out both;
        }
        .animate-modal-content {
          animation: modalContentIn 0.3s ease-out both;
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.6s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
