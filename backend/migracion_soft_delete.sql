-- ============================================================
-- Migración: Soft delete (borrado lógico) en Adoptify
--
-- Agrega las columnas 'activo' (Boolean) y 'eliminado_en' (timestamp)
-- a las tablas principales. El borrado lógico reemplaza el DELETE físico:
--   - activo = false       -> el registro queda oculto del público
--   - eliminado_en         -> fecha en que se desactivó
--
-- Producto y Usuario ya tenían 'activo'; aquí solo se agrega 'eliminado_en'.
-- Las tablas transaccionales (pedidos, kardex, donaciones, auditoría, etc.)
-- NO requieren soft delete: son registros históricos.
-- ============================================================

-- Mascotas (nuevo: activo + eliminado_en)
ALTER TABLE mascotas ADD COLUMN IF NOT EXISTS activo       BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE mascotas ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- Refugios (nuevo: activo + eliminado_en)
ALTER TABLE refugios ADD COLUMN IF NOT EXISTS activo       BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE refugios ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- Tiendas (nuevo: activo + eliminado_en)
ALTER TABLE tiendas ADD COLUMN IF NOT EXISTS activo       BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE tiendas ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- Productos (ya tenía activo; solo eliminado_en)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- Usuarios (ya tenía activo; solo eliminado_en)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- Foro: publicaciones y comentarios (nuevo: activo + eliminado_en)
ALTER TABLE foro_posts      ADD COLUMN IF NOT EXISTS activo       BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE foro_posts      ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;
ALTER TABLE foro_comentarios ADD COLUMN IF NOT EXISTS activo       BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE foro_comentarios ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

-- Índices parciales para que las consultas públicas ignoren los inactivos
CREATE INDEX IF NOT EXISTS idx_mascotas_activo    ON mascotas(activo)  WHERE activo;
CREATE INDEX IF NOT EXISTS idx_refugios_activo    ON refugios(activo)  WHERE activo;
CREATE INDEX IF NOT EXISTS idx_tiendas_activo     ON tiendas(activo)   WHERE activo;
CREATE INDEX IF NOT EXISTS idx_productos_activo   ON productos(activo) WHERE activo;
CREATE INDEX IF NOT EXISTS idx_foro_posts_activo  ON foro_posts(activo) WHERE activo;
CREATE INDEX IF NOT EXISTS idx_foro_coment_activo ON foro_comentarios(activo) WHERE activo;
