-- ============================================================
-- Migración Stripe -> dLocal (clásico) en Adoptify
-- Tablas afectadas: pagos, tiendas.
-- Conserva datos históricos: renombra columnas y elimina SOLO las
-- exclusivas de Stripe/Stripe Connect. Ejecutar en Supabase/PostgreSQL.
-- ============================================================

-- --- Tabla pagos -------------------------------------------------
-- Renombra columnas Stripe a nombres de pasarela neutros (conserva datos).
ALTER TABLE pagos RENAME COLUMN estado_stripe TO estado_pasarela;
ALTER TABLE pagos RENAME COLUMN stripe_checkout_session_id TO dlocal_payment_id;
ALTER TABLE pagos RENAME COLUMN respuesta_stripe TO respuesta_pasarela;

-- Columnas exclusivas de Stripe (PaymentIntent, centavos) y de Stripe
-- Connect (distribución/transferencias) que ya no se usan.
ALTER TABLE pagos DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE pagos DROP COLUMN IF EXISTS stripe_amount;
ALTER TABLE pagos DROP COLUMN IF EXISTS stripe_currency;
ALTER TABLE pagos DROP COLUMN IF EXISTS comision_plataforma;
ALTER TABLE pagos DROP COLUMN IF EXISTS monto_distribuido;
ALTER TABLE pagos DROP COLUMN IF EXISTS detalle_distribucion;
ALTER TABLE pagos DROP COLUMN IF EXISTS stripe_transfer_ids;

-- Índices obsoletos de Stripe.
DROP INDEX IF EXISTS idx_pagos_session;
DROP INDEX IF EXISTS idx_pagos_pi;

-- Los pagos nuevos usan dLocal; los históricos se conservan.
ALTER TABLE pagos ALTER COLUMN proveedor SET DEFAULT 'dlocal';
UPDATE pagos SET proveedor = 'dlocal' WHERE proveedor IS NULL OR proveedor = '';

-- Índice de la nueva columna dlocal_payment_id.
CREATE INDEX IF NOT EXISTS idx_pagos_dlocal_payment ON pagos(dlocal_payment_id);

-- --- Tabla tiendas ------------------------------------------------
-- Stripe Connect se elimina por completo: ya no se onbordea a vendedores.
ALTER TABLE tiendas DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE tiendas DROP COLUMN IF EXISTS stripe_account_status;
ALTER TABLE tiendas DROP COLUMN IF EXISTS stripe_connect_activa;
