"""Importa todos los modelos para que SQLAlchemy los registre en Base.metadata."""
from app.models.catalogos import (
    TipoDocumento,
    Rol,
    TipoMascota,
    TamanoMascota,
    GeneroMascota,
    EstadoMascota,
    RazaMascota,
    EstadoSolicitud,
    EstadoPedido,
    CategoriaProducto,
    ForoCategoria,
    TipoPostForo,
    EstadoPostForo,
    TipoReaccion,
)
from app.models.usuario import Usuario
from app.models.refugio import (
    Refugio, RefugioImagen, RefugioPermiso, RefugioEmpleado, RefugioEmpleadoPermiso,
)
from app.models.mascota import Mascota, MascotaImagen
from app.models.solicitud import SolicitudAdopcion
from app.models.solicitud_refugio import (
    SolicitudRefugio,
    SolicitudRefugioDocumento,
    SolicitudRefugioHistorial,
    EnlaceCreacionPassword,
)
from app.models.solicitud_tienda import (
    SolicitudTienda,
    SolicitudTiendaDocumento,
    SolicitudTiendaHistorial,
)
from app.models.tienda import (
    Tienda,
    TiendaPermiso,
    TiendaUsuario,
    TiendaUsuarioPermiso,
    TiendaActividad,
)
from app.models.producto import Producto, ProductoImagen
from app.models.kardex import MovimientoKardex
from app.models.soporte import Notificacion, Pqrs, Reporte, Auditoria
from app.models.donacion import Donacion, DonacionItem
from app.models.tienda_pqrs import TiendaPqrs, TiendaPqrsMensaje, TiendaPqrsAdjunto
from app.models.pedido import Pedido, PedidoItem
from app.models.foro import ForoPost
from app.models.interaccion import (
    Configuracion, FavoritoMascota, FavoritoProducto, ForoComentario, ForoReaccion, Resena,
)
from app.models.verificacion import CodigoVerificacion

__all__ = [
    "TipoDocumento", "Rol", "TipoMascota", "TamanoMascota", "GeneroMascota",
    "RazaMascota", "EstadoMascota", "EstadoSolicitud", "EstadoPedido", "CategoriaProducto",
    "ForoCategoria", "TipoPostForo", "EstadoPostForo", "TipoReaccion",
    "MovimientoKardex","Usuario", "Refugio", "RefugioImagen",
    "RefugioPermiso", "RefugioEmpleado","RefugioEmpleadoPermiso", "Mascota", "MascotaImagen",
    "Tienda", "TiendaPermiso", "TiendaUsuario", "TiendaUsuarioPermiso", 
    "TiendaActividad","Producto", "ProductoImagen","SolicitudAdopcion",
    "Notificacion", "Pqrs", "Reporte", "Auditoria", "Pedido", "PedidoItem", "ForoPost",
    "Donacion", "DonacionItem",
    "TiendaPqrs", "TiendaPqrsMensaje", "TiendaPqrsAdjunto",
    "CodigoVerificacion",
    "SolicitudRefugio", "SolicitudRefugioDocumento", "SolicitudRefugioHistorial",
    "SolicitudTienda", "SolicitudTiendaDocumento", "SolicitudTiendaHistorial",
    "EnlaceCreacionPassword",
]
