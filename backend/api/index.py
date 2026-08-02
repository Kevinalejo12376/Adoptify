"""Punto de entrada para el despliegue serverless en Vercel.

El runtime @vercel/python detecta la variable `app` (aplicacion ASGI)
y la sirve. Aqui simplemente reexportamos la app de FastAPI ya configurada
en app/main.py (routers, CORS, etc.).
"""
from app.main import app  # noqa: F401
