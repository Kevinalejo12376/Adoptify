"""Punto de entrada para el despliegue serverless en Vercel.

El runtime @vercel/python detecta la variable `app` (aplicacion ASGI)
y la sirve. Aqui simplemente reexportamos la app de FastAPI ya configurada
en app/main.py (routers, CORS, etc.).
"""
import os
import sys

# Garantiza que la raiz del backend (directorio padre de api/) este en sys.path,
# de modo que el import "from app.main import app" funcione igual que en local
# (uvicorn app.main:app) sin importar el directorio de trabajo que use Vercel.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from app.main import app  # noqa: F401,E402
