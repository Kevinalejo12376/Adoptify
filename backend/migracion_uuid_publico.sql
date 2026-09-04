-- Migración: UUID público para mascotas y productos
-- ------------------------------------------------------------------------------------
-- Agrega una columna `uuid` (identificador público único, UUID v4) a las tablas
-- `mascotas` y `productos`. El id numérico (BIGSERIAL) se conserva como PK y como
-- FK de todas las relaciones internas (favoritos, solicitudes, reseñas, pedidos,
-- kardex...); el `uuid` se usa únicamente en las URLs públicas de detalle
-- (p. ej. /animal/<uuid> y /product/<uuid>).
--
-- Es idempotente: se puede ejecutar más de una vez sin errores.
--
-- Ejecutar en Supabase (SQL Editor):
--   psql "$CONNECTION_STRING" -f migracion_uuid_publico.sql
-- (gen_random_uuid() está disponible en Postgres 13+ / Supabase por defecto)

-- 1) Mascotas
ALTER TABLE mascotas
    ADD COLUMN IF NOT EXISTS uuid VARCHAR(36);

-- Backfill: asigna UUID a los registros existentes que aún no tienen uno.
UPDATE mascotas SET uuid = gen_random_uuid()::text WHERE uuid IS NULL;

-- Índice único (acelera la resolución por uuid en las URLs públicas).
CREATE UNIQUE INDEX IF NOT EXISTS idx_mascotas_uuid ON mascotas (uuid);

-- Garantiza que el uuid siempre esté presente y se genere para filas nuevas
-- insertadas por SQL directo (no solo por la app).
ALTER TABLE mascotas
    ALTER COLUMN uuid SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN uuid SET NOT NULL;

-- 2) Productos
ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS uuid VARCHAR(36);

UPDATE productos SET uuid = gen_random_uuid()::text WHERE uuid IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_uuid ON productos (uuid);

ALTER TABLE productos
    ALTER COLUMN uuid SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN uuid SET NOT NULL;
