# pyrefly: ignore [missing-import]
import os
import re
from sqlalchemy import create_engine
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker, declarative_base
# pyrefly: ignore [missing-import]
from sqlalchemy.pool import NullPool
from app.core.config import settings

# Configuracion de conexion segun el motor.
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# ---------------------------------------------------------------------------
# Normalizacion de la URL hacia el pooler de Supabase.
# Supabase expone DOS poolers sobre el MISMO host (*.pooler.supabase.com):
#   :5432 -> Session Pooler. Mantiene cada conexion abierta de forma persistente
#            y esta limitado a ~15 conexiones por grupo de base de datos
#            (error EMAXCONNSESSION -> HTTP 503). Con varias instancias
#            serverless y cold-starts el cupo se agota con facilidad.
#   :6543 -> Transaction Pooler (pgBouncer). Libera la conexion al terminar cada
#            transaccion, por lo que el limite de slots NO aplica igual. Es la
#            configuracion correcta para SQLAlchemy + FastAPI + Vercel.
# Si el DATABASE_URL del entorno apunta a :5432 (muy comun al copiar la URL por
# error), se reencauza a :6543 aqui para evitar EMAXCONNSESSION.
# ---------------------------------------------------------------------------
_database_url = settings.DATABASE_URL
if (
    not _is_sqlite
    and "pooler.supabase.com" in _database_url
    and re.search(r":5432(?=/|\?)", _database_url)
):
    _database_url = re.sub(r":5432(?=/|\?)", ":6543", _database_url, count=1)
    print(
        "[db] DATABASE_URL apuntaba al Session Pooler (:5432); se reencauzo al "
        "Transaction Pooler (:6543) para evitar EMAXCONNSESSION."
    )

if _is_sqlite:
    # SQLite necesita check_same_thread=False para usarse con FastAPI.
    connect_args = {"check_same_thread": False}
    engine = create_engine(_database_url, connect_args=connect_args)
else:
    # PostgreSQL / Supabase.
    # ---------------------------------------------------------------
    # IMPORTANTE: el DATABASE_URL debe usar el POOLER TRANSACCIONAL (puerto 6543),
    # NO el pooler en modo sesion (puerto 5432). En modo sesion, cada conexion
    # inactiva del pool de SQLAlchemy ocupa de forma PERMANENTE uno de los 15
    # slots del pooler. Al sumarse los servicios internos de Supabase o varias
    # instancias del backend (local + Vercel), el cupo se agota y aparece:
    #   psycopg2.OperationalError ... EMAXCONNSESSION ... max clients are
    #   limited to pool_size: 15  -> HTTP 503.
    # En modo transaccional (6543) las conexiones se liberan al terminar cada
    # transaccion, por lo que un pool inactivo YA NO consume slots del pooler.
    # ---------------------------------------------------------------
    # - pool_pre_ping: valida la conexion antes de usarla (evita conexiones
    #   caidas por inactividad del pooler).
    # - pool_recycle: recicla conexiones cada 5 min para no reutilizar sockets
    #   muertos.
    # - connect_timeout: falla rapido si no puede conectar (en vez de colgarse).
    # - pool_timeout: si todas las conexiones del pool estan ocupadas, espera
    #   como maximo este tiempo antes de lanzar error (evita que la API se
    #   cuelgue).
    _en_serverless = (
        os.getenv("VERCEL") == "1"
        or os.getenv("DB_NULLPOOL", "").strip().lower() in ("1", "true", "yes")
    )
    if _en_serverless:
        # Serverless (Vercel): cada invocacion vive en un proceso aislado y
        # efimero. Un pool persistente dejaria conexiones inactivas abiertas
        # entre requests que agotan el pooler (EMAXCONNSESSION). Con NullPool se
        # abre 1 conexion por request y se cierra al terminar (seguro y simple).
        engine = create_engine(
            _database_url,
            poolclass=NullPool,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10},
        )
    else:
        # Proceso persistente (uvicorn local / contenedor): pool PEQUENO (2+2).
        # En modo transaccional las conexiones inactivas no ocupan slots del
        # pooler y 2+2 da margen para una unica instancia sin saturar el pooler
        # compartido (15 conexiones). Evita ejecutar varias instancias a la vez
        # contra el mismo proyecto (p. ej. local + Vercel al mismo tiempo).
        engine = create_engine(
            _database_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=2,
            max_overflow=2,
            pool_timeout=15,
            connect_args={"connect_timeout": 10},
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependencia para inyectar la sesion de la BD en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
