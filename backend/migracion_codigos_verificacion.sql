-- ============================================================
-- ADOPTIFY - Migracion: Tabla de codigos de verificacion
-- ============================================================
-- Ejecutar en Supabase -> SQL Editor -> New query.
-- ============================================================

CREATE TABLE IF NOT EXISTS codigos_verificacion (
    id         BIGSERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    codigo     VARCHAR(6) NOT NULL,
    tipo       VARCHAR(20) NOT NULL,  -- 'registro' | 'reset_password'
    usado      BOOLEAN NOT NULL DEFAULT false,
    expira_en  TIMESTAMPTZ NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_codigos_verificacion_email
    ON codigos_verificacion(email);

-- RLS (opcional, pero consistente con el resto del esquema)
ALTER TABLE codigos_verificacion ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIN DE LA MIGRACION
-- ============================================================
