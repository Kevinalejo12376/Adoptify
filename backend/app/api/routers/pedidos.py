"""Pedidos del comprador (usuario autenticado): checkout y consulta."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from decimal import Decimal

from app.db.database import get_db
from app.core.security import get_current_user
from app.core.lookups import id_por_codigo
from app.models.usuario import Usuario
from app.models.producto import Producto
from app.models.pedido import Pedido, PedidoItem
from app.models.tienda import Tienda
from app.models.refugio import Refugio
from app.models.catalogos import EstadoPedido
from app.schemas.pedido import PedidoCreate
from app.schemas.serializers import serialize_pedido
from app.core.notificaciones import crear_notificacion

router = APIRouter()


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

    pedido = Pedido(
        usuario_id=current_user.id,
        estado_id=estado_id,
        costo_envio=Decimal(str(payload.costo_envio or 0)),
        descuento=Decimal(str(payload.descuento or 0)),
        codigo_promocion=payload.codigo_promocion,
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
        producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
        cantidad = max(1, int(item.cantidad or 1))
        if (producto.stock or 0) < cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para '{producto.nombre}'")
        precio = Decimal(str(producto.precio or 0))
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
    pedido.total = subtotal + Decimal(str(payload.costo_envio or 0)) - Decimal(str(payload.descuento or 0))
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


@router.get("/{pedido_id}")
def obtener_pedido(pedido_id: int, current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.usuario_id != current_user.id and current_user.rol_codigo not in ("administrador", "administrador_principal"):
        raise HTTPException(status_code=403, detail="No puedes ver este pedido")
    return serialize_pedido(pedido)
