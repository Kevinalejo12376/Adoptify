import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Plus, Search, Pencil, Trash2, Power, PowerOff, KeyRound,
  Loader2, ShieldCheck, User, Mail, Clock, X, CheckCircle2, AlertCircle, ListChecks,
  LayoutDashboard, Store, HeartHandshake, MessageSquare, Settings,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import {
  listarAdministradoresTienda,
  crearAdministradorTienda,
  actualizarAdministradorTienda,
  cambiarEstadoAdministradorTienda,
  restablecerPasswordAdministradorTienda,
  eliminarAdministradorTienda,
  catalogoPermisosTienda,
} from "../../api/tienda";
import ConfirmModal from "../../components/ConfirmModal";
import FieldError from "../../components/FieldError";
import {
  validarNombre, validarApellido, validarEmail, validarTelefonoAdmin, validarPassword,
  validarPermisos, normalizarEmail, limpiarEspacios, claseInput, soloDigitos,
} from "../../utils/validaciones";

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all";

function Toast({ mensaje, tipo, onClose }) {
  useEffect(() => {
    if (mensaje) {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [mensaje, onClose]);
  if (!mensaje) return null;
  const cls = tipo === "error"
    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
    : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300";
  return (
    <div className="fixed bottom-6 right-6 z-[120] animate-slide-up-fade">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border shadow-lg backdrop-blur-sm ${cls}`}>
        {tipo === "error" ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
        <p className="text-sm font-medium">{mensaje}</p>
      </div>
    </div>
  );
}

// Switch de permiso
function PermisoSwitch({ activo, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!activo)}
      className={`relative w-10 h-5.5 h-[22px] rounded-full transition-colors ${activo ? "bg-gradient-to-r from-rose-500 to-amber-500" : "bg-gray-200 dark:bg-dark-border"}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${activo ? "translate-x-[18px]" : ""}`}
      />
    </button>
  );
}

// Control "Todos": selección rápida de todos los permisos disponibles.
function TodosSwitch({ activo, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ${
        activo
          ? "border-rose-500/30 bg-gradient-to-r from-rose-500/5 to-amber-500/5 dark:from-rose-500/10 dark:to-amber-500/10"
          : "border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50 hover:border-gray-200 dark:hover:border-dark-border"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
          activo ? "bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/25" : "bg-gray-100 dark:bg-dark-border text-gray-400"
        }`}>
          {activo ? <CheckCircle2 size={19} /> : <ListChecks size={19} />}
        </div>
        <div className="text-left min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-dark-text">Todos</p>
          <p className="text-xs text-gray-400 truncate">Selecciona o deselecciona todos los permisos de una vez</p>
        </div>
      </div>
      <span className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${activo ? "bg-gradient-to-r from-rose-500 to-amber-500" : "bg-gray-200 dark:bg-dark-border"}`}>
        <span className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${activo ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function EstadoBadge({ activo }) {
  return activo
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><Power size={12} /> Activo</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400"><PowerOff size={12} /> Inactivo</span>;
}

// ============================================================
// Organizacion visual de los permisos por secciones intuitivas.
// No altera el catalogo de la BD: solo agrupa los modulos para la UI.
// ============================================================
const MODULO_LABELS = {
  dashboard: "Dashboard",
  productos: "Productos",
  categorias: "Categorías",
  inventario: "Inventario",
  pedidos: "Pedidos",
  promociones: "Promociones",
  clientes: "Clientes",
  tienda: "Perfil de la tienda",
  reportes: "Estadísticas y reportes",
  historial: "Historial de actividad",
  donaciones: "Donaciones",
  pqrs: "PQRS",
  configuracion: "Configuración",
  administradores: "Administradores",
};

const SECCIONES = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, modulos: ["dashboard"] },
  { id: "gestion", label: "Gestión de tienda", icon: Store, modulos: ["productos", "categorias", "inventario", "pedidos", "promociones", "clientes", "tienda", "reportes", "historial"] },
  { id: "donaciones", label: "Donaciones", icon: HeartHandshake, modulos: ["donaciones"] },
  { id: "atencion", label: "Atención", icon: MessageSquare, modulos: ["pqrs"] },
  { id: "configuracion", label: "Configuración", icon: Settings, modulos: ["configuracion"] },
  { id: "administracion", label: "Administración", icon: Users, modulos: ["administradores"] },
];

export default function StoreAdministradores() {
  const { esSuperAdmin } = useStore();
  const [admins, setAdmins] = useState([]);
  const [catalogo, setCatalogo] = useState([]); // [{ modulo, permisos: [...] }]
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null); // admin a editar o null (crear)
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", password: "", telefono: "" });
  const [permisosSel, setPermisosSel] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [errors, setErrors] = useState({});

  // Confirmaciones
  const [confirm, setConfirm] = useState(null); // { tipo: 'eliminar'|'toggle'|'password', admin }
  const [nuevaPass, setNuevaPass] = useState("");
  const [errorPassReset, setErrorPassReset] = useState("");
  const [toast, setToast] = useState(null);
  const notificar = (mensaje, tipo = "success") => setToast({ mensaje, tipo });

  const cargar = useCallback(async () => {
    try {
      const data = await listarAdministradoresTienda();
      setAdmins(data || []);
    } catch (e) {
      notificar(e?.message || "No se pudieron cargar los administradores", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    catalogoPermisosTienda().then(setCatalogo).catch(() => setCatalogo([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selección rápida "Todos": sincronizada siempre con los permisos individuales.
  // Se define antes del early return para respetar las reglas de hooks.
  const todosCodigos = useMemo(
    () => (catalogo || []).flatMap((grupo) => grupo.permisos.map((p) => p.codigo)),
    [catalogo]
  );
  const todosActivo = todosCodigos.length > 0 && todosCodigos.every((c) => permisosSel[c]);

  const toggleTodos = () => {
    setPermisosSel((prev) => {
      const todas = todosCodigos.every((c) => prev[c]);
      const nuevo = { ...prev };
      todosCodigos.forEach((c) => { nuevo[c] = !todas; });
      return nuevo;
    });
  };

  // Si no es super admin, se muestra un bloqueo (aunque la ruta ya lo protege).
  if (!esSuperAdmin) {
    return (
      <div className="text-center py-24">
        <ShieldCheck size={48} className="mx-auto text-gray-300 dark:text-dark-border mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Acceso restringido</h3>
        <p className="text-sm text-gray-500 mt-1">Solo el Super Administrador puede gestionar administradores.</p>
      </div>
    );
  }

  const abrirCrear = () => {
    setEditando(null);
    setForm({ nombre: "", apellido: "", email: "", password: "", telefono: "" });
    setPermisosSel({});
    setErrorForm("");
    setErrors({});
    setModalOpen(true);
  };

  const abrirEditar = (admin) => {
    setEditando(admin);
    // El backend devuelve 'nombre' y 'apellido' por separado: cada dato se
    // carga en su respectivo input (sin concatenar ni dividir el nombre).
    setForm({
      nombre: admin.nombre || "",
      apellido: admin.apellido || "",
      email: admin.email || "",
      password: "",
      // Solo dígitos (máx 10) para que coincida con el validador del formulario.
      telefono: soloDigitos(admin.telefono || "").slice(0, 10),
    });
    const sel = {};
    (admin.permisos || []).forEach((c) => { sel[c] = true; });
    setPermisosSel(sel);
    setErrorForm("");
    setErrors({});
    setModalOpen(true);
  };

  const togglePermiso = (codigo) => {
    setPermisosSel((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  const codigosSeleccionados = () => Object.keys(permisosSel).filter((c) => permisosSel[c]);

  const validarCampoIndividual = (campo, valor) => {
    switch (campo) {
      case "nombre":
        return validarNombre(valor, { campo: "nombre" });
      case "apellido":
        return validarApellido(valor);
      case "email":
        return editando ? "" : validarEmail(valor);
      case "telefono":
        return validarTelefonoAdmin(valor);
      case "password":
        return validarPassword(valor, { obligatorio: !editando });
      default:
        return "";
    }
  };

  const validarFormulario = () => {
    const nuevos = {
      nombre: validarNombre(form.nombre, { campo: "nombre" }),
      apellido: validarApellido(form.apellido),
      email: editando ? "" : validarEmail(form.email),
      telefono: validarTelefonoAdmin(form.telefono),
      password: editando ? (form.password ? validarPassword(form.password) : "") : validarPassword(form.password),
      permisos: validarPermisos(permisosSel, { mensaje: "Debes asignar al menos un permiso al administrador." }),
    };
    setErrors(nuevos);
    return !Object.values(nuevos).some((m) => m);
  };

  const handleChangeCampo = (campo, valor) => {
    setForm((p) => ({ ...p, [campo]: valor }));
    // Validación inmediata tras interactuar: el mensaje se actualiza (o
    // desaparece) con cada cambio del campo.
    setErrors((prev) => ({ ...prev, [campo]: validarCampoIndividual(campo, valor) }));
  };

  const guardar = async () => {
    if (!validarFormulario()) return;
    setSaving(true);
    setErrorForm("");
    try {
      const payload = {
        nombre: limpiarEspacios(form.nombre),
        apellido: limpiarEspacios(form.apellido) || null,
        email: normalizarEmail(form.email),
        telefono: form.telefono ? form.telefono.trim() : null,
        permisos: codigosSeleccionados(),
      };
      if (editando) {
        if (form.password) payload.password = form.password;
        await actualizarAdministradorTienda(editando.id, payload);
        notificar("Administrador actualizado correctamente");
      } else {
        payload.password = form.password;
        await crearAdministradorTienda(payload);
        notificar("Administrador creado correctamente");
      }
      setModalOpen(false);
      cargar();
    } catch (e) {
      setErrorForm(e?.message || "No se pudo guardar el administrador");
    } finally {
      setSaving(false);
    }
  };

  const ejecutarConfirm = async () => {
    if (!confirm) return;
    const { tipo, admin } = confirm;
    if (tipo === "password") {
      const err = validarPassword(nuevaPass);
      if (err) {
        setErrorPassReset(err);
        return;
      }
      setErrorPassReset("");
    }
    setSaving(true);
    try {
      if (tipo === "eliminar") {
        await eliminarAdministradorTienda(admin.id);
        notificar("Administrador eliminado");
      } else if (tipo === "toggle") {
        await cambiarEstadoAdministradorTienda(admin.id, !admin.activo);
        notificar(admin.activo ? "Administrador desactivado" : "Administrador activado");
      } else if (tipo === "password") {
        await restablecerPasswordAdministradorTienda(admin.id, nuevaPass);
        notificar("Contraseña restablecida");
        setNuevaPass("");
        setErrorPassReset("");
      }
      setConfirm(null);
      cargar();
    } catch (e) {
      notificar(e?.message || "No se pudo completar la acción", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtrados = admins.filter((a) => {
    if (filtroEstado === "activo" && !a.activo) return false;
    if (filtroEstado === "inactivo" && a.activo) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (a.nombre || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Administradores</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            Crea y gestiona los administradores de tu tienda y asigna sus permisos individualmente.
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
        >
          <Plus size={16} /> Nuevo Administrador
        </button>
      </div>

      {/* Buscador + filtro */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p>Cargando administradores...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Administrador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Permisos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Creado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Último acceso</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filtrados.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${admin.tipo === "super_admin" ? "bg-gradient-to-br from-rose-500 to-amber-500 text-white" : "bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-gray-400"}`}>
                          {admin.nombre_completo?.[0] || admin.nombre?.[0] || "A"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">{admin.nombre_completo || admin.nombre || "—"}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} /> {admin.email || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {admin.tipo === "super_admin"
                        ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><ShieldCheck size={12} /> Representante</span>
                        : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><User size={12} /> Administrador</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-text-secondary">
                      {admin.tipo === "super_admin" ? "Todos" : `${(admin.permisos || []).length} permisos`}
                    </td>
                    <td className="px-4 py-3"><EstadoBadge activo={admin.activo} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {admin.creado_en ? new Date(admin.creado_en).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={11} className="text-gray-300" />
                      {admin.ultimo_acceso ? new Date(admin.ultimo_acceso).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Nunca"}
                    </td>
                    <td className="px-4 py-3">
                      {admin.tipo === "super_admin" ? (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setConfirm({ tipo: "toggle", admin })} className={`p-1.5 rounded-lg transition-colors ${admin.activo ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" : "text-gray-400 hover:text-emerald-500 hover:bg-gray-50 dark:hover:bg-dark-border"}`} title={admin.activo ? "Desactivar" : "Activar"}>
                            {admin.activo ? <Power size={14} /> : <PowerOff size={14} />}
                          </button>
                          <button onClick={() => abrirEditar(admin)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => { setNuevaPass(""); setConfirm({ tipo: "password", admin }); }} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors" title="Restablecer contraseña">
                            <KeyRound size={14} />
                          </button>
                          <button onClick={() => setConfirm({ tipo: "eliminar", admin })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Users size={40} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
                      <p className="text-sm text-gray-400">No hay administradores que coincidan con la búsqueda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear/editar con permisos */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-modal-overlay">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden animate-modal-content max-h-[90vh] flex flex-col">
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500" />
            <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">
                {editando ? "Editar administrador" : "Nuevo administrador"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-border">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Datos basicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Nombre *</label>
                  <input type="text" value={form.nombre} onChange={(e) => handleChangeCampo("nombre", e.target.value)} className={claseInput(inputCls, !!errors.nombre)} />
                  <FieldError mensaje={errors.nombre} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Apellido</label>
                  <input type="text" value={form.apellido} onChange={(e) => handleChangeCampo("apellido", e.target.value)} className={claseInput(inputCls, !!errors.apellido)} />
                  <FieldError mensaje={errors.apellido} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Correo (inicio de sesión) *</label>
                  <input type="email" value={form.email} onChange={(e) => handleChangeCampo("email", e.target.value)} className={claseInput(inputCls, !!errors.email)} disabled={!!editando} />
                  <FieldError mensaje={errors.email} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">
                    {editando ? "Nueva contraseña (opcional)" : "Contraseña *"}
                  </label>
                  <input type="password" value={form.password} onChange={(e) => handleChangeCampo("password", e.target.value)} className={claseInput(inputCls, !!errors.password)} placeholder={editando ? "••••••••" : ""} />
                  <FieldError mensaje={errors.password} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Teléfono *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.telefono}
                    onChange={(e) => handleChangeCampo("telefono", soloDigitos(e.target.value).slice(0, 10))}
                    className={claseInput(inputCls, !!errors.telefono)}
                    placeholder="3001234567"
                  />
                  <FieldError mensaje={errors.telefono} />
                </div>
              </div>

              {/* Permisos del administrador */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-dark-text mb-1">Permisos del administrador</h4>
                <p className="text-xs text-gray-400 mb-4">Activa o desactiva cada permiso de forma independiente.</p>
                <div className="space-y-5">
                  {/* Selección rápida "Todos" */}
                  <TodosSwitch activo={todosActivo} onChange={toggleTodos} />
                  {SECCIONES.map((seccion) => {
                    const gruposSeccion = (catalogo || []).filter((g) => seccion.modulos.includes(g.modulo));
                    if (gruposSeccion.length === 0) return null;
                    const SeccionIcono = seccion.icon;
                    return (
                      <div key={seccion.id} className="rounded-xl border border-gray-100 dark:border-dark-border overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-dark-border flex items-center gap-2">
                          <SeccionIcono size={14} className="text-rose-500" />
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary">{seccion.label}</p>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-dark-border/60">
                          {gruposSeccion.map((grupo) => (
                            <div key={grupo.modulo}>
                              <div className="px-4 pt-2.5 pb-1 bg-white dark:bg-dark-card">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{MODULO_LABELS[grupo.modulo] || grupo.modulo}</p>
                              </div>
                              <div className="divide-y divide-gray-50 dark:divide-dark-border/60">
                                {grupo.permisos.map((permiso) => (
                                  <div key={permiso.codigo} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-700 dark:text-dark-text">{permiso.nombre}</p>
                                      {permiso.descripcion && <p className="text-xs text-gray-400 truncate">{permiso.descripcion}</p>}
                                    </div>
                                    <PermisoSwitch activo={!!permisosSel[permiso.codigo]} onChange={() => togglePermiso(permiso.codigo)} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <FieldError mensaje={errors.permisos} />
              </div>

              {errorForm && <p className="text-sm text-red-500">{errorForm}</p>}
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear administrador"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmaciones */}
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={ejecutarConfirm}
        confirmDisabled={saving}
        type={confirm?.tipo === "toggle" ? "info" : "danger"}
        title={
          confirm?.tipo === "eliminar" ? "Eliminar administrador" :
          confirm?.tipo === "toggle" ? (confirm.admin?.activo ? "Desactivar administrador" : "Activar administrador") :
          "Restablecer contraseña"
        }
        message={
          confirm?.tipo === "eliminar" ? `¿Seguro que deseas eliminar a ${confirm.admin?.nombre_completo || confirm.admin?.nombre}? Esta acción no se puede deshacer.` :
          confirm?.tipo === "toggle" ? `¿Deseas ${confirm.admin?.activo ? "desactivar" : "activar"} a ${confirm.admin?.nombre_completo || confirm.admin?.nombre}?` :
          ""
        }
        confirmText={
          confirm?.tipo === "password" ? "Restablecer" :
          confirm?.tipo === "toggle" ? (confirm.admin?.activo ? "Desactivar" : "Activar") :
          "Eliminar"
        }
      />
      {confirm?.tipo === "password" && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 animate-modal-overlay">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden animate-modal-content">
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-amber-500" />
            <div className="p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-text mb-3">Nueva contraseña para {confirm.admin?.nombre}</h3>
              <input
                type="password"
                value={nuevaPass}
                onChange={(e) => { setNuevaPass(e.target.value); setErrorPassReset(""); }}
                placeholder="Mínimo 8 caracteres"
                className={claseInput(inputCls, !!errorPassReset)}
                autoFocus
              />
              <FieldError mensaje={errorPassReset} />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setConfirm(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={ejecutarConfirm}
                  disabled={saving || !nuevaPass}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Restablecer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
