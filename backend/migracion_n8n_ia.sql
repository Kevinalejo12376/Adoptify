-- ============================================================
-- Adoptify - Migración: integración n8n / IA
-- Ejecuta este script en Supabase (SQL Editor) o cualquier Postgres.
-- En desarrollo local (SQLite) las tablas las crea SQLAlchemy automáticamente.
-- ============================================================

-- 1) Cola de tareas de IA (fuente de verdad para n8n)
CREATE TABLE IF NOT EXISTS tareas_ia (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(60) NOT NULL,
    payload TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    resultado TEXT,
    error TEXT,
    intentos INTEGER NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    procesado_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tareas_ia_estado ON tareas_ia(estado);

-- 2) Sesiones y mensajes del chatbot (historial persistente)
CREATE TABLE IF NOT EXISTS chat_sesiones (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_mensajes (
    id BIGSERIAL PRIMARY KEY,
    sesion_id BIGINT NOT NULL REFERENCES chat_sesiones(id) ON DELETE CASCADE,
    rol VARCHAR(20) NOT NULL,
    contenido TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_msj_sesion ON chat_mensajes(sesion_id);

-- 3) Preferencia de notificación por WhatsApp (opt-in)
ALTER TABLE configuraciones
    ADD COLUMN IF NOT EXISTS notif_whatsapp BOOLEAN NOT NULL DEFAULT false;
