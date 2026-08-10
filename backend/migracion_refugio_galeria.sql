-- ============================================================
-- Migración: Galería de fotos del refugio
-- ============================================================
-- Garantiza que exista la tabla refugio_imagenes (idempotente).
-- Las imágenes se suben a Cloudinary y aquí solo se guarda la
-- secure_url (url), el orden y si es portada.
-- ============================================================

CREATE TABLE IF NOT EXISTS refugio_imagenes (
    id          BIGSERIAL PRIMARY KEY,
    refugio_id  BIGINT NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    es_portada  BOOLEAN NOT NULL DEFAULT false,
    orden       INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_refugio_imagenes_refugio ON refugio_imagenes(refugio_id);
