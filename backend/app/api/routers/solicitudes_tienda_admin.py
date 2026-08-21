# pyrefly: ignore [missing-import]
"""Endpoints de administración para el módulo de Solicitudes de Tiendas Aliadas.

Permite listar, ver el expediente, aprobar, rechazar, solicitar información y
verificar documentos de las solicitudes de registro de Tiendas Aliadas.

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
from app.models.usuario import Usuario
from app.models.solicitud_tienda import (
    SolicitudTienda,
    SolicitudTiendaDocumento,
)
from app.schemas.solicitud_tienda import (
    SolicitudTiendaRechazar,
    SolicitudTiendaSolicitarInfo,
    SolicitudTiendaDocVerificacion,
)
from app.services import solicitudes_tienda as svc

router = APIRouter()


@router.get("/solicitudes-tienda/estadisticas")
def estadisticas_solicitudes(
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Contadores por estado para las pestañas del módulo."""
    filas = dict(
        db.query(SolicitudTienda.estado, func.count(SolicitudTienda.id))
        .group_by(SolicitudTienda.estado)
        .all()
    )
    return {
        "total": sum(filas.values()),
        "pendientes": filas.get("pendiente", 0),
        "informacion_solicitada": filas.get("informacion_solicitada", 0),
        "aprobadas": filas.get("aprobada", 0),
        "rechazadas": filas.get("rechazada", 0),
    }


@router.get("/solicitudes-tienda")
def listar_solicitudes_tienda(
    estado: Optional[str] = Query(None, description="pendiente | informacion_solicitada | aprobada | rechazada"),
    busqueda: Optional[str] = Query(None, description="Buscar por tienda, representante o correo"),
    ciudad: Optional[str] = Query(None, description="Filtrar por ciudad"),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(SolicitudTienda)

    if estado and estado in svc.ESTADOS_VALIDOS:
        query = query.filter(SolicitudTienda.estado == estado)
    if ciudad:
        query = query.filter(SolicitudTienda.ciudad.ilike(f"%{ciudad}%"))
    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(
            SolicitudTienda.nombre_tienda.ilike(termino)
            | SolicitudTienda.representante_nombre.ilike(termino)
            | SolicitudTienda.representante_email.ilike(termino)
        )

    solicitudes = query.order_by(SolicitudTienda.creada_en.desc()).all()
    return [svc.serialize_solicitud(s, db, incluir_detalle=False) for s in solicitudes]


@router.get("/solicitudes-tienda/{solicitud_id}")
def detalle_solicitud_tienda(
    solicitud_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    solicitud = db.query(SolicitudTienda).filter(SolicitudTienda.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return svc.serialize_solicitud(solicitud, db, incluir_detalle=True)


@router.post("/solicitudes-tienda/{solicitud_id}/aprobar")
def aprobar_solicitud_tienda(
    solicitud_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    solicitud = db.query(SolicitudTienda).filter(SolicitudTienda.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    try:
        data = svc.aprobar_solicitud(db, solicitud, _admin)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return data


@router.post("/solicitudes-tienda/{solicitud_id}/rechazar")
def rechazar_solicitud_tienda(
    solicitud_id: int,
    payload: SolicitudTiendaRechazar,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    solicitud = db.query(SolicitudTienda).filter(SolicitudTienda.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    try:
        data = svc.rechazar_solicitud(db, solicitud, _admin, payload.motivo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return data


@router.post("/solicitudes-tienda/{solicitud_id}/solicitar-informacion")
def solicitar_informacion_tienda(
    solicitud_id: int,
    payload: SolicitudTiendaSolicitarInfo,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    solicitud = db.query(SolicitudTienda).filter(SolicitudTienda.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    try:
        data = svc.solicitar_informacion(db, solicitud, _admin, payload.mensaje)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return data


@router.patch("/solicitudes-tienda/documentos/{documento_id}/verificacion")
def verificar_documento_solicitud(
    documento_id: int,
    payload: SolicitudTiendaDocVerificacion,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    documento = (
        db.query(SolicitudTiendaDocumento)
        .filter(SolicitudTiendaDocumento.id == documento_id)
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


@router.delete("/solicitudes-tienda/{solicitud_id}", status_code=204)
def eliminar_solicitud_tienda(
    solicitud_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Elimina una solicitud de tienda (por ejemplo, una ya resuelta/aprobada/rechazada)."""
    solicitud = db.query(SolicitudTienda).filter(SolicitudTienda.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    registrar_auditoria(
        db, _admin.id, "eliminar_solicitud_tienda", "solicitudes_tienda",
        solicitud.id, f"Eliminada: {solicitud.nombre_tienda}",
    )
    db.delete(solicitud)
    db.commit()
    return None
