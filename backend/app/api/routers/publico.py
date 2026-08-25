"""Endpoints publicos (sin autenticacion) para la landing page y vistas abiertas."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.lookups import id_por_codigo
from app.core.disponibilidad import mascota_de_refugio_visible, refugio_visible
from app.models.mascota import Mascota
from app.models.refugio import Refugio
from app.models.tienda import Tienda
from app.models.producto import Producto
from app.models.usuario import Usuario
from app.models.solicitud import SolicitudAdopcion
from app.models.catalogos import EstadoMascota, EstadoSolicitud
from app.schemas.serializers import serialize_producto

router = APIRouter()


@router.get("/estadisticas")
def estadisticas_publicas(db: Session = Depends(get_db)):
    """Conteos globales reales para la landing page (Home)."""
    disponible_id = id_por_codigo(db, EstadoMascota, "disponible")
    finalizada_id = id_por_codigo(db, EstadoSolicitud, "finalizada")

    mascotas_disponibles = (
        db.query(Mascota).filter(
            Mascota.estado_id == disponible_id,
            Mascota.activo == True,  # noqa: E712
            # Solo mascotas de refugios activos (los inactivos ocultan las suyas).
            mascota_de_refugio_visible(),
        ).count()
        if disponible_id else 0
    )
    adopciones_exitosas = (
        db.query(SolicitudAdopcion).filter(SolicitudAdopcion.estado_id == finalizada_id).count()
        if finalizada_id else 0
    )

    return {
        "mascotas_disponibles": mascotas_disponibles,
        "mascotas_total": (
            db.query(Mascota)
            .filter(
                Mascota.activo == True,  # noqa: E712
                mascota_de_refugio_visible(),
            ).count()
        ),
        "refugios": db.query(Refugio).filter(refugio_visible()).count(),
        "adopciones_exitosas": adopciones_exitosas,
        "usuarios": db.query(Usuario).filter(Usuario.activo == True).count(),  # noqa: E712
    }


@router.get("/tiendas/{tienda_id}")
def tienda_publica(tienda_id: int, db: Session = Depends(get_db)):
    """Perfil público de una Tienda Aliada: datos, galería de imágenes
    (Fachada, instalaciones, productos) y catálogo de productos reales."""
    tienda = (
        db.query(Tienda)
        .filter(Tienda.id == tienda_id, Tienda.activo == True)  # noqa: E712
        .first()
    )
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    productos = (
        db.query(Producto)
        .filter(Producto.tienda_id == tienda.id, Producto.activo == True)  # noqa: E712
        .order_by(Producto.nombre.asc())
        .all()
    )

    return {
        "id": tienda.id,
        "nombre": tienda.nombre,
        "slug": tienda.slug,
        "descripcion": tienda.descripcion,
        "ubicacion": tienda.ciudad or tienda.ubicacion or "",
        "direccion": tienda.direccion or "",
        "logo_url": tienda.logo_url,
        "telefono": tienda.telefono,
        "email": tienda.email,
        "website": tienda.website,
        "facebook": tienda.facebook,
        "instagram": tienda.instagram,
        "horario_semana": tienda.horario_semana,
        "horario_fin_semana": tienda.horario_fin_semana,
        "rating": float(tienda.rating) if tienda.rating is not None else 0,
        "imagenes": [
            {
                "id": img.id,
                "url": img.url,
                "categoria": img.categoria,
                "es_portada": img.es_portada,
                "orden": img.orden,
            }
            for img in (tienda.imagenes or [])
        ],
        "productos": [serialize_producto(p) for p in productos],
    }
