-- ============================================================
-- ADOPTIFY - Esquema de base de datos NORMALIZADO A 3FN (PostgreSQL / Supabase)
-- ============================================================
-- Como usarlo:
--   1. Supabase -> SQL Editor -> New query.
--   2. Pega TODO este archivo y presiona "Run" ("Run anyway" al aviso de RLS).
--
-- ADVERTENCIA: Este script ELIMINA y RECREA las tablas (DROP ... CASCADE).
--   Ejecutalo en una base nueva o cuando NO tengas datos que conservar.
--
-- NOTAS DE DISENO:
--   - Todos los valores enumerados (tipo de documento, rol, estados, categorias,
--     tipos, generos, tamanos, reacciones) viven en TABLAS DE CATALOGO separadas
--     y se referencian por FOREIGN KEY. Nada de texto repetido.
--   - Las tablas de catalogo ya vienen POBLADAS con datos semilla.
--   - TODAS las tablas tienen ROW LEVEL SECURITY habilitado. El acceso pasa por
--     el backend FastAPI (rol 'postgres', que omite RLS): se bloquea el acceso
--     directo via anon/service keys.
--   - El Super Administrador (adoptifyoficial@gmail.com) NO se inserta aqui con
--     un hash fijo: se crea al arrancar el backend (app/db/seed.py) usando
--     bcrypt, que es el mecanismo seguro que ya utiliza el proyecto.
-- ============================================================

-- ============================================================
-- 0. LIMPIEZA (elimina tablas si existen, en orden seguro)
--    Incluye TODAS las tablas (actuales, historicas y renombradas)
--    para que el script sea re-ejecutable sin errores de dependencia.
-- ============================================================
DROP TABLE IF EXISTS
    -- Verificacion / IA / chat
    chat_mensajes, chat_sesiones, tareas_ia, codigos_verificacion,
    enlaces_creacion_password,
    -- Solicitudes de tienda aliada
    solicitudes_tienda_historial, solicitudes_tienda_documentos, solicitudes_tienda,
    -- Solicitudes de refugio
    solicitudes_refugio_historial, solicitudes_refugio_documentos, solicitudes_refugio,
    -- PQRS de tienda
    tienda_pqrs_adjuntos, tienda_pqrs_mensajes, tienda_pqrs,
    -- Donaciones (tiendas aliadas -> refugios)
    donacion_items, donaciones,
    -- Donaciones de personas (usuarios anónimos o registrados) a refugios
    donaciones_usuarios,
    -- Tienda / RBAC
    tienda_actividades, tienda_imagenes, tienda_usuario_permisos, tienda_usuarios,
    tienda_permisos, tiendas,
    -- Equipo de refugio
    refugio_empleado_permisos, refugio_empleados, refugio_permisos,
    -- Foro / comunidad
    foro_guardados, foro_comentario_likes, foro_reacciones, foro_comentarios,
    foro_posts_imagenes, foro_post_imagenes, foro_posts,
    -- Productos / compras / kardex
    historial_estados_pedido, pedido_items, pedidos, codigos_promocion, carrito_items,
    movimientos_kardex, favoritos_productos, resenas, resenas_refugio,
    producto_caracteristicas, producto_imagenes, productos,
    -- Mascotas / adopciones
    solicitudes_adopcion, favoritos_mascotas, mascota_imagenes, mascotas,
    -- Refugios / perfiles
    refugio_imagenes, configuraciones, refugios, usuarios,
    -- Soporte / actividad
    auditoria, reportes, pqrs, notificaciones, actividades, campanas, eventos,
    -- Catalogos
    tipos_reaccion, estados_post_foro, tipos_post_foro, foro_categorias,
    categorias_producto, estados_pedido, estados_solicitud, razas_mascota,
    estados_mascota, generos_mascota, tamanos_mascota, tipos_mascota,
    roles, tipos_documento
CASCADE;

-- ============================================================
-- 1. TABLAS DE CATALOGO (reference / lookup) + DATOS SEMILLA
-- ============================================================

CREATE TABLE tipos_documento (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL
);
INSERT INTO tipos_documento (codigo, nombre) VALUES
    ('CC',  'Cedula de ciudadania'),
    ('CE',  'Cedula de extranjeria'),
    ('PA',  'Pasaporte'),
    ('NIT', 'NIT');

CREATE TABLE roles (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL
);
INSERT INTO roles (codigo, nombre) VALUES
    ('usuario', 'Usuario adoptante'),
    ('refugio', 'Refugio'),
    ('empleado_refugio', 'Empleado de refugio'),
    ('administrador_principal', 'Administrador principal'),
    ('administrador', 'Administrador'),
    ('tienda_aliada', 'Tienda aliada');

-- Catálogo de ubicación para selects del perfil del usuario.
-- Los datos (departamentos y municipios de Colombia) se siembran en
-- app/db/seed.py al arrancar (idempotente).
CREATE TABLE departamentos (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL
);

CREATE TABLE municipios (
    id              BIGSERIAL PRIMARY KEY,
    departamento_id BIGINT REFERENCES departamentos(id),
    codigo          VARCHAR(20) NOT NULL UNIQUE,
    nombre          VARCHAR(80) NOT NULL
);
CREATE INDEX idx_municipios_departamento ON municipios(departamento_id);

CREATE TABLE tipos_mascota (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO tipos_mascota (codigo, nombre) VALUES
    ('perro', 'Perro'),
    ('gato',  'Gato'),
    ('otro',  'Otro');

CREATE TABLE tamanos_mascota (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO tamanos_mascota (codigo, nombre) VALUES
    ('pequeno', 'Pequeno'),
    ('mediano', 'Mediano'),
    ('grande',  'Grande');

CREATE TABLE generos_mascota (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO generos_mascota (codigo, nombre) VALUES
    ('macho',  'Macho'),
    ('hembra', 'Hembra');

CREATE TABLE estados_mascota (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO estados_mascota (codigo, nombre) VALUES
    ('disponible', 'Disponible'),
    ('en_proceso', 'En proceso'),
    ('adoptado',   'Adoptado');

CREATE TABLE razas_mascota (
    id              BIGSERIAL PRIMARY KEY,
    tipo_mascota_id BIGINT REFERENCES tipos_mascota(id),
    codigo          VARCHAR(60) NOT NULL UNIQUE,
    nombre          VARCHAR(80) NOT NULL
);
CREATE INDEX idx_razas_mascota_tipo ON razas_mascota(tipo_mascota_id);
INSERT INTO razas_mascota (codigo, nombre, tipo_mascota_id) VALUES
    ('labrador',      'Labrador Retriever', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('pastor_aleman', 'Pastor Alemán', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('golden',        'Golden Retriever', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('bulldog',       'Bulldog', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('poodle',        'Poodle', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('chihuahua',     'Chihuahua', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('beagle',        'Beagle', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('rottweiler',    'Rottweiler', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('criollo',       'Criollo', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('pug',           'Pug', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('shih_tzu',      'Shih Tzu', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('doberman',      'Doberman', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('boxer',         'Boxer', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('cocker',        'Cocker Spaniel', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('siberiano',     'Husky Siberiano', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('schnauzer',     'Schnauzer', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('maltes',        'Maltés', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('yorkshire',     'Yorkshire Terrier', (SELECT id FROM tipos_mascota WHERE codigo='perro')),
    ('persa',         'Persa', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('siames',        'Siamés', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('maine_coon',    'Maine Coon', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('bengali',       'Bengalí', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('sphynx',        'Sphynx', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('angora',        'Angora', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('ragdoll',       'Ragdoll', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('britanico',     'British Shorthair', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('comun_europeo', 'Común Europeo', (SELECT id FROM tipos_mascota WHERE codigo='gato')),
    ('fold_escoces',  'Scottish Fold', (SELECT id FROM tipos_mascota WHERE codigo='gato'));

-- Estados de solicitud de adopcion (usados por el backend: 'en_revision').
CREATE TABLE estados_solicitud (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO estados_solicitud (codigo, nombre) VALUES
    ('pendiente',   'Pendiente'),
    ('en_revision', 'En revisión'),
    ('contactado',  'Contactado'),
    ('finalizada',  'Finalizada'),
    ('cerrada',     'Cerrada');

-- Estados de pedido (incluye 'preparando' y 'en_camino' que usa el frontend).
CREATE TABLE estados_pedido (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO estados_pedido (codigo, nombre) VALUES
    ('pendiente', 'Pendiente'),
    ('pagado',    'Pagado'),
    ('preparando','Preparando'),
    ('enviado',   'Enviado'),
    ('en_camino', 'En Camino'),
    ('entregado', 'Entregado'),
    ('cancelado', 'Cancelado');

CREATE TABLE categorias_producto (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(60) NOT NULL
);
INSERT INTO categorias_producto (codigo, nombre) VALUES
    ('alimentos',  'Alimentos'),
    ('accesorios', 'Accesorios'),
    ('juguetes',   'Juguetes'),
    ('salud',      'Salud'),
    ('higiene',    'Higiene'),
    ('ropa',       'Ropa');

CREATE TABLE foro_categorias (
    id       BIGSERIAL PRIMARY KEY,
    codigo   VARCHAR(40) NOT NULL UNIQUE,
    nombre   VARCHAR(60) NOT NULL,
    icono    VARCHAR(20)
);
INSERT INTO foro_categorias (codigo, nombre, icono) VALUES
    ('adopciones',   'Adopciones',    'PawPrint'),
    ('eventos',      'Eventos',       'Calendar'),
    ('campanas',     'Campanas',      'Megaphone'),
    ('donaciones',   'Donaciones',    'HandHeart'),
    ('rescates',     'Rescates',      'LifeBuoy'),
    ('historias',    'Historias',     'BookOpen'),
    ('voluntariado', 'Voluntariado',  'Users'),
    ('cuidado',      'Cuidado',       'Heart'),
    ('entrenamiento','Entrenamiento', 'Target'),
    ('salud',        'Salud',         'Stethoscope'),
    ('nutricion',    'Nutricion',     'Bone'),
    ('general',      'General',       'MessageSquare');

CREATE TABLE tipos_post_foro (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO tipos_post_foro (codigo, nombre) VALUES
    ('story',    'Historia'),
    ('question', 'Pregunta'),
    ('tip',      'Consejo'),
    ('event',    'Evento'),
    ('campaign', 'Campaña'),
    ('donation', 'Donacion');

CREATE TABLE estados_post_foro (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO estados_post_foro (codigo, nombre) VALUES
    ('published', 'Publicado'),
    ('draft',     'Borrador'),
    ('archived',  'Archivado');

CREATE TABLE tipos_reaccion (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO tipos_reaccion (codigo, nombre) VALUES
    ('like',      'Me gusta'),
    ('love',      'Me encanta'),
    ('funny',     'Me divierte'),
    ('wow',       'Me asombra'),
    ('sad',       'Me entristece'),
    ('angry',     'Me enoja'),
    -- Tipos historicos (se conservan para no romper datos existentes).
    ('celebrate', 'Celebrar'),
    ('support',   'Apoyo');

-- ============================================================
-- 2. USUARIOS Y PERFILES
-- ============================================================

CREATE TABLE usuarios (
    id                 BIGSERIAL PRIMARY KEY,
    nombre             VARCHAR(100) NOT NULL,
    apellido           VARCHAR(100),
    username           VARCHAR(50) UNIQUE,
    tipo_documento_id  BIGINT REFERENCES tipos_documento(id),
    numero_documento   VARCHAR(30),
    telefono           VARCHAR(30),
    email              VARCHAR(255) NOT NULL UNIQUE,
    hashed_password    TEXT NOT NULL,
    google_id          VARCHAR(255),
    rol_id             BIGINT NOT NULL REFERENCES roles(id),
    activo             BOOLEAN NOT NULL DEFAULT true,
    ubicacion          VARCHAR(150),
    departamento       VARCHAR(150),
    municipio          VARCHAR(150),
    direccion          VARCHAR(200),
    bio                TEXT,
    website            VARCHAR(150),
    avatar_url         TEXT,
    avatar_public_id   VARCHAR(255),
    cover_url          TEXT,
    twitter            VARCHAR(120),
    instagram          VARCHAR(120),
    verificado         BOOLEAN NOT NULL DEFAULT false,
    perfil_completo    BOOLEAN NOT NULL DEFAULT false,
    -- Soft delete
    eliminado_en       TIMESTAMPTZ,
    -- Bloqueo por intentos fallidos de inicio de sesión: tras 3 fallos la
    -- cuenta queda bloqueada 15 minutos y se habilita automáticamente.
    intentos_fallidos  INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta    TIMESTAMPTZ,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_usuarios_google_id ON usuarios(google_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_username ON usuarios(username);

-- NOTA: El Super Administrador (adoptifyoficial@gmail.com) NO se inserta aqui.
-- Se crea al arrancar el backend (app/db/seed.py) usando bcrypt
-- (get_password_hash), el mecanismo seguro que ya utiliza el proyecto.
-- No se fija ningun hash/contraseña en este script.

CREATE TABLE refugios (
    id                 BIGSERIAL PRIMARY KEY,
    usuario_id         BIGINT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre             VARCHAR(150) NOT NULL,
    slug               VARCHAR(160) UNIQUE,
    logo_url           TEXT,
    descripcion        TEXT,
    ubicacion          VARCHAR(150),
    departamento       VARCHAR(150),
    municipio          VARCHAR(150),
    direccion          VARCHAR(200),
    telefono           VARCHAR(30),
    email              VARCHAR(255),
    facebook           VARCHAR(120),
    instagram          VARCHAR(120),
    tiktok             VARCHAR(120),
    website            VARCHAR(150),
    anio_fundacion     INT,
    total_rescatados   INT NOT NULL DEFAULT 0,
    total_voluntarios  INT NOT NULL DEFAULT 0,
    verificado         BOOLEAN NOT NULL DEFAULT false,
    tienda_habilitada  BOOLEAN NOT NULL DEFAULT false,
    -- Soft delete
    activo             BOOLEAN NOT NULL DEFAULT true,
    eliminado_en       TIMESTAMPTZ,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE configuraciones (
    id                        BIGSERIAL PRIMARY KEY,
    usuario_id                BIGINT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    notif_email               BOOLEAN NOT NULL DEFAULT true,
    notif_push                BOOLEAN NOT NULL DEFAULT true,
    notif_adopciones          BOOLEAN NOT NULL DEFAULT true,
    notif_respuestas_foro     BOOLEAN NOT NULL DEFAULT true,
    notif_nuevos_animales     BOOLEAN NOT NULL DEFAULT true,
    notif_nuevas_solicitudes  BOOLEAN NOT NULL DEFAULT true,
    notif_cambios_estado      BOOLEAN NOT NULL DEFAULT true,
    notif_mensajes_foro       BOOLEAN NOT NULL DEFAULT true,
    notif_whatsapp            BOOLEAN NOT NULL DEFAULT false,
    tema                      VARCHAR(10) NOT NULL DEFAULT 'light',
    idioma                    VARCHAR(5) NOT NULL DEFAULT 'es',
    actualizado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refugio_imagenes (
    id          BIGSERIAL PRIMARY KEY,
    refugio_id  BIGINT NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    es_portada  BOOLEAN NOT NULL DEFAULT false,
    orden       INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_refugio_imagenes_refugio ON refugio_imagenes(refugio_id);

-- Tiendas: se crean AQUI (antes que solicitudes_tienda, que referencian
-- tiendas.id mediante tienda_creado_id).
CREATE TABLE tiendas (
    id                 BIGSERIAL PRIMARY KEY,
    usuario_id         BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre             VARCHAR(150) NOT NULL,
    slug               VARCHAR(160) UNIQUE,
    descripcion        TEXT,
    ubicacion          VARCHAR(150),
    ciudad             VARCHAR(150),
    direccion          VARCHAR(255),
    logo_url           TEXT,
    logo_public_id     VARCHAR(255),
    estado             VARCHAR(20) NOT NULL DEFAULT 'activa',
    telefono           VARCHAR(30),
    email              VARCHAR(255),
    website            VARCHAR(150),
    facebook           VARCHAR(120),
    instagram          VARCHAR(120),
    horario_semana     VARCHAR(120),
    horario_fin_semana VARCHAR(120),
    rating             NUMERIC(2,1) NOT NULL DEFAULT 0,
    -- Soft delete
    activo             BOOLEAN NOT NULL DEFAULT true,
    eliminado_en       TIMESTAMPTZ,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tiendas_activo ON tiendas(activo) WHERE activo;

-- ============================================================
-- 3. SOLICITUDES DE REGISTRO DE REFUGIOS Y TIENDAS
-- ============================================================

CREATE TABLE solicitudes_refugio (
    id                    BIGSERIAL PRIMARY KEY,
    nombre_refugio        VARCHAR(150) NOT NULL,
    logo_url              TEXT,
    descripcion           TEXT,
    email_contacto        VARCHAR(255),
    telefono              VARCHAR(30),
    departamento          VARCHAR(150),
    ciudad                VARCHAR(150),
    municipio             VARCHAR(150),
    direccion             VARCHAR(200),
    website               VARCHAR(150),
    anio_fundacion        INT,
    facebook              VARCHAR(120),
    instagram             VARCHAR(120),
    tiktok                VARCHAR(120),
    representante_nombre  VARCHAR(100) NOT NULL,
    representante_apellido VARCHAR(100),
    representante_email   VARCHAR(255) NOT NULL,
    representante_telefono VARCHAR(30),
    acepto_veracidad      VARCHAR(20),
    autorizo_verificacion VARCHAR(20),
    estado                VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    motivo_rechazo        TEXT,
    mensaje_informacion   TEXT,
    fecha_revision        TIMESTAMPTZ,
    administrador_id      BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_creado_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    refugio_creado_id     BIGINT REFERENCES refugios(id) ON DELETE SET NULL,
    username_generado     VARCHAR(50),
    fecha_aprobacion      TIMESTAMPTZ,
    token_consulta        VARCHAR(64) UNIQUE,
    creada_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizada_en        TIMESTAMPTZ
);
CREATE INDEX idx_solicitudes_refugio_estado ON solicitudes_refugio(estado);
CREATE INDEX idx_solicitudes_refugio_rep_email ON solicitudes_refugio(representante_email);

CREATE TABLE solicitudes_refugio_documentos (
    id                  BIGSERIAL PRIMARY KEY,
    solicitud_id        BIGINT NOT NULL REFERENCES solicitudes_refugio(id) ON DELETE CASCADE,
    categoria           VARCHAR(40) NOT NULL,
    tipo                VARCHAR(20) NOT NULL DEFAULT 'obligatorio',
    nombre_archivo      VARCHAR(255),
    url                 TEXT NOT NULL,
    public_id           VARCHAR(255),
    estado_verificacion VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sol_refugio_doc_solicitud ON solicitudes_refugio_documentos(solicitud_id);

CREATE TABLE solicitudes_refugio_historial (
    id               BIGSERIAL PRIMARY KEY,
    solicitud_id     BIGINT NOT NULL REFERENCES solicitudes_refugio(id) ON DELETE CASCADE,
    accion           VARCHAR(40) NOT NULL,
    descripcion      TEXT,
    administrador_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sol_refugio_hist_solicitud ON solicitudes_refugio_historial(solicitud_id);

CREATE TABLE solicitudes_tienda (
    id                    BIGSERIAL PRIMARY KEY,
    nombre_tienda         VARCHAR(150) NOT NULL,
    logo_url              TEXT,
    descripcion           TEXT,
    email_contacto        VARCHAR(255),
    telefono              VARCHAR(30),
    departamento          VARCHAR(150),
    ciudad                VARCHAR(150),
    municipio             VARCHAR(150),
    direccion             VARCHAR(200),
    website               VARCHAR(150),
    horario_semana        VARCHAR(120),
    horario_fin_semana    VARCHAR(120),
    facebook              VARCHAR(120),
    instagram             VARCHAR(120),
    representante_nombre  VARCHAR(100) NOT NULL,
    representante_apellido VARCHAR(100),
    representante_email   VARCHAR(255) NOT NULL,
    representante_telefono VARCHAR(30),
    acepto_veracidad      VARCHAR(20),
    autorizo_verificacion VARCHAR(20),
    estado                VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    motivo_rechazo        TEXT,
    mensaje_informacion   TEXT,
    fecha_revision        TIMESTAMPTZ,
    administrador_id      BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_creado_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    tienda_creado_id      BIGINT REFERENCES tiendas(id) ON DELETE SET NULL,
    username_generado     VARCHAR(50),
    fecha_aprobacion      TIMESTAMPTZ,
    token_consulta        VARCHAR(64) UNIQUE,
    creada_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizada_en        TIMESTAMPTZ
);
CREATE INDEX idx_solicitudes_tienda_estado ON solicitudes_tienda(estado);
CREATE INDEX idx_solicitudes_tienda_rep_email ON solicitudes_tienda(representante_email);

CREATE TABLE solicitudes_tienda_documentos (
    id                  BIGSERIAL PRIMARY KEY,
    solicitud_id        BIGINT NOT NULL REFERENCES solicitudes_tienda(id) ON DELETE CASCADE,
    categoria           VARCHAR(40) NOT NULL,
    tipo                VARCHAR(20) NOT NULL DEFAULT 'obligatorio',
    nombre_archivo      VARCHAR(255),
    url                 TEXT NOT NULL,
    public_id           VARCHAR(255),
    estado_verificacion VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sol_tienda_doc_solicitud ON solicitudes_tienda_documentos(solicitud_id);

CREATE TABLE solicitudes_tienda_historial (
    id               BIGSERIAL PRIMARY KEY,
    solicitud_id     BIGINT NOT NULL REFERENCES solicitudes_tienda(id) ON DELETE CASCADE,
    accion           VARCHAR(40) NOT NULL,
    descripcion      TEXT,
    administrador_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sol_tienda_hist_solicitud ON solicitudes_tienda_historial(solicitud_id);

-- Impide solicitudes duplicadas en estados activos (mismo correo).
CREATE UNIQUE INDEX IF NOT EXISTS uq_sol_refugio_email_activa
    ON solicitudes_refugio(representante_email)
    WHERE estado IN ('pendiente','informacion_solicitada');
CREATE UNIQUE INDEX IF NOT EXISTS uq_sol_tienda_email_activa
    ON solicitudes_tienda(representante_email)
    WHERE estado IN ('pendiente','informacion_solicitada');

-- Enlace temporal (24h) para que el refugio/tienda aprobado cree su contrasena.
CREATE TABLE enlaces_creacion_password (
    id         BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token      VARCHAR(64) NOT NULL UNIQUE,
    usado      VARCHAR(20) NOT NULL DEFAULT 'activo',
    expira_en  TIMESTAMPTZ NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_enlaces_pass_usuario ON enlaces_creacion_password(usuario_id);

-- ============================================================
-- 4. MASCOTAS Y ADOPCIONES
-- ============================================================

CREATE TABLE mascotas (
    id             BIGSERIAL PRIMARY KEY,
    refugio_id     BIGINT REFERENCES refugios(id) ON DELETE CASCADE,
    nombre         VARCHAR(100) NOT NULL,
    tipo_id        BIGINT NOT NULL REFERENCES tipos_mascota(id),
    tamano_id      BIGINT REFERENCES tamanos_mascota(id),
    genero_id      BIGINT REFERENCES generos_mascota(id),
    estado_id      BIGINT NOT NULL REFERENCES estados_mascota(id),
    raza           VARCHAR(100),
    edad           VARCHAR(40),
    peso           VARCHAR(30),
    color          VARCHAR(60),
    descripcion    TEXT,
    personalidad   TEXT[],
    salud          TEXT,
    requisitos     TEXT,
    vacunado       BOOLEAN NOT NULL DEFAULT false,
    esterilizado   BOOLEAN NOT NULL DEFAULT false,
    desparasitado  BOOLEAN NOT NULL DEFAULT false,
    fecha_ingreso  DATE,
    -- Soft delete
    activo         BOOLEAN NOT NULL DEFAULT true,
    eliminado_en   TIMESTAMPTZ,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mascotas_refugio ON mascotas(refugio_id);
CREATE INDEX idx_mascotas_estado ON mascotas(estado_id);
CREATE INDEX idx_mascotas_tipo ON mascotas(tipo_id);
CREATE INDEX idx_mascotas_activo ON mascotas(activo) WHERE activo;

CREATE TABLE mascota_imagenes (
    id          BIGSERIAL PRIMARY KEY,
    mascota_id  BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    public_id   VARCHAR(255),
    orden       INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_mascota_img_mascota ON mascota_imagenes(mascota_id);

CREATE TABLE solicitudes_adopcion (
    id                 BIGSERIAL PRIMARY KEY,
    mascota_id         BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
    usuario_id         BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado_id          BIGINT NOT NULL REFERENCES estados_solicitud(id),
    nombre_contacto    VARCHAR(150) NOT NULL,
    email_contacto     VARCHAR(255),
    telefono_contacto  VARCHAR(30),
    ubicacion          VARCHAR(150),
    departamento       VARCHAR(150),
    municipio          VARCHAR(150),
    direccion          VARCHAR(200),
    tipo_documento     VARCHAR(30),
    numero_documento   VARCHAR(30),
    mensaje            TEXT,
    notas              TEXT,
    tiene_familia      BOOLEAN NOT NULL DEFAULT false,
    tiene_experiencia  BOOLEAN NOT NULL DEFAULT false,
    progreso           INT NOT NULL DEFAULT 0,
    fecha_seguimiento  DATE,
    fecha_completada   DATE,
    creada_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_solicitudes_mascota ON solicitudes_adopcion(mascota_id);
CREATE INDEX idx_solicitudes_usuario ON solicitudes_adopcion(usuario_id);
CREATE INDEX idx_solicitudes_estado ON solicitudes_adopcion(estado_id);

CREATE TABLE favoritos_mascotas (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mascota_id  BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (usuario_id, mascota_id)
);

-- ============================================================
-- 5. TIENDAS, PRODUCTOS, COMPRAS Y KARDEX
-- ============================================================
-- NOTA: la tabla 'tiendas' se crea en la seccion 2 (sus columnas son
-- necesarias para las solicitudes_tienda y el RBAC de tienda).

-- ============================================================
-- RBAC del modulo Tienda (jerarquia de administradores)
-- ============================================================
CREATE TABLE tienda_permisos (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(80) NOT NULL UNIQUE,
    nombre      VARCHAR(120) NOT NULL,
    modulo      VARCHAR(40) NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_tienda_permisos_modulo ON tienda_permisos(modulo);

CREATE TABLE tienda_usuarios (
    id             BIGSERIAL PRIMARY KEY,
    tienda_id      BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    usuario_id     BIGINT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo           VARCHAR(20) NOT NULL DEFAULT 'admin',
    activo         BOOLEAN NOT NULL DEFAULT true,
    creado_por     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    ultimo_acceso  TIMESTAMPTZ,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tienda_usuarios_tienda ON tienda_usuarios(tienda_id);

CREATE TABLE tienda_usuario_permisos (
    id                 BIGSERIAL PRIMARY KEY,
    tienda_usuario_id  BIGINT NOT NULL REFERENCES tienda_usuarios(id) ON DELETE CASCADE,
    permiso_id         BIGINT NOT NULL REFERENCES tienda_permisos(id) ON DELETE CASCADE,
    UNIQUE (tienda_usuario_id, permiso_id)
);

INSERT INTO tienda_permisos (codigo, nombre, modulo, descripcion) VALUES
    ('dashboard.ver',                  'Ver dashboard',                          'dashboard',      'Ver el panel principal de la tienda'),
    ('productos.ver',                  'Ver productos',                          'productos',      'Ver el listado y detalle de productos'),
    ('productos.crear',                'Crear productos',                        'productos',      'Crear nuevos productos'),
    ('productos.editar',               'Editar productos',                       'productos',      'Editar productos existentes'),
    ('productos.eliminar',             'Eliminar productos',                     'productos',      'Eliminar productos'),
    ('productos.activar',              'Activar productos',                      'productos',      'Activar (mostrar) productos'),
    ('productos.desactivar',           'Desactivar productos',                   'productos',      'Desactivar (ocultar) productos'),
    ('categorias.ver',                 'Ver categorias',                         'categorias',     'Ver las categorias de productos'),
    ('categorias.crear',               'Crear categorias',                       'categorias',     'Crear nuevas categorias'),
    ('categorias.editar',              'Editar categorias',                      'categorias',     'Editar categorias existentes'),
    ('categorias.eliminar',            'Eliminar categorias',                    'categorias',     'Eliminar categorias'),
    ('inventario.ver',                 'Ver inventario',                         'inventario',     'Ver el inventario de la tienda'),
    ('inventario.actualizar_stock',    'Actualizar stock',                       'inventario',     'Actualizar el stock de productos'),
    ('inventario.registrar_entradas',  'Registrar entradas',                     'inventario',     'Registrar entradas de inventario'),
    ('inventario.registrar_salidas',   'Registrar salidas',                      'inventario',     'Registrar salidas de inventario'),
    ('pedidos.ver',                    'Ver pedidos',                            'pedidos',        'Ver el listado y detalle de pedidos'),
    ('pedidos.aceptar',                'Aceptar pedidos',                        'pedidos',        'Aceptar pedidos'),
    ('pedidos.rechazar',               'Rechazar pedidos',                       'pedidos',        'Rechazar pedidos'),
    ('pedidos.cambiar_estado',         'Cambiar estados',                        'pedidos',        'Cambiar el estado de los pedidos'),
    ('pedidos.gestionar_devoluciones', 'Gestionar devoluciones',                 'pedidos',        'Gestionar devoluciones'),
    ('promociones.ver',                'Ver promociones',                        'promociones',    'Ver las promociones de la tienda'),
    ('promociones.crear',              'Crear promociones',                      'promociones',    'Crear nuevas promociones'),
    ('promociones.editar',             'Editar promociones',                     'promociones',    'Editar promociones existentes'),
    ('promociones.eliminar',           'Eliminar promociones',                   'promociones',    'Eliminar promociones'),
    ('clientes.ver',                   'Ver clientes',                           'clientes',       'Ver los clientes de la tienda'),
    ('clientes.administrar',           'Administrar clientes',                   'clientes',       'Administrar la informacion de clientes'),
    ('tienda.ver_perfil',              'Ver perfil de la tienda',                'tienda',         'Ver el perfil de la tienda'),
    ('tienda.editar_informacion',      'Editar informacion de la tienda',        'tienda',         'Editar la informacion de la tienda'),
    ('tienda.cambiar_logo',            'Cambiar logo',                           'tienda',         'Cambiar el logo de la tienda'),
    ('tienda.cambiar_imagenes',        'Cambiar imagenes',                       'tienda',         'Cambiar las imagenes de la tienda'),
    ('tienda.actualizar_horarios',     'Actualizar horarios',                    'tienda',         'Actualizar los horarios de atencion'),
    ('reportes.ver_estadisticas',      'Ver estadisticas',                       'reportes',       'Ver las estadisticas de la tienda'),
    ('reportes.descargar_reportes',    'Descargar reportes',                     'reportes',       'Descargar reportes'),
    ('reportes.exportar_informacion',  'Exportar informacion',                   'reportes',       'Exportar informacion de la tienda'),
    ('configuracion.acceder',          'Acceder a configuracion',                'configuracion',  'Acceder al apartado de configuracion'),
    ('configuracion.editar_configuraciones', 'Editar configuraciones',           'configuracion',  'Editar las configuraciones permitidas'),
    ('administradores.gestionar',      'Gestionar administradores',              'administradores','Crear, editar y eliminar administradores'),
    ('administradores.asignar_permisos','Asignar permisos',                      'administradores','Asignar permisos a los administradores'),
    ('historial.ver',                  'Ver historial de actividad',             'historial',      'Consultar el historial de actividad de la tienda'),
    ('donaciones.ver',                 'Ver donaciones',                         'donaciones',     'Consultar las donaciones realizadas por la tienda'),
    ('donaciones.crear',               'Realizar donaciones',                    'donaciones',     'Donar productos a los refugios'),
    ('pqrs.ver',                       'Ver PQRS',                               'pqrs',           'Consultar las PQRS de la tienda'),
    ('pqrs.crear',                     'Crear PQRS',                             'pqrs',           'Crear peticiones, quejas, reclamos o sugerencias'),
    ('pqrs.responder',                 'Responder PQRS',                         'pqrs',           'Responder a las PQRS cuando corresponda')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- RBAC del modulo Equipo de refugio (empleados y permisos)
-- ============================================================
CREATE TABLE refugio_permisos (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(80) NOT NULL UNIQUE,
    nombre      VARCHAR(120) NOT NULL,
    modulo      VARCHAR(40) NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_refugio_permisos_modulo ON refugio_permisos(modulo);

CREATE TABLE refugio_empleados (
    id             BIGSERIAL PRIMARY KEY,
    refugio_id     BIGINT NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
    usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    activo         BOOLEAN NOT NULL DEFAULT true,
    creado_por     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (refugio_id, usuario_id)
);
CREATE INDEX idx_refugio_empleados_refugio ON refugio_empleados(refugio_id);
CREATE INDEX idx_refugio_empleados_usuario ON refugio_empleados(usuario_id);

CREATE TABLE refugio_empleado_permisos (
    id                  BIGSERIAL PRIMARY KEY,
    refugio_empleado_id BIGINT NOT NULL REFERENCES refugio_empleados(id) ON DELETE CASCADE,
    permiso_id          BIGINT NOT NULL REFERENCES refugio_permisos(id) ON DELETE CASCADE,
    UNIQUE (refugio_empleado_id, permiso_id)
);

INSERT INTO refugio_permisos (codigo, nombre, modulo, descripcion) VALUES
    ('mascotas',               'Mascotas',               'mascotas',       'Gestionar las mascotas del refugio'),
    ('solicitudes',            'Solicitudes de adopción', 'solicitudes',    'Gestionar las solicitudes de adopción'),
    ('adopciones',             'Adopciones',             'adopciones',      'Gestionar las adopciones exitosas'),
    ('foro',                   'Foro',                   'foro',            'Publicar y gestionar el foro'),
    ('marketplace',            'Marketplace',            'marketplace',     'Gestionar el marketplace/tienda'),
    ('pedidos',                'Pedidos',                'pedidos',         'Gestionar los pedidos'),
    ('donaciones',             'Donaciones',             'donaciones',      'Gestionar las donaciones'),
    ('estadisticas',           'Estadísticas',           'estadisticas',    'Consultar las estadísticas'),
    ('configuracion',          'Configuración del refugio', 'configuracion', 'Acceder a la configuración del refugio'),
    ('administrar_empleados',  'Administrar empleados',  'empleados',       'Crear, editar, eliminar empleados y asignar permisos')
ON CONFLICT (codigo) DO NOTHING;

-- Historial de actividad de la tienda (snapshots legibles)
CREATE TABLE tienda_actividades (
    id             BIGSERIAL PRIMARY KEY,
    tienda_id      BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    usuario_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(200),
    rol_usuario    VARCHAR(30),
    tipo_accion    VARCHAR(60) NOT NULL,
    accion         VARCHAR(200) NOT NULL,
    elemento_tipo  VARCHAR(60),
    elemento       VARCHAR(255),
    detalle        TEXT,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tienda_act_tienda ON tienda_actividades(tienda_id);
CREATE INDEX idx_tienda_act_tipo ON tienda_actividades(tipo_accion);

-- Productos (pueden ser vendidos por tienda o por refugio con tienda habilitada)
CREATE TABLE productos (
    id                     BIGSERIAL PRIMARY KEY,
    nombre                 VARCHAR(150) NOT NULL,
    categoria_id           BIGINT REFERENCES categorias_producto(id),
    -- Moneda: COP sin centavos -> entero (BIGINT). El punto de miles es solo formato.
    precio                 BIGINT NOT NULL DEFAULT 0,
    -- Descuento en porcentaje (0-100). 0 = sin descuento.
    descuento              SMALLINT NOT NULL DEFAULT 0,
    descripcion            TEXT,
    descripcion_larga      TEXT,
    calidad                VARCHAR(30),
    stock                  INT NOT NULL DEFAULT 0,
    marca                  VARCHAR(80),
    material               VARCHAR(200),
    tallas                 TEXT,
    colores                TEXT,
    ingredientes           TEXT,
    ingredientes_activos   TEXT,
    aroma                  VARCHAR(80),
    instrucciones_cuidado  TEXT,
    activo                 BOOLEAN NOT NULL DEFAULT true,
    ventas                 INT NOT NULL DEFAULT 0,
    rating                 NUMERIC(2,1) NOT NULL DEFAULT 0,
    refugio_id             BIGINT REFERENCES refugios(id) ON DELETE SET NULL,
    tienda_id              BIGINT REFERENCES tiendas(id) ON DELETE SET NULL,
    -- Soft delete
    eliminado_en           TIMESTAMPTZ,
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_producto_vendedor CHECK (refugio_id IS NOT NULL OR tienda_id IS NOT NULL)
);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_activo ON productos(activo) WHERE activo;
CREATE INDEX idx_productos_tienda ON productos(tienda_id);
CREATE INDEX idx_productos_refugio ON productos(refugio_id);

CREATE TABLE producto_imagenes (
    id           BIGSERIAL PRIMARY KEY,
    producto_id  BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    etiqueta     VARCHAR(80),
    orden        INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_producto_img_producto ON producto_imagenes(producto_id);

CREATE TABLE resenas (
    id           BIGSERIAL PRIMARY KEY,
    producto_id  BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    usuario_id   BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario   TEXT,
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    editada_en   TIMESTAMPTZ
);
CREATE INDEX idx_resenas_producto ON resenas(producto_id);

CREATE TABLE favoritos_productos (
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    producto_id  BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (usuario_id, producto_id)
);

CREATE TABLE pedidos (
    id                     BIGSERIAL PRIMARY KEY,
    usuario_id             BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado_id              BIGINT NOT NULL REFERENCES estados_pedido(id),
    -- Moneda: COP sin centavos -> entero (BIGINT).
    subtotal               BIGINT NOT NULL DEFAULT 0,
    costo_envio            BIGINT NOT NULL DEFAULT 0,
    descuento              BIGINT NOT NULL DEFAULT 0,
    total                  BIGINT NOT NULL DEFAULT 0,
    codigo_promocion       VARCHAR(40),
    nombre_contacto        VARCHAR(150),
    telefono_contacto      VARCHAR(30),
    direccion_envio        VARCHAR(255),
    metodo_pago            VARCHAR(60),
    notas                  TEXT,
    fecha_estimada_entrega TIMESTAMPTZ,
    numero_guia            VARCHAR(80),
    empresa_transportadora VARCHAR(120),
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado_id);
CREATE INDEX idx_pedidos_creado ON pedidos(creado_en);

CREATE TABLE pedido_items (
    id              BIGSERIAL PRIMARY KEY,
    pedido_id       BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     BIGINT REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    cantidad        INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    -- Moneda: COP sin centavos -> entero (BIGINT).
    precio_unitario BIGINT NOT NULL DEFAULT 0,
    subtotal        BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);

CREATE TABLE historial_estados_pedido (
    id        BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    estado_id BIGINT NOT NULL REFERENCES estados_pedido(id),
    notas     VARCHAR(255),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_historial_pedido ON historial_estados_pedido(pedido_id);

-- Kardex de inventario (costo promedio ponderado)
CREATE TABLE movimientos_kardex (
    id               BIGSERIAL PRIMARY KEY,
    producto_id      BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tienda_id        BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    tipo_movimiento  VARCHAR(30) NOT NULL, -- ENTRADA | SALIDA | AJUSTE_POSITIVO | AJUSTE_NEGATIVO
    concepto         VARCHAR(255) NOT NULL DEFAULT '',
    cantidad         INT NOT NULL DEFAULT 0,
    -- Moneda: COP sin centavos -> entero (BIGINT).
    costo_unitario   BIGINT NOT NULL DEFAULT 0,
    costo_total      BIGINT NOT NULL DEFAULT 0,
    saldo_cantidad   INT NOT NULL DEFAULT 0,
    saldo_valor      BIGINT NOT NULL DEFAULT 0,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kardex_producto ON movimientos_kardex(producto_id);
CREATE INDEX idx_kardex_tienda ON movimientos_kardex(tienda_id);
CREATE INDEX idx_kardex_tipo ON movimientos_kardex(tipo_movimiento);
CREATE INDEX idx_kardex_fecha ON movimientos_kardex(creado_en);

-- ============================================================
-- 6. DONACIONES (Tiendas Aliadas -> Refugios)
-- ============================================================

CREATE TABLE donaciones (
    id             BIGSERIAL PRIMARY KEY,
    tienda_id      BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    refugio_id     BIGINT NOT NULL REFERENCES refugios(id),
    usuario_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(200),
    rol_usuario    VARCHAR(30),
    refugio_nombre VARCHAR(150),
    observacion    TEXT,
    estado         VARCHAR(20) NOT NULL DEFAULT 'completada',
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_donaciones_tienda ON donaciones(tienda_id);
CREATE INDEX idx_donaciones_refugio ON donaciones(refugio_id);

CREATE TABLE donacion_items (
    id              BIGSERIAL PRIMARY KEY,
    donacion_id     BIGINT NOT NULL REFERENCES donaciones(id) ON DELETE CASCADE,
    producto_id     BIGINT REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    cantidad        INT NOT NULL DEFAULT 1
);
CREATE INDEX idx_donacion_items_donacion ON donacion_items(donacion_id);

-- ============================================================
-- 6b. DONACIONES DE PERSONAS A REFUGIOS (dinero / artículos físicos)
-- ============================================================
-- Diferente de 'donaciones'/'donacion_items' (donaciones de PRODUCTOS hechas
-- por Tiendas Aliadas). Aquí un usuario anónimo o registrado dona dinero o
-- artículos físicos (ropa, accesorios, alimentos...) a un refugio.
-- La pasarela de pagos NO está integrada aún; 'pago-confirmado' es el punto
-- de integración futuro. 'referencia' permite rastrear una donación anónima.
CREATE TABLE donaciones_usuarios (
    id                     BIGSERIAL PRIMARY KEY,
    usuario_id             BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    refugio_id             BIGINT NOT NULL REFERENCES refugios(id) ON DELETE SET NULL,
    tipo                   VARCHAR(20) NOT NULL,          -- 'dinero' | 'fisica'
    valor                  BIGINT,                        -- COP (solo dinero)
    detalle                TEXT,
    estado                 VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    es_anonimo             BOOLEAN NOT NULL DEFAULT TRUE,
    nombre_donante         VARCHAR(200),
    email_contacto         VARCHAR(255),
    telefono_contacto      VARCHAR(30),
    refugio_nombre         VARCHAR(150),
    referencia             VARCHAR(30) UNIQUE,
    transaccion_id         VARCHAR(200),
    pasarela_datos         TEXT,
    motivo_no_recibida     TEXT,
    confirmado_por_id      BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    confirmado_por_nombre  VARCHAR(200),
    confirmado_en          TIMESTAMPTZ,
    post_foro_id           BIGINT REFERENCES foro_posts(id) ON DELETE SET NULL,
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en         TIMESTAMPTZ
);
CREATE INDEX idx_don_usr_usuario ON donaciones_usuarios(usuario_id);
CREATE INDEX idx_don_usr_refugio ON donaciones_usuarios(refugio_id);
CREATE INDEX idx_don_usr_estado  ON donaciones_usuarios(estado);
CREATE INDEX idx_don_usr_creado  ON donaciones_usuarios(creado_en);

-- ============================================================
-- 7. PQRS DE TIENDAS ALIADAS (hacia Administradores de Adoptify)
-- ============================================================

CREATE TABLE tienda_pqrs (
    id             BIGSERIAL PRIMARY KEY,
    tienda_id      BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    tienda_nombre  VARCHAR(150),
    usuario_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo           VARCHAR(20) NOT NULL DEFAULT 'peticion',
    asunto         VARCHAR(200) NOT NULL,
    descripcion    TEXT NOT NULL,
    estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tienda_pqrs_tienda ON tienda_pqrs(tienda_id);

CREATE TABLE tienda_pqrs_mensajes (
    id               BIGSERIAL PRIMARY KEY,
    pqrs_id          BIGINT NOT NULL REFERENCES tienda_pqrs(id) ON DELETE CASCADE,
    usuario_id       BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre_remitente VARCHAR(200),
    rol_remitente    VARCHAR(20) NOT NULL DEFAULT 'tienda',
    mensaje          TEXT NOT NULL,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tienda_pqrs_msj_pqrs ON tienda_pqrs_mensajes(pqrs_id);

CREATE TABLE tienda_pqrs_adjuntos (
    id            BIGSERIAL PRIMARY KEY,
    pqrs_id       BIGINT NOT NULL REFERENCES tienda_pqrs(id) ON DELETE CASCADE,
    mensaje_id    BIGINT REFERENCES tienda_pqrs_mensajes(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255),
    url           TEXT NOT NULL,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tienda_pqrs_adj_pqrs ON tienda_pqrs_adjuntos(pqrs_id);

-- ============================================================
-- 8. FORO / COMUNIDAD
-- ============================================================

CREATE TABLE foro_posts (
    id           BIGSERIAL PRIMARY KEY,
    autor_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    categoria_id BIGINT REFERENCES foro_categorias(id),
    tipo_id      BIGINT REFERENCES tipos_post_foro(id),
    estado_id    BIGINT NOT NULL REFERENCES estados_post_foro(id),
    titulo       VARCHAR(255) NOT NULL,
    contenido    TEXT,
    tags         TEXT,
    fijado       BOOLEAN NOT NULL DEFAULT false,
    vistas       INT NOT NULL DEFAULT 0,
    compartidos  INT NOT NULL DEFAULT 0,
    -- Soft delete
    activo       BOOLEAN NOT NULL DEFAULT true,
    eliminado_en TIMESTAMPTZ,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_foro_posts_categoria ON foro_posts(categoria_id);
CREATE INDEX idx_foro_posts_activo ON foro_posts(activo) WHERE activo;
CREATE INDEX idx_foro_posts_autor ON foro_posts(autor_id);

-- Nombre correcto (plural), alineado con el modelo ForoPostImagen y el backend.
CREATE TABLE foro_posts_imagenes (
    id         BIGSERIAL PRIMARY KEY,
    post_id    BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    public_id  VARCHAR(255) NOT NULL,
    etiqueta   VARCHAR(80),
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_foro_img_post ON foro_posts_imagenes(post_id);

CREATE TABLE foro_comentarios (
    id                    BIGSERIAL PRIMARY KEY,
    post_id               BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    autor_id              BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    comentario_padre_id   BIGINT REFERENCES foro_comentarios(id) ON DELETE CASCADE,
    contenido             TEXT NOT NULL,
    likes                 INT NOT NULL DEFAULT 0,
    -- Soft delete
    activo                BOOLEAN NOT NULL DEFAULT true,
    eliminado_en          TIMESTAMPTZ,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_foro_comentarios_post ON foro_comentarios(post_id);

CREATE TABLE foro_reacciones (
    id                BIGSERIAL PRIMARY KEY,
    post_id           BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    usuario_id        BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_reaccion_id  BIGINT NOT NULL REFERENCES tipos_reaccion(id),
    -- Una unica reaccion por usuario y publicacion (el tipo se actualiza).
    UNIQUE (post_id, usuario_id)
);

CREATE TABLE foro_comentario_likes (
    id             BIGSERIAL PRIMARY KEY,
    comentario_id  BIGINT NOT NULL REFERENCES foro_comentarios(id) ON DELETE CASCADE,
    usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (comentario_id, usuario_id)
);
CREATE INDEX idx_foro_coment_likes_comentario ON foro_comentario_likes(comentario_id);

CREATE TABLE foro_guardados (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    post_id     BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (usuario_id, post_id)
);
CREATE INDEX idx_foro_guardados_usuario ON foro_guardados(usuario_id);
CREATE INDEX idx_foro_guardados_post ON foro_guardados(post_id);

-- ============================================================
-- 9. NOTIFICACIONES, PQRS, REPORTES Y AUDITORIA
-- ============================================================

CREATE TABLE notificaciones (
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo         VARCHAR(40),
    mensaje      TEXT NOT NULL,
    enlace       VARCHAR(200),
    leida        BOOLEAN NOT NULL DEFAULT false,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);

CREATE TABLE pqrs (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo        VARCHAR(20) NOT NULL DEFAULT 'peticion',
    asunto      VARCHAR(200) NOT NULL,
    mensaje     TEXT NOT NULL,
    estado      VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    respuesta   TEXT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reportes (
    id             BIGSERIAL PRIMARY KEY,
    reportante_id  BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_objeto    VARCHAR(20) NOT NULL,
    objeto_id      BIGINT,
    motivo         TEXT NOT NULL,
    estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auditoria (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    accion      VARCHAR(60) NOT NULL,
    entidad     VARCHAR(60),
    entidad_id  BIGINT,
    detalle     TEXT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_entidad ON auditoria(entidad, entidad_id);

-- ============================================================
-- 10. VERIFICACION DE CODIGOS E INTEGRACION IA / n8n / CHAT
-- ============================================================

-- Codigos de verificacion de 6 digitos (registro / reset de contrasena).
-- Datos temporales: ver seccion de limpieza automatica al final del script.
CREATE TABLE codigos_verificacion (
    id         BIGSERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    codigo     VARCHAR(6) NOT NULL,
    tipo       VARCHAR(20) NOT NULL,  -- 'registro' | 'reset_password'
    usado      BOOLEAN NOT NULL DEFAULT false,
    expira_en  TIMESTAMPTZ NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_codigos_verificacion_email ON codigos_verificacion(email);

-- Cola de tareas de IA (fuente de verdad para n8n). Datos temporales.
CREATE TABLE tareas_ia (
    id           BIGSERIAL PRIMARY KEY,
    tipo         VARCHAR(60) NOT NULL,
    payload      TEXT NOT NULL,
    estado       VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    resultado    TEXT,
    error        TEXT,
    intentos     INTEGER NOT NULL DEFAULT 0,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    procesado_en TIMESTAMPTZ
);
CREATE INDEX idx_tareas_ia_estado ON tareas_ia(estado);

-- Sesiones y mensajes del chatbot (historial persistente).
CREATE TABLE chat_sesiones (
    id             BIGSERIAL PRIMARY KEY,
    session_id     VARCHAR(64) NOT NULL UNIQUE,
    usuario_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_mensajes (
    id         BIGSERIAL PRIMARY KEY,
    sesion_id  BIGINT NOT NULL REFERENCES chat_sesiones(id) ON DELETE CASCADE,
    rol        VARCHAR(20) NOT NULL,
    contenido  TEXT NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_msj_sesion ON chat_mensajes(sesion_id);

-- ============================================================
-- 11. SEGURIDAD A NIVEL DE FILA (RLS) EN TODAS LAS TABLAS
-- ============================================================
-- Todo el acceso pasa por el backend FastAPI (rol 'postgres', que omite RLS).
-- Activamos RLS sin politicas para bloquear el acceso publico via anon keys.

-- Catalogos
ALTER TABLE tipos_documento          ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_mascota            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamanos_mascota          ENABLE ROW LEVEL SECURITY;
ALTER TABLE generos_mascota          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_mascota          ENABLE ROW LEVEL SECURITY;
ALTER TABLE razas_mascota            ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_solicitud        ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_pedido           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_producto      ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_categorias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_post_foro          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_post_foro        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_reaccion           ENABLE ROW LEVEL SECURITY;

-- Permisos RBAC
ALTER TABLE tienda_permisos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_usuario_permisos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugio_permisos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugio_empleados        ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugio_empleado_permisos ENABLE ROW LEVEL SECURITY;

-- Usuarios y perfiles
ALTER TABLE usuarios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuraciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugio_imagenes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiendas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_actividades       ENABLE ROW LEVEL SECURITY;

-- Solicitudes de registro
ALTER TABLE solicitudes_refugio          ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_refugio_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_refugio_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_tienda           ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_tienda_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_tienda_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE enlaces_creacion_password    ENABLE ROW LEVEL SECURITY;

-- Mascotas y adopciones
ALTER TABLE mascotas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE mascota_imagenes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_adopcion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoritos_mascotas       ENABLE ROW LEVEL SECURITY;

-- Productos, compras y kardex
ALTER TABLE productos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_imagenes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoritos_productos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_estados_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_kardex       ENABLE ROW LEVEL SECURITY;

-- Donaciones y PQRS de tienda
ALTER TABLE donaciones               ENABLE ROW LEVEL SECURITY;
ALTER TABLE donacion_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE donaciones_usuarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_pqrs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_pqrs_mensajes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_pqrs_adjuntos     ENABLE ROW LEVEL SECURITY;

-- Foro / comunidad
ALTER TABLE foro_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_posts_imagenes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_comentarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_reacciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_comentario_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_guardados           ENABLE ROW LEVEL SECURITY;

-- Notificaciones, PQRS, reportes y auditoria
ALTER TABLE notificaciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pqrs                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria                ENABLE ROW LEVEL SECURITY;

-- Verificacion e IA / chat
ALTER TABLE codigos_verificacion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas_ia                ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sesiones            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. LIMPIEZA AUTOMATICA DE DATOS TEMPORALES
-- ============================================================
-- Estrategia definida para evitar el crecimiento indefinido de tablas
-- temporales. Supabase (plan free) NO garantiza pg_cron, por lo que la
-- limpieza se delega al backend de forma simple y de bajo riesgo:
--
--   a) codigos_verificacion (registro / reset_password):
--        - Se marcan como 'usado' al consumirse (ya lo hace el backend).
--        - Cada vez que se genera un codigo nuevo para un email+tipo, el
--          backend debe ELIMINAR los codigos previos usados/expirados de ese
--          email+tipo (ademas de invalidar los activos). Asi la tabla queda
--          acotada y no acumula codigos caducos.
--        - Comando de limpieza manual/recomendado:
--          DELETE FROM codigos_verificacion
--          WHERE usado = true OR expira_en < now() - INTERVAL '7 days';
--
--   b) enlaces_creacion_password (crear contrasena de refugio/tienda):
--        - Caducan a las 24 h y solo se usan una vez. Al consumirse deben
--          marcarse como 'usado' (backend) y eliminarse posteriormente.
--        - Comando de limpieza:
--          DELETE FROM enlaces_creacion_password
--          WHERE usado <> 'activo' OR expira_en < now();
--
--   c) tareas_ia (cola de n8n):
--        - Las tareas completadas/error no vuelven a procesarse. El backend
--          (o n8n) debe depurarlas periodicamente.
--        - Comando de limpieza:
--          DELETE FROM tareas_ia
--          WHERE estado IN ('completado','error') AND creado_en < now() - INTERVAL '30 days';
--
--   d) chat_sesiones / chat_mensajes (chatbot):
--        - El historial de sesiones antiguas (sin actividad) debe depurarse.
--          DELETE FROM chat_mensajes WHERE sesion_id IN (
--            SELECT id FROM chat_sesiones
--            WHERE actualizado_en < now() - INTERVAL '90 days'
--          );
--          DELETE FROM chat_sesiones WHERE actualizado_en < now() - INTERVAL '90 days';
--
--   e) notificaciones / auditoria / tienda_actividades:
--        - Son registros historicos/funcionales (se conservan). Si el volumen
--          crece, puede retenerse solo lo reciente (p.ej. 1 anio) para
--          auditoria, pero NO es obligatorio.
--
-- Si en el futuro Supabase habilita pg_cron para el proyecto, se pueden crear
-- los jobs equivalentes (SELECT cron.schedule(...)) con los DELETE anteriores.

-- ============================================================
-- FIN DEL ESQUEMA
-- Total: 64 tablas (14 catalogos + 50 tablas de datos).
-- ============================================================
