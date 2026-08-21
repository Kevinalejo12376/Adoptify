"""
Generadores concretos de reportes de Adoptify.

Cada clase es una subclase de ``GeneradorReporte`` que solo define sus
columnas y la consulta de datos. Para agregar un nuevo reporte basta con crear
una clase aqui (o en otro modulo) y registrarla en ``reportes/__init__.py``.
"""
# pyrefly: ignore [missing-import]
from typing import Any, Dict, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.mascota import Mascota
from app.models.pedido import Pedido
from app.models.producto import Producto
from app.models.refugio import Refugio
from app.models.solicitud import SolicitudAdopcion
from app.models.soporte import Pqrs, Reporte
from app.models.tienda import Tienda
from app.models.usuario import Usuario
from app.services.reportes.base import (
    Columna,
    GeneradorReporte,
    TIPO_BOOLEANO,
    TIPO_ENTERO,
    TIPO_FECHA_HORA,
    TIPO_MONEDA,
    TIPO_NUMERO,
)


def _fecha(v) -> str:
    return v.isoformat() if v else None


# ===========================================================================
# USUARIOS
# ===========================================================================
class ReporteUsuarios(GeneradorReporte):
    codigo = "usuarios"
    titulo = "Reporte de Usuarios"
    descripcion = "Listado de todos los usuarios registrados en la plataforma."
    nombre_archivo = "reporte_usuarios"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("nombre", "Nombre", ancho_pdf=90, ancho_excel=18),
        Columna("apellido", "Apellido", ancho_pdf=90, ancho_excel=16),
        Columna("email", "Correo", ancho_pdf=130, ancho_excel=26),
        Columna("rol", "Rol", ancho_pdf=80, ancho_excel=16),
        Columna("activo", "Activo", TIPO_BOOLEANO, ancho_pdf=45, ancho_excel=8, alinear="center"),
        Columna("ubicacion", "Ubicación", ancho_pdf=80, ancho_excel=16),
        Columna("creado_en", "Registrado", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        usuarios = db.query(Usuario).order_by(Usuario.creado_en.desc()).all()
        return [
            {
                "id": u.id,
                "nombre": u.nombre,
                "apellido": u.apellido,
                "email": u.email,
                "rol": u.rol.nombre if u.rol else "—",
                "activo": u.activo,
                "ubicacion": u.ubicacion or "—",
                "creado_en": _fecha(u.creado_en),
            }
            for u in usuarios
        ]


# ===========================================================================
# MASCOTAS
# ===========================================================================
class ReporteMascotas(GeneradorReporte):
    codigo = "mascotas"
    titulo = "Reporte de Mascotas"
    descripcion = "Listado de las mascotas registradas por los refugios."
    nombre_archivo = "reporte_mascotas"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("nombre", "Nombre", ancho_pdf=90, ancho_excel=18),
        Columna("tipo", "Tipo", ancho_pdf=70, ancho_excel=14),
        Columna("raza", "Raza", ancho_pdf=100, ancho_excel=20),
        Columna("edad", "Edad", ancho_pdf=55, ancho_excel=10),
        Columna("estado", "Estado", ancho_pdf=80, ancho_excel=14),
        Columna("refugio", "Refugio", ancho_pdf=110, ancho_excel=22),
        Columna("creado_en", "Registrado", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        mascotas = (
            db.query(Mascota)
            .order_by(Mascota.creado_en.desc())
            .all()
        )
        return [
            {
                "id": m.id,
                "nombre": m.nombre,
                "tipo": m.tipo.nombre if m.tipo else "—",
                "raza": m.raza or "—",
                "edad": m.edad or "—",
                "estado": m.estado.nombre if m.estado else "—",
                "refugio": m.refugio.nombre if m.refugio else "—",
                "creado_en": _fecha(m.creado_en),
            }
            for m in mascotas
        ]


# ===========================================================================
# REFUGIOS
# ===========================================================================
class ReporteRefugios(GeneradorReporte):
    codigo = "refugios"
    titulo = "Reporte de Refugios"
    descripcion = "Listado de los refugios registrados y verificados."
    nombre_archivo = "reporte_refugios"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("nombre", "Nombre", ancho_pdf=110, ancho_excel=24),
        Columna("ubicacion", "Ubicación", ancho_pdf=90, ancho_excel=18),
        Columna("email", "Correo", ancho_pdf=120, ancho_excel=24),
        Columna("telefono", "Teléfono", ancho_pdf=80, ancho_excel=14),
        Columna("rescatados", "Rescatados", TIPO_ENTERO, ancho_pdf=60, ancho_excel=10, alinear="center"),
        Columna("verificado", "Verificado", TIPO_BOOLEANO, ancho_pdf=55, ancho_excel=10, alinear="center"),
        Columna("creado_en", "Registrado", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        refugios = db.query(Refugio).order_by(Refugio.creado_en.desc()).all()
        return [
            {
                "id": r.id,
                "nombre": r.nombre,
                "ubicacion": r.ubicacion or r.municipio or "—",
                "email": r.email or "—",
                "telefono": r.telefono or "—",
                "rescatados": r.total_rescatados or 0,
                "verificado": r.verificado,
                "creado_en": _fecha(r.creado_en),
            }
            for r in refugios
        ]


# ===========================================================================
# TIENDAS ALIADAS
# ===========================================================================
class ReporteTiendas(GeneradorReporte):
    codigo = "tiendas"
    titulo = "Reporte de Tiendas Aliadas"
    descripcion = "Listado de las tiendas aliadas al marketplace."
    nombre_archivo = "reporte_tiendas"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("nombre", "Nombre", ancho_pdf=110, ancho_excel=24),
        Columna("estado", "Estado", ancho_pdf=70, ancho_excel=12),
        Columna("ciudad", "Ciudad", ancho_pdf=90, ancho_excel=18),
        Columna("email", "Correo", ancho_pdf=120, ancho_excel=24),
        Columna("telefono", "Teléfono", ancho_pdf=80, ancho_excel=14),
        Columna("rating", "Rating", TIPO_NUMERO, ancho_pdf=50, ancho_excel=8, alinear="center"),
        Columna("creado_en", "Registrado", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        tiendas = db.query(Tienda).order_by(Tienda.creado_en.desc()).all()
        return [
            {
                "id": t.id,
                "nombre": t.nombre,
                "estado": (t.estado or "activa").capitalize(),
                "ciudad": t.ciudad or t.ubicacion or "—",
                "email": t.email or "—",
                "telefono": t.telefono or "—",
                "rating": float(t.rating) if t.rating is not None else 0,
                "creado_en": _fecha(t.creado_en),
            }
            for t in tiendas
        ]


# ===========================================================================
# PRODUCTOS
# ===========================================================================
class ReporteProductos(GeneradorReporte):
    codigo = "productos"
    titulo = "Reporte de Productos"
    descripcion = "Listado de los productos del marketplace con su vendedor."
    nombre_archivo = "reporte_productos"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("nombre", "Nombre", ancho_pdf=110, ancho_excel=24),
        Columna("categoria", "Categoría", ancho_pdf=80, ancho_excel=16),
        Columna("precio", "Precio", TIPO_MONEDA, ancho_pdf=65, ancho_excel=12, alinear="right"),
        Columna("stock", "Stock", TIPO_ENTERO, ancho_pdf=45, ancho_excel=8, alinear="center"),
        Columna("ventas", "Ventas", TIPO_ENTERO, ancho_pdf=45, ancho_excel=8, alinear="center"),
        Columna("vendedor", "Vendedor", ancho_pdf=110, ancho_excel=22),
        Columna("activo", "Activo", TIPO_BOOLEANO, ancho_pdf=45, ancho_excel=8, alinear="center"),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        productos = db.query(Producto).order_by(Producto.creado_en.desc()).all()
        ref_ids = {p.refugio_id for p in productos if p.refugio_id}
        refs = {}
        if ref_ids:
            refs = {r.id: r.nombre for r in db.query(Refugio).filter(Refugio.id.in_(ref_ids)).all()}
        return [
            {
                "id": p.id,
                "nombre": p.nombre,
                "categoria": p.categoria.nombre if p.categoria else "—",
                "precio": float(p.precio) if p.precio is not None else 0,
                "stock": p.stock,
                "ventas": p.ventas or 0,
                "vendedor": (p.tienda.nombre if p.tienda else refs.get(p.refugio_id)) or "—",
                "activo": p.activo,
            }
            for p in productos
        ]


# ===========================================================================
# PEDIDOS
# ===========================================================================
class ReportePedidos(GeneradorReporte):
    codigo = "pedidos"
    titulo = "Reporte de Pedidos"
    descripcion = "Listado de pedidos realizados en el marketplace."
    nombre_archivo = "reporte_pedidos"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("contacto", "Contacto", ancho_pdf=100, ancho_excel=20),
        Columna("estado", "Estado", ancho_pdf=80, ancho_excel=14),
        Columna("subtotal", "Subtotal", TIPO_MONEDA, ancho_pdf=60, ancho_excel=12, alinear="right"),
        Columna("costo_envio", "Envío", TIPO_MONEDA, ancho_pdf=55, ancho_excel=10, alinear="right"),
        Columna("descuento", "Descuento", TIPO_MONEDA, ancho_pdf=60, ancho_excel=10, alinear="right"),
        Columna("total", "Total", TIPO_MONEDA, ancho_pdf=60, ancho_excel=12, alinear="right"),
        Columna("creado_en", "Fecha", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        pedidos = db.query(Pedido).order_by(Pedido.creado_en.desc()).all()
        return [
            {
                "id": p.id,
                "contacto": p.nombre_contacto or f"Usuario #{p.usuario_id}" if p.usuario_id else "—",
                "estado": p.estado.nombre if p.estado else "—",
                "subtotal": float(p.subtotal or 0),
                "costo_envio": float(p.costo_envio or 0),
                "descuento": float(p.descuento or 0),
                "total": float(p.total or 0),
                "creado_en": _fecha(p.creado_en),
            }
            for p in pedidos
        ]


# ===========================================================================
# SOLICITUDES DE ADOPCION
# ===========================================================================
class ReporteSolicitudes(GeneradorReporte):
    codigo = "solicitudes"
    titulo = "Reporte de Solicitudes de Adopción"
    descripcion = "Listado de solicitudes de adopción enviadas por los usuarios."
    nombre_archivo = "reporte_solicitudes"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("contacto", "Contacto", ancho_pdf=100, ancho_excel=20),
        Columna("email", "Correo", ancho_pdf=120, ancho_excel=24),
        Columna("mascota", "Mascota", ancho_pdf=90, ancho_excel=18),
        Columna("estado", "Estado", ancho_pdf=80, ancho_excel=14),
        Columna("ubicacion", "Ubicación", ancho_pdf=90, ancho_excel=16),
        Columna("creada_en", "Fecha", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        solicitudes = db.query(SolicitudAdopcion).order_by(SolicitudAdopcion.creada_en.desc()).all()
        return [
            {
                "id": s.id,
                "contacto": s.nombre_contacto,
                "email": s.email_contacto or "—",
                "mascota": s.mascota.nombre if s.mascota else "—",
                "estado": s.estado.nombre if s.estado else "—",
                "ubicacion": s.ubicacion or "—",
                "creada_en": _fecha(s.creada_en),
            }
            for s in solicitudes
        ]


# ===========================================================================
# PQRS
# ===========================================================================
class ReportePqrs(GeneradorReporte):
    codigo = "pqrs"
    titulo = "Reporte de PQRS"
    descripcion = "Listado de peticiones, quejas, reclamos y sugerencias."
    nombre_archivo = "reporte_pqrs"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("tipo", "Tipo", ancho_pdf=70, ancho_excel=12),
        Columna("asunto", "Asunto", ancho_pdf=150, ancho_excel=30),
        Columna("estado", "Estado", ancho_pdf=80, ancho_excel=14),
        Columna("usuario", "Usuario", ancho_pdf=90, ancho_excel=18),
        Columna("creado_en", "Fecha", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        pqrs = db.query(Pqrs).order_by(Pqrs.creado_en.desc()).all()
        user_ids = {p.usuario_id for p in pqrs if p.usuario_id}
        usuarios = {}
        if user_ids:
            usuarios = {
                u.id: f"{u.nombre} {u.apellido or ''}".strip()
                for u in db.query(Usuario).filter(Usuario.id.in_(user_ids)).all()
            }
        return [
            {
                "id": p.id,
                "tipo": p.tipo.capitalize(),
                "asunto": p.asunto,
                "estado": p.estado.replace("_", " ").capitalize(),
                "usuario": usuarios.get(p.usuario_id, "—"),
                "creado_en": _fecha(p.creado_en),
            }
            for p in pqrs
        ]


# ===========================================================================
# REPORTES DE CONTENIDO (denuncias)
# ===========================================================================
class ReporteContenido(GeneradorReporte):
    codigo = "reportes_contenido"
    titulo = "Reporte de Denuncias de Contenido"
    descripcion = "Listado de reportes/denuncias realizadas por los usuarios."
    nombre_archivo = "reporte_denuncias"
    columnas = [
        Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
        Columna("tipo_objeto", "Objeto", ancho_pdf=80, ancho_excel=14),
        Columna("objeto_id", "ID Objeto", TIPO_ENTERO, ancho_pdf=50, ancho_excel=10, alinear="center"),
        Columna("motivo", "Motivo", ancho_pdf=180, ancho_excel=40),
        Columna("estado", "Estado", ancho_pdf=80, ancho_excel=14),
        Columna("creado_en", "Fecha", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        reportes = db.query(Reporte).order_by(Reporte.creado_en.desc()).all()
        return [
            {
                "id": r.id,
                "tipo_objeto": r.tipo_objeto,
                "objeto_id": r.objeto_id or 0,
                "motivo": r.motivo,
                "estado": r.estado.replace("_", " ").capitalize(),
                "creado_en": _fecha(r.creado_en),
            }
            for r in reportes
        ]


# ===========================================================================
# ESTADISTICAS GENERALES
# ===========================================================================
class ReporteEstadisticas(GeneradorReporte):
    codigo = "estadisticas"
    titulo = "Reporte de Estadísticas Generales"
    descripcion = "Resumen de los indicadores clave de la plataforma."
    nombre_archivo = "reporte_estadisticas"
    columnas = [
        Columna("indicador", "Indicador", ancho_pdf=220, ancho_excel=36),
        Columna("valor", "Valor", TIPO_ENTERO, ancho_pdf=60, ancho_excel=12, alinear="center"),
    ]

    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        conteo_roles = dict(
            db.query(Usuario.rol_id, func.count(Usuario.id))
            .group_by(Usuario.rol_id)
            .all()
        )
        return [
            {"indicador": "Usuarios registrados", "valor": sum(conteo_roles.values())},
            {"indicador": "Mascotas registradas", "valor": db.query(Mascota).count()},
            {"indicador": "Refugios", "valor": db.query(Refugio).count()},
            {"indicador": "Tiendas aliadas", "valor": db.query(Tienda).count()},
            {"indicador": "Productos", "valor": db.query(Producto).count()},
            {"indicador": "Pedidos", "valor": db.query(Pedido).count()},
            {"indicador": "Solicitudes de adopción", "valor": db.query(SolicitudAdopcion).count()},
            {"indicador": "PQRS", "valor": db.query(Pqrs).count()},
            {"indicador": "Denuncias de contenido", "valor": db.query(Reporte).count()},
        ]
