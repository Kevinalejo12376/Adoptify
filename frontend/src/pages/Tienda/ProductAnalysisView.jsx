import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Camera, Sparkles, CheckCircle2, Loader2,
  Scan, Image, Package,
} from "lucide-react";
import useProductAnalysis from "../../hooks/useProductAnalysis";

// Pantalla de resumen cuando el análisis termina
function AnalysisSummary({ resultadoIA, fotos, onContinuar, onReintentar }) {
  const navigate = useNavigate();
  const datos = resultadoIA?.datos || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden">
        {/* Header con icono de éxito */}
        <div className="pt-8 pb-6 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text font-display">
            Producto analizado correctamente
          </h2>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            La inteligencia artificial ha analizado las 4 imágenes exitosamente.
          </p>
        </div>

        {/* Estadísticas */}
        <div className="px-6 grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-border rounded-xl">
            <Image size={20} className="mx-auto text-rose-500 mb-1" />
            <p className="text-xs font-bold text-gray-900 dark:text-dark-text">{fotos.filter(Boolean).length}</p>
            <p className="text-[10px] text-gray-500">Imágenes</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-border rounded-xl">
            <Sparkles size={20} className="mx-auto text-amber-500 mb-1" />
            <p className="text-xs font-bold text-gray-900 dark:text-dark-text">{datos.categoria || "—"}</p>
            <p className="text-[10px] text-gray-500">Categoría</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-dark-border rounded-xl">
            <Package size={20} className="mx-auto text-blue-500 mb-1" />
            <p className="text-xs font-bold text-gray-900 dark:text-dark-text">{datos.tipo_mascota || "—"}</p>
            <p className="text-[10px] text-gray-500">Mascota</p>
          </div>
        </div>

        {/* Resumen de datos detectados */}
        <div className="px-6 mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Datos detectados</h3>
          <div className="space-y-2.5">
            {[
              { label: "Nombre", value: datos.nombre },
              { label: "Marca", value: datos.marca },
              { label: "Categoría", value: datos.categoria },
              { label: "Especie de mascota", value: datos.tipo_mascota },
              { label: "Peso", value: datos.peso || "—" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-dark-border last:border-0">
                <span className="text-sm text-gray-500 dark:text-dark-text-secondary">{item.label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                  {item.value || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Miniaturas de imágenes */}
        <div className="px-6 mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Imágenes capturadas</h3>
          <div className="grid grid-cols-4 gap-2">
            {["Frontal", "Trasera", "Izquierda", "Derecha"].map((label, i) => (
              <div key={i} className="relative">
                <div className="aspect-square rounded-xl bg-gray-100 dark:bg-dark-border overflow-hidden">
                  {fotos[i] ? (
                    <img
                      src={fotos[i]}
                      alt={label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={16} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-center text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={onContinuar}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
          >
            Continuar
          </button>
          <button
            onClick={onReintentar}
            className="w-full py-3 text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-50 dark:bg-dark-border rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border/80 transition-colors"
          >
            Volver a capturar
          </button>
        </div>
      </div>
    </div>
  );
}

// Pantalla de confirmación de foto
function PhotoConfirmation({ foto, posicionInfo, onConfirmar, onReCapturar }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-dark-card rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Foto en alta resolución */}
        <div className="relative bg-black">
          <img src={foto} alt={posicionInfo?.label} className="w-full aspect-[4/3] object-contain" />
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white text-sm font-bold rounded-full">
              {posicionInfo?.label}
            </span>
          </div>
        </div>

        {/* Información */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display text-center">
            ¿La imagen se ve correctamente?
          </h3>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary text-center mt-2">
            Verifica que el producto esté completo, enfocado y sea claramente visible antes de continuar.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onReCapturar}
              className="flex-1 py-3 px-4 text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors inline-flex items-center justify-center gap-2"
            >
              🔄 Volver a capturar
            </button>
            <button
              onClick={onConfirmar}
              className="flex-1 py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all inline-flex items-center justify-center gap-2"
            >
              ✅ Confirmar imagen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vista principal de análisis
export default function ProductAnalysisView() {
  const navigate = useNavigate();
  const {
    estado, fotos, posicionInfo, progreso, fotoPendiente,
    mensajeActual, resultadoIA, error, camaraActiva,
    iniciar, reiniciar, limpiar, detenerCamara,
    capturar, confirmarFoto, recapturar,
    POSICIONES,
  } = useProductAnalysis();

  const [mostrarResumen, setMostrarResumen] = useState(false);

  useEffect(() => {
    iniciar();
    return () => {
      detenerCamara();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (estado === "completado" && resultadoIA) {
      // Detener la cámara al mostrar el resumen para liberar recursos
      detenerCamara();
      setMostrarResumen(true);
    }
  }, [estado, resultadoIA, detenerCamara]);

  const handleContinuar = async () => {
    await limpiar();
    // Guardar datos en sessionStorage para que el formulario los recoja
    sessionStorage.setItem("adoptify_ai_analysis", JSON.stringify({
      resultadoIA,
      fotos,
    }));
    navigate("/tienda/productos/nuevo", { state: { fromAI: true, resultadoIA, fotos } });
  };

  const handleReintentar = () => {
    setMostrarResumen(false);
    reiniciar();
  };

  const handleVolver = async () => {
    await limpiar();
    navigate("/tienda/productos");
  };

  // Pantalla de resumen
  if (mostrarResumen && resultadoIA) {
    return (
      <AnalysisSummary
        resultadoIA={resultadoIA}
        fotos={fotos}
        onContinuar={handleContinuar}
        onReintentar={handleReintentar}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <button
            onClick={handleVolver}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text transition-colors"
          >
            <ArrowLeft size={18} />
            Volver
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-dark-text font-display">
            Analizar producto con IA
          </h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Contenido */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Vista de cámara */}
        <div className="flex-1 relative bg-black flex items-center justify-center min-h-[50vh] lg:min-h-0">
          {/* Contenedor de la cámara */}
          <div className="relative w-full max-w-lg mx-auto aspect-[4/3]">
            {/* Elemento de la cámara */}
            <div
              id="product-analysis-camera"
              className="w-full h-full"
            />

            {/* Marco guía para posicionar el producto */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-[15%] border-2 border-dashed border-white/40 rounded-2xl">
                {/* Esquinas del marco */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-rose-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-rose-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-rose-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-rose-400 rounded-br" />

                {/* Texto guía */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] text-white/60 bg-black/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Coloca el producto dentro del marco
                  </span>
                </div>
              </div>
            </div>

            {/* Indicador de cámara activa */}
            {camaraActiva && estado === "capturando" && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-white font-medium">
                  Cámara activa
                </span>
              </div>
            )}
          </div>

          {/* Botón de captura manual (solo cuando está en modo captura) */}
          {estado === "capturando" && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <button
                onClick={capturar}
                className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm border-4 border-rose-400 shadow-xl flex items-center justify-center hover:bg-white transition-all active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center">
                  <Camera size={24} className="text-white" />
                </div>
              </button>
            </div>
          )}

          {/* Información de posición actual (mobile) */}
          <div className="absolute bottom-4 left-4 right-4 lg:hidden">
            {estado === "capturando" && (
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 text-center">
                <p className="text-sm font-semibold text-white">{posicionInfo?.instruccion}</p>
                <p className="text-xs text-white/60 mt-1">
                  Posición {POSICIONES.findIndex(p => p.index === posicionInfo?.index) + 1} de {POSICIONES.length}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral de información */}
        <div className="w-full lg:w-96 bg-white dark:bg-dark-card border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-dark-border flex flex-col">
          <div className="p-6 flex-1">
            {/* Título y descripción */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text font-display">
                Captura manual
              </h2>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                Captura el producto desde 4 ángulos diferentes. Presiona el botón cuando esté listo.
              </p>
            </div>

            {/* Instrucción actual */}
            <div className="bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 rounded-2xl p-4 mb-6 border border-rose-100 dark:border-rose-500/10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <Camera size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-dark-text">
                    {posicionInfo?.label}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-0.5">
                    {posicionInfo?.instruccion}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de posiciones */}
            <div className="space-y-2 mb-6">
              {POSICIONES.map((pos, i) => (
                <div
                  key={pos.index}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                    posicionInfo?.index === pos.index
                      ? "bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20"
                      : fotos[pos.index]
                      ? "bg-emerald-50 dark:bg-emerald-500/5"
                      : "bg-gray-50 dark:bg-dark-border"
                  }`}
                >
                  {fotos[pos.index] ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={fotos[pos.index]} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      posicionInfo?.index === pos.index
                        ? "bg-rose-100 dark:bg-rose-500/10"
                        : "bg-gray-200 dark:bg-dark-bg"
                    }`}>
                      {posicionInfo?.index === pos.index ? (
                        <Camera size={14} className="text-rose-500" />
                      ) : (
                        <Camera size={14} className="text-gray-400" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      fotos[pos.index]
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-900 dark:text-dark-text"
                    }`}>
                      {pos.label}
                    </p>
                  </div>
                  {fotos[pos.index] && (
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Mensaje dinámico */}
            {estado !== "completado" && estado !== "confirmando" && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-secondary mb-4">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span className="animate-pulse">{mensajeActual}</span>
                </div>
              </div>
            )}

            {/* Mensaje de procesamiento */}
            {estado === "procesando" && (
              <div className="text-center py-4">
                <Loader2 size={32} className="animate-spin text-rose-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                  Analizando producto con IA
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  La inteligencia artificial está procesando las 4 imágenes...
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium">
                {error}
                <button
                  onClick={reiniciar}
                  className="block mt-2 text-sm font-semibold underline"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>

          {/* Barra de progreso */}
          <div className="p-4 border-t border-gray-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary">
                Progreso
              </span>
              <span className="text-xs font-bold text-gray-900 dark:text-dark-text">
                {Math.round(progreso)}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de foto capturada */}
      {estado === "confirmando" && fotoPendiente && (
        <PhotoConfirmation
          foto={fotoPendiente}
          posicionInfo={posicionInfo}
          onConfirmar={confirmarFoto}
          onReCapturar={recapturar}
        />
      )}
    </div>
  );
}
