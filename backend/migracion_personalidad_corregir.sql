-- ============================================================
-- Migración: Corrige la personalidad de las mascotas existentes.
--
-- Problema: algunos registros quedaron con la personalidad guardada
-- "letra por letra" (array de caracteres individuales, p. ej.
-- {J,u,g,u,e,t,ó,n}) o con rasgos pegados con coma dentro de un solo
-- elemento (p. ej. {"Juguetón, Cariñoso"}). Esto hace que el detalle
-- muestre un chip por letra en lugar de una palabra completa.
--
-- Resultado esperado: array con cada rasgo completo y limpio, p. ej.
--   {Juguetón,Cariñoso}
--
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- 0) VERIFICACIÓN PREVIA
--    Muestra el estado actual y cómo quedaría cada mascota tras la corrección.
SELECT
  id,
  nombre,
  personalidad AS actual,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM unnest(personalidad) AS e WHERE char_length(e) > 1
    ) THEN
      (SELECT array_agg(btrim(parte) ORDER BY ord)
       FROM unnest(string_to_array(array_to_string(personalidad, ','), ','))
            WITH ORDINALITY AS t(parte, ord)
       WHERE btrim(parte) <> '')
    ELSE
      (SELECT array_agg(btrim(parte) ORDER BY ord)
       FROM unnest(string_to_array(array_to_string(personalidad, ''), ','))
            WITH ORDINALITY AS t(parte, ord)
       WHERE btrim(parte) <> '')
  END AS corregido
FROM public.mascotas
WHERE personalidad IS NOT NULL
  AND cardinality(personalidad) > 0
ORDER BY id;

-- 1) APLICAR LA CORRECCIÓN
--    - Si algún elemento tiene más de 1 carácter: se unen con coma y se
--      vuelve a separar (resuelve rasgos pegados "Juguetón, Cariñoso").
--    - Si TODOS los elementos son de 1 carácter (letra por letra): se unen
--      sin separador para reconstruir la palabra y luego se separa por comas.
UPDATE public.mascotas AS m
SET personalidad = c.corregido
FROM (
  SELECT
    m.id,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(m.personalidad) AS e WHERE char_length(e) > 1
      ) THEN
        (SELECT array_agg(btrim(parte) ORDER BY ord)
         FROM unnest(string_to_array(array_to_string(m.personalidad, ','), ','))
              WITH ORDINALITY AS t(parte, ord)
         WHERE btrim(parte) <> '')
      ELSE
        (SELECT array_agg(btrim(parte) ORDER BY ord)
         FROM unnest(string_to_array(array_to_string(m.personalidad, ''), ','))
              WITH ORDINALITY AS t(parte, ord)
         WHERE btrim(parte) <> '')
    END AS corregido
  FROM public.mascotas AS m
  WHERE m.personalidad IS NOT NULL
    AND cardinality(m.personalidad) > 0
) AS c
WHERE m.id = c.id;

-- 2) VERIFICACIÓN POSTERIOR
SELECT id, nombre, personalidad
FROM public.mascotas
WHERE personalidad IS NOT NULL
  AND cardinality(personalidad) > 0
ORDER BY id;
