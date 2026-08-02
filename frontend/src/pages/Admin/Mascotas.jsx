import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Loader2, PawPrint } from "lucide-react";
import DataTable from "../../components/admin/DataTable";
import Badge from "../../components/admin/Badge";
import ConfirmModal from "../../components/admin/ConfirmModal";
import { listarMascotas, eliminarMascota } from "../../api/admin";

export default function AdminMascotas() {
  const [mascotas, setMascotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarMascotas();
      // 'estado' viene como codigo (disponible/en_proceso/adoptado) para el Badge
      setMascotas(data.map((m) => ({ ...m, estado: m.estado || "disponible" })));
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las mascotas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    try {
      await eliminarMascota(aEliminar.id);
      await cargar();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar la mascota");
    } finally {
      setAEliminar(null);
    }
  };

  const columnas = [
    { key: "nombre", titulo: "Nombre", tipo: "avatar", nombreAvatar: (f) => f.nombre, ordenable: true },
    { key: "tipo", titulo: "Especie", ordenable: true },
    { key: "raza", titulo: "Raza", ordenable: true },
    { key: "edad", titulo: "Edad", ordenable: true },
    { key: "refugio", titulo: "Refugio", ordenable: true, render: (v) => v || "—" },
    { key: "estado", titulo: "Estado", tipo: "badge", ordenable: true },
    { key: "creado_en", titulo: "Registro", tipo: "fecha", ordenable: true },
    {
      key: "acciones",
      titulo: "Acciones",
      tipo: "render",
      ordenable: false,
      className: "text-right",
      render: (_, fila) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setAEliminar(fila); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Gestión de Mascotas</h1>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
          Supervisa las mascotas publicadas por los refugios
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
          <p>Cargando mascotas...</p>
        </div>
      ) : (
        <DataTable
          columnas={columnas}
          datos={mascotas}
          placeholder="Buscar mascotas..."
          emptyMessage="No hay mascotas registradas"
        />
      )}

      <ConfirmModal
        isOpen={!!aEliminar}
        onClose={() => setAEliminar(null)}
        onConfirm={confirmarEliminar}
        titulo="Eliminar mascota"
        descripcion={`¿Eliminar a "${aEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        variant="danger"
        confirmText="Eliminar"
        icon={Trash2}
      />
    </div>
  );
}
