# pyrefly: ignore [missing-import]
import logging
from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings
from app.db.database import Base, engine
# Importa todos los modelos para registrarlos en Base.metadata
from app import models  # noqa: F401
from app.db.seed import seed_catalogos
from app.api.routers import (
    auth, mascotas, refugios, solicitudes, productos, catalogos, admin,
    notificaciones, pqrs, reportes, publico, configuraciones, favoritos, foro,
    tienda, pedidos, solicitudes_refugio, solicitudes_refugio_admin,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas (dev/SQLite) y puebla los catalogos (idempotente).
    # En Supabase las tablas ya existen via supabase_schema.sql.
    try:
        Base.metadata.create_all(bind=engine)
        # Migracion: agrega columnas faltantes en Supabase si es necesario
        _run_migrations()
        seed_catalogos()
        logger.info("[lifespan] Conexion a base de datos OK (tablas listas).")
    except Exception as exc:
        # No bloquea el arranque: en Supabase las tablas ya existen.
        logger.warning(
            "[lifespan] No se pudieron crear/sembrar tablas (afecta solo a SQLite local). "
            "En Supabase las tablas ya existen, el servidor igual arranca. Detalle: %s",
            exc,
        )
        logger.warning(
            "[lifespan] Si ves 'could not translate host name' o 'timeout expired', "
            "revisa tu conexion de red/DNS (VPN o firewall) hacia Supabase."
        )
    yield


def _run_migrations():
    """Ejecuta migraciones para sincronizar el schema de Supabase con los modelos."""
    from app.db.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # Verifica si la columna 'perfil_completo' existe en usuarios
        result = db.execute(text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name='usuarios' AND column_name='perfil_completo'"
        )).fetchone()
        if not result:
            print("[migracion] Agregando columna 'perfil_completo' a usuarios...")
            db.execute(text(
                "ALTER TABLE usuarios ADD COLUMN perfil_completo BOOLEAN NOT NULL DEFAULT false"
            ))
            db.commit()
            print("[migracion] Columna 'perfil_completo' agregada correctamente.")

        # Columna 'username' en usuarios (refugios aprobados)
        _agregar_columna_si_no_existe(db, "usuarios", "username", "VARCHAR(50)")
        db.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username)"
        ))
        db.commit()

        # Columnas de refugios
        _agregar_columna_si_no_existe(db, "refugios", "logo_url", "TEXT")
        _agregar_columna_si_no_existe(db, "refugios", "tiktok", "VARCHAR(120)")
        _agregar_columna_si_no_existe(db, "refugios", "departamento", "VARCHAR(150)")
        _agregar_columna_si_no_existe(db, "refugios", "municipio", "VARCHAR(150)")
        db.commit()

        # Tablas nuevas del módulo de solicitudes de refugio
        _crear_tabla_solicitudes_refugio(db)
        _agregar_columna_si_no_existe(
            db, "solicitudes_refugio", "representante_apellido", "VARCHAR(100)"
        )
        _agregar_columna_si_no_existe(
            db, "solicitudes_refugio", "departamento", "VARCHAR(150)"
        )
        _agregar_columna_si_no_existe(
            db, "solicitudes_refugio", "municipio", "VARCHAR(150)"
        )
        db.commit()

        # ---- RBAC del modulo Tienda (jerarquia + permisos) ----
        try:
            _crear_tablas_rbac_tienda(db)
        except Exception as e:
            # En SQLite local las tablas ya las crea Base.metadata.create_all (modelos).
            print(f"[migracion] No se pudieron crear tablas RBAC por SQL (SQLite las crea via modelos): {e}")
        _backfill_super_admin_tiendas(db)

        # ---- Nuevas tablas de Tienda (historial de actividad, donaciones, PQRS) ----
        try:
            _crear_tablas_nuevas_tienda(db)
        except Exception as e:
            # En SQLite local las tablas ya las crea Base.metadata.create_all (modelos).
            print(f"[migracion] No se pudieron crear tablas nuevas de tienda por SQL (SQLite las crea via modelos): {e}")

        print("[migracion] Migraciones del módulo de solicitudes de refugio aplicadas correctamente.")
    except Exception as e:
        print(f"[migracion] Error ejecutando migraciones: {e}")
    finally:
        db.close()


def _agregar_columna_si_no_existe(db, tabla: str, columna: str, tipo: str):
    """Agrega una columna a una tabla de Supabase si aún no existe."""
    from sqlalchemy import text
    result = db.execute(text(
        "SELECT 1 FROM information_schema.columns "
        f"WHERE table_name='{tabla}' AND column_name='{columna}'"
    )).fetchone()
    if not result:
        print(f"[migracion] Agregando columna '{columna}' a {tabla}...")
        db.execute(text(
            f"ALTER TABLE {tabla} ADD COLUMN IF NOT EXISTS {columna} {tipo}"
        ))
        print(f"[migracion] Columna '{columna}' agregada correctamente.")


def _crear_tabla_solicitudes_refugio(db):
    """Crea las tablas del módulo de solicitudes de refugio si no existen (Supabase)."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS solicitudes_refugio (
            id BIGSERIAL PRIMARY KEY,
            nombre_refugio VARCHAR(150) NOT NULL,
            logo_url TEXT,
            descripcion TEXT,
            email_contacto VARCHAR(255),
            telefono VARCHAR(30),
            departamento VARCHAR(150),
            ciudad VARCHAR(150),
            municipio VARCHAR(150),
            direccion VARCHAR(200),
            website VARCHAR(150),
            anio_fundacion INT,
            facebook VARCHAR(120),
            instagram VARCHAR(120),
            tiktok VARCHAR(120),
            representante_nombre VARCHAR(100) NOT NULL,
            representante_apellido VARCHAR(100),
            representante_email VARCHAR(255) NOT NULL,
            representante_telefono VARCHAR(30),
            acepto_veracidad VARCHAR(20),
            autorizo_verificacion VARCHAR(20),
            estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
            motivo_rechazo TEXT,
            mensaje_informacion TEXT,
            fecha_revision TIMESTAMPTZ,
            administrador_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            usuario_creado_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            refugio_creado_id BIGINT REFERENCES refugios(id) ON DELETE SET NULL,
            username_generado VARCHAR(50),
            fecha_aprobacion TIMESTAMPTZ,
            token_consulta VARCHAR(64) UNIQUE,
            creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizada_en TIMESTAMPTZ
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS solicitudes_refugio_documentos (
            id BIGSERIAL PRIMARY KEY,
            solicitud_id BIGINT NOT NULL REFERENCES solicitudes_refugio(id) ON DELETE CASCADE,
            categoria VARCHAR(40) NOT NULL,
            tipo VARCHAR(20) NOT NULL DEFAULT 'obligatorio',
            nombre_archivo VARCHAR(255),
            url TEXT NOT NULL,
            public_id VARCHAR(255),
            estado_verificacion VARCHAR(20) NOT NULL DEFAULT 'pendiente',
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS solicitudes_refugio_historial (
            id BIGSERIAL PRIMARY KEY,
            solicitud_id BIGINT NOT NULL REFERENCES solicitudes_refugio(id) ON DELETE CASCADE,
            accion VARCHAR(40) NOT NULL,
            descripcion TEXT,
            administrador_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS enlaces_creacion_password (
            id BIGSERIAL PRIMARY KEY,
            usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            token VARCHAR(64) NOT NULL UNIQUE,
            usado VARCHAR(20) NOT NULL DEFAULT 'activo',
            expira_en TIMESTAMPTZ NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_sol_refugio_estado ON solicitudes_refugio(estado)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_sol_refugio_rep_email ON solicitudes_refugio(representante_email)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_sol_refugio_doc_sol ON solicitudes_refugio_documentos(solicitud_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_sol_refugio_hist_sol ON solicitudes_refugio_historial(solicitud_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_enlaces_pass_user ON enlaces_creacion_password(usuario_id)"
    ))


def _crear_tablas_rbac_tienda(db):
    """Crea las tablas RBAC del modulo Tienda si no existen (Supabase/PostgreSQL)."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS tienda_permisos (
            id BIGSERIAL PRIMARY KEY,
            codigo VARCHAR(80) NOT NULL UNIQUE,
            nombre VARCHAR(120) NOT NULL,
            modulo VARCHAR(40) NOT NULL,
            descripcion TEXT,
            activo BOOLEAN NOT NULL DEFAULT TRUE
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS tienda_usuarios (
            id BIGSERIAL PRIMARY KEY,
            tienda_id BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
            usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            tipo VARCHAR(20) NOT NULL DEFAULT 'admin',
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            ultimo_acceso TIMESTAMPTZ,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS tienda_usuario_permisos (
            id BIGSERIAL PRIMARY KEY,
            tienda_usuario_id BIGINT NOT NULL REFERENCES tienda_usuarios(id) ON DELETE CASCADE,
            permiso_id BIGINT NOT NULL REFERENCES tienda_permisos(id) ON DELETE CASCADE,
            UNIQUE (tienda_usuario_id, permiso_id)
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tienda_usuarios_tienda ON tienda_usuarios(tienda_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tienda_usuarios_usuario ON tienda_usuarios(usuario_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tienda_permisos_modulo ON tienda_permisos(modulo)"
    ))
    # Un usuario solo puede pertenecer a una tienda (evita duplicados de membresia)
    db.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_tienda_usuarios_usuario ON tienda_usuarios(usuario_id)"
    ))
    db.commit()


def _crear_tablas_nuevas_tienda(db):
    """Crea las tablas nuevas del modulo Tienda (historial, donaciones, PQRS)
    si no existen (Supabase/PostgreSQL)."""
    from sqlalchemy import text

    # --- Historial de actividad ---
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS tienda_actividades (
            id BIGSERIAL PRIMARY KEY,
            tienda_id BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
            usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            usuario_nombre VARCHAR(200),
            rol_usuario VARCHAR(30),
            tipo_accion VARCHAR(60) NOT NULL,
            accion VARCHAR(200) NOT NULL,
            elemento_tipo VARCHAR(60),
            elemento VARCHAR(255),
            detalle TEXT,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tienda_act_tienda ON tienda_actividades(tienda_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tienda_act_tipo ON tienda_actividades(tipo_accion)"
    ))

    # --- Donaciones ---
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS donaciones (
            id BIGSERIAL PRIMARY KEY,
            tienda_id BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
            refugio_id BIGINT NOT NULL REFERENCES refugios(id) ON DELETE SET NULL,
            usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            usuario_nombre VARCHAR(200),
            rol_usuario VARCHAR(30),
            refugio_nombre VARCHAR(150),
            observacion TEXT,
            estado VARCHAR(20) NOT NULL DEFAULT 'completada',
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS donacion_items (
            id BIGSERIAL PRIMARY KEY,
            donacion_id BIGINT NOT NULL REFERENCES donaciones(id) ON DELETE CASCADE,
            producto_id BIGINT REFERENCES productos(id) ON DELETE SET NULL,
            nombre_producto VARCHAR(150) NOT NULL,
            cantidad INTEGER NOT NULL DEFAULT 1
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_donaciones_tienda ON donaciones(tienda_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_donacion_items_donacion ON donacion_items(donacion_id)"
    ))

    # --- PQRS de Tienda ---
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS tienda_pqrs (
            id BIGSERIAL PRIMARY KEY,
            tienda_id BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
            tienda_nombre VARCHAR(150),
            usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            tipo VARCHAR(20) NOT NULL DEFAULT 'peticion',
            asunto VARCHAR(200) NOT NULL,
            descripcion TEXT NOT NULL,
            estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS tienda_pqrs_mensajes (
            id BIGSERIAL PRIMARY KEY,
            pqrs_id BIGINT NOT NULL REFERENCES tienda_pqrs(id) ON DELETE CASCADE,
            usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            nombre_remitente VARCHAR(200),
            rol_remitente VARCHAR(20) NOT NULL DEFAULT 'tienda',
            mensaje TEXT NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS tienda_pqrs_adjuntos (
            id BIGSERIAL PRIMARY KEY,
            pqrs_id BIGINT NOT NULL REFERENCES tienda_pqrs(id) ON DELETE CASCADE,
            mensaje_id BIGINT REFERENCES tienda_pqrs_mensajes(id) ON DELETE CASCADE,
            nombre_archivo VARCHAR(255),
            url TEXT NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tienda_pqrs_tienda ON tienda_pqrs(tienda_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tienda_pqrs_msj_pqrs ON tienda_pqrs_mensajes(pqrs_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tienda_pqrs_adj_pqrs ON tienda_pqrs_adjuntos(pqrs_id)"
    ))
    db.commit()


def _backfill_super_admin_tiendas(db):
    """Garantiza que el representante de cada tienda existente tenga su registro
    de Super Administrador en tienda_usuarios (idempotente)."""
    from sqlalchemy import text
    try:
        db.execute(text("""
            INSERT INTO tienda_usuarios (tienda_id, usuario_id, tipo, activo)
            SELECT t.id, t.usuario_id, 'super_admin', TRUE
            FROM tiendas t
            WHERE t.usuario_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM tienda_usuarios tu
                  WHERE tu.tienda_id = t.id AND tu.usuario_id = t.usuario_id
              )
        """))
        db.commit()
        print("[migracion] Backfill de Super Administradores de tiendas aplicado.")
    except Exception as e:
        db.rollback()
        print(f"[migracion] No se pudo aplicar el backfill de Super Administradores: {e}")


app = FastAPI(title="Adoptify API", lifespan=lifespan)


# Maneja errores de base de datos (conexion caida, DNS no resuelve, timeout)
# devolviendo un JSON 503 limpio en lugar de un stack trace gigante en consola.
@app.exception_handler(SQLAlchemyError)
async def _db_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Error de base de datos en %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={
            "detail": (
                "La base de datos no esta disponible en este momento. "
                "Revisa tu conexion de red/DNS hacia Supabase e intentalo de nuevo."
            )
        },
    )


# CORS para permitir que el frontend de React se comunique con la API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins,
    allow_credentials=settings.allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (endpoints)
app.include_router(catalogos.router, prefix="/api/catalogos", tags=["Catalogos"])
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticacion"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administracion"])
app.include_router(mascotas.router, prefix="/api/mascotas", tags=["Mascotas"])
app.include_router(refugios.router, prefix="/api/refugios", tags=["Refugios"])
app.include_router(solicitudes.router, prefix="/api/solicitudes", tags=["Solicitudes"])
app.include_router(productos.router, prefix="/api/productos", tags=["Productos"])
app.include_router(notificaciones.router, prefix="/api/notificaciones", tags=["Notificaciones"])
app.include_router(pqrs.router, prefix="/api/pqrs", tags=["PQRS"])
app.include_router(reportes.router, prefix="/api/reportes", tags=["Reportes"])
app.include_router(publico.router, prefix="/api/publico", tags=["Publico"])
app.include_router(configuraciones.router, prefix="/api/configuraciones", tags=["Configuraciones"])
app.include_router(favoritos.router, prefix="/api/favoritos", tags=["Favoritos"])
app.include_router(foro.router, prefix="/api/foro", tags=["Foro"])
app.include_router(tienda.router, prefix="/api/tienda", tags=["Tienda (self-service)"])
app.include_router(pedidos.router, prefix="/api/pedidos", tags=["Pedidos"])
app.include_router(
    solicitudes_refugio.router,
    prefix="/api/solicitudes-refugio",
    tags=["Solicitudes de Refugio (público)"],
)
app.include_router(
    solicitudes_refugio_admin.router,
    prefix="/api/admin",
    tags=["Administracion - Refugios y Solicitudes"],
)


@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Adoptify"}
