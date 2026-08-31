"""Rutas de donaciones de personas (usuarios anónimos o registrados) a refugios.

Cubre:
  - Crear una donación (``dinero`` o ``fisica``) sin exigir autenticación:
    si el usuario trae token, la donación queda asociada a su cuenta; si no,
    se registra como "Donación anónima" con una ``referencia`` única para poder
    consultarla después.
  - Flujo de la pasarela de pagos PREPARADO pero no integrado: el endpoint
    ``POST /donaciones/{id}/pago-confirmado`` es el punto exacto donde se
    conectará el webhook del proveedor de pago. Hoy el frontend lo invoca al
    simular un pago exitoso; mañana lo llamará la pasarela real.
  - Consultas del usuario autenticado ("Mis donaciones").
  - Gestión del refugio: listar las donaciones dirigidas al refugio y
    confirmar recepción (``recibida`` / ``no_recibida`` con motivo).
  - Compartir una donación en el foro: generación de borrador con Gemini y
    publicación (editable, sin duplicados).
"""
# pyrefly: ignore [missing-import]
import json
import secrets
import string
from datetime import datetime, timezone
from typing import Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field, field_validator
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import (
    get_current_user,
    get_current_user_optional,
    require_permiso_refugio,
    get_refugio_de_usuario,
)
from app.core.lookups import id_por_codigo
from app.core.notificaciones import crear_notificacion, notificar_admins, registrar_auditoria
from app.models.usuario import Usuario
from app.models.donacion_usuario import DonacionUsuario
from app.models.refugio import Refugio
from app.models.foro import ForoPost
from app.models.catalogos import ForoCategoria, TipoPostForo, EstadoPostForo
from app.services.gemini import clasificar_contenido
from app.api.routers.ia import crear_tarea_ia

router = APIRouter()

# Estados del ciclo de vida de la donación.
ESTADOS_ACTIVOS = ("pendiente", "pago_confirmado", "recibida", "no_recibida", "fallida")
ESTADOS_COMPARTIBLES = ("pago_confirmado", "recibida")


# =====================================================================
# Schemas
# =====================================================================

class DonacionCreate(BaseModel):
    refugio_id: int = Field(..., gt=0)
    tipo: str = Field(..., min_length=3, max_length=20)
    valor: Optional[int] = Field(None, ge=1)
    detalle: Optional[str] = None
    nombre_donante: Optional[str] = Field(None, max_length=200)
    email_contacto: Optional[str] = Field(None, max_length=255)
    telefono_contacto: Optional[str] = Field(None, max_length=30)

    @field_validator("tipo")
    @classmethod
    def _validar_tipo(cls, v):
        if v not in ("dinero", "fisica"):
            raise ValueError("El tipo debe ser 'dinero' o 'fisica'")
        return v

    @field_validator("detalle")
    @classmethod
    def _validar_detalle(cls, v):
        if v is None:
            return v
        valor = v.strip()
        if len(valor) < 5:
            raise ValueError("Describe brevemente qué deseas donar")
        return valor


class PagoConfirmado(BaseModel):
    transaccion_id: Optional[str] = Field(None, max_length=200)
    pasarela_datos: Optional[dict] = None


class PagoFallido(BaseModel):
    motivo: Optional[str] = Field(None, max_length=500)


class MotivoNoRecibida(BaseModel):
    motivo: str = Field(..., min_length=5, max_length=1000)


class PublicacionDraft(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=120)
    contenido: str = Field(..., min_length=10, max_length=10000)
    tags: Optional[str] = Field(None, max_length=500)


# =====================================================================
# Helpers
# =====================================================================

def _generar_referencia(db: Session) -> str:
    """Genera una referencia única (ej: ADF-8K3X9Q) para trazabilidad."""
    alfabeto = string.ascii_uppercase + string.digits
    for _ in range(20):
        ref = "ADF-" + "".join(secrets.choice(alfabeto) for _ in range(8))
        existe = db.query(DonacionUsuario).filter(DonacionUsuario.referencia == ref).first()
        if not existe:
            return ref
    raise HTTPException(status_code=500, detail="No se pudo generar una referencia única")


def _obtener_donacion(db: Session, donacion_id: int) -> DonacionUsuario:
    d = db.query(DonacionUsuario).filter(DonacionUsuario.id == donacion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Donación no encontrada")
    return d


def _serialize_donacion(d: DonacionUsuario) -> dict:
    """Serializa una donación para la API (snapshots + datos de trazabilidad)."""
    refugio = d.refugio
    return {
        "id": d.id,
        "referencia": d.referencia,
        "tipo": d.tipo,
        "valor": d.valor,
        "detalle": d.detalle,
        "estado": d.estado,
        "es_anonimo": d.es_anonimo,
        "nombre_donante": d.nombre_donante or "Donación anónima",
        "email_contacto": d.email_contacto,
        "telefono_contacto": d.telefono_contacto,
        "usuario_id": d.usuario_id,
        "refugio_id": d.refugio_id,
        "refugio_nombre": d.refugio_nombre or (refugio.nombre if refugio else "Refugio"),
        "refugio": (
            {
                "id": refugio.id,
                "nombre": refugio.nombre,
                "logo_url": refugio.logo_url,
                "ubicacion": refugio.ubicacion,
                "direccion": refugio.direccion,
                "telefono": refugio.telefono,
                "email": refugio.email,
            }
            if refugio
            else None
        ),
        "transaccion_id": d.transaccion_id,
        "pasarela_datos": json.loads(d.pasarela_datos) if d.pasarela_datos else None,
        "motivo_no_recibida": d.motivo_no_recibida,
        "confirmado_por_id": d.confirmado_por_id,
        "confirmado_por_nombre": d.confirmado_por_nombre,
        "confirmado_en": d.confirmado_en.isoformat() if d.confirmado_en else None,
        "post_foro_id": d.post_foro_id,
        "compartida": d.post_foro_id is not None,
        "creado_en": d.creado_en.isoformat() if d.creado_en else None,
        "actualizado_en": d.actualizado_en.isoformat() if d.actualizado_en else None,
    }


def _notificar_refugio(db: Session, donacion: DonacionUsuario, tipo: str, mensaje: str, enlace: str):
    """Notifica al representante del refugio beneficiado (best effort)."""
    try:
        refugio = db.query(Refugio).filter(Refugio.id == donacion.refugio_id).first()
        if refugio and refugio.usuario_id:
            crear_notificacion(db, refugio.usuario_id, tipo, mensaje, enlace)
    except Exception:  # noqa: BLE001
        pass


def _notificar_donante(db: Session, donacion: DonacionUsuario, tipo: str, mensaje: str, enlace: str = None):
    """Notifica al donante si está registrado (best effort)."""
    if donacion.usuario_id:
        try:
            crear_notificacion(db, donacion.usuario_id, tipo, mensaje, enlace)
        except Exception:  # noqa: BLE001
            pass


def _contexto_gemini(d: DonacionUsuario) -> str:
    """Texto legible de la donación para que Gemini genere la publicación."""
    tipo = "monetaria" if d.tipo == "dinero" else "física (ropa, accesorios u otros)"
    valor = f" de {d.valor:,} COP" if d.tipo == "dinero" and d.valor else ""
    detalle = f"\nDetalle: {d.detalle}" if d.detalle else ""
    anonimo = "El donante es anónimo." if d.es_anonimo else "El donante está registrado en Adoptify."
    return (
        f"Tipo de donación: {tipo}{valor}.\n"
        f"Refugio beneficiado: {d.refugio_nombre or d.refugio_id}.\n"
        f"Estado: {d.estado}. {anonimo}{detalle}"
    )


# =====================================================================
# Crear donación (anónimos y registrados)
# =====================================================================

@router.post("/donaciones", status_code=status.HTTP_201_CREATED)
def crear_donacion(
    payload: DonacionCreate,
    current_user: Optional[Usuario] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Registra una donación. No exige autenticación: si hay token se asocia a
    la cuenta; si no, se registra como "Donación anónima" con referencia única."""
    refugio = db.query(Refugio).filter(Refugio.id == payload.refugio_id).first()
    if not refugio or refugio.activo is False:
        raise HTTPException(status_code=404, detail="Refugio no encontrado o no disponible")

    if payload.tipo == "dinero":
        if not payload.valor or payload.valor <= 0:
            raise HTTPException(status_code=422, detail="Indica un valor válido para tu donación monetaria")
        if payload.valor > 100_000_000:
            raise HTTPException(status_code=422, detail="El valor de la donación no puede superar $100.000.000")
    else:
        if not payload.detalle:
            raise HTTPException(status_code=422, detail="Describe los artículos que deseas donar")

    es_anonimo = current_user is None
    nombre_donante = (payload.nombre_donante or "").strip()
    if not nombre_donante:
        if current_user:
            nombre_donante = f"{current_user.nombre} {current_user.apellido or ''}".strip()
        else:
            nombre_donante = "Donación anónima"

    donacion = DonacionUsuario(
        usuario_id=current_user.id if current_user else None,
        refugio_id=refugio.id,
        tipo=payload.tipo,
        valor=payload.valor if payload.tipo == "dinero" else None,
        detalle=payload.detalle,
        estado="pendiente",
        es_anonimo=es_anonimo,
        nombre_donante=nombre_donante,
        email_contacto=(payload.email_contacto or "").strip() or None,
        telefono_contacto=(payload.telefono_contacto or "").strip() or None,
        refugio_nombre=refugio.nombre,
        referencia=_generar_referencia(db),
    )
    db.add(donacion)
    db.flush()
    db.commit()
    db.refresh(donacion)

    tipo_texto = "monetaria" if donacion.tipo == "dinero" else "física"
    mensaje = (
        f"Recibiste una nueva donación {tipo_texto} "
        f"({donacion.referencia}) de {donacion.nombre_donante}. "
        "Revisa y confirma la recepción cuando corresponda."
    )
    _notificar_refugio(db, donacion, "donacion_usuario", mensaje, "/refugio/donaciones")
    notificar_admins(db, "donacion_usuario", mensaje, "/admin/donaciones")
    registrar_auditoria(
        db,
        current_user.id if current_user else None,
        "donacion.crear",
        entidad="donacion_usuario",
        entidad_id=donacion.id,
        detalle=f"Donación {donacion.tipo} {donacion.referencia} a {refugio.nombre}",
    )
    db.commit()

    return _serialize_donacion(donacion)


# =====================================================================
# Pasarela de pagos (PUNTO DE INTEGRACIÓN FUTURA)
# =====================================================================

@router.post("/donaciones/{donacion_id}/pago-confirmado")
def confirmar_pago(
    donacion_id: int,
    payload: PagoConfirmado,
    current_user: Optional[Usuario] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Confirma el pago de una donación monetaria.

    IMPORTANTE: esta es la ruta de integración de la futura pasarela de pagos.
    Hoy la invoca el frontend al simular un pago exitoso; cuando se integre el
    proveedor real, su webhook de confirmación debe llamar este mismo endpoint
    (con el token de servicio correspondiente). Si el pago falla, el frontend
    llama a ``/pago-fallido``.
    """
    donacion = _obtener_donacion(db, donacion_id)
    if donacion.tipo != "dinero":
        raise HTTPException(status_code=400, detail="Solo las donaciones monetarias pasan por la pasarela")
    if donacion.estado in ("recibida", "no_recibida"):
        raise HTTPException(status_code=400, detail="Esta donación ya fue gestionada por el refugio")
    if donacion.estado == "fallida":
        raise HTTPException(status_code=400, detail="El pago de esta donación fue rechazado; crea una nueva")

    donacion.estado = "pago_confirmado"
    if payload.transaccion_id:
        donacion.transaccion_id = payload.transaccion_id
    if payload.pasarela_datos:
        donacion.pasarela_datos = json.dumps(payload.pasarela_datos, ensure_ascii=False)
    donacion.actualizado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(donacion)

    mensaje = (
        f"Se confirmó el pago de la donación monetaria {donacion.referencia} "
        f"por {donacion.valor:,} COP de {donacion.nombre_donante}."
    )
    _notificar_refugio(db, donacion, "donacion_usuario", mensaje, "/refugio/donaciones")
    notificar_admins(db, "donacion_usuario", mensaje, "/admin/donaciones")
    registrar_auditoria(
        db,
        current_user.id if current_user else None,
        "donacion.pago_confirmado",
        entidad="donacion_usuario",
        entidad_id=donacion.id,
        detalle=f"Pago confirmado {donacion.referencia}",
    )
    db.commit()

    return _serialize_donacion(donacion)


@router.post("/donaciones/{donacion_id}/pago-fallido")
def pago_fallido(
    donacion_id: int,
    payload: PagoFallido,
    current_user: Optional[Usuario] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Marca una donación monetaria como fallida cuando el pago no se completó.

    El frontend muestra "Tu donación no pudo completarse" y permite al usuario
    reintentar creando una nueva donación (no se registra como recibida).
    """
    donacion = _obtener_donacion(db, donacion_id)
    if donacion.tipo != "dinero":
        raise HTTPException(status_code=400, detail="Esta donación no es monetaria")
    if donacion.estado in ("recibida", "no_recibida", "fallida"):
        raise HTTPException(status_code=400, detail="El estado actual no permite marcar el pago como fallido")

    donacion.estado = "fallida"
    donacion.actualizado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(donacion)

    registrar_auditoria(
        db,
        current_user.id if current_user else None,
        "donacion.pago_fallido",
        entidad="donacion_usuario",
        entidad_id=donacion.id,
        detalle=f"Pago no completado {donacion.referencia}: {payload.motivo or 'sin motivo'}",
    )
    db.commit()

    return _serialize_donacion(donacion)


# =====================================================================
# Consulta de donaciones
# =====================================================================

@router.get("/donaciones/mis-donaciones")
def mis_donaciones(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Donaciones del usuario autenticado (más recientes primero)."""
    donaciones = (
        db.query(DonacionUsuario)
        .filter(DonacionUsuario.usuario_id == current_user.id)
        .order_by(DonacionUsuario.creado_en.desc())
        .all()
    )
    return [_serialize_donacion(d) for d in donaciones]


@router.get("/donaciones/publicas/{referencia}")
def consultar_donacion_publica(referencia: str, db: Session = Depends(get_db)):
    """Permite consultar el estado de una donación por su referencia (útil para
    donantes anónimos que no tienen cuenta)."""
    donacion = db.query(DonacionUsuario).filter(DonacionUsuario.referencia == referencia.upper()).first()
    if not donacion:
        raise HTTPException(status_code=404, detail="No se encontró ninguna donación con esa referencia")
    return _serialize_donacion(donacion)


@router.get("/donaciones/refugio")
def donaciones_del_refugio(
    current_user: Usuario = Depends(require_permiso_refugio("donaciones")),
    db: Session = Depends(get_db),
):
    """Donaciones dirigidas al refugio del usuario autenticado (representante o
    empleado con permiso de donaciones)."""
    refugio = get_refugio_de_usuario(db, current_user)
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")
    donaciones = (
        db.query(DonacionUsuario)
        .filter(DonacionUsuario.refugio_id == refugio.id)
        .order_by(DonacionUsuario.creado_en.desc())
        .all()
    )
    return [_serialize_donacion(d) for d in donaciones]


# =====================================================================
# Confirmación de recepción por el refugio
# =====================================================================

def _gestionar_recepcion(
    db: Session,
    donacion: DonacionUsuario,
    current_user: Usuario,
    nuevo_estado: str,
    motivo: Optional[str] = None,
):
    """Valida y aplica la confirmación de recepción hecha por el refugio."""
    refugio = get_refugio_de_usuario(db, current_user)
    if not refugio or donacion.refugio_id != refugio.id:
        raise HTTPException(status_code=403, detail="Esta donación no pertenece a tu refugio")
    if donacion.estado in ("recibida", "no_recibida"):
        raise HTTPException(status_code=400, detail="Esta donación ya fue confirmada por el refugio")
    if donacion.estado == "fallida":
        raise HTTPException(status_code=400, detail="Una donación fallida no puede confirmarse")

    donacion.estado = nuevo_estado
    donacion.motivo_no_recibida = motivo if nuevo_estado == "no_recibida" else None
    donacion.confirmado_por_id = current_user.id
    donacion.confirmado_por_nombre = f"{current_user.nombre} {current_user.apellido or ''}".strip()
    donacion.confirmado_en = datetime.now(timezone.utc)
    donacion.actualizado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(donacion)

    if nuevo_estado == "recibida":
        _notificar_donante(
            db, donacion, "donacion_recibida",
            f"¡Tu donación {donacion.referencia} fue confirmada como recibida por {refugio.nombre}! 🎉",
            "/mis-donaciones",
        )
        registrar_auditoria(
            db, current_user.id, "donacion.recibida",
            entidad="donacion_usuario", entidad_id=donacion.id,
            detalle=f"Recepción confirmada por {donacion.confirmado_por_nombre}",
        )
    else:
        _notificar_donante(
            db, donacion, "donacion_no_recibida",
            f"Tu donación {donacion.referencia} no pudo ser verificada por {refugio.nombre}. "
            f"Motivo: {motivo}",
            "/mis-donaciones",
        )
        notificar_admins(
            db, "donacion_no_recibida",
            f"La donación {donacion.referencia} fue marcada como NO recibida por {refugio.nombre}. "
            f"Motivo: {motivo}",
            "/admin/donaciones",
        )
        registrar_auditoria(
            db, current_user.id, "donacion.no_recibida",
            entidad="donacion_usuario", entidad_id=donacion.id,
            detalle=f"No recibida por {donacion.confirmado_por_nombre}: {motivo}",
        )
    db.commit()

    return donacion


@router.post("/donaciones/{donacion_id}/recibir")
def confirmar_recibida(
    donacion_id: int,
    current_user: Usuario = Depends(require_permiso_refugio("donaciones")),
    db: Session = Depends(get_db),
):
    """El refugio confirma que recibió la donación (física o dinero)."""
    donacion = _obtener_donacion(db, donacion_id)
    donacion = _gestionar_recepcion(db, donacion, current_user, "recibida")
    return _serialize_donacion(donacion)


@router.post("/donaciones/{donacion_id}/no-recibir")
def confirmar_no_recibida(
    donacion_id: int,
    payload: MotivoNoRecibida,
    current_user: Usuario = Depends(require_permiso_refugio("donaciones")),
    db: Session = Depends(get_db),
):
    """El refugio reporta que NO recibió la donación (exige un motivo)."""
    donacion = _obtener_donacion(db, donacion_id)
    donacion = _gestionar_recepcion(db, donacion, current_user, "no_recibida", motivo=payload.motivo.strip())
    return _serialize_donacion(donacion)


# =====================================================================
# Compartir donación en el foro (Gemini)
# =====================================================================

def _donacion_del_usuario(db: Session, donacion_id: int, current_user: Usuario) -> DonacionUsuario:
    donacion = _obtener_donacion(db, donacion_id)
    if donacion.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Esta donación no te pertenece")
    if donacion.estado not in ESTADOS_COMPARTIBLES:
        raise HTTPException(
            status_code=400,
            detail="Solo puedes compartir donaciones con pago confirmado o recibida",
        )
    if donacion.post_foro_id:
        raise HTTPException(status_code=400, detail="Ya compartiste esta donación en el foro")
    return donacion


@router.post("/donaciones/{donacion_id}/publicacion")
async def generar_publicacion(
    donacion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Genera con Gemini un borrador de publicación para el foro, basado en la
    donación y el refugio. El borrador es editable antes de publicar."""
    donacion = _donacion_del_usuario(db, donacion_id, current_user)
    try:
        resultado = await clasificar_contenido("generar_post_donacion", _contexto_gemini(donacion))
        titulo = str(resultado.get("titulo") or "").strip()
        contenido = str(resultado.get("contenido") or "").strip()
        tags_raw = resultado.get("tags") or []
        if isinstance(tags_raw, list):
            tags = ",".join(str(t).strip("# ") for t in tags_raw[:6])
        else:
            tags = str(tags_raw).strip().strip("#")
        if len(contenido) < 10:
            raise ValueError("El borrador generado no es válido")
        return {"ok": True, "borrador": {"titulo": titulo, "contenido": contenido, "tags": tags}}
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": f"No se pudo generar la publicación con IA: {str(exc)[:300]}",
            "borrador": {"titulo": "", "contenido": "", "tags": ""},
        }


@router.post("/donaciones/{donacion_id}/publicar", status_code=status.HTTP_201_CREATED)
def publicar_donacion(
    donacion_id: int,
    payload: PublicacionDraft,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Publica en el foro la publicación (previamente editada por el usuario)."""
    donacion = _donacion_del_usuario(db, donacion_id, current_user)

    contenido = (payload.contenido or "").strip()
    if len(contenido) < 10:
        raise HTTPException(status_code=422, detail="El contenido debe tener al menos 10 caracteres")

    estado_id = id_por_codigo(db, EstadoPostForo, "published", requerido=True)
    post = ForoPost(
        autor_id=current_user.id,
        categoria_id=id_por_codigo(db, ForoCategoria, "donaciones"),
        tipo_id=id_por_codigo(db, TipoPostForo, "donation"),
        estado_id=estado_id,
        titulo=payload.titulo.strip(),
        contenido=contenido,
        tags=payload.tags or None,
    )
    db.add(post)
    db.flush()
    db.commit()
    db.refresh(post)

    # Vincula la publicación a la donación (evita duplicados futuros).
    donacion.post_foro_id = post.id
    donacion.actualizado_en = datetime.now(timezone.utc)
    db.commit()

    # Moderación con IA (mismo flujo que el foro).
    try:
        crear_tarea_ia(db, "moderar_post", {
            "post_id": post.id,
            "autor_id": current_user.id,
            "titulo": post.titulo,
            "contenido": post.contenido or "",
        })
    except Exception:  # noqa: BLE001
        pass

    registrar_auditoria(
        db,
        current_user.id,
        "donacion.publicar_foro",
        entidad="donacion_usuario",
        entidad_id=donacion.id,
        detalle=f"Publicación #{post.id} del foro para la donación {donacion.referencia}",
    )
    db.commit()

    return {
        "ok": True,
        "post_id": post.id,
        "donacion": _serialize_donacion(donacion),
    }
