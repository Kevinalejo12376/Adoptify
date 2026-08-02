-- ============================================================
-- Migración: Publicaciones guardadas del foro
-- Crea la tabla foro_guardados + índices + Row Level Security.
-- Ejecutar en el SQL editor de Supabase (una sola vez).
-- ============================================================

CREATE TABLE IF NOT EXISTS foro_guardados (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    post_id     BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_foro_guardados_usuario ON foro_guardados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_foro_guardados_post   ON foro_guardados(post_id);

-- RLS habilitado (las políticas se gestionan igual que el resto del esquema)
ALTER TABLE foro_guardados ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso por usuario autenticado (ajustar según el modelo de auth usado)
CREATE POLICY "foro_guardados_select_own" ON foro_guardados
    FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "foro_guardados_insert_own" ON foro_guardados
    FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "foro_guardados_delete_own" ON foro_guardados
    FOR DELETE USING (usuario_id = auth.uid());
