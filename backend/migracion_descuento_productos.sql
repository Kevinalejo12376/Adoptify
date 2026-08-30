-- ============================================================
-- Migración: Descuentos en productos (porcentaje 0-100)
-- ============================================================
-- Agrega el porcentaje de descuento a la tabla `productos`.
--   - 0        => sin descuento (comportamiento actual).
--   - 1..100   => porcentaje aplicado sobre `precio` para obtener el
--                 precio final (precio_descuento).
-- El precio final se calcula en el backend con la función `precio_final`
-- (fuente única de verdad), y en el frontend con `precioConDescuento`.
-- ============================================================

ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS descuento SMALLINT NOT NULL DEFAULT 0;

-- Índice útil si se filtra por productos en descuento.
CREATE INDEX IF NOT EXISTS idx_productos_descuento ON productos(descuento);
