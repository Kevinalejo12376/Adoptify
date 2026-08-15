-- ============================================================
-- Migración: agregar la relación entre razas_mascota y tipos_mascota.
-- Asigna a cada raza existente su tipo (perro/gato) según su código,
-- para que el selector de razas se filtre por el tipo de mascota.
--
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- 1) Agregar la columna tipo_mascota_id (si no existe) con su FK
ALTER TABLE public.razas_mascota
  ADD COLUMN IF NOT EXISTS tipo_mascota_id BIGINT REFERENCES tipos_mascota(id);

-- 2) Asignar tipo a las razas existentes según su código (perros)
UPDATE public.razas_mascota
SET tipo_mascota_id = (SELECT id FROM public.tipos_mascota WHERE codigo = 'perro')
WHERE codigo IN (
  'labrador','pastor_aleman','golden','bulldog','poodle','chihuahua','beagle',
  'rottweiler','criollo','pug','shih_tzu','doberman','boxer','cocker',
  'siberiano','schnauzer','maltes','yorkshire'
);

-- 3) Asignar tipo a las razas existentes según su código (gatos)
UPDATE public.razas_mascota
SET tipo_mascota_id = (SELECT id FROM public.tipos_mascota WHERE codigo = 'gato')
WHERE codigo IN (
  'persa','siames','maine_coon','bengali','sphynx','angora','ragdoll',
  'britanico','comun_europeo','fold_escoces'
);

-- 4) Índice para acelerar el filtro por tipo
CREATE INDEX IF NOT EXISTS idx_razas_mascota_tipo ON public.razas_mascota(tipo_mascota_id);
