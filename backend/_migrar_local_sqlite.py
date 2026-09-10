"""Sincroniza el esquema de la BD local (SQLite adoptify.db) con los modelos actuales.

Añade las TABLAS y COLUMNAS que faltan (conservando los datos existentes) y hace
backfill de valores por defecto (activo=1, rating=0, uuid generado, etc.).

Motivo: la BD local se quedó desactualizada frente a las migraciones recientes
(soft delete -> activo/eliminado_en, uuid públicos, galerías de tienda/refugio,
reseñas de tienda, etc.) y por eso vistas como "Ver perfil de la tienda" daban
error 500 en local (enmascarado como "Tienda no encontrada").

Idempotente: es seguro ejecutarlo varias veces. Ejecutar desde backend/:
    python _migrar_local_sqlite.py
"""
import sqlite3
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.dialects import sqlite as sqlite_dialect  # noqa: E402
from sqlalchemy.schema import CreateColumn, CreateTable  # noqa: E402

from app.db.database import Base  # noqa: E402
# Importa todos los modelos para registrar las tablas en Base.metadata.
import app.models.catalogos  # noqa: F401,E402
import app.models.donacion  # noqa: F401,E402
import app.models.donacion_usuario  # noqa: F401,E402
import app.models.foro  # noqa: F401,E402
import app.models.ia  # noqa: F401,E402
import app.models.interaccion  # noqa: F401,E402
import app.models.kardex  # noqa: F401,E402
import app.models.mascota  # noqa: F401,E402
import app.models.pago  # noqa: F401,E402
import app.models.pedido  # noqa: F401,E402
import app.models.producto  # noqa: F401,E402
import app.models.refugio  # noqa: F401,E402
import app.models.solicitud  # noqa: F401,E402
import app.models.solicitud_refugio  # noqa: F401,E402
import app.models.solicitud_tienda  # noqa: F401,E402
import app.models.tienda  # noqa: F401,E402
import app.models.usuario  # noqa: F401,E402
import app.models.verificacion  # noqa: F401,E402
import app.models.soporte  # noqa: F401,E402

DB_PATH = "adoptify.db"
DIALECT = sqlite_dialect.dialect()


def _cols_local(cur, tabla):
    try:
        return {r[1] for r in cur.execute(f"PRAGMA table_info('{tabla}')")}
    except sqlite3.Error:
        return set()


def main():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    con.execute("PRAGMA foreign_keys=OFF")

    tablas_local = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}

    creadas = 0
    # 1) Crear tablas faltantes (vacías -> NOT NULL sin problema).
    for tabla, table in Base.metadata.tables.items():
        if tabla in tablas_local:
            continue
        ddl = str(CreateTable(table).compile(dialect=DIALECT))
        try:
            con.execute(ddl)
            creadas += 1
            print(f"  + Tabla creada: {tabla}")
        except sqlite3.Error as exc:
            print(f"  ! Error creando {tabla}: {exc}")

    # 2) Añadir columnas faltantes en tablas existentes.
    alteradas = 0
    for tabla, table in Base.metadata.tables.items():
        if tabla not in tablas_local:
            continue
        cols_local = _cols_local(cur, tabla)
        for col in table.columns:
            name = col.key
            if name in cols_local:
                continue
            # Compila el DDL de la columna y elimina NOT NULL para poder añadirla
            # con filas existentes (SQLite no permite NOT NULL sin DEFAULT en ADD).
            ddl = str(CreateColumn(col).compile(dialect=DIALECT))
            ddl = ddl.replace(" NOT NULL", "").replace("NOT NULL ", "")
            stmt = f"ALTER TABLE {tabla} ADD COLUMN {ddl}"
            try:
                con.execute(stmt)
                alteradas += 1
                print(f"  ~ {tabla}.{name} añadida")
            except sqlite3.Error as exc:
                print(f"  ! Error añadiendo {tabla}.{name}: {exc}")
    con.commit()

    # 3) Backfill de valores por defecto en las columnas recién añadidas (y otras).
    def tiene(t, c):
        return c in _cols_local(cur, t)

    # activo = 1 (Boolean almacenado 0/1 en SQLite).
    for t in ["tiendas", "refugios", "productos", "mascotas", "foro_posts", "foro_comentarios", "usuarios"]:
        if tiene(t, "activo"):
            try:
                con.execute(f"UPDATE {t} SET activo=1 WHERE activo IS NULL")
            except sqlite3.Error as exc:
                print(f"  ! backfill activo {t}: {exc}")
    # eliminado_en = NULL (default) no requiere backfill.

    # rating = 0
    for t in ["refugios", "tiendas"]:
        if tiene(t, "rating"):
            try:
                con.execute(f"UPDATE {t} SET rating=0 WHERE rating IS NULL")
            except sqlite3.Error as exc:
                print(f"  ! backfill rating {t}: {exc}")

    # descuento = 0
    if tiene("productos", "descuento"):
        con.execute("UPDATE productos SET descuento=0 WHERE descuento IS NULL")

    # uuid = generar para las tablas que ya tengan columna uuid.
    for t in ["productos", "mascotas", "refugios"]:
        if tiene(t, "uuid"):
            filas = cur.execute(f"SELECT id, uuid FROM {t} WHERE uuid IS NULL OR uuid=''").fetchall()
            for fid, _fu in filas:
                con.execute(f"UPDATE {t} SET uuid=? WHERE id=?", (uuid.uuid4().hex, fid))
            if filas:
                print(f"  # uuid generado para {len(filas)} filas de {t}")

    # usuarios: intentos_fallidos=0
    if tiene("usuarios", "intentos_fallidos"):
        con.execute("UPDATE usuarios SET intentos_fallidos=0 WHERE intentos_fallidos IS NULL")

    con.commit()
    con.close()
    print("\nMigración local completada:", creadas, "tablas creadas,", alteradas, "columnas añadidas.")


if __name__ == "__main__":
    main()
