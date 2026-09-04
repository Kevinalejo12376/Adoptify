-- Migración: Ubicación detallada del usuario + datos completos en solicitudes de adopción
-- ------------------------------------------------------------------------------------
-- Agrega departamento, municipio y dirección al perfil del usuario (autocompletados
-- con "Usar mi ubicación actual" desde Editar/Completar perfil) y guarda en cada
-- solicitud de adopción los datos completos y actualizados del solicitante para que
-- el refugio pueda contactarlo sin depender del formulario del modal.
--
-- Ejecutar en Supabase (SQL Editor):
--   psql "$CONNECTION_STRING" -f migracion_usuario_ubicacion.sql

-- 1) Usuarios: ubicación detallada
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS departamento VARCHAR(150),
    ADD COLUMN IF NOT EXISTS municipio    VARCHAR(150),
    ADD COLUMN IF NOT EXISTS direccion    VARCHAR(200);

-- 2) Solicitudes de adopción: datos completos y actualizados del solicitante
ALTER TABLE solicitudes_adopcion
    ADD COLUMN IF NOT EXISTS departamento     VARCHAR(150),
    ADD COLUMN IF NOT EXISTS municipio        VARCHAR(150),
    ADD COLUMN IF NOT EXISTS direccion        VARCHAR(200),
    ADD COLUMN IF NOT EXISTS tipo_documento   VARCHAR(30),
    ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(30);

-- Índice opcional para agilizar la búsqueda de documentos duplicados en el registro.
CREATE INDEX IF NOT EXISTS idx_usuarios_documento
    ON usuarios (tipo_documento_id, numero_documento);
