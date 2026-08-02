# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Configuracion de conexion segun el motor.
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    # SQLite necesita check_same_thread=False para usarse con FastAPI.
    connect_args = {"check_same_thread": False}
    engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
else:
    # PostgreSQL / Supabase (pooler):
    # - pool_pre_ping: valida la conexion antes de usarla (evita que una conexion
    #   caida por inactividad del pooler haga que la consulta se "quede cargando").
    # - pool_recycle: recicla conexiones cada 5 min para no reutilizar sockets muertos.
    # - connect_timeout: falla rapido si no puede conectar (en vez de colgarse).
    #   NOTA: este timeout NO cubre la fase de resolucion DNS; si tu DNS local
    #   es lento/inestable veras "could not translate host name" o quedara colgado.
    # - pool_timeout: si todas las conexiones del pool estan ocupadas, espera como
    #   maximo este tiempo antes de lanzar error (evita que la API se cuelgue).
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        pool_timeout=10,
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
