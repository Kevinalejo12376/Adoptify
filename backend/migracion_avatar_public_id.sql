-- ============================================================================
-- Migración: agregar columna avatar_public_id a la tabla usuarios
-- ----------------------------------------------------------------------------
-- Permite almacenar el public_id de la foto de perfil en Cloudinary para poder
-- eliminar el recurso de Cloudinary cuando la foto se reemplaza o se elimina,
-- evitando imágenes huérfanas. Sigue el patrón de tiendas.logo_public_id.
--
-- Ejecutar contra la base de datos (Supabase / PostgreSQL):
--   psql "$DATABASE_URL" -f migracion_avatar_public_id.sql
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS avatar_public_id VARCHAR(255);
