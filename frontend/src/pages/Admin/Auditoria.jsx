import React, { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import DataTable from "../../components/admin/DataTable";
import { listarAuditoria } from "../../api/admin";

const ACCIONES = {
  registro: "Registro de usuario",
  crear_usuario: "Crear usuario (admin)",
  crear: "Crear",
  crear_solicitud: "Nueva solicitud",
  eliminar: "Eliminar",
  actualizar: "Actualizar",
};

export default function AdminAuditoria() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await listarAuditoria()); }
    catch (e) { setError(e?.message || "Error al cargar auditoría"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const columnas = [
    { key: "usuario", titulo: "Usuario", ordenable: true },
    { key: "accion", titulo: "Acción", render: (v) => ACCIONES[v] || v, ordenable: true },
    { key: "entidad", titulo: "Entidad", render: (v) => v || "—", ordenable: true },
    { key: "detalle", titulo: "Detalle", render: (v) => v || "—", ordenable: false },
    { key: "creado_en", titulo: "Fecha", tipo: "fecha", ordenable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Auditoría</h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Registro de acciones del sistema (últimas 200)</p>
        </div>
        <button onClick={cargar} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-border rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" /><p>Cargando auditoría...</p>
        </div>
      ) : (
        <DataTable columnas={columnas} datos={items} placeholder="Buscar en auditoría..." emptyMessage="No hay registros de auditoría" />
      )}
    </div>
  );
}
