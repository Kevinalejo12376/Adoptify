# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from typing import List, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

from app.db.database import get_db
from app.core.disponibilidad import refugio_visible
from app.core.security import (
    get_current_refugio,
    get_current_user,
    get_password_hash,
    require_permiso_refugio,
)
from app.models.usuario import Usuario
from app.models.catalogos import Rol
from app.models.refugio import (
    Refugio, RefugioImagen, RefugioPermiso, RefugioEmpleado, RefugioEmpleadoPermiso,
)
from app.schemas.refugio import RefugioResponse, RefugioUpdate, RefugioImagenIn
from app.schemas.refugio_equipo import (
    RefugioPermisoResponse, RefugioEmpleadoResponse, RefugioEmpleadoCreate, RefugioEmpleadoUpdate,
)

router = APIRouter()


@router.get("/", response_model=List[RefugioResponse])
def listar_refugios(db: Session = Depends(get_db)):
    # Solo refugios activos (no borrados y con cuenta de representante activa)
    # en el directorio público.
    return db.query(Refugio).filter(refugio_visible()).order_by(Refugio.nombre.asc()).all()


@router.get("/mi-perfil", response_model=RefugioResponse)
def mi_perfil(current_user: Usuario = Depends(get_current_refugio), db: Session = Depends(get_db)):
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")
    return refugio


@router.get("/mi-perfil/estadisticas")
def mis_estadisticas(current_user: Usuario = Depends(get_current_refugio), db: Session = Depends(get_db)):
    """Estadisticas reales del refugio autenticado."""
    from app.models.mascota import Mascota
    from app.models.solicitud import SolicitudAdopcion
    from app.models.catalogos import EstadoMascota, EstadoSolicitud
    from app.core.lookups import id_por_codigo

    refugio = _refugio_del_usuario(db, current_user)
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")

    total_mascotas = db.query(Mascota).filter(Mascota.refugio_id == refugio.id).count()

    # Solicitudes
    total_sol = (
        db.query(SolicitudAdopcion)
        .join(Mascota, SolicitudAdopcion.mascota_id == Mascota.id)
        .filter(Mascota.refugio_id == refugio.id)
        .count()
    )
    pendiente_id = id_por_codigo(db, EstadoSolicitud, "pendiente")
    pendientes = (
        db.query(SolicitudAdopcion)
        .join(Mascota, SolicitudAdopcion.mascota_id == Mascota.id)
        .filter(Mascota.refugio_id == refugio.id, SolicitudAdopcion.estado_id == pendiente_id)
        .count()
    ) if pendiente_id else 0
    finalizada_id = id_por_codigo(db, EstadoSolicitud, "finalizada")
    exitosas = (
        db.query(SolicitudAdopcion)
        .join(Mascota, SolicitudAdopcion.mascota_id == Mascota.id)
        .filter(Mascota.refugio_id == refugio.id, SolicitudAdopcion.estado_id == finalizada_id)
        .count()
    ) if finalizada_id else 0

    return {
        "mascotas": total_mascotas,
        "solicitudes": total_sol,
        "pendientes": pendientes,
        "exitosas": exitosas,
        "rescatados": refugio.total_rescatados,
        "voluntarios": refugio.total_voluntarios,
        "anio_fundacion": refugio.anio_fundacion,
    }


def _sincronizar_imagenes(db: Session, refugio: Refugio, imagenes: List[RefugioImagenIn]) -> None:
    """Sincroniza la galería del refugio con la lista enviada.

    - Imágenes ya guardadas ({id}) → se conservan y reordenan.
    - Imágenes nuevas ({url}) → se insertan (url ya subida a Cloudinary).
    - Imágenes existentes que ya no estén en la lista → se eliminan.
    """
    actuales = {img.id for img in (refugio.imagenes or [])}
    ids_en_payload = {img.id for img in imagenes if img.id is not None}

    # Eliminar las que se quitaron.
    for img_id in actuales - ids_en_payload:
        fila = (
            db.query(RefugioImagen)
            .filter(RefugioImagen.id == img_id, RefugioImagen.refugio_id == refugio.id)
            .first()
        )
        if fila:
            db.delete(fila)

    # Reordenar existentes y agregar nuevas.
    for idx, item in enumerate(imagenes):
        if item.id is not None:
            fila = (
                db.query(RefugioImagen)
                .filter(RefugioImagen.id == item.id, RefugioImagen.refugio_id == refugio.id)
                .first()
            )
            if fila:
                fila.orden = idx
                fila.es_portada = (idx == 0)
        else:
            db.add(RefugioImagen(
                refugio_id=refugio.id,
                url=(item.url or "").strip(),
                es_portada=(idx == 0),
                orden=idx,
            ))
    db.flush()


@router.put("/mi-perfil", response_model=RefugioResponse)
def actualizar_perfil(
    payload: RefugioUpdate,
    current_user: Usuario = Depends(require_permiso_refugio("configuracion")),
    db: Session = Depends(get_db),
):
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        if campo == "imagenes":
            continue  # se maneja aparte (relación)
        setattr(refugio, campo, valor)
    if payload.imagenes is not None:
        _sincronizar_imagenes(db, refugio, payload.imagenes)
    db.commit()
    db.refresh(refugio)
    return refugio


# ============================================================
# Equipo del refugio (empleados con rol 'empleado_refugio')
# ============================================================

def _refugio_del_usuario(db: Session, user: Usuario) -> Optional[Refugio]:
    """Refugio asociado al usuario (representante o empleado)."""
    if user.rol_codigo == "refugio":
        return db.query(Refugio).filter(Refugio.usuario_id == user.id).first()
    vinculo = (
        db.query(RefugioEmpleado)
        .filter(RefugioEmpleado.usuario_id == user.id)
        .first()
    )
    return vinculo.refugio if vinculo else None


def _es_representante(refugio: Refugio, user: Usuario) -> bool:
    return refugio is not None and refugio.usuario_id == user.id


def _permisos_empleado(db: Session, refugio: Refugio, user: Usuario) -> Optional[List[str]]:
    """Códigos de permisos del usuario en el refugio (None si no es empleado activo)."""
    vinculo = (
        db.query(RefugioEmpleado)
        .filter(
            RefugioEmpleado.refugio_id == refugio.id,
            RefugioEmpleado.usuario_id == user.id,
        )
        .first()
    )
    if not vinculo or not vinculo.activo:
        return None
    return [p.permiso.codigo for p in vinculo.permisos]


def _puede_administrar_equipo(db: Session, refugio: Refugio, user: Usuario) -> bool:
    """Solo el representante o un empleado con permiso 'administrar_empleados'."""
    if _es_representante(refugio, user):
        return True
    permisos = _permisos_empleado(db, refugio, user)
    return permisos is not None and "administrar_empleados" in permisos


def _asignar_permisos(db: Session, vinculo: RefugioEmpleado, codigos: List[str]) -> None:
    db.query(RefugioEmpleadoPermiso).filter(
        RefugioEmpleadoPermiso.refugio_empleado_id == vinculo.id
    ).delete(synchronize_session=False)
    for codigo in set(codigos or []):
        permiso = (
            db.query(RefugioPermiso)
            .filter(RefugioPermiso.codigo == codigo, RefugioPermiso.activo == True)
            .first()
        )
        if permiso:
            db.add(RefugioEmpleadoPermiso(refugio_empleado_id=vinculo.id, permiso_id=permiso.id))
    db.flush()


def _serializar_miembro(db: Session, refugio: Refugio, usuario: Usuario, es_representante: bool = False, vinculo: Optional[RefugioEmpleado] = None):
    if es_representante:
        permisos = [p.codigo for p in db.query(RefugioPermiso).filter(RefugioPermiso.activo == True).all()]
        vinculo_id = 0
        activo = True
        creado_en = None
    else:
        vinculo_id = vinculo.id if vinculo else 0
        activo = bool(vinculo and vinculo.activo)
        creado_en = vinculo.creado_en.isoformat() if vinculo and vinculo.creado_en else None
        permisos = [p.permiso.codigo for p in (vinculo.permisos if vinculo else [])]
    return RefugioEmpleadoResponse(
        id=vinculo_id,
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        email=usuario.email,
        telefono=usuario.telefono,
        avatar_url=usuario.avatar_url,
        activo=activo,
        es_representante=es_representante,
        creado_en=creado_en,
        permisos=permisos,
    )


class EstadoEmpleado(BaseModel):
    activo: bool


@router.get("/equipo", response_model=List[RefugioEmpleadoResponse])
def listar_equipo(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista el equipo del refugio del usuario autenticado (representante + empleados)."""
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio or not _puede_administrar_equipo(db, refugio, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para administrar el equipo")
    resultado = []
    representante = db.query(Usuario).filter(Usuario.id == refugio.usuario_id).first()
    if representante:
        resultado.append(_serializar_miembro(db, refugio, representante, es_representante=True))
    vinculados = (
        db.query(RefugioEmpleado)
        .filter(RefugioEmpleado.refugio_id == refugio.id)
        .order_by(RefugioEmpleado.creado_en.asc())
        .all()
    )
    for vinculo in vinculados:
        if vinculo.usuario and vinculo.usuario.id != refugio.usuario_id:
            resultado.append(_serializar_miembro(db, refugio, vinculo.usuario, es_representante=False, vinculo=vinculo))
    return resultado


@router.get("/equipo/permisos", response_model=List[RefugioPermisoResponse])
def listar_permisos_equipo(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Catálogo de permisos disponibles para los empleados del refugio."""
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio or not _puede_administrar_equipo(db, refugio, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para consultar los permisos")
    return (
        db.query(RefugioPermiso)
        .filter(RefugioPermiso.activo == True)
        .order_by(RefugioPermiso.modulo.asc(), RefugioPermiso.id.asc())
        .all()
    )


@router.get("/equipo/mis-permisos")
def mis_permisos_equipo(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Permisos del usuario autenticado en su refugio (para control de acceso en el frontend)."""
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio:
        return {"refugio_id": None, "es_representante": False, "permisos": []}
    return {
        "refugio_id": refugio.id,
        "es_representante": _es_representante(refugio, current_user),
        "permisos": _permisos_empleado(db, refugio, current_user) or [],
    }


@router.post("/equipo", response_model=RefugioEmpleadoResponse, status_code=201)
def crear_empleado(payload: RefugioEmpleadoCreate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Crea un usuario con rol 'empleado_refugio' y lo vincula al refugio actual."""
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio or not _puede_administrar_equipo(db, refugio, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para agregar empleados")

    email = (payload.email or "").strip().lower()
    if db.query(Usuario).filter(Usuario.email == email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado en Adoptify")

    rol_empleado = db.query(Rol).filter(Rol.codigo == "empleado_refugio").first()
    if not rol_empleado:
        raise HTTPException(status_code=500, detail="El rol 'empleado_refugio' no está configurado")

    nuevo = Usuario(
        nombre=(payload.nombre or "").strip(),
        apellido=(payload.apellido or "").strip() or None,
        email=email,
        telefono=payload.telefono,
        hashed_password=get_password_hash(payload.password),
        rol_id=rol_empleado.id,
        activo=payload.activo,
    )
    db.add(nuevo)
    db.flush()
    vinculo = RefugioEmpleado(
        refugio_id=refugio.id,
        usuario_id=nuevo.id,
        activo=payload.activo,
        creado_por=current_user.id,
    )
    db.add(vinculo)
    db.flush()
    _asignar_permisos(db, vinculo, payload.permisos)
    db.commit()
    db.refresh(nuevo)
    db.refresh(vinculo)
    return _serializar_miembro(db, refugio, nuevo, es_representante=False, vinculo=vinculo)


@router.put("/equipo/{usuario_id}", response_model=RefugioEmpleadoResponse)
def actualizar_empleado(
    usuario_id: int,
    payload: RefugioEmpleadoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualiza datos, estado y permisos de un empleado del refugio actual."""
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio or not _puede_administrar_equipo(db, refugio, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para editar empleados")
    if refugio.usuario_id == usuario_id:
        raise HTTPException(status_code=400, detail="No puedes modificar al representante del refugio")
    vinculo = (
        db.query(RefugioEmpleado)
        .filter(RefugioEmpleado.refugio_id == refugio.id, RefugioEmpleado.usuario_id == usuario_id)
        .first()
    )
    if not vinculo or not vinculo.usuario:
        raise HTTPException(status_code=404, detail="Empleado no encontrado en este refugio")
    usuario = vinculo.usuario
    if payload.nombre is not None:
        usuario.nombre = payload.nombre.strip()
    if payload.apellido is not None:
        usuario.apellido = (payload.apellido or "").strip() or None
    if payload.telefono is not None:
        usuario.telefono = payload.telefono
    if payload.password:
        usuario.hashed_password = get_password_hash(payload.password)
    if payload.activo is not None:
        vinculo.activo = payload.activo
        usuario.activo = payload.activo
    if payload.permisos is not None:
        _asignar_permisos(db, vinculo, payload.permisos)
    db.commit()
    db.refresh(usuario)
    db.refresh(vinculo)
    return _serializar_miembro(db, refugio, usuario, es_representante=False, vinculo=vinculo)


@router.patch("/equipo/{usuario_id}/estado", response_model=RefugioEmpleadoResponse)
def cambiar_estado_empleado(
    usuario_id: int,
    payload: EstadoEmpleado,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Activa o desactiva un empleado del refugio actual."""
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio or not _puede_administrar_equipo(db, refugio, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para cambiar el estado de empleados")
    if refugio.usuario_id == usuario_id:
        raise HTTPException(status_code=400, detail="No puedes desactivar al representante del refugio")
    vinculo = (
        db.query(RefugioEmpleado)
        .filter(RefugioEmpleado.refugio_id == refugio.id, RefugioEmpleado.usuario_id == usuario_id)
        .first()
    )
    if not vinculo or not vinculo.usuario:
        raise HTTPException(status_code=404, detail="Empleado no encontrado en este refugio")
    vinculo.activo = payload.activo
    vinculo.usuario.activo = payload.activo
    db.commit()
    db.refresh(vinculo.usuario)
    db.refresh(vinculo)
    return _serializar_miembro(db, refugio, vinculo.usuario, es_representante=False, vinculo=vinculo)


@router.delete("/equipo/{usuario_id}", status_code=200)
def desvincular_empleado(
    usuario_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Desvincula (eliminación lógica) a un empleado del refugio actual."""
    refugio = _refugio_del_usuario(db, current_user)
    if not refugio or not _puede_administrar_equipo(db, refugio, current_user):
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar empleados")
    if refugio.usuario_id == usuario_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar al representante del refugio")
    vinculo = (
        db.query(RefugioEmpleado)
        .filter(RefugioEmpleado.refugio_id == refugio.id, RefugioEmpleado.usuario_id == usuario_id)
        .first()
    )
    if not vinculo:
        raise HTTPException(status_code=404, detail="Empleado no encontrado en este refugio")
    # Eliminación lógica: se quitan permisos y se desactiva la cuenta.
    db.query(RefugioEmpleadoPermiso).filter(
        RefugioEmpleadoPermiso.refugio_empleado_id == vinculo.id
    ).delete(synchronize_session=False)
    vinculo.activo = False
    if vinculo.usuario:
        vinculo.usuario.activo = False
    db.commit()
    return {"ok": True}


@router.get("/{refugio_id}", response_model=RefugioResponse)
def obtener_refugio(refugio_id: int, db: Session = Depends(get_db)):
    refugio = db.query(Refugio).filter(
        Refugio.id == refugio_id, refugio_visible()
    ).first()
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")
    return refugio
