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


class ProductoResponse(BaseModel):
    id: int
    nombre: str
    precio: float = 0
    descripcion: Optional[str] = None
    descripcion_larga: Optional[str] = None
    calidad: Optional[str] = None
    stock: int = 0
    marca: Optional[str] = None
    material: Optional[str] = None
    tallas: Optional[str] = None
    colores: Optional[str] = None
    activo: bool = True
    ventas: int = 0
    resenas_count: int = 0
    rating: float = 0
    categoria: Optional[str] = None
    categoria_id: Optional[int] = None
    refugio_id: Optional[int] = None
    tienda_id: Optional[int] = None
