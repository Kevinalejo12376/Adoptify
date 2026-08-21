import { useState, useEffect, useCallback, useMemo } from "react";
import {
  History, Search, Loader2, Filter, X, ShieldCheck, User, Calendar,
  Package, ShoppingCart, Settings, HeartHandshake, MessageSquare, Trash2,
} from "lucide-react";
import { historialActividadTienda } from "../../api/tienda";

// Mapa de tipos de accion para el filtro y las insignias.
const TIPOS_ACCION = {
  "producto.crear": { label: "Producto creado", icon: Package, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  "producto.editar": { label: "Producto editado", icon: Package, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  "producto.eliminar": { label: "Producto eliminado", icon: Trash2, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  "inventario.stock": { label: "Stock modificado", icon: Package, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  "admin.crear": { label: "Administrador creado", icon: User, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  "admin.editar": { label: "Administrador editado", icon: User, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  "admin.eliminar": { label: "Administrador eliminado", icon: Trash2, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  "admin.estado": { label: "Administrador activado/desactivado", icon: User, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
  "admin.permisos": { label: "Permisos modificados", icon: ShieldCheck, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  "admin.password": { label: "Contraseña restablecida", icon: ShieldCheck, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
  "tienda.editar": { label: "Información de la tienda", icon: Settings, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-500/10" },
  "tienda.imagen": { label: "Imagen de la tienda", icon: Settings, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-500/10" },
  "tienda.representante": { label: "Representante", icon: User, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
  "configuracion.password": { label: "Contraseña de acceso", icon: Settings, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-500/10" },
  "pedido.estado": { label: "Estado de pedido", icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  "donacion.crear": { label: "Donación realizada", icon: HeartHandshake, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
  "pqrs.crear": { label: "PQRS creada", icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  "pqrs.responder": { label: "PQRS respondida", icon: MessageSquare, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-500/10" },
};

const inputCls = "px-3 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all";

function RolBadge({ rol }) {
  const esRepresentante = rol === "Representante";
  return esRepresentante ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
      <ShieldCheck size={12} /> Representante
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
      <User size={12} /> {rol === "Sistema" ? "Sistema" : "Administrador"}
    </span>
  );
}

function TipoAccionBadge({ tipo }) {
  const config = TIPOS_ACCION[tipo] || {
    label: tipo || "Actividad",
    icon: History,
    color: "text-gray-500",
    bg: "bg-gray-50 dark:bg-gray-500/10",
  };
  const Icono = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.color}`}>
      <Icono size={12} />
      {config.label}
    </span>
  );
}

export default function StoreActividad() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        tipo_accion: filtroTipo || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        limite: 500,
      };
      const data = await historialActividadTienda(params);
      setItems(data || []);
    } catch (e) {
      setError(e?.message || "No se pudo cargar el historial de actividad");
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, fechaDesde, fechaHasta]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  // Usuarios unicos presentes en el historial (para el filtro por usuario).
  const usuarios = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      if (it.usuario_id && it.usuario) map.set(it.usuario_id, it.usuario);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const filtrados = useMemo(() => {
    let lista = items;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter((it) =>
        [it.usuario, it.accion, it.elemento, it.detalle, TIPOS_ACCION[it.tipo_accion]?.label]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    if (filtroUsuario) {
      lista = lista.filter((it) => String(it.usuario_id) === String(filtroUsuario));
    }
    return lista;
  }, [items, busqueda, filtroUsuario]);

  const limpiar = () => {
    setBusqueda("");
    setFiltroTipo("");
    setFiltroUsuario("");
    setFechaDesde("");
    setFechaHasta("");
  };

  const hayFiltros = busqueda || filtroTipo || filtroUsuario || fechaDesde || fechaHasta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
          <History size={20} className="text-rose-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Historial de actividad</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">
            Acciones importantes realizadas dentro de la tienda.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20 flex items-center gap-2">
          <Filter size={15} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar actividad..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>

          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className={`${inputCls} w-full pl-9 appearance-none cursor-pointer`}
            >
              <option value="">Todas las acciones</option>
              {Object.entries(TIPOS_ACCION).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className={`${inputCls} w-full appearance-none cursor-pointer`}
          >
            <option value="">Todos los usuarios</option>
            {usuarios.map(([id, nombre]) => (
              <option key={id} value={id}>{nombre}</option>
            ))}
          </select>

          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className={`${inputCls} w-full pl-9`}
              title="Desde"
            />
          </div>

          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className={`${inputCls} w-full pl-9`}
              title="Hasta"
            />
          </div>
        </div>

        {hayFiltros && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={limpiar}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            >
              <X size={14} /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p>Cargando historial...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Acción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Elemento afectado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Detalle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Fecha y hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {filtrados.map((it) => {
                  const fecha = it.creado_en ? new Date(it.creado_en) : null;
                  return (
                    <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${it.rol === "Representante" ? "bg-gradient-to-br from-rose-500 to-amber-500 text-white" : "bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-gray-400"}`}>
                            {(it.usuario || "S")[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">{it.usuario || "Sistema"}</p>
                            <div className="mt-0.5"><RolBadge rol={it.rol} /></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><TipoAccionBadge tipo={it.tipo_accion} /></td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-dark-text">{it.elemento || "—"}</p>
                        {it.elemento_tipo && (
                          <p className="text-xs text-gray-400 capitalize">{it.elemento_tipo}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-text-secondary max-w-[220px]">
                        <p className="truncate" title={it.detalle || ""}>{it.detalle || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {fecha ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-dark-text-secondary">
                            <Calendar size={11} className="text-gray-300 dark:text-gray-600" />
                            <div>
                              <p>{fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}</p>
                              <p className="text-gray-400">{fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <History size={40} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
                      <p className="text-sm text-gray-400">
                        {hayFiltros
                          ? "No hay actividades que coincidan con los filtros seleccionados."
                          : "Aún no hay actividad registrada en la tienda."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
