-- ============================================================
-- Migración: pagos con Stripe (+ Stripe Connect para tiendas)
-- ============================================================
-- Reutiliza la tabla 'pagos' existente (antes usada por dLocal) y le agrega
-- las columnas de Stripe SIN borrar los datos históricos:
--   - Los registros anteriores quedan con proveedor = 'dlocal'.
--   - Los pagos nuevos se crean con proveedor = 'stripe'.
-- También agrega a 'tiendas' las columnas de Stripe Connect.
--
-- En desarrollo local (SQLite) las tablas/columnas las crea
-- Base.metadata.create_all a partir de los modelos.
-- En Supabase, este script también se aplica al arrancar el backend
-- (ver _crear_tabla_pagos y _migrar_stripe_connect_tiendas en app/main.py).
-- Este archivo es el script SQL independiente por si se quiere ejecutar
-- a mano en el SQL Editor de Supabase.

-- 1) Tabla pagos: crea la tabla si aún no existe (esquema Stripe).
CREATE TABLE IF NOT EXISTS pagos (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    proveedor VARCHAR(20) NOT NULL DEFAULT 'stripe',
    order_id VARCHAR(125) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    estado_stripe VARCHAR(80),
    monto BIGINT NOT NULL DEFAULT 0,
    moneda VARCHAR(3) NOT NULL DEFAULT 'COP',
    metodo_pago VARCHAR(30),
    redirect_url TEXT,
    stripe_checkout_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    stripe_amount BIGINT,
    stripe_currency VARCHAR(3),
    comision_plataforma BIGINT,
    monto_distribuido BIGINT,
    detalle_distribucion TEXT,
    stripe_transfer_ids TEXT,
    respuesta_stripe TEXT,
    notificacion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ
);

-- 2) Si la tabla ya existía (esquema dLocal), agrega las columnas nuevas.
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS proveedor VARCHAR(20) NOT NULL DEFAULT 'stripe';
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS estado_stripe VARCHAR(80);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS stripe_amount BIGINT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS stripe_currency VARCHAR(3);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS comision_plataforma BIGINT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS monto_distribuido BIGINT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS detalle_distribucion TEXT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS stripe_transfer_ids TEXT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS respuesta_stripe TEXT;

-- 3) Marca los registros históricos de dLocal (conserva datos; no los borra).
UPDATE pagos SET proveedor = 'dlocal' WHERE proveedor IS NULL OR proveedor = '';

-- 4) Índices de pagos.
CREATE INDEX IF NOT EXISTS idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_order_id ON pagos(order_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor ON pagos(proveedor);
CREATE INDEX IF NOT EXISTS idx_pagos_session ON pagos(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pi ON pagos(stripe_payment_intent_id);

-- 5) Stripe Connect en tiendas: cada tienda guarda SOLO el id de su cuenta
--    conectada (nunca claves del vendedor).
ALTER TABLE tiendas ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE tiendas ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(30) NOT NULL DEFAULT 'no_configurada';
ALTER TABLE tiendas ADD COLUMN IF NOT EXISTS stripe_connect_activa BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_tiendas_stripe_account ON tiendas(stripe_account_id);
