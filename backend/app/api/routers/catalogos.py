"""Endpoints de catalogos (tablas de referencia). El frontend los usa para
poblar selects: tipos de documento, estados, categorias, etc."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from typing import List

from app.db.database import get_db
from app.models import catalogos as cat
from app.schemas.catalogos import CatalogoItem

router = APIRouter()


def _listar(db: Session, Model):
    return db.query(Model).order_by(Model.id.asc()).all()


@router.get("/tipos-documento", response_model=List[CatalogoItem])
def tipos_documento(db: Session = Depends(get_db)):
    return _listar(db, cat.TipoDocumento)


@router.get("/roles", response_model=List[CatalogoItem])
def roles(db: Session = Depends(get_db)):
    return _listar(db, cat.Rol)


@router.get("/tipos-mascota", response_model=List[CatalogoItem])
def tipos_mascota(db: Session = Depends(get_db)):
    return _listar(db, cat.TipoMascota)


@router.get("/tamanos-mascota", response_model=List[CatalogoItem])
def tamanos_mascota(db: Session = Depends(get_db)):
    return _listar(db, cat.TamanoMascota)


@router.get("/generos-mascota", response_model=List[CatalogoItem])
def generos_mascota(db: Session = Depends(get_db)):
    return _listar(db, cat.GeneroMascota)


@router.get("/estados-mascota", response_model=List[CatalogoItem])
def estados_mascota(db: Session = Depends(get_db)):
    return _listar(db, cat.EstadoMascota)


@router.get("/estados-solicitud", response_model=List[CatalogoItem])
def estados_solicitud(db: Session = Depends(get_db)):
    return _listar(db, cat.EstadoSolicitud)


@router.get("/estados-pedido", response_model=List[CatalogoItem])
def estados_pedido(db: Session = Depends(get_db)):
    return _listar(db, cat.EstadoPedido)


@router.get("/categorias-producto", response_model=List[CatalogoItem])
def categorias_producto(db: Session = Depends(get_db)):
    return _listar(db, cat.CategoriaProducto)


@router.get("/foro-categorias", response_model=List[CatalogoItem])
def foro_categorias(db: Session = Depends(get_db)):
    return _listar(db, cat.ForoCategoria)


@router.get("/tipos-post-foro", response_model=List[CatalogoItem])
def tipos_post_foro(db: Session = Depends(get_db)):
    return _listar(db, cat.TipoPostForo)


@router.get("/tipos-reaccion", response_model=List[CatalogoItem])
def tipos_reaccion(db: Session = Depends(get_db)):
    return _listar(db, cat.TipoReaccion)
