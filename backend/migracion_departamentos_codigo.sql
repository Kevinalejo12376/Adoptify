-- ============================================================================
-- Migración: agregar columna `codigo` a las tablas del catálogo de ubicación
-- (`departamentos` y `municipios`).
--
-- Motivo:
--   Las tablas `departamentos` y `municipios` ya existían en la base de datos
--   creadas SIN la columna `codigo`, pero el diseño canónico de todos los
--   catálogos del proyecto es (id, codigo, nombre) — ver
--   backend/supabase_schema.sql y backend/app/models/catalogos.py. Como la
--   DDL de arranque usa `CREATE TABLE IF NOT EXISTS`, nunca agregó la columna
--   a las tablas ya existentes, y el seed/endpoints que consultan
--   `departamentos.codigo`/`municipios.codigo` fallan con:
--   column ...codigo does not exist.
--
--   Idempotente: puede ejecutarse varias veces sin error.
--   Compatible con Supabase/PostgreSQL.
--   No modifica nombres, ids ni la relación departamento-municipio.
-- ============================================================================

-- 1) Agregar la columna si no existe (inicialmente nullable para poder rellenar).
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS codigo VARCHAR(10);

-- 2) Rellenar códigos D01..D33 según el orden canónico de DEPARTAMENTOS en
--    backend/app/db/seed.py, emparejando por nombre (seguro ante acentos).
UPDATE departamentos d
SET codigo = c.codigo
FROM (VALUES
    ('Amazonas', 'D01'),
    ('Antioquia', 'D02'),
    ('Arauca', 'D03'),
    ('Atlántico', 'D04'),
    ('Bolívar', 'D05'),
    ('Boyacá', 'D06'),
    ('Caldas', 'D07'),
    ('Caquetá', 'D08'),
    ('Casanare', 'D09'),
    ('Cauca', 'D10'),
    ('Cesar', 'D11'),
    ('Chocó', 'D12'),
    ('Córdoba', 'D13'),
    ('Cundinamarca', 'D14'),
    ('Guainía', 'D15'),
    ('Guaviare', 'D16'),
    ('Huila', 'D17'),
    ('La Guajira', 'D18'),
    ('Magdalena', 'D19'),
    ('Meta', 'D20'),
    ('Nariño', 'D21'),
    ('Norte de Santander', 'D22'),
    ('Putumayo', 'D23'),
    ('Quindío', 'D24'),
    ('Risaralda', 'D25'),
    ('San Andrés y Providencia', 'D26'),
    ('Santander', 'D27'),
    ('Sucre', 'D28'),
    ('Tolima', 'D29'),
    ('Valle del Cauca', 'D30'),
    ('Vaupés', 'D31'),
    ('Vichada', 'D32'),
    ('Bogotá D.C.', 'D33')
) AS c(nombre, codigo)
WHERE d.nombre = c.nombre
  AND d.codigo IS NULL;

-- 3) Respaldo: cualquier fila restante sin código se numera por orden de id,
--    evitando colisionar con códigos ya asignados.
UPDATE departamentos d
SET codigo = c.codigo
FROM (
    SELECT id,
           'D' || lpad((row_number() OVER (ORDER BY id))::text, 2, '0') AS codigo
    FROM departamentos
    WHERE codigo IS NULL
) c
WHERE d.id = c.id
  AND NOT EXISTS (
      SELECT 1 FROM departamentos x
      WHERE x.codigo = c.codigo AND x.id <> d.id
  );

-- 4) Aplicar NOT NULL y unicidad (equivalente a `codigo VARCHAR(10) NOT NULL UNIQUE`).
ALTER TABLE departamentos ALTER COLUMN codigo SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_departamentos_codigo ON departamentos(codigo);

-- ============================================================================
-- Municipios (misma causa raíz).
-- ============================================================================

-- 5) Agregar la columna si no existe (inicialmente nullable para poder rellenar).
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS codigo VARCHAR(20);

-- 6) Rellenar SOLO las filas sin código, con un esquema determinista y único:
--    'M' + id_departamento (4 dígitos) + '-' + posición (3 dígitos) dentro de
--    su departamento ordenada por id. Al ejecutarse de nuevo no modifica los
--    códigos ya asignados (idempotente) y no altera nombre/ids ni la relación
--    departamento-municipio.
UPDATE municipios m
SET codigo = c.codigo
FROM (
    SELECT id,
           'M' || lpad(departamento_id::text, 4, '0') || '-' ||
           lpad((row_number() OVER (PARTITION BY departamento_id ORDER BY id))::text, 3, '0') AS codigo
    FROM municipios
    WHERE codigo IS NULL
) c
WHERE m.id = c.id;

-- 7) Aplicar NOT NULL y unicidad (equivalente a `codigo VARCHAR(20) NOT NULL UNIQUE`).
ALTER TABLE municipios ALTER COLUMN codigo SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_municipios_codigo ON municipios(codigo);
