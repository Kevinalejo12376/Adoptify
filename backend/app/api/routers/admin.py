"""Endpoints del panel de administracion. Solo para usuarios con rol
'administrador' o 'administrador_principal'. Permite gestionar (crear, listar,
editar, eliminar) usuarios, administradores, refugios y tiendas aliadas."""
# pyrefly: ignore [missing-import]
from datetime import datetime, timezone, timedelta
import logging
import secrets
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Query
# pyrefly: ignore [missing-import]
from sqlalchemy import func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session, joinedload
# pyrefly: ignore [missing-import]
from typing import Optional, List

from app.db.database import get_db
from app.core.config import settings
from app.core.security import get_current_admin, get_password_hash
from app.core.lookups import id_por_codigo
from app.core.softdelete import soft_delete, soft_delete_no_commit, liberar_slug, liberar_email
from app.models.usuario import Usuario
from app.models.refugio import Refugio
from app.models.mascota import Mascota
from app.models.solicitud import SolicitudAdopcion
from app.models.producto import Producto
from app.models.tienda import Tienda, TiendaUsuario
from app.models.tienda_pqrs import TiendaPqrs, TiendaPqrsMensaje, TiendaPqrsAdjunto
from app.models.catalogos import Rol, TipoDocumento, EstadoMascota, TipoMascota, TamanoMascota, GeneroMascota
from app.models.foro import ForoPost
from app.models.interaccion import Resena
from app.models.solicitud_refugio import EnlaceCreacionPassword
from app.core.notificaciones import registrar_auditoria, crear_notificacion
from app.core.config import settings
from app.core.email import enviar_correo_cuenta_creada
from app.services.solicitudes_refugio import crear_enlace_password
from app.schemas.admin import (
    AdminUsuarioCreate, AdminUsuarioUpdate, AdminUsuarioResponse,
    TiendaCreate, TiendaUpdate, TiendaEstadoUpdate, TiendaResponse, TiendaResumen,
)
from app.schemas.tienda_extra import (
    AdminTiendaPqrsEstadoUpdate,
    AdminTiendaPqrsRespuestaCreate,
)
from app.schemas.mascota import MascotaUpdate
from app.schemas.serializers import serialize_mascota
from app.api.routers.mascotas import _sincronizar_imagenes_mascota, _componer_edad_valores
from app.services.cloudinary_service import subir_imagen_producto
from app.core.email import enviar_correo_restablecer_password_tienda

logger = logging.getLogger("admin")

router = APIRouter()


# Caché en memoria para id_por_codigo dentro de una misma request
_cache_ids = {}

def _id_codigo_cache(db: Session, Model, valor):
    """Idem id_por_codigo pero con caché en memoria para evitar consultas repetidas."""
    key = (Model.__tablename__, str(valor).strip().lower())
    if key not in _cache_ids:
        _cache_ids[key] = id_por_codigo(db, Model, valor)
    return _cache_ids[key]


@router.get("/estadisticas")
def estadisticas(_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Conteos reales desde la base de datos para el dashboard del admin.
    Optimizado para minimizar viajes redondos a la BD (∼3 consultas vs ∼11)."""
    # Limpiar caché al inicio de cada request
    _cache_ids.clear()

    # 1) Resolver IDs de catálogo (usando caché)
    rol_usuario_id = _id_codigo_cache(db, Rol, "usuario")

    # 2) Consulta única: contar usuarios por rol
    conteo_roles = dict(
        db.query(Usuario.rol_id, func.count(Usuario.id))
        .group_by(Usuario.rol_id)
        .all()
    )
    # 3) Consulta única: conteos de mascotas agrupados por estado
    conteo_mascotas_estado = dict(
        db.query(Mascota.estado_id, func.count(Mascota.id))
        .group_by(Mascota.estado_id)
        .all()
    )

    # 4) Total de administradores (2 roles)
    total_administradores = (
        db.query(Usuario).join(Rol, Rol.id == Usuario.rol_id)
        .filter(Rol.codigo.in_(["administrador", "administrador_principal"]))
        .count()
    )

    # Resolver IDs de estados de mascota para las llaves del response
    adoptado_id = _id_codigo_cache(db, EstadoMascota, "adoptado")
    disponible_id = _id_codigo_cache(db, EstadoMascota, "disponible")

    return {
        "usuarios": conteo_roles.get(rol_usuario_id, 0) if rol_usuario_id else 0,
        "refugios": db.query(Refugio).count(),
        "administradores": total_administradores,
        "mascotas": sum(conteo_mascotas_estado.values()),
        "mascotas_disponibles": conteo_mascotas_estado.get(disponible_id, 0) if disponible_id else 0,
        "mascotas_adoptadas": conteo_mascotas_estado.get(adoptado_id, 0) if adoptado_id else 0,
        "solicitudes": db.query(SolicitudAdopcion).count(),
        "productos": db.query(Producto).count(),
        "foro_posts": db.query(ForoPost).count(),
        "resenas": db.query(Resena).count(),
    }

ROLES_VALIDOS = {"usuario", "refugio", "administrador", "administrador_principal", "tienda_aliada"}

# Descripción legible de cada rol para el correo de cuenta creada.
ROLES_CUENTA_LEGIBLE = {
    "usuario": "Usuario de Adoptify",
    "refugio": "Representante de un Refugio de Adoptify",
    "administrador": "Subadministrador de Adoptify",
    "administrador_principal": "Administrador Principal de Adoptify",
    "tienda_aliada": "Representante de una Tienda Aliada de Adoptify",
}


def _slugify(texto: str) -> str:
    base = "".join(c.lower() if c.isalnum() else "-" for c in texto).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return base or "refugio"


def _serialize(u: Usuario) -> dict:
    return {
        "id": u.id,
        "nombre": u.nombre,
        "apellido": u.apellido,
        "email": u.email,
        "telefono": u.telefono,
        "activo": u.activo,
        "ubicacion": u.ubicacion,
        "rol": u.rol.codigo if u.rol else None,
        "rol_nombre": u.rol.nombre if u.rol else None,
        "refugio_nombre": u.refugio.nombre if u.refugio else None,
        "creado_en": u.creado_en.isoformat() if u.creado_en else None,
    }


@router.get("/productos")
def listar_productos_admin(_admin: Usuario = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Lista TODOS los productos con su vendedor (tienda o refugio)."""
    productos = db.query(Producto).order_by(Producto.creado_en.desc()).all()
    ref_ids = {p.refugio_id for p in productos if p.refugio_id}
    refs = {}
    if ref_ids:
        refs = {r.id: r.nombre for r in db.query(Refugio).filter(Refugio.id.in_(ref_ids)).all()}
    resultado = []
    for p in productos:
        vendedor = p.tienda.nombre if p.tienda else refs.get(p.refugio_id)
        resultado.append({
            "id": p.id,
            "nombre": p.nombre,
            "categoria": p.categoria.nombre if p.categoria else None,
            "precio": float(p.precio) if p.precio is not None else 0,
            "stock": p.stock,
            "activo": p.activo,
            "vendedor": vendedor or "—",
            "tipo_vendedor": "Tienda" if p.tienda_id else ("Refugio" if p.refugio_id else "—"),
            "creado_en": p.creado_en.isoformat() if p.creado_en else None,
        })
    return resultado


@router.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto_admin(
    producto_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    # Soft delete: desactiva el producto conservando reseñas, favoritos y kardex.
    soft_delete(db, p)
    return None


@router.get("/mascotas")
def listar_mascotas_admin(
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
    limite: int = Query(200, ge=1, le=1000, description="Maximo de mascotas a devolver"),
):
    """Lista mascotas activas (de todos los refugios) para supervision del admin.
    Las mascotas desactivadas por soft delete no aparecen en el listado normal.
    Con paginación (max 1000) y joinedload para evitar N+1 queries."""
    mascotas = (
        db.query(Mascota)
        .filter(Mascota.activo == True)  # noqa: E712
        .options(joinedload(Mascota.tipo), joinedload(Mascota.estado), joinedload(Mascota.refugio))
        .order_by(Mascota.creado_en.desc())
        .limit(limite)
        .all()
    )
    return [
        {
            "id": m.id,
            "nombre": m.nombre,
            "tipo": m.tipo.nombre if m.tipo else None,
            "raza": m.raza,
            "edad": m.edad,
            "estado": m.estado.codigo if m.estado else None,
            "refugio": m.refugio.nombre if m.refugio else None,
            "refugio_id": m.refugio_id,
            "creado_en": m.creado_en.isoformat() if m.creado_en else None,
        }
        for m in mascotas
    ]


@router.delete("/mascotas/{mascota_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_mascota_admin(
    mascota_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    m = db.query(Mascota).filter(Mascota.id == mascota_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    # Soft delete: desactiva la mascota conservando su historial de adopción.
    soft_delete(db, m)
    return None


@router.get("/mascotas/{mascota_id}")
def obtener_mascota_admin(
    mascota_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Detalle completo de una mascota para el panel admin. Incluye las imágenes
    y también los registros desactivados por soft delete (activo=False)."""
    m = db.query(Mascota).filter(Mascota.id == mascota_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    return serialize_mascota(m)


@router.put("/mascotas/{mascota_id}")
def actualizar_mascota_admin(
    mascota_id: int,
    payload: MascotaUpdate,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Actualiza los datos de una mascota desde el panel admin (misma lógica y
    validaciones que la actualización del refugio)."""
    mascota = db.query(Mascota).filter(Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")

    datos = payload.model_dump(exclude_unset=True)
    # Las imágenes se sincronizan aparte (relación mascota_imagenes).
    imagenes = datos.pop("imagenes", None)
    # Resuelve los campos de catálogo (código/nombre -> id)
    if "tipo" in datos:
        mascota.tipo_id = id_por_codigo(db, TipoMascota, datos.pop("tipo"), requerido=True)
    if "tamano" in datos:
        mascota.tamano_id = id_por_codigo(db, TamanoMascota, datos.pop("tamano"))
    if "genero" in datos:
        mascota.genero_id = id_por_codigo(db, GeneroMascota, datos.pop("genero"))
    if "estado" in datos:
        mascota.estado_id = id_por_codigo(db, EstadoMascota, datos.pop("estado"), requerido=True)
    # Compone la edad estructurada (valor + unidad) en texto antes de asignar.
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


@router.get("/usuarios", response_model=List[AdminUsuarioResponse])
def listar_usuarios(
    rol: Optional[str] = Query(None, description="Filtrar por rol (codigo)"),
    limite: int = Query(100, ge=1, le=500, description="Maximo de registros a devolver"),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista usuarios con paginación opcional por rol.
    Devuelve hasta `limite` registros (default 100, max 500) para evitar
    timeouts cuando hay muchos usuarios."""
    query = db.query(Usuario).options(joinedload(Usuario.rol), joinedload(Usuario.refugio))
    if rol:
        rol_id = id_por_codigo(db, Rol, rol)
        if rol_id:
            query = query.filter(Usuario.rol_id == rol_id)
    return [_serialize(u) for u in query.order_by(Usuario.creado_en.desc()).limit(limite).all()]


@router.post("/usuarios", response_model=AdminUsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    payload: AdminUsuarioCreate,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if payload.rol not in ROLES_VALIDOS:
        raise HTTPException(status_code=400, detail="Rol invalido")
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(status_code=400, detail="El correo ya esta registrado")

    rol_obj = db.query(Rol).filter(Rol.codigo == payload.rol).first()
    if rol_obj is None:
        raise HTTPException(status_code=400, detail="Rol no encontrado en catalogo")

    user = Usuario(
        nombre=payload.nombre,
        apellido=payload.apellido,
        tipo_documento_id=id_por_codigo(db, TipoDocumento, payload.tipo_documento),
        numero_documento=payload.numero_documento,
        telefono=payload.telefono,
        email=payload.email,
        # Si no se define contraseña al crear, se usa un placeholder y el usuario
        # la establece con el enlace seguro enviado por correo (flujo de refugios).
        hashed_password=get_password_hash(payload.password or secrets.token_urlsafe(16)),
        rol_id=rol_obj.id,
        ubicacion=payload.ubicacion,
    )
    db.add(user)
    db.flush()

    if rol_obj.codigo == "refugio":
        nombre_refugio = payload.nombre_refugio or f"{payload.nombre} {payload.apellido or ''}".strip()
        slug = _slugify(nombre_refugio)
        if db.query(Refugio).filter(Refugio.slug == slug).first():
            slug = f"{slug}-{user.id}"
        db.add(Refugio(
            usuario_id=user.id,
            nombre=nombre_refugio,
            slug=slug,
            descripcion=payload.descripcion,
            telefono=payload.telefono,
            email=payload.email_contacto or payload.email,
            ubicacion=payload.ubicacion,
            direccion=payload.direccion,
            website=payload.website,
            facebook=payload.facebook,
            instagram=payload.instagram,
            anio_fundacion=payload.anio_fundacion,
        ))

    db.commit()
    db.refresh(user)

    # Genera un enlace seguro (24 h) y envía correo cuando la cuenta se crea SIN
    # contraseña definida (usuarios/administradores del panel, flujo de refugios).
    # Nunca se envía la contraseña en texto plano. Si el admin definió una
    # contraseña (p. ej. refugios/tiendas creados manualmente), se conserva el
    # flujo actual y no se envía el enlace.
    if not payload.password:
        try:
            enlace = crear_enlace_password(db, user.id)
            db.commit()
            url_crear = f"{settings.FRONTEND_URL}/crear-password/{enlace.token}"
            ok = enviar_correo_cuenta_creada(
                email_destino=user.email,
                nombre=f"{payload.nombre} {payload.apellido or ''}".strip(),
                enlace_crear_password=url_crear,
                rol=ROLES_CUENTA_LEGIBLE.get(rol_obj.codigo, ""),
            )
            if ok:
                logger.info("Correo de cuenta creada ENVIADO a %s", user.email)
            else:
                logger.warning("Correo de cuenta creada NO enviado a %s (correo no configurado?)", user.email)
        except Exception as exc:
            logger.error("Error al enviar correo de cuenta creada a %s: %s", user.email, exc)

    registrar_auditoria(db, _admin.id, "crear_usuario", "usuarios", user.id, f"Rol: {rol_obj.codigo}")
    db.commit()
    return _serialize(user)


@router.patch("/usuarios/{usuario_id}", response_model=AdminUsuarioResponse)
def actualizar_usuario(
    usuario_id: int,
    payload: AdminUsuarioUpdate,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = payload.model_dump(exclude_unset=True)

    # Si viene password, aplicar hash antes de guardar
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    # Si se actualiza el email, verificar que no esté duplicado ANTES de
    # sobrescribir el valor en memoria (si se hace después, la comparación
    # `update_data["email"] != user.email` siempre es False y no se detecta).
    if "email" in update_data and update_data["email"] != user.email:
        existe = db.query(Usuario).filter(
            Usuario.email == update_data["email"],
            Usuario.id != usuario_id
        ).first()
        if existe:
            raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")

    for campo, valor in update_data.items():
        setattr(user, campo, valor)

    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_usuario(
    usuario_id: int,
    admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if usuario_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.rol_codigo == "administrador_principal":
        raise HTTPException(status_code=400, detail="No se puede eliminar al administrador principal")
    # Soft delete: libera el email (unicidad) y desactiva la cuenta.
    liberar_email(db, user)
    soft_delete(db, user)
    return None


# ============================================================
# ENDPOINTS PARA GESTION DE TIENDAS ALIADAS
# ============================================================


def _serialize_tienda(t: Tienda) -> dict:
    """Serializa una tienda con datos del usuario responsable asociado."""
    user = t.usuario
    resp_nombre = f"{user.nombre} {user.apellido or ''}".strip() if user else None
    productos = t.productos or []
    return {
        "id": t.id,
        "usuario_id": t.usuario_id,
        "nombre": t.nombre,
        "slug": t.slug,
        "descripcion": t.descripcion,
        "ubicacion": t.ubicacion,
        "ciudad": t.ciudad or t.ubicacion,
        "direccion": t.direccion,
        "logo_url": t.logo_url,
        "estado": t.estado or "activa",
        "telefono": t.telefono,
        "email": t.email,
        "website": t.website,
        "facebook": t.facebook,
        "instagram": t.instagram,
        "rating": float(t.rating) if t.rating is not None else 0,
        "creado_en": t.creado_en.isoformat() if t.creado_en else None,
        "total_productos": len(productos),
        "total_ventas": sum((p.ventas or 0) for p in productos),
        "ultimo_login": None,
        # Datos del usuario responsable (su correo es el de inicio de sesion)
        "usuario_email": user.email if user else None,
        "usuario_nombre": resp_nombre,
        "usuario_telefono": user.telefono if user else None,
        "usuario_activo": user.activo if user else True,
        "usuario_rol": user.rol_codigo if user else None,
        "responsable_nombre": resp_nombre,
        "responsable_email": user.email if user else None,
        "responsable_telefono": user.telefono if user else None,
    }


@router.get("/tiendas/resumen", response_model=TiendaResumen)
def resumen_tiendas(
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Resumen estadístico de tiendas aliadas."""
    total = db.query(Tienda).count()
    # Estado basado en la columna estado de la tienda
    activas = db.query(Tienda).filter(Tienda.estado == "activa").count()
    suspendidas = db.query(Tienda).filter(Tienda.estado == "suspendida").count()
    pendientes = db.query(Tienda).filter(Tienda.estado == "pendiente").count()
    total_productos = db.query(Producto).filter(Producto.tienda_id.isnot(None)).count()
    total_ventas = db.query(func.sum(Producto.ventas)).filter(Producto.tienda_id.isnot(None)).scalar() or 0
    return {
        "total": total,
        "activas": activas,
        "suspendidas": suspendidas,
        "pendientes": pendientes,
        "total_productos": total_productos,
        "total_ventas": total_ventas,
    }


@router.get("/tiendas", response_model=List[TiendaResponse])
def listar_tiendas(
    estado: Optional[str] = Query(None, description="Filtrar por estado: activa, suspendida, pendiente"),
    busqueda: Optional[str] = Query(None, description="Buscar por nombre, email, ciudad o responsable"),
    ciudad: Optional[str] = Query(None, description="Filtrar por ciudad"),
    ordenar: Optional[str] = Query("recientes", description="recientes, antiguas, nombre_asc, nombre_desc"),
    pagina: int = Query(1, ge=1, description="Numero de pagina"),
    por_pagina: int = Query(10, ge=1, le=50, description="Registros por pagina"),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista tiendas aliadas con filtros, búsqueda, ordenamiento y paginación."""
    query = db.query(Tienda).options(joinedload(Tienda.usuario))

    # Filtro por estado. Por defecto (sin filtro) SOLO se muestran tiendas aprobadas
    # (activa/suspendida); las solicitudes pendientes viven en "Solicitudes de Tienda"
    # y no deben aparecer aquí como tienda activa.
    if estado and estado in ("activa", "pendiente", "suspendida"):
        query = query.filter(Tienda.estado == estado)
    else:
        query = query.filter(Tienda.estado.in_(["activa", "suspendida"]))

    # Búsqueda por texto (solo columnas existentes)
    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(
            Tienda.nombre.ilike(termino)
            | Tienda.email.ilike(termino)
            | Tienda.ubicacion.ilike(termino)
        )

    # Filtro por ciudad (usa ubicacion)
    if ciudad:
        query = query.filter(Tienda.ubicacion.ilike(f"%{ciudad}%"))

    # Ordenamiento
    if ordenar == "antiguas":
        query = query.order_by(Tienda.creado_en.asc())
    elif ordenar == "nombre_asc":
        query = query.order_by(Tienda.nombre.asc())
    elif ordenar == "nombre_desc":
        query = query.order_by(Tienda.nombre.desc())
    else:
        query = query.order_by(Tienda.creado_en.desc())

    total = query.count()
    tiendas = query.offset((pagina - 1) * por_pagina).limit(por_pagina).all()

    return [
        {**_serialize_tienda(t), "total_registros": total}
        for t in tiendas
    ]


@router.get("/tiendas/{tienda_id}", response_model=TiendaResponse)
def obtener_tienda(
    tienda_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Obtiene una tienda aliada por su ID."""
    tienda = db.query(Tienda).options(joinedload(Tienda.usuario)).filter(Tienda.id == tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return _serialize_tienda(tienda)


@router.post("/tiendas", response_model=TiendaResponse, status_code=status.HTTP_201_CREATED)
def crear_tienda(
    payload: TiendaCreate,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Crea una tienda aliada + su usuario responsable (rol tienda_aliada).

    El correo del responsable es el de INICIO DE SESION. El correo de la
    tienda (payload.email) es solo de contacto/visualizacion.
    """
    # Validacion opcional de confirmacion (si el frontend la envia)
    if payload.confirmar_password and payload.password != payload.confirmar_password:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")

    login_email = (payload.responsable_email or "").strip().lower()
    if not login_email:
        raise HTTPException(status_code=400, detail="El correo del responsable es obligatorio")
    if db.query(Usuario).filter(Usuario.email == login_email).first():
        raise HTTPException(status_code=400, detail="Ese correo de responsable ya está registrado")

    estado = payload.estado if payload.estado in ("activa", "pendiente", "suspendida") else "activa"

    rol_tienda = db.query(Rol).filter(Rol.codigo == "tienda_aliada").first()
    if not rol_tienda:
        raise HTTPException(status_code=500, detail="Rol tienda_aliada no encontrado en catálogo")

    # 1. Usuario responsable (inicia sesion con su correo personal)
    partes = (payload.responsable_nombre or payload.nombre or "Responsable").strip().split(" ", 1)
    user = Usuario(
        nombre=partes[0] or "Responsable",
        apellido=partes[1] if len(partes) > 1 else None,
        email=login_email,
        hashed_password=get_password_hash(payload.password),
        rol_id=rol_tienda.id,
        telefono=payload.responsable_telefono,
        ubicacion=payload.ciudad,
        activo=True,
    )
    db.add(user)
    db.flush()

    # 2. Slug único
    slug = _slugify(payload.nombre)
    if db.query(Tienda).filter(Tienda.slug == slug).first():
        slug = f"{slug}-{user.id}"

    # 3. Crear tienda (el email es de contacto/display)
    tienda = Tienda(
        usuario_id=user.id,
        nombre=payload.nombre,
        slug=slug,
        descripcion=payload.descripcion,
        email=payload.email,
        telefono=payload.telefono,
        ubicacion=payload.ciudad,
        ciudad=payload.ciudad,
        direccion=payload.direccion,
        logo_url=payload.logo_url,
        estado=estado,
        website=payload.website,
        facebook=payload.facebook,
        instagram=payload.instagram,
    )
    db.add(tienda)
    db.commit()
    db.refresh(tienda)

    return _serialize_tienda(tienda)


@router.put("/tiendas/{tienda_id}", response_model=TiendaResponse)
def actualizar_tienda(
    tienda_id: int,
    payload: TiendaUpdate,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Actualiza los datos de una tienda aliada."""
    tienda = db.query(Tienda).options(joinedload(Tienda.usuario)).filter(Tienda.id == tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    update_data = payload.model_dump(exclude_unset=True)

    for campo, valor in update_data.items():
        if hasattr(tienda, campo):
            setattr(tienda, campo, valor)

    db.commit()
    db.refresh(tienda)
    return _serialize_tienda(tienda)


@router.patch("/tiendas/{tienda_id}/estado", response_model=TiendaResponse)
def cambiar_estado_tienda(
    tienda_id: int,
    payload: TiendaEstadoUpdate,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Cambia el estado activo/inactivo del usuario de la tienda."""
    if payload.estado not in ("activa", "suspendida", "pendiente"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    tienda = db.query(Tienda).options(joinedload(Tienda.usuario)).filter(Tienda.id == tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    # Guarda el estado en la tienda y refleja acceso en el usuario responsable
    tienda.estado = payload.estado
    if tienda.usuario:
        tienda.usuario.activo = (payload.estado == "activa")

    db.commit()
    db.refresh(tienda)
    return _serialize_tienda(tienda)


@router.post("/tiendas/{tienda_id}/restablecer-password")
def restablecer_password_tienda(
    tienda_id: int,
    nueva_password: str = Query(..., min_length=6, description="Nueva contraseña"),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Restablece la contraseña del usuario de una tienda aliada."""
    tienda = db.query(Tienda).filter(Tienda.id == tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    if not tienda.usuario_id:
        raise HTTPException(status_code=400, detail="La tienda no tiene usuario asociado")

    user = db.query(Usuario).filter(Usuario.id == tienda.usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario de tienda no encontrado")

    user.hashed_password = get_password_hash(nueva_password)
    db.commit()

    return {"mensaje": "Contraseña restablecida exitosamente"}


@router.post("/tiendas/{tienda_id}/enviar-enlace-password")
def enviar_enlace_password_tienda(
    tienda_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Genera un enlace seguro (24 h) y envía un correo de verificación para que
    la Tienda Aliada restablezca su contraseña desde el frontend."""
    tienda = db.query(Tienda).filter(Tienda.id == tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    if not tienda.usuario_id:
        raise HTTPException(status_code=400, detail="La tienda no tiene usuario asociado")

    user = db.query(Usuario).filter(Usuario.id == tienda.usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario de tienda no encontrado")
    if not user.email:
        raise HTTPException(status_code=400, detail="El usuario no tiene correo asociado")

    token = secrets.token_urlsafe(48)
    enlace = EnlaceCreacionPassword(
        usuario_id=user.id,
        token=token,
        usado="activo",
        expira_en=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(enlace)
    db.commit()
    db.refresh(enlace)

    url = f"{settings.FRONTEND_URL}/crear-password/{token}"
    enviado = enviar_correo_restablecer_password_tienda(user.email, tienda.nombre, url)

    return {
        "mensaje": "Correo de verificación enviado para restablecer la contraseña",
        "email": user.email,
        "enviado": enviado,
    }


@router.delete("/tiendas/{tienda_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_tienda(
    tienda_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Elimina (soft delete) una tienda aliada y desactiva su usuario de acceso."""
    tienda = db.query(Tienda).filter(Tienda.id == tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    # Soft delete del usuario asociado si existe (libera el email para unicidad)
    if tienda.usuario_id:
        user = db.query(Usuario).filter(Usuario.id == tienda.usuario_id).first()
        if user:
            liberar_email(db, user)
            soft_delete_no_commit(db, user)

    # Soft delete de la tienda (libera el slug y desactiva la tienda)
    liberar_slug(db, tienda)
    soft_delete(db, tienda)
    return None


@router.get("/tiendas/{tienda_id}/productos")
def listar_productos_tienda(
    tienda_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista los productos de una tienda aliada (para administración)."""
    tienda = db.query(Tienda).filter(Tienda.id == tienda_id).first()
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    productos = (
        db.query(Producto)
        .filter(Producto.tienda_id == tienda_id)
        .order_by(Producto.creado_en.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "nombre": p.nombre,
            "precio": float(p.precio) if p.precio else 0,
            "stock": p.stock,
            "activo": p.activo,
            "ventas": p.ventas,
            "categoria": p.categoria.nombre if p.categoria else None,
            "creado_en": p.creado_en.isoformat() if p.creado_en else None,
        }
        for p in productos
    ]


@router.patch("/tiendas/{tienda_id}/productos/{producto_id}/ocultar")
def ocultar_producto_tienda(
    tienda_id: int,
    producto_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Oculta (desactiva) un producto de una tienda."""
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.tienda_id == tienda_id,
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado en esta tienda")

    producto.activo = not producto.activo  # toggle
    db.commit()
    return {"mensaje": "Producto actualizado", "activo": producto.activo}


@router.delete("/tiendas/{tienda_id}/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto_tienda(
    tienda_id: int,
    producto_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Elimina un producto de una tienda."""
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.tienda_id == tienda_id,
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado en esta tienda")

    # Soft delete: desactiva el producto conservando pedidos, donaciones y kardex.
    soft_delete(db, producto)
    return None


# ============================================================
# PQRS de Tiendas Aliadas (gestion por Administradores de Adoptify)
# ============================================================
def _subir_adjuntos_admin(adjuntos):
    """Sube a Cloudinary los adjuntos de las respuestas de PQRS."""
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
                print(f"[admin] No se pudo subir adjunto PQRS: {exc}")
        elif getattr(adj, "url", None):
            resultados.append({
                "nombre_archivo": adj.nombre_archivo or "adjunto",
                "url": adj.url,
            })
    return resultados


def _serialize_pqrs_admin(p: TiendaPqrs) -> dict:
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


def _notificar_miembros_tienda(db: Session, tienda_id: int, tipo: str, mensaje: str, enlace: str = None):
    """Notifica a todos los miembros activos de una tienda aliada."""
    ids = (
        db.query(TiendaUsuario.usuario_id)
        .filter(TiendaUsuario.tienda_id == tienda_id, TiendaUsuario.activo == True)  # noqa: E712
        .all()
    )
    for (uid,) in ids:
        crear_notificacion(db, uid, tipo=tipo, mensaje=mensaje, enlace=enlace)
    try:
        db.commit()
    except Exception:
        db.rollback()


@router.get("/pqrs-tiendas")
def listar_pqrs_tiendas(
    estado: Optional[str] = Query(None, description="Filtrar por estado: pendiente, en_revision, finalizado"),
    busqueda: Optional[str] = Query(None),
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lista las PQRS creadas por las Tiendas Aliadas."""
    q = db.query(TiendaPqrs)
    if estado:
        q = q.filter(TiendaPqrs.estado == estado)
    if busqueda:
        termino = f"%{busqueda.strip()}%"
        q = q.filter(
            TiendaPqrs.asunto.ilike(termino)
            | TiendaPqrs.tienda_nombre.ilike(termino)
            | TiendaPqrs.descripcion.ilike(termino)
        )
    filas = q.order_by(TiendaPqrs.creado_en.desc()).all()
    return [_serialize_pqrs_admin(p) for p in filas]


@router.get("/pqrs-tiendas/{pqrs_id}")
def detalle_pqrs_tienda_admin(
    pqrs_id: int,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Detalle completo de una PQRS de tienda (mensajes + adjuntos)."""
    pqrs = db.query(TiendaPqrs).filter(TiendaPqrs.id == pqrs_id).first()
    if not pqrs:
        raise HTTPException(status_code=404, detail="PQRS no encontrada")
    return _serialize_pqrs_admin(pqrs)


@router.patch("/pqrs-tiendas/{pqrs_id}/estado")
def cambiar_estado_pqrs_tienda_admin(
    pqrs_id: int,
    payload: AdminTiendaPqrsEstadoUpdate,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """El Administrador de Adoptify cambia el estado de una PQRS de tienda.

    Notifica a la tienda del cambio de estado.
    """
    pqrs = db.query(TiendaPqrs).filter(TiendaPqrs.id == pqrs_id).first()
    if not pqrs:
        raise HTTPException(status_code=404, detail="PQRS no encontrada")
    pqrs.estado = payload.estado
    pqrs.actualizado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pqrs)

    _notificar_miembros_tienda(
        db, pqrs.tienda_id,
        tipo="pqrs_tienda",
        mensaje=f"El estado de tu PQRS '{pqrs.asunto}' cambió a '{payload.estado}'.",
        enlace="/tienda/pqrs",
    )
    registrar_auditoria(
        db, _admin.id,
        accion="cambio_estado_pqrs_tienda",
        entidad="tienda_pqrs",
        entidad_id=pqrs.id,
        detalle=f"Estado -> {payload.estado}",
    )
    return _serialize_pqrs_admin(pqrs)


@router.post("/pqrs-tiendas/{pqrs_id}/responder")
def responder_pqrs_tienda_admin(
    pqrs_id: int,
    payload: AdminTiendaPqrsRespuestaCreate,
    _admin: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """El Administrador de Adoptify responde una PQRS de tienda y opcionalmente
    actualiza su estado. Notifica a la tienda.
    """
    pqrs = db.query(TiendaPqrs).filter(TiendaPqrs.id == pqrs_id).first()
    if not pqrs:
        raise HTTPException(status_code=404, detail="PQRS no encontrada")

    nombre_admin = f"{_admin.nombre} {_admin.apellido or ''}".strip()
    mensaje = TiendaPqrsMensaje(
        pqrs_id=pqrs.id,
        usuario_id=_admin.id,
        nombre_remitente=nombre_admin,
        rol_remitente="admin",
        mensaje=payload.mensaje,
    )
    db.add(mensaje)
    db.flush()

    adjuntos = _subir_adjuntos_admin(payload.adjuntos)
    for adj in adjuntos:
        db.add(TiendaPqrsAdjunto(
            pqrs_id=pqrs.id,
            mensaje_id=mensaje.id,
            nombre_archivo=adj["nombre_archivo"],
            url=adj["url"],
        ))

    if payload.estado:
        pqrs.estado = payload.estado
    pqrs.actualizado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pqrs)

    _notificar_miembros_tienda(
        db, pqrs.tienda_id,
        tipo="pqrs_tienda",
        mensaje=f"Adoptify respondió tu PQRS '{pqrs.asunto}'.",
        enlace="/tienda/pqrs",
    )
    registrar_auditoria(
        db, _admin.id,
        accion="responder_pqrs_tienda",
        entidad="tienda_pqrs",
        entidad_id=pqrs.id,
        detalle=payload.estado or "respuesta",
    )
    return _serialize_pqrs_admin(pqrs)
