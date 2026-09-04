"""Endpoints de catalogos (tablas de referencia). El frontend los usa para
poblar selects: tipos de documento, estados, categorias, etc."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.exc import ProgrammingError
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from typing import List, Optional

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


@router.get("/razas-mascota", response_model=List[CatalogoItem])
def razas_mascota(db: Session = Depends(get_db), tipo: Optional[str] = None):
    """Razas de mascotas. Si se envía `tipo` (codigo: perro|gato), filtra con
    un JOIN sobre tipos_mascota para devolver solo las razas de ese tipo.

    Si la columna tipo_mascota_id aún no existe (migración pendiente), se
    devuelven todas las razas como respaldo para no romper el selector."""
    try:
        query = db.query(cat.RazaMascota)
        if tipo:
            query = (
                query
                .join(cat.TipoMascota, cat.RazaMascota.tipo_mascota_id == cat.TipoMascota.id)
                .filter(cat.TipoMascota.codigo == tipo)
            )
        return query.order_by(cat.RazaMascota.nombre.asc()).all()
    except ProgrammingError:
        db.rollback()
        return _listar(db, cat.RazaMascota)


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


@router.get("/departamentos", response_model=List[CatalogoItem])
def departamentos(db: Session = Depends(get_db)):
    """Departamentos de Colombia para selects del perfil del usuario."""
    return db.query(cat.Departamento).order_by(cat.Departamento.nombre.asc()).all()


@router.get("/municipios", response_model=List[CatalogoItem])
def municipios(db: Session = Depends(get_db), departamento_id: Optional[int] = None):
    """Municipios de Colombia. Si se envía `departamento_id`, filtra solo los
    de ese departamento."""
    query = db.query(cat.Municipio)
    if departamento_id:
        query = query.filter(cat.Municipio.departamento_id == departamento_id)
    return query.order_by(cat.Municipio.nombre.asc()).all()
