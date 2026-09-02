-- ============================================================================
-- Migración: bloqueo por intentos fallidos de inicio de sesión
-- ----------------------------------------------------------------------------
-- Agrega a la tabla 'usuarios' dos columnas para el control de intentos
-- fallidos:
--   - intentos_fallidos: contador de intentos fallidos consecutivos.
--   - bloqueado_hasta:   momento hasta el cual la cuenta queda bloqueada
--                        (15 minutos) tras alcanzar 3 intentos fallidos.
-- Cuando 'bloqueado_hasta' vence, la cuenta se habilita automáticamente en el
-- siguiente intento (el backend la restablece al comprobar la fecha).
--
-- Aplica a usuarios, refugios y tiendas aliadas (todos usan la tabla
-- 'usuarios' y el endpoint /login).
--
-- Ejecutar contra la base de datos (Supabase / PostgreSQL):
--   psql "$DATABASE_URL" -f migracion_intentos_fallidos.sql
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMPTZ;

-- Índice para acelerar las consultas por email en el login (ya existe
-- idx_usuarios_email sobre email, no se duplica aquí).
