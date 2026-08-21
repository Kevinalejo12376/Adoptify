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

// Nombre corto para las opciones del selector (sin card por tipo de reporte)
const NOMBRES_CORTOS = {
  usuarios: "Usuarios",
  mascotas: "Mascotas",
  refugios: "Refugios",
  tiendas: "Tiendas",
  productos: "Productos",
  pedidos: "Pedidos",
  solicitudes: "Solicitudes",
  pqrs: "PQRS",
  reportes_contenido: "Denuncias",
  estadisticas: "Estadísticas",
};

// Indicadores que incluye el "Reporte de estadísticas generales" (se muestra de
// forma organizada al seleccionarlo, sin añadir filtros que la API no soporta).
const INDICADORES_ESTADISTICAS = [
  { icono: Users, etiqueta: "Usuarios registrados" },
  { icono: PawPrint, etiqueta: "Mascotas registradas" },
  { icono: Building2, etiqueta: "Refugios" },
  { icono: Store, etiqueta: "Tiendas aliadas" },
  { icono: Package, etiqueta: "Productos" },
  { icono: ShoppingCart, etiqueta: "Pedidos" },
  { icono: ClipboardList, etiqueta: "Solicitudes de adopción" },
  { icono: HelpCircle, etiqueta: "PQRS" },
  { icono: Flag, etiqueta: "Denuncias de contenido" },
];

const PASOS = [
  { n: 1, titulo: "Tipo de reporte" },
  { n: 2, titulo: "Configuración" },
  { n: 3, titulo: "Formato" },
];

export default function AdminReportesDescargables() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tipoSel, setTipoSel] = useState(null);
  const [formato, setFormato] = useState("pdf");
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await obtenerTiposReportes();
      setTipos(data);
      setTipoSel((prev) => prev || data[0]?.codigo || null);
    } catch (e) {
      setError(e?.message || "Error al cargar los tipos de reporte");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const tipoActual = tipos.find((t) => t.codigo === tipoSel) || null;
  const IconoTipo = tipoActual ? (ICONOS[tipoActual.codigo] || FileText) : FileText;
  const gradienteTipo = tipoActual
    ? (COLORES[tipoActual.codigo] || "from-rose-500 to-amber-500")
    : "from-rose-500 to-amber-500";
  // Paso "activo" del flujo: 1 si aún no hay tipo; si hay tipo, el 2 y 3.
  const pasoActivo = tipoSel ? 2 : 1;

  const generar = async () => {
    if (!tipoSel || descargando) return;
    setDescargando(true);
    setMensaje(null);
    try {
      const { nombre } = await descargarReporte(tipoSel, formato);
      setMensaje({
        tipo: "ok",
        texto: `Archivo "${nombre}" descargado correctamente.`,
      });
    } catch (e) {
      setMensaje({ tipo: "error", texto: e?.message || "No se pudo generar el reporte." });
    } finally {
      setDescargando(false);
    }
  };

  const FormatoBtn = ({ valor, icono: Icono, titulo, desc }) => {
    const activo = formato === valor;
    const color = valor === "pdf" ? "bg-rose-500" : "bg-emerald-500";
    return (
      <button
        type="button"
        onClick={() => setFormato(valor)}
        className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all duration-200 ${
          activo
            ? "border-rose-500 bg-rose-50/60 dark:bg-rose-500/10 shadow-sm"
            : "border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40 hover:border-rose-300 dark:hover:border-rose-500/40"
        }`}
      >
        <span className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
          <Icono size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-gray-800 dark:text-dark-text">{titulo}</span>
          <span className="block text-xs text-gray-400 dark:text-dark-text-secondary">{desc}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center">
            <FileDown size={22} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Centro de generación de reportes</h1>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
              Configura y descarga reportes en PDF o Excel directamente a tu dispositivo
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes de estado */}
      {mensaje && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm animate-fade-in ${
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
        <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-dark-text-secondary">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-3" />
          <p className="text-sm font-medium">Cargando tipos de reporte disponibles...</p>
        </div>
      ) : (
        <div className="w-full">
          <div className="bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
            {/* Barra de pasos */}
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {PASOS.map((p, i) => (
                  <div key={p.n} className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
                        i + 1 <= pasoActivo
                          ? "bg-rose-500 text-white"
                          : "bg-gray-200 dark:bg-dark-border text-gray-500 dark:text-dark-text-secondary"
                      }`}
                    >
                      {p.n}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        i + 1 <= pasoActivo
                          ? "text-gray-800 dark:text-dark-text"
                          : "text-gray-400 dark:text-dark-text-secondary"
                      }`}
                    >
                      {p.titulo}
                    </span>
                    {i < PASOS.length - 1 && (
                      <span className="hidden sm:block w-5 h-px bg-gray-200 dark:bg-dark-border" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-7">
              {/* Paso 1 — Tipo de reporte */}
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-dark-text">Tipo de reporte</h2>
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-0.5">
                  Selecciona el reporte que deseas generar
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-3">
                  {tipos.map((t) => {
                    const Icono = ICONOS[t.codigo] || FileText;
                    const activo = tipoSel === t.codigo;
                    return (
                      <button
                        key={t.codigo}
                        type="button"
                        onClick={() => setTipoSel(t.codigo)}
                        aria-pressed={activo}
                        className={`group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-all duration-200 ${
                          activo
                            ? "border-rose-500 bg-rose-50/60 dark:bg-rose-500/10 shadow-sm"
                            : "border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40 hover:border-rose-300 dark:hover:border-rose-500/40"
                        }`}
                      >
                        <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${COLORES[t.codigo] || "from-rose-500 to-amber-500"} flex items-center justify-center text-white shadow-sm`}>
                          <Icono size={18} />
                        </span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-dark-text leading-tight">
                          {NOMBRES_CORTOS[t.codigo] || t.titulo}
                        </span>
                        {activo && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                            <CheckCircle2 size={11} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200 dark:border-dark-border" />

              {/* Paso 2 — Configuración */}
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-dark-text">Configuración del reporte</h2>
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-0.5">
                  Revisa qué incluye el reporte seleccionado
                </p>

                {tipoActual ? (
                  <>
                    <div className="mt-3 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl border border-gray-100 dark:border-dark-border p-4 flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradienteTipo} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                        <IconoTipo size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-dark-text">{tipoActual.titulo}</h3>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5 leading-relaxed">
                          {tipoActual.descripcion}
                        </p>
                      </div>
                    </div>

                    {tipoActual.codigo === "estadisticas" && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wide mb-2">
                          Este reporte incluye los siguientes indicadores
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {INDICADORES_ESTADISTICAS.map((ind) => (
                            <div
                              key={ind.etiqueta}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border"
                            >
                              <ind.icono size={14} className="text-rose-500 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-700 dark:text-dark-text">{ind.etiqueta}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-dark-text-secondary mt-3">
                    Selecciona un tipo de reporte para ver su configuración.
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200 dark:border-dark-border" />

              {/* Paso 3 — Formato */}
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-dark-text">Formato de descarga</h2>
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-0.5">
                  Elige el formato en el que se generará el archivo
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <FormatoBtn valor="pdf" icono={FileText} titulo="PDF" desc="Documento listo para imprimir" />
                  <FormatoBtn valor="excel" icono={FileSpreadsheet} titulo="Excel" desc="Hoja de cálculo editable" />
                </div>
              </div>

              {/* Acción principal */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-gray-100 dark:border-dark-border pt-5">
                <button
                  type="button"
                  onClick={generar}
                  disabled={!tipoSel || descargando}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-sm shadow-md shadow-rose-500/20 hover:from-rose-600 hover:to-amber-600 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {descargando ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Generando reporte...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Generar y descargar reporte
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 dark:text-dark-text-secondary sm:ml-2">
                  {tipoActual
                    ? `Listo: ${tipoActual.titulo} en formato ${formato === "pdf" ? "PDF" : "Excel"}.`
                    : "Selecciona un tipo de reporte para continuar."}
                </p>
              </div>
            </div>
          </div>

          {/* Nota informativa */}
          <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 text-blue-700 text-xs border border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
            <Download size={15} className="flex-shrink-0 mt-0.5" />
            <span>
              Los archivos se generan de forma segura en el servidor, se descargan
              directamente a tu dispositivo y no se almacenan copias permanentes en él.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
