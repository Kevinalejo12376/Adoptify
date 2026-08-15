# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Query
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from typing import Optional, List

from app.db.database import get_db
from app.core.security import get_current_user, get_refugio_de_usuario, require_permiso_refugio
from app.core.lookups import id_por_codigo
from app.core.notificaciones import notificar_admins, registrar_auditoria
from app.models.usuario import Usuario
from app.models.refugio import Refugio
from app.models.mascota import Mascota
from app.models.catalogos import TipoMascota, TamanoMascota, GeneroMascota, EstadoMascota
from app.schemas.mascota import MascotaCreate, MascotaUpdate, MascotaResponse
from app.schemas.serializers import serialize_mascota
from app.core.softdelete import soft_delete

router = APIRouter()


def _get_refugio_de(usuario: Usuario, db: Session) -> Refugio:
    refugio = get_refugio_de_usuario(db, usuario)
    if not refugio:
        raise HTTPException(status_code=404, detail="El refugio no existe para este usuario")
    return refugio


@router.get("/", response_model=List[MascotaResponse])
def listar_mascotas(
    db: Session = Depends(get_db),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo: perro, gato, otro"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
):
    query = db.query(Mascota).filter(Mascota.activo == True)  # noqa: E712
    if tipo:
        tipo_id = id_por_codigo(db, TipoMascota, tipo)
        if tipo_id:
            query = query.filter(Mascota.tipo_id == tipo_id)
    if estado:
        estado_id = id_por_codigo(db, EstadoMascota, estado)
        if estado_id:
            query = query.filter(Mascota.estado_id == estado_id)
    mascotas = query.order_by(Mascota.creado_en.desc()).all()
    return [serialize_mascota(m) for m in mascotas]


@router.get("/mias", response_model=List[MascotaResponse])
def mis_mascotas(current_user: Usuario = Depends(require_permiso_refugio("mascotas")), db: Session = Depends(get_db)):
    refugio = _get_refugio_de(current_user, db)
    mascotas = db.query(Mascota).filter(Mascota.refugio_id == refugio.id).order_by(Mascota.creado_en.desc()).all()
    return [serialize_mascota(m) for m in mascotas]


@router.get("/{mascota_id}", response_model=MascotaResponse)
def obtener_mascota(mascota_id: int, db: Session = Depends(get_db)):
    mascota = db.query(Mascota).filter(
        Mascota.id == mascota_id, Mascota.activo == True  # noqa: E712
    ).first()
    if not mascota:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    return serialize_mascota(mascota)


@router.post("/", response_model=MascotaResponse, status_code=status.HTTP_201_CREATED)
def crear_mascota(
    payload: MascotaCreate,
    current_user: Usuario = Depends(require_permiso_refugio("mascotas")),
    db: Session = Depends(get_db),
):
    refugio = _get_refugio_de(current_user, db)
    mascota = Mascota(
        refugio_id=refugio.id,
        nombre=payload.nombre,
        tipo_id=id_por_codigo(db, TipoMascota, payload.tipo, requerido=True),
        tamano_id=id_por_codigo(db, TamanoMascota, payload.tamano),
        genero_id=id_por_codigo(db, GeneroMascota, payload.genero),
        estado_id=id_por_codigo(db, EstadoMascota, payload.estado, requerido=True),
        raza=payload.raza,
        edad=payload.edad,
        peso=payload.peso,
        color=payload.color,
        descripcion=payload.descripcion,
        personalidad=payload.personalidad,
        salud=payload.salud,
        requisitos=payload.requisitos,
        vacunado=payload.vacunado,
        esterilizado=payload.esterilizado,
        desparasitado=payload.desparasitado,
    )
    db.add(mascota)
    db.commit()
    db.refresh(mascota)
    # Notifica a los admins de la nueva mascota
    notificar_admins(
        db,
        tipo="nueva_mascota",
        mensaje=f"Nueva mascota publicada: {mascota.nombre} ({refugio.nombre})",
        enlace="/admin/mascotas",
    )
    registrar_auditoria(db, current_user.id, "crear", "mascotas", mascota.id, f"Registro mascota {mascota.nombre}")
    db.commit()
    return serialize_mascota(mascota)


@router.put("/{mascota_id}", response_model=MascotaResponse)
def actualizar_mascota(
    mascota_id: int,
    payload: MascotaUpdate,
    current_user: Usuario = Depends(require_permiso_refugio("mascotas")),
    db: Session = Depends(get_db),
):
    refugio = _get_refugio_de(current_user, db)
    mascota = db.query(Mascota).filter(Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    if mascota.refugio_id != refugio.id:
        raise HTTPException(status_code=403, detail="No puedes editar mascotas de otro refugio")

    datos = payload.model_dump(exclude_unset=True)
    # Resuelve los campos de catalogo (codigo/nombre -> id)
    if "tipo" in datos:
        mascota.tipo_id = id_por_codigo(db, TipoMascota, datos.pop("tipo"), requerido=True)
    if "tamano" in datos:
        mascota.tamano_id = id_por_codigo(db, TamanoMascota, datos.pop("tamano"))
    if "genero" in datos:
        mascota.genero_id = id_por_codigo(db, GeneroMascota, datos.pop("genero"))
    if "estado" in datos:
        mascota.estado_id = id_por_codigo(db, EstadoMascota, datos.pop("estado"), requerido=True)
    for campo, valor in datos.items():
        setattr(mascota, campo, valor)

    db.commit()
    db.refresh(mascota)
    return serialize_mascota(mascota)


@router.delete("/{mascota_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_mascota(
    mascota_id: int,
    current_user: Usuario = Depends(require_permiso_refugio("mascotas")),
    db: Session = Depends(get_db),
):
    refugio = _get_refugio_de(current_user, db)
    mascota = db.query(Mascota).filter(Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    if mascota.refugio_id != refugio.id:
        raise HTTPException(status_code=403, detail="No puedes eliminar mascotas de otro refugio")
    # Soft delete: desactiva la mascota conservando su historial de adopción.
    soft_delete(db, mascota)
    return None
