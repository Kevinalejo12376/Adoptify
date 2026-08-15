import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Building2, User, FileText, ClipboardCheck,
  Check, CheckCircle2, X, Upload, Mail, Phone, MapPin, Globe,
  Music2, Calendar, Loader2, ShieldCheck,
  AlertCircle, Image as ImageIcon, Home, LayoutGrid, PawPrint,
  IdCard, File, Sparkles, Heart, Lock, ExternalLink, RefreshCw,
  Navigation,
} from "lucide-react";
import { FacebookIcon, InstagramIcon } from "../../components/SocialIcons";
import { ADOPTIFY_LOGO as logo } from "../../constants/assets";
import Footer from "../../components/Footer";
import {
  crearSolicitudRefugio,
  subirDocumentosSolicitud,
  filesToBase64,
  consultarEstadoSolicitud,
} from "../../api/solicitudesRefugio";

// ========================================================
// CONFIGURACIÓN
// ========================================================

const STEPS = [
  { id: 1, titulo: "Información del refugio", icon: Building2 },
  { id: 2, titulo: "Representante", icon: User },
  { id: 3, titulo: "Documentación", icon: FileText },
  { id: 4, titulo: "Revisión", icon: ClipboardCheck },
];

const DOC_OBLIGATORIOS = [
  { categoria: "identidad", label: "Documento de identidad del representante", icon: IdCard, desc: "Cédula o documento oficial" },
  { categoria: "fachada", label: "Fotografía de la fachada", icon: Home, desc: "Vista exterior del refugio" },
  { categoria: "fotografias", label: "Fotografías del refugio", icon: ImageIcon, desc: "Vistas generales del lugar" },
  { categoria: "instalaciones", label: "Fotografías de las instalaciones", icon: LayoutGrid, desc: "Espacios y áreas internas" },
  { categoria: "animales", label: "Fotografías de algunos animales", icon: PawPrint, desc: "Evidencia de los animales a cargo" },
];

const DOC_OPCIONALES = [
  { categoria: "camara_comercio", label: "Cámara de Comercio", icon: FileText, desc: "Certificado de existencia y representación" },
  { categoria: "nit", label: "NIT", icon: FileText, desc: "Número de identificación tributaria" },
  { categoria: "personeria_juridica", label: "Personería Jurídica", icon: FileText, desc: "Resolución o acta de constitución" },
  { categoria: "certificado_fundacion", label: "Certificado como Fundación", icon: FileText, desc: "Si aplica" },
  { categoria: "otros", label: "Otros documentos", icon: FileText, desc: "Cualquier documento de soporte adicional" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MB = 8;

// Validación de teléfonos: solo números y separadores comunes (espacio, +, -, paréntesis).
const TELEFONO_RE = /^[0-9+\s()\-]{7,20}$/;
// Elimina cualquier carácter no permitido mientras el usuario escribe (impide letras).
const sanitizarTelefono = (v) => (v || "").replace(/[^\d+\s()\-]/g, "");
const validarTelefono = (v) => TELEFONO_RE.test((v || "").trim());

// Geolocalización: obtiene el departamento, ciudad, municipio y dirección aproximada
// a partir de la ubicación del navegador (reverse geocoding con Nominatim/OSM).
const obtenerUbicacionActual = () =>
  new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Tu navegador no soporta geolocalización"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`
          );
          if (!res.ok) throw new Error("geo");
          const data = await res.json();
          const a = data.address || {};
          const departamento = a.state || a.region || "";
          const municipio = a.city || a.town || a.village || a.municipality || a.county || "";
          const ciudad = a.city || a.town || a.village || municipio || "";
          const direccion = [a.road, a.neighbourhood, a.suburb, a.hamlet].filter(Boolean).join(", ");
          resolve({ departamento, ciudad, municipio, direccion });
        } catch {
          reject(new Error("No se pudo determinar la dirección exacta"));
        }
      },
      () => reject(new Error("No se pudo acceder a tu ubicación. Completa los campos manualmente.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });

// ========================================================
// COMPONENTES AUXILIARES
// ========================================================

function isValidImageFile(file) {
  return file && (file.type.startsWith("image/") || file.type === "application/pdf");
}

function Dropzone({ categoria, label, desc, Icon, archivos, onAgregar, onEliminar, onReemplazar }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const manejarArchivos = (fileList) => {
    const archivos = Array.from(fileList || []).filter(isValidImageFile);
    if (archivos.length) onAgregar(categoria, archivos);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 p-4
        ${dragOver
          ? "border-rose-400 bg-rose-50/60 scale-[1.01]"
          : archivos.length
            ? "border-emerald-300 bg-emerald-50/40"
            : "border-gray-200 bg-white hover:border-rose-300 hover:bg-rose-50/30"}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); manejarArchivos(e.dataTransfer.files); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => manejarArchivos(e.target.files)}
      />

      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${archivos.length ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
          <p className="text-[11px] text-gray-400 mt-1">
            Arrastra y suelta o{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-rose-500 font-medium hover:underline inline"
            >
              selecciona archivos
            </button>{" "}
            · JPG, PNG o PDF · máx. {MAX_MB} MB
          </p>
        </div>
        {archivos.length > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
            <Check size={13} /> {archivos.length}
          </span>
        )}
      </div>

      {archivos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {archivos.map((archivo, idx) => (
            <div key={idx} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white">
              {archivo.esImagen ? (
                <img src={archivo.base64} alt={archivo.nombre} className="w-full h-20 object-cover" />
              ) : (
                <div className="w-full h-20 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                  <File size={22} />
                  <span className="text-[9px] px-1 truncate w-full text-center">{archivo.nombre}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onReemplazar(categoria, idx)}
                  className="w-7 h-7 rounded-full bg-white/90 text-gray-700 flex items-center justify-center hover:bg-white"
                  title="Reemplazar"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onEliminar(categoria, idx)}
                  className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600"
                  title="Eliminar"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Campo({ label, obligatorio, icono: Icono, error, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {obligatorio && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        {Icono && (
          <Icono size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
        {children}
      </div>
      {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
      {error && (
        <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (error, hasIcon) =>
  `w-full ${hasIcon ? "pl-10" : "px-4"} py-2.5 rounded-xl border text-sm text-gray-800
   bg-white placeholder-gray-400 outline-none transition-all duration-200
   ${error
     ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
     : "border-gray-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"}`;

// ========================================================
// COMPONENTE PRINCIPAL
// ========================================================

export default function ShelterRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenCompletar = searchParams.get("completar");

  const [paso, setPaso] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState("");
  const [errores, setErrores] = useState({});

  // Datos del formulario
  const [form, setForm] = useState({
    nombre_refugio: "",
    descripcion: "",
    email_contacto: "",
    telefono: "",
    departamento: "",
    municipio: "",
    direccion: "",
    website: "",
    anio_fundacion: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    representante_nombre: "",
    representante_apellido: "",
    representante_email: "",
    representante_telefono: "",
    acepto_veracidad: false,
    autorizo_verificacion: false,
  });

  const [logo, setLogo] = useState(null); // { base64, nombre }
  const [documentos, setDocumentos] = useState({}); // categoria -> [{base64, nombre, esImagen}]

  // ---- Ubicación automática (geolocalización) ----
  const [ubicacionCargando, setUbicacionCargando] = useState(false);
  const [ubicacionError, setUbicacionError] = useState("");
  const [ubicacionOk, setUbicacionOk] = useState(false);

  // ---- Modo "completar información" ----
  const [modoCompletar, setModoCompletar] = useState(!!tokenCompletar);
  const [infoSolicitud, setInfoSolicitud] = useState(null);
  const [cargandoInfo, setCargandoInfo] = useState(!!tokenCompletar);

  useEffect(() => {
    if (tokenCompletar) {
      consultarEstadoSolicitud(tokenCompletar)
        .then((data) => {
          setInfoSolicitud(data);
          if (data.estado === "informacion_solicitada") {
            setModoCompletar(true);
          } else if (data.estado === "pendiente") {
            setModoCompletar(true);
          } else {
            setModoCompletar(false);
            setErrorGlobal(
              data.estado === "aprobada"
                ? "Tu solicitud ya fue aprobada. Revisa tu correo para crear tu contraseña."
                : "Tu solicitud no acepta información adicional en este momento."
            );
          }
        })
        .catch(() => setErrorGlobal("No pudimos encontrar tu solicitud. Verifica el enlace."))
        .finally(() => setCargandoInfo(false));
    }
  }, [tokenCompletar]);

  // ---- Helpers de archivos ----
  const agregarArchivos = useCallback(async (categoria, archivos) => {
    setErrores((prev) => ({ ...prev, [`doc_${categoria}`]: "" }));
    try {
      const convertidos = await filesToBase64(archivos);
      const nuevos = convertidos.map((c) => ({
        base64: c.base64,
        nombre: c.nombre,
        esImagen: c.type.startsWith("image/"),
      }));
      setDocumentos((prev) => ({
        ...prev,
        [categoria]: [...(prev[categoria] || []), ...nuevos],
      }));
    } catch {
      setErrores((prev) => ({ ...prev, [`doc_${categoria}`]: "No se pudo leer el archivo." }));
    }
  }, []);

  const eliminarArchivo = useCallback((categoria, idx) => {
    setDocumentos((prev) => ({
      ...prev,
      [categoria]: (prev[categoria] || []).filter((_, i) => i !== idx),
    }));
  }, []);

  const reemplazarArchivo = useCallback((categoria, idx) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = async (e) => {
      const archivos = Array.from(e.target.files || []).filter(isValidImageFile);
      if (!archivos.length) return;
      try {
        const convertidos = await filesToBase64(archivos);
        const nuevos = convertidos.map((c) => ({
          base64: c.base64,
          nombre: c.nombre,
          esImagen: c.type.startsWith("image/"),
        }));
        setDocumentos((prev) => {
          const actual = [...(prev[categoria] || [])];
          actual[idx] = nuevos[0];
          return { ...prev, [categoria]: actual };
        });
      } catch { /* noop */ }
    };
    input.click();
  }, []);

  const subirLogo = async (archivo) => {
    if (!archivo || !archivo.type.startsWith("image/")) return;
    try {
      const [convertido] = await filesToBase64([archivo]);
      setLogo({ base64: convertido.base64, nombre: convertido.nombre });
      setErrores((prev) => ({ ...prev, logo: "" }));
    } catch {
      setErrores((prev) => ({ ...prev, logo: "No se pudo leer el logo." }));
    }
  };

  // ---- Usar mi ubicación actual (geolocalización) ----
  const usarMiUbicacion = async () => {
    setUbicacionCargando(true);
    setUbicacionError("");
    setUbicacionOk(false);
    try {
      const ubicacion = await obtenerUbicacionActual();
      set("departamento", ubicacion.departamento);
      set("municipio", ubicacion.municipio || ubicacion.ciudad);
      set("direccion", ubicacion.direccion);
      setErrores((prev) => ({ ...prev, departamento: "", municipio: "", direccion: "" }));
      setUbicacionOk(true);
    } catch (e) {
      setUbicacionError(e.message || "No se pudo obtener tu ubicación.");
    } finally {
      setUbicacionCargando(false);
    }
  };

  // ---- Navegación / validación ----
  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const validarPaso = (idx) => {
    const e = {};
    if (idx === 0) {
      if (!form.nombre_refugio.trim()) e.nombre_refugio = "Ingresa el nombre del refugio";
      if (form.email_contacto && !EMAIL_RE.test(form.email_contacto)) e.email_contacto = "Correo inválido";
      if (!form.email_contacto) e.email_contacto = "El correo de contacto es obligatorio";
      if (!form.telefono.trim()) {
        e.telefono = "Ingresa un teléfono de contacto";
      } else if (!validarTelefono(form.telefono)) {
        e.telefono = "El teléfono solo debe contener números (7 a 20 dígitos)";
      }
      if (!form.municipio.trim()) e.municipio = "Ingresa el municipio";
      if (!form.direccion.trim()) e.direccion = "Ingresa la dirección";
      if (form.anio_fundacion && (Number(form.anio_fundacion) < 1900 || Number(form.anio_fundacion) > 2100))
        e.anio_fundacion = "Año de fundación inválido";
    }
    if (idx === 1) {
      if (!form.representante_nombre.trim()) e.representante_nombre = "Ingresa el nombre del representante";
      if (!form.representante_apellido.trim()) e.representante_apellido = "Ingresa el apellido del representante";
      if (!EMAIL_RE.test(form.representante_email)) e.representante_email = "Ingresa un correo válido";
      if (!form.representante_telefono.trim()) {
        e.representante_telefono = "Ingresa un teléfono";
      } else if (!validarTelefono(form.representante_telefono)) {
        e.representante_telefono = "El teléfono solo debe contener números (7 a 20 dígitos)";
      }
    }
    if (idx === 2) {
      for (const doc of DOC_OBLIGATORIOS) {
        if (!(documentos[doc.categoria] || []).length)
          e[`doc_${doc.categoria}`] = `Adjunta al menos un archivo para: ${doc.label}`;
      }
    }
    if (idx === 3) {
      if (!form.acepto_veracidad) e.acepto_veracidad = "Debes aceptar la declaración de veracidad";
      if (!form.autorizo_verificacion) e.autorizo_verificacion = "Debes autorizar la verificación";
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const siguiente = () => {
    if (validarPaso(paso)) {
      setPaso((p) => p + 1);
      setErrorGlobal("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const anterior = () => {
    setPaso((p) => Math.max(0, p - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- Envío ----
  const enviar = async () => {
    if (!validarPaso(3)) {
      setErrorGlobal("Debes aceptar los términos para continuar.");
      return;
    }
    setCargando(true);
    setErrorGlobal("");

    // Construir documentos (todos: obligatorios + opcionales)
    const docsPayload = [];
    const todas = [...DOC_OBLIGATORIOS, ...DOC_OPCIONALES];
    for (const doc of todas) {
      const archivos = documentos[doc.categoria] || [];
      for (const a of archivos) {
        docsPayload.push({
          categoria: doc.categoria,
          tipo: DOC_OBLIGATORIOS.some((d) => d.categoria === doc.categoria) ? "obligatorio" : "opcional",
          nombre_archivo: a.nombre,
          contenido_base64: a.base64,
        });
      }
    }

    const payload = {
      ...form,
      // Backward compatibility: la columna 'ciudad' conserva el valor del municipio.
      ciudad: form.municipio,
      anio_fundacion: form.anio_fundacion ? Number(form.anio_fundacion) : null,
      logo_base64: logo?.base64 || null,
      documentos: docsPayload,
    };

    try {
      const data = await crearSolicitudRefugio(payload);
      setResultado(data);
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Guardar token para consulta futura
      if (data?.token_consulta) {
        try {
          const previos = JSON.parse(localStorage.getItem("adoptify_solicitudes") || "[]");
          localStorage.setItem(
            "adoptify_solicitudes",
            JSON.stringify([{ id: data.id, token: data.token_consulta, nombre: data.nombre_refugio }, ...previos].slice(0, 10))
          );
        } catch { /* noop */ }
      }
    } catch (err) {
      setErrorGlobal(err.message || "Ocurrió un error al enviar la solicitud.");
    } finally {
      setCargando(false);
    }
  };

  const enviarCompletar = async () => {
    setCargando(true);
    setErrorGlobal("");
    const docsPayload = [];
    const todas = [...DOC_OBLIGATORIOS, ...DOC_OPCIONALES];
    for (const doc of todas) {
      const archivos = documentos[doc.categoria] || [];
      for (const a of archivos) {
        docsPayload.push({
          categoria: doc.categoria,
          tipo: DOC_OBLIGATORIOS.some((d) => d.categoria === doc.categoria) ? "obligatorio" : "opcional",
          nombre_archivo: a.nombre,
          contenido_base64: a.base64,
        });
      }
    }
    if (!docsPayload.length) {
      setErrorGlobal("Adjunta al menos un documento para completar la información.");
      setCargando(false);
      return;
    }
    try {
      await subirDocumentosSolicitud(tokenCompletar, docsPayload);
      setEnviado(true);
      setResultado({ modoCompletar: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorGlobal(err.message || "Ocurrió un error al enviar los documentos.");
    } finally {
      setCargando(false);
    }
  };

  // ========================================================
  // RENDER: PANTALLA DE ÉXITO
  // ========================================================
  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-white">
        <SuccessScreen
          resultado={resultado}
          onVolver={() => navigate("/")}
        />
        <Footer />
      </div>
    );
  }

  // ========================================================
  // RENDER: MODO COMPLETAR INFORMACIÓN
  // ========================================================
  if (modoCompletar) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-white">
        <RegHeader />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          {cargandoInfo ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <Loader2 className="w-10 h-10 text-rose-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Consultando tu solicitud...</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-rose-100 overflow-hidden animate-fade-in">
              <div className="px-6 sm:px-8 py-6 bg-gradient-to-r from-amber-50 to-rose-50 border-b border-rose-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Completar información</h2>
                    <p className="text-sm text-gray-500">
                      {infoSolicitud?.nombre_refugio} · Solicitud #{infoSolicitud?.id}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {infoSolicitud?.mensaje_informacion && (
                  <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
                    <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Nuestro equipo solicita:</p>
                      <p className="text-sm text-amber-700 mt-1">{infoSolicitud.mensaje_informacion}</p>
                    </div>
                  </div>
                )}

                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Upload size={16} className="text-rose-500" /> Adjunta la información solicitada
                </h3>
                <div className="space-y-3">
                  {DOC_OBLIGATORIOS.map((doc) => (
                    <Dropzone
                      key={doc.categoria}
                      categoria={doc.categoria}
                      label={doc.label}
                      desc={doc.desc}
                      Icon={doc.icon}
                      archivos={documentos[doc.categoria] || []}
                      onAgregar={agregarArchivos}
                      onEliminar={eliminarArchivo}
                      onReemplazar={reemplazarArchivo}
                    />
                  ))}
                  {DOC_OPCIONALES.map((doc) => (
                    <Dropzone
                      key={doc.categoria}
                      categoria={doc.categoria}
                      label={doc.label}
                      desc={doc.desc}
                      Icon={doc.icon}
                      archivos={documentos[doc.categoria] || []}
                      onAgregar={agregarArchivos}
                      onEliminar={eliminarArchivo}
                      onReemplazar={reemplazarArchivo}
                    />
                  ))}
                </div>

                {errorGlobal && (
                  <div className="mt-5 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <AlertCircle size={16} /> {errorGlobal}
                  </div>
                )}

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate("/")}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                  >
                    <ArrowLeft size={18} /> Volver al inicio
                  </button>
                  <button
                    onClick={enviarCompletar}
                    disabled={cargando}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-60"
                  >
                    {cargando ? <Loader2 size={18} className="animate-spin" /> : <SendIcon />}
                    Enviar información
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // ========================================================
  // RENDER: ASISTENTE PASO A PASO
  // ========================================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-rose-50 to-white">
      <RegHeader />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        {/* Encabezado */}
        <div className="text-center pt-10 pb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-gray-900 mb-3">
            Solicitud de Registro de Refugio
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Completa la siguiente información para que el equipo de Adoptify pueda verificar
            la autenticidad de tu refugio y evaluar tu solicitud de ingreso a la plataforma.
          </p>
        </div>

        {/* Tarjeta informativa */}
        <div className="mb-8 rounded-2xl bg-white/80 backdrop-blur border border-rose-100 shadow-sm px-5 py-4 flex items-start gap-3 animate-fade-in">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Todas las solicitudes son revisadas <strong>manualmente por un administrador</strong>{" "}
            para garantizar la seguridad y confianza de nuestra comunidad.
          </p>
        </div>

        {/* Stepper */}
        <Stepper paso={paso} />

        {/* Tarjeta del formulario */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-6 sm:px-10 py-8">
            {paso === 0 && (
              <PasoRefugio
                form={form}
                set={set}
                errores={errores}
                logo={logo}
                subirLogo={subirLogo}
                inputCls={inputCls}
                usarMiUbicacion={usarMiUbicacion}
                ubicacionCargando={ubicacionCargando}
                ubicacionError={ubicacionError}
                ubicacionOk={ubicacionOk}
              />
            )}
            {paso === 1 && (
              <PasoRepresentante form={form} set={set} errores={errores} inputCls={inputCls} />
            )}
            {paso === 2 && (
              <PasoDocumentos
                documentos={documentos}
                errores={errores}
                agregarArchivos={agregarArchivos}
                eliminarArchivo={eliminarArchivo}
                reemplazarArchivo={reemplazarArchivo}
              />
            )}
            {paso === 3 && (
              <PasoRevision form={form} set={set} errores={errores} documentos={documentos} logo={logo} />
            )}

            {errorGlobal && (
              <div className="mt-6 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 animate-fade-in">
                <AlertCircle size={16} /> {errorGlobal}
              </div>
            )}

            {/* Botones */}
            <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3">
              {paso > 0 ? (
                <button
                  onClick={anterior}
                  className="sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                >
                  <ArrowLeft size={18} /> Atrás
                </button>
              ) : (
                <Link
                  to="/"
                  className="sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                >
                  <ArrowLeft size={18} /> Volver al inicio
                </Link>
              )}

              {paso < 3 ? (
                <button
                  onClick={siguiente}
                  className="sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200"
                >
                  Continuar <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={enviar}
                  disabled={cargando}
                  className="sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-60"
                >
                  {cargando ? <Loader2 size={18} className="animate-spin" /> : <SendIcon />}
                  Enviar solicitud
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nota privacidad */}
        <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
          <Lock size={12} /> Tu información está protegida y solo será utilizada para verificar tu solicitud.
        </p>
      </div>

      <Footer />
    </div>
  );
}

// ========================================================
// SUBCOMPONENTES
// ========================================================

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function RegHeader() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-rose-100 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logo} alt="Adoptify Logo" className="h-9 w-auto transition-transform duration-300 group-hover:scale-105" />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-rose-600 transition-colors px-3 py-2 rounded-xl hover:bg-rose-50"
        >
          <ArrowLeft size={17} /> Volver al inicio
        </Link>
      </div>
    </header>
  );
}

function Stepper({ paso }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto relative">
        {/* Línea conectora */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${(paso / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((s, idx) => {
          const activo = idx <= paso;
          const actual = idx === paso;
          const Icon = s.icon;
          return (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-2
                  ${actual
                    ? "bg-gradient-to-br from-rose-500 to-amber-500 text-white border-transparent shadow-lg shadow-rose-200 scale-110"
                    : activo
                      ? "bg-white text-rose-500 border-rose-300"
                      : "bg-white text-gray-300 border-gray-200"}`}
              >
                {idx < paso ? <Check size={20} /> : <Icon size={20} />}
              </div>
              <span
                className={`mt-2 hidden sm:block text-[11px] font-semibold text-center max-w-[90px] leading-tight
                  ${actual ? "text-rose-600" : activo ? "text-gray-700" : "text-gray-400"}`}
              >
                {s.titulo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PasoRefugio({ form, set, errores, logo, subirLogo, inputCls, usarMiUbicacion, ubicacionCargando, ubicacionError, ubicacionOk }) {
  const logoInputRef = useRef(null);
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="text-rose-500" size={20} />
        <h2 className="text-lg font-bold text-gray-900">Información del refugio</h2>
      </div>

      {/* Logo */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo del refugio</label>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && subirLogo(e.target.files[0])}
        />
        <div
          className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 p-4 hover:border-rose-300 transition-all cursor-pointer bg-gray-50/50"
          onClick={() => logoInputRef.current?.click()}
        >
          {logo ? (
            <>
              <img src={logo.base64} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-gray-200" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{logo.nombre}</p>
                <button
                  type="button"
                  className="text-xs text-rose-500 font-medium hover:underline"
                  onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                >
                  Reemplazar logo
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center">
                <ImageIcon size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Sube el logo de tu refugio</p>
                <p className="text-xs text-gray-400">PNG, JPG · máx. 8 MB</p>
              </div>
            </div>
          )}
        </div>
        {errores.logo && <p className="text-xs text-rose-600 mt-1">{errores.logo}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Campo label="Nombre del refugio" obligatorio error={errores.nombre_refugio}>
          <input
            value={form.nombre_refugio}
            onChange={(e) => set("nombre_refugio", e.target.value)}
            placeholder="Ej: Fundación Huellas"
            className={inputCls(errores.nombre_refugio)}
          />
        </Campo>
        <Campo label="Correo de contacto" obligatorio icono={Mail} error={errores.email_contacto} hint="Este será el correo de inicio de sesión del refugio">
          <input
            value={form.email_contacto}
            onChange={(e) => set("email_contacto", e.target.value)}
            placeholder="contacto@refugio.com"
            className={inputCls(errores.email_contacto, true)}
          />
        </Campo>
        <div className="sm:col-span-2">
          <Campo label="Descripción" error={errores.descripcion}>
            <textarea
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              rows={3}
              placeholder="Cuéntanos sobre la misión del refugio, su historia y su labor..."
              className={`${inputCls(errores.descripcion)} resize-none`}
            />
          </Campo>
        </div>
        <Campo label="Teléfono" obligatorio icono={Phone} error={errores.telefono}>
          <input
            value={form.telefono}
            onChange={(e) => set("telefono", sanitizarTelefono(e.target.value))}
            placeholder="300 123 4567"
            type="tel"
            inputMode="tel"
            maxLength={20}
            className={inputCls(errores.telefono, true)}
          />
        </Campo>
        {/* Botón de ubicación junto al teléfono */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={usarMiUbicacion}
            disabled={ubicacionCargando}
            className={`w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-60
              ${ubicacionOk
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-rose-200 text-rose-600 hover:bg-rose-50"}`}
          >
            {ubicacionCargando ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            {ubicacionCargando ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}
          </button>
        </div>
        {/* ===== Ubicación ===== */}
        <div className="sm:col-span-2">
          {ubicacionError && (
            <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
              <AlertCircle size={13} /> {ubicacionError} Completa los campos manualmente.
            </p>
          )}
          {ubicacionOk && (
            <p className="text-xs text-emerald-600 mb-2 flex items-center gap-1">
              <Check size={13} /> Ubicación detectada. Puedes editar los campos si es necesario.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Campo label="Departamento" icono={MapPin} error={errores.departamento}>
              <input
                value={form.departamento}
                onChange={(e) => set("departamento", e.target.value)}
                placeholder="Ej: Cundinamarca"
                className={inputCls(errores.departamento, true)}
              />
            </Campo>
            <Campo label="Municipio" obligatorio icono={MapPin} error={errores.municipio}>
              <input
                value={form.municipio}
                onChange={(e) => set("municipio", e.target.value)}
                placeholder="Ej: Medellín"
                className={inputCls(errores.municipio, true)}
              />
            </Campo>
            <div className="sm:col-span-2">
              <Campo label="Dirección" obligatorio icono={MapPin} error={errores.direccion}>
                <input
                  value={form.direccion}
                  onChange={(e) => set("direccion", e.target.value)}
                  placeholder="Calle 123 # 45 - 67"
                  className={inputCls(errores.direccion, true)}
                />
              </Campo>
            </div>
          </div>
        </div>
        <Campo label="Sitio web" icono={Globe} error={errores.website} hint="Opcional">
          <input
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://..."
            className={inputCls(errores.website, true)}
          />
        </Campo>
        <Campo label="Año de fundación" icono={Calendar} error={errores.anio_fundacion}>
          <input
            value={form.anio_fundacion}
            onChange={(e) => set("anio_fundacion", e.target.value)}
            placeholder="2018"
            type="number"
            min="1900"
            max="2100"
            className={inputCls(errores.anio_fundacion, true)}
          />
        </Campo>
        <Campo label="Facebook" icono={FacebookIcon} error={errores.facebook}>
          <input
            value={form.facebook}
            onChange={(e) => set("facebook", e.target.value)}
            placeholder="https://facebook.com/..."
            className={inputCls(errores.facebook, true)}
          />
        </Campo>
        <Campo label="Instagram" icono={InstagramIcon} error={errores.instagram}>
          <input
            value={form.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            placeholder="https://instagram.com/..."
            className={inputCls(errores.instagram, true)}
          />
        </Campo>
        <Campo label="TikTok" icono={Music2} error={errores.tiktok} hint="Opcional">
          <input
            value={form.tiktok}
            onChange={(e) => set("tiktok", e.target.value)}
            placeholder="https://tiktok.com/@..."
            className={inputCls(errores.tiktok, true)}
          />
        </Campo>
      </div>
    </div>
  );
}

function PasoRepresentante({ form, set, errores, inputCls }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <User className="text-rose-500" size={20} />
        <h2 className="text-lg font-bold text-gray-900">Información del representante</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        La persona responsable de administrar la cuenta del refugio en Adoptify.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Campo label="Nombre" obligatorio icono={User} error={errores.representante_nombre}>
          <input
            value={form.representante_nombre}
            onChange={(e) => set("representante_nombre", e.target.value)}
            placeholder="Nombre del representante"
            className={inputCls(errores.representante_nombre, true)}
          />
        </Campo>
        <Campo label="Apellido" obligatorio icono={User} error={errores.representante_apellido}>
          <input
            value={form.representante_apellido}
            onChange={(e) => set("representante_apellido", e.target.value)}
            placeholder="Apellido del representante"
            className={inputCls(errores.representante_apellido, true)}
          />
        </Campo>
        <Campo label="Correo electrónico" obligatorio icono={Mail} error={errores.representante_email} hint="Correo de contacto del representante (no se usa para iniciar sesión)">
          <input
            value={form.representante_email}
            onChange={(e) => set("representante_email", e.target.value)}
            placeholder="representante@correo.com"
            className={inputCls(errores.representante_email, true)}
          />
        </Campo>
        <Campo label="Teléfono" obligatorio icono={Phone} error={errores.representante_telefono}>
          <input
            value={form.representante_telefono}
            onChange={(e) => set("representante_telefono", sanitizarTelefono(e.target.value))}
            placeholder="300 123 4567"
            type="tel"
            inputMode="tel"
            maxLength={20}
            className={inputCls(errores.representante_telefono, true)}
          />
        </Campo>
      </div>

      <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-100 p-4 flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center">
          <Sparkles size={17} />
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          La cuenta del refugio será creada <strong>únicamente cuando la solicitud sea aprobada</strong> por un administrador.
        </p>
      </div>
    </div>
  );
}

function PasoDocumentos({ documentos, errores, agregarArchivos, eliminarArchivo, reemplazarArchivo }) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="text-rose-500" size={20} />
        <h2 className="text-lg font-bold text-gray-900">Documentación</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Adjunta los documentos y fotografías que permitan verificar la autenticidad del refugio.
      </p>

      {/* Obligatorios */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-600 text-xs font-bold uppercase tracking-wide">Obligatorios</span>
        </div>
        <div className="space-y-3">
          {DOC_OBLIGATORIOS.map((doc) => (
            <div key={doc.categoria}>
              <Dropzone
                categoria={doc.categoria}
                label={doc.label}
                desc={doc.desc}
                Icon={doc.icon}
                archivos={documentos[doc.categoria] || []}
                onAgregar={agregarArchivos}
                onEliminar={eliminarArchivo}
                onReemplazar={reemplazarArchivo}
              />
              {errores[`doc_${doc.categoria}`] && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={13} /> {errores[`doc_${doc.categoria}`]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Opcionales */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-600 text-xs font-bold uppercase tracking-wide">Opcionales</span>
        </div>
        <div className="space-y-3">
          {DOC_OPCIONALES.map((doc) => (
            <Dropzone
              key={doc.categoria}
              categoria={doc.categoria}
              label={doc.label}
              desc={doc.desc}
              Icon={doc.icon}
              archivos={documentos[doc.categoria] || []}
              onAgregar={agregarArchivos}
              onEliminar={eliminarArchivo}
              onReemplazar={reemplazarArchivo}
            />
          ))}
        </div>
      </div>

      {/* Tarjeta informativa */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-100 p-4 flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center">
          <Heart size={17} />
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          No te preocupes si aún no cuentas con todos estos documentos. Nuestro equipo evaluará
          tu solicitud teniendo en cuenta la información y las evidencias proporcionadas.
        </p>
      </div>
    </div>
  );
}

function PasoRevision({ form, set, errores, documentos, logo }) {
  const totalDocs = Object.values(documentos).reduce((acc, arr) => acc + (arr?.length || 0), 0);

  const Fila = ({ label, valor }) => (
    <div className="flex justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right break-words max-w-[60%]">{valor || "—"}</span>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <ClipboardCheck className="text-rose-500" size={20} />
        <h2 className="text-lg font-bold text-gray-900">Revisa tu solicitud</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Refugio */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={17} className="text-rose-500" />
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Refugio</h3>
          </div>
          {logo && <img src={logo.base64} alt="Logo" className="w-14 h-14 rounded-2xl object-cover border border-gray-200 mb-3" />}
          <Fila label="Nombre" valor={form.nombre_refugio} />
          <Fila label="Correo" valor={form.email_contacto} />
          <Fila label="Teléfono" valor={form.telefono} />
          <Fila label="Departamento" valor={form.departamento} />
          <Fila label="Municipio" valor={form.municipio} />
          <Fila label="Dirección" valor={form.direccion} />
          <Fila label="Sitio web" valor={form.website} />
          <Fila label="Año de fundación" valor={form.anio_fundacion} />
          <Fila label="Facebook" valor={form.facebook} />
          <Fila label="Instagram" valor={form.instagram} />
          <Fila label="TikTok" valor={form.tiktok} />
          {form.descripcion && (
            <div className="py-2.5">
              <p className="text-sm text-gray-500 mb-1">Descripción</p>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{form.descripcion}</p>
            </div>
          )}
        </div>

        {/* Representante + Documentos */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <User size={17} className="text-rose-500" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Representante</h3>
            </div>
            <Fila label="Nombre" valor={form.representante_nombre} />
            <Fila label="Apellido" valor={form.representante_apellido} />
            <Fila label="Correo" valor={form.representante_email} />
            <Fila label="Teléfono" valor={form.representante_telefono} />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={17} className="text-rose-500" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Documentos</h3>
            </div>
            <Fila label="Archivos adjuntos" valor={`${totalDocs} documento${totalDocs === 1 ? "" : "s"}`} />
            <div className="pt-2 flex flex-wrap gap-1.5">
              {[...DOC_OBLIGATORIOS, ...DOC_OPCIONALES].filter((d) => (documentos[d.categoria] || []).length).map((d) => (
                <span key={d.categoria} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-[11px] font-medium">
                  <Check size={11} /> {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Consentimientos */}
      <div className="mt-7 rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.acepto_veracidad}
              onChange={(e) => set("acepto_veracidad", e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded-md border-gray-300 text-rose-500 focus:ring-rose-400 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900">
              Declaro que toda la información suministrada es verdadera.
            </span>
          </label>
          {errores.acepto_veracidad && (
            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle size={13} /> {errores.acepto_veracidad}
            </p>
          )}
        </div>
        <div>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.autorizo_verificacion}
              onChange={(e) => set("autorizo_verificacion", e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded-md border-gray-300 text-rose-500 focus:ring-rose-400 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900">
              Autorizo a Adoptify para verificar la información proporcionada.
            </span>
          </label>
          {errores.autorizo_verificacion && (
            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle size={13} /> {errores.autorizo_verificacion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ resultado, onVolver }) {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center">
        {/* Icono de éxito */}
        <div className="relative inline-flex mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-2xl opacity-40 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-200 animate-bounce-in">
            <CheckCircle2 size={52} className="text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-display font-extrabold text-gray-900 mb-3">
          {resultado?.modoCompletar ? "¡Información enviada correctamente!" : "¡Solicitud enviada correctamente!"}
        </h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          {resultado?.modoCompletar
            ? "Gracias por completar la información. Tu solicitud vuelve a estar en revisión por nuestro equipo."
            : "Nuestro equipo revisará cuidadosamente la información proporcionada."}
        </p>

        {!resultado?.modoCompletar && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-3 text-left">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Calendar size={17} />
              </span>
              <p className="text-sm text-gray-600">
                El proceso puede tardar entre <strong>24 y 72 horas</strong>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Mail size={17} />
              </span>
              <p className="text-sm text-gray-600">
                Recibirás una respuesta al correo registrado.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 p-3">
              <span className="shrink-0 w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <AlertCircle size={17} />
              </span>
              <p className="text-sm text-amber-800">
                <strong>Importante:</strong> todavía NO existe una cuenta para el refugio. Esta se
                creará únicamente cuando un administrador apruebe tu solicitud.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={onVolver}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg shadow-rose-200"
          >
            <ArrowLeft size={18} /> Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
