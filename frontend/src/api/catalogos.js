// Trae las tablas de catalogo (poblados por defecto en la BD) para llenar selects.
// Cada item tiene forma { id, codigo, nombre }.
import { apiFetch } from "./client";

const base = "/api/catalogos";

export const getTiposDocumento   = () => apiFetch(`${base}/tipos-documento`, { auth: false });
export const getRoles            = () => apiFetch(`${base}/roles`, { auth: false });
export const getTiposMascota     = () => apiFetch(`${base}/tipos-mascota`, { auth: false });
export const getTamanosMascota   = () => apiFetch(`${base}/tamanos-mascota`, { auth: false });
export const getGenerosMascota   = () => apiFetch(`${base}/generos-mascota`, { auth: false });
export const getEstadosMascota   = () => apiFetch(`${base}/estados-mascota`, { auth: false });
export const getRazasMascota = (tipo) => {
  const q = tipo ? `?tipo=${encodeURIComponent(tipo)}` : "";
  return apiFetch(`${base}/razas-mascota${q}`, { auth: false });
};
export const getEstadosSolicitud = () => apiFetch(`${base}/estados-solicitud`, { auth: false });
export const getCategoriasProducto = () => apiFetch(`${base}/categorias-producto`, { auth: false });
export const getForoCategorias   = () => apiFetch(`${base}/foro-categorias`, { auth: false });

/** Departamentos de Colombia (select del perfil del usuario). */
export const getDepartamentos = () => apiFetch(`${base}/departamentos`, { auth: false });

/** Municipios de Colombia. Opcionalmente filtrados por departamento_id. */
export const getMunicipios = (departamentoId) => {
  const q = departamentoId ? `?departamento_id=${encodeURIComponent(departamentoId)}` : "";
  return apiFetch(`${base}/municipios${q}`, { auth: false });
};
