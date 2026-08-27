# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Query
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import or_
# pyrefly: ignore [missing-import]
from typing import Optional, List

from datetime import datetime, timezone

from app.db.database import get_db
from app.core.security import get_current_user, get_refugio_de_usuario, require_permiso_refugio
from app.core.lookups import id_por_codigo
from app.models.usuario import Usuario
from app.models.refugio import Refugio
from app.models.tienda import Tienda
from app.models.producto import Producto
from app.models.interaccion import Resena
from app.models.catalogos import CategoriaProducto
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse, ResenaCreate
from app.schemas.serializers import serialize_producto
from app.core.softdelete import soft_delete

router = APIRouter()


def _recalcular_rating(producto_id: int, db: Session) -> float:
    """Recalcula el rating del producto como promedio de sus reseñas."""
    califs = [r.calificacion for r in db.query(Resena).filter(Resena.producto_id == producto_id).all()]
    promedio = round(sum(califs) / len(califs), 1) if califs else 0
    prod = db.query(Producto).filter(Producto.id == producto_id).first()
    if prod:
        prod.rating = promedio
    return promedio


def _serialize_resena(r: Resena) -> dict:
    u = r.usuario
    return {
        "id": r.id,
        "producto_id": r.producto_id,
        "usuario_id": r.usuario_id,
        "usuario_nombre": (f"{u.nombre} {u.apellido or ''}".strip() if u else "Usuario"),
        "calificacion": r.calificacion,
        "comentario": r.comentario,
        "creada_en": r.creada_en.isoformat() if r.creada_en else None,
        "editada_en": r.editada_en.isoformat() if r.editada_en else None,
    }


def _refugio_de(current_user: Usuario, db: Session) -> Refugio:
    refugio = get_refugio_de_usuario(db, current_user)
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")
    return refugio


@router.get("/", response_model=List[ProductoResponse])
def listar_productos(
    db: Session = Depends(get_db),
    categoria: Optional[str] = Query(None),
):
    # Solo productos activos (soft delete) y de tiendas/refugios activos.
    query = (
        db.query(Producto)
        .outerjoin(Tienda, Tienda.id == Producto.tienda_id)
        .outerjoin(Refugio, Refugio.id == Producto.refugio_id)
        .filter(Producto.activo == True)  # noqa: E712
        .filter(or_(Tienda.id.is_(None), Tienda.activo.is_(True)))
        .filter(or_(Refugio.id.is_(None), Refugio.activo.is_(True)))
    )
    if categoria and categoria != "all":
        cat_id = id_por_codigo(db, CategoriaProducto, categoria)
        if cat_id:
            query = query.filter(Producto.categoria_id == cat_id)
    productos = query.order_by(Producto.creado_en.desc()).all()
    return [serialize_producto(p) for p in productos]


@router.get("/mios", response_model=List[ProductoResponse])
def mis_productos(
    current_user: Usuario = Depends(require_permiso_refugio("marketplace")),
    db: Session = Depends(get_db),
):
    """Productos del refugio autenticado."""
    refugio = _refugio_de(current_user, db)
    productos = (
        db.query(Producto)
        .filter(Producto.refugio_id == refugio.id)
        .order_by(Producto.creado_en.desc())
        .all()
    )
    return [serialize_producto(p) for p in productos]


@router.get("/barcode/{barcode}")
async def buscar_por_barcode(
    barcode: str,
    db: Session = Depends(get_db),
):
    """
    Busca un producto por su código de barras.
    Endpoint público (no requiere autenticación).

    Flujo de búsqueda:
    1. Consulta OpenFoodFacts (API pública).
    2. Si no encuentra, consulta UPCitemDB.
    3. Unifica y normaliza la respuesta.

    Retorna un JSON con los datos del producto si fue encontrado,
    o con encontrado=False si no existe en ninguna base de datos.
    """
    from app.services.barcode_service import buscar_por_codigo_barras
    resultado = await buscar_por_codigo_barras(barcode)
    return resultado


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(
        Producto.id == producto_id, Producto.activo == True  # noqa: E712
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return serialize_producto(producto)


@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def crear_producto(
    payload: ProductoCreate,
    current_user: Usuario = Depends(require_permiso_refugio("marketplace")),
    db: Session = Depends(get_db),
):
    """Crea un producto asociado al refugio autenticado."""
    refugio = _refugio_de(current_user, db)
    producto = Producto(
        nombre=payload.nombre,
        categoria_id=id_por_codigo(db, CategoriaProducto, payload.categoria),
        precio=payload.precio,
        descuento=payload.descuento,
        descripcion=payload.descripcion,
        descripcion_larga=payload.descripcion_larga,
        calidad=payload.calidad,
        stock=payload.stock,
        marca=payload.marca,
        material=payload.material,
        tallas=payload.tallas,
        colores=payload.colores,
        refugio_id=refugio.id,
        tienda_id=None,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return serialize_producto(producto)


def _producto_del_refugio(producto_id: int, current_user: Usuario, db: Session) -> Producto:
    refugio = _refugio_de(current_user, db)
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if producto.refugio_id != refugio.id:
        raise HTTPException(status_code=403, detail="No puedes modificar este producto")
    return producto


@router.put("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: int,
    payload: ProductoUpdate,
    current_user: Usuario = Depends(require_permiso_refugio("marketplace")),
    db: Session = Depends(get_db),
):
    producto = _producto_del_refugio(producto_id, current_user, db)
    datos = payload.model_dump(exclude_unset=True)
    if "categoria" in datos:
        producto.categoria_id = id_por_codigo(db, CategoriaProducto, datos.pop("categoria"))
    for campo, valor in datos.items():
        setattr(producto, campo, valor)
    db.commit()
    db.refresh(producto)
    return serialize_producto(producto)


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    current_user: Usuario = Depends(require_permiso_refugio("marketplace")),
    db: Session = Depends(get_db),
):
    producto = _producto_del_refugio(producto_id, current_user, db)
    # Soft delete: desactiva el producto conservando reseñas, favoritos y kardex.
    soft_delete(db, producto)
    return None


# ============================================================
# RESEÑAS / VALORACIONES DE PRODUCTOS
# ============================================================
@router.get("/{producto_id}/resenas")
def listar_resenas(producto_id: int, db: Session = Depends(get_db)):
    """Lista publica de reseñas de un producto."""
    resenas = (
        db.query(Resena)
        .filter(Resena.producto_id == producto_id)
        .order_by(Resena.creada_en.desc())
        .all()
    )
    return [_serialize_resena(r) for r in resenas]


@router.post("/{producto_id}/resenas", status_code=status.HTTP_201_CREATED)
def crear_resena(
    producto_id: int,
    payload: ResenaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea o actualiza la reseña del usuario para el producto (una por usuario)."""
    if payload.calificacion < 1 or payload.calificacion > 5:
        raise HTTPException(status_code=400, detail="La calificación debe estar entre 1 y 5")
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    resena = (
        db.query(Resena)
        .filter(Resena.producto_id == producto_id, Resena.usuario_id == current_user.id)
        .first()
    )
    if resena:
        resena.calificacion = payload.calificacion
        resena.comentario = payload.comentario
        resena.editada_en = datetime.now(timezone.utc)
    else:
        resena = Resena(
            producto_id=producto_id,
            usuario_id=current_user.id,
            calificacion=payload.calificacion,
            comentario=payload.comentario,
        )
        db.add(resena)
    db.flush()
    _recalcular_rating(producto_id, db)
    db.commit()
    db.refresh(resena)
    return _serialize_resena(resena)


@router.put("/{producto_id}/resenas/{resena_id}")
def actualizar_resena(
    producto_id: int,
    resena_id: int,
    payload: ResenaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resena = db.query(Resena).filter(Resena.id == resena_id, Resena.producto_id == producto_id).first()
    if not resena:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")
    if resena.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes editar esta reseña")
    if payload.calificacion < 1 or payload.calificacion > 5:
        raise HTTPException(status_code=400, detail="La calificación debe estar entre 1 y 5")
    resena.calificacion = payload.calificacion
    resena.comentario = payload.comentario
    resena.editada_en = datetime.now(timezone.utc)
    db.flush()
    _recalcular_rating(producto_id, db)
    db.commit()
    db.refresh(resena)
    return _serialize_resena(resena)


@router.delete("/{producto_id}/resenas/{resena_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_resena(
    producto_id: int,
    resena_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resena = db.query(Resena).filter(Resena.id == resena_id, Resena.producto_id == producto_id).first()
    if not resena:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")
    es_admin = current_user.rol_codigo in ("administrador", "administrador_principal")
    if resena.usuario_id != current_user.id and not es_admin:
        raise HTTPException(status_code=403, detail="No puedes eliminar esta reseña")
    db.delete(resena)
    db.flush()
    _recalcular_rating(producto_id, db)
    db.commit()
    return None
