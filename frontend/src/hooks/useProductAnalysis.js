import { useState, useRef, useCallback, useEffect } from "react";
import { analizarProductoConIA } from "../api/tienda";

const CAMERA_ID = "product-analysis-camera";

const POSICIONES = [
  { index: 0, label: "Parte frontal", instruccion: "Muestra la parte frontal del producto" },
  { index: 1, label: "Parte trasera", instruccion: "Voltea el producto y muestra la parte trasera" },
  { index: 2, label: "Lado izquierdo", instruccion: "Muestra el lado izquierdo del producto" },
  { index: 3, label: "Lado derecho", instruccion: "Muestra el lado derecho del producto" },
];

const MENSAJES_DINAMICOS = [
  "Coloca el producto frente a la cámara",
  "Asegúrate de que el producto esté bien iluminado",
  "Enfoca bien el producto",
  "Verifica que se vea completo en el marco",
];

export default function useProductAnalysis() {
  const [estado, setEstado] = useState("iniciando"); // iniciando | capturando | confirmando | procesando | completado | error
  const [fotos, setFotos] = useState([null, null, null, null]);
  const [posicionActual, setPosicionActual] = useState(0);
  const [fotoPendiente, setFotoPendiente] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [mensajeActual, setMensajeActual] = useState("");
  const [resultadoIA, setResultadoIA] = useState(null);
  const [error, setError] = useState(null);
  const [camaraActiva, setCamaraActiva] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fotosRef = useRef([null, null, null, null]);
  const posicionRef = useRef(0);
  const intervaloMsgRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      detenerTodo();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detenerTodo = useCallback(() => {
    if (intervaloMsgRef.current) { clearInterval(intervaloMsgRef.current); intervaloMsgRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Solo remover el video si existe y sigue en el DOM
    const video = videoRef.current;
    if (video) {
      try {
        // Pausar antes de remover para evitar el error "play() interrupted"
        video.pause();
        video.srcObject = null;
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      } catch (e) { /* ignorar errores de DOM */ }
    }
    videoRef.current = null;
    setCamaraActiva(false);
  }, []);

  const iniciarCamara = useCallback(async () => {
    try {
      // Detener cámara previa si existe
      detenerTodo();

      // Pequeña pausa para asegurar que el DOM se estabilice
      // (crítico en React StrictMode donde el componente se monta dos veces)
      await new Promise((r) => setTimeout(r, 50));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });

      // Si el componente fue desmontado mientras obteníamos la cámara, liberar y salir
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const container = document.getElementById(CAMERA_ID);
      if (!container) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("Contenedor de cámara no encontrado");
      }

      // Crear video y asignar stream
      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      video.muted = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";

      // Limpiar contenedor y agregar el video
      container.innerHTML = "";
      container.appendChild(video);

      // Intentar reproducir con manejo de error DOM
      try {
        await video.play();
      } catch (playErr) {
        // Si falla play() (ej. StrictMode desmontó el DOM), liberar recursos
        console.warn("[useProductAnalysis] video.play() falló, reintentando...", playErr);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        container.innerHTML = "";
        if (!mountedRef.current) return;
        // Reintentar una vez más
        const stream2 = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!mountedRef.current) { stream2.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream2;
        const video2 = document.createElement("video");
        video2.srcObject = stream2;
        video2.setAttribute("playsinline", "true");
        video2.setAttribute("autoplay", "true");
        video2.muted = true;
        video2.style.width = "100%";
        video2.style.height = "100%";
        video2.style.objectFit = "cover";
        container.appendChild(video2);
        await video2.play();
        videoRef.current = video2;
        setCamaraActiva(true);
        setEstado("capturando");
        // Mensaje inicial
        if (intervaloMsgRef.current) clearInterval(intervaloMsgRef.current);
        let idx = 0;
        intervaloMsgRef.current = setInterval(() => {
          idx = (idx + 1) % MENSAJES_DINAMICOS.length;
          setMensajeActual(MENSAJES_DINAMICOS[idx]);
        }, 3000);
        setMensajeActual(`Posición ${posicionRef.current + 1}: ${POSICIONES[posicionRef.current].instruccion}`);
        return;
      }

      videoRef.current = video;
      setCamaraActiva(true);
      setEstado("capturando");

      // Mensajes dinámicos
      if (intervaloMsgRef.current) clearInterval(intervaloMsgRef.current);
      setMensajeActual(MENSAJES_DINAMICOS[0]);
      let idx = 0;
      intervaloMsgRef.current = setInterval(() => {
        idx = (idx + 1) % MENSAJES_DINAMICOS.length;
        setMensajeActual(MENSAJES_DINAMICOS[idx]);
      }, 3000);

      // NO auto-captura: el usuario presiona el botón manualmente
      setMensajeActual(`Posición ${posicionRef.current + 1}: ${POSICIONES[posicionRef.current].instruccion}`);
    } catch (err) {
      // Si el componente ya no está montado, no actualizar estado
      if (!mountedRef.current) return;
      console.error("Error cámara:", err);
      setError(err.message || "No se pudo acceder a la cámara. Verifica los permisos.");
      setEstado("error");
    }
  }, [detenerTodo]);

  const capturarFrame = (calidad = 0.6) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    try {
      const canvas = document.createElement("canvas");
      const MAX_W = 640;
      const MAX_H = 480;
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > MAX_W || h > MAX_H) {
        const ratio = Math.min(MAX_W / w, MAX_H / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", calidad);
    } catch (e) {
      return null;
    }
  };

  /** El usuario presiona "Capturar" → toma la foto de la posición actual */
  const capturar = useCallback(() => {
    const foto = capturarFrame();
    if (!foto) return;
    setFotoPendiente(foto);
    setEstado("confirmando");
  }, []);

  /** El usuario confirmó la foto → se guarda y se avanza a la siguiente posición */
  const confirmarFoto = useCallback(() => {
    const foto = fotoPendiente;
    if (!foto) return;

    const pos = posicionRef.current;
    const nuevasFotos = [...fotosRef.current];
    nuevasFotos[pos] = foto;
    fotosRef.current = nuevasFotos;
    setFotos(nuevasFotos);
    setFotoPendiente(null);

    const siguientePos = pos + 1;

    if (siguientePos >= POSICIONES.length) {
      // Ya tenemos las 4 fotos → enviar a IA
      setEstado("procesando");
      setMensajeActual("Enviando imágenes a inteligencia artificial...");
      setProgreso(50);
      enviarAIAnalisis(nuevasFotos);
    } else {
      // Avanzar a la siguiente posición
      posicionRef.current = siguientePos;
      setPosicionActual(siguientePos);
      setProgreso((siguientePos / POSICIONES.length) * 50);
      setEstado("capturando");
      setMensajeActual(`Posición ${siguientePos + 1}: ${POSICIONES[siguientePos].instruccion}`);
    }
  }, [fotoPendiente]);

  /** El usuario quiere volver a tomar la foto actual */
  const recapturar = useCallback(() => {
    setFotoPendiente(null);
    setEstado("capturando");
  }, []);

  const enviarAIAnalisis = async (fotosArray) => {
    try {
      const validas = fotosArray.filter((f) => f !== null);
      if (validas.length === 0) throw new Error("No se capturaron imágenes");
      const resultado = await analizarProductoConIA(validas);
      setResultadoIA(resultado);
      setProgreso(100);
      setEstado("completado");
    } catch (err) {
      console.error("Error IA:", err);
      setError(err.message || "Error al analizar el producto con IA");
      setEstado("error");
    } finally {
      if (intervaloMsgRef.current) clearInterval(intervaloMsgRef.current);
    }
  };

  const iniciar = useCallback(async () => {
    setEstado("iniciando");
    setError(null);
    setFotos([null, null, null, null]);
    setPosicionActual(0);
    setProgreso(0);
    setResultadoIA(null);
    setFotoPendiente(null);
    fotosRef.current = [null, null, null, null];
    posicionRef.current = 0;
    await iniciarCamara();
  }, [iniciarCamara]);

  const reiniciar = useCallback(async () => {
    detenerTodo();
    await iniciar();
  }, [iniciar, detenerTodo]);

  const limpiar = useCallback(async () => {
    detenerTodo();
  }, [detenerTodo]);

  const detenerCamara = useCallback(async () => {
    detenerTodo();
  }, [detenerTodo]);

  return {
    estado, fotos, posicionActual, fotoPendiente,
    progreso, mensajeActual, resultadoIA,
    error, camaraActiva,
    videoRef,
    iniciar, reiniciar, limpiar, detenerCamara,
    capturar, confirmarFoto, recapturar,
    POSICIONES,
    posicionInfo: POSICIONES[posicionActual] || POSICIONES[0],
  };
}
