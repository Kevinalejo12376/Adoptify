"""Prueba REAL de las funciones de IA que NO están funcionando según el usuario:
  1) clasificar_contenido('compatibilidad', ...)  -> test de compatibilidad
  2) analizar_producto([imagen])                  -> analizar producto con IA (visión)

Ejecutar desde backend/:  python _e2e_ia_features.py
Usa modelos gratuitos (sin coste). No imprime secretos.
"""
import asyncio
import base64
import json
import struct
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.gemini import analizar_producto, clasificar_contenido  # noqa: E402


def png_mini() -> bytes:
    """Genera un PNG pequeño con un degradado (puro stdlib, sin Pillow)."""
    w = h = 48
    filas = []
    for y in range(h):
        fila = bytearray([0])  # filtro: none
        for x in range(w):
            r = (x * 5) % 256
            g = (y * 5) % 256
            b = ((x + y) * 3) % 256
            fila += bytes([r, g, b])
        filas.append(bytes(fila))
    raw = b"".join(filas)

    def chunk(tipo, datos):
        c = tipo + datos
        return struct.pack(">I", len(datos)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


TEXTO_COMPAT = (
    "FICHA DE LA MASCOTA:\n"
    "- Nombre: Rocky\n- Tipo: Perro\n- Raza: Labrador\n- Edad: 2 años\n"
    "- Tamaño: Grande\n- Género: Macho\n- Personalidad: Juguetón, Energético, Sociable\n"
    "- Descripción: Perro muy activo que ama correr y jugar.\n"
    "- Requisitos de adopción: Casa con patio\n- Refugio: Refugio Patitas\n\n"
    "RESPUESTAS DEL USUARIO:\n"
    "- ¿Tienes espacio? Sí, patio grande\n- ¿Haces ejercicio? Sí, corro 5km al día\n"
    "- ¿Has tenido mascotas? Sí\n- ¿Conviven niños? No"
)


async def main():
    # --- 1) Compatibilidad ---
    print("=" * 70)
    print("[1] clasificar_contenido('compatibilidad', ...)")
    print("=" * 70)
    for intento in range(1, 4):
        print(f"  Intento {intento}:")
        try:
            r = await clasificar_contenido("compatibilidad", TEXTO_COMPAT)
            print("  JSON OK ->", json.dumps(r, ensure_ascii=False)[:300])
            print(">> COMPATIBILIDAD OK")
            break
        except Exception as exc:  # noqa: BLE001
            print(f"  FALLO: {type(exc).__name__}: {str(exc)[:220]}")
        await asyncio.sleep(2)
    else:
        print(">> COMPATIBILIDAD FALLÓ en los 3 intentos")

    print()
    # --- 2) Analizar producto (visión) ---
    print("=" * 70)
    print("[2] analizar_producto([imagen base64])")
    print("=" * 70)
    b64 = base64.b64encode(png_mini()).decode("ascii")
    data_url = f"data:image/png;base64,{b64}"
    for intento in range(1, 4):
        print(f"  Intento {intento}:")
        try:
            r = await analizar_producto([data_url])
            print("  JSON OK ->", json.dumps(r, ensure_ascii=False)[:400])
            print(">> ANALIZAR PRODUCTO OK")
            break
        except Exception as exc:  # noqa: BLE001
            print(f"  FALLO: {type(exc).__name__}: {str(exc)[:300]}")
        await asyncio.sleep(2)
    else:
        print(">> ANALIZAR PRODUCTO FALLÓ en los 3 intentos")


if __name__ == "__main__":
    asyncio.run(main())
