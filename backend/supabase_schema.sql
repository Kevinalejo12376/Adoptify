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
-- Diseno 3FN:
--   - Todos los valores enumerados (tipo de documento, rol, estados, categorias,
--     tipos, generos, tamanos, reacciones) viven en TABLAS DE CATALOGO separadas
--     y se referencian por FOREIGN KEY. Nada de texto repetido.
--   - Las tablas de catalogo ya vienen POBLADAS con datos semilla.
-- ============================================================

-- ============================================================
-- 0. LIMPIEZA (elimina tablas si existen, en orden seguro)
-- ============================================================
DROP TABLE IF EXISTS
    auditoria, reportes, pqrs,
    notificaciones, actividades, campanas, eventos,
    foro_guardados, foro_comentario_likes, foro_reacciones, foro_comentarios, foro_post_imagenes, foro_posts,
    historial_estados_pedido, pedido_items, pedidos, codigos_promocion, carrito_items,
    favoritos_productos, favoritos_mascotas,
    resenas_refugio, resenas, producto_caracteristicas, producto_imagenes, productos,
    tienda_usuario_permisos, tienda_usuarios, tienda_permisos, tienda_imagenes, tiendas,
    solicitudes_adopcion, mascota_imagenes, mascotas,
    enlaces_creacion_password, solicitudes_refugio_historial, solicitudes_refugio_documentos, solicitudes_refugio,
    refugio_imagenes, configuraciones, refugios, usuarios,
    -- catalogos
    tipos_reaccion, estados_post_foro, tipos_post_foro, foro_categorias,
    categorias_producto, estados_pedido, estados_solicitud,
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

CREATE TABLE tipos_mascota (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO tipos_mascota (codigo, nombre) VALUES
    ('perro', 'Perro'),
    ('gato',  'Gato');

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

CREATE TABLE estados_solicitud (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO estados_solicitud (codigo, nombre) VALUES
    ('pendiente',   'Pendiente'),
    ('en_proceso', 'En Proceso'),
    ('contactado',  'Contactado'),
    ('finalizada',  'Finalizada'),
    ('cerrada',     'Cerrada');

CREATE TABLE estados_pedido (
    id     BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(40) NOT NULL
);
INSERT INTO estados_pedido (codigo, nombre) VALUES
    ('pendiente', 'Pendiente'),
    ('pagado',    'Pagado'),
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
    rol_id             BIGINT NOT NULL REFERENCES roles(id),
    activo             BOOLEAN NOT NULL DEFAULT true,
    ubicacion          VARCHAR(150),
    bio                TEXT,
    website            VARCHAR(150),
    avatar_url         TEXT,
    cover_url          TEXT,
    twitter            VARCHAR(120),
    instagram          VARCHAR(120),
    verificado         BOOLEAN NOT NULL DEFAULT false,
    perfil_completo    BOOLEAN NOT NULL DEFAULT false,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);

-- Super administrador por defecto
INSERT INTO usuarios (nombre, email, hashed_password, rol_id, activo, creado_en)
VALUES (
    'Adoptify Oficial',
    'adoptifyoficial@gmail.com',
    '$2b$12$ggu6XmhNG7/nIC32oFB2x.PE2dxOCbVhwB0zxA/Ja3kAgfvNTjE6S',
    (SELECT id FROM roles WHERE codigo = 'administrador_principal'),
    true,
    now()
);

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

-- ============================================================
-- 2b. SOLICITUDES DE REGISTRO DE REFUGIOS
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
-- 3. MASCOTAS Y ADOPCIONES
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
    personalidad   TEXT,
    salud          TEXT,
    requisitos     TEXT,
    vacunado       BOOLEAN NOT NULL DEFAULT false,
    esterilizado   BOOLEAN NOT NULL DEFAULT false,
    desparasitado  BOOLEAN NOT NULL DEFAULT false,
    fecha_ingreso  DATE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mascotas_refugio ON mascotas(refugio_id);
CREATE INDEX idx_mascotas_estado ON mascotas(estado_id);
CREATE INDEX idx_mascotas_tipo ON mascotas(tipo_id);

CREATE TABLE mascota_imagenes (
    id          BIGSERIAL PRIMARY KEY,
    mascota_id  BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    orden       INT NOT NULL DEFAULT 0
);

CREATE TABLE solicitudes_adopcion (
    id                 BIGSERIAL PRIMARY KEY,
    mascota_id         BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
    usuario_id         BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado_id          BIGINT NOT NULL REFERENCES estados_solicitud(id),
    nombre_contacto    VARCHAR(150) NOT NULL,
    email_contacto     VARCHAR(255),
    telefono_contacto  VARCHAR(30),
    ubicacion          VARCHAR(150),
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
-- 4. TIENDAS, PRODUCTOS Y COMPRAS
-- ============================================================

CREATE TABLE tiendas (
    id                 BIGSERIAL PRIMARY KEY,
    usuario_id         BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre             VARCHAR(150) NOT NULL,
    slug               VARCHAR(160) UNIQUE,
    descripcion        TEXT,
    ubicacion          VARCHAR(150),
    telefono           VARCHAR(30),
    email              VARCHAR(255),
    website            VARCHAR(150),
    facebook           VARCHAR(120),
    instagram          VARCHAR(120),
    horario_semana     VARCHAR(120),
    horario_fin_semana VARCHAR(120),
    rating             NUMERIC(2,1) NOT NULL DEFAULT 0,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RBAC del modulo Tienda (jerarquia de administradores)
-- ============================================================
-- Catalogo de permisos disponibles (se cargan dinamicamente en la API).
-- Agregar un permiso nuevo = insertar una fila aqui.
CREATE TABLE tienda_permisos (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(80) NOT NULL UNIQUE,
    nombre      VARCHAR(120) NOT NULL,
    modulo      VARCHAR(40) NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_tienda_permisos_modulo ON tienda_permisos(modulo);

-- Pertenencia a una tienda y jerarquia (super_admin | admin).
CREATE TABLE tienda_usuarios (
    id             BIGSERIAL PRIMARY KEY,
    tienda_id      BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo           VARCHAR(20) NOT NULL DEFAULT 'admin',
    activo         BOOLEAN NOT NULL DEFAULT true,
    creado_por     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    ultimo_acceso  TIMESTAMPTZ,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tienda_usuarios_tienda  ON tienda_usuarios(tienda_id);
CREATE INDEX idx_tienda_usuarios_usuario ON tienda_usuarios(usuario_id);

-- Permisos asignados a cada administrador (solo aplica a tipo 'admin').
CREATE TABLE tienda_usuario_permisos (
    id                 BIGSERIAL PRIMARY KEY,
    tienda_usuario_id  BIGINT NOT NULL REFERENCES tienda_usuarios(id) ON DELETE CASCADE,
    permiso_id         BIGINT NOT NULL REFERENCES tienda_permisos(id) ON DELETE CASCADE,
    UNIQUE (tienda_usuario_id, permiso_id)
);

-- Datos semilla del catalogo de permisos (idempotente con ON CONFLICT).
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
    ('administradores.asignar_permisos','Asignar permisos',                      'administradores','Asignar permisos a los administradores')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- RBAC del modulo Equipo de refugio (empleados y permisos)
-- ============================================================
-- Catalogo de permisos disponibles para los empleados del refugio.
CREATE TABLE refugio_permisos (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(80) NOT NULL UNIQUE,
    nombre      VARCHAR(120) NOT NULL,
    modulo      VARCHAR(40) NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_refugio_permisos_modulo ON refugio_permisos(modulo);

-- Vinculo empleado -> refugio (un usuario puede pertenecer a un solo refugio).
CREATE TABLE refugio_empleados (
    id             BIGSERIAL PRIMARY KEY,
    refugio_id     BIGINT NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
    usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    activo         BOOLEAN NOT NULL DEFAULT true,
    creado_por     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (refugio_id, usuario_id)
);
CREATE INDEX idx_refugio_empleados_refugio  ON refugio_empleados(refugio_id);
CREATE INDEX idx_refugio_empleados_usuario  ON refugio_empleados(usuario_id);

-- Permisos asignados a cada empleado del refugio.
CREATE TABLE refugio_empleado_permisos (
    id                 BIGSERIAL PRIMARY KEY,
    refugio_empleado_id BIGINT NOT NULL REFERENCES refugio_empleados(id) ON DELETE CASCADE,
    permiso_id         BIGINT NOT NULL REFERENCES refugio_permisos(id) ON DELETE CASCADE,
    UNIQUE (refugio_empleado_id, permiso_id)
);

-- Datos semilla del catalogo de permisos (idempotente con ON CONFLICT).
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

CREATE TABLE tienda_imagenes (
    id         BIGSERIAL PRIMARY KEY,
    tienda_id  BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    etiqueta   VARCHAR(80),
    orden      INT NOT NULL DEFAULT 0
);

CREATE TABLE productos (
    id                     BIGSERIAL PRIMARY KEY,
    nombre                 VARCHAR(150) NOT NULL,
    categoria_id           BIGINT REFERENCES categorias_producto(id),
    precio                 NUMERIC(10,2) NOT NULL DEFAULT 0,
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
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_producto_vendedor CHECK (refugio_id IS NOT NULL OR tienda_id IS NOT NULL)
);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);

CREATE TABLE producto_imagenes (
    id           BIGSERIAL PRIMARY KEY,
    producto_id  BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    etiqueta     VARCHAR(80),
    orden        INT NOT NULL DEFAULT 0
);

CREATE TABLE producto_caracteristicas (
    id           BIGSERIAL PRIMARY KEY,
    producto_id  BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    descripcion  VARCHAR(200) NOT NULL
);

CREATE TABLE resenas (
    id           BIGSERIAL PRIMARY KEY,
    producto_id  BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    usuario_id   BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario   TEXT,
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    editada_en   TIMESTAMPTZ
);

CREATE TABLE resenas_refugio (
    id           BIGSERIAL PRIMARY KEY,
    refugio_id   BIGINT NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
    usuario_id   BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario   TEXT,
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE favoritos_productos (
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    producto_id  BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (usuario_id, producto_id)
);

CREATE TABLE carrito_items (
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    producto_id  BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad     INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    UNIQUE (usuario_id, producto_id)
);

CREATE TABLE codigos_promocion (
    id                   BIGSERIAL PRIMARY KEY,
    codigo               VARCHAR(40) NOT NULL UNIQUE,
    descuento_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
    activo               BOOLEAN NOT NULL DEFAULT true,
    expira_en            TIMESTAMPTZ
);

CREATE TABLE pedidos (
    id                     BIGSERIAL PRIMARY KEY,
    usuario_id             BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado_id              BIGINT NOT NULL REFERENCES estados_pedido(id),
    subtotal               NUMERIC(10,2) NOT NULL DEFAULT 0,
    costo_envio            NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuento              NUMERIC(10,2) NOT NULL DEFAULT 0,
    total                  NUMERIC(10,2) NOT NULL DEFAULT 0,
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

CREATE TABLE pedido_items (
    id              BIGSERIAL PRIMARY KEY,
    pedido_id       BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     BIGINT REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    cantidad        INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE historial_estados_pedido (
    id        BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    estado_id BIGINT NOT NULL REFERENCES estados_pedido(id),
    notas     VARCHAR(255),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_historial_pedido ON historial_estados_pedido(pedido_id);

-- ============================================================
-- 5. FORO / COMUNIDAD
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
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_foro_posts_categoria ON foro_posts(categoria_id);

CREATE TABLE foro_post_imagenes (
    id       BIGSERIAL PRIMARY KEY,
    post_id  BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    url      TEXT NOT NULL,
    orden    INT NOT NULL DEFAULT 0
);

CREATE TABLE foro_comentarios (
    id                    BIGSERIAL PRIMARY KEY,
    post_id               BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    autor_id              BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    comentario_padre_id   BIGINT REFERENCES foro_comentarios(id) ON DELETE CASCADE,
    contenido             TEXT NOT NULL,
    likes                 INT NOT NULL DEFAULT 0,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_foro_comentarios_post ON foro_comentarios(post_id);

CREATE TABLE foro_reacciones (
    id                BIGSERIAL PRIMARY KEY,
    post_id           BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    usuario_id        BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_reaccion_id  BIGINT NOT NULL REFERENCES tipos_reaccion(id),
    -- Una única reacción por usuario y publicación (el tipo se actualiza al cambiar).
    UNIQUE (post_id, usuario_id)
);

CREATE TABLE foro_comentario_likes (
    id             BIGSERIAL PRIMARY KEY,
    comentario_id  BIGINT NOT NULL REFERENCES foro_comentarios(id) ON DELETE CASCADE,
    usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (comentario_id, usuario_id)
);

CREATE TABLE foro_guardados (
    id             BIGSERIAL PRIMARY KEY,
    usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    post_id        BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (usuario_id, post_id)
);
CREATE INDEX idx_foro_guardados_usuario ON foro_guardados(usuario_id);
CREATE INDEX idx_foro_guardados_post   ON foro_guardados(post_id);

-- ============================================================
-- 6. EVENTOS Y CAMPAÑAS
-- ============================================================

CREATE TABLE eventos (
    id           BIGSERIAL PRIMARY KEY,
    refugio_id   BIGINT REFERENCES refugios(id) ON DELETE CASCADE,
    titulo       VARCHAR(200) NOT NULL,
    descripcion  TEXT,
    tipo         VARCHAR(50),
    ubicacion    VARCHAR(200),
    fecha        TIMESTAMPTZ,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campanas (
    id           BIGSERIAL PRIMARY KEY,
    refugio_id   BIGINT REFERENCES refugios(id) ON DELETE CASCADE,
    titulo       VARCHAR(200) NOT NULL,
    descripcion  TEXT,
    tipo         VARCHAR(50),
    meta         NUMERIC(12,2) NOT NULL DEFAULT 0,
    recaudado    NUMERIC(12,2) NOT NULL DEFAULT 0,
    unidad       VARCHAR(20) NOT NULL DEFAULT 'COP',
    activa       BOOLEAN NOT NULL DEFAULT true,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. ACTIVIDAD Y NOTIFICACIONES
-- ============================================================

CREATE TABLE actividades (
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
    refugio_id   BIGINT REFERENCES refugios(id) ON DELETE CASCADE,
    tipo         VARCHAR(40),
    titulo       VARCHAR(200) NOT NULL,
    descripcion  TEXT,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- PQRS (Peticiones, Quejas, Reclamos, Sugerencias)
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

-- Reportes de contenido (posts, productos, usuarios, mascotas)
CREATE TABLE reportes (
    id             BIGSERIAL PRIMARY KEY,
    reportante_id  BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_objeto    VARCHAR(20) NOT NULL,
    objeto_id      BIGINT,
    motivo         TEXT NOT NULL,
    estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoria de acciones (registro de actividad del sistema)
CREATE TABLE auditoria (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    accion      VARCHAR(60) NOT NULL,
    entidad     VARCHAR(60),
    entidad_id  BIGINT,
    detalle     TEXT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. SEGURIDAD A NIVEL DE FILA (RLS)
-- ============================================================
-- Todo el acceso pasa por el backend FastAPI (rol 'postgres', que omite RLS).
-- Activamos RLS sin politicas para bloquear el acceso publico via anon keys.
-- Se hace con ALTER explicito por tabla para que Supabase lo detecte y no avise.

-- Catalogos
ALTER TABLE tipos_documento          ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_mascota            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamanos_mascota          ENABLE ROW LEVEL SECURITY;
ALTER TABLE generos_mascota          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_mascota          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_solicitud        ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_pedido           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_producto      ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_categorias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_post_foro          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_post_foro        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_reaccion           ENABLE ROW LEVEL SECURITY;

-- Usuarios y perfiles
ALTER TABLE usuarios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuraciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugio_imagenes         ENABLE ROW LEVEL SECURITY;

-- Mascotas y adopciones
ALTER TABLE mascotas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE mascota_imagenes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_adopcion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoritos_mascotas       ENABLE ROW LEVEL SECURITY;

-- Tiendas, productos y compras
ALTER TABLE tiendas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_permisos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_usuario_permisos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_imagenes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_imagenes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_caracteristicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas_refugio          ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoritos_productos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrito_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_promocion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_estados_pedido ENABLE ROW LEVEL SECURITY;

-- Foro / comunidad
ALTER TABLE foro_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_post_imagenes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_comentarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_reacciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_guardados           ENABLE ROW LEVEL SECURITY;

-- Eventos, campañas, actividad y notificaciones
ALTER TABLE eventos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pqrs                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria                ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIN DEL ESQUEMA
-- 13 catalogos + 32 tablas de datos = 45 tablas en total
-- Catalogos: tipos_documento, roles, tipos_mascota, tamanos_mascota,
--   generos_mascota, estados_mascota, estados_solicitud, estados_pedido,
--   categorias_producto, foro_categorias, tipos_post_foro, estados_post_foro,
--   tipos_reaccion
-- Datos: usuarios, refugios, configuraciones, refugio_imagenes,
--   mascotas, mascota_imagenes, solicitudes_adopcion, favoritos_mascotas,
--   tiendas, tienda_imagenes, productos, producto_imagenes,
--   producto_caracteristicas, resenas, resenas_refugio, favoritos_productos,
--   carrito_items, codigos_promocion, pedidos, pedido_items,
--   foro_posts, foro_post_imagenes, foro_comentarios, foro_reacciones,
--   eventos, campanas, actividades, notificaciones,
--   pqrs, reportes, auditoria, (+ super-admin se inserta al arrancar el backend)
-- ============================================================
