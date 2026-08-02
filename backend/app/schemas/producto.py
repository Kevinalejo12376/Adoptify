# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from typing import Optional, List


class ProductoCreate(BaseModel):
    nombre: str
    # codigo del catalogo categorias_producto (o nombre)
    categoria: Optional[str] = None
    precio: float = 0
    descripcion: Optional[str] = None
    descripcion_larga: Optional[str] = None
    calidad: Optional[str] = None
    stock: int = 0
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
    stock: Optional[int] = None
    marca: Optional[str] = None
    material: Optional[str] = None
    tallas: Optional[str] = None
    colores: Optional[str] = None
    activo: Optional[bool] = None
    ingredientes: Optional[str] = None
    ingredientes_activos: Optional[str] = None
    aroma: Optional[str] = None
    instrucciones_cuidado: Optional[str] = None


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
