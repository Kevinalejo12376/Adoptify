-- ============================================================
-- Migración: Kardex de Inventario (tiendas aliadas)
-- Crea la tabla movimientos_kardex + índices + Row Level Security.
-- Ejecutar en el SQL editor de Supabase (una sola vez).
-- ============================================================

CREATE TABLE IF NOT EXISTS movimientos_kardex (
    id               BIGSERIAL PRIMARY KEY,
    producto_id      BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tienda_id        BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    tipo_movimiento  VARCHAR(30) NOT NULL, -- ENTRADA | SALIDA | AJUSTE_POSITIVO | AJUSTE_NEGATIVO
    concepto         VARCHAR(255) NOT NULL DEFAULT '',
    cantidad         INT NOT NULL DEFAULT 0,
    costo_unitario   NUMERIC(12,2) NOT NULL DEFAULT 0,
    costo_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
    saldo_cantidad   INT NOT NULL DEFAULT 0,
    saldo_valor      NUMERIC(14,2) NOT NULL DEFAULT 0,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kardex_producto ON movimientos_kardex(producto_id);
CREATE INDEX IF NOT EXISTS idx_kardex_tienda   ON movimientos_kardex(tienda_id);
CREATE INDEX IF NOT EXISTS idx_kardex_tipo     ON movimientos_kardex(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_kardex_fecha    ON movimientos_kardex(creado_en);

-- RLS habilitado. Al igual que el resto del esquema, el acceso pasa por el
-- backend FastAPI (rol 'postgres', que omite RLS), por lo que no se definen
-- políticas públicas: esto bloquea el acceso directo vía anon/service keys.
ALTER TABLE movimientos_kardex ENABLE ROW LEVEL SECURITY;

-- Opcional: verificación rápida de la tabla creada
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'movimientos_kardex' ORDER BY ordinal_position;
