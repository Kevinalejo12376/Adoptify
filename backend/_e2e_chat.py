"""Prueba real (sin mock) del nuevo chat_completions con la cadena de modelos
gratuitos corregida. Usa los modelos :free de OpenRouter (sin costo).

Ejecutar desde backend/:  python _e2e_chat.py
No imprime secretos.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import settings  # noqa: E402
from app.services.openrouter_service import (  # noqa: E402
    OpenRouterError,
    chat_completions,
    modelos_configurados,
    proveedores_configurados,
)


async def main():
    print("Cadena de modelos OpenRouter configurada:")
    for m in modelos_configurados():
        print("  -", m)
    print("Proveedores configurados:", [p["nombre"] for p in proveedores_configurados()])
    print()

    msgs = [
        {"role": "system", "content": "Responde en espanol, maximo 1 frase."},
        {"role": "user", "content": "Hola, quiero adoptar una mascota. Que me recomiendas?"},
    ]
    # Varios intentos: los modelos :free son best-effort y a veces dan 429.
    for intento in range(1, 4):
        print(f"--- Intento {intento} ---")
        try:
            texto = await chat_completions(msgs, temperature=0.1, max_tokens=256, timeout=60)
            if texto.strip():
                print("RESPUESTA REAL DEL MODELO:")
                print(" ", texto[:300])
                print(">> PRUEBA REAL OK")
                return
            print("Respuesta vacía (se reintenta).")
        except OpenRouterError as exc:
            print(f"OpenRouterError HTTP {exc.status}: {str(exc.mensaje)[:200]}")
        except Exception as exc:  # noqa: BLE001
            print(f"Excepción: {type(exc).__name__}: {exc}")
        await asyncio.sleep(2)
    print(">> Todos los intentos fallaron (los modelos :free están saturados hoy).")
    raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
