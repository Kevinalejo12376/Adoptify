"""Autogestion de la Tienda Aliada autenticada (rol tienda_aliada).

Cada endpoint opera sobre la tienda del usuario en sesion. Los productos se
identifican por tienda_id. No existe (aun) modelo de items de pedido ni de
reseñas, por eso pedidos/reseñas se entregan vacios de forma honesta.
"""
# pyrefly: ignore [missing-import]
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func
# pyrefly: ignore [missing-import]
from typing import List

from app.db.database import get_db
from app.core.security import get_current_tienda, verify_password, get_password_hash
from app.core.lookups import id_por_codigo
from app.core.notificaciones import crear_notificacion
from app.models.usuario import Usuario
from app.models.tienda import Tienda
from app.models.producto import Producto, ProductoImagen
from app.models.pedido import Pedido, PedidoItem, HistorialEstadoPedido
from app.models.catalogos import CategoriaProducto, EstadoPedido
from app.models.kardex import MovimientoKardex, TIPOS_MOVIMIENTO_KARDEX
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoCreateConImagenes, AnalisisRequest
from app.schemas.tienda_self import TiendaPerfilUpdate, PasswordUpdate
from app.schemas.pedido import EstadoPedidoUpdate
from app.schemas.serializers import serialize_producto, serialize_pedido, serialize_movimiento_kardex
from app.services.gemini import analizar_producto
from app.services.cloudinary_service import (
    subir_imagenes_temporales,
    limpiar_imagenes_temporales,
    subir_imagen_producto,
)

router = APIRouter()


def _mi_tienda(current_user: Usuario, db: Session) -> Tienda:
    tienda = db.query(Tienda).filter(Tienda.usuario_id == current_user.id).first()
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
    }


# ============================================================
# ENDPOINT: Listar productos de mi tienda
# ============================================================
@router.get("/productos")
def mis_productos(current_user: Usuario = Depends(get_current_tienda), db: Session = Depends(get_db)):
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
    current_user: Usuario = Depends(get_current_tienda),
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
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    tienda = _mi_tienda(current_user, db)
    producto = Producto(
        nombre=payload.nombre,
        categoria_id=id_por_codigo(db, CategoriaProducto, payload.categoria),
        precio=payload.precio,
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
    return serialize_producto(producto)


# ============================================================
# ENDPOINT: Crear producto CON imágenes
# FLUJO: PERMANENTE → sube a Cloudinary productos/imagenes/, guarda URL en DB
# ============================================================
@router.post("/productos/con-imagenes", status_code=status.HTTP_201_CREATED)
def crear_producto_con_imagenes(
    payload: ProductoCreateConImagenes,
    current_user: Usuario = Depends(get_current_tienda),
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
def obtener_mi_producto(producto_id: int, current_user: Usuario = Depends(get_current_tienda), db: Session = Depends(get_db)):
    return serialize_producto(_mi_producto(producto_id, current_user, db))


@router.put("/productos/{producto_id}")
def actualizar_producto(
    producto_id: int,
    payload: ProductoUpdate,
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    producto = _mi_producto(producto_id, current_user, db)
    datos = payload.model_dump(exclude_unset=True)
    if "categoria" in datos:
        producto.categoria_id = id_por_codigo(db, CategoriaProducto, datos.pop("categoria"))
    for campo, valor in datos.items():
        setattr(producto, campo, valor)
    db.commit()
    db.refresh(producto)
    return serialize_producto(producto)


@router.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    producto = _mi_producto(producto_id, current_user, db)
    db.delete(producto)
    db.commit()
    return None


@router.get("/estadisticas")
def estadisticas(current_user: Usuario = Depends(get_current_tienda), db: Session = Depends(get_db)):
    tienda = _mi_tienda(current_user, db)
    productos = db.query(Producto).filter(Producto.tienda_id == tienda.id).all()
    total = len(productos)
    activos = sum(1 for p in productos if p.activo)
    sin_stock = sum(1 for p in productos if (p.stock or 0) <= 0)
    total_ventas = sum((p.ventas or 0) for p in productos)
    ratings = [float(p.rating) for p in productos if p.rating]
    rating_promedio = round(sum(ratings) / len(ratings), 1) if ratings else 0
    top = sorted(productos, key=lambda p: (p.ventas or 0), reverse=True)[:5]

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
def mis_pedidos(current_user: Usuario = Depends(get_current_tienda), db: Session = Depends(get_db)):
    tienda = _mi_tienda(current_user, db)
    ids = _ids_pedidos_de_tienda(tienda.id, db)
    if not ids:
        return []
    pedidos = db.query(Pedido).filter(Pedido.id.in_(ids)).order_by(Pedido.creado_en.desc()).all()
    return [serialize_pedido(p, solo_tienda_id=tienda.id) for p in pedidos]


@router.get("/pedidos/{pedido_id}")
def obtener_mi_pedido(pedido_id: int, current_user: Usuario = Depends(get_current_tienda), db: Session = Depends(get_db)):
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


@router.patch("/pedidos/{pedido_id}/estado")
def cambiar_estado_pedido(
    pedido_id: int,
    payload: EstadoPedidoUpdate,
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    tienda = _mi_tienda(current_user, db)
    if pedido_id not in _ids_pedidos_de_tienda(tienda.id, db):
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
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
    return serialize_pedido(pedido, solo_tienda_id=tienda.id)


@router.put("/cambiar-password")
def cambiar_password(
    payload: PasswordUpdate,
    current_user: Usuario = Depends(get_current_tienda),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    if len(payload.password_nueva or "") < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
    current_user.hashed_password = get_password_hash(payload.password_nueva)
    db.commit()
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
