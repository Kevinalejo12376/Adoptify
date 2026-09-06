-- ============================================================
-- Migración: reseñas/valoraciones de REFUGIOS y TIENDAS ALIADAS
-- ============================================================
-- Las reseñas de PRODUCTOS viven en la tabla `resenas` (producto_id).
-- Estas dos tablas nuevas permiten valorar refugios y tiendas
-- (UNA reseña por usuario y entidad), y el promedio se guarda en
-- `refugios.rating` / `tiendas.rating` para mostrarlo en el listado
-- y en el perfil público.
--
-- Idempotente: se puede ejecutar varias veces sin errores.
-- ============================================================

CREATE TABLE IF NOT EXISTS resenas_refugios (
    id           BIGSERIAL PRIMARY KEY,
    refugio_id   BIGINT NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
    usuario_id   BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario   TEXT,
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    editada_en   TIMESTAMPTZ,
    CONSTRAINT uq_resena_refugio_usuario UNIQUE (refugio_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_resenas_refugio ON resenas_refugios(refugio_id);

CREATE TABLE IF NOT EXISTS resenas_tiendas (
    id           BIGSERIAL PRIMARY KEY,
    tienda_id    BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    usuario_id   BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario   TEXT,
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    editada_en   TIMESTAMPTZ,
    CONSTRAINT uq_resena_tienda_usuario UNIQUE (tienda_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_resenas_tienda ON resenas_tiendas(tienda_id);

-- Columna de rating promedio (mostrada en listados y perfiles públicos).
ALTER TABLE refugios ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) NOT NULL DEFAULT 0;
ALTER TABLE tiendas  ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) NOT NULL DEFAULT 0;
