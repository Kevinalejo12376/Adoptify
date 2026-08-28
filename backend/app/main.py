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
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from app.core.config import settings
from app.db.database import Base, engine
# Importa todos los modelos para registrarlos en Base.metadata
from app import models  # noqa: F401
from app.db.seed import seed_catalogos
from app.api.routers import (
    auth, mascotas, refugios, solicitudes, productos, catalogos, admin,
    notificaciones, pqrs, reportes, publico, configuraciones, favoritos, foro,
    tienda, pedidos, pagos, solicitudes_refugio, solicitudes_refugio_admin,
    reportes_descarga, adopciones, solicitudes_tienda, solicitudes_tienda_admin, upload,
    ia,
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
        # No bloquea el arranque: en Supabase las tablas ya existen/verificadas.
        logger.warning(
            "[lifespan] La sincronización inicial de la base de datos reportó un problema. "
            "Esto NO indica que falten tablas o migraciones: el esquema se verifica al arrancar "
            "y, si la conexión a la base es correcta, las migraciones quedan aplicadas. "
            "El servidor arranca igual. Detalle: %s",
            exc,
        )
        logger.warning(
            "[lifespan] Si ves 'could not translate host name' o 'timeout expired', "
            "revisa tu conexion de red/DNS (VPN o firewall) hacia Supabase."
        )
    yield


def _run_migrations():
    """Ejecuta migraciones para sincronizar el schema de Supabase con los modelos.

    Cada grupo de migración se ejecuta de forma AISLADA: si uno falla (por
    permisos o porque el esquema ya está al día), se reporta un aviso y se
    continúa con los demás. Así no se "abortan en bloque" ni se confunde con
    migraciones faltantes. En SQLite local las tablas ya las crea
    ``Base.metadata.create_all`` (modelos), por lo que no se aplica SQL de Supabase.
    """
    if getattr(engine.dialect, "name", "") == "sqlite":
        print("[migracion] Base local SQLite: las tablas ya las crea Base.metadata.create_all. Se omiten migraciones SQL de Supabase.")
        return

    from app.db.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    resultados = []

    def _paso(nombre, fn):
        """Ejecuta una migración aislada. No aborta el resto si falla."""
        try:
            fn(db)
            resultados.append((nombre, True))
            print(f"[migracion] OK: {nombre}")
        except Exception as e:
            try:
                db.rollback()  # limpia una transacción fallida
            except Exception:
                pass
            resultados.append((nombre, False))
            print(f"[migracion] AVISO: '{nombre}' no se aplicó ({type(e).__name__}: {e}). Se continúa.")

    try:
        # --- Usuarios (perfil_completo, username) ---
        def _migrar_usuarios(db):
            existe = db.execute(text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name='usuarios' AND column_name='perfil_completo'"
            )).fetchone()
            if not existe:
                db.execute(text(
                    "ALTER TABLE usuarios ADD COLUMN perfil_completo BOOLEAN NOT NULL DEFAULT false"
                ))
                db.commit()
            _agregar_columna_si_no_existe(db, "usuarios", "username", "VARCHAR(50)")
            # Columna para eliminar la foto de perfil anterior de Cloudinary.
            _agregar_columna_si_no_existe(db, "usuarios", "avatar_public_id", "VARCHAR(255)")
            db.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username)"
            ))
            db.commit()
        _paso("usuarios (perfil_completo, username, avatar_public_id)", _migrar_usuarios)

        # --- Refugios (logo_url, tiktok, departamento, municipio) ---
        def _migrar_refugios(db):
            for col, tipo in [
                ("logo_url", "TEXT"),
                ("tiktok", "VARCHAR(120)"),
                ("departamento", "VARCHAR(150)"),
                ("municipio", "VARCHAR(150)"),
            ]:
                _agregar_columna_si_no_existe(db, "refugios", col, tipo)
            db.commit()
        _paso("refugios (logo_url, tiktok, departamento, municipio)", _migrar_refugios)

        _paso("foro_posts_imagenes", _crear_tabla_foro_imagenes)
        _paso("solicitudes_refugio (tablas)", _crear_tabla_solicitudes_refugio)
        _paso("solicitudes_tienda (tablas)", _crear_tabla_solicitudes_tienda)
        _paso("índices únicos de solicitudes", _indices_unicos_solicitudes)

        # --- Solicitudes de refugio (columnas) ---
        def _migrar_solicitudes_refugio_columnas(db):
            for col, tipo in [
                ("representante_apellido", "VARCHAR(100)"),
                ("departamento", "VARCHAR(150)"),
                ("municipio", "VARCHAR(150)"),
            ]:
                _agregar_columna_si_no_existe(db, "solicitudes_refugio", col, tipo)
            db.commit()
        _paso("solicitudes_refugio (columnas)", _migrar_solicitudes_refugio_columnas)

        _paso("movimientos_kardex", _crear_tabla_movimientos_kardex)
        _paso("razas_mascota (catálogo)", _crear_tabla_razas_mascota)
        _paso("mascota_imagenes", _crear_tabla_mascota_imagenes)
        _paso("RBAC tienda", _crear_tablas_rbac_tienda)
        _paso("backfill super admin tiendas", _backfill_super_admin_tiendas)
        _paso("tablas nuevas de tienda", _crear_tablas_nuevas_tienda)
        _paso("equipo de refugio", _crear_tablas_equipo_refugio)
        _paso("pagos (Stripe)", _crear_tabla_pagos)
        _paso("tiendas (Stripe Connect)", _migrar_stripe_connect_tiendas)

        # --- Resumen final ---
        ok = sum(1 for _, s in resultados if s)
        fallos = [n for n, s in resultados if not s]
        print(f"[migracion] Resumen: {ok}/{len(resultados)} migraciones aplicadas/verificadas.")
        if fallos:
            print(f"[migracion] Con aviso (no críticas): {', '.join(fallos)}")
        else:
            print("[migracion] Todas las migraciones aplicadas/verificadas correctamente.")
        # ---- Soft delete: columnas 'activo' y 'eliminado_en' ----
        _soft_delete_migrations(db)

        # ---- Soft delete: columnas 'activo' y 'eliminado_en' ----
        _soft_delete_migrations(db)

        print("[migracion] Migraciones del módulo de solicitudes de refugio aplicadas correctamente.")
        print("[migracion] Tabla 'movimientos_kardex' verificada correctamente.")
    except Exception as e:
        print(f"[migracion] Error general ejecutando migraciones: {e}")
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


def _soft_delete_migrations(db):
    """Agrega las columnas de borrado lógico (activo / eliminado_en) a las
    tablas principales si no existen (Supabase/PostgreSQL).

    En SQLite local las columnas ya las crea Base.metadata.create_all
    a partir de los modelos.
    """
    columnas_por_tabla = {
        "mascotas": [
            ("activo", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("eliminado_en", "TIMESTAMPTZ"),
        ],
        "refugios": [
            ("activo", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("eliminado_en", "TIMESTAMPTZ"),
        ],
        "tiendas": [
            ("activo", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("eliminado_en", "TIMESTAMPTZ"),
        ],
        "productos": [
            ("eliminado_en", "TIMESTAMPTZ"),
        ],
        "usuarios": [
            ("eliminado_en", "TIMESTAMPTZ"),
        ],
        "foro_posts": [
            ("activo", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("eliminado_en", "TIMESTAMPTZ"),
        ],
        "foro_comentarios": [
            ("activo", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("eliminado_en", "TIMESTAMPTZ"),
        ],
    }
    for tabla, columnas in columnas_por_tabla.items():
        for columna, tipo in columnas:
            _agregar_columna_si_no_existe(db, tabla, columna, tipo)
    db.commit()
    print("[migracion] Columnas de soft delete verificadas.")


def _crear_tabla_pagos(db):
    """Crea/actualiza la tabla 'pagos' para Stripe (idempotente, Supabase).

    - Si la tabla no existe, se crea con el esquema de Stripe.
    - Si ya existía con el esquema de dLocal, se agregan las columnas nuevas
      SIN borrar datos históricos: los registros previos quedan marcados con
      ``proveedor='dlocal'`` y los nuevos serán ``proveedor='stripe'``.
    - En SQLite local las tablas las crea Base.metadata.create_all.
    """
    from sqlalchemy import text
    db.execute(text("""
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
        )
    """))
    # Columnas que pudieron faltar si la tabla ya existía (migración dLocal).
    for col, tipo in [
        ("proveedor", "VARCHAR(20) NOT NULL DEFAULT 'stripe'"),
        ("estado_stripe", "VARCHAR(80)"),
        ("stripe_checkout_session_id", "VARCHAR(255)"),
        ("stripe_payment_intent_id", "VARCHAR(255)"),
        ("stripe_amount", "BIGINT"),
        ("stripe_currency", "VARCHAR(3)"),
        ("comision_plataforma", "BIGINT"),
        ("monto_distribuido", "BIGINT"),
        ("detalle_distribucion", "TEXT"),
        ("stripe_transfer_ids", "TEXT"),
        ("respuesta_stripe", "TEXT"),
    ]:
        _agregar_columna_si_no_existe(db, "pagos", col, tipo)
    # Marca los registros históricos de dLocal (la columna ya no existe en el
    # modelo, pero los datos previos se conservan identificados por proveedor).
    db.execute(text(
        "UPDATE pagos SET proveedor='dlocal' WHERE proveedor IS NULL OR proveedor=''"
    ))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_pagos_pedido ON pagos(pedido_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_pagos_order_id ON pagos(order_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_pagos_proveedor ON pagos(proveedor)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_pagos_session ON pagos(stripe_checkout_session_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_pagos_pi ON pagos(stripe_payment_intent_id)"))
    db.commit()
    print("[migracion] Tabla 'pagos' (Stripe) verificada.")


def _migrar_stripe_connect_tiendas(db):
    """Agrega las columnas de Stripe Connect a 'tiendas' si no existen."""
    from sqlalchemy import text
    for col, tipo in [
        ("stripe_account_id", "VARCHAR(255)"),
        ("stripe_account_status", "VARCHAR(30) NOT NULL DEFAULT 'no_configurada'"),
        ("stripe_connect_activa", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ]:
        _agregar_columna_si_no_existe(db, "tiendas", col, tipo)
    db.commit()
    print("[migracion] Columnas de Stripe Connect en 'tiendas' verificadas.")


def _crear_tabla_foro_imagenes(db):
    """Crea la tabla foro_posts_imagenes si no existe (Supabase)."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS foro_posts_imagenes (
            id BIGSERIAL PRIMARY KEY,
            post_id BIGINT NOT NULL REFERENCES foro_posts(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            public_id VARCHAR(255) NOT NULL,
            etiqueta VARCHAR(80),
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_foro_img_post ON foro_posts_imagenes(post_id)"
    ))
    print("[migracion] Tabla 'foro_posts_imagenes' verificada.")


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


def _crear_tabla_solicitudes_tienda(db):
    """Crea las tablas del módulo de solicitudes de Tiendas Aliadas si no existen (Supabase)."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS solicitudes_tienda (
            id BIGSERIAL PRIMARY KEY,
            nombre_tienda VARCHAR(150) NOT NULL,
            logo_url TEXT,
            descripcion TEXT,
            email_contacto VARCHAR(255),
            telefono VARCHAR(30),
            departamento VARCHAR(150),
            ciudad VARCHAR(150),
            municipio VARCHAR(150),
            direccion VARCHAR(200),
            website VARCHAR(150),
            horario_semana VARCHAR(120),
            horario_fin_semana VARCHAR(120),
            facebook VARCHAR(120),
            instagram VARCHAR(120),
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
            tienda_creado_id BIGINT REFERENCES tiendas(id) ON DELETE SET NULL,
            username_generado VARCHAR(50),
            fecha_aprobacion TIMESTAMPTZ,
            token_consulta VARCHAR(64) UNIQUE,
            creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizada_en TIMESTAMPTZ
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS solicitudes_tienda_documentos (
            id BIGSERIAL PRIMARY KEY,
            solicitud_id BIGINT NOT NULL REFERENCES solicitudes_tienda(id) ON DELETE CASCADE,
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
        CREATE TABLE IF NOT EXISTS solicitudes_tienda_historial (
            id BIGSERIAL PRIMARY KEY,
            solicitud_id BIGINT NOT NULL REFERENCES solicitudes_tienda(id) ON DELETE CASCADE,
            accion VARCHAR(40) NOT NULL,
            descripcion TEXT,
            administrador_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_sol_tienda_estado ON solicitudes_tienda(estado)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_sol_tienda_rep_email ON solicitudes_tienda(representante_email)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_sol_tienda_doc_sol ON solicitudes_tienda_documentos(solicitud_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_sol_tienda_hist_sol ON solicitudes_tienda_historial(solicitud_id)"
    ))
    db.commit()
    print("[migracion] Tablas de solicitudes de Tiendas Aliadas verificadas.")


def _indices_unicos_solicitudes(db):
    """Índices únicos parciales para impedir solicitudes duplicadas en estados activos.

    Impide, a nivel de base de datos, que existan dos solicitudes pendientes (o con
    información solicitada) para el mismo correo. Se ejecuta como best-effort: si ya
    existen duplicados previos en la BD, el índice no se crea (no bloquea el arranque)
    y la prevención queda cubierta por las validaciones de la API.
    """
    from sqlalchemy import text
    try:
        db.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_sol_tienda_email_activa "
            "ON solicitudes_tienda(representante_email) "
            "WHERE estado IN ('pendiente','informacion_solicitada')"
        ))
        db.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_sol_refugio_email_activa "
            "ON solicitudes_refugio(representante_email) "
            "WHERE estado IN ('pendiente','informacion_solicitada')"
        ))
        db.commit()
        print("[migracion] Indices unicos de solicitudes verificados.")
    except Exception as e:
        db.rollback()
        print(
            "[migracion] No se crearon indices unicos de solicitudes "
            f"(posibles duplicados previos): {e}"
        )


def _crear_tabla_movimientos_kardex(db):
    """Crea la tabla del Kardex de inventario si no existe (Supabase)."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS movimientos_kardex (
            id BIGSERIAL PRIMARY KEY,
            producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
            tienda_id BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
            tipo_movimiento VARCHAR(30) NOT NULL,
            concepto VARCHAR(255) NOT NULL DEFAULT '',
            cantidad INTEGER NOT NULL DEFAULT 0,
            -- Moneda: COP sin centavos -> entero (BIGINT).
            costo_unitario BIGINT NOT NULL DEFAULT 0,
            costo_total BIGINT NOT NULL DEFAULT 0,
            saldo_cantidad INTEGER NOT NULL DEFAULT 0,
            saldo_valor BIGINT NOT NULL DEFAULT 0,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_kardex_producto ON movimientos_kardex(producto_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_kardex_tienda ON movimientos_kardex(tienda_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_kardex_tipo ON movimientos_kardex(tipo_movimiento)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_kardex_fecha ON movimientos_kardex(creado_en)"))
    db.commit()


def _crear_tabla_razas_mascota(db):
    """Crea la tabla 'razas_mascota' si no existe y la puebla (idempotente).

    Solo se aplica en Supabase/PostgreSQL; en SQLite local la tabla la crea
    Base.metadata.create_all y la puebla seed_catalogos()."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS razas_mascota (
            id     BIGSERIAL PRIMARY KEY,
            codigo VARCHAR(60) NOT NULL UNIQUE,
            nombre VARCHAR(80) NOT NULL
        )
    """))
    db.execute(text("""
        INSERT INTO razas_mascota (codigo, nombre) VALUES
            ('labrador',      'Labrador Retriever'),
            ('pastor_aleman', 'Pastor Alemán'),
            ('golden',        'Golden Retriever'),
            ('bulldog',       'Bulldog'),
            ('poodle',        'Poodle'),
            ('chihuahua',     'Chihuahua'),
            ('beagle',        'Beagle'),
            ('rottweiler',    'Rottweiler'),
            ('criollo',       'Criollo'),
            ('pug',           'Pug'),
            ('shih_tzu',      'Shih Tzu'),
            ('doberman',      'Doberman'),
            ('boxer',         'Boxer'),
            ('cocker',        'Cocker Spaniel'),
            ('siberiano',     'Husky Siberiano'),
            ('schnauzer',     'Schnauzer'),
            ('maltes',        'Maltés'),
            ('yorkshire',     'Yorkshire Terrier'),
            ('persa',         'Persa'),
            ('siames',        'Siamés'),
            ('maine_coon',    'Maine Coon'),
            ('bengali',       'Bengalí'),
            ('sphynx',        'Sphynx'),
            ('angora',        'Angora'),
            ('ragdoll',       'Ragdoll'),
            ('britanico',     'British Shorthair'),
            ('comun_europeo', 'Común Europeo'),
            ('fold_escoces',  'Scottish Fold')
        ON CONFLICT (codigo) DO NOTHING
    """))
    db.commit()
    print("[migracion] Tabla 'razas_mascota' verificada y poblada.")


def _crear_tabla_mascota_imagenes(db):
    """Crea la tabla 'mascota_imagenes' si no existe (Supabase/PostgreSQL) y
    agrega la columna 'public_id' si la tabla ya existía sin ella.

    En SQLite local la tabla la crea Base.metadata.create_all (modelos)."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS mascota_imagenes (
            id          BIGSERIAL PRIMARY KEY,
            mascota_id  BIGINT NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
            url         TEXT NOT NULL,
            public_id   VARCHAR(255),
            orden       INT NOT NULL DEFAULT 0
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_mascota_img_mascota ON mascota_imagenes(mascota_id)"
    ))
    _agregar_columna_si_no_existe(db, "mascota_imagenes", "public_id", "VARCHAR(255)")
    db.commit()
    print("[migracion] Tabla 'mascota_imagenes' verificada.")


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


def _crear_tablas_equipo_refugio(db):
    """Crea las tablas del módulo Equipo de refugio si no existen (Supabase/PostgreSQL)."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS refugio_permisos (
            id BIGSERIAL PRIMARY KEY,
            codigo VARCHAR(80) NOT NULL UNIQUE,
            nombre VARCHAR(120) NOT NULL,
            modulo VARCHAR(40) NOT NULL,
            descripcion TEXT,
            activo BOOLEAN NOT NULL DEFAULT TRUE
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS refugio_empleados (
            id BIGSERIAL PRIMARY KEY,
            refugio_id BIGINT NOT NULL REFERENCES refugios(id) ON DELETE CASCADE,
            usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (refugio_id, usuario_id)
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS refugio_empleado_permisos (
            id BIGSERIAL PRIMARY KEY,
            refugio_empleado_id BIGINT NOT NULL REFERENCES refugio_empleados(id) ON DELETE CASCADE,
            permiso_id BIGINT NOT NULL REFERENCES refugio_permisos(id) ON DELETE CASCADE,
            UNIQUE (refugio_empleado_id, permiso_id)
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_refugio_empleados_refugio ON refugio_empleados(refugio_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_refugio_empleados_usuario ON refugio_empleados(usuario_id)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_refugio_permisos_modulo ON refugio_permisos(modulo)"
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


def _crear_tablas_ia(db):
    """Crea las tablas de IA / n8n (tareas_ia, chat_sesiones, chat_mensajes)
    si no existen (Supabase/PostgreSQL). En SQLite local las crea SQLAlchemy."""
    from sqlalchemy import text
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS tareas_ia (
            id BIGSERIAL PRIMARY KEY,
            tipo VARCHAR(60) NOT NULL,
            payload TEXT NOT NULL,
            estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
            resultado TEXT,
            error TEXT,
            intentos INTEGER NOT NULL DEFAULT 0,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            procesado_en TIMESTAMPTZ
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_tareas_ia_estado ON tareas_ia(estado)"
    ))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS chat_sesiones (
            id BIGSERIAL PRIMARY KEY,
            session_id VARCHAR(64) NOT NULL UNIQUE,
            usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS chat_mensajes (
            id BIGSERIAL PRIMARY KEY,
            sesion_id BIGINT NOT NULL REFERENCES chat_sesiones(id) ON DELETE CASCADE,
            rol VARCHAR(20) NOT NULL,
            contenido TEXT NOT NULL,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_chat_msj_sesion ON chat_mensajes(sesion_id)"
    ))
    db.commit()
    print("[migracion] Tablas de IA / n8n verificadas.")


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


# Maneja errores de base de datos devolviendo un JSON 503 limpio en lugar de un
# stack trace gigante en consola. Distingue entre errores de CONEXION
# (red/DNS/timeout) y errores de consulta/esquema para no dar mensajes
# enganosos: el mensaje de red solo aparece cuando realmente hubo un fallo de
# conectividad.
@app.exception_handler(SQLAlchemyError)
async def _db_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Error de base de datos en %s: %s", request.url.path, exc)

    if isinstance(exc, OperationalError):
        detail = (
            "No se pudo conectar con la base de datos en este momento. "
            "Revisa tu conexion de red/DNS hacia Supabase e intentalo de nuevo."
        )
    else:
        detail = (
            "Ocurrio un error al consultar la base de datos. "
            "Si el problema persiste, contacta al administrador del sistema."
        )

    return JSONResponse(status_code=503, content={"detail": detail})


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
app.include_router(pagos.router, prefix="/api/pagos", tags=["Pagos"])
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
app.include_router(
    solicitudes_tienda.router,
    prefix="/api/solicitudes-tienda",
    tags=["Solicitudes de Tienda Aliada (público)"],
)
app.include_router(
    solicitudes_tienda_admin.router,
    prefix="/api/admin",
    tags=["Administracion - Solicitudes de Tiendas Aliadas"],
)
app.include_router(upload.router, prefix="/api/upload", tags=["Subida de imágenes"])
app.include_router(
    reportes_descarga.router,
    prefix="/api/reportes-descarga",
    tags=["Reportes descargables (PDF/Excel)"],
)
app.include_router(
    adopciones.router,
    prefix="/api/adopciones",
    tags=["Adopciones"],
)
app.include_router(ia.router, prefix="/api/ia", tags=["IA / n8n"])


@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Adoptify"}
