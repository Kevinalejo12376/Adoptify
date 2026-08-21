-- ============================================================
-- Migración: Equipo del refugio (empleados + permisos)
-- ============================================================
-- Crea el rol 'empleado_refugio', las tablas de empleados/permisos
-- y el catálogo de permisos. Idempotente.
-- ============================================================

-- 1) Rol de empleado de refugio
INSERT INTO roles (codigo, nombre)
SELECT 'empleado_refugio', 'Empleado de refugio'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE codigo = 'empleado_refugio');

-- 2) Catálogo de permisos del equipo de refugio
CREATE TABLE IF NOT EXISTS refugio_permisos (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(80) NOT NULL UNIQUE,
    nombre      VARCHAR(120) NOT NULL,
    modulo      VARCHAR(40) NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO refugio_permisos (codigo, nombre, modulo, descripcion) VALUES
    ('mascotas', 'Mascotas', 'mascotas', 'Gestionar las mascotas del refugio'),
    ('solicitudes', 'Solicitudes de adopción', 'solicitudes', 'Gestionar las solicitudes de adopción'),
    ('adopciones', 'Adopciones', 'adopciones', 'Gestionar las adopciones exitosas'),
    ('foro', 'Foro', 'foro', 'Publicar y gestionar el foro'),
    ('marketplace', 'Marketplace', 'marketplace', 'Gestionar el marketplace/tienda'),
    ('pedidos', 'Pedidos', 'pedidos', 'Gestionar los pedidos'),
    ('donaciones', 'Donaciones', 'donaciones', 'Gestionar las donaciones'),
    ('estadisticas', 'Estadísticas', 'estadisticas', 'Consultar las estadísticas'),
    ('configuracion', 'Configuración del refugio', 'configuracion', 'Acceder a la configuración del refugio'),
    ('administrar_empleados', 'Administrar empleados', 'empleados', 'Crear, editar, eliminar empleados y asignar permisos')
ON CONFLICT (codigo) DO NOTHING;

-- 3) Tabla de empleados (usuario con rol 'empleado_refugio' vinculado a un refugio)
CREATE TABLE IF NOT EXISTS refugio_empleados (
    id          BIGSERIAL PRIMARY KEY,
    refugio_id  BIGINT NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
    usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por  BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (refugio_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_refugio_empleados_refugio ON refugio_empleados(refugio_id);
CREATE INDEX IF NOT EXISTS idx_refugio_empleados_usuario ON refugio_empleados(usuario_id);

-- 4) Permisos asignados a cada empleado
CREATE TABLE IF NOT EXISTS refugio_empleado_permisos (
    id                   BIGSERIAL PRIMARY KEY,
    refugio_empleado_id  BIGINT NOT NULL REFERENCES refugio_empleados(id) ON DELETE CASCADE,
    permiso_id           BIGINT NOT NULL REFERENCES refugio_permisos(id) ON DELETE CASCADE,
    UNIQUE (refugio_empleado_id, permiso_id)
);
