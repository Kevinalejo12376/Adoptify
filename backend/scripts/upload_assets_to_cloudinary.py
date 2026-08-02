"""
Script para subir imagenes estaticas del frontend a Cloudinary.

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

IMAGENES = [
    {
        "ruta": FRONTEND_ASSETS / "daycare.png",
        "carpeta": "frontend-assets/daycare",
        "nombre": "daycare",
    },
    {
        "ruta": FRONTEND_ASSETS / "loginDog.jpg",
        "carpeta": "frontend-assets/login-dog",
        "nombre": "loginDog",
    },
    {
        "ruta": FRONTEND_ASSETS / "Mascotas.jpg",
        "carpeta": "frontend-assets/mascotas",
        "nombre": "mascotas",
    },
    {
        "ruta": FRONTEND_ASSETS / "assets extras" / "collaje-mascotas-muy-bonito-aislado_23-2150007407.avif",
        "carpeta": "frontend-assets/carrusel",
        "nombre": "carrusel1",
    },
    {
        "ruta": FRONTEND_ASSETS / "assets extras" / "images.jpg",
        "carpeta": "frontend-assets/carrusel",
        "nombre": "carrusel2",
    },
    {
        "ruta": FRONTEND_ASSETS / "assets extras" / "Perro-sosteniendo-un-plano-y-un-gato-sonriendo.jpg",
        "carpeta": "frontend-assets/carrusel",
        "nombre": "carrusel3",
    },
]


def subir_imagen(ruta: Path, carpeta: str, nombre: str) -> str | None:
    if not ruta.exists():
        print(f"  [SKIP] Archivo no encontrado: {ruta}")
        return None

    print(f"  Subiendo {nombre} ({ruta.name})...", end=" ")

    try:
        with open(ruta, "rb") as f:
            imagen_bytes = f.read()

        imagen_base64 = base64.b64encode(imagen_bytes).decode("utf-8")
        ext = ruta.suffix.lstrip(".")
        data_uri = f"data:image/{ext};base64,{imagen_base64}"

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
