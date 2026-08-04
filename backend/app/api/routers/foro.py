"""Foro / comunidad: publicaciones, comentarios y reacciones."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional, List

from app.db.database import get_db
from app.core.security import get_current_user
from app.core.lookups import id_por_codigo
from app.core.notificaciones import registrar_auditoria, crear_notificacion
from app.models.usuario import Usuario
from app.models.foro import ForoPost, ForoPostImagen
from app.models.interaccion import ForoComentario, ForoReaccion, ForoComentarioLike, ForoGuardado
from app.models.catalogos import ForoCategoria, TipoPostForo, EstadoPostForo, TipoReaccion
from app.services.cloudinary_service import (
    eliminar_imagen_temporal,
)

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


class ComentarioCreate(BaseModel):
    contenido: str
    comentario_padre_id: Optional[int] = None


class ReaccionCreate(BaseModel):
    tipo: str = "like"  # codigo de tipos_reaccion


def _autor_info(u: Usuario):
    if not u:
        return {"autor": "Anonimo", "autor_rol": None, "autor_iniciales": "?"}
    nombre = f"{u.nombre} {u.apellido or ''}".strip()
    iniciales = "".join([p[0] for p in nombre.split()[:2]]).upper() or "?"
    return {"autor": nombre, "autor_rol": u.rol_codigo if u.rol else None, "autor_iniciales": iniciales}


def _reacciones_de(db: Session, post_id: int) -> dict:
    filas = (
        db.query(TipoReaccion.codigo, func.count(ForoReaccion.id))
        .join(ForoReaccion, ForoReaccion.tipo_reaccion_id == TipoReaccion.id)
        .filter(ForoReaccion.post_id == post_id)
        .group_by(TipoReaccion.codigo)
        .all()
    )
    d = {"like": 0, "love": 0, "celebrate": 0, "support": 0, "funny": 0}
    for codigo, n in filas:
        d[codigo] = n
    return d


def _serialize_post(p: ForoPost, db: Session, incluir_comentarios: bool = False) -> dict:
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
        "comentarios_count": n_com,
        # Solo se exponen las secure_url (y su id) almacenadas en la BD.
        "imagenes": [{"id": img.id, "url": img.url} for img in (p.imagenes or [])],
        **_autor_info(p.autor),
    }
    if incluir_comentarios:
        comentarios = (
            db.query(ForoComentario)
            .filter(ForoComentario.post_id == p.id)
            .order_by(ForoComentario.creado_en.asc())
            .all()
        )
        data["comentarios"] = [
            {
                "id": c.id,
                "contenido": c.contenido,
                "likes": c.likes,
                "comentario_padre_id": c.comentario_padre_id,
                "creado_en": c.creado_en.isoformat() if c.creado_en else None,
                **_autor_info(c.autor),
            }
            for c in comentarios
        ]
    return data


@router.get("/posts")
def listar_posts(db: Session = Depends(get_db), categoria: Optional[str] = None):
    query = db.query(ForoPost)
    if categoria and categoria != "all":
        cat_id = id_por_codigo(db, ForoCategoria, categoria)
        if cat_id:
            query = query.filter(ForoPost.categoria_id == cat_id)
    posts = query.order_by(ForoPost.fijado.desc(), ForoPost.creado_en.desc()).all()
    return [_serialize_post(p, db) for p in posts]


@router.get("/posts/guardados")
def listar_posts_guardados(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista las publicaciones guardadas por el usuario autenticado."""
    posts = (
        db.query(ForoPost)
        .join(ForoGuardado, ForoGuardado.post_id == ForoPost.id)
        .filter(ForoGuardado.usuario_id == current_user.id)
        .order_by(ForoGuardado.creado_en.desc())
        .all()
    )
    return [_serialize_post(p, db) for p in posts]


@router.get("/posts/{post_id}")
def obtener_post(post_id: int, db: Session = Depends(get_db)):
    p = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    p.vistas = (p.vistas or 0) + 1
    db.commit()
    db.refresh(p)
    return _serialize_post(p, db, incluir_comentarios=True)


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
    db.refresh(com)
    return {"id": com.id, "contenido": com.contenido, **_autor_info(current_user)}


@router.post("/posts/{post_id}/reacciones")
def reaccionar(post_id: int, payload: ReaccionCreate, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(ForoPost).filter(ForoPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicacion no encontrada")
    tipo_id = id_por_codigo(db, TipoReaccion, payload.tipo, requerido=True)
    existe = db.query(ForoReaccion).filter(
        ForoReaccion.post_id == post_id,
        ForoReaccion.usuario_id == current_user.id,
        ForoReaccion.tipo_reaccion_id == tipo_id,
    ).first()
    if existe:
        db.delete(existe)  # toggle: quitar reaccion
        db.commit()
        return {"activo": False, "reacciones": _reacciones_de(db, post_id)}
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
    return {"activo": True, "reacciones": _reacciones_de(db, post_id)}


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
    # Elimina las dependencias (comentarios, likes de comentarios y reacciones).
    ids_comentarios = [
        r[0]
        for r in db.query(ForoComentario.id).filter(ForoComentario.post_id == post_id).all()
    ]
    if ids_comentarios:
        db.query(ForoComentarioLike).filter(
            ForoComentarioLike.comentario_id.in_(ids_comentarios)
        ).delete(synchronize_session=False)
    db.query(ForoComentario).filter(ForoComentario.post_id == post_id).delete(synchronize_session=False)
    db.query(ForoReaccion).filter(ForoReaccion.post_id == post_id).delete(synchronize_session=False)

    # Elimina las imágenes de Cloudinary antes de borrar el post.
    imgs = db.query(ForoPostImagen).filter(ForoPostImagen.post_id == post_id).all()
    for img in imgs:
        eliminar_imagen_temporal(img.public_id)
    db.query(ForoPostImagen).filter(ForoPostImagen.post_id == post_id).delete(synchronize_session=False)

    db.delete(post)
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
