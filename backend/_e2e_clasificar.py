"""Prueba real de la ruta del chatbot: clasificar_contenido('chatbot', ...)
a través de gemini.py -> openrouter_service (cadena de modelos gratuitos).

Valida que el parseo de JSON del chatbot sigue funcionando tras el refactor.
Ejecutar desde backend/:  python _e2e_clasificar.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.gemini import clasificar_contenido  # noqa: E402


async def main():
    prompt = (
        "Hola, quiero saber como puedo adoptar una mascota en Adoptify."
    )
    for intento in range(1, 4):
        print(f"--- Intento {intento} ---")
        try:
            resultado = await clasificar_contenido("chatbot", prompt)
            resp = str(resultado.get("respuesta") or "").strip()
            accion = resultado.get("accion")
            print("JSON parseado OK -> respuesta:", resp[:200])
            print("accion:", accion)
            if resp:
                print(">> RUTA CHATBOT REAL OK")
                return
            print("Respuesta vacía (se reintenta).")
        except Exception as exc:  # noqa: BLE001
            print(f"Excepción: {type(exc).__name__}: {str(exc)[:200]}")
        await asyncio.sleep(2)
    raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
