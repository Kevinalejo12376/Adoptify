"""Pruebas unitarias (mock) del failover en cascada de proveedores de IA.

Simulan respuestas HTTP de OpenRouter y del proveedor alternativo para
comprobar que:
  1. Si OpenRouter responde OK, se devuelve su contenido (sin llamar al 2º).
  2. Si OpenRouter devuelve 429/402/403/500 -> se prueba el alternativo.
  3. Si OpenRouter hace timeout -> se prueba el alternativo.
  4. Si ambos fallan -> OpenRouterError controlado (sin traceback crudo).
  5. Sin proveedores configurados -> ValueError.

Ejecutar desde backend/:  python _tests_ia_fallback.py
NO hace llamadas de red reales y NO imprime secretos.
"""
import asyncio
import json
import sys
import unittest.mock as mock
from pathlib import Path

# Permitir importar app desde backend/
sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.services import openrouter_service as svc  # noqa: E402
from app.services.openrouter_service import OpenRouterError  # noqa: E402


# ---------------------------------------------------------------------------
# Dobles de prueba
# ---------------------------------------------------------------------------
class FakeResp:
    def __init__(self, status_code, data=None, text=None):
        self.status_code = status_code
        self._data = data
        self.text = text if text is not None else (json.dumps(data) if data is not None else "")

    def json(self):
        if self._data is not None:
            return self._data
        raise ValueError("sin JSON")

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("err", request=None, response=self)


# Cola global de respuestas: cada llamada consume la siguiente.
RESPUESTAS = []
# Captura de los payloads enviados (para aserciones).
PAYLOADS = []


class FakeClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, headers=None):
        PAYLOADS.append(json)
        if not RESPUESTAS:
            raise AssertionError("No quedan respuestas simuladas (se hizo más de una llamada de las previstas)")
        item = RESPUESTAS.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _ok(texto="respuesta OK", modelo="mock/model"):
    return FakeResp(200, {"choices": [{"message": {"content": texto}}], "model": modelo})


def _err(status, msg):
    return FakeResp(status, {"error": {"message": msg}})


def _configurar_fallback():
    """Activa el proveedor alternativo (valores ficticios de prueba)."""
    settings.IA_FALLBACK_ENABLED = True
    settings.IA_FALLBACK_BASE_URL = "https://mock-alt.example/v1"
    settings.IA_FALLBACK_MODEL = "alt-model"
    settings.IA_FALLBACK_API_KEY = "clave-alt-falsa"


def _reset_settings():
    settings.IA_FALLBACK_ENABLED = False
    settings.IA_FALLBACK_BASE_URL = ""
    settings.IA_FALLBACK_MODEL = ""
    settings.IA_FALLBACK_API_KEY = ""


async def _chequear_models_vision():
    """Verifica que el parámetro 'modelos' restringe la cadena 'models' enviada
    a OpenRouter (lo usa analizar_producto para las peticiones con imágenes)."""
    global PAYLOADS, RESPUESTAS
    PAYLOADS = []
    RESPUESTAS = [_ok("ok vision")]

    msgs = [{"role": "user", "content": "x"}]
    with mock.patch("httpx.AsyncClient", FakeClient):
        await svc.chat_completions(msgs, modelos=["modelo-vision-1", "modelo-vision-2"])

    if not PAYLOADS:
        return False, "no se capturó el payload"
    payload = PAYLOADS[0]
    models = payload.get("models")
    if models != ["modelo-vision-1", "modelo-vision-2"]:
        return False, f"models inesperados: {models}"
    if payload.get("provider", {}).get("allow_fallbacks") is not True:
        return False, "falta provider.allow_fallbacks"
    return True, "OK"


async def _run():
    ok = 0
    fail = 0
    # Verificación del override de modelos (visión)
    _vision_ok, _detalle = await _chequear_models_vision()
    if _vision_ok:
        print("[OK]   Override 'modelos' (visión) limita la cadena 'models'")
        ok += 1
    else:
        print(f"[FALLO] Override 'modelos' (visión): {_detalle}")
        fail += 1

    async def caso(nombre, respuestas, fn, espera_error=None, espera_valor=None):
        nonlocal ok, fail
        global RESPUESTAS
        RESPUESTAS = list(respuestas)
        try:
            res = await fn()
            if espera_error:
                print(f"[FALLO] {nombre}: se esperaba error {espera_error} y hubo respuesta {res!r}")
                fail += 1
            elif espera_valor is not None and res != espera_valor:
                print(f"[FALLO] {nombre}: se esperaba {espera_valor!r} y se obtuvo {res!r}")
                fail += 1
            else:
                print(f"[OK]   {nombre} -> {res[:40]!r}")
                ok += 1
        except Exception as exc:  # noqa: BLE001
            if espera_error and isinstance(exc, espera_error):
                print(f"[OK]   {nombre} -> error controlado {type(exc).__name__}: {str(exc)[:70]}")
                ok += 1
            else:
                print(f"[FALLO] {nombre}: excepción inesperada {type(exc).__name__}: {exc}")
                fail += 1

    msgs = [{"role": "user", "content": "hola"}]

    # 1) OpenRouter OK -> no se llama al alternativo
    with mock.patch("httpx.AsyncClient", FakeClient):
        await caso("1. OpenRouter responde OK (sin fallback)",
                   [_ok("hola desde OpenRouter")],
                   lambda: svc.chat_completions(msgs))

    # 2) OpenRouter 429 -> alternativo responde OK
    _configurar_fallback()
    with mock.patch("httpx.AsyncClient", FakeClient):
        await caso("2. OpenRouter 429 -> alternativo OK",
                   [_err(429, "rate limit"), _ok("responde el alternativo")],
                   lambda: svc.chat_completions(msgs),
                   espera_valor="responde el alternativo")
    _reset_settings()

    # 3) OpenRouter 402 (sin créditos) -> alternativo OK
    _configurar_fallback()
    with mock.patch("httpx.AsyncClient", FakeClient):
        await caso("3. OpenRouter 402 (créditos) -> alternativo OK",
                   [_err(402, "insufficient credits"), _ok("responde el alternativo")],
                   lambda: svc.chat_completions(msgs),
                   espera_valor="responde el alternativo")
    _reset_settings()

    # 4) OpenRouter 500 -> alternativo OK
    _configurar_fallback()
    with mock.patch("httpx.AsyncClient", FakeClient):
        await caso("4. OpenRouter 500 -> alternativo OK",
                   [_err(500, "upstream error"), _ok("responde el alternativo")],
                   lambda: svc.chat_completions(msgs),
                   espera_valor="responde el alternativo")
    _reset_settings()

    # 5) OpenRouter timeout -> alternativo OK
    _configurar_fallback()
    with mock.patch("httpx.AsyncClient", FakeClient):
        await caso("5. OpenRouter timeout -> alternativo OK",
                   [httpx.TimeoutException("timeout simulado"), _ok("responde el alternativo")],
                   lambda: svc.chat_completions(msgs),
                   espera_valor="responde el alternativo")
    _reset_settings()

    # 6) Ambos fallan -> OpenRouterError controlado
    _configurar_fallback()
    with mock.patch("httpx.AsyncClient", FakeClient):
        await caso("6. OpenRouter y alternativo fallan -> error controlado",
                   [_err(429, "rate limit"), _err(403, "denied")],
                   lambda: svc.chat_completions(msgs),
                   espera_error=OpenRouterError)
    _reset_settings()

    # 7) Respuesta 200 vacía en OpenRouter -> se trata como fallo y pasa al alternativo
    _configurar_fallback()
    with mock.patch("httpx.AsyncClient", FakeClient):
        await caso("7. OpenRouter devuelve 200 vacío -> alternativo OK",
                   [_ok(""), _ok("responde el alternativo")],
                   lambda: svc.chat_completions(msgs),
                   espera_valor="responde el alternativo")
    _reset_settings()

    # 8) Sin proveedores configurados -> ValueError
    _reset_settings()
    with mock.patch.object(settings, "OPENROUTER_API_KEY", ""):
        await caso("8. Sin proveedores configurados -> ValueError",
                   [],
                   lambda: svc.chat_completions(msgs),
                   espera_error=ValueError)

    print()
    print(f"Resultado: {ok} OK, {fail} FALLO(S)")
    return fail == 0


if __name__ == "__main__":
    exito = asyncio.run(_run())
    raise SystemExit(0 if exito else 1)
