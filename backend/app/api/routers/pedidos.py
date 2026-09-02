"""Pedidos del comprador (usuario autenticado): checkout y consulta."""
# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)

from app.db.database import get_db
from app.core.security import (
    get_current_user,
    get_refugio_de_usuario,
    require_permiso_refugio,
)
from app.core.lookups import id_por_codigo
from app.models.usuario import Usuario
from app.models.producto import Producto, precio_final
from app.models.pedido import Pedido, PedidoItem
from app.models.tienda import Tienda
from app.models.refugio import Refugio
from app.models.catalogos import EstadoPedido
from app.schemas.pedido import PedidoCreate
from app.schemas.serializers import serialize_pedido
from app.core.notificaciones import crear_notificacion
from app.api.routers.ia import crear_tarea_ia

router = APIRouter()

# Reglas de negocio de envío y descuento (fuente de verdad = backend).
# Único código promocional existente en Adoptify; el descuento se recalcula aquí
# y NUNCA se confía en el valor enviado por el frontend.
CODIGO_PROMOCION_VALIDO = "ADOPTIFY10"
PORCENTAJE_DESCUENTO = Decimal("0.10")
# Límite razonable del costo de envío (COP) para impedir manipulación.
ENVIO_MAXIMO_COP = 100000


def _registrar_historial(db, pedido_id, estado_id, notas=None):
    """Registra un cambio de estado en el historial del pedido.
    Si la tabla historial_estados_pedido no existe (ej: en Supabase si el
    usuario aun no ha ejecutado el CREATE TABLE), simplemente lo omite."""
    try:
        from app.models.pedido import HistorialEstadoPedido
        db.add(HistorialEstadoPedido(
            pedido_id=pedido_id,
            estado_id=estado_id,
            notas=notas,
        ))
    except Exception as exc:
        print(f"[pedidos] No se pudo registrar historial (tabla no existe?): {exc}")


@router.post("", status_code=status.HTTP_201_CREATED)
def crear_pedido(
    payload: PedidoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="El pedido no tiene productos")

    estado_id = id_por_codigo(db, EstadoPedido, "pendiente")
    if estado_id is None:
        raise HTTPException(status_code=500, detail="Catalogo de estados de pedido no inicializado")

    # El costo de envío se VALIDA en el backend (nunca se confía ciegamente en
    # el frontend): debe ser un entero no negativo dentro de un rango razonable.
    costo_envio = int(Decimal(str(payload.costo_envio or 0)))
    if costo_envio < 0 or costo_envio > ENVIO_MAXIMO_COP:
        raise HTTPException(status_code=400, detail="El costo de envío no es válido")

    # El descuento se calcula aquí según el único código promocional existente
    # (el valor enviado por el frontend se ignora por completo).
    codigo_promocion = (payload.codigo_promocion or "").strip().upper()
    aplica_descuento = codigo_promocion == CODIGO_PROMOCION_VALIDO
    if not aplica_descuento:
        codigo_promocion = None

    pedido = Pedido(
        usuario_id=current_user.id,
        estado_id=estado_id,
        costo_envio=costo_envio,
        descuento=0,
        codigo_promocion=codigo_promocion,
        nombre_contacto=payload.nombre_contacto or f"{current_user.nombre} {current_user.apellido or ''}".strip(),
        telefono_contacto=payload.telefono_contacto or current_user.telefono,
        direccion_envio=payload.direccion_envio or current_user.ubicacion,
        metodo_pago=payload.metodo_pago,
        notas=payload.notas,
        subtotal=0,
        total=0,
    )
    db.add(pedido)
    db.flush()

    # Registrar estado inicial en el historial
    _registrar_historial(db, pedido.id, estado_id, "Pedido realizado")

    subtotal = Decimal("0")
    vendedores = {}  # (tipo, entidad_id) -> lista de "cantidad x nombre"
    for item in payload.items:
        producto = db.query(Producto).filter(
            Producto.id == item.producto_id, Producto.activo == True  # noqa: E712
        ).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
        cantidad = max(1, int(item.cantidad or 1))
        if (producto.stock or 0) < cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para '{producto.nombre}'")
        # Precio final considerando el descuento del producto (fuente única de
        # verdad: ``precio_final``), para que coincida con el carrito y el
        # marketplace.
        precio = Decimal(str(precio_final(producto.precio, producto.descuento)))
        linea = precio * cantidad
        subtotal += linea
        db.add(PedidoItem(
            pedido_id=pedido.id,
            producto_id=producto.id,
            nombre_producto=producto.nombre,
            precio_unitario=precio,
            cantidad=cantidad,
            subtotal=linea,
        ))
        # Descuenta stock y suma ventas
        producto.stock = (producto.stock or 0) - cantidad
        producto.ventas = (producto.ventas or 0) + cantidad
        # Registra el vendedor para notificarle
        if producto.tienda_id:
            vendedores.setdefault(("tienda", producto.tienda_id), []).append(f"{cantidad}x {producto.nombre}")
        elif producto.refugio_id:
            vendedores.setdefault(("refugio", producto.refugio_id), []).append(f"{cantidad}x {producto.nombre}")

    pedido.subtotal = subtotal
    # Descuento real: 10% del subtotal solo con el código válido (backend).
    if aplica_descuento:
        descuento = (subtotal * PORCENTAJE_DESCUENTO).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    else:
        descuento = Decimal("0")
    pedido.descuento = descuento
    pedido.total = subtotal + Decimal(str(costo_envio)) - descuento
    db.flush()

    # Notifica al comprador
    numero = f"PED-{pedido.id:05d}"
    crear_notificacion(
        db, current_user.id, "pedido_realizado",
        f"¡Tu pedido {numero} ha sido realizado con éxito!",
        f"/mis-pedidos/{pedido.id}",
    )

    # Notifica a cada vendedor (tienda/refugio) sobre la venta
    for (tipo, ent_id), lineas in vendedores.items():
        if tipo == "tienda":
            ent = db.query(Tienda).filter(Tienda.id == ent_id).first()
            enlace = "/tienda/pedidos"
        else:
            ent = db.query(Refugio).filter(Refugio.id == ent_id).first()
            enlace = "/refugio/tienda"
        if ent and ent.usuario_id:
            detalle = ", ".join(lineas)
            crear_notificacion(
                db, ent.usuario_id, "venta",
                f"¡Nueva venta! Pedido {numero}: {detalle}.",
                enlace,
            )

    db.commit()
    db.refresh(pedido)

    # n8n (WF-1): entrega de notificaciones externas (WhatsApp opt-in, etc.).
    try:
        crear_tarea_ia(db, "notificar_externo", {
            "evento": "pedido_nuevo",
            "pedido_id": pedido.id,
            "numero": numero,
            "comprador_id": current_user.id,
            "vendedores": [
                {"tipo": tipo, "entidad_id": ent_id, "detalle": detalle}
                for (tipo, ent_id), detalle in [
                    (t, e, ", ".join(lineas))
                    for (t, e), lineas in vendedores.items()
                ]
            ],
            "total": float(pedido.total) if pedido.total is not None else 0,
        })
    except Exception as exc:
        logger.warning("[pedidos] No se pudo encolar notificacion externa: %s", exc)

    return serialize_pedido(pedido)


@router.get("/mios")
def mis_pedidos(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    pedidos = (
        db.query(Pedido)
        .filter(Pedido.usuario_id == current_user.id)
        .order_by(Pedido.creado_en.desc())
        .all()
    )
    return [serialize_pedido(p) for p in pedidos]


@router.get("/refugio")
def pedidos_refugio(current_user: Usuario = Depends(require_permiso_refugio("pedidos")), db: Session = Depends(get_db)):
    """Pedidos que contienen productos de la tienda del refugio autenticado."""
    refugio = get_refugio_de_usuario(db, current_user)
    if not refugio:
        return []
    ids = (
        db.query(PedidoItem.pedido_id)
        .join(Producto, Producto.id == PedidoItem.producto_id)
        .filter(Producto.refugio_id == refugio.id)
        .distinct()
        .all()
    )
    ids = [r[0] for r in ids]
    if not ids:
        return []
    pedidos = db.query(Pedido).filter(Pedido.id.in_(ids)).order_by(Pedido.creado_en.desc()).all()
    return [serialize_pedido(p) for p in pedidos]


@router.get("/{pedido_id}")
def obtener_pedido(pedido_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.usuario_id != current_user.id and current_user.rol_codigo not in ("administrador", "administrador_principal"):
        raise HTTPException(status_code=403, detail="No puedes ver este pedido")
    return serialize_pedido(pedido)
