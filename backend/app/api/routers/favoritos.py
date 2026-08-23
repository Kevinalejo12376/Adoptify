"""Favoritos del usuario autenticado (mascotas y productos)."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from typing import List

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.mascota import Mascota
from app.models.producto import Producto
from app.models.interaccion import FavoritoMascota, FavoritoProducto
from app.schemas.serializers import serialize_mascota, serialize_producto
from app.core.disponibilidad import mascota_de_refugio_visible

router = APIRouter()


# ===================== MASCOTAS =====================
@router.get("/mascotas")
def listar_mascotas_fav(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(FavoritoMascota).filter(FavoritoMascota.usuario_id == current_user.id).all()
    ids = [f.mascota_id for f in favs]
    if not ids:
        return []
    mascotas = db.query(Mascota).filter(
        Mascota.id.in_(ids),
        Mascota.activo == True,  # noqa: E712
        # Solo mascotas de refugios activos (los inactivos ocultan las suyas).
        mascota_de_refugio_visible(),
    ).all()
    return [serialize_mascota(m) for m in mascotas]


@router.get("/mascotas/ids", response_model=List[int])
def ids_mascotas_fav(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    return [f.mascota_id for f in db.query(FavoritoMascota).filter(FavoritoMascota.usuario_id == current_user.id).all()]


@router.post("/mascotas/{mascota_id}", status_code=status.HTTP_201_CREATED)
def agregar_mascota_fav(mascota_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    existe = db.query(FavoritoMascota).filter(
        FavoritoMascota.usuario_id == current_user.id, FavoritoMascota.mascota_id == mascota_id
    ).first()
    if not existe:
        db.add(FavoritoMascota(usuario_id=current_user.id, mascota_id=mascota_id))
        db.commit()
    return {"ok": True}


@router.delete("/mascotas/{mascota_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_mascota_fav(mascota_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(FavoritoMascota).filter(
        FavoritoMascota.usuario_id == current_user.id, FavoritoMascota.mascota_id == mascota_id
    ).delete()
    db.commit()
    return None


# ===================== PRODUCTOS =====================
@router.get("/productos")
def listar_productos_fav(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(FavoritoProducto).filter(FavoritoProducto.usuario_id == current_user.id).all()
    ids = [f.producto_id for f in favs]
    if not ids:
        return []
    productos = db.query(Producto).filter(
        Producto.id.in_(ids), Producto.activo == True  # noqa: E712
    ).all()
    return [serialize_producto(p) for p in productos]


@router.post("/productos/{producto_id}", status_code=status.HTTP_201_CREATED)
def agregar_producto_fav(producto_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    existe = db.query(FavoritoProducto).filter(
        FavoritoProducto.usuario_id == current_user.id, FavoritoProducto.producto_id == producto_id
    ).first()
    if not existe:
        db.add(FavoritoProducto(usuario_id=current_user.id, producto_id=producto_id))
        db.commit()
    return {"ok": True}


@router.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_producto_fav(producto_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(FavoritoProducto).filter(
        FavoritoProducto.usuario_id == current_user.id, FavoritoProducto.producto_id == producto_id
    ).delete()
    db.commit()
    return None
