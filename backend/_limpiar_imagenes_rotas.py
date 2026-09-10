"""Detecta (y opcionalmente elimina) imágenes ROTAS de la BD configurada.

Recorre la galería de los refugios (tabla refugio_imagenes) y sus logos, hace
una petición HTTP a cada URL y reporta las que devuelven 404 (asset eliminado de
Cloudinary). Por defecto es SOLO LECTURA (dry-run).

Uso (desde backend/):
    python _limpiar_imagenes_rotas.py                 # reporta todas las rotas
    python _limpiar_imagenes_rotas.py --refugio 6     # solo un refugio
    python _limpiar_imagenes_rotas.py --apply         # elimina las filas rotas
    python _limpiar_imagenes_rotas.py --refugio 6 --apply

IMPORTANTE: --apply MODIFICA la base de datos configurada en .env (en este
proyecto, Supabase). Sin --apply no se cambia nada.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx
from sqlalchemy import text

from app.db.database import SessionLocal


def _existe(url: str) -> bool | None:
    """Devuelve True/False según la URL; None si no se pudo determinar."""
    if not url:
        return None
    try:
        resp = httpx.head(url, timeout=20.0, follow_redirects=True)
        if resp.status_code in (403, 405):  # HEAD no permitido -> GET
            resp = httpx.get(url, timeout=20.0, follow_redirects=True)
        return resp.status_code < 400
    except Exception:  # noqa: BLE001
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refugio", type=int, default=None, help="Limitar a un refugio_id")
    ap.add_argument("--apply", action="store_true", help="Eliminar las filas rotas")
    args = ap.parse_args()

    with SessionLocal() as db:
        where = "AND refugio_id = :rid" if args.refugio else ""
        params = {"rid": args.refugio} if args.refugio else {}
        filas = db.execute(
            text(f"SELECT id, refugio_id, url FROM refugio_imagenes WHERE 1=1 {where} ORDER BY refugio_id, orden"),
            params,
        ).fetchall()

        print(f"Revisando {len(filas)} imágenes de galería...")
        rotas = []
        for f in filas:
            url = f._mapping["url"]
            ok = _existe(url)
            if ok is False:
                rotas.append((f._mapping["id"], f._mapping["refugio_id"], url))
                print(f"  ROTA  id={f._mapping['id']} refugio={f._mapping['refugio_id']} {url}")

        # Logos de refugios
        logos = db.execute(
            text(
                "SELECT id, logo_url FROM refugios WHERE logo_url IS NOT NULL AND logo_url <> ''"
                + (" AND id = :rid" if args.refugio else "")
            ),
            params,
        ).fetchall()
        logos_rotos = []
        for l in logos:
            if _existe(l._mapping["logo_url"]) is False:
                logos_rotos.append(l._mapping["id"])
                print(f"  LOGO ROTO refugio={l._mapping['id']} {l._mapping['logo_url']}")

        print(f"\nResumen: {len(rotas)} imágenes de galería rotas, {len(logos_rotos)} logos rotos.")

        if args.apply:
            for rid, _ref, _url in rotas:
                db.execute(text("DELETE FROM refugio_imagenes WHERE id = :id"), {"id": rid})
            for rid in logos_rotos:
                db.execute(text("UPDATE refugios SET logo_url = NULL WHERE id = :id"), {"id": rid})
            db.commit()
            print("APLICADO: se eliminaron las filas rotas y se limpiaron los logos.")
        elif rotas or logos_rotos:
            print("Modo dry-run: vuelve a ejecutar con --apply para limpiarlas.")


if __name__ == "__main__":
    main()
