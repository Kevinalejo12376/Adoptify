import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { MessageCircle, X, Send, Sparkles, Loader2, User } from "lucide-react";
import logoAdoptify from "../assets/logo.png";
import {
  crearSesionChat,
  enviarMensajeChat,
  historialChat,
} from "../api/chat";

// Rutas que el bot puede sugerir navegar (defensa extra en el frontend;
// el backend ya valida la lista blanca). Deben coincidir con App.jsx.
const RUTAS_PERMITIDAS = new Set([
  "/",
  "/animals",
  "/shelters",
  "/store",
  "/forum",
  "/mis-pedidos",
  "/favoritos",
  "/login",
  "/register",
  "/registrar-refugio",
  "/registrar-tienda",
]);

// Rutas que requieren iniciar sesión (para avisarle al usuario si el bot
// sugiere navegar a una de ellas sin estar autenticado).
const RUTAS_PROTEGIDAS = new Set([
  "/animals",
  "/shelters",
  "/store",
  "/forum",
  "/mis-pedidos",
  "/favoritos",
]);

const NOMBRES_RUTAS = {
  "/animals": "las mascotas en adopción",
  "/shelters": "los refugios",
  "/store": "la tienda",
  "/forum": "el foro",
  "/mis-pedidos": "Mis pedidos",
  "/favoritos": "Mis favoritos",
};

const SESSION_KEY = "adoptify_chat_session";

function generarSessionId() {
  try {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fallback */
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function obtenerSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generarSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function ChatBot() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { user } = useAuth();
  const estaAutenticado = Boolean(user);
  // Avatar del usuario (foto de perfil o inicial del nombre).
  const avatarUsuario = user?.avatar || user?.avatar_url || null;
  const inicialUsuario = (user?.nombre || "").trim().charAt(0).toUpperCase() || "?";

  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const listaRef = useRef(null);

  // Identidad actual del usuario (para detectar login/logout/cambio de rol).
  const identidadUsuario = user
    ? (user.id ?? user.email ?? user.role ?? user.rol ?? "usuario")
    : null;

  // Reinicia la sesión del chat cuando cambia el usuario (login/logout/cambio de
  // rol). Así un invitado en Home siempre usa una sesión anónima nueva, y al
  // iniciar sesión el bot se reinicia con el rol/contexto correcto, sin heredar
  // la identidad de un usuario anterior (p. ej. "Alfredo").
  useEffect(() => {
    const nuevoId = generarSessionId();
    localStorage.setItem(SESSION_KEY, nuevoId);
    setMensajes([]);
    setEscribiendo(false);
    setCargandoHistorial(false);
    crearSesionChat(nuevoId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identidadUsuario]);

  // Cargar historial al abrir.
  useEffect(() => {
    if (!open) return;
    let activo = true;
    setCargandoHistorial(true);
    historialChat(obtenerSessionId())
      .then((data) => {
        if (!activo) return;
        const items = (data || []).map((m) => ({
          id: `h_${Math.random().toString(36).slice(2)}`,
          rol: m.rol === "user" ? "user" : "bot",
          contenido: m.contenido,
        }));
        setMensajes(items);
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setCargandoHistorial(false);
      });
    return () => {
      activo = false;
    };
  }, [open]);

  // Auto scroll al final.
  useEffect(() => {
    if (listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [mensajes, escribiendo, open]);

  const manejarEnvio = useCallback(
    async (e) => {
      e?.preventDefault();
      const texto = input.trim();
      if (!texto || escribiendo) return;
      setInput("");
      setMensajes((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, rol: "user", contenido: texto },
      ]);
      setEscribiendo(true);
      try {
        const res = await enviarMensajeChat(obtenerSessionId(), texto);
        const respuesta = res?.respuesta || "No pude procesar eso, intenta de nuevo.";
        setMensajes((prev) => [
          ...prev,
          { id: `b_${Date.now()}`, rol: "bot", contenido: respuesta },
        ]);
        // Navegacion sugerida por el bot (lista blanca, validada tambien en backend).
        const accion = res?.accion;
        if (accion?.tipo === "navegar" && RUTAS_PERMITIDAS.has(accion.ruta)) {
          if (RUTAS_PROTEGIDAS.has(accion.ruta) && !estaAutenticado) {
            // No navegar: avisar que debe iniciar sesion / registrarse.
            const nombre = NOMBRES_RUTAS[accion.ruta] || accion.ruta;
            setMensajes((prev) => [
              ...prev,
              {
                id: `b_${Date.now()}`,
                rol: "bot",
                contenido: `Para visitar ${nombre} primero debes iniciar sesión o registrarte. Usa el botón "Iniciar sesión" arriba.`,
              },
            ]);
            setTimeout(() => navigate("/login"), 1500);
          } else {
            setTimeout(() => navigate(accion.ruta), 600);
          }
        }
      } catch (err) {
        setMensajes((prev) => [
          ...prev,
          {
            id: `e_${Date.now()}`,
            rol: "bot",
            contenido:
              "Ups, no pude conectarme con el asistente en este momento. Inténtalo de nuevo.",
          },
        ]);
      } finally {
        setEscribiendo(false);
      }
    },
    [input, escribiendo, navigate]
  );

  const card = isDark
    ? "bg-dark-card border-dark-border text-dark-text"
    : "bg-white border-gray-200 text-gray-900";

  const burbujaUser = "bg-gradient-to-r from-orange-500 to-rose-500 text-white";
  const burbujaBot = isDark
    ? "bg-dark-border text-dark-text"
    : "bg-gray-100 text-gray-800";

  return (
    <>
      {/* Boton flotante abajo a la derecha */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>

      {/* Panel del chat */}
      {open && (
        <div
          className={`fixed bottom-24 right-5 z-[60] w-[calc(100vw-2.5rem)] max-w-sm h-[480px] max-h-[70vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${card}`}
        >
          {/* Header: logo de Adoptify en la parte superior derecha */}
          <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight flex items-center gap-1.5">
                Asistente Adoptify
                <Sparkles size={13} className="text-amber-200" />
              </p>
              <p className="text-[11px] text-white/80">En línea · responde con IA</p>
            </div>
            <img
              src={logoAdoptify}
              alt="Adoptify"
              className="w-9 h-9 rounded-full object-cover bg-white shadow border border-white/40"
            />
          </div>

          {/* Mensajes */}
          <div ref={listaRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {cargandoHistorial && (
              <div className="flex justify-center py-4">
                <Loader2 size={22} className="animate-spin text-gray-400" />
              </div>
            )}
            {!cargandoHistorial && mensajes.length === 0 && (
              <div className="text-center text-sm text-gray-400 dark:text-dark-text-secondary py-6">
                ¡Hola! 🐾 Soy el asistente de Adoptify.
                <br />
                Pregúntame sobre adopciones, refugios, tiendas o cómo usar la página.
              </div>
            )}
            {mensajes.map((m) => {
              const esUser = m.rol === "user";
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${esUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Avatar del bot: logo de Adoptify */}
                  {!esUser && (
                    <img
                      src={logoAdoptify}
                      alt="Adoptify"
                      className="w-7 h-7 rounded-full object-cover shrink-0 bg-white border border-gray-200 dark:border-dark-border"
                    />
                  )}
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      esUser ? `${burbujaUser} rounded-br-sm` : `${burbujaBot} rounded-bl-sm`
                    }`}
                  >
                    {m.contenido}
                  </div>
                  {/* Avatar del usuario: foto de perfil o inicial del nombre */}
                  {esUser &&
                    (avatarUsuario ? (
                      <img
                        src={avatarUsuario}
                        alt="Tu perfil"
                        className="w-7 h-7 rounded-full object-cover shrink-0 bg-white border border-gray-200 dark:border-dark-border"
                      />
                    ) : user ? (
                      <div className="w-7 h-7 rounded-full shrink-0 bg-gradient-to-br from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center">
                        {inicialUsuario}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full shrink-0 bg-gray-200 dark:bg-dark-border text-gray-500 dark:text-gray-400 flex items-center justify-center">
                        <User size={14} />
                      </div>
                    ))}
                </div>
              );
            })}
            {escribiendo && (
              <div className="flex items-end gap-2 justify-start">
                <img
                  src={logoAdoptify}
                  alt="Adoptify"
                  className="w-7 h-7 rounded-full object-cover shrink-0 bg-white border border-gray-200 dark:border-dark-border"
                />
                <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm ${burbujaBot} rounded-bl-sm flex items-center gap-1.5`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={manejarEnvio}
            className={`p-3 border-t ${isDark ? "border-dark-border" : "border-gray-200"} flex items-center gap-2`}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className={`flex-1 px-3.5 py-2 rounded-full text-sm outline-none border ${
                isDark
                  ? "bg-dark-border border-dark-border text-dark-text placeholder:text-dark-text-secondary"
                  : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              }`}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={escribiendo || !input.trim()}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white flex items-center justify-center disabled:opacity-50 transition"
              aria-label="Enviar"
            >
              {escribiendo ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
