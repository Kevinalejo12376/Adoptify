"""
Router UNIFICADO de subida de imágenes a Cloudinary.

Centraliza TODO el flujo de carga de imágenes de la aplicación:

- ``POST /api/upload/imagen``           → subida PERMANENTE por tipo.
- ``POST /api/upload/imagen-temporal``   → subida TEMPORAL (previews, IA, etc.).
- ``DELETE /api/upload/{public_id}``     → elimina una imagen (permanente o temporal).

Reglas de negocio:
- Solo se almacena en la BD la ``secure_url`` devuelta por Cloudinary.
- Las imágenes TEMPORALES viven en ``temp/`` y se eliminan manualmente
  (o por el backend cuando el flujo termina) para no acumular basura.
- Las imágenes PERMANENTES se organizan en carpetas por tipo
  (usuarios/, refugios/, mascotas/, productos/, foro/, etc.).
"""
# pyrefly: ignore [missing-import]
from typing import List, Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.services import cloudinary_service
from app.services.cloudinary_service import (
    CLOUDINARY_FOLDERS,
    TIPOS_IMAGEN,
    subir_imagen,
    subir_imagen_temporal,
    eliminar_imagen_temporal,
    eliminar_imagen_permanente,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas de entrada
# ---------------------------------------------------------------------------
class ImagenUpload(BaseModel):
    """Petición de subida PERMANENTE."""
    tipo: str = Field(..., description="Clave de TIPOS_IMAGEN (ej: 'usuario', 'mascota', 'foro')")
    imagen_base64: str = Field(..., description="Imagen en base64 (con o sin prefijo data:)")
    etiqueta: Optional[str] = Field(None, description="Identificador opcional de la imagen")


class ImagenTemporalUpload(BaseModel):
    """Petición de subida TEMPORAL."""
    imagen_base64: str = Field(..., description="Imagen en base64 (con o sin prefijo data:)")
    carpeta_temp: str = Field(
        "TEMP_GENERAL",
        description="Clave de CLOUDINARY_FOLDERS temporal (TEMP_PREVIEW, TEMP_ESCANEO, ...)",
    )
    etiqueta: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/imagen", status_code=status.HTTP_201_CREATED)
def subir_imagen_permanente(
    payload: ImagenUpload,
    current_user: Usuario = Depends(get_current_user),
):
    """
    Sube una imagen PERMANENTE a Cloudinary en la carpeta de su tipo.

    - Valida el tipo contra ``TIPOS_IMAGEN``.
    - Valida el formato/tamaño de la imagen.
    - Devuelve ``{url, public_id, tipo}``. Solo la ``url`` (secure_url)
      debe guardarse en la base de datos.
    """
    if payload.tipo not in TIPOS_IMAGEN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Tipo de imagen '{payload.tipo}' no soportado. "
                f"Válidos: {', '.join(sorted(TIPOS_IMAGEN))}"
            ),
        )

    try:
        resultado = subir_imagen(
            payload.tipo,
            payload.imagen_base64,
            payload.etiqueta,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo subir la imagen a Cloudinary: {exc}",
        ) from exc

    return {
        "url": resultado["url"],
        "public_id": resultado["public_id"],
        "tipo": payload.tipo,
        "etiqueta": resultado["etiqueta"],
    }


@router.post("/imagen-temporal", status_code=status.HTTP_201_CREATED)
def subir_imagen_temporal_endpoint(
    payload: ImagenTemporalUpload,
    current_user: Usuario = Depends(get_current_user),
):
    """
    Sube una imagen TEMPORAL a Cloudinary (carpeta ``temp/``).

    - Útil para previews, análisis con IA, escaneos o cualquier imagen
      que NO deba conservarse de forma permanente.
    - La imagen debe eliminarse con ``DELETE /api/upload/{public_id}``
      cuando ya no sea necesaria.
    """
    clave = payload.carpeta_temp
    if clave not in CLOUDINARY_FOLDERS or not clave.startswith("TEMP"):
        clave = "TEMP_GENERAL"

    try:
        resultado = subir_imagen_temporal(
            payload.imagen_base64,
            clave,
            payload.etiqueta,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo subir la imagen temporal: {exc}",
        ) from exc

    return {
        "url": resultado["url"],
        "public_id": resultado["public_id"],
        "carpeta": CLOUDINARY_FOLDERS[clave],
        "etiqueta": resultado["etiqueta"],
    }


@router.delete("/{public_id}", status_code=status.HTTP_200_OK)
def eliminar_imagen(
    public_id: str,
    current_user: Usuario = Depends(get_current_user),
):
    """
    Elimina una imagen de Cloudinary por su public_id.

    Funciona tanto para imágenes temporales como permanentes.
    Para no romper flujos, los errores de recurso inexistente se
    tratan como éxito (la imagen ya no existe).
    """
    try:
        eliminar_imagen_permanente(public_id)
    except RuntimeError as exc:
        # Si la imagen no existe, Cloudinary responde sin error;
        # cualquier otro fallo se reporta.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo eliminar la imagen: {exc}",
        ) from exc

    return {"ok": True, "public_id": public_id}


# Endpoints de ayuda (catálogos)
@router.get("/tipos", status_code=status.HTTP_200_OK)
def listar_tipos_imagen(
    current_user: Usuario = Depends(get_current_user),
):
    """Devuelve los tipos de imagen permanentes disponibles."""
    return {
        "tipos": {
            tipo: {"carpeta": CLOUDINARY_FOLDERS[clave]}
            for tipo, clave in TIPOS_IMAGEN.items()
        }
    }


@router.get("/tipos-temporales", status_code=status.HTTP_200_OK)
def listar_tipos_temporales(
    current_user: Usuario = Depends(get_current_user),
):
    """Devuelve las carpetas temporales disponibles."""
    return {
        "tipos": {
            clave: {"carpeta": carpeta}
            for clave, carpeta in CLOUDINARY_FOLDERS.items()
            if clave.startswith("TEMP")
        }
    }
