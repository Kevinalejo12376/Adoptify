import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import DataTable from "../../components/admin/DataTable";
import ConfirmModal from "../../components/admin/ConfirmModal";
import { listarForoAdmin, eliminarPostAdmin } from "../../api/admin";

export default function AdminForo() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPosts(await listarForoAdmin()); }
    catch (e) { setError(e?.message || "Error al cargar publicaciones"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    try { await eliminarPostAdmin(aEliminar.id); await cargar(); }
    catch (e) { setError(e?.message); }
    finally { setAEliminar(null); }
  };

  const columnas = [
    { key: "titulo", titulo: "Título", ordenable: true },
    { key: "autor", titulo: "Autor", ordenable: true },
    { key: "categoria", titulo: "Categoría", render: (v) => v || "—", ordenable: true },
    { key: "vistas", titulo: "Vistas", ordenable: true },
    { key: "creado_en", titulo: "Fecha", tipo: "fecha", ordenable: true },
    {
      key: "acciones", titulo: "", tipo: "render", ordenable: false, className: "text-right",
      render: (_, f) => (
        <button onClick={(e) => { e.stopPropagation(); setAEliminar(f); }}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Foro / Comunidad</h1>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Modera las publicaciones de la comunidad</p>
      </div>
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" /><p>Cargando publicaciones...</p>
        </div>
      ) : (
        <DataTable columnas={columnas} datos={posts} placeholder="Buscar publicaciones..." emptyMessage="No hay publicaciones en el foro" />
      )}
      <ConfirmModal isOpen={!!aEliminar} onClose={() => setAEliminar(null)} onConfirm={confirmarEliminar}
        titulo="Eliminar publicación" descripcion={`¿Eliminar "${aEliminar?.titulo}"?`} variant="danger" confirmText="Eliminar" icon={Trash2} />
    </div>
  );
}
