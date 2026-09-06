# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import Optional


class ResenaCreate(BaseModel):
    """Payload para crear/actualizar una reseña de un refugio o tienda.

    Una reseña por usuario y entidad: si el usuario ya valoró esa entidad, la
    reseña se actualiza (upsert) en lugar de duplicarse.
    """
    calificacion: int = Field(..., ge=1, le=5, description="Estrellas (1 a 5)")
    comentario: Optional[str] = Field(None, max_length=1000)


class ResenaOut(BaseModel):
    """Reseña serializada para mostrar en el perfil público/lista."""
    id: int
    refugio_id: Optional[int] = None
    tienda_id: Optional[int] = None
    usuario_id: Optional[int] = None
    usuario_nombre: str = ""
    calificacion: int
    comentario: Optional[str] = None
    creada_en: Optional[str] = None
    editada_en: Optional[str] = None
