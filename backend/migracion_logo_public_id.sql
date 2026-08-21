-- ============================================================================
-- Migración: agregar columna logo_public_id a la tabla tiendas
-- ----------------------------------------------------------------------------
-- Permite almacenar el public_id del logo en Cloudinary para poder eliminar el
-- recurso de Cloudinary cuando el logo se reemplaza o se elimina, evitando
-- imágenes huérfanas.
--
-- Ejecutar contra la base de datos (Supabase / PostgreSQL):
--   psql "$DATABASE_URL" -f migracion_logo_public_id.sql
-- ============================================================================

ALTER TABLE tiendas
  ADD COLUMN IF NOT EXISTS logo_public_id TEXT;
