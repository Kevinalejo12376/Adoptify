-- ============================================================
-- Migración: personalidad de la tabla `mascotas` pasa de TEXT
-- (lista separada por comas) a text[] (array de textos).
--
-- Convierte los datos existentes sin perder información:
--   Antes:  "Juguetón, Cariñoso, Sociable"
--   Después: ["Juguetón", "Cariñoso", "Sociable"]
--
-- NOTA: PostgreSQL no permite subconsultas dentro de la expresión
-- `USING` de ALTER COLUMN TYPE, por eso se hace en pasos:
--   1) crear columna temporal
--   2) convertir los datos con UPDATE (aquí sí se permite subconsulta)
--   3) eliminar la columna original y renombrar la nueva
--
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- 1) Columna temporal con el nuevo tipo
ALTER TABLE public.mascotas ADD COLUMN personalidad_arr text[];

-- 2) Convertir los datos existentes (limpia espacios y descarta vacíos)
UPDATE public.mascotas
SET personalidad_arr = (
  SELECT array_agg(btrim(elem) ORDER BY ord)
  FROM unnest(string_to_array(personalidad, ',')) WITH ORDINALITY AS t(elem, ord)
  WHERE btrim(elem) <> ''
)
WHERE personalidad IS NOT NULL AND btrim(personalidad) <> '';

-- 3) Reemplazar la columna original por la nueva
ALTER TABLE public.mascotas DROP COLUMN personalidad;
ALTER TABLE public.mascotas RENAME COLUMN personalidad_arr TO personalidad;

-- Opcional: valor por defecto como array vacío para los nuevos registros.
-- ALTER TABLE public.mascotas ALTER COLUMN personalidad SET DEFAULT '{}';
