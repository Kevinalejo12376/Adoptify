import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Loader2, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import DataTable from "../../components/admin/DataTable";
import ConfirmModal from "../../components/admin/ConfirmModal";
import MascotaDetalleModal from "./components/MascotaDetalleModal";
import { listarMascotas, eliminarMascota } from "../../api/admin";

function Toast({ mensaje, tipo, onClose }) {
  useEffect(() => {
    if (mensaje) {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [mensaje, onClose]);
  if (!mensaje) return null;
  const cls = tipo === "error"
    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
    : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400";
  return (
    <div className="fixed bottom-6 right-6 z-[120] animate-slide-up-fade">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border shadow-lg backdrop-blur-sm ${cls}`}>
        {tipo === "error" ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
        <p className="text-sm font-medium">{mensaje}</p>
      </div>
    </div>
  );
}

export default function AdminMascotas() {
  const [mascotas, setMascotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [verDetalle, setVerDetalle] = useState(null);
  const [toast, setToast] = useState(null);

  const notificar = (mensaje, tipo = "success") => setToast({ mensaje, tipo });

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
      // Soft delete: desactiva la mascota conservando su historial.
      await eliminarMascota(aEliminar.id);
      notificar("Mascota eliminada correctamente.");
      await cargar();
    } catch (e) {
      notificar(e?.message || "No se pudo eliminar la mascota", "error");
    } finally {
      setAEliminar(null);
    }
  };

  const columnas = [
    { key: "nombre", titulo: "Nombre", tipo: "avatar", nombreAvatar: (f) => f.nombre, ordenable: true },
    { key: "tipo", titulo: "Especie", ordenable: true, cellClassName: "text-gray-500 dark:text-dark-text-secondary" },
    { key: "raza", titulo: "Raza", ordenable: true, cellClassName: "text-gray-500 dark:text-dark-text-secondary" },
    { key: "edad", titulo: "Edad", ordenable: true },
    { key: "refugio", titulo: "Refugio", ordenable: true, render: (v) => v || "—", cellClassName: "text-gray-500 dark:text-dark-text-secondary" },
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
            onClick={(e) => { e.stopPropagation(); setVerDetalle(fila); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all shadow-sm shadow-rose-100"
            title="Ver más"
          >
            <Eye size={13} /> Ver más
          </button>
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
        <div className="p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-dark-text-secondary">
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
        descripcion={`¿Eliminar a "${aEliminar?.nombre}"? Se desactiva mediante soft delete conservando su historial.`}
        variant="danger"
        confirmText="Eliminar"
        icon={Trash2}
      />

      {verDetalle && (
        <MascotaDetalleModal
          mascotaId={verDetalle.id}
          onClose={() => setVerDetalle(null)}
          onActualizado={cargar}
          notificar={notificar}
        />
      )}

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onClose={() => setToast(null)} />
    </div>
  );
}
