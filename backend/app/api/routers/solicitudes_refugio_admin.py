# pyrefly: ignore [missing-import]
"""Endpoints de administración para el módulo de Refugios.

Dos familias:
  1. Refugios registrados (aprobados): listar con filtros, editar, suspender,
     eliminar y ver perfil.
  2. Solicitudes de refugios: listar, detalle (expediente), aprobar, rechazar,
     solicitar información y verificar documentos.

Solo usuarios con rol 'administrador' o 'administrador_principal'.
"""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
from sqlalchemy import func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from typing import Optional

from app.db.database import get_db
from app.core.security import get_current_admin
from app.core.notificaciones import registrar_auditoria
from app.core.softdelete import soft_delete_no_commit, liberar_slug, liberar_email
from app.models.usuario import Usuario
from app.models.refugio import Refugio
from app.models.mascota import Mascota
from app.models.solicitud import SolicitudAdopcion
from app.models.producto import Producto
from app.models.solicitud_refugio import (
    SolicitudRefugio,
    SolicitudRefugioDocumento,
)
from app.schemas.solicitud_refugio import (
    SolicitudRefugioRechazar,
    SolicitudRefugioSolicitarInfo,
    SolicitudRefugioDocVerificacion,
)
from app.services import solicitudes_refugio as svc

router = APIRouter()


# =====================================================================
# REFUGIOS REGISTRADOS (aprobados)
# =====================================================================

def _serializar_refugio_admin(r: Refugio, db: Session, total_mascotas: Optional[int] = None) -> dict:
    user = db.query(Usuario).filter(Usuario.id == r.usuario_id).first()
    if total_mascotas is None:
        total_mascotas = db.query(Mascota).filter(Mascota.refugio_id == r.id).count()
    return {
        "id": r.id,
        "usuario_id": r.usuario_id,
        "nombre": r.nombre,
        "slug": r.slug,
        "logo_url": r.logo_url,
        "descripcion": r.descripcion,
        "ubicacion": r.ubicacion,
        "departamento": r.departamento,
        "ciudad": r.ubicacion,
        "municipio": r.municipio,
        "direccion": r.direccion,
        "telefono": r.telefono,
        "email": r.email,
        "website": r.website,
        "facebook": r.facebook,
        "instagram": r.instagram,
        "tiktok": getattr(r, "tiktok", None),
        "anio_fundacion": r.anio_fundacion,
        "verificado": r.verificado,
        "tienda_habilitada": r.tienda_habilitada,
        "total_mascotas": total_mascotas,
        "creado_en": r.creado_en.isoformat() if r.creado_en else None,
        # Datos del usuario (para suspender/activar)
        "usuario_nombre": f"{user.nombre} {user.apellido or ''}".strip() if user else None,
        "usuario_email": user.email if user else None,
        "usuario_telefono": user.telefono if user else None,
        "usuario_activo": user.activo if user else False,
        "estado": "activo" if (user and user.activo) else "suspendido",
    }


@router.get("/refugios")
def listar_refugios_admin(
    busqueda: Optional[str] = Query(None, description="Buscar por nombre, email o ciudad"),
    estado: Optional[str] = Query(None, description="activo | suspendido"),
    ciudad: Optional[str] = Query(None, description="Filtrar por ciudad"),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista los refugios aprobados con conteo de mascotas y datos de usuario."""
    refugios = db.query(Refugio).order_by(Refugio.nombre.asc()).all()

    # Conteos de mascotas por refugio (una sola consulta)
    conteos = dict(
        db.query(Mascota.refugio_id, func.count(Mascota.id))
        .filter(Mascota.refugio_id.isnot(None))
        .group_by(Mascota.refugio_id)
        .all()
    )
    # Usuarios asociados
    ids = [r.usuario_id for r in refugios if r.usuario_id]
    usuarios = {}
    if ids:
        usuarios = {
            u.id: u for u in db.query(Usuario).filter(Usuario.id.in_(ids)).all()
        }

    resultados = []
    for r in refugios:
        user = usuarios.get(r.usuario_id)
        total_mascotas = conteos.get(r.id, 0)
        r_estado = "activo" if (user and user.activo) else "suspendido"

        if estado and r_estado != estado:
            continue
        if ciudad and ciudad.lower() not in (r.ubicacion or "").lower():
            continue
        if busqueda:
            termino = busqueda.lower()
            hay = (
                termino in (r.nombre or "").lower()
                or termino in (r.email or "").lower()
                or termino in (r.ubicacion or "").lower()
                or (user and termino in (user.email or "").lower())
            )
            if not hay:
                continue

        resultados.append(_serializar_refugio_admin(r, db, total_mascotas))

    return resultados


@router.get("/refugios/{refugio_id}")
def obtener_refugio_admin(
    refugio_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    refugio = db.query(Refugio).filter(Refugio.id == refugio_id).first()
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")

    data = _serializar_refugio_admin(refugio, db)

    # Estadísticas adicionales (siempre desde la base de datos)
    data["total_productos"] = db.query(Producto).filter(Producto.refugio_id == refugio.id).count()
    data["total_adopciones"] = (
        db.query(SolicitudAdopcion)
        .join(Mascota, SolicitudAdopcion.mascota_id == Mascota.id)
        .filter(Mascota.refugio_id == refugio.id)
        .count()
    )
    # El sistema no registra "último acceso" ni donaciones; no se inventan datos.
    data["ultimo_acceso"] = None
    data["total_donaciones"] = None
    return data


@router.put("/refugios/{refugio_id}")
def actualizar_refugio_admin(
    refugio_id: int,
    payload: dict,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    refugio = db.query(Refugio).filter(Refugio.id == refugio_id).first()
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")

    permitidos = {
        "nombre", "descripcion", "ubicacion", "departamento", "municipio",
        "direccion", "telefono", "email",
        "facebook", "instagram", "tiktok", "website", "anio_fundacion",
        "logo_url", "verificado", "tienda_habilitada",
    }
    for campo, valor in payload.items():
        if campo in permitidos and valor is not None:
            setattr(refugio, campo, valor)

    db.commit()
    db.refresh(refugio)
    registrar_auditoria(
        db, _admin.id, "actualizar_refugio", "refugios", refugio.id,
        f"Actualizado: {refugio.nombre}",
    )
    db.commit()
    return _serializar_refugio_admin(refugio, db)


@router.patch("/refugios/{refugio_id}/estado")
def cambiar_estado_refugio_admin(
    refugio_id: int,
    payload: dict,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Suspende (activo=False) o reactiva (activo=True) un refugio."""
    refugio = db.query(Refugio).filter(Refugio.id == refugio_id).first()
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")

    activo = bool(payload.get("activo"))
    user = db.query(Usuario).filter(Usuario.id == refugio.usuario_id).first()
    if user:
        user.activo = activo
    refugio.verificado = activo if "verificado" not in payload else bool(payload.get("verificado"))

    db.commit()
    registrar_auditoria(
        db, _admin.id, "cambiar_estado_refugio", "refugios", refugio.id,
        f"{'Suspendido' if not activo else 'Reactivo'}: {refugio.nombre}",
    )
    db.commit()
    return _serializar_refugio_admin(refugio, db)


@router.delete("/refugios/{refugio_id}", status_code=204)
def eliminar_refugio_admin(
    refugio_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    refugio = db.query(Refugio).filter(Refugio.id == refugio_id).first()
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")

    # Soft delete: desactiva el usuario asociado si existe (libera el email)
    if refugio.usuario_id:
        user = db.query(Usuario).filter(Usuario.id == refugio.usuario_id).first()
        if user:
            liberar_email(db, user)
            soft_delete_no_commit(db, user)

    # Soft delete: libera el slug y desactiva el refugio conservando sus
    # mascotas, empleados, productos y donaciones.
    liberar_slug(db, refugio)
    soft_delete_no_commit(db, refugio)

    registrar_auditoria(
        db, _admin.id, "eliminar_refugio", "refugios", refugio_id,
        f"Eliminado: {refugio.nombre}",
    )
    db.commit()
    return None


# =====================================================================
# SOLICITUDES DE REFUGIOS
# =====================================================================

@router.get("/solicitudes-refugio/estadisticas")
def estadisticas_solicitudes(
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Contadores por estado para las pestañas del módulo."""
    filas = dict(
        db.query(SolicitudRefugio.estado, func.count(SolicitudRefugio.id))
        .group_by(SolicitudRefugio.estado)
        .all()
    )
    return {
        "total": sum(filas.values()),
        "pendientes": filas.get("pendiente", 0),
        "informacion_solicitada": filas.get("informacion_solicitada", 0),
        "aprobadas": filas.get("aprobada", 0),
        "rechazadas": filas.get("rechazada", 0),
    }


@router.get("/solicitudes-refugio")
def listar_solicitudes_refugio(
    estado: Optional[str] = Query(None, description="pendiente | informacion_solicitada | aprobada | rechazada"),
    busqueda: Optional[str] = Query(None, description="Buscar por refugio, representante o correo"),
    ciudad: Optional[str] = Query(None, description="Filtrar por ciudad"),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(SolicitudRefugio)

    if estado and estado in svc.ESTADOS_VALIDOS:
        query = query.filter(SolicitudRefugio.estado == estado)
    if ciudad:
        query = query.filter(SolicitudRefugio.ciudad.ilike(f"%{ciudad}%"))
    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(
            SolicitudRefugio.nombre_refugio.ilike(termino)
            | SolicitudRefugio.representante_nombre.ilike(termino)
            | SolicitudRefugio.representante_email.ilike(termino)
        )

    solicitudes = query.order_by(SolicitudRefugio.creada_en.desc()).all()
    return [svc.serialize_solicitud(s, db, incluir_detalle=False) for s in solicitudes]


@router.get("/solicitudes-refugio/{solicitud_id}")
def detalle_solicitud_refugio(
    solicitud_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    solicitud = db.query(SolicitudRefugio).filter(SolicitudRefugio.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return svc.serialize_solicitud(solicitud, db, incluir_detalle=True)


@router.post("/solicitudes-refugio/{solicitud_id}/aprobar")
def aprobar_solicitud_refugio(
    solicitud_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    solicitud = db.query(SolicitudRefugio).filter(SolicitudRefugio.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    try:
        data = svc.aprobar_solicitud(db, solicitud, _admin)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return data


@router.post("/solicitudes-refugio/{solicitud_id}/rechazar")
def rechazar_solicitud_refugio(
    solicitud_id: int,
    payload: SolicitudRefugioRechazar,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    solicitud = db.query(SolicitudRefugio).filter(SolicitudRefugio.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    try:
        data = svc.rechazar_solicitud(db, solicitud, _admin, payload.motivo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return data


@router.post("/solicitudes-refugio/{solicitud_id}/solicitar-informacion")
def solicitar_informacion_refugio(
    solicitud_id: int,
    payload: SolicitudRefugioSolicitarInfo,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    solicitud = db.query(SolicitudRefugio).filter(SolicitudRefugio.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    try:
        data = svc.solicitar_informacion(db, solicitud, _admin, payload.mensaje)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return data


@router.patch("/solicitudes-refugio/documentos/{documento_id}/verificacion")
def verificar_documento_solicitud(
    documento_id: int,
    payload: SolicitudRefugioDocVerificacion,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    documento = (
        db.query(SolicitudRefugioDocumento)
        .filter(SolicitudRefugioDocumento.id == documento_id)
        .first()
    )
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    try:
        data = svc.verificar_documento(db, documento, _admin, payload.estado_verificacion)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return data


@router.delete("/solicitudes-refugio/{solicitud_id}", status_code=204)
def eliminar_solicitud_refugio(
    solicitud_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Elimina una solicitud de refugio (por ejemplo, una ya resuelta/aprobada/rechazada)."""
    solicitud = db.query(SolicitudRefugio).filter(SolicitudRefugio.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    registrar_auditoria(
        db, _admin.id, "eliminar_solicitud_refugio", "solicitudes_refugio",
        solicitud.id, f"Eliminada: {solicitud.nombre_refugio}",
    )
    db.delete(solicitud)
    db.commit()
    return None
