import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Barcode, ArrowLeft, Camera, CameraOff, Loader2, Search,
  Package, AlertCircle, CheckCircle2, X, Scan,
  Sun, Smartphone, Move, Maximize2, Focus,
} from "lucide-react";
import { buscarPorCodigoBarras } from "../../api/productos";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const CONSEJOS = [
  {
    icon: Smartphone,
    titulo: "Alinea el código",
    texto: "Coloca el código de barras dentro del recuadro, paralelo a la cámara.",
  },
  {
    icon: Move,
    titulo: "Distancia adecuada",
    texto: "Aleja o acerca el producto hasta que el código se vea nítido en la pantalla.",
  },
  {
    icon: Sun,
    titulo: "Buena iluminación",
    texto: "Evita sombras y reflejos. Una iluminación uniforme mejora la detección.",
  },
  {
    icon: Focus,
    titulo: "Mantén firme",
    texto: "Sostén el producto quieto por un momento para que la cámara lo enfoque bien.",
  },
  {
    icon: Maximize2,
    titulo: "Código completo",
    texto: "Asegúrate de que todo el código de barras esté visible dentro del recuadro.",
  },
];

const INTERVALO_CONSEJOS = 6000; // ms entre cada consejo

// ---------------------------------------------------------------------------
// Componente: Escáner / Buscador de Código de Barras
// ---------------------------------------------------------------------------
export default function BarcodeScanner() {
  const navigate = useNavigate();

  // Estados del escáner
  const [modo, setModo] = useState("seleccion"); // 'seleccion' | 'escaner' | 'manual' | 'buscando' | 'resultado' | 'no_encontrado'
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [scannerActivo, setScannerActivo] = useState(false);
  const [camaraDisponible, setCamaraDisponible] = useState(true);
  const [indiceConsejo, setIndiceConsejo] = useState(0);
  const [tiempoEscaneando, setTiempoEscaneando] = useState(0);

  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const consejoTimerRef = useRef(null);
  const tiempoTimerRef = useRef(null);

  // -----------------------------------------------------------------------
  // Ciclo de consejos visuales
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (modo === "escaner" && scannerActivo) {
      consejoTimerRef.current = setInterval(() => {
        setIndiceConsejo((prev) => (prev + 1) % CONSEJOS.length);
      }, INTERVALO_CONSEJOS);

      tiempoTimerRef.current = setInterval(() => {
        setTiempoEscaneando((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (consejoTimerRef.current) {
        clearInterval(consejoTimerRef.current);
        consejoTimerRef.current = null;
      }
      if (tiempoTimerRef.current) {
        clearInterval(tiempoTimerRef.current);
        tiempoTimerRef.current = null;
      }
      setTiempoEscaneando(0);
    };
  }, [modo, scannerActivo]);

  // Reiniciar índice al abrir escáner
  useEffect(() => {
    if (modo === "escaner") {
      setIndiceConsejo(0);
      setTiempoEscaneando(0);
    }
  }, [modo]);

  // -----------------------------------------------------------------------
  // Cargar html5-qrcode dinámicamente (solo cuando se necesita)
  // -----------------------------------------------------------------------
  const iniciarScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      }

      const elementoId = "barcode-scanner-reader";
      const html5QrCode = new Html5Qrcode(elementoId);
      html5QrCodeRef.current = html5QrCode;

      setScannerActivo(true);
      setError("");

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Código detectado
          await html5QrCode.stop();
          setScannerActivo(false);
          setCodigo(decodedText);
          setModo("buscando");
          buscarProducto(decodedText);
        },
        () => {
          // Ignorar errores de frames no leídos (es normal)
        }
      );
    } catch (err) {
      console.warn("[BarcodeScanner] Error al iniciar cámara:", err);
      setCamaraDisponible(false);
      setScannerActivo(false);
      setError(
        "No se pudo acceder a la cámara. " +
        "Puedes escribir el código de barras manualmente."
      );
    }
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch (e) { /* ignore */ }
        html5QrCodeRef.current = null;
      }
    };
  }, []);

  // -----------------------------------------------------------------------
  // Buscar producto en el backend
  // -----------------------------------------------------------------------
  const buscarProducto = async (codigoBarras) => {
    if (!codigoBarras || !codigoBarras.trim()) {
      setError("Ingresa un código de barras válido");
      return;
    }

    const cod = codigoBarras.trim();
    setCodigo(cod);
    setModo("buscando");
    setError("");

    try {
      const data = await buscarPorCodigoBarras(cod);
      if (data && data.encontrado) {
        setResultado(data);
        setModo("resultado");
      } else {
        setModo("no_encontrado");
      }
    } catch (err) {
      setError(err?.message || "Error al buscar el producto");
      setModo("manual");
    }
  };

  // -----------------------------------------------------------------------
  // Ir al formulario de creación con datos precargados
  // -----------------------------------------------------------------------
  const irAFormulario = () => {
    if (resultado) {
      navigate("/tienda/productos/editar/nuevo", {
        state: {
          fromBarcode: true,
          barcodeData: {
            nombre: resultado.nombre || "",
            marca: resultado.marca || "",
            categoria: resultado.categoria || "",
            descripcion: resultado.descripcion || "",
            presentacion: resultado.presentacion || "",
            imagen_url: resultado.imagen_url || "",
            ingredientes: resultado.ingredientes || "",
            fabricante: resultado.fabricante || "",
            peso: resultado.peso || "",
            codigo_barras: resultado.codigo_barras || codigo,
          },
        },
      });
    }
  };

  const irAFormularioManual = () => {
    navigate("/tienda/productos/editar/nuevo", {
      state: {
        fromBarcode: true,
        barcodeData: {
          codigo_barras: codigo,
        },
      },
    });
  };

  // Consejo actual
  const consejoActual = CONSEJOS[indiceConsejo];
  const ConsejoIcon = consejoActual?.icon || Smartphone;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
        >
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">
            Escanear Código de Barras
          </h1>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
            Busca un producto por su código de barras
          </p>
        </div>
      </div>

      {/* Selector de modo */}
      {modo === "seleccion" && (
        <div className="space-y-4 animate-fade-in">
          {/* Opción 1: Escanear con cámara */}
          <button
            onClick={() => setModo("escaner")}
            className="w-full text-left group relative overflow-hidden bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 border-2 border-rose-200 dark:border-rose-500/20 rounded-2xl p-5 hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Camera size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-dark-text">
                  Escanear con la cámara
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  Usa la cámara de tu dispositivo para escanear el código de barras del producto.
                  Funciona con laptops, celulares y lectores USB.
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 dark:text-rose-400 group-hover:gap-2 transition-all">
                  Iniciar escáner
                  <Scan size={14} />
                </div>
              </div>
            </div>
          </button>

          {/* Opción 2: Escribir manualmente */}
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-dark-border flex items-center justify-center flex-shrink-0">
                <Barcode size={28} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-dark-text mb-3">
                  Escribir código manualmente
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        buscarProducto(codigo);
                      }
                    }}
                    placeholder="Ej: 7501055300275"
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    autoFocus
                  />
                  <button
                    onClick={() => buscarProducto(codigo)}
                    disabled={!codigo.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <Search size={16} />
                    Buscar
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Los lectores USB de código de barras escriben automáticamente el código.
                  Solo coloca el cursor aquí y escanea.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Escáner de cámara */}
      {modo === "escaner" && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {scannerActivo ? (
                  <Camera size={18} className="text-rose-500 animate-pulse" />
                ) : (
                  <CameraOff size={18} className="text-gray-400" />
                )}
                <span className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                  {scannerActivo ? "Escáner activo" : "Cámara no disponible"}
                </span>
              </div>
              <button
                onClick={() => {
                  if (html5QrCodeRef.current) {
                    try { html5QrCodeRef.current.stop(); } catch (e) { /* ignore */ }
                    html5QrCodeRef.current = null;
                  }
                  setScannerActivo(false);
                  setModo("seleccion");
                }}
                className="p-2 rounded-xl hover:bg-white/50 transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Contenedor del escáner con overlay */}
            <div className="relative bg-black" style={{ minHeight: "320px" }}>
              <div
                id="barcode-scanner-reader"
                className="w-full h-full"
                style={{ minHeight: "320px" }}
              />

              {/* Overlay de escaneo - solo cuando la cámara está activa */}
              {scannerActivo && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Fondo oscuro con agujero (efecto viñeta) */}
                  <div className="absolute inset-0 bg-black/20" />

                  {/* Área de escaneo (recuadro) */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-[280px] h-[140px]">
                      {/* Esquinas superior izquierda */}
                      <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-[3px] border-l-[3px] border-rose-400 rounded-tl-lg" />
                      {/* Esquinas superior derecha */}
                      <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-[3px] border-r-[3px] border-rose-400 rounded-tr-lg" />
                      {/* Esquinas inferior izquierda */}
                      <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-[3px] border-l-[3px] border-rose-400 rounded-bl-lg" />
                      {/* Esquinas inferior derecha */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-[3px] border-r-[3px] border-rose-400 rounded-br-lg" />

                      {/* Línea horizontal animada (barra de escaneo) */}
                      <div className="absolute left-0 right-0 h-0.5 scan-line">
                        <div className="w-full h-full bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-80" />
                      </div>

                      {/* Destello central */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-rose-300 shadow-[0_0_12px_4px_rgba(244,63,94,0.4)] animate-ping-slow" />
                      </div>
                    </div>
                  </div>

                  {/* Texto "Escaneando..." en la parte superior */}
                  <div className="absolute top-4 left-0 right-0 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/90 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Escaneando...
                    </span>
                  </div>
                </div>
              )}

              {/* Mensajes de error / sin cámara */}
              {!camaraDisponible && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                  <div className="p-6 text-center">
                    <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
                    <p className="text-sm text-gray-300 mb-4">
                      No se detectó ninguna cámara. Puedes escribir el código manualmente.
                    </p>
                    <button
                      onClick={() => setModo("seleccion")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl transition-all"
                    >
                      <Barcode size={16} />
                      Escribir código manualmente
                    </button>
                  </div>
                </div>
              )}

              {!scannerActivo && camaraDisponible && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                  <div className="p-6 text-center">
                    <CameraOff size={40} className="mx-auto text-gray-500 mb-3" />
                    <p className="text-sm text-gray-400 mb-4">
                      Presiona el botón para iniciar la cámara
                    </p>
                    <button
                      onClick={iniciarScanner}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all"
                    >
                      <Camera size={16} />
                      Iniciar cámara
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel de consejos interactivos */}
          {scannerActivo && (
            <div className="animate-fade-in space-y-3">
              {/* Consejo actual animado */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-500/5 dark:to-amber-500/5 border border-rose-100 dark:border-rose-500/10 transition-all duration-500">
                <div className="flex items-start gap-3" key={indiceConsejo}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ConsejoIcon size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-dark-text">
                      {consejoActual?.titulo}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-0.5 leading-relaxed">
                      {consejoActual?.texto}
                    </p>
                  </div>
                </div>

                {/* Indicador de progreso de consejos */}
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {CONSEJOS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndiceConsejo(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === indiceConsejo
                          ? "w-6 bg-rose-500"
                          : "w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                      }`}
                      aria-label={`Ver consejo ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Barra de tiempo escaneando */}
              {tiempoEscaneando > 3 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {tiempoEscaneando <= 10
                        ? "Asegúrate de que el código esté bien iluminado y enfocado."
                        : tiempoEscaneando <= 20
                        ? "Prueba a limpiar la lente de la cámara y ajustar la distancia."
                        : "Si el problema persiste, puedes escribir el código manualmente."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recordatorio rápido (cuando la cámara no está activa pero está en modo escáner) */}
          {!scannerActivo && camaraDisponible && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Consejo:</strong> Coloca el código de barras frente a la cámara.
                Asegúrate de que haya buena iluminación y el código esté enfocado.
                El escáner detectará automáticamente el código.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Estado: Buscando */}
      {modo === "buscando" && (
        <div className="text-center py-12 animate-fade-in">
          <Loader2 size={48} className="mx-auto text-rose-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">
            Buscando producto...
          </h3>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
            Código: <strong>{codigo}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Consultando OpenFoodFacts y bases de datos mundiales...
          </p>
        </div>
      )}

      {/* Resultado: Encontrado */}
      {modo === "resultado" && resultado && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-emerald-200 dark:border-emerald-500/20 overflow-hidden">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 border-b border-emerald-100 dark:border-emerald-500/10 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  Producto encontrado
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Fuente: {resultado.fuente === "openfoodfacts" ? "OpenFoodFacts" : "UPCitemDB"}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Imagen */}
              {resultado.imagen_url && (
                <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-50 dark:bg-dark-bg">
                  <img
                    src={resultado.imagen_url}
                    alt={resultado.nombre || "Producto"}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              )}

              {/* Datos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Nombre" valor={resultado.nombre} />
                <Campo label="Marca" valor={resultado.marca} />
                <Campo label="Categoría" valor={resultado.categoria} />
                <Campo label="Presentación" valor={resultado.presentacion} />
                <Campo label="Fabricante" valor={resultado.fabricante} />
                <Campo label="Peso" valor={resultado.peso} />
                <Campo label="Código de barras" valor={resultado.codigo_barras} className="sm:col-span-2" />
              </div>

              {resultado.descripcion && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">Descripción</p>
                  <p className="text-sm text-gray-700 dark:text-dark-text">{resultado.descripcion}</p>
                </div>
              )}

              {resultado.ingredientes && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">Ingredientes</p>
                  <p className="text-sm text-gray-700 dark:text-dark-text">{resultado.ingredientes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setModo("seleccion"); setResultado(null); setCodigo(""); }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors"
            >
              Buscar otro código
            </button>
            <button
              onClick={irAFormulario}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              <Package size={16} />
              Usar estos datos
            </button>
          </div>
        </div>
      )}

      {/* Resultado: No encontrado */}
      {modo === "no_encontrado" && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-amber-200 dark:border-amber-500/20 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={40} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">
                Producto no encontrado
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4 max-w-md mx-auto">
                No se encontró el producto en OpenFoodFacts ni en UPCitemDB.
                Puedes registrarlo manualmente.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border">
                <Barcode size={16} className="text-gray-400" />
                <span className="text-sm font-mono text-gray-600 dark:text-dark-text">
                  {codigo}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setModo("seleccion"); setCodigo(""); }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-dark-border/80 transition-colors"
            >
              Intentar otro código
            </button>
            <button
              onClick={irAFormularioManual}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all"
            >
              <Package size={16} />
              Registrar manualmente
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-fade-in">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Estilos para las animaciones */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% {
            top: 0%;
          }
          50% {
            top: calc(100% - 2px);
          }
        }
        .scan-line {
          animation: scan 2.5s ease-in-out infinite;
        }
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(2.5);
            opacity: 0.3;
          }
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Componente auxiliar para mostrar campos
function Campo({ label, valor, className = "" }) {
  if (!valor) return null;
  return (
    <div className={className}>
      <p className="text-xs font-medium text-gray-400 dark:text-dark-text-secondary mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">{valor}</p>
    </div>
  );
}
