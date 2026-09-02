import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X } from "lucide-react";
import DataTable from "../../components/admin/DataTable";
import { listarReportes, actualizarReporte } from "../../api/admin";

const TIPOS = { post: "Post", comentario: "Comentario", producto: "Producto", usuario: "Usuario", mascota: "Mascota" };

export default function AdminReportes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await listarReportes()); }
    catch (e) { setError(e?.message || "Error al cargar reportes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (id, estado) => {
    try { await actualizarReporte(id, { estado }); await cargar(); }
    catch (e) { setError(e?.message); }
  };

  const columnas = [
    { key: "tipo_objeto", titulo: "Tipo", render: (v) => TIPOS[v] || v, ordenable: true },
    { key: "motivo", titulo: "Motivo", ordenable: false },
    { key: "estado", titulo: "Estado", tipo: "badge", ordenable: true },
    { key: "creado_en", titulo: "Fecha", tipo: "fecha", ordenable: true },
    {
      key: "acciones", titulo: "Acciones", tipo: "render", ordenable: false, className: "text-right",
      render: (_, f) => f.estado === "pendiente" ? (
        <div className="flex gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); cambiarEstado(f.id, "revisado"); }}
            className="w-8 h-8 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors" title="Marcar revisado">
            <Check size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); cambiarEstado(f.id, "descartado"); }}
            className="w-8 h-8 flex items-center justify-center text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="Descartar">
            <X size={14} />
          </button>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Reportes</h1>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Contenido reportado por usuarios</p>
      </div>
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" /><p>Cargando reportes...</p>
        </div>
      ) : (
        <DataTable columnas={columnas} datos={items} placeholder="Buscar reportes..." emptyMessage="No hay reportes registrados" />
      )}
    </div>
  );
}
