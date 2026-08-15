"""
Script para subir imagenes estaticas del frontend a Cloudinary.

Detecta automáticamente todas las imágenes de la carpeta
'frontend/src/assets/assets extras' y las sube a la carpeta
'frontend-assets/assets-extras' en Cloudinary.

USA ESTE SCRIPT desde la carpeta backend/:

    cd backend
    python -m scripts.upload_assets_to_cloudinary

Requisitos:
- Tener el backend/.env configurado con las credenciales de Cloudinary.
- Tener instaladas las dependencias de backend/requirements.txt
  (cloudinary, python-dotenv, etc.)
"""

import base64
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_ASSETS = BASE_DIR / "frontend" / "src" / "assets"

CARPETA_EXTRAS = FRONTEND_ASSETS / "assets extras"

# Mapas de nombres para las imágenes conocidas de "assets extras".
# Se usa el nombre del archivo (hash) como clave para detectarlas.
# Puedes añadir más entradas aquí si agregas imágenes a la carpeta.
MAPA_NOMBRES_EXTRAS = {
    "8ec08c85c866ccb70c4f1c36492d890f-1024x576.jpeg": "carrusel1",
    "9edf9b6c85ec664ea6da30d59993faa5.jpg": "carrusel2",
    "a838c684c4874d6643e4626b7477007a.jpg": "carrusel3",
    "collaje-mascotas-muy-bonito-aislado_23-2150007407.avif": "carrusel4",
    "f48d22858175028809d2d0ee96183f9c.jpg": "carrusel5",
    "Gemini_Generated_Image_cbxaxccbxaxccbxa.jpg": "carrusel6",
}

CARPETA_CLOUDINARY_EXTRAS = "frontend-assets/assets-extras"

# Extensiones de imagen soportadas.
EXTENSIONES_IMAGEN = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"}


def _detectar_imagenes_extras() -> list:
    """
    Escanea la carpeta "assets extras" y genera la lista de imágenes a subir.

    Si el archivo tiene una entrada en ``MAPA_NOMBRES_EXTRAS`` se usa ese
    nombre; en caso contrario se usa el nombre base del archivo (sin
    extensión) como public_id.
    """
    if not CARPETA_EXTRAS.exists():
        print(f"  [AVISO] No existe la carpeta: {CARPETA_EXTRAS}")
        return []

    archivos = sorted(
        p for p in CARPETA_EXTRAS.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONES_IMAGEN
    )

    imagenes = []
    for ruta in archivos:
        nombre = MAPA_NOMBRES_EXTRAS.get(ruta.name, ruta.stem)
        imagenes.append(
            {
                "ruta": ruta,
                "carpeta": CARPETA_CLOUDINARY_EXTRAS,
                "nombre": nombre,
            }
        )
    return imagenes


IMAGENES = _detectar_imagenes_extras()


# Mapa de extensiones -> MIME (evita data:image/jpg que Cloudinary rechaza).
MAPA_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
}


def subir_imagen(ruta: Path, carpeta: str, nombre: str) -> str | None:
    if not ruta.exists():
        print(f"  [SKIP] Archivo no encontrado: {ruta}")
        return None

    print(f"  Subiendo {nombre} ({ruta.name})...", end=" ")

    try:
        with open(ruta, "rb") as f:
            imagen_bytes = f.read()

        imagen_base64 = base64.b64encode(imagen_bytes).decode("utf-8")
        mime = MAPA_MIME.get(ruta.suffix.lower(), "image/png")
        data_uri = f"data:{mime};base64,{imagen_base64}"

        public_id = f"{carpeta}/{nombre}"

        respuesta = cloudinary.uploader.upload(
            data_uri,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            tags=["frontend-assets", "static"],
        )

        url = respuesta["secure_url"]
        print(f"OK -> {url}")
        return url

    except Exception as e:
        print(f"ERROR: {e}")
        return None


def main():
    resultados = {}

    for img in IMAGENES:
        url = subir_imagen(img["ruta"], img["carpeta"], img["nombre"])
        resultados[img["nombre"]] = url

    print()
    print("=" * 70)
    print("  RESULTADOS")
    print("=" * 70)
    print()

    for nombre, url in resultados.items():
        if url:
            print(f"  {nombre}: {url}")
        else:
            print(f"  {nombre}: NO SUBIDO")

    print()
    print("=" * 70)
    print()
    import json
    print("JSON:")
    print(json.dumps(resultados, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
