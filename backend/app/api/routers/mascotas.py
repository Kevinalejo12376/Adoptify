# pyrefly: ignore [missing-import]
import threading
import time
import logging
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
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
from app.models.mascota import Mascota, MascotaImagen
from app.models.catalogos import TipoMascota, TamanoMascota, GeneroMascota, EstadoMascota
from app.schemas.mascota import MascotaCreate, MascotaUpdate, MascotaResponse
from app.schemas.serializers import serialize_mascota
from app.core.softdelete import soft_delete
from app.api.routers.ia import crear_tarea_ia

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================================
# Protección de idempotencia para creación de mascotas.
# Impide que una doble solicitud accidental (mismo usuario + misma
# clave X-Idempotency-Key) cree varios registros. La clave la genera
# el frontend una sola vez por envío; aquí se recuerda la mascota ya
# creada durante un TTL corto y se devuelve esa misma en lugar de
# duplicar. Es una defensa extra además del bloqueo del frontend.
# ============================================================
_IDEMPOTENCIA_CACHE = {}
_IDEMPOTENCIA_LOCK = threading.Lock()
_IDEMPOTENCIA_TTL_SEG = 120  # 2 minutos


def _limpiar_idempotencia_vencida(now: float):
    vencidos = [
        k for k, v in _IDEMPOTENCIA_CACHE.items()
        if now - v.get("ts", 0) > _IDEMPOTENCIA_TTL_SEG
    ]
    for k in vencidos:
        _IDEMPOTENCIA_CACHE.pop(k, None)


def _idempotencia_buscar(db: Session, usuario_id: int, clave: str):
    """Devuelve la mascota ya creada para la clave, o None si no existe."""
    if not clave:
        return None
    now = time.time()
    with _IDEMPOTENCIA_LOCK:
        _limpiar_idempotencia_vencida(now)
        entrada = _IDEMPOTENCIA_CACHE.get((usuario_id, clave))
        if not entrada:
            return None
        mascota = db.query(Mascota).filter(Mascota.id == entrada.get("mascota_id")).first()
        return mascota


def _idempotencia_guardar(usuario_id: int, clave: str, mascota_id: int):
    if not clave:
        return
    now = time.time()
    with _IDEMPOTENCIA_LOCK:
        _limpiar_idempotencia_vencida(now)
        _IDEMPOTENCIA_CACHE[(usuario_id, clave)] = {"ts": now, "mascota_id": mascota_id}


def _componer_edad(payload: MascotaCreate) -> Optional[str]:
    """Combina valor + unidad de edad (si se envian) para guardar en la columna
    `edad` como texto, p.ej. '3 meses' o '2 años'."""
    if payload.edad_valor is None:
        return payload.edad
    unidad = payload.edad_unidad or "meses"
    return f"{payload.edad_valor} {unidad}"


def _componer_edad_valores(valor, unidad) -> Optional[str]:
    """Compone la edad estructurada (valor + unidad) en texto para la columna
    `edad`, p.ej. '2 años' o '6 meses'. Usado en la actualización, donde la
    edad llega con el mismo formato que en la creación."""
    if valor is None or valor == "":
        return None
    unidad = unidad or "meses"
    return f"{valor} {unidad}"


def _extraer_url_public_id(img):
    """Extrae (url, public_id) de un elemento de imagen.

    Soporta tanto objetos ``ImagenMascota`` (acceso por atributo) como
    diccionarios (acceso por clave), porque ``model_dump()`` de Pydantic v2
    serializa los submodelos a ``dict``.
    """
    if isinstance(img, dict):
        url = (img.get("url") or "").strip()
        public_id = (img.get("public_id") or "").strip() or None
    else:
        url = (img.url or "").strip()
        public_id = (img.public_id or "").strip() or None
    return url, public_id


def _sincronizar_imagenes_mascota(db: Session, mascota: Mascota, imagenes):
    """Reemplaza las imágenes de la mascota por la lista enviada.

    Cada imagen ya subida a Cloudinary solo aporta su ``secure_url`` (y su
    ``public_id`` si se quiere poder borrarla después). Si ``imagenes`` es
    None, no se toca la lista actual.
    """
    if imagenes is None:
        return
    for img in list(mascota.imagenes or []):
        db.delete(img)
    db.flush()
    for idx, img in enumerate(imagenes or []):
        url, public_id = _extraer_url_public_id(img)
        if not url:
            continue
        db.add(MascotaImagen(
            mascota_id=mascota.id,
            url=url,
            public_id=public_id,
            orden=idx,
        ))


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
    request: Request,
    current_user: Usuario = Depends(require_permiso_refugio("mascotas")),
    db: Session = Depends(get_db),
):
    # Protección de idempotencia: si esta misma solicitud ya se procesó
    # (doble clic, Enter repetido o reintento con la misma clave), se
    # devuelve la mascota ya creada en lugar de duplicar el registro.
    clave_idempotencia = request.headers.get("X-Idempotency-Key", "").strip()
    if clave_idempotencia:
        existente = _idempotencia_buscar(db, current_user.id, clave_idempotencia)
        if existente is not None:
            return serialize_mascota(existente)

    refugio = _get_refugio_de(current_user, db)
    mascota = Mascota(
        refugio_id=refugio.id,
        nombre=payload.nombre,
        tipo_id=id_por_codigo(db, TipoMascota, payload.tipo, requerido=True),
        tamano_id=id_por_codigo(db, TamanoMascota, payload.tamano),
        genero_id=id_por_codigo(db, GeneroMascota, payload.genero),
        estado_id=id_por_codigo(db, EstadoMascota, payload.estado, requerido=True),
        raza=payload.raza,
        edad=_componer_edad(payload),
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
    # Guarda las imágenes (secure_url de Cloudinary) en mascota_imagenes
    _sincronizar_imagenes_mascota(db, mascota, payload.imagenes)
    db.commit()
    # Recuerda la mascota creada para esta clave de idempotencia
    if clave_idempotencia:
        _idempotencia_guardar(current_user.id, clave_idempotencia, mascota.id)
    # Notifica a los admins de la nueva mascota
    notificar_admins(
        db,
        tipo="nueva_mascota",
        mensaje=f"Nueva mascota publicada: {mascota.nombre} ({refugio.nombre})",
        enlace="/admin/mascotas",
    )
    registrar_auditoria(db, current_user.id, "crear", "mascotas", mascota.id, f"Registro mascota {mascota.nombre}")
    db.commit()

    # IA / n8n: modera el contenido de la mascota y sugiere descripcion (WF-2/WF-4).
    try:
        crear_tarea_ia(db, "moderar_mascota", {
            "mascota_id": mascota.id,
            "refugio_id": refugio.id,
            "autor_id": current_user.id,
            "nombre": mascota.nombre,
            "descripcion": mascota.descripcion or "",
            "personalidad": mascota.personalidad or "",
        })
        crear_tarea_ia(db, "sugerir_descripcion", {
            "mascota_id": mascota.id,
            "tipo": payload.tipo,
            "nombre": mascota.nombre,
            "raza": mascota.raza,
            "edad": mascota.edad,
            "personalidad": mascota.personalidad or "",
            "salud": mascota.salud or "",
        })
    except Exception as exc:
        logger.warning("[mascotas] No se pudo encolar IA para la mascota: %s", exc)

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
    # Las imágenes se sincronizan aparte (relación mascota_imagenes).
    imagenes = datos.pop("imagenes", None)
    # Resuelve los campos de catalogo (codigo/nombre -> id)
    if "tipo" in datos:
        mascota.tipo_id = id_por_codigo(db, TipoMascota, datos.pop("tipo"), requerido=True)
    if "tamano" in datos:
        mascota.tamano_id = id_por_codigo(db, TamanoMascota, datos.pop("tamano"))
    if "genero" in datos:
        mascota.genero_id = id_por_codigo(db, GeneroMascota, datos.pop("genero"))
    if "estado" in datos:
        mascota.estado_id = id_por_codigo(db, EstadoMascota, datos.pop("estado"), requerido=True)
    # Compone la edad estructurada (valor + unidad) en texto antes de asignar
    # el resto de campos, con el mismo formato que usa la creación.
    if "edad_valor" in datos or "edad_unidad" in datos:
        edad_valor = datos.pop("edad_valor", None)
        edad_unidad = datos.pop("edad_unidad", None)
        mascota.edad = _componer_edad_valores(edad_valor, edad_unidad)
    for campo, valor in datos.items():
        setattr(mascota, campo, valor)

    _sincronizar_imagenes_mascota(db, mascota, imagenes)
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
