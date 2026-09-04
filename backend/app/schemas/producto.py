# pyrefly: ignore [missing-import]
from datetime import datetime
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field, field_validator
# pyrefly: ignore [missing-import]
from typing import Optional, List

from app.core.validadores import validar_nombre_comercial


class ProductoCreate(BaseModel):
    nombre: str
    # codigo del catalogo categorias_producto (o nombre)
    categoria: Optional[str] = None
    precio: float = 0
    descuento: Optional[int] = Field(None, ge=0, le=100, description="Descuento en % (0-100)")
    descripcion: Optional[str] = None
    descripcion_larga: Optional[str] = None
    calidad: Optional[str] = None
    stock: int = Field(0, ge=0, description="Cantidad disponible (no puede ser negativa)")
    marca: Optional[str] = None
    material: Optional[str] = None
    tallas: Optional[str] = None
    colores: Optional[str] = None
    # Nuevos campos para datos detectados por IA
    ingredientes: Optional[str] = None
    ingredientes_activos: Optional[str] = None
    aroma: Optional[str] = None
    instrucciones_cuidado: Optional[str] = None
    tipo_mascota: Optional[str] = None
    edad_recomendada: Optional[str] = None
    peso: Optional[str] = None
    fabricante: Optional[str] = None
    registro_sanitario: Optional[str] = None
    advertencias: Optional[str] = None
    informacion_adicional: Optional[str] = None
    # URLs de imágenes ya subidas a Cloudinary (persistidas en producto_imagenes).
    imagenes: Optional[List[str]] = None

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre_comercial(v, "nombre")

    @field_validator("precio")
    @classmethod
    def _validar_precio(cls, v):
        if v is None or v <= 0:
            raise ValueError("El precio debe ser mayor a 0")
        return v

    @field_validator("categoria")
    @classmethod
    def _validar_categoria(cls, v):
        if v is None or str(v).strip() == "":
            raise ValueError("Debes seleccionar una categoría")
        return v


class AnalisisRequest(BaseModel):
    """Schema para solicitar análisis de producto con IA. Solo necesita imágenes."""
    imagenes: List[str] = []  # Lista de strings base64 de las imágenes


class ProductoCreateConImagenes(ProductoCreate):
    """Extiende ProductoCreate para incluir imágenes en base64."""
    imagenes: List[str] = []  # Lista de strings base64 de las imágenes


class ResenaCreate(BaseModel):
    calificacion: int
    comentario: Optional[str] = None


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    precio: Optional[float] = None
    descuento: Optional[int] = Field(None, ge=0, le=100)
    descripcion: Optional[str] = None
    descripcion_larga: Optional[str] = None
    calidad: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)
    marca: Optional[str] = None
    material: Optional[str] = None
    tallas: Optional[str] = None
    colores: Optional[str] = None
    activo: Optional[bool] = None
    ingredientes: Optional[str] = None
    ingredientes_activos: Optional[str] = None
    aroma: Optional[str] = None
    instrucciones_cuidado: Optional[str] = None
    # Lista COMPLETA de URLs de imágenes (Cloudinary). Si se envía, reemplaza
    # las imágenes del producto (agrega nuevas y elimina las que no estén).
    imagenes: Optional[List[str]] = None

    @field_validator("nombre")
    @classmethod
    def _validar_nombre(cls, v):
        return validar_nombre_comercial(v, "nombre")

    @field_validator("precio")
    @classmethod
    def _validar_precio(cls, v):
        if v is not None and v <= 0:
            raise ValueError("El precio debe ser mayor a 0")
        return v


class ProductoStockUpdate(BaseModel):
    """Actualiza únicamente el stock de un producto. No admite valores negativos."""
    stock: int = Field(..., ge=0)


class ImagenProductoResponse(BaseModel):
    """Imagen de un producto (secure_url de Cloudinary)."""
    id: int
    url: str
    etiqueta: Optional[str] = None
    orden: int = 0


class ProductoResponse(BaseModel):
    id: int
    # Identificador público único (URL amigable /product/<uuid>).
    # Optional: si la migración de uuid aún no corre en algún entorno, no rompe.
    uuid: Optional[str] = None
    nombre: str
    precio: float = 0
    descuento: int = 0
    descripcion: Optional[str] = None
    descripcion_larga: Optional[str] = None
    calidad: Optional[str] = None
    stock: int = 0
    marca: Optional[str] = None
    material: Optional[str] = None
    tallas: Optional[str] = None
    colores: Optional[str] = None
    activo: bool = True
    # Fecha en que se movió a la papelera (borradores). NULL = no eliminado.
    eliminado_en: Optional[datetime] = None
    ventas: int = 0
    resenas_count: int = 0
    rating: float = 0
    categoria: Optional[str] = None
    categoria_id: Optional[int] = None
    refugio_id: Optional[int] = None
    tienda_id: Optional[int] = None
    # Nombres del vendedor (Refugio o Tienda Aliada) para el marketplace.
    refugio_nombre: Optional[str] = None
    tienda_nombre: Optional[str] = None
    imagenes: List[ImagenProductoResponse] = []
    imagen_url: Optional[str] = None
