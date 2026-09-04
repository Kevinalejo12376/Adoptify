-- ============================================================
-- Migración: Papelera / Borradores de 30 días (mascotas y productos)
--
-- No se agregan columnas nuevas: la papelera usa las columnas existentes
-- 'activo' y 'eliminado_en' (creadas por migracion_soft_delete.sql):
--
--   - eliminado_en IS NULL            -> VIVO (visible para el dueño).
--   - eliminado_en (últimos 30 días)  -> EN PAPELERA / BORRADOR (restaurable).
--   - eliminado_en (hace > 30 días)   -> PURGADO (archivado, no restaurable).
--
-- Reglas de negocio (rol Refugio y Tienda):
--   * Al eliminar una mascota/producto NO adoptado va a Borradores.
--   * Las mascotas ADOPTADAS NO van a la papelera: quedan ocultas de
--     inmediato (activo=false, eliminado_en NULL).
--   * Desde Borradores se puede restaurar o eliminar definitivamente.
--   * A los 30 días los borradores se purgan (desaparecen de toda vista).
--
-- Esta migración SOLO optimiza el acceso con índices sobre eliminado_en
-- (los índices parciales de 'activo' ya los creó migracion_soft_delete.sql).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_mascotas_papelera  ON mascotas(eliminado_en)  WHERE eliminado_en IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_papelera ON productos(eliminado_en) WHERE eliminado_en IS NOT NULL;
