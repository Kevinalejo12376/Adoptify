"""Foro / comunidad: publicaciones, comentarios y reacciones."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, field_validator
# pyrefly: ignore [missing-import]
from typing import Optional, List

from app.db.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.core.lookups import id_por_codigo
from app.core.notificaciones import registrar_auditoria, crear_notificacion
from app.core.softdelete import soft_delete
from app.models.usuario import Usuario
from app.models.foro import ForoPost, ForoPostImagen
from app.models.interaccion import ForoComentario, ForoReaccion, ForoComentarioLike, ForoGuardado
from app.models.catalogos import ForoCategoria, TipoPostForo, EstadoPostForo, TipoReaccion
from app.services.cloudinary_service import (
    eliminar_imagen_temporal,
)
from app.api.routers.ia import crear_tarea_ia

router = APIRouter()


class ImagenPost(BaseModel):
    """Imagen YA subida a Cloudinary (solo se guarda la secure_url en la BD)."""
    url: str
    public_id: Optional[str] = None


class PostCreate(BaseModel):
    titulo: str
    contenido: Optional[str] = None
    categoria: Optional[str] = None   # codigo de foro_categorias
    tipo: Optional[str] = None        # codigo de tipos_post_foro
    tags: Optional[str] = None
    # Imágenes YA subidas a Cloudinary (vía /api/upload). Solo se almacena la url.
    imagenes: List[ImagenPost] = []
    # IDs de imágenes existentes que el usuario desea eliminar (solo edición).
    imagenes_eliminar: List[int] = []

    @field_validator("titulo")
    @classmethod
    def _validar_titulo(cls, v):
        valor = (v or "").strip()
        if len(valor) < 3:
            raise ValueError("El título debe tener al menos 3 caracteres")
        if len(valor) > 120:
            raise ValueError("El título no puede superar los 120 caracteres")
        return valor

    @field_validator("contenido")
    @classmethod
    def _validar_contenido(cls, v):
        if v is None:
            return v
        valor = v.strip()
        if len(valor) < 10:
            raise ValueError("El contenido de la publicación debe tener al menos 10 caracteres")
        if len(valor) > 10000:
            raise ValueError("El contenido no puede superar los 10000 caracteres")
        return valor


class ComentarioCreate(BaseModel):
    contenido: str
    comentario_padre_id: Optional[int] = None

    @field_validator("contenido")
    @classmethod
    def _validar_contenido(cls, v):
        valor = (v or "").strip()
        if len(valor) < 2:
            raise ValueError("El comentario debe tener al menos 2 caracteres")
        if len(valor) > 2000:
            raise ValueError("El comentario no puede superar los 2000 caracteres")
        return valor


class ReaccionCreate(BaseModel):
    tipo: str = "like"  # codigo de tipos_reaccion


class ComentarioUpdate(BaseModel):
    contenido: str

    @field_validator("contenido")
    @classmethod
    def _validar_contenido(cls, v):
        valor = (v or "").strip()
        if len(valor) < 2:
            raise ValueError("El comentario debe tener al menos 2 caracteres")
        if len(valor) > 2000:
            raise ValueError("El comentario no puede superar los 2000 caracteres")
        return valor


def _autor_info(u: Usuario):
    """Resuelve la informacion visible del autor segun su rol.

    - REFUGIO   -> el nombre visible es el NOMBRE DEL REFUGIO (no el representante).
    - TIENDA    -> el nombre visible es el NOMBRE DE LA TIENDA.
    - USUARIO/ADMIN -> se muestra el nombre personal del usuario.
    """
    if not u:
        return {"autor": "Anonimo", "autor_rol": None, "autor_iniciales": "?", "autor_avatar": None}
    rol = u.rol_codigo if u.rol else None

    # REFUGIO: usar el refugio asociado al usuario (relacion existente).
    if rol == "refugio":
        ref = getattr(u, "refugio", None)
        if ref is not None and ref.nombre:
            nombre = ref.nombre
            return {
                "autor": nombre,
                "autor_rol": rol,
                "autor_iniciales": "".join([p[0] for p in nombre.split()[:2]]).upper() or "?",
                "autor_avatar": ref.logo_url,
            }

    # TIENDA ALIADA: usar la tienda asociada al usuario (relacion existente).
    if rol == "tienda_aliada":
        tienda = getattr(u, "tienda", None)
        if tienda is not None and tienda.nombre:
            nombre = tienda.nombre
            return {
                "autor": nombre,
                "autor_rol": rol,
                "autor_iniciales": "".join([p[0] for p in nombre.split()[:2]]).upper() or "?",
                "autor_avatar": tienda.logo_url,
            }

    # USUARIO NORMAL / ADMINISTRADOR: nombre personal del usuario.
    nombre = f"{u.nombre} {u.apellido or ''}".strip()
    return {
        "autor": nombre,
        "autor_rol": rol,
        "autor_iniciales": "".join([p[0] for p in nombre.split()[:2]]).upper() or "?",
        "autor_avatar": u.avatar_url,
    }


def _reacciones_de(db: Session, post_id: int) -> dict:
    filas = (
        db.query(TipoReaccion.codigo, func.count(ForoReaccion.id))
        .join(ForoReaccion, ForoReaccion.tipo_reaccion_id == TipoReaccion.id)
        .filter(ForoReaccion.post_id == post_id)
        .group_by(TipoReaccion.codigo)
        .all()
    )
    # Incluye los tipos nuevos y los históricos (celebrate/support) por compatibilidad.
    d = {"like": 0, "love": 0, "funny": 0, "wow": 0, "sad": 0, "angry": 0, "celebrate": 0, "support": 0}
    for codigo, n in filas:
        d[codigo] = n
    return d


def _mi_reaccion(db: Session, post_id: int, usuario_id: Optional[int]):
    """Devuelve el codigo de la reaccion del usuario sobre el post (o None)."""
    if not usuario_id:
        return None
    fila = (
        db.query(TipoReaccion.codigo)
        .join(ForoReaccion, ForoReaccion.tipo_reaccion_id == TipoReaccion.id)
        .filter(ForoReaccion.post_id == post_id, ForoReaccion.usuario_id == usuario_id)
        .first()
    )
    return fila[0] if fila else None


def _serialize_post(p: ForoPost, db: Session, incluir_comentarios: bool = False, current_user: Optional[Usuario] = None) -> dict:
    n_com = db.query(func.count(ForoComentario.id)).filter(ForoComentario.post_id == p.id).scalar()
    data = {
        "id": p.id,
        "autor_id": p.autor_id,
        "titulo": p.titulo,
        "contenido": p.contenido,
        "categoria": p.categoria.nombre if p.categoria else None,
        "tags": p.tags.split(",") if p.tags else [],
        "fijado": p.fijado,
        "vistas": p.vistas,
        "compartidos": p.compartidos,
        "creado_en": p.creado_en.isoformat() if p.creado_en else None,
        "reacciones": _reacciones_de(db, p.id),
        "mi_reaccion": _mi_reaccion(db, p.id, current_user.id if current_user else None),
        "comentarios_count": n_com,
        # Solo se exponen las secure_url (y su id) almacenadas en la BD.
        "imagenes": [{"id": img.id, "url": img.url} for img in (p.imagenes or [])],
        **_autor_info(p.autor),
    }
    if incluir_comentarios:
        comentarios = (
            db.query(ForoComentario)
            .filter(ForoComentario.post_id == p.id, ForoComentario.activo == True)  # noqa: E712
            .order_by(ForoComentario.creado_en.asc())
            .all()
        )
        data["comentarios"] = [
            {
                "id": c.id,
                "autor_id": c.autor_id,
                "contenido": c.contenido,
                "likes": c.likes,
                "comentario_padre_id": c.comentario_padre_id,
                "creado_en": c.creado_en.isoformat() if c.creado_en else None,
                "editado": False,
                **_autor_info(c.autor),
            }
            for c in comentarios
        ]
    return data


@router.get("/posts")
def listar_posts(
    current_user: Optional[Usuario] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    categoria: Optional[str] = None,
):
    query = db.query(ForoPost).filter(ForoPost.activo == True)  # noqa: E712
    if categoria and categoria != "all":
        cat_id = id_por_codigo(db, ForoCategoria, categoria)
        if cat_id:
            query = query.filter(ForoPost.categoria_id == cat_id)
    posts = query.order_by(ForoPost.fijado.desc(), ForoPost.creado_en.desc()).all()
    return [_serialize_post(p, db, current_user=current_user) for p in posts]


@router.get("/posts/guardados")
def listar_posts_guardados(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista las publicaciones guardadas por el usuario autenticado."""
    posts = (
        db.query(ForoPost)
        .join(ForoGuardado, ForoGuardado.post_id == ForoPost.id)
        .filter(
            ForoGuardado.usuario_id == current_user.id,
            ForoPost.activo == True,  # noqa: E712
        )
        .order_by(ForoGuardado.creado_en.desc())
        .all()
    )
    return [_serialize_post(p, db) for p in posts]


@router.get("/posts/mios")
def mis_posts(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista las publicaciones creadas por el usuario autenticado (rol Refugio/Usuario)."""
    posts = (
        db.query(ForoPost)
        .filter(ForoPost.autor_id == current_user.id)
        .order_by(ForoPost.fijado.desc(), ForoPost.creado_en.desc())
        .all()
    )
    return [_serialize_post(p, db) for p in posts]


@router.get("/posts/{post_id}")
def obtener_post(
    post_id: int,
    current_user: Optional[Usuario] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    p = db.query(ForoPost).filter(
        ForoPost.id == post_id, ForoPost.activo == True  # noqa: E712
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    p.vistas = (p.vistas or 0) + 1
    db.commit()
    db.refresh(p)
    return _serialize_post(p, db, incluir_comentarios=True, current_user=current_user)


@router.get("/posts/{post_id}/comentarios")
def listar_comentarios(post_id: int, db: Session = Depends(get_db)):
    """Lista los comentarios de una publicación con la información de su autor.

    No incrementa el contador de vistas (a diferencia de obtener_post), por lo
    que es seguro usarlo para mostrar los comentarios en el feed.
    """
    post = db.query(ForoPost).filter(
        ForoPost.id == post_id, ForoPost.activo == True  # noqa: E712
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    comentarios = (
        db.query(ForoComentario)
        .filter(ForoComentario.post_id == post_id, ForoComentario.activo == True)  # noqa: E712
        .order_by(ForoComentario.creado_en.asc())
        .all()
    )
    return [
        {
            "id": c.id,
            "autor_id": c.autor_id,
            "contenido": c.contenido,
            "likes": c.likes,
            "comentario_padre_id": c.comentario_padre_id,
            "creado_en": c.creado_en.isoformat() if c.creado_en else None,
            "editado": False,
            **_autor_info(c.autor),
        }
        for c in comentarios
    ]


@router.post("/posts", status_code=status.HTTP_201_CREATED)
def crear_post(payload: PostCreate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    # Validacion: el contenido de la publicacion debe tener mas de 10 caracteres.
    contenido = (payload.contenido or "").strip()
    if len(contenido) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El contenido de la publicación debe tener al menos 10 caracteres",
        )
    estado_id = id_por_codigo(db, EstadoPostForo, "published", requerido=True)
    post = ForoPost(
        autor_id=current_user.id,
        categoria_id=id_por_codigo(db, ForoCategoria, payload.categoria),
        tipo_id=id_por_codigo(db, TipoPostForo, payload.tipo),
        estado_id=estado_id,
        titulo=payload.titulo,
        contenido=payload.contenido,
        tags=payload.tags,
    )
    db.add(post)
    db.flush()  # obtiene post.id sin commit

    # Imágenes YA subidas a Cloudinary vía /api/upload (tipo 'foro').
    # Aquí solo se guarda la secure_url en la base de datos.
    for img in (payload.imagenes or []):
        db.add(ForoPostImagen(
            post_id=post.id,
            url=img.url,
            public_id=img.public_id or "",
            etiqueta="publicacion",
        ))
    db.commit()

    # IA / n8n: encola la moderacion del post (WF-2 decide si se oculta).
    try:
        crear_tarea_ia(db, "moderar_post", {
            "post_id": post.id,
            "autor_id": current_user.id,
            "titulo": post.titulo,
            "contenido": post.contenido or "",
        })
    except Exception as exc:
        logger.warning("[foro] No se pudo encolar moderacion del post: %s", exc)

    db.refresh(post)
    return _serialize_post(post, db)


@router.post("/posts/{post_id}/comentarios", status_code=status.HTTP_201_CREATED)
def comentar(post_id: int, payload: ComentarioCreate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    com = ForoComentario(
        post_id=post_id,
        autor_id=current_user.id,
        comentario_padre_id=payload.comentario_padre_id,
        contenido=payload.contenido,
    )
    db.add(com)
    db.commit()

    # IA / n8n: encola la moderacion del comentario.
    try:
        crear_tarea_ia(db, "moderar_comentario", {
            "post_id": post_id,
            "comentario_id": com.id,
            "autor_id": current_user.id,
            "contenido": payload.contenido,
        })
    except Exception as exc:
        logger.warning("[foro] No se pudo encolar moderacion del comentario: %s", exc)

    db.refresh(com)
    return {
        "id": com.id,
        "autor_id": com.autor_id,
        "contenido": com.contenido,
        "comentario_padre_id": com.comentario_padre_id,
        "creado_en": com.creado_en.isoformat() if com.creado_en else None,
        "editado": False,
        **_autor_info(current_user),
    }


@router.post("/posts/{post_id}/reacciones")
def reaccionar(post_id: int, payload: ReaccionCreate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Registra/actualiza/elimina la reaccion del usuario sobre una publicacion.

    Un usuario solo puede tener UNA reaccion por publicacion:
    - Sin reaccion previa  -> se crea la reaccion.
    - Misma reaccion       -> se elimina (toggle off).
    - Reaccion diferente   -> se REEMPLAZA la anterior (nunca se duplica).
    """
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    tipo_id = id_por_codigo(db, TipoReaccion, payload.tipo, requerido=True)

    # La reaccion del usuario sobre el post (independientemente del tipo).
    existe = (
        db.query(ForoReaccion)
        .filter(
            ForoReaccion.post_id == post_id,
            ForoReaccion.usuario_id == current_user.id,
        )
        .first()
    )
    if existe:
        if existe.tipo_reaccion_id == tipo_id:
            # Toggle off: el usuario retira su reaccion.
            db.delete(existe)
            db.commit()
            return {"activo": False, "mi_reaccion": None, "reacciones": _reacciones_de(db, post_id)}
        # Cambio de reaccion: se actualiza la existente (nunca se duplica).
        existe.tipo_reaccion_id = tipo_id
        db.commit()
        return {"activo": True, "mi_reaccion": payload.tipo, "reacciones": _reacciones_de(db, post_id)}

    db.add(ForoReaccion(post_id=post_id, usuario_id=current_user.id, tipo_reaccion_id=tipo_id))
    # Notifica al autor de la publicacion (si no es el mismo que reacciona)
    if post.autor_id and post.autor_id != current_user.id:
        quien = f"{current_user.nombre} {current_user.apellido or ''}".strip()
        crear_notificacion(
            db, post.autor_id, "like_publicacion",
            f"A {quien} le gustó tu publicación \"{post.titulo}\".",
            "/forum",
        )
    db.commit()
    return {"activo": True, "mi_reaccion": payload.tipo, "reacciones": _reacciones_de(db, post_id)}


@router.get("/posts/{post_id}/reacciones")
def listar_reacciones(post_id: int, db: Session = Depends(get_db)):
    """Devuelve los usuarios que reaccionaron y su tipo de reaccion (datos reales)."""
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    filas = (
        db.query(ForoReaccion, TipoReaccion.codigo, Usuario)
        .join(TipoReaccion, ForoReaccion.tipo_reaccion_id == TipoReaccion.id)
        .join(Usuario, ForoReaccion.usuario_id == Usuario.id)
        .filter(ForoReaccion.post_id == post_id)
        .order_by(ForoReaccion.id.desc())
        .all()
    )
    return [
        {"usuario_id": r.usuario_id, "tipo": codigo, **_autor_info(u)}
        for r, codigo, u in filas
    ]


@router.put("/comentarios/{comentario_id}")
def editar_comentario(comentario_id: int, payload: ComentarioUpdate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Edita un comentario (solo su autor o un administrador). Mantiene el mismo id."""
    com = db.query(ForoComentario).filter(ForoComentario.id == comentario_id).first()
    if not com:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    rol = current_user.rol_codigo if current_user.rol else None
    es_admin = rol in ("administrador", "administrador_principal")
    if com.autor_id != current_user.id and not es_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este comentario")
    com.contenido = payload.contenido
    db.commit()
    db.refresh(com)
    return {
        "id": com.id,
        "autor_id": com.autor_id,
        "contenido": com.contenido,
        "creado_en": com.creado_en.isoformat() if com.creado_en else None,
        "editado": True,
        **_autor_info(com.autor),
    }


@router.delete("/comentarios/{comentario_id}", status_code=status.HTTP_200_OK)
def eliminar_comentario(comentario_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Elimina un comentario y sus respuestas (solo su autor o un administrador)."""
    com = db.query(ForoComentario).filter(ForoComentario.id == comentario_id).first()
    if not com:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    rol = current_user.rol_codigo if current_user.rol else None
    es_admin = rol in ("administrador", "administrador_principal")
    if com.autor_id != current_user.id and not es_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este comentario")

    def _desactivar_descendientes(pid: int):
        """Soft delete: oculta el comentario y sus respuestas conservando likes."""
        hijos = db.query(ForoComentario).filter(ForoComentario.comentario_padre_id == pid).all()
        for h in hijos:
            _desactivar_descendientes(h.id)
            h.activo = False
            db.add(h)

    _desactivar_descendientes(com.id)
    com.activo = False
    db.add(com)
    db.commit()
    return {"ok": True}


@router.post("/comentarios/{comentario_id}/like")
def dar_like_comentario(comentario_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Alterna el 'me gusta' de un comentario (toggle) y notifica a su autor."""
    comentario = db.query(ForoComentario).filter(ForoComentario.id == comentario_id).first()
    if not comentario:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    existe = db.query(ForoComentarioLike).filter(
        ForoComentarioLike.comentario_id == comentario_id,
        ForoComentarioLike.usuario_id == current_user.id,
    ).first()
    if existe:
        db.delete(existe)
        activo = False
    else:
        db.add(ForoComentarioLike(comentario_id=comentario_id, usuario_id=current_user.id))
        activo = True
        # Notifica al autor del comentario (si no es quien reacciona)
        if comentario.autor_id and comentario.autor_id != current_user.id:
            quien = f"{current_user.nombre} {current_user.apellido or ''}".strip()
            enlace = f"/forum?post={comentario.post_id}"
            crear_notificacion(
                db, comentario.autor_id, "like_comentario",
                f"A {quien} le gustó tu comentario.",
                enlace,
            )
    db.flush()
    # Recalcula el contador de likes del comentario
    total = db.query(func.count(ForoComentarioLike.id)).filter(
        ForoComentarioLike.comentario_id == comentario_id
    ).scalar()
    comentario.likes = total
    db.commit()
    return {"activo": activo, "likes": total}


@router.delete("/posts/{post_id}", status_code=status.HTTP_200_OK)
def eliminar_post(post_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Elimina una publicacion del foro (solo su autor o un administrador)."""
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    rol = current_user.rol_codigo if current_user.rol else None
    es_admin = rol in ("administrador", "administrador_principal")
    if post.autor_id != current_user.id and not es_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta publicacion")
    # Soft delete: oculta la publicación y sus comentarios conservando
    # reacciones, likes, guardados e imágenes (permite restaurar después).
    ids_comentarios = [
        r[0]
        for r in db.query(ForoComentario.id).filter(ForoComentario.post_id == post_id).all()
    ]
    if ids_comentarios:
        db.query(ForoComentario).filter(
            ForoComentario.id.in_(ids_comentarios)
        ).update({ForoComentario.activo: False}, synchronize_session=False)

    post.activo = False
    db.add(post)
    db.commit()
    return {"ok": True}


@router.post("/posts/{post_id}/guardar")
def guardar_post(post_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Guarda o desguarda una publicacion del foro (toggle)."""
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    existe = db.query(ForoGuardado).filter(
        ForoGuardado.usuario_id == current_user.id,
        ForoGuardado.post_id == post_id,
    ).first()
    if existe:
        db.delete(existe)
        db.commit()
        return {"activo": False}
    db.add(ForoGuardado(usuario_id=current_user.id, post_id=post_id))
    db.commit()
    return {"activo": True}


@router.put("/posts/{post_id}")
def editar_post(post_id: int, payload: PostCreate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Edita una publicacion del foro (solo su autor o un administrador)."""
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    rol = current_user.rol_codigo if current_user.rol else None
    es_admin = rol in ("administrador", "administrador_principal")
    if post.autor_id != current_user.id and not es_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar esta publicacion")
    # Validacion: el contenido de la publicacion debe tener mas de 10 caracteres.
    contenido = (payload.contenido or "").strip()
    if len(contenido) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El contenido de la publicación debe tener al menos 10 caracteres",
        )
    post.titulo = payload.titulo
    post.contenido = payload.contenido
    if payload.categoria:
        post.categoria_id = id_por_codigo(db, ForoCategoria, payload.categoria)
    if payload.tipo:
        post.tipo_id = id_por_codigo(db, TipoPostForo, payload.tipo)
    post.tags = payload.tags

    # --- Gestión de imágenes ---
    # 1. Eliminar imágenes marcadas por el usuario (Cloudinary + BD).
    if payload.imagenes_eliminar:
        imgs_a_borrar = (
            db.query(ForoPostImagen)
            .filter(
                ForoPostImagen.post_id == post.id,
                ForoPostImagen.id.in_(payload.imagenes_eliminar),
            )
            .all()
        )
        for img in imgs_a_borrar:
            eliminar_imagen_temporal(img.public_id)  # borra de Cloudinary
            db.delete(img)

    # 2. Agregar imágenes NUEVAS (ya subidas a Cloudinary vía /api/upload).
    #    Solo se guarda la secure_url en la base de datos.
    for img in (payload.imagenes or []):
        db.add(ForoPostImagen(
            post_id=post.id,
            url=img.url,
            public_id=img.public_id or "",
            etiqueta="publicacion",
        ))
    db.commit()

    db.refresh(post)
    return _serialize_post(post, db)


@router.post("/posts/{post_id}/compartir")
def compartir_post(post_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Incrementa el contador de veces que se compartió la publicación."""
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    post.compartidos = (post.compartidos or 0) + 1
    db.commit()
    db.refresh(post)
    return {"compartidos": post.compartidos}


@router.post("/posts/{post_id}/fijar")
def fijar_post(post_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fija o desfija una publicacion de OTRO usuario (maximo 3 fijadas).

    No se permite fijar las publicaciones propias.
    """
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    # No se puede fijar una publicacion propia.
    if post.autor_id == current_user.id:
        raise HTTPException(status_code=403, detail="No puedes fijar tus propias publicaciones")
    # Limite: maximo 3 publicaciones fijadas a la vez.
    if not (post.fijado or False):
        n_fijadas = db.query(func.count(ForoPost.id)).filter(ForoPost.fijado == True).scalar() or 0
        if n_fijadas >= 3:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Solo se permiten hasta 3 publicaciones fijadas",
            )
    post.fijado = not (post.fijado or False)
    db.commit()
    db.refresh(post)
    return {"fijado": post.fijado}
