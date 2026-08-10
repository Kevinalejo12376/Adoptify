-- ============================================================
-- Migración: Foro de Adoptify — Reacciones múltiples + comentarios editables
-- ============================================================
-- Aplica sobre una base de datos EXISTENTE (Supabase / Postgres).
-- Es idempotente: puede ejecutarse varias veces sin romper datos.
-- ============================================================

-- 1) Nuevos tipos de reacción (catálogo): Me asombra / Me entristece / Me enoja
INSERT INTO tipos_reaccion (codigo, nombre) VALUES
    ('wow',   'Me asombra'),
    ('sad',   'Me entristece'),
    ('angry', 'Me enoja')
ON CONFLICT (codigo) DO NOTHING;

-- 2) Garantiza a nivel de BD UNA ÚNICA reacción por usuario y publicación.
--    a) Elimina reacciones duplicadas conservando la más reciente (mayor id).
DELETE FROM foro_reacciones a
USING foro_reacciones b
WHERE a.post_id = b.post_id
  AND a.usuario_id = b.usuario_id
  AND a.id < b.id;

--    b) Reemplaza el constraint antiguo (permitía un tipo por fila) por uno
--       que permite una sola fila por (post, usuario). El tipo se actualiza
--       al cambiar de reacción.
ALTER TABLE foro_reacciones
    DROP CONSTRAINT IF EXISTS foro_reacciones_post_id_usuario_id_tipo_reaccion_id_key;

ALTER TABLE foro_reacciones
    ADD CONSTRAINT foro_reacciones_una_por_usuario UNIQUE (post_id, usuario_id);
