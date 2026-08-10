import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import ConfirmModal from "../../components/ConfirmModal";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Loader2,
  Trash2,
  Pencil,
  X,
  Save,
  Eye,
  EyeOff,
  User as UserIcon,
  Calendar,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import {
  listarEquipo,
  listarPermisosEquipo,
  crearEmpleado,
  actualizarEmpleado,
  cambiarEstadoEmpleado,
  desvincularEmpleado,
} from "../../api/empleados";

const inputCls = (isDark) =>
  `w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all border ${
    isDark
      ? "bg-[#15151f] border-dark-border text-dark-text placeholder-dark-text-secondary"
      : "bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400"
  }`;

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};

export default function ShelterTeam() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [team, setTeam] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", telefono: "", password: "", activo: true, permisos: [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const seleccionarTodosRef = useRef(null);

  const notify = (message, type = "success") => setToast({ message, type });

  const loadAll = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const [equipo, catalogo] = await Promise.all([listarEquipo(), listarPermisosEquipo()]);
      setTeam(equipo || []);
      setPermisos(catalogo || []);
    } catch (e) {
      if (e?.status === 403) setForbidden(true);
      else if (e?.status === 401) notify("Tu sesión expiró. Vuelve a iniciar sesión.", "error");
      else notify(e?.message || "No se pudo cargar el equipo del refugio", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const [equipo, catalogo] = await Promise.all([listarEquipo(), listarPermisosEquipo()]);
        if (!active) return;
        setTeam(equipo || []);
        setPermisos(catalogo || []);
      } catch (e) {
        if (!active) return;
        if (e?.status === 403) setForbidden(true);
        else if (e?.status === 401) notify("Tu sesión expiró. Vuelve a iniciar sesión.", "error");
        else notify(e?.message || "No se pudo cargar el equipo del refugio", "error");
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  // Sincroniza el estado visual (indeterminado) del checkbox "Seleccionar todos".
  useEffect(() => {
    if (seleccionarTodosRef.current) {
      seleccionarTodosRef.current.indeterminate =
        algunosPermisosSeleccionados && !todosPermisosSeleccionados;
    }
  }, [form.permisos, permisos]);

  const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+)*$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Valida un campo individual y devuelve el mensaje de error (o null si es válido).
  const validarCampo = (campo, valor) => {
    const v = (valor ?? "").trim();
    if (campo === "nombre") {
      if (!v) return "*El nombre es obligatorio.";
      if (v.length < 2) return "*El nombre debe tener al menos 2 caracteres.";
      if (v.length > 60) return "*El nombre no puede superar los 60 caracteres.";
      if (/\d/.test(v)) return "*El nombre no puede contener números.";
      if (!NOMBRE_REGEX.test(v)) return "*El nombre solo puede contener letras (se permiten tildes y ñ).";
      return null;
    }
    if (campo === "apellido") {
      if (!v) return null; // opcional
      if (v.length < 2) return "*El apellido debe tener al menos 2 caracteres.";
      if (v.length > 60) return "*El apellido no puede superar los 60 caracteres.";
      if (/\d/.test(v)) return "*El apellido no puede contener números.";
      if (!NOMBRE_REGEX.test(v)) return "*El apellido solo puede contener letras (se permiten tildes y ñ).";
      return null;
    }
    if (campo === "email") {
      if (!v) return "*El correo electrónico es obligatorio.";
      if (/\s/.test(v)) return "*El correo electrónico no puede contener espacios.";
      if (!EMAIL_REGEX.test(v)) return "*Ingresa un correo electrónico válido.";
      return null;
    }
    if (campo === "telefono") {
      if (!v) return null; // opcional
      if (!/^\d+$/.test(v)) return "*El teléfono solo puede contener números.";
      if (v.length !== 10) return "*El teléfono debe contener exactamente 10 números.";
      return null;
    }
    if (campo === "password") {
      if (!v) return "*La contraseña es obligatoria.";
      if (v.length < 8) return "*La contraseña debe tener al menos 8 caracteres.";
      const faltantes = [];
      if (!/[A-Z]/.test(v)) faltantes.push("una mayúscula");
      if (!/[a-z]/.test(v)) faltantes.push("una minúscula");
      if (!/[0-9]/.test(v)) faltantes.push("un número");
      if (!/[^A-Za-z0-9]/.test(v)) faltantes.push("un carácter especial");
      if (faltantes.length)
        return "*La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.";
      return null;
    }
    return null;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: "", apellido: "", email: "", telefono: "", password: "", activo: true, permisos: [] });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      nombre: m.nombre || "",
      apellido: m.apellido || "",
      email: m.email || "",
      telefono: m.telefono || "",
      password: "",
      activo: m.activo,
      permisos: [...(m.permisos || [])],
    });
    setErrors({});
    setModalOpen(true);
  };

  // Actualiza el campo y valida en tiempo real (solo si el campo ya fue tocado
  // o si tiene contenido, para no mostrar errores en campos vacíos no tocados).
  const handleChange = (campo, valor) => {
    const normalizado = campo === "telefono"
      ? valor.replace(/\D/g, "").slice(0, 10) // solo números, máx 10 dígitos
      : valor;
    setForm((prev) => ({ ...prev, [campo]: normalizado }));
    setErrors((prev) => {
      const nuevo = { ...prev };
      if (prev[campo] !== undefined || (normalizado ?? "").toString().trim() !== "") {
        const err = validarCampo(campo, normalizado);
        if (err) nuevo[campo] = err;
        else delete nuevo[campo];
      }
      return nuevo;
    });
  };

  const togglePermiso = (codigo) => {
    setForm((prev) => ({
      ...prev,
      permisos: prev.permisos.includes(codigo)
        ? prev.permisos.filter((c) => c !== codigo)
        : [...prev.permisos, codigo],
    }));
  };

  const seleccionarTodosPermisos = () => {
    const todosLosCodigos = (permisos || []).map((p) => p.codigo);
    const todosMarcados = todosLosCodigos.length > 0 && todosLosCodigos.every((c) => form.permisos.includes(c));
    setForm((prev) => ({
      ...prev,
      permisos: todosMarcados ? [] : todosLosCodigos,
    }));
  };

  const todosPermisosSeleccionados = (permisos || []).length > 0 && (permisos || []).every((p) => form.permisos.includes(p.codigo));
  const algunosPermisosSeleccionados = (permisos || []).some((p) => form.permisos.includes(p.codigo));

  const validate = () => {
    const e = {};
    for (const campo of ["nombre", "email", "telefono"]) {
      const err = validarCampo(campo, form[campo]);
      if (err) e[campo] = err;
    }
    if (!editing) {
      const err = validarCampo("password", form.password);
      if (err) e.password = err;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        const payload = {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim() || null,
          telefono: form.telefono?.trim() || null,
          activo: form.activo,
          permisos: form.permisos,
        };
        if (form.password) payload.password = form.password;
        await actualizarEmpleado(editing.usuario_id, payload);
        notify("Empleado actualizado correctamente");
      } else {
        await crearEmpleado({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim() || null,
          email: form.email.trim(),
          telefono: form.telefono?.trim() || null,
          password: form.password,
          activo: form.activo,
          permisos: form.permisos,
        });
        notify("Empleado creado correctamente");
      }
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      notify(e?.message || "No se pudo guardar el empleado", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleState = async (m) => {
    try {
      await cambiarEstadoEmpleado(m.usuario_id, !m.activo);
      notify(m.activo ? "Empleado desactivado" : "Empleado activado");
      await loadAll();
    } catch (e) {
      notify(e?.message || "No se pudo cambiar el estado", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await desvincularEmpleado(deleting.usuario_id);
      notify("Empleado desvinculado");
      setDeleting(null);
      await loadAll();
    } catch (e) {
      notify(e?.message || "No se pudo desvincular al empleado", "error");
    }
  };

  const filtered = team.filter(
    (m) =>
      !search.trim() ||
      (m.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-20 pb-12 transition-colors duration-300 ${isDark ? "bg-dark-bg" : "bg-gradient-to-br from-rose-50 via-white to-amber-50"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-3 bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300">
              <ShieldCheck className="w-4 h-4" />
              Equipo del Refugio
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display text-gray-900 dark:text-dark-text">
              Gestiona tu equipo
            </h1>
            <p className="text-base sm:text-lg mt-1 text-gray-600 dark:text-dark-text-secondary">
              Agrega empleados, asigna permisos y controla el acceso a las funciones del refugio
            </p>
          </div>
          {!forbidden && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Agregar empleado
            </button>
          )}
        </div>

        {forbidden ? (
          <div className="max-w-md mx-auto text-center py-20 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border">
            <Shield className="w-16 h-16 mx-auto mb-4 text-rose-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">Acceso restringido</h2>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
              Solo el representante del refugio o un empleado con el permiso "Administrar empleados" puede gestionar el equipo.
            </p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-6">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className={`w-full pl-12 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                  isDark ? "bg-dark-card border border-dark-border text-dark-text placeholder-dark-text-secondary" : "bg-white border border-gray-200 text-gray-700 placeholder-gray-400 shadow-sm"
                }`}
              />
            </div>

            {/* Team list */}
            {filtered.length === 0 ? (
              <div className="text-center py-20 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-dark-text-secondary" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
                  {search ? "Sin resultados" : "Aún no hay empleados"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6">
                  {search ? "Prueba con otros términos" : "Agrega empleados para que colaboren con el refugio"}
                </p>
                {!search && (
                  <button onClick={openCreate} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg">
                    <Plus className="w-4 h-4" />
                    Agregar empleado
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((m) => (
                  <div key={m.usuario_id} className={`rounded-2xl p-5 transition-all hover-lift ${isDark ? "bg-dark-card border border-dark-border" : "bg-white shadow-md shadow-gray-100/50"}`}>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative shrink-0">
                        {m.avatar_url ? (
                          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isDark ? "border-dark-border" : "border-gray-100"}`}>
                            <img src={m.avatar_url} alt={m.nombre} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${m.es_representante ? "from-rose-500 to-pink-600" : "from-amber-400 to-orange-500"} flex items-center justify-center text-white font-bold`}>
                            {getInitials(m.nombre)}
                          </div>
                        )}
                        {!m.activo && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gray-400 border-2 border-white dark:border-dark-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold truncate ${isDark ? "text-dark-text" : "text-gray-900"}`}>{m.nombre} {m.apellido || ""}</p>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          m.es_representante
                            ? "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                        }`}>
                          {m.es_representante ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                          {m.es_representante ? "Representante" : "Empleado"}
                        </span>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                        m.activo ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-dark-text-secondary"
                      }`}>
                        {m.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Contacto */}
                    <div className="space-y-1.5 text-sm mb-3">
                      <p className={`flex items-center gap-2 truncate ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                        <Mail className="w-4 h-4 shrink-0" />
                        {m.email}
                      </p>
                      {m.telefono && (
                        <p className={`flex items-center gap-2 ${isDark ? "text-dark-text-secondary" : "text-gray-500"}`}>
                          <Phone className="w-4 h-4 shrink-0" />
                          {m.telefono}
                        </p>
                      )}
                      {m.creado_en && (
                        <p className={`flex items-center gap-2 text-xs ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`}>
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          Registrado {new Date(m.creado_en).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    {/* Permisos */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {m.es_representante ? (
                        <span className="text-[11px] px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 font-medium">
                          Todos los permisos
                        </span>
                      ) : m.permisos && m.permisos.length > 0 ? (
                        m.permisos.map((cod) => {
                          const p = permisos.find((x) => x.codigo === cod);
                          return (
                            <span key={cod} className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-dark-text-secondary font-medium">
                              {p?.nombre || cod}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 font-medium">
                          Sin permisos
                        </span>
                      )}
                    </div>

                    {/* Acciones */}
                    {!m.es_representante && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isDark ? "bg-white/5 text-dark-text-secondary hover:bg-white/10 hover:text-dark-text" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleState(m)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            m.activo
                              ? isDark ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : isDark ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={m.activo ? "Desactivar" : "Activar"}
                        >
                          {m.activo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {m.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          onClick={() => setDeleting(m)}
                          className={`p-2 rounded-xl transition-all ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`}
                          title="Desvincular"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-modal-overlay">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${isDark ? "bg-dark-card border border-dark-border" : "bg-white"} animate-modal-content`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-5 border-b bg-inherit ${isDark ? "border-dark-border" : "border-gray-100"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-rose-500/15" : "bg-rose-100"}`}>
                  {editing ? <Pencil className="w-5 h-5 text-rose-500" /> : <Users className="w-5 h-5 text-rose-500" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display text-gray-900 dark:text-dark-text">
                    {editing ? "Editar empleado" : "Agregar empleado"}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                    Se crea un usuario con rol 'empleado_refugio' vinculado a tu refugio
                  </p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className={`p-2 rounded-xl transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Datos personales */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">Nombre *</label>
                  <input
                    value={form.nombre}
                    onChange={(e) => handleChange("nombre", e.target.value)}
                    placeholder="Nombre"
                    className={`${inputCls(isDark)} ${errors.nombre ? (isDark ? "border-red-500/70" : "border-red-400") : ""}`}
                  />
                  {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">Apellido</label>
                  <input
                    value={form.apellido}
                    onChange={(e) => handleChange("apellido", e.target.value)}
                    placeholder="Apellido"
                    className={`${inputCls(isDark)} ${errors.apellido ? (isDark ? "border-red-500/70" : "border-red-400") : ""}`}
                  />
                  {errors.apellido && <p className="text-xs text-red-500 mt-1">{errors.apellido}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">Correo electrónico *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="correo@ejemplo.com"
                    disabled={!!editing}
                    className={`${inputCls(isDark)} ${editing ? "opacity-60" : ""} ${errors.email ? (isDark ? "border-red-500/70" : "border-red-400") : ""}`}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={(e) => handleChange("telefono", e.target.value)}
                    placeholder="10 dígitos"
                    inputMode="numeric"
                    className={`${inputCls(isDark)} ${errors.telefono ? (isDark ? "border-red-500/70" : "border-red-400") : ""}`}
                  />
                  {errors.telefono && <p className="text-xs text-red-500 mt-1">{errors.telefono}</p>}
                </div>
              </div>

              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">Contraseña *</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className={`${inputCls(isDark)} ${errors.password ? (isDark ? "border-red-500/70" : "border-red-400") : ""}`}
                    />
                    <KeyRound className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-dark-text-secondary" : "text-gray-400"}`} />
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                  {/* Requisitos de la contraseña */}
                  <div className="mt-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-dark-border p-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Requisitos:</p>
                    <ul className="space-y-1 text-xs">
                      {[
                        { ok: /[A-Z]/.test(form.password), texto: "Una mayúscula." },
                        { ok: /[a-z]/.test(form.password), texto: "Una minúscula." },
                        { ok: /[0-9]/.test(form.password), texto: "Un número." },
                        { ok: /[^A-Za-z0-9]/.test(form.password), texto: "Un carácter especial." },
                        { ok: (form.password || "").length >= 8, texto: "Mínimo 8 caracteres." },
                      ].map((r) => (
                        <li key={r.texto} className={`flex items-center gap-2 ${r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-dark-text-secondary"}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${r.ok ? "bg-emerald-500" : "bg-gray-300 dark:bg-dark-border"}`} />
                          {r.texto}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Estado */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, activo: !form.activo })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.activo ? "bg-gradient-to-r from-rose-500 to-amber-500" : "bg-gray-300 dark:bg-dark-border"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.activo ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <span className="text-sm text-gray-700 dark:text-dark-text">Cuenta activa</span>
              </div>

              {/* Permisos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
                    Permisos
                  </label>
                  {permisos.length > 0 && (
                    <label
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border text-sm font-medium transition-all ${
                        todosPermisosSeleccionados
                          ? isDark ? "bg-rose-500/10 border-rose-500/40 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-600"
                          : isDark ? "bg-[#15151f] border-dark-border text-dark-text-secondary hover:border-rose-500/30" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-rose-300"
                      }`}
                    >
                      <input
                        ref={seleccionarTodosRef}
                        type="checkbox"
                        checked={todosPermisosSeleccionados}
                        onChange={seleccionarTodosPermisos}
                        className="rounded accent-rose-500"
                      />
                      Seleccionar todos
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permisos.map((p) => {
                    const checked = form.permisos.includes(p.codigo);
                    return (
                      <label
                        key={p.codigo}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${
                          checked
                            ? isDark ? "bg-rose-500/10 border-rose-500/40" : "bg-rose-50 border-rose-200"
                            : isDark ? "bg-[#15151f] border-dark-border hover:border-rose-500/30" : "bg-gray-50 border-gray-200 hover:border-rose-300"
                        }`}
                      >
                        <input type="checkbox" checked={checked} onChange={() => togglePermiso(p.codigo)} className="rounded accent-rose-500" />
                        <span className={`text-sm font-medium ${isDark ? "text-dark-text" : "text-gray-700"}`}>{p.nombre}</span>
                      </label>
                    );
                  })}
                </div>
                {permisos.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No hay permisos configurados.</p>
                )}
              </div>
            </div>

            <div className={`sticky bottom-0 flex justify-end gap-2 p-5 border-t bg-inherit ${isDark ? "border-dark-border" : "border-gray-100"}`}>
              <button onClick={() => setModalOpen(false)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isDark ? "text-dark-text-secondary hover:text-dark-text hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}>
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? "Guardar cambios" : "Crear empleado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar desvincular */}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="¿Desvincular empleado?"
        message={`Esta acción desactivará la cuenta de ${deleting?.nombre || "este empleado"} y eliminará sus permisos. No se puede deshacer.`}
        confirmText="Desvincular"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[90] flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-2xl shadow-2xl border animate-scale-in max-w-[92vw] ${
          isDark ? "bg-dark-card border-dark-border" : "bg-white border-gray-100"
        }`}>
          {toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          )}
          <span className={`text-sm font-medium ${isDark ? "text-dark-text" : "text-gray-800"}`}>{toast.message}</span>
          <button onClick={() => setToast(null)} className={`p-1 rounded-lg ${isDark ? "text-dark-text-secondary hover:text-dark-text" : "text-gray-400 hover:text-gray-700"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
