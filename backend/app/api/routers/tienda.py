"""Autogestion de la Tienda Aliada autenticada (rol tienda_aliada).

Arquitectura RBAC del modulo Tienda:
  - Cada tienda tiene un UNICO Super Administrador (el representante registrado
    en ``tiendas.usuario_id`` / ``tienda_usuarios.tipo='super_admin'``).
  - El Super Administrador puede crear Administradores
    (``tienda_usuarios.tipo='admin'``) con permisos individuales asignados en la
    base de datos (``tienda_usuario_permisos``).
  - Todos los endpoints validan permisos en el backend mediante las
    dependencias ``requiere_permiso(...)`` y ``requiere_super_admin_tienda``.
  - Las restricciones NUNCA dependen del frontend: cualquier llamada directa a
    la API sin el permiso responde 403 Forbidden sin ejecutar la operacion.
"""
# pyrefly: ignore [missing-import]
import logging
import json
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from typing import List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status

logger = logging.getLogger("tienda")
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session, joinedload
# pyrefly: ignore [missing-import]
from sqlalchemy import func

from app.db.database import get_db
from app.core.security import get_current_tienda, verify_password, get_password_hash
from app.core.permisos import (
    obtener_tienda_usuario,
    obtener_codigos_permisos,
    es_super_admin,
    registrar_ultimo_acceso,
    requiere_permiso,
    requiere_super_admin_tienda,
)
from app.core.lookups import id_por_codigo
from app.core.notificaciones import crear_notificacion, notificar_admins
from app.core.actividad import registrar_actividad
from app.core.softdelete import soft_delete, soft_delete_no_commit, liberar_email
from app.models.usuario import Usuario
from app.models.tienda import (
    Tienda,
    TiendaPermiso,
    TiendaUsuario,
    TiendaUsuarioPermiso,
    TiendaActividad,
)
from app.models.producto import Producto, ProductoImagen
from app.models.pedido import Pedido, PedidoItem, HistorialEstadoPedido
from app.models.kardex import MovimientoKardex, TIPOS_MOVIMIENTO_KARDEX
from app.models.catalogos import CategoriaProducto, EstadoPedido, Rol, TipoDocumento
from app.models.refugio import Refugio
from app.models.donacion import Donacion, DonacionItem
from app.models.tienda_pqrs import TiendaPqrs, TiendaPqrsMensaje, TiendaPqrsAdjunto
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoCreateConImagenes, AnalisisRequest, ProductoStockUpdate
from app.schemas.tienda_self import (
    TiendaPerfilUpdate,
    PasswordUpdate,
    RepresentanteUpdate,
    RepresentanteCorreoUpdate,
    RepresentanteCambiar,
    AdminTiendaCreate,
    AdminTiendaUpdate,
    AdminTiendaEstadoUpdate,
    AdminTiendaPasswordReset,
    LogoChangeRequest,
)
from app.schemas.tienda_extra import (
    DonacionCreate,
    TiendaPqrsCreate,
    TiendaPqrsRespuestaCreate,
)
from app.schemas.pedido import EstadoPedidoUpdate
from app.schemas.serializers import serialize_producto, serialize_pedido, serialize_movimiento_kardex
from app.services.gemini import analizar_producto
from app.services.cloudinary_service import (
    subir_imagenes_temporales,
    limpiar_imagenes_temporales,
    subir_imagen_producto,
    subir_imagen_tienda,
    eliminar_imagen_permanente,
)
from app.api.routers.ia import crear_tarea_ia

router = APIRouter()


# ============================================================
# Helpers
# ============================================================
def _mi_tienda(current_user: Usuario, db: Session) -> Tienda:
    """Devuelve la tienda del usuario autenticado (super admin o admin).

    La pertenencia se resuelve mediante ``tienda_usuarios`` (no solo por
    ``usuario_id`` de la tienda), para que los administradores creados por el
    super admin tambien queden vinculados a su tienda.
    """
    tu = obtener_tienda_usuario(db, current_user)
    if not tu:
        raise HTTPException(status_code=404, detail="No tienes una tienda asociada")
    tienda = db.query(Tienda).filter(Tienda.id == tu.tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="No tienes una tienda asociada")
    return tienda


def _registrar_historial_pedido(db: Session, pedido_id: int, estado_id: int, notas: str = None):
    """Agrega una entrada al historial de estados del pedido (si la tabla existe)."""
    try:
        db.add(HistorialEstadoPedido(pedido_id=pedido_id, estado_id=estado_id, notas=notas))
    except Exception as exc:
        print(f"[tienda] No se pudo registrar historial del pedido: {exc}")


def _serialize_tienda(t: Tienda, u: Usuario) -> dict:
    """Serializa la tienda junto con un resumen del representante (super admin).

    Separa correctamente la informacion de la tienda (empresa) de la del
    representante (persona).
    """
    resp_nombre = f"{u.nombre} {u.apellido or ''}".strip() if u else None
    return {
        "id": t.id,
        "nombre": t.nombre,
        "slug": t.slug,
        "descripcion": t.descripcion,
        "email": t.email,
        "telefono": t.telefono,
        "ciudad": t.ciudad or t.ubicacion,
        "direccion": t.direccion,
        "logo_url": t.logo_url,
        "logo_public_id": t.logo_public_id,
        "website": t.website,
        "facebook": t.facebook,
        "instagram": t.instagram,
        "horario_semana": t.horario_semana,
        "horario_fin_semana": t.horario_fin_semana,
        "estado": t.estado,
        "rating": float(t.rating) if t.rating is not None else 0,
        "responsable_nombre": resp_nombre,
        "responsable_email": u.email if u else None,
        "responsable_telefono": u.telefono if u else None,
        "creado_en": t.creado_en.isoformat() if t.creado_en else None,
        # Galería de imágenes de la tienda (Fachada, instalaciones, productos).
        "imagenes": [
            {
                "id": img.id,
                "url": img.url,
                "public_id": img.public_id,
                "categoria": img.categoria,
                "es_portada": img.es_portada,
                "orden": img.orden,
            }
            for img in (t.imagenes or [])
        ],
    }


def _miembro_de_tienda(db: Session, tienda_id: int, miembro_id: int) -> TiendaUsuario:
    """Devuelve un TiendaUsuario dentro de la tienda (por su id de pertenencia)."""
    tu = (
        db.query(TiendaUsuario)
        .options(joinedload(TiendaUsuario.usuario), joinedload(TiendaUsuario.creador))
        .filter(TiendaUsuario.id == miembro_id, TiendaUsuario.tienda_id == tienda_id)
        .first()
    )
    if not tu:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")
    return tu


def _serialize_miembro(db: Session, m: TiendaUsuario) -> dict:
    """Serializa un miembro (super admin o admin) con sus permisos.

    Devuelve ``nombre`` y ``apellido`` por separado (tal como viven en la base
    de datos) para el llenado correcto de formularios, y ``nombre_completo``
    para la visualizacion en listas, tarjetas y mensajes.
    """
    if m.tipo == "super_admin":
        permisos = [
            codigo
            for (codigo,) in db.query(TiendaPermiso.codigo)
            .filter(TiendaPermiso.activo == True)  # noqa: E712
            .all()
        ]
    else:
        permisos = [
            up.permiso.codigo for up in m.permisos if up.permiso and up.permiso.activo
        ]
    u = m.usuario
    nombre = u.nombre if u else None
    apellido = u.apellido if u else None
    nombre_completo = f"{nombre or ''} {apellido or ''}".strip() or None
    return {
        "id": m.id,
        "usuario_id": u.id if u else None,
        "nombre": nombre,
        "apellido": apellido,
        "nombre_completo": nombre_completo,
        "email": u.email if u else None,
        "telefono": u.telefono if u else None,
        "tipo": m.tipo,
        "activo": m.activo,
        "creado_en": m.creado_en.isoformat() if m.creado_en else None,
        "ultimo_acceso": m.ultimo_acceso.isoformat() if m.ultimo_acceso else None,
        "permisos": sorted(permisos),
        "creado_por": (
            f"{m.creador.nombre} {m.creador.apellido or ''}".strip()
            if m.creador else None
        ),
    }


def _asignar_permisos(db: Session, tu: TiendaUsuario, codigos: List[str]):
    """Reemplaza el set de permisos de un administrador (validando contra catalogo)."""
    tu.permisos.clear()
    db.flush()
    for codigo in set(codigos or []):
        permiso = (
            db.query(TiendaPermiso)
            .filter(TiendaPermiso.codigo == codigo, TiendaPermiso.activo == True)  # noqa: E712
            .first()
        )
        if permiso:
            tu.permisos.append(TiendaUsuarioPermiso(permiso_id=permiso.id))
    db.flush()


def _rol_tienda(db: Session) -> Rol:
    rol = db.query(Rol).filter(Rol.codigo == "tienda_aliada").first()
    if not rol:
        raise HTTPException(status_code=500, detail="Rol tienda_aliada no encontrado en catalogo")
    return rol


# ============================================================
# ENDPOINT: Contexto del usuario (potencia layout/sidebar/menu)
# ============================================================
@router.get("/contexto")
def contexto(
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    """Contexto del usuario autenticado dentro de su tienda.

    Disponible para cualquier miembro activo (super admin o admin). Devuelve la
    informacion basica de la tienda, el tipo de miembro y los permisos que el
    backend resolvio desde la base de datos. El frontend construye la interfaz
    (sidebar, menu, botones) EXCLUSIVAMENTE con estos permisos.
    """
    tu = obtener_tienda_usuario(db, current_user)
    if not tu or not tu.activo:
        raise HTTPException(status_code=403, detail="No tienes una tienda activa asociada")
    tienda = db.query(Tienda).filter(Tienda.id == tu.tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="No tienes una tienda asociada")

    permisos = sorted(obtener_codigos_permisos(db, current_user))
    registrar_ultimo_acceso(db, current_user)

    return {
        "tienda": {
            "id": tienda.id,
            "nombre": tienda.nombre,
            "slug": tienda.slug,
            "logo_url": tienda.logo_url,
            "logo_public_id": tienda.logo_public_id,
            "estado": tienda.estado,
        },
        "usuario": {
            "id": current_user.id,
            "nombre": f"{current_user.nombre} {current_user.apellido or ''}".strip(),
            "email": current_user.email,
            "tipo": tu.tipo,
            "activo": tu.activo,
        },
        "es_super_admin": tu.tipo == "super_admin",
        "permisos": permisos,
    }


# ============================================================
# ENDPOINT: Perfil de mi tienda (incluye datos del representante)
# ============================================================
@router.get("/mi-perfil")
def mi_perfil(
    current_user: Usuario = Depends(requiere_permiso("tienda.ver_perfil")),
    db: Session = Depends(get_db),
):
    """Devuelve el perfil de la tienda autenticada junto con los datos
    del representante (usuario responsable), separando ambos conceptos."""
    tienda = _mi_tienda(current_user, db)
    registrar_ultimo_acceso(db, current_user)
    return _serialize_tienda(tienda, tienda.usuario or current_user)


@router.put("/mi-perfil")
def actualizar_mi_perfil(
    payload: TiendaPerfilUpdate,
    current_user: Usuario = Depends(requiere_permiso("tienda.editar_informacion")),
    db: Session = Depends(get_db),
):
    """Actualiza los campos editables del perfil de la tienda autenticada."""
    tienda = _mi_tienda(current_user, db)
    datos = payload.model_dump(exclude_unset=True)
    for campo, valor in datos.items():
        setattr(tienda, campo, valor)
    db.commit()
    db.refresh(tienda)
    if datos:
        registrar_actividad(
            db, tienda.id, current_user,
            tipo_accion="tienda.editar",
            accion="Modificó la información de la tienda",
            elemento_tipo="tienda",
            elemento=tienda.nombre,
            detalle=", ".join(sorted(datos.keys()))[:500],
        )
    return _serialize_tienda(tienda, tienda.usuario or current_user)


# ============================================================
# ENDPOINT: Cambiar logo / imagen de la tienda
# ============================================================
def _eliminar_logo_tienda(tienda: Tienda, db: Session) -> None:
    """Elimina el logo actual de Cloudinary (si existe) y limpia la BD.

    Reutilizable para el reemplazo y la eliminación del logo de la tienda.
    """
    public_id = getattr(tienda, "logo_public_id", None)
    if public_id:
        try:
            eliminar_imagen_permanente(public_id)
        except Exception as exc:
            logger.warning("[tienda] No se pudo eliminar logo '%s': %s", public_id, exc)
    tienda.logo_url = None
    tienda.logo_public_id = None
    db.commit()
    db.refresh(tienda)


@router.post("/cambiar-logo")
def cambiar_logo_tienda(
    payload: LogoChangeRequest,
    current_user: Usuario = Depends(requiere_permiso("tienda.cambiar_logo")),
    db: Session = Depends(get_db),
):
    """Sube el logo (o portada) de la tienda a Cloudinary y guarda URL + public_id.

    Sincronización:
    - Al reemplazar, el logo anterior se elimina automáticamente de Cloudinary
      (no quedan imágenes huérfanas).
    - Si la BD falla después de subir la imagen nueva, esta se elimina también
      para no dejar recursos sin referencia.
    """
    if not payload.imagen_base64:
        raise HTTPException(status_code=400, detail="Se requiere una imagen")
    tienda = _mi_tienda(current_user, db)
    public_id_anterior = getattr(tienda, "logo_public_id", None)

    try:
        resultado = subir_imagen_tienda(payload.imagen_base64, tipo=payload.tipo)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No se pudo subir la imagen: {exc}")

    tienda.logo_url = resultado["url"]
    tienda.logo_public_id = resultado["public_id"]
    try:
        db.commit()
    except Exception as exc:
        # Rollback: la imagen nueva quedó en Cloudinary sin referencia en BD.
        try:
            eliminar_imagen_permanente(resultado["public_id"])
        except Exception:
            logger.exception("[tienda] No se pudo limpiar logo huérfano al fallar la BD")
        raise HTTPException(status_code=500, detail=f"No se pudo guardar el logo: {exc}")

    db.refresh(tienda)

    # Solo elimina el logo anterior después de confirmar el nuevo en la BD.
    if public_id_anterior and public_id_anterior != resultado["public_id"]:
        try:
            eliminar_imagen_permanente(public_id_anterior)
        except Exception as exc:
            logger.warning("[tienda] No se pudo eliminar logo anterior '%s': %s", public_id_anterior, exc)

    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="tienda.imagen",
        accion="Cambió el logo de la tienda",
        elemento_tipo="imagen",
        elemento=tienda.nombre,
    )
    return {"logo_url": tienda.logo_url, "logo_public_id": tienda.logo_public_id}


@router.delete("/cambiar-logo")
def eliminar_logo_tienda(
    current_user: Usuario = Depends(requiere_permiso("tienda.cambiar_logo")),
    db: Session = Depends(get_db),
):
    """Elimina el logo de la tienda: de Cloudinary y de la base de datos."""
    tienda = _mi_tienda(current_user, db)
    _eliminar_logo_tienda(tienda, db)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="tienda.imagen",
        accion="Eliminó el logo de la tienda",
        elemento_tipo="imagen",
        elemento=tienda.nombre,
    )
    return {"logo_url": tienda.logo_url, "logo_public_id": tienda.logo_public_id}


# ============================================================
# ENDPOINT: Catalogo de permisos (para la UI de asignacion)
# ============================================================
@router.get("/permisos")
def catalogo_permisos(
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Catalogo de permisos agrupado por modulo (solo Super Administrador).

    Se lee directamente de la base de datos para que la interfaz de asignacion
    sea 100% dinamica y permita agregar permisos nuevos sin tocar codigo.
    """
    filas = (
        db.query(TiendaPermiso)
        .filter(TiendaPermiso.activo == True)  # noqa: E712
        .order_by(TiendaPermiso.modulo, TiendaPermiso.id)
        .all()
    )
    agrupados = {}
    for p in filas:
        agrupados.setdefault(p.modulo, []).append({
            "codigo": p.codigo,
            "nombre": p.nombre,
            "descripcion": p.descripcion,
            "modulo": p.modulo,
        })
    return [
        {"modulo": modulo, "permisos": items}
        for modulo, items in agrupados.items()
    ]


# ============================================================
# ENDPOINTS: Representante (exclusivo Super Administrador)
# ============================================================
@router.get("/representante")
def ver_representante(
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Detalle del representante (Super Administrador). Solo super admin."""
    tienda = _mi_tienda(current_user, db)
    rep = tienda.usuario
    if not rep:
        raise HTTPException(status_code=404, detail="Representante no encontrado")
    return {
        "id": rep.id,
        "nombre": rep.nombre,
        "apellido": rep.apellido,
        "email": rep.email,
        "telefono": rep.telefono,
        "tipo_documento": rep.tipo_documento.codigo if rep.tipo_documento else None,
        "numero_documento": rep.numero_documento,
        "creado_en": rep.creado_en.isoformat() if rep.creado_en else None,
    }


@router.put("/representante")
def actualizar_representante(
    payload: RepresentanteUpdate,
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Actualiza la informacion personal del representante. Solo super admin."""
    tienda = _mi_tienda(current_user, db)
    rep = tienda.usuario
    if not rep:
        raise HTTPException(status_code=404, detail="Representante no encontrado")
    datos = payload.model_dump(exclude_unset=True)
    if "tipo_documento" in datos and datos["tipo_documento"]:
        rep.tipo_documento_id = id_por_codigo(db, TipoDocumento, datos["tipo_documento"])
    if "numero_documento" in datos:
        rep.numero_documento = datos["numero_documento"]
    if "nombre" in datos:
        rep.nombre = datos["nombre"]
    if "apellido" in datos:
        rep.apellido = datos["apellido"]
    if "telefono" in datos:
        rep.telefono = datos["telefono"]
    db.commit()
    db.refresh(rep)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="tienda.representante",
        accion="Modificó la información del representante",
        elemento_tipo="representante",
        elemento=f"{rep.nombre} {rep.apellido or ''}".strip(),
    )
    return {
        "id": rep.id,
        "nombre": rep.nombre,
        "apellido": rep.apellido,
        "email": rep.email,
        "telefono": rep.telefono,
        "numero_documento": rep.numero_documento,
    }


@router.put("/representante/correo")
def cambiar_correo_representante(
    payload: RepresentanteCorreoUpdate,
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Cambia el correo de inicio de sesion del representante. Solo super admin."""
    tienda = _mi_tienda(current_user, db)
    rep = tienda.usuario
    if not rep:
        raise HTTPException(status_code=404, detail="Representante no encontrado")
    if not verify_password(payload.password_actual, rep.hashed_password):
        raise HTTPException(status_code=400, detail="La contrasena actual no es correcta")
    nuevo_email = payload.email.strip().lower()
    existente = db.query(Usuario).filter(Usuario.email == nuevo_email).first()
    if existente and existente.id != rep.id:
        raise HTTPException(status_code=400, detail="Ese correo ya esta registrado")
    rep.email = nuevo_email
    db.commit()
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="tienda.representante",
        accion="Cambió el correo del representante",
        elemento_tipo="representante",
        elemento=f"{rep.nombre} {rep.apellido or ''}".strip(),
    )
    return {"mensaje": "Correo del representante actualizado", "email": nuevo_email}


@router.post("/representante/cambiar")
def cambiar_representante(
    payload: RepresentanteCambiar,
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Transfiere el rol de Super Administrador a otro miembro de la tienda.

    El representante actual pasa a ser un administrador normal (sin permisos
    heredados), garantizando que siempre exista un unico Super Administrador.
    """
    tienda = _mi_tienda(current_user, db)
    tu_actual = obtener_tienda_usuario(db, current_user)

    if payload.nuevo_usuario_id == current_user.id:
        raise HTTPException(status_code=400, detail="Ya eres el Super Administrador")

    nuevo = (
        db.query(TiendaUsuario)
        .filter(
            TiendaUsuario.usuario_id == payload.nuevo_usuario_id,
            TiendaUsuario.tienda_id == tienda.id,
            TiendaUsuario.activo == True,  # noqa: E712
        )
        .first()
    )
    if not nuevo:
        raise HTTPException(status_code=404, detail="El nuevo representante debe ser un administrador activo de la tienda")

    # 1) El actual super admin pasa a ser admin (sin permisos heredados)
    if tu_actual:
        tu_actual.tipo = "admin"
        tu_actual.permisos.clear()
        db.flush()

    # 2) El elegido pasa a ser super admin (permisos implicitos = todos)
    nuevo.tipo = "super_admin"
    nuevo.permisos.clear()
    db.flush()

    # 3) Actualiza el representante oficial de la tienda
    tienda.usuario_id = nuevo.usuario_id
    nuevo_nombre = (
        f"{nuevo.usuario.nombre} {nuevo.usuario.apellido or ''}".strip()
        if nuevo.usuario else str(nuevo.usuario_id)
    )
    db.commit()

    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="tienda.representante",
        accion="Cambió el Super Administrador de la tienda",
        elemento_tipo="representante",
        elemento=nuevo_nombre,
    )
    return {"mensaje": "Super Administrador actualizado", "nuevo_usuario_id": nuevo.usuario_id}


# ============================================================
# ENDPOINTS: Administradores (exclusivo Super Administrador)
# ============================================================
@router.get("/administradores")
def listar_administradores(
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Lista todos los miembros de la tienda (super admin + administradores)
    con su estado, correo, fecha de creacion y ultimo acceso. Solo super admin."""
    tienda = _mi_tienda(current_user, db)
    miembros = (
        db.query(TiendaUsuario)
        .options(
            joinedload(TiendaUsuario.usuario),
            joinedload(TiendaUsuario.creador),
            joinedload(TiendaUsuario.permisos).joinedload(TiendaUsuarioPermiso.permiso),
        )
        .filter(TiendaUsuario.tienda_id == tienda.id)
        .order_by(TiendaUsuario.creado_en.desc())
        .all()
    )
    return [_serialize_miembro(db, m) for m in miembros]


@router.post("/administradores", status_code=status.HTTP_201_CREATED)
def crear_administrador(
    payload: AdminTiendaCreate,
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Crea un administrador con permisos individuales. Solo super admin.

    El nuevo administrador inicia sesion con su correo y rol tienda_aliada,
    y sus permisos se almacenan en ``tienda_usuario_permisos``.
    """
    tienda = _mi_tienda(current_user, db)
    email = payload.email.strip().lower()
    if db.query(Usuario).filter(Usuario.email == email).first():
        raise HTTPException(status_code=400, detail="Ese correo ya esta registrado")

    user = Usuario(
        nombre=payload.nombre,
        apellido=payload.apellido,
        email=email,
        hashed_password=get_password_hash(payload.password),
        telefono=payload.telefono,
        rol_id=_rol_tienda(db).id,
        activo=payload.activo,
    )
    db.add(user)
    db.flush()

    tu = TiendaUsuario(
        tienda_id=tienda.id,
        usuario_id=user.id,
        tipo="admin",
        activo=payload.activo,
        creado_por=current_user.id,
    )
    db.add(tu)
    db.flush()
    _asignar_permisos(db, tu, payload.permisos)
    db.commit()
    db.refresh(tu)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="admin.crear",
        accion="Creó un administrador",
        elemento_tipo="administrador",
        elemento=f"{payload.nombre} {payload.apellido or ''}".strip(),
    )
    return _serialize_miembro(db, tu)


@router.put("/administradores/{miembro_id}")
def actualizar_administrador(
    miembro_id: int,
    payload: AdminTiendaUpdate,
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Actualiza informacion y/o permisos de un administrador. Solo super admin."""
    tienda = _mi_tienda(current_user, db)
    tu = _miembro_de_tienda(db, tienda.id, miembro_id)
    if tu.tipo == "super_admin":
        raise HTTPException(status_code=400, detail="El Super Administrador no se edita desde aqui")

    datos = payload.model_dump(exclude_unset=True)
    permisos = datos.pop("permisos", None)
    nueva_password = datos.pop("password", None)
    nombre_admin = (
        f"{tu.usuario.nombre} {tu.usuario.apellido or ''}".strip()
        if tu.usuario else "Administrador"
    )
    if tu.usuario:
        if nueva_password:
            tu.usuario.hashed_password = get_password_hash(nueva_password)
        if "nombre" in datos and datos["nombre"] is not None:
            tu.usuario.nombre = datos["nombre"]
        if "apellido" in datos:
            tu.usuario.apellido = datos["apellido"]
        if "telefono" in datos:
            tu.usuario.telefono = datos["telefono"]
        if "activo" in datos and datos["activo"] is not None:
            tu.activo = datos["activo"]
            tu.usuario.activo = datos["activo"]
    if permisos is not None:
        _asignar_permisos(db, tu, permisos)
    db.commit()
    db.refresh(tu)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="admin.editar",
        accion="Editó un administrador",
        elemento_tipo="administrador",
        elemento=nombre_admin,
    )
    if permisos is not None:
        registrar_actividad(
            db, tienda.id, current_user,
            tipo_accion="admin.permisos",
            accion="Modificó los permisos de un administrador",
            elemento_tipo="administrador",
            elemento=nombre_admin,
            detalle=f"{len(permisos)} permiso(s) asignado(s)",
        )
    return _serialize_miembro(db, tu)


@router.patch("/administradores/{miembro_id}/estado")
def cambiar_estado_administrador(
    miembro_id: int,
    payload: AdminTiendaEstadoUpdate,
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Activa / desactiva un administrador. Solo super admin."""
    tienda = _mi_tienda(current_user, db)
    tu = _miembro_de_tienda(db, tienda.id, miembro_id)
    if tu.tipo == "super_admin":
        raise HTTPException(status_code=400, detail="No se puede desactivar al Super Administrador")
    tu.activo = payload.activo
    if tu.usuario:
        tu.usuario.activo = payload.activo
    nombre_admin = (
        f"{tu.usuario.nombre} {tu.usuario.apellido or ''}".strip()
        if tu.usuario else "Administrador"
    )
    db.commit()
    db.refresh(tu)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="admin.estado",
        accion=("Activó" if payload.activo else "Desactivó") + " a un administrador",
        elemento_tipo="administrador",
        elemento=nombre_admin,
    )
    return _serialize_miembro(db, tu)


@router.post("/administradores/{miembro_id}/restablecer-password")
def restablecer_password_administrador(
    miembro_id: int,
    payload: AdminTiendaPasswordReset,
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Restablece la contrasena de un administrador. Solo super admin."""
    tienda = _mi_tienda(current_user, db)
    tu = _miembro_de_tienda(db, tienda.id, miembro_id)
    if tu.tipo == "super_admin":
        raise HTTPException(status_code=400, detail="El Super Administrador cambia su contrasena desde su perfil")
    if not tu.usuario:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")
    tu.usuario.hashed_password = get_password_hash(payload.password)
    nombre_admin = f"{tu.usuario.nombre} {tu.usuario.apellido or ''}".strip()
    db.commit()
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="admin.password",
        accion="Restableció la contraseña de un administrador",
        elemento_tipo="administrador",
        elemento=nombre_admin,
    )
    return {"mensaje": "Contrasena restablecida exitosamente"}


@router.delete("/administradores/{miembro_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_administrador(
    miembro_id: int,
    current_user: Usuario = Depends(requiere_super_admin_tienda),
    db: Session = Depends(get_db),
):
    """Elimina un administrador (y su cuenta de acceso). Solo super admin."""
    tienda = _mi_tienda(current_user, db)
    tu = _miembro_de_tienda(db, tienda.id, miembro_id)
    if tu.tipo == "super_admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar al Super Administrador")
    user = tu.usuario
    nombre_admin = (
        f"{tu.usuario.nombre} {tu.usuario.apellido or ''}".strip()
        if tu.usuario else "Administrador"
    )
    db.delete(tu)  # vínculo de pertenencia (fila N:M): se elimina físicamente
    db.flush()
    if user:
        # Soft delete: libera el email (unicidad) y desactiva la cuenta.
        liberar_email(db, user)
        soft_delete_no_commit(db, user)
    db.commit()
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="admin.eliminar",
        accion="Eliminó un administrador",
        elemento_tipo="administrador",
        elemento=nombre_admin,
    )
    return None


# ============================================================
# ENDPOINT: Listar productos de mi tienda
# ============================================================
@router.get("/productos")
def mis_productos(
    current_user: Usuario = Depends(requiere_permiso("productos.ver")),
    db: Session = Depends(get_db),
):
    tienda = _mi_tienda(current_user, db)
    productos = (
        db.query(Producto)
        .filter(Producto.tienda_id == tienda.id)
        .order_by(Producto.creado_en.desc())
        .all()
    )
    return [serialize_producto(p) for p in productos]


# ============================================================
# ENDPOINT: Analizar producto con IA
# FLUJO: TEMPORAL → sube a Cloudinary temp/, llama a Gemini, limpia en finally
# ============================================================
@router.post("/productos/analizar-ia")
async def analizar_producto_con_ia(
    payload: AnalisisRequest,
    current_user: Usuario = Depends(requiere_permiso("productos.crear")),
    db: Session = Depends(get_db),
):
    """
    Recibe imágenes base64 del producto, las sube TEMPORALMENTE a
    Cloudinary (carpeta ``temp/producto-ia/``), las envía a Gemini
    API y devuelve datos estructurados.

    Las imágenes se eliminan automáticamente de Cloudinary en el
    bloque ``finally``, tanto si el análisis fue exitoso como si
    ocurrió una excepción. Nunca quedan archivos huérfanos.
    """
    if not payload.imagenes or len(payload.imagenes) == 0:
        raise HTTPException(status_code=400, detail="Se requiere al menos una imagen del producto")

    public_ids_temporales: List[str] = []
    imagenes_urls: List[dict] = []

    try:
        # 1. Subir imágenes a Cloudinary (carpeta temporal)
        etiquetas = ["frontal", "trasera", "izquierda", "derecha"]
        resultados = subir_imagenes_temporales(
            payload.imagenes,
            etiquetas,
            carpeta_temp="TEMP_PRODUCTO",
        )

        # Guardar public_id para limpieza y URLs para la respuesta
        for r in resultados:
            public_ids_temporales.append(r["public_id"])
            imagenes_urls.append({"url": r["url"], "etiqueta": r["etiqueta"]})

        # 2. Llamar a Gemini API (recibe base64, sin cambios)
        datos_ia = await analizar_producto(payload.imagenes)

    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inesperado al analizar con IA: {str(e)}")
    finally:
        # 3. Limpiar imágenes temporales de Cloudinary
        #    SE EJECUTA SIEMPRE, incluso si ocurrió una excepción
        limpiar_imagenes_temporales(public_ids_temporales)

    return {
        "status": "success",
        "mensaje": "Producto analizado correctamente por inteligencia artificial",
        "imagenes_capturadas": len(payload.imagenes),
        "datos": {
            **datos_ia,
            "imagenes_urls": imagenes_urls,
        },
    }


# ============================================================
# ENDPOINT: Crear producto (sin imágenes)
# ============================================================
@router.post("/productos", status_code=status.HTTP_201_CREATED)
def crear_producto(
    payload: ProductoCreate,
    current_user: Usuario = Depends(requiere_permiso("productos.crear")),
    db: Session = Depends(get_db),
):
    tienda = _mi_tienda(current_user, db)
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
        ingredientes=payload.ingredientes,
        ingredientes_activos=payload.ingredientes_activos,
        aroma=payload.aroma,
        instrucciones_cuidado=payload.instrucciones_cuidado,
        refugio_id=None,
        tienda_id=tienda.id,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="producto.crear",
        accion="Creó el producto",
        elemento_tipo="producto",
        elemento=producto.nombre,
    )

    # IA / n8n: modera el contenido del producto (WF-2).
    try:
        crear_tarea_ia(db, "moderar_producto", {
            "producto_id": producto.id,
            "tienda_id": tienda.id,
            "autor_id": current_user.id,
            "nombre": producto.nombre,
            "descripcion": producto.descripcion or "",
            "descripcion_larga": producto.descripcion_larga or "",
            "marca": producto.marca,
        })
    except Exception as exc:
        logger.warning("[tienda] No se pudo encolar moderacion del producto: %s", exc)

    return serialize_producto(producto)


# ============================================================
# ENDPOINT: Crear producto CON imágenes
# FLUJO: PERMANENTE → sube a Cloudinary productos/imagenes/, guarda URL en DB
# ============================================================
@router.post("/productos/con-imagenes", status_code=status.HTTP_201_CREATED)
def crear_producto_con_imagenes(
    payload: ProductoCreateConImagenes,
    current_user: Usuario = Depends(requiere_permiso("productos.crear")),
    db: Session = Depends(get_db),
):
    """
    Crea un producto con sus imágenes (base64).

    Las imágenes se suben a Cloudinary (carpeta ``productos/imagenes/``)
    como imágenes PERMANENTES. Las URLs públicas se almacenan en los
    registros de ``ProductoImagen`` en PostgreSQL.

    Si ocurre una excepción durante la subida o el commit, se hace
    ``db.rollback()`` y se eliminan de Cloudinary las imágenes que
    ya se hubieran subido.
    """
    tienda = _mi_tienda(current_user, db)

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
        ingredientes=payload.ingredientes,
        ingredientes_activos=payload.ingredientes_activos,
        aroma=payload.aroma,
        instrucciones_cuidado=payload.instrucciones_cuidado,
        refugio_id=None,
        tienda_id=tienda.id,
    )
    db.add(producto)
    db.flush()  # Obtener ID sin commit final

    # Subir imágenes a Cloudinary (PERMANENTES) y crear registros ProductoImagen
    public_ids_permanentes: List[str] = []
    try:
        etiquetas = ["frontal", "trasera", "izquierda", "derecha"]
        for i, img_base64 in enumerate(payload.imagenes):
            etiqueta = etiquetas[i] if i < len(etiquetas) else f"vista_{i+1}"
            # Usar función PERMANENTE para imágenes de producto
            resultado = subir_imagen_producto(img_base64, etiqueta)
            public_ids_permanentes.append(resultado["public_id"])

            imagen = ProductoImagen(
                producto_id=producto.id,
                url=resultado["url"],
                etiqueta=resultado["etiqueta"],
                orden=i,
            )
            db.add(imagen)

        db.commit()
        db.refresh(producto)
    except Exception:
        # Rollback de la transacción de BD
        db.rollback()
        # Limpiar imágenes que ya se subieron a Cloudinary
        # (se usa eliminar_imagen_temporal porque el logging es por warning)
        from app.services.cloudinary_service import eliminar_imagen_temporal
        for pid in public_ids_permanentes:
            eliminar_imagen_temporal(pid)
        raise

    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="producto.crear",
        accion="Creó el producto",
        elemento_tipo="producto",
        elemento=producto.nombre,
        detalle=f"{len(payload.imagenes)} imagen(es) adjunta(s)",
    )
    return serialize_producto(producto)


def _mi_producto(producto_id: int, current_user: Usuario, db: Session) -> Producto:
    tienda = _mi_tienda(current_user, db)
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if producto.tienda_id != tienda.id:
        raise HTTPException(status_code=403, detail="Este producto no es de tu tienda")
    return producto


@router.get("/productos/{producto_id}")
def obtener_mi_producto(
    producto_id: int,
    current_user: Usuario = Depends(requiere_permiso("productos.ver")),
    db: Session = Depends(get_db),
):
    return serialize_producto(_mi_producto(producto_id, current_user, db))


# ============================================================
# ENDPOINT: Actualizar el stock de un producto de mi tienda
# ============================================================
@router.patch("/productos/{producto_id}/stock")
def actualizar_stock_producto(
    producto_id: int,
    payload: ProductoStockUpdate,
    current_user: Usuario = Depends(requiere_permiso("inventario.actualizar_stock")),
    db: Session = Depends(get_db),
):
    """Actualiza únicamente el stock de un producto propio.

    Valida que el stock sea un entero mayor o igual a 0 (en el schema) y que
    el producto pertenezca a la tienda autenticada (en ``_mi_producto``).
    """
    tienda = _mi_tienda(current_user, db)
    producto = _mi_producto(producto_id, current_user, db)
    stock_anterior = producto.stock or 0
    producto.stock = payload.stock
    db.commit()
    db.refresh(producto)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="inventario.stock",
        accion="Modificó el stock",
        elemento_tipo="producto",
        elemento=producto.nombre,
        detalle=f"Stock: {stock_anterior} → {payload.stock}",
    )
    return serialize_producto(producto)


@router.put("/productos/{producto_id}")
def actualizar_producto(
    producto_id: int,
    payload: ProductoUpdate,
    current_user: Usuario = Depends(requiere_permiso("productos.editar")),
    db: Session = Depends(get_db),
):
    """Edita un producto. Si incluye ``activo`` exige ademas el permiso de
    activar/desactivar productos segun el valor enviado."""
    tienda = _mi_tienda(current_user, db)
    producto = _mi_producto(producto_id, current_user, db)
    datos = payload.model_dump(exclude_unset=True)

    # Acciones de activacion/desactivacion requieren su permiso especifico
    if "activo" in datos:
        from app.core.permisos import tiene_permiso
        permiso_requerido = "productos.activar" if datos["activo"] else "productos.desactivar"
        if not tiene_permiso(db, current_user, permiso_requerido):
            raise HTTPException(
                status_code=403,
                detail=f"No tienes permisos para {'activar' if datos['activo'] else 'desactivar'} productos",
            )

    if "categoria" in datos:
        producto.categoria_id = id_por_codigo(db, CategoriaProducto, datos.pop("categoria"))
    for campo, valor in datos.items():
        setattr(producto, campo, valor)
    db.commit()
    db.refresh(producto)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="producto.editar",
        accion="Editó el producto",
        elemento_tipo="producto",
        elemento=producto.nombre,
        detalle=", ".join(sorted(datos.keys()))[:500] or None,
    )
    return serialize_producto(producto)


@router.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    current_user: Usuario = Depends(requiere_permiso("productos.eliminar")),
    db: Session = Depends(get_db),
):
    tienda = _mi_tienda(current_user, db)
    producto = _mi_producto(producto_id, current_user, db)
    nombre_producto = producto.nombre
    # Soft delete: desactiva el producto conservando kardex, pedidos y donaciones.
    soft_delete_no_commit(db, producto)
    db.commit()
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="producto.eliminar",
        accion="Eliminó el producto",
        elemento_tipo="producto",
        elemento=nombre_producto,
    )
    return None


@router.get("/estadisticas")
def estadisticas(
    current_user: Usuario = Depends(requiere_permiso("reportes.ver_estadisticas")),
    db: Session = Depends(get_db),
):
    tienda = _mi_tienda(current_user, db)
    productos = db.query(Producto).filter(Producto.tienda_id == tienda.id).all()
    total = len(productos)
    activos = sum(1 for p in productos if p.activo)
    sin_stock = sum(1 for p in productos if (p.stock or 0) <= 0)
    total_ventas = sum((p.ventas or 0) for p in productos)
    ratings = [float(p.rating) for p in productos if p.rating]
    rating_promedio = round(sum(ratings) / len(ratings), 1) if ratings else 0
    top = sorted(productos, key=lambda p: (p.ventas or 0), reverse=True)[:7]

    ids_pedidos = _ids_pedidos_de_tienda(tienda.id, db)
    total_pedidos = len(ids_pedidos)
    ingresos = (
        db.query(func.coalesce(func.sum(PedidoItem.subtotal), 0))
        .join(Producto, Producto.id == PedidoItem.producto_id)
        .filter(Producto.tienda_id == tienda.id)
        .scalar()
    )
    return {
        "total_productos": total,
        "productos_activos": activos,
        "productos_sin_stock": sin_stock,
        "total_ventas": total_ventas,
        "rating_promedio": rating_promedio,
        "total_pedidos": total_pedidos,
        "ingresos": float(ingresos or 0),
        "top_productos": [
            {
                "id": p.id,
                "nombre": p.nombre,
                "ventas": p.ventas or 0,
                "precio": float(p.precio) if p.precio is not None else 0,
                "stock": p.stock or 0,
                "rating": float(p.rating) if p.rating is not None else 0,
            }
            for p in top
        ],
    }


def _ids_pedidos_de_tienda(tienda_id: int, db: Session):
    filas = (
        db.query(PedidoItem.pedido_id)
        .join(Producto, Producto.id == PedidoItem.producto_id)
        .filter(Producto.tienda_id == tienda_id)
        .distinct()
        .all()
    )
    return [pid for (pid,) in filas]


@router.get("/pedidos")
def mis_pedidos(
    current_user: Usuario = Depends(requiere_permiso("pedidos.ver")),
    db: Session = Depends(get_db),
):
    tienda = _mi_tienda(current_user, db)
    ids = _ids_pedidos_de_tienda(tienda.id, db)
    if not ids:
        return []
    pedidos = db.query(Pedido).filter(Pedido.id.in_(ids)).order_by(Pedido.creado_en.desc()).all()
    return [serialize_pedido(p, solo_tienda_id=tienda.id) for p in pedidos]


@router.get("/pedidos/{pedido_id}")
def obtener_mi_pedido(
    pedido_id: int,
    current_user: Usuario = Depends(requiere_permiso("pedidos.ver")),
    db: Session = Depends(get_db),
):
    tienda = _mi_tienda(current_user, db)
    if pedido_id not in _ids_pedidos_de_tienda(tienda.id, db):
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    return serialize_pedido(pedido, solo_tienda_id=tienda.id)


# Mensajes de notificacion al comprador segun el estado del pedido.
_NOTIF_ESTADO_PEDIDO = {
    "pagado": ("pago_confirmado", "El pago de tu pedido {num} fue confirmado."),
    "enviado": ("pedido_enviado", "¡Tu pedido {num} ha sido enviado!"),
    "entregado": ("pedido_entregado", "Tu pedido {num} fue entregado. ¡Gracias por tu compra!"),
    "cancelado": ("pedido_cancelado", "Tu pedido {num} ha sido cancelado."),
}

# Estados considerados "aceptar pedido" dentro del flujo de la tienda.
_ESTADOS_ACEPTADOS = {"pagado", "enviado", "entregado"}


@router.patch("/pedidos/{pedido_id}/estado")
def cambiar_estado_pedido(
    pedido_id: int,
    payload: EstadoPedidoUpdate,
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    """Cambia el estado de un pedido.

    Valida permisos en el backend segun la accion:
      - estado 'cancelado'  -> requiere 'pedidos.rechazar'
      - estado aceptado     -> requiere 'pedidos.aceptar'
      - cualquier cambio    -> requiere 'pedidos.cambiar_estado'
    """
    from app.core.permisos import tiene_permiso

    tienda = _mi_tienda(current_user, db)
    if pedido_id not in _ids_pedidos_de_tienda(tienda.id, db):
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Validacion de permisos por accion
    puede_cambiar = tiene_permiso(db, current_user, "pedidos.cambiar_estado")
    if payload.estado in _ESTADOS_ACEPTADOS:
        puede_aceptar = tiene_permiso(db, current_user, "pedidos.aceptar")
        if not (puede_cambiar or puede_aceptar):
            raise HTTPException(
                status_code=403,
                detail="No tienes permisos para aceptar pedidos",
            )
    elif payload.estado == "cancelado":
        puede_rechazar = tiene_permiso(db, current_user, "pedidos.rechazar")
        if not (puede_cambiar or puede_rechazar):
            raise HTTPException(
                status_code=403,
                detail="No tienes permisos para rechazar pedidos",
            )
    elif not puede_cambiar:
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos para cambiar el estado de los pedidos",
        )

    estado_id = id_por_codigo(db, EstadoPedido, payload.estado)
    if estado_id is None:
        raise HTTPException(status_code=400, detail="Estado de pedido invalido")
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    estado_anterior = pedido.estado_id
    pedido.estado_id = estado_id

    # Guarda numero de guia y transportadora si la tienda los envia
    if payload.numero_guia is not None:
        pedido.numero_guia = payload.numero_guia.strip() or None
    if payload.empresa_transportadora is not None:
        pedido.empresa_transportadora = payload.empresa_transportadora.strip() or None

    # Registra el cambio en el historial del pedido
    numero = f"PED-{pedido.id:05d}"
    _registrar_historial_pedido(db, pedido.id, estado_id, f"Estado actualizado a '{payload.estado}'")

    # Notifica al comprador si el estado cambio realmente
    if pedido.usuario_id and estado_anterior != estado_id:
        tipo, plantilla = _NOTIF_ESTADO_PEDIDO.get(
            payload.estado, ("pedido_actualizado", "El estado de tu pedido {num} ha cambiado.")
        )
        mensaje = plantilla.format(num=numero)
        # Adjunta datos de envio en la notificacion de envio
        if payload.estado == "enviado" and (pedido.empresa_transportadora or pedido.numero_guia):
            extras = []
            if pedido.empresa_transportadora:
                extras.append(f"Transportadora: {pedido.empresa_transportadora}")
            if pedido.numero_guia:
                extras.append(f"guía: {pedido.numero_guia}")
            mensaje += " " + ", ".join(extras) + "."
        crear_notificacion(db, pedido.usuario_id, tipo, mensaje, f"/mis-pedidos/{pedido.id}")

    db.commit()
    db.refresh(pedido)
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="pedido.estado",
        accion="Cambió el estado del pedido",
        elemento_tipo="pedido",
        elemento=f"PED-{pedido.id:05d}",
        detalle=f"Nuevo estado: {payload.estado}",
    )
    return serialize_pedido(pedido, solo_tienda_id=tienda.id)


@router.put("/cambiar-password")
def cambiar_password(
    payload: PasswordUpdate,
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    """Cambia la contrasena del usuario autenticado (super admin o admin).

    La política y complejidad de la nueva contraseña se validan en el esquema
    ``PasswordUpdate`` (backend = fuente de verdad).
    """
    if not verify_password(payload.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    current_user.hashed_password = get_password_hash(payload.password_nueva)
    db.commit()
    try:
        tienda = _mi_tienda(current_user, db)
        registrar_actividad(
            db, tienda.id, current_user,
            tipo_accion="configuracion.password",
            accion="Cambió su contraseña de acceso",
            elemento_tipo="configuracion",
            elemento="Contraseña",
        )
    except Exception:
        pass
    return {"ok": True}


# ============================================================
# ENDPOINT: Kardex de inventario de un producto
# ============================================================
def _parse_fecha_kardex(value: str, fin_de_dia: bool = False) -> datetime:
    """Convierte 'YYYY-MM-DD' o ISO 8601 a datetime. Si ``fin_de_dia`` es True
    ajusta la hora al final del día para que el filtro 'hasta' sea inclusivo."""
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        try:
            dt = datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Formato de fecha inválido. Usa YYYY-MM-DD.",
            )
    if fin_de_dia:
        dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    return dt


def _resumen_kardex(producto: Producto, historial: List) -> dict:
    """Calcula Stock actual, costo promedio y valor total del inventario a
    partir del historial completo (sin filtros) del producto.

    El costo promedio usa el metodo de costo promedio ponderado: el último
    movimiento ya trae el saldo en valor, por lo que costo_promedio =
    saldo_valor / saldo_cantidad.
    """
    if historial:
        ultimo = historial[-1]  # historial viene en orden ascendente
        stock_actual = ultimo.saldo_cantidad or 0
        valor_total = round(float(ultimo.saldo_valor or 0), 2)
        costo_promedio = round(valor_total / stock_actual, 2) if stock_actual else 0
    else:
        # Sin movimientos registrados: se usa stock y precio actuales del producto.
        stock_actual = producto.stock or 0
        costo_promedio = float(producto.precio) if producto.precio is not None else 0
        valor_total = round(stock_actual * costo_promedio, 2)
    return {
        "stock_actual": stock_actual,
        "costo_promedio": costo_promedio,
        "valor_total_inventario": valor_total,
    }


@router.get("/kardex/{producto_id}")
def kardex_producto(
    producto_id: int,
    fecha_inicio: str = None,
    fecha_fin: str = None,
    tipo_movimiento: str = None,
    orden: str = "desc",
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    """Kardex de inventario de un producto de mi tienda (rol tienda_aliada).

    - Filtros por querystring: ``fecha_inicio``, ``fecha_fin``, ``tipo_movimiento``
      (ENTRADA | SALIDA | AJUSTE_POSITIVO | AJUSTE_NEGATIVO).
    - ``orden``: 'asc' (cronológico) o 'desc' (más reciente primero).
    - Retorna el historial de movimientos + resumen del producto
      (stock actual, costo promedio y valor total del inventario).
    """
    producto = _mi_producto(producto_id, current_user, db)

    # Historial completo (sin filtros) para el resumen real del producto.
    historial = (
        db.query(MovimientoKardex)
        .filter(MovimientoKardex.producto_id == producto.id)
        .order_by(MovimientoKardex.creado_en.asc(), MovimientoKardex.id.asc())
        .all()
    )
    resumen = _resumen_kardex(producto, historial)

    # Consulta con filtros.
    query = db.query(MovimientoKardex).filter(MovimientoKardex.producto_id == producto.id)
    if fecha_inicio:
        query = query.filter(MovimientoKardex.creado_en >= _parse_fecha_kardex(fecha_inicio))
    if fecha_fin:
        query = query.filter(MovimientoKardex.creado_en <= _parse_fecha_kardex(fecha_fin, fin_de_dia=True))
    if tipo_movimiento:
        tipo = tipo_movimiento.strip().upper()
        if tipo not in TIPOS_MOVIMIENTO_KARDEX:
            raise HTTPException(
                status_code=400,
                detail=f"tipo_movimiento inválido. Valores permitidos: {', '.join(TIPOS_MOVIMIENTO_KARDEX)}",
            )
        query = query.filter(MovimientoKardex.tipo_movimiento == tipo)

    if orden not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="orden inválido. Usa 'asc' o 'desc'.")

    movimientos = (
        query.order_by(
            MovimientoKardex.creado_en.asc() if orden == "asc" else MovimientoKardex.creado_en.desc(),
            MovimientoKardex.id.asc() if orden == "asc" else MovimientoKardex.id.desc(),
        ).all()
    )

    return {
        "producto": serialize_producto(producto),
        "resumen": resumen,
        "movimientos": [serialize_movimiento_kardex(m) for m in movimientos],
    }
# HELPERS: Actividad / Donaciones / PQRS de la Tienda
# ============================================================
def _subir_adjuntos(adjuntos):
    """Sube a Cloudinary los adjuntos que lleguen como imagen_base64.

    Devuelve una lista de dicts {nombre_archivo, url} listos para persistir.
    Los adjuntos que ya traen una URL publica se conservan tal cual.
    """
    resultados = []
    for adj in (adjuntos or []):
        if getattr(adj, "imagen_base64", None):
            try:
                subido = subir_imagen_producto(adj.imagen_base64, etiqueta="pqrs-adjunto")
                resultados.append({
                    "nombre_archivo": adj.nombre_archivo or "adjunto.jpg",
                    "url": subido["url"],
                })
            except Exception as exc:
                logger.warning("[tienda] No se pudo subir adjunto PQRS: %s", exc)
        elif getattr(adj, "url", None):
            resultados.append({
                "nombre_archivo": adj.nombre_archivo or "adjunto",
                "url": adj.url,
            })
    return resultados


def _serialize_actividad(a: TiendaActividad) -> dict:
    return {
        "id": a.id,
        "usuario_id": a.usuario_id,
        "usuario": a.usuario_nombre,
        "rol": a.rol_usuario,
        "tipo_accion": a.tipo_accion,
        "accion": a.accion,
        "elemento_tipo": a.elemento_tipo,
        "elemento": a.elemento,
        "detalle": a.detalle,
        "creado_en": a.creado_en.isoformat() if a.creado_en else None,
    }


def _serialize_donacion(d: Donacion) -> dict:
    return {
        "id": d.id,
        "tienda_id": d.tienda_id,
        "refugio_id": d.refugio_id,
        "refugio_nombre": d.refugio_nombre,
        "usuario_id": d.usuario_id,
        "usuario": d.usuario_nombre,
        "rol": d.rol_usuario,
        "observacion": d.observacion,
        "estado": d.estado,
        "creado_en": d.creado_en.isoformat() if d.creado_en else None,
        "items": [
            {
                "id": it.id,
                "producto_id": it.producto_id,
                "nombre_producto": it.nombre_producto,
                "cantidad": it.cantidad,
            }
            for it in d.items
        ],
    }


def _serialize_pqrs(p: TiendaPqrs) -> dict:
    return {
        "id": p.id,
        "tienda_id": p.tienda_id,
        "tienda_nombre": p.tienda_nombre,
        "usuario_id": p.usuario_id,
        "tipo": p.tipo,
        "asunto": p.asunto,
        "descripcion": p.descripcion,
        "estado": p.estado,
        "creado_en": p.creado_en.isoformat() if p.creado_en else None,
        "actualizado_en": p.actualizado_en.isoformat() if p.actualizado_en else None,
        "mensajes": [
            {
                "id": m.id,
                "usuario_id": m.usuario_id,
                "nombre_remitente": m.nombre_remitente,
                "rol_remitente": m.rol_remitente,
                "mensaje": m.mensaje,
                "creado_en": m.creado_en.isoformat() if m.creado_en else None,
            }
            for m in p.mensajes
        ],
        "adjuntos": [
            {
                "id": a.id,
                "nombre_archivo": a.nombre_archivo,
                "url": a.url,
                "creado_en": a.creado_en.isoformat() if a.creado_en else None,
            }
            for a in p.adjuntos
        ],
    }


# ============================================================
# ENDPOINT: Historial de actividad de mi tienda
# ============================================================
@router.get("/actividades")
def historial_actividad(
    busqueda: Optional[str] = None,
    usuario_id: Optional[int] = None,
    tipo_accion: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    limite: int = 100,
    current_user: Usuario = Depends(requiere_permiso("historial.ver")),
    db: Session = Depends(get_db),
):
    """Historial de actividad de la tienda autenticada, leido desde la BD.

    Permite buscar, filtrar por usuario, por tipo de accion y por rango de
    fechas. Siempre se ordena por actividad mas reciente.
    """
    tienda = _mi_tienda(current_user, db)
    q = db.query(TiendaActividad).filter(TiendaActividad.tienda_id == tienda.id)

    if usuario_id:
        q = q.filter(TiendaActividad.usuario_id == usuario_id)
    if tipo_accion:
        q = q.filter(TiendaActividad.tipo_accion == tipo_accion)

    # Filtro por rango de fechas (formato ISO: YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS)
    if fecha_desde:
        try:
            q = q.filter(TiendaActividad.creado_en >= datetime.fromisoformat(fecha_desde))
        except ValueError:
            raise HTTPException(status_code=400, detail="fecha_desde invalida (usa YYYY-MM-DD)")
    if fecha_hasta:
        try:
            q = q.filter(TiendaActividad.creado_en <= datetime.fromisoformat(fecha_hasta))
        except ValueError:
            raise HTTPException(status_code=400, detail="fecha_hasta invalida (usa YYYY-MM-DD)")

    if busqueda:
        termino = f"%{busqueda.strip()}%"
        q = q.filter(
            TiendaActividad.accion.ilike(termino)
            | TiendaActividad.usuario_nombre.ilike(termino)
            | TiendaActividad.elemento.ilike(termino)
            | TiendaActividad.detalle.ilike(termino)
        )

    limite = max(1, min(limite, 500))
    filas = (
        q.order_by(TiendaActividad.creado_en.desc())
        .limit(limite)
        .all()
    )
    return [_serialize_actividad(a) for a in filas]


# ============================================================
# ENDPOINT: Refugios registrados (para donar)
# ============================================================
@router.get("/refugios")
def refugios_para_donar(
    current_user: Usuario = Depends(requiere_permiso("donaciones.ver")),
    db: Session = Depends(get_db),
):
    """Lista los refugios registrados (verificados) para seleccionar al donar."""
    refugios = (
        db.query(Refugio)
        .filter(Refugio.verificado == True)  # noqa: E712
        .order_by(Refugio.nombre.asc())
        .all()
    )
    return [
        {
            "id": r.id,
            "nombre": r.nombre,
            "logo_url": r.logo_url,
            "ubicacion": r.ubicacion,
            "ciudad": getattr(r, "municipio", None) or r.ubicacion,
            "departamento": r.departamento,
            "municipio": r.municipio,
            "verificado": r.verificado,
        }
        for r in refugios
    ]


# ============================================================
# ENDPOINTS: Donaciones de mi tienda
# ============================================================
@router.post("/donaciones", status_code=status.HTTP_201_CREATED)
def crear_donacion(
    payload: DonacionCreate,
    current_user: Usuario = Depends(requiere_permiso("donaciones.crear")),
    db: Session = Depends(get_db),
):
    """Registra una donacion de productos a un refugio.

    Valida el stock disponible, descuenta la cantidad donada, registra la
    accion en el Historial de Actividad y notifica al refugio beneficiado.
    """
    tienda = _mi_tienda(current_user, db)

    refugio = db.query(Refugio).filter(Refugio.id == payload.refugio_id).first()
    if not refugio:
        raise HTTPException(status_code=404, detail="Refugio no encontrado")

    # Valida los productos antes de tocar el stock (transaccion segura).
    productos = []
    for item in payload.items:
        producto = (
            db.query(Producto)
            .filter(Producto.id == item.producto_id, Producto.tienda_id == tienda.id)
            .first()
        )
        if not producto:
            raise HTTPException(
                status_code=404,
                detail=f"Producto {item.producto_id} no encontrado o no pertenece a tu tienda",
            )
        stock_actual = producto.stock or 0
        if item.cantidad > stock_actual:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No hay stock suficiente de '{producto.nombre}': "
                    f"disponible {stock_actual}, solicitado {item.cantidad}"
                ),
            )
        productos.append((producto, item))

    nombre_usuario = f"{current_user.nombre} {current_user.apellido or ''}".strip()
    from app.core.actividad import rol_usuario_tienda
    rol = rol_usuario_tienda(db, current_user)

    donacion = Donacion(
        tienda_id=tienda.id,
        refugio_id=refugio.id,
        usuario_id=current_user.id,
        usuario_nombre=nombre_usuario,
        rol_usuario=rol,
        refugio_nombre=refugio.nombre,
        observacion=payload.observacion,
        estado="completada",
    )
    db.add(donacion)
    db.flush()

    # Crea los items y descuenta el stock en la misma transaccion.
    for producto, item in productos:
        db.add(DonacionItem(
            donacion_id=donacion.id,
            producto_id=producto.id,
            nombre_producto=producto.nombre,
            cantidad=item.cantidad,
        ))
        producto.stock = (producto.stock or 0) - item.cantidad

    db.commit()
    db.refresh(donacion)

    # Notifica al refugio beneficiado.
    if refugio.usuario_id:
        crear_notificacion(
            db,
            refugio.usuario_id,
            tipo="donacion_recibida",
            mensaje=(
                f"La tienda {tienda.nombre} realizó una donación de "
                f"{sum(i.cantidad for _, i in productos)} producto(s) a tu refugio."
            ),
            enlace="/refugio/dashboard",
        )
        try:
            db.commit()
        except Exception:
            db.rollback()

    # Registra la accion en el Historial de Actividad.
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="donacion.crear",
        accion="Realizó una donación",
        elemento_tipo="donacion",
        elemento=f"{len(productos)} producto(s) a {refugio.nombre}",
        detalle=(
            ", ".join(
                f"{p.nombre} x{it.cantidad}" for p, it in productos
            )[:1000]
        ),
    )

    return _serialize_donacion(donacion)


@router.get("/donaciones")
def listar_donaciones(
    current_user: Usuario = Depends(requiere_permiso("donaciones.ver")),
    db: Session = Depends(get_db),
):
    """Lista las donaciones realizadas por la tienda (mas recientes primero)."""
    tienda = _mi_tienda(current_user, db)
    donaciones = (
        db.query(Donacion)
        .filter(Donacion.tienda_id == tienda.id)
        .order_by(Donacion.creado_en.desc())
        .all()
    )
    return [_serialize_donacion(d) for d in donaciones]


@router.get("/donaciones/{donacion_id}")
def detalle_donacion(
    donacion_id: int,
    current_user: Usuario = Depends(requiere_permiso("donaciones.ver")),
    db: Session = Depends(get_db),
):
    """Detalle completo de una donacion de la tienda."""
    tienda = _mi_tienda(current_user, db)
    donacion = (
        db.query(Donacion)
        .filter(Donacion.id == donacion_id, Donacion.tienda_id == tienda.id)
        .first()
    )
    if not donacion:
        raise HTTPException(status_code=404, detail="Donacion no encontrada")
    return _serialize_donacion(donacion)


# ============================================================
# ENDPOINTS: PQRS de mi tienda (gestionadas por Admins de Adoptify)
# ============================================================
@router.post("/pqrs", status_code=status.HTTP_201_CREATED)
def crear_pqrs_tienda(
    payload: TiendaPqrsCreate,
    current_user: Usuario = Depends(requiere_permiso("pqrs.crear")),
    db: Session = Depends(get_db),
):
    """Crea una PQRS desde la tienda.

    Notifica a los Administradores de Adoptify para que la gestionen y registra
    la accion en el Historial de Actividad.
    """
    tienda = _mi_tienda(current_user, db)
    nombre_usuario = f"{current_user.nombre} {current_user.apellido or ''}".strip()

    adjuntos = _subir_adjuntos(payload.adjuntos)

    pqrs = TiendaPqrs(
        tienda_id=tienda.id,
        tienda_nombre=tienda.nombre,
        usuario_id=current_user.id,
        tipo=payload.tipo,
        asunto=payload.asunto,
        descripcion=payload.descripcion,
        estado="pendiente",
    )
    db.add(pqrs)
    db.flush()

    # Primer mensaje: la descripcion inicial de la PQRS.
    db.add(TiendaPqrsMensaje(
        pqrs_id=pqrs.id,
        usuario_id=current_user.id,
        nombre_remitente=nombre_usuario,
        rol_remitente="tienda",
        mensaje=payload.descripcion,
    ))

    for adj in adjuntos:
        db.add(TiendaPqrsAdjunto(
            pqrs_id=pqrs.id,
            nombre_archivo=adj["nombre_archivo"],
            url=adj["url"],
        ))

    db.commit()
    db.refresh(pqrs)

    # Notifica a los Administradores de Adoptify.
    notificar_admins(
        db,
        tipo="pqrs_tienda",
        mensaje=f"Nueva PQRS de {tienda.nombre}: {pqrs.asunto}",
        enlace="/admin/pqrs",
    )
    try:
        db.commit()
    except Exception:
        db.rollback()

    # Registra la accion en el Historial de Actividad.
    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="pqrs.crear",
        accion="Creó una PQRS",
        elemento_tipo="pqrs",
        elemento=pqrs.asunto,
        detalle=f"Categoría: {pqrs.tipo}",
    )

    # IA / n8n: clasifica y prioriza la PQRS (WF-2) para agilizar su gestion.
    try:
        crear_tarea_ia(db, "clasificar_pqrs", {
            "pqrs_id": pqrs.id,
            "tienda_id": tienda.id,
            "tienda_nombre": tienda.nombre,
            "tipo": pqrs.tipo,
            "asunto": pqrs.asunto,
            "descripcion": pqrs.descripcion,
        })
    except Exception as exc:
        logger.warning("[tienda] No se pudo encolar clasificacion de PQRS: %s", exc)

    return _serialize_pqrs(pqrs)


@router.get("/pqrs")
def listar_pqrs_tienda(
    current_user: Usuario = Depends(requiere_permiso("pqrs.ver")),
    db: Session = Depends(get_db),
):
    """Lista las PQRS de la tienda (mas recientes primero)."""
    tienda = _mi_tienda(current_user, db)
    filas = (
        db.query(TiendaPqrs)
        .filter(TiendaPqrs.tienda_id == tienda.id)
        .order_by(TiendaPqrs.creado_en.desc())
        .all()
    )
    return [_serialize_pqrs(p) for p in filas]


@router.get("/pqrs/{pqrs_id}")
def detalle_pqrs_tienda(
    pqrs_id: int,
    current_user: Usuario = Depends(requiere_permiso("pqrs.ver")),
    db: Session = Depends(get_db),
):
    """Detalle completo de una PQRS de la tienda (mensajes + adjuntos)."""
    tienda = _mi_tienda(current_user, db)
    pqrs = (
        db.query(TiendaPqrs)
        .filter(TiendaPqrs.id == pqrs_id, TiendaPqrs.tienda_id == tienda.id)
        .first()
    )
    if not pqrs:
        raise HTTPException(status_code=404, detail="PQRS no encontrada")
    return _serialize_pqrs(pqrs)


@router.post("/pqrs/{pqrs_id}/responder")
def responder_pqrs_tienda(
    pqrs_id: int,
    payload: TiendaPqrsRespuestaCreate,
    current_user: Usuario = Depends(requiere_permiso("pqrs.responder")),
    db: Session = Depends(get_db),
):
    """La tienda responde a una PQRS (conversacion con Admins de Adoptify)."""
    tienda = _mi_tienda(current_user, db)
    pqrs = (
        db.query(TiendaPqrs)
        .filter(TiendaPqrs.id == pqrs_id, TiendaPqrs.tienda_id == tienda.id)
        .first()
    )
    if not pqrs:
        raise HTTPException(status_code=404, detail="PQRS no encontrada")
    if pqrs.estado == "finalizado":
        raise HTTPException(status_code=400, detail="Esta PQRS ya está finalizada")

    nombre_usuario = f"{current_user.nombre} {current_user.apellido or ''}".strip()

    mensaje = TiendaPqrsMensaje(
        pqrs_id=pqrs.id,
        usuario_id=current_user.id,
        nombre_remitente=nombre_usuario,
        rol_remitente="tienda",
        mensaje=payload.mensaje,
    )
    db.add(mensaje)
    db.flush()

    adjuntos = _subir_adjuntos(payload.adjuntos)
    for adj in adjuntos:
        db.add(TiendaPqrsAdjunto(
            pqrs_id=pqrs.id,
            mensaje_id=mensaje.id,
            nombre_archivo=adj["nombre_archivo"],
            url=adj["url"],
        ))

    pqrs.actualizado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pqrs)

    # Notifica a los Administradores de Adoptify.
    notificar_admins(
        db,
        tipo="pqrs_tienda",
        mensaje=f"{tienda.nombre} respondió la PQRS: {pqrs.asunto}",
        enlace="/admin/pqrs",
    )
    try:
        db.commit()
    except Exception:
        db.rollback()

    registrar_actividad(
        db, tienda.id, current_user,
        tipo_accion="pqrs.responder",
        accion="Respondió una PQRS",
        elemento_tipo="pqrs",
        elemento=pqrs.asunto,
    )

    return _serialize_pqrs(pqrs)
