import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import DataTable from "../../components/admin/DataTable";
import { listarPedidos } from "../../api/admin";

export default function AdminPedidos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await listarPedidos()); }
    catch (e) { setError(e?.message || "Error al cargar pedidos"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const columnas = [
    { key: "id", titulo: "#", ordenable: true },
    { key: "usuario_id", titulo: "Usuario ID", ordenable: true },
    { key: "estado", titulo: "Estado", tipo: "badge", ordenable: true },
    {
      key: "total", titulo: "Total", ordenable: true,
      render: (v) => `$${Number(v || 0).toLocaleString("es-CO")}`,
    },
    { key: "creado_en", titulo: "Fecha", tipo: "fecha", ordenable: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Pedidos</h1>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Historial de pedidos realizados en la plataforma</p>
      </div>
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" /><p>Cargando pedidos...</p>
        </div>
      ) : (
        <DataTable columnas={columnas} datos={items} placeholder="Buscar pedidos..." emptyMessage="No hay pedidos registrados" />
      )}
    </div>
  );
}
