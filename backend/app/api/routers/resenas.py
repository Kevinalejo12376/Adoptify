# pyrefly: ignore [missing-import]
"""Reseñas/valoraciones de REFUGIOS y TIENDAS ALIADAS.

Estas reseñas son distintas a las de PRODUCTOS (que viven en /api/productos).
Aquí un usuario valora la entidad completa (refugio o tienda): UNA reseña por
usuario y entidad (si ya valoró, se actualiza -upsert-).

Endpoints:
- GET    /api/refugios/{refugio_id}/resenas   (público)
- POST   /api/refugios/{refugio_id}/resenas   (autenticado)
- DELETE /api/refugios/{refugio_id}/resenas   (autenticado, la propia)
- GET    /api/tiendas/{tienda_id}/resenas     (público)
- POST   /api/tiendas/{tienda_id}/resenas     (autenticado)
- DELETE /api/tiendas/{tienda_id}/resenas     (autenticado, la propia)

El promedio se guarda en `refugios.rating` / `tiendas.rating` para mostrarlo
en los listados y perfiles públicos.
"""
import logging
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from typing import List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.disponibilidad import refugio_visible
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.refugio import Refugio
from app.models.tienda import Tienda
from app.models.interaccion import ResenaRefugio, ResenaTienda
from app.schemas.resena import ResenaCreate, ResenaOut

router = APIRouter()

logger = logging.getLogger("resenas")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _resena_refugio_a_dict(r: ResenaRefugio) -> dict:
    u = r.usuario
    nombre = f"{u.nombre} {u.apellido or ''}".strip() if u else "Usuario"
    return {
        "id": r.id,
        "refugio_id": r.refugio_id,
        "tienda_id": None,
        "usuario_id": r.usuario_id,
        "usuario_nombre": nombre or "Usuario",
        "calificacion": r.calificacion,
        "comentario": r.comentario,
        "creada_en": r.creada_en.isoformat() if r.creada_en else None,
        "editada_en": r.editada_en.isoformat() if r.editada_en else None,
    }


def _resena_tienda_a_dict(r: ResenaTienda) -> dict:
    u = r.usuario
    nombre = f"{u.nombre} {u.apellido or ''}".strip() if u else "Usuario"
    return {
        "id": r.id,
        "refugio_id": None,
        "tienda_id": r.tienda_id,
        "usuario_id": r.usuario_id,
        "usuario_nombre": nombre or "Usuario",
        "calificacion": r.calificacion,
        "comentario": r.comentario,
        "creada_en": r.creada_en.isoformat() if r.creada_en else None,
        "editada_en": r.editada_en.isoformat() if r.editada_en else None,
    }


def _recalcular_rating_refugio(db: Session, refugio_id: int) -> float:
    """Re calcula el rating promedio de un refugio y lo persiste."""
    califs = [
        r.calificacion
        for r in db.query(ResenaRefugio).filter(ResenaRefugio.refugio_id == refugio_id).all()
    ]
    promedio = round(sum(califs) / len(califs), 1) if califs else 0
    refugio = db.query(Refugio).filter(Refugio.id == refugio_id).first()
    if refugio:
        refugio.rating = promedio
    return promedio


def _recalcular_rating_tienda(db: Session, tienda_id: int) -> float:
    califs = [
        r.calificacion
        for r in db.query(ResenaTienda).filter(ResenaTienda.tienda_id == tienda_id).all()
    ]
    promedio = round(sum(califs) / len(califs), 1) if califs else 0
    tienda = db.query(Tienda).filter(Tienda.id == tienda_id).first()
    if tienda:
        tienda.rating = promedio
    return promedio


def _validar_calificacion(payload: ResenaCreate) -> None:
    if payload.calificacion < 1 or payload.calificacion > 5:
        raise HTTPException(status_code=400, detail="La calificación debe estar entre 1 y 5")
    if payload.comentario and len(payload.comentario) > 1000:
        raise HTTPException(status_code=400, detail="El comentario no puede superar los 1000 caracteres")


# ===========================================================================
# REFUGIOS
# ===========================================================================
@router.get("/refugios/{refugio_id}/resenas", response_model=List[ResenaOut])
def listar_resenas_refugio(refugio_id: int, db: Session = Depends(get_db)):
    """Lista pública de reseñas de un refugio."""
    refugio = (
        db.query(Refugio)
        .filter(Refugio.id == refugio_id, refugio_visible())
        .first()
    )
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")
    filas = (
        db.query(ResenaRefugio)
        .filter(ResenaRefugio.refugio_id == refugio_id)
        .order_by(ResenaRefugio.creada_en.desc())
        .all()
    )
    return [_resena_refugio_a_dict(r) for r in filas]


@router.post("/refugios/{refugio_id}/resenas", status_code=status.HTTP_201_CREATED, response_model=ResenaOut)
def crear_resena_refugio(
    refugio_id: int,
    payload: ResenaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea o actualiza la reseña del usuario para el refugio (una por usuario)."""
    refugio = (
        db.query(Refugio)
        .filter(Refugio.id == refugio_id, refugio_visible())
        .first()
    )
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")
    _validar_calificacion(payload)

    resena = (
        db.query(ResenaRefugio)
        .filter(ResenaRefugio.refugio_id == refugio_id, ResenaRefugio.usuario_id == current_user.id)
        .first()
    )
    if resena:
        resena.calificacion = payload.calificacion
        resena.comentario = payload.comentario
        resena.editada_en = datetime.now(timezone.utc)
    else:
        resena = ResenaRefugio(
            refugio_id=refugio_id,
            usuario_id=current_user.id,
            calificacion=payload.calificacion,
            comentario=payload.comentario,
        )
        db.add(resena)
    db.flush()
    _recalcular_rating_refugio(db, refugio_id)
    db.commit()
    db.refresh(resena)
    return _resena_refugio_a_dict(resena)


@router.delete("/refugios/{refugio_id}/resenas", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_resena_refugio(
    refugio_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elimina la reseña propia del usuario para el refugio."""
    resena = (
        db.query(ResenaRefugio)
        .filter(ResenaRefugio.refugio_id == refugio_id, ResenaRefugio.usuario_id == current_user.id)
        .first()
    )
    if not resena:
        raise HTTPException(status_code=404, detail="No tienes una reseña en este refugio")
    db.delete(resena)
    db.flush()
    _recalcular_rating_refugio(db, refugio_id)
    db.commit()


# ===========================================================================
# TIENDAS ALIADAS
# ===========================================================================
@router.get("/tiendas/{tienda_id}/resenas", response_model=List[ResenaOut])
def listar_resenas_tienda(tienda_id: int, db: Session = Depends(get_db)):
    """Lista pública de reseñas de una tienda aliada."""
    tienda = (
        db.query(Tienda)
        .filter(Tienda.id == tienda_id, Tienda.activo == True)  # noqa: E712
        .first()
    )
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    filas = (
        db.query(ResenaTienda)
        .filter(ResenaTienda.tienda_id == tienda_id)
        .order_by(ResenaTienda.creada_en.desc())
        .all()
    )
    return [_resena_tienda_a_dict(r) for r in filas]


@router.post("/tiendas/{tienda_id}/resenas", status_code=status.HTTP_201_CREATED, response_model=ResenaOut)
def crear_resena_tienda(
    tienda_id: int,
    payload: ResenaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea o actualiza la reseña del usuario para la tienda (una por usuario)."""
    tienda = (
        db.query(Tienda)
        .filter(Tienda.id == tienda_id, Tienda.activo == True)  # noqa: E712
        .first()
    )
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    _validar_calificacion(payload)

    resena = (
        db.query(ResenaTienda)
        .filter(ResenaTienda.tienda_id == tienda_id, ResenaTienda.usuario_id == current_user.id)
        .first()
    )
    if resena:
        resena.calificacion = payload.calificacion
        resena.comentario = payload.comentario
        resena.editada_en = datetime.now(timezone.utc)
    else:
        resena = ResenaTienda(
            tienda_id=tienda_id,
            usuario_id=current_user.id,
            calificacion=payload.calificacion,
            comentario=payload.comentario,
        )
        db.add(resena)
    db.flush()
    _recalcular_rating_tienda(db, tienda_id)
    db.commit()
    db.refresh(resena)
    return _resena_tienda_a_dict(resena)


@router.delete("/tiendas/{tienda_id}/resenas", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_resena_tienda(
    tienda_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elimina la reseña propia del usuario para la tienda."""
    resena = (
        db.query(ResenaTienda)
        .filter(ResenaTienda.tienda_id == tienda_id, ResenaTienda.usuario_id == current_user.id)
        .first()
    )
    if not resena:
        raise HTTPException(status_code=404, detail="No tienes una reseña en esta tienda")
    db.delete(resena)
    db.flush()
    _recalcular_rating_tienda(db, tienda_id)
    db.commit()
