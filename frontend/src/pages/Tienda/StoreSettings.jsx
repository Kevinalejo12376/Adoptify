import React, { useState, useEffect } from "react";
import {
  Store, User, Users, Lock, Save, Loader2, Upload, AlertCircle, CheckCircle2, ShieldCheck,
  Eye, EyeOff,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import {
  cambiarPasswordTienda,
  cambiarLogoTienda,
  eliminarLogoTienda,
  representanteTienda,
  actualizarRepresentanteTienda,
  cambiarCorreoRepresentanteTienda,
  cambiarRepresentanteTienda,
  listarAdministradoresTienda,
} from "../../api/tienda";
import { getTiposDocumento } from "../../api/catalogos";
import StoreAdministradores from "./StoreAdministradores";
import ImageUploadModal from "../../components/ImageUploadModal";
import FieldError from "../../components/FieldError";
import {
  validarNombre, validarApellido, validarEmail, validarTelefono, validarPassword,
  normalizarEmail, limpiarEspacios, claseInput,
} from "../../utils/validaciones";

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all";

function Field({ label, value, onChange, type = "text", placeholder = "", error = "" }) {
  const [mostrar, setMostrar] = useState(false);
  const esPassword = type === "password";
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={esPassword && mostrar ? "text" : type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${claseInput(inputCls, !!error)} ${esPassword ? "pr-10" : ""}`}
        />
        {esPassword && (
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-dark-text-secondary dark:hover:text-white transition-colors"
            aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
            tabIndex={-1}
          >
            {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      <FieldError mensaje={error} />
    </div>
  );
}

function Feedback({ tipo, texto }) {
  if (!texto) return null;
  const cls = tipo === "error"
    ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
    : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300";
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${cls}`}>
      {tipo === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {texto}
    </div>
  );
}

export default function StoreSettings() {
  const { store, esSuperAdmin, tienePermiso, actualizarStore, refresh, storeLogo } = useStore();

  // Secciones visibles segun permisos del usuario autenticado.
  const secciones = [];
  if (tienePermiso("tienda.editar_informacion")) secciones.push({ id: "tienda", label: "Configuración de la tienda", icon: Store, desc: "Información propia de la tienda" });
  if (esSuperAdmin) {
    secciones.push({ id: "representante", label: "Configuración del representante", icon: User, desc: "Cambiar representante e información personal" });
    secciones.push({ id: "administradores", label: "Gestión de administradores", icon: Users, desc: "Crear, editar y eliminar administradores" });
  }
  secciones.push({ id: "password", label: "Contraseña", icon: Lock, desc: "Cambia tu contraseña de acceso" });

  const [activeSection, setActiveSection] = useState(
    () => (secciones[0]?.id || "password")
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [logoModalOpen, setLogoModalOpen] = useState(false);

  // Tienda
  const [form, setForm] = useState({});
  useEffect(() => {
    if (store) setForm((prev) => ({ ...prev, ...store }));
  }, [store]);

  // Representante
  const [rep, setRep] = useState(null);
  const [repForm, setRepForm] = useState({});
  const [tiposDoc, setTiposDoc] = useState([]);
  const [correoForm, setCorreoForm] = useState({ email: "", password_actual: "" });
  const [admins, setAdmins] = useState([]);
  const [nuevoRepId, setNuevoRepId] = useState("");

  useEffect(() => {
    getTiposDocumento().then(setTiposDoc).catch(() => setTiposDoc([]));
  }, []);

  useEffect(() => {
    if (esSuperAdmin && activeSection === "representante") {
      representanteTienda().then((r) => {
        setRep(r);
        setRepForm({ nombre: r.nombre || "", apellido: r.apellido || "", telefono: r.telefono || "", numero_documento: r.numero_documento || "", tipo_documento: r.tipo_documento || "" });
      }).catch(() => setRep(null));
      listarAdministradoresTienda().then((data) => setAdmins((data || []).filter((a) => a.tipo !== "super_admin"))).catch(() => setAdmins([]));
    }
  }, [esSuperAdmin, activeSection]);

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const validarSeccion = (campos) => {
    const nuevos = {};
    campos.forEach(([campo, fn]) => { nuevos[campo] = fn(); });
    setErrors((prev) => ({ ...prev, ...nuevos }));
    return !Object.values(nuevos).some((m) => m);
  };

  const handleSaveTienda = async () => {
    setError("");
    const ok = validarSeccion([
      ["nombre", () => validarNombre(form.nombre, { campo: "nombre", obligatorio: false })],
      ["email", () => validarEmail(form.email, { obligatorio: false })],
      ["telefono", () => validarTelefono(form.telefono, { obligatorio: false })],
    ]);
    if (!ok) return;
    setSaving(true);
    try {
      const payload = {
        nombre: limpiarEspacios(form.nombre), descripcion: form.descripcion,
        email: normalizarEmail(form.email), telefono: form.telefono?.trim() || null,
        ciudad: form.ciudad, direccion: form.direccion,
        website: form.website, facebook: form.facebook, instagram: form.instagram,
      };
      if (tienePermiso("tienda.actualizar_horarios")) {
        payload.horario_semana = form.horario_semana;
        payload.horario_fin_semana = form.horario_fin_semana;
      }
      await actualizarStore(payload);
      flashSaved();
    } catch (e) {
      setError(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  // Guarda el logo editado (base64) desde el modal de subida.
  const handleGuardarLogo = async (base64) => {
    setError("");
    try {
      await cambiarLogoTienda(base64, "logo");
      await refresh();
      flashSaved();
    } catch (err) {
      setError(err?.message || "No se pudo cambiar el logo");
      throw err;
    }
  };

  // Elimina el logo de Cloudinary y de la base de datos.
  const handleEliminarLogo = async () => {
    setError("");
    try {
      await eliminarLogoTienda();
      await refresh();
      flashSaved();
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el logo");
      throw err;
    }
  };

  const handleSaveRep = async () => {
    setError("");
    const ok = validarSeccion([
      ["nombre", () => validarNombre(repForm.nombre, { campo: "nombre" })],
      ["apellido", () => validarApellido(repForm.apellido)],
      ["telefono", () => validarTelefono(repForm.telefono, { obligatorio: false })],
    ]);
    if (!ok) return;
    setSaving(true);
    try {
      await actualizarRepresentanteTienda({
        ...repForm,
        nombre: limpiarEspacios(repForm.nombre),
        apellido: limpiarEspacios(repForm.apellido) || null,
        telefono: repForm.telefono?.trim() || null,
      });
      await refresh();
      flashSaved();
    } catch (e) {
      setError(e?.message || "No se pudo guardar el representante");
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarCorreo = async () => {
    setError("");
    const errEmail = validarEmail(correoForm.email);
    const errPassword = correoForm.password_actual ? "" : "Ingresa la contraseña actual.";
    setErrors((prev) => ({ ...prev, correo: errEmail, correo_password: errPassword }));
    if (errEmail || errPassword) return;
    setSaving(true);
    try {
      await cambiarCorreoRepresentanteTienda({ ...correoForm, email: normalizarEmail(correoForm.email) });
      setCorreoForm({ email: "", password_actual: "" });
      await refresh();
      flashSaved();
    } catch (e) {
      setError(e?.message || "No se pudo cambiar el correo");
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarRepresentante = async () => {
    if (!nuevoRepId) return;
    setError(""); setSaving(true);
    try {
      await cambiarRepresentanteTienda({ nuevo_usuario_id: Number(nuevoRepId) });
      setNuevoRepId("");
      await refresh();
      flashSaved();
    } catch (e) {
      setError(e?.message || "No se pudo cambiar el representante");
    } finally {
      setSaving(false);
    }
  };

  // Contraseña
  const [pwd, setPwd] = useState({ actual: "", nueva: "", confirmar: "" });
  const handleSavePassword = async () => {
    setError("");
    const errActual = pwd.actual ? "" : "Ingresa la contraseña actual.";
    const errNueva = validarPassword(pwd.nueva);
    const errConfirmar = pwd.nueva && pwd.confirmar !== pwd.nueva ? "Las contraseñas no coinciden." : "";
    setErrors((prev) => ({ ...prev, pwd_actual: errActual, pwd_nueva: errNueva, pwd_confirmar: errConfirmar }));
    if (errActual || errNueva || errConfirmar) return;
    setSaving(true);
    try {
      await cambiarPasswordTienda({ password_actual: pwd.actual, password_nueva: pwd.nueva });
      setPwd({ actual: "", nueva: "", confirmar: "" });
      flashSaved();
    } catch (e) {
      setError(e?.message || "No se pudo cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const renderSection = () => {
    if (activeSection === "tienda") {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Configuración de la tienda</h3>
          <p className="text-xs text-gray-400">Información relacionada únicamente con la empresa.</p>

          {tienePermiso("tienda.cambiar_logo") && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-500/10 dark:to-amber-500/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {storeLogo || store?.logo_url ? (
                  <img src={storeLogo || store?.logo_url} alt="logo" className="w-full h-full object-cover" />
                ) : <Store size={26} className="text-rose-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Logo de la tienda</p>
                <p className="text-xs text-gray-400 mb-2">El logo se sincroniza automáticamente en toda la aplicación.</p>
                <button
                  type="button"
                  onClick={() => setLogoModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl hover:shadow-md transition-all"
                >
                  <Upload size={14} /> Cambiar logo
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre comercial" value={form.nombre} onChange={(v) => { setForm((p) => ({ ...p, nombre: v })); setErrors((prev) => ({ ...prev, nombre: "" })); }} error={errors.nombre} />
            <Field label="Correo electrónico" value={form.email} onChange={(v) => { setForm((p) => ({ ...p, email: v })); setErrors((prev) => ({ ...prev, email: "" })); }} error={errors.email} />
            <Field label="Teléfono" value={form.telefono} onChange={(v) => { setForm((p) => ({ ...p, telefono: v })); setErrors((prev) => ({ ...prev, telefono: "" })); }} error={errors.telefono} />
            <Field label="Ciudad" value={form.ciudad} onChange={(v) => setForm((p) => ({ ...p, ciudad: v }))} />
            <Field label="Dirección" value={form.direccion} onChange={(v) => setForm((p) => ({ ...p, direccion: v }))} />
            <Field label="Sitio web" value={form.website} onChange={(v) => setForm((p) => ({ ...p, website: v }))} />
            <Field label="Facebook" value={form.facebook} onChange={(v) => setForm((p) => ({ ...p, facebook: v }))} />
            <Field label="Instagram" value={form.instagram} onChange={(v) => setForm((p) => ({ ...p, instagram: v }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Descripción</label>
            <textarea rows={3} value={form.descripcion || ""} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} className={`${inputCls} resize-none`} />
          </div>

          {tienePermiso("tienda.actualizar_horarios") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Horario semana" value={form.horario_semana} onChange={(v) => setForm((p) => ({ ...p, horario_semana: v }))} placeholder="Ej: 8:00 - 18:00" />
              <Field label="Horario fin de semana" value={form.horario_fin_semana} onChange={(v) => setForm((p) => ({ ...p, horario_fin_semana: v }))} placeholder="Ej: 9:00 - 14:00" />
            </div>
          )}
        </div>
      );
    }

    if (activeSection === "representante") {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
              <ShieldCheck size={16} className="text-rose-500" /> Configuración del representante
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Solo el Super Administrador puede modificar estos datos.</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Representante actual: <strong>{rep ? `${rep.nombre} ${rep.apellido || ""}`.trim() : "—"}</strong> ({rep?.email || "—"})
            </p>
          </div>

          {/* Informacion personal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-dark-text">Información personal</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre" value={repForm.nombre} onChange={(v) => { setRepForm((p) => ({ ...p, nombre: v })); setErrors((prev) => ({ ...prev, nombre: "" })); }} error={errors.nombre} />
              <Field label="Apellido" value={repForm.apellido} onChange={(v) => { setRepForm((p) => ({ ...p, apellido: v })); setErrors((prev) => ({ ...prev, apellido: "" })); }} error={errors.apellido} />
              <Field label="Teléfono" value={repForm.telefono} onChange={(v) => { setRepForm((p) => ({ ...p, telefono: v })); setErrors((prev) => ({ ...prev, telefono: "" })); }} error={errors.telefono} />
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Tipo de documento</label>
                <select value={repForm.tipo_documento || ""} onChange={(e) => setRepForm((p) => ({ ...p, tipo_documento: e.target.value }))} className={inputCls}>
                  <option value="">Selecciona...</option>
                  {(tiposDoc || []).map((t) => <option key={t.id} value={t.codigo}>{t.nombre}</option>)}
                </select>
              </div>
              <Field label="Número de documento" value={repForm.numero_documento} onChange={(v) => setRepForm((p) => ({ ...p, numero_documento: v }))} />
            </div>
          </div>

          {/* Cambiar correo */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-dark-border">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-dark-text">Cambiar correo del representante</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nuevo correo" type="email" value={correoForm.email} onChange={(v) => { setCorreoForm((p) => ({ ...p, email: v })); setErrors((prev) => ({ ...prev, correo: "" })); }} error={errors.correo} />
              <Field label="Contraseña actual" type="password" value={correoForm.password_actual} onChange={(v) => { setCorreoForm((p) => ({ ...p, password_actual: v })); setErrors((prev) => ({ ...prev, correo_password: "" })); }} error={errors.correo_password} />
            </div>
          </div>

          {/* Cambiar representante */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-dark-border">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-dark-text">Cambiar representante (Super Administrador)</h4>
            <p className="text-xs text-gray-400">Elige un administrador activo para transferirle el control absoluto de la tienda.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1.5">Nuevo representante</label>
                <select value={nuevoRepId} onChange={(e) => setNuevoRepId(e.target.value)} className={inputCls}>
                  <option value="">Selecciona un administrador...</option>
                  {(admins || []).map((a) => <option key={a.id} value={a.usuario_id}>{a.nombre_completo || a.nombre} ({a.email})</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "administradores") {
      return <StoreAdministradores />;
    }

    // password
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text">Cambiar Contraseña</h3>
        <div className="space-y-4 max-w-md">
          <Field label="Contraseña actual" type="password" value={pwd.actual} onChange={(v) => { setPwd((p) => ({ ...p, actual: v })); setErrors((prev) => ({ ...prev, pwd_actual: "" })); }} placeholder="••••••••" error={errors.pwd_actual} />
          <Field label="Nueva contraseña" type="password" value={pwd.nueva} onChange={(v) => { setPwd((p) => ({ ...p, nueva: v })); setErrors((prev) => ({ ...prev, pwd_nueva: "" })); }} placeholder="••••••••" error={errors.pwd_nueva} />
          <Field label="Confirmar nueva contraseña" type="password" value={pwd.confirmar} onChange={(v) => { setPwd((p) => ({ ...p, confirmar: v })); setErrors((prev) => ({ ...prev, pwd_confirmar: "" })); }} placeholder="••••••••" error={errors.pwd_confirmar} />
        </div>
      </div>
    );
  };

  const showSaveButton =
    activeSection === "tienda" || activeSection === "password" ||
    (activeSection === "representante" && !nuevoRepId);

  const handleSave = () => {
    if (activeSection === "tienda") handleSaveTienda();
    else if (activeSection === "password") handleSavePassword();
    else if (activeSection === "representante") handleSaveRep();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text font-display">Configuración</h1>
        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
          Administra la configuración de tu tienda. Las secciones visibles dependen de tus permisos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de secciones */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
            <div className="p-1">
              {secciones.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => { setActiveSection(section.id); setError(""); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white"
                        : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border"
                    }`}
                  >
                    <section.icon size={18} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${isActive ? "text-white" : ""}`}>{section.label}</p>
                      <p className={`text-[10px] truncate ${isActive ? "text-white/70" : "text-gray-400"}`}>{section.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contenido de la seccion */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-6">
            {renderSection()}

            <div className="mt-6">
              <Feedback tipo="error" texto={error} />
              <Feedback tipo="success" texto={saved ? "Cambios guardados correctamente" : ""} />
            </div>

            {showSaveButton && (
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar Cambios"}
                </button>
              </div>
            )}

            {activeSection === "representante" && (
              <div className="flex flex-wrap justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  onClick={handleCambiarCorreo}
                  disabled={saving || !correoForm.email || !correoForm.password_actual}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Cambiar correo
                </button>
                <button
                  onClick={handleCambiarRepresentante}
                  disabled={saving || !nuevoRepId}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Transferir super administración
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de subida y edición del logo */}
      <ImageUploadModal
        open={logoModalOpen}
        onClose={() => setLogoModalOpen(false)}
        title="Editar logo de la tienda"
        aspect={1}
        shape="square"
        canDelete={!!(storeLogo || store?.logo_url)}
        onSave={handleGuardarLogo}
        onDelete={handleEliminarLogo}
      />
    </div>
  );
}
