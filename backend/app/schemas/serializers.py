"""Convierte objetos ORM (con FKs a catalogos) en diccionarios legibles para la API."""
from app.models.producto import precio_final


def _personalidad_a_lista(v):
    """Normaliza la personalidad a una lista de textos.

    Nuevo formato: columna text[] (ya es una lista). Por compatibilidad, si
    llega una cadena separada por comas (formato anterior), la convierte.
    """
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        return [p.strip() for p in v.split(",") if p.strip()]
    return None


def serialize_usuario(u):
    return {
        "id": u.id,
        "nombre": u.nombre,
        "apellido": u.apellido,
        "email": u.email,
        "telefono": u.telefono,
        "numero_documento": u.numero_documento,
        "ubicacion": u.ubicacion,
        "departamento": u.departamento,
        "municipio": u.municipio,
        "direccion": u.direccion,
        "rol": u.rol.codigo if u.rol else None,
        "tipo_documento": u.tipo_documento.codigo if u.tipo_documento else None,
        "perfil_completo": u.perfil_completo if hasattr(u, "perfil_completo") else False,
        # Imágenes persistentes de Cloudinary (secure_url).
        "avatar_url": u.avatar_url,
        "avatar_public_id": u.avatar_public_id,
        "cover_url": u.cover_url,
    }


def _a_texto(valor):
    """Normaliza un valor a texto plano.

    Si el valor es una lista/tupla (por ejemplo, la personalidad se guardo como
    array en la BD), la une con ", " para cumplir el contrato de los schemas y
    del frontend, que esperan un string.
    """
    if isinstance(valor, (list, tuple)):
        return ", ".join(str(v) for v in valor)
    return valor


def _a_lista(valor):
    """Normaliza un valor a lista de textos (para 'personalidad').

    Si la BD lo guarda como array (text[]) se mantiene como lista; si lo guardo
    como texto separado por comas (formato anterior), se divide. Devuelve None
    si no hay rasgos. Asi la respuesta cumple el contrato de MascotaResponse
    (personalidad: Optional[List[str]]).
    """
    if valor is None or str(valor).strip() == "":
        return None
    if isinstance(valor, str):
        items = [p.strip() for p in valor.split(",") if p.strip()]
        return items or None
    if isinstance(valor, (list, tuple)):
        items = [str(p).strip() for p in valor if str(p).strip()]
        return items or None
    return [str(valor).strip()]


def serialize_mascota(m):
    return {
        "id": m.id,
        # Identificador público único (URL amigable /animal/<uuid>).
        "uuid": getattr(m, "uuid", None),
        "refugio_id": m.refugio_id,
        "nombre": m.nombre,
        "raza": m.raza,
        "edad": m.edad,
        "peso": m.peso,
        "color": m.color,
        "descripcion": m.descripcion,
        "personalidad": _a_lista(m.personalidad),
        "salud": _a_texto(m.salud),
        "requisitos": _a_texto(m.requisitos),
        "vacunado": m.vacunado,
        "esterilizado": m.esterilizado,
        "desparasitado": m.desparasitado,
        "fecha_ingreso": m.fecha_ingreso.isoformat() if m.fecha_ingreso else None,
        "creado_en": m.creado_en.isoformat() if m.creado_en else None,
        "refugio_nombre": m.refugio.nombre if m.refugio else None,
        "refugio_telefono": m.refugio.telefono if m.refugio else None,
        "refugio_direccion": m.refugio.direccion if m.refugio else None,
        "refugio_ubicacion": m.refugio.ubicacion if m.refugio else None,
        # Disponible si el refugio no está borrado y la cuenta de su
        # representante está activa (no suspendido).
        "refugio_activo": (
            bool(m.refugio and m.refugio.activo and m.refugio.usuario and m.refugio.usuario.activo)
            if m.refugio else None
        ),
        # Etiquetas legibles (nombre) + ids por si el frontend los necesita
        "tipo": m.tipo.nombre if m.tipo else None,
        "tamano": m.tamano.nombre if m.tamano else None,
        "genero": m.genero.nombre if m.genero else None,
        "estado": m.estado.codigo if m.estado else None,
        "activo": m.activo,
        # Fecha en que se movió a la papelera (borradores). NULL = no eliminada.
        "eliminado_en": m.eliminado_en.isoformat() if m.eliminado_en else None,
        "tipo_id": m.tipo_id,
        "tamano_id": m.tamano_id,
        "genero_id": m.genero_id,
        "estado_id": m.estado_id,
        # Imágenes de Cloudinary (secure_url) almacenadas en mascota_imagenes.
        "imagenes": [
            {"id": img.id, "url": img.url, "public_id": img.public_id}
            for img in (m.imagenes or [])
        ],
    }


def serialize_solicitud(s):
    return {
        "id": s.id,
        "mascota_id": s.mascota_id,
        "mascota_nombre": s.mascota.nombre if s.mascota else None,
        "mascota_tipo": s.mascota.tipo.nombre if s.mascota and s.mascota.tipo else None,
        "usuario_id": s.usuario_id,
        "nombre_contacto": s.nombre_contacto,
        "email_contacto": s.email_contacto,
        "telefono_contacto": s.telefono_contacto,
        "ubicacion": s.ubicacion,
        "departamento": s.departamento,
        "municipio": s.municipio,
        "direccion": s.direccion,
        "tipo_documento": s.tipo_documento,
        "numero_documento": s.numero_documento,
        "mensaje": s.mensaje,
        "notas": s.notas,
        "tiene_familia": s.tiene_familia,
        "tiene_experiencia": s.tiene_experiencia,
        "progreso": s.progreso,
        "estado": s.estado.codigo if s.estado else None,
        "estado_id": s.estado_id,
        "creada_en": s.creada_en.isoformat() if s.creada_en else None,
    }


def serialize_pedido(p, solo_tienda_id=None):
    """Serializa un pedido con sus items. Si solo_tienda_id se indica, filtra
    los items a los de esa tienda y recalcula el subtotal desde la vista de la tienda."""
    items = p.items or []
    if solo_tienda_id is not None:
        items = [it for it in items if it.producto and it.producto.tienda_id == solo_tienda_id]
    items_data = [
        {
            "id": it.id,
            "producto_id": it.producto_id,
            "nombre_producto": it.nombre_producto,
            "precio_unitario": float(it.precio_unitario) if it.precio_unitario is not None else 0,
            "cantidad": it.cantidad,
            "subtotal": float(it.subtotal) if it.subtotal is not None else 0,
            "tienda_id": it.producto.tienda_id if it.producto else None,
        }
        for it in items
    ]
    subtotal_vista = sum(i["subtotal"] for i in items_data) if solo_tienda_id is not None else (float(p.subtotal) if p.subtotal is not None else 0)
    return {
        "id": p.id,
        "numero": f"PED-{p.id:05d}",
        "usuario_id": p.usuario_id,
        "estado": p.estado.codigo if p.estado else None,
        "estado_nombre": p.estado.nombre if p.estado else None,
        "subtotal": subtotal_vista,
        "costo_envio": float(p.costo_envio) if p.costo_envio is not None else 0,
        "descuento": float(p.descuento) if p.descuento is not None else 0,
        "total": (subtotal_vista if solo_tienda_id is not None else (float(p.total) if p.total is not None else 0)),
        "codigo_promocion": p.codigo_promocion,
        "nombre_contacto": p.nombre_contacto,
        "telefono_contacto": p.telefono_contacto,
        "direccion_envio": p.direccion_envio,
        "metodo_pago": p.metodo_pago,
        "notas": p.notas,
        "creado_en": p.creado_en.isoformat() if p.creado_en else None,
        "items": items_data,
    }


def serialize_pedido(p, solo_tienda_id=None):
    """Serializa un pedido con sus items. Si solo_tienda_id se indica, filtra
    los items a los de esa tienda y recalcula el subtotal desde la vista de la tienda."""
    try:
        return _serialize_pedido_inner(p, solo_tienda_id)
    except Exception as exc:
        print(f"[serializer] Error serializando pedido {getattr(p, 'id', '?')}: {exc}")
        return _serialize_pedido_fallback(p, solo_tienda_id)


def _serialize_pedido_fallback(p, solo_tienda_id=None):
    """Serializacion de emergencia si algo falla (tabla faltante, etc)."""
    items = p.items or []
    if solo_tienda_id is not None:
        items = [it for it in items if it.producto and it.producto.tienda_id == solo_tienda_id]
    items_data = [
        {
            "id": it.id,
            "producto_id": it.producto_id,
            "nombre_producto": it.nombre_producto,
            "precio_unitario": float(it.precio_unitario) if it.precio_unitario is not None else 0,
            "cantidad": it.cantidad,
            "subtotal": float(it.subtotal) if it.subtotal is not None else 0,
            "tienda_id": it.producto.tienda_id if it.producto else None,
            "refugio_id": it.producto.refugio_id if it.producto else None,
            "imagen_url": None,
        }
        for it in items
    ]
    subtotal_vista = sum(i["subtotal"] for i in items_data) if solo_tienda_id is not None else (float(p.subtotal) if p.subtotal is not None else 0)
    return {
        "id": p.id,
        "numero": f"PED-{p.id:05d}",
        "usuario_id": p.usuario_id,
        "estado": p.estado.codigo if p.estado else None,
        "estado_nombre": p.estado.nombre if p.estado else None,
        "subtotal": subtotal_vista,
        "costo_envio": float(p.costo_envio) if p.costo_envio is not None else 0,
        "descuento": float(p.descuento) if p.descuento is not None else 0,
        "total": (subtotal_vista if solo_tienda_id is not None else (float(p.total) if p.total is not None else 0)),
        "codigo_promocion": p.codigo_promocion,
        "nombre_contacto": p.nombre_contacto,
        "telefono_contacto": p.telefono_contacto,
        "direccion_envio": p.direccion_envio,
        "metodo_pago": p.metodo_pago,
        "notas": p.notas,
        "fecha_estimada_entrega": None,
        "numero_guia": getattr(p, "numero_guia", None),
        "empresa_transportadora": getattr(p, "empresa_transportadora", None),
        "creado_en": p.creado_en.isoformat() if p.creado_en else None,
        "items": items_data,
        "vendedor": None,
        "historial": [],
    }


def _serialize_pedido_inner(p, solo_tienda_id=None):
    items = p.items or []
    if solo_tienda_id is not None:
        items = [it for it in items if it.producto and it.producto.tienda_id == solo_tienda_id]
    items_data = [
        {
            "id": it.id,
            "producto_id": it.producto_id,
            "nombre_producto": it.nombre_producto,
            "precio_unitario": float(it.precio_unitario) if it.precio_unitario is not None else 0,
            "cantidad": it.cantidad,
            "subtotal": float(it.subtotal) if it.subtotal is not None else 0,
            "tienda_id": it.producto.tienda_id if it.producto else None,
            "refugio_id": it.producto.refugio_id if it.producto else None,
            "imagen_url": _primera_imagen_producto(it.producto) if it.producto else None,
        }
        for it in items
    ]
    subtotal_vista = sum(i["subtotal"] for i in items_data) if solo_tienda_id is not None else (float(p.subtotal) if p.subtotal is not None else 0)

    # Informacion del vendedor (tienda o refugio)
    vendedor = _info_vendedor(items)

    # Historial de estados (con proteccion por si la tabla no existe)
    historial = []
    try:
        if hasattr(p, "historial") and p.historial:
            historial = [
                {
                    "id": h.id,
                    "estado": h.estado.codigo if h.estado else None,
                    "estado_nombre": h.estado.nombre if h.estado else None,
                    "notas": h.notas,
                    "creado_en": h.creado_en.isoformat() if h.creado_en else None,
                }
                for h in p.historial
            ]
    except Exception:
        historial = []

    return {
        "id": p.id,
        "numero": f"PED-{p.id:05d}",
        "usuario_id": p.usuario_id,
        "estado": p.estado.codigo if p.estado else None,
        "estado_nombre": p.estado.nombre if p.estado else None,
        "subtotal": subtotal_vista,
        "costo_envio": float(p.costo_envio) if p.costo_envio is not None else 0,
        "descuento": float(p.descuento) if p.descuento is not None else 0,
        "total": (subtotal_vista if solo_tienda_id is not None else (float(p.total) if p.total is not None else 0)),
        "codigo_promocion": p.codigo_promocion,
        "nombre_contacto": p.nombre_contacto,
        "telefono_contacto": p.telefono_contacto,
        "direccion_envio": p.direccion_envio,
        "metodo_pago": p.metodo_pago,
        "notas": p.notas,
        "fecha_estimada_entrega": p.fecha_estimada_entrega.isoformat() if p.fecha_estimada_entrega else None,
        "numero_guia": p.numero_guia,
        "empresa_transportadora": p.empresa_transportadora,
        "creado_en": p.creado_en.isoformat() if p.creado_en else None,
        "items": items_data,
        "vendedor": vendedor,
        "historial": historial,
    }


def _primera_imagen_producto(producto):
    """Obtiene la URL de la primera imagen de un producto."""
    if not producto:
        return None
    try:
        if hasattr(producto, "imagenes") and producto.imagenes:
            return producto.imagenes[0].url
    except Exception:
        pass
    return None


def _info_vendedor(items):
    """Obtiene la informacion del vendedor a partir de las relaciones de los items."""
    seen_tiendas = {}
    seen_refugios = {}
    for it in items:
        if not it.producto:
            continue
        # Tienda
        if it.producto.tienda_id and it.producto.tienda_id not in seen_tiendas:
            seen_tiendas[it.producto.tienda_id] = True
            tienda = getattr(it.producto, "tienda", None)
            if tienda:
                return {
                    "tipo": "tienda",
                    "id": tienda.id,
                    "nombre": tienda.nombre,
                }
        # Refugio
        if it.producto.refugio_id and it.producto.refugio_id not in seen_refugios:
            seen_refugios[it.producto.refugio_id] = True
            refugio = getattr(it.producto, "refugio", None)
            if refugio:
                return {
                    "tipo": "refugio",
                    "id": refugio.id,
                    "nombre": refugio.nombre,
                }
    return None


def serialize_producto(p):
    descuento = int(p.descuento or 0) if p.descuento is not None else 0
    precio_original = float(p.precio) if p.precio is not None else 0
    return {
        "id": p.id,
        # Identificador público único (URL amigable /product/<uuid>).
        "uuid": getattr(p, "uuid", None),
        "nombre": p.nombre,
        "precio": float(p.precio) if p.precio is not None else 0,
        "descuento": p.descuento or 0,
        "descripcion": p.descripcion,
        "descripcion_larga": p.descripcion_larga,
        "calidad": p.calidad,
        "stock": p.stock,
        "marca": p.marca,
        "material": p.material,
        "tallas": p.tallas,
        "colores": p.colores,
        "activo": p.activo,
        # Fecha en que se movió a la papelera (borradores). NULL = no eliminado.
        "eliminado_en": p.eliminado_en.isoformat() if p.eliminado_en else None,
        "ventas": p.ventas,
        "resenas_count": len(p.resenas) if p.resenas is not None else 0,
        "rating": float(p.rating) if p.rating is not None else 0,
        "categoria": p.categoria.nombre if p.categoria else None,
        "categoria_id": p.categoria_id,
        "refugio_id": p.refugio_id,
        "tienda_id": p.tienda_id,
        # Nombres del vendedor (Refugio o Tienda Aliada) para el marketplace.
        "refugio_nombre": p.refugio.nombre if p.refugio else None,
        "tienda_nombre": p.tienda.nombre if p.tienda else None,
        "creado_en": p.creado_en.isoformat() if p.creado_en else None,
        # Imágenes de Cloudinary (secure_url) almacenadas en producto_imagenes.
        "imagenes": [
            {"id": img.id, "url": img.url, "etiqueta": img.etiqueta, "orden": img.orden}
            for img in (p.imagenes or [])
        ],
        # URL de la primera imagen (cómoda para listados y tarjetas).
        "imagen_url": (p.imagenes[0].url if (p.imagenes or []) else None),
    }


def serialize_movimiento_kardex(m):
    """Serializa un movimiento de Kardex para la API del panel de tienda."""
    return {
        "id": m.id,
        "producto_id": m.producto_id,
        "tienda_id": m.tienda_id,
        "tipo_movimiento": m.tipo_movimiento,
        "concepto": m.concepto,
        "cantidad": m.cantidad,
        "costo_unitario": float(m.costo_unitario) if m.costo_unitario is not None else 0,
        "costo_total": float(m.costo_total) if m.costo_total is not None else 0,
        "saldo_cantidad": m.saldo_cantidad,
        "saldo_valor": float(m.saldo_valor) if m.saldo_valor is not None else 0,
        "saldo_costo_unitario": (
            round(float(m.saldo_valor) / m.saldo_cantidad, 2)
            if m.saldo_cantidad and m.saldo_valor is not None
            else 0
        ),
        "creado_en": m.creado_en.isoformat() if m.creado_en else None,
    }
