import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, FileSpreadsheet, Download, Loader2, FileDown,
  Users, PawPrint, Building2, Store, Package, ShoppingCart,
  ClipboardList, HelpCircle, Flag, BarChart3, CheckCircle2, AlertCircle,
} from "lucide-react";
import { obtenerTiposReportes, descargarReporte } from "../../api/reportesDescarga";

// Icono por tipo de reporte para una mejor identificación visual
const ICONOS = {
  usuarios: Users,
  mascotas: PawPrint,
  refugios: Building2,
  tiendas: Store,
  productos: Package,
  pedidos: ShoppingCart,
  solicitudes: ClipboardList,
  pqrs: HelpCircle,
  reportes_contenido: Flag,
  estadisticas: BarChart3,
};

const COLORES = {
  usuarios: "from-rose-500 to-pink-500",
  mascotas: "from-amber-500 to-orange-500",
  refugios: "from-emerald-500 to-teal-500",
  tiendas: "from-blue-500 to-indigo-500",
  productos: "from-violet-500 to-purple-500",
  pedidos: "from-cyan-500 to-sky-500",
  solicitudes: "from-fuchsia-500 to-pink-500",
  pqrs: "from-orange-500 to-amber-500",
  reportes_contenido: "from-red-500 to-rose-500",
  estadisticas: "from-lime-500 to-emerald-500",
};

export default function AdminReportesDescargables() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [descargando, setDescargando] = useState(null); // "codigo:formato"
  const [mensaje, setMensaje] = useState(null); // {tipo: "ok"|"error", texto}

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setTipos(await obtenerTiposReportes());
    } catch (e) {
      setError(e?.message || "Error al cargar los tipos de reporte");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const generar = async (codigo, formato) => {
    const clave = `${codigo}:${formato}`;
    setDescargando(clave);
    setMensaje(null);
    try {
      const { nombre } = await descargarReporte(codigo, formato);
      setMensaje({
        tipo: "ok",
        texto: `Archivo "${nombre}" descargado correctamente.`,
      });
    } catch (e) {
      setMensaje({ tipo: "error", texto: e?.message || "No se pudo generar el reporte." });
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <FileDown size={20} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Reportes descargables</h1>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
              Genera y descarga reportes en PDF o Excel directamente a tu dispositivo
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes de estado */}
      {mensaje && (
        <div
          className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${
            mensaje.tipo === "ok"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
              : "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
          }`}
        >
          {mensaje.tipo === "ok" ? (
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p className="text-sm font-medium">Cargando reportes disponibles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tipos.map((t) => {
            const Icono = ICONOS[t.codigo] || FileText;
            const gradiente = COLORES[t.codigo] || "from-rose-500 to-amber-500";
            const pdfActivo = descargando === `${t.codigo}:pdf`;
            const excelActivo = descargando === `${t.codigo}:excel`;
            return (
              <div
                key={t.codigo}
                className="group bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradiente} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                    <Icono size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-dark-text leading-tight">{t.titulo}</h3>
                    <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-0.5 line-clamp-2">
                      {t.descripcion}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex gap-2">
                  <button
                    onClick={() => generar(t.codigo, "pdf")}
                    disabled={!!descargando}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {pdfActivo ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                    Generar PDF
                  </button>
                  <button
                    onClick={() => generar(t.codigo, "excel")}
                    disabled={!!descargando}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {excelActivo ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
                    Generar Excel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nota informativa */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 text-blue-700 text-xs border border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
        <Download size={15} className="flex-shrink-0 mt-0.5" />
        <span>
          Los archivos se generan de forma segura en el servidor, se descargan
          directamente a tu dispositivo y no se almacenan copias permanentes en él.
        </span>
      </div>
    </div>
  );
}
