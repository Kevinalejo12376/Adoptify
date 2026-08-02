"""Importa todos los modelos para que SQLAlchemy los registre en Base.metadata."""
from app.models.catalogos import (
    TipoDocumento,
    Rol,
    TipoMascota,
    TamanoMascota,
    GeneroMascota,
    EstadoMascota,
    EstadoSolicitud,
    EstadoPedido,
    CategoriaProducto,
    ForoCategoria,
    TipoPostForo,
    EstadoPostForo,
    TipoReaccion,
)
from app.models.usuario import Usuario
from app.models.refugio import Refugio
from app.models.mascota import Mascota
from app.models.solicitud import SolicitudAdopcion
from app.models.solicitud_refugio import (
    SolicitudRefugio,
    SolicitudRefugioDocumento,
    SolicitudRefugioHistorial,
    EnlaceCreacionPassword,
)
from app.models.tienda import Tienda
from app.models.producto import Producto, ProductoImagen
from app.models.soporte import Notificacion, Pqrs, Reporte, Auditoria
from app.models.pedido import Pedido, PedidoItem
from app.models.foro import ForoPost
from app.models.interaccion import (
    Configuracion, FavoritoMascota, FavoritoProducto, ForoComentario, ForoReaccion, Resena,
)
from app.models.verificacion import CodigoVerificacion

__all__ = [
    "TipoDocumento", "Rol", "TipoMascota", "TamanoMascota", "GeneroMascota",
    "EstadoMascota", "EstadoSolicitud", "EstadoPedido", "CategoriaProducto",
    "ForoCategoria", "TipoPostForo", "EstadoPostForo", "TipoReaccion",
    "Usuario", "Refugio", "Mascota", "SolicitudAdopcion", "Tienda", "Producto",
    "ProductoImagen",
    "Notificacion", "Pqrs", "Reporte", "Auditoria", "Pedido", "PedidoItem", "ForoPost",
    "CodigoVerificacion",
    "SolicitudRefugio", "SolicitudRefugioDocumento", "SolicitudRefugioHistorial",
    "EnlaceCreacionPassword",
]
