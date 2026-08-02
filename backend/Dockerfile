# Imagen para desplegar el backend FastAPI (Render, Railway, Fly.io, etc.)
FROM python:3.12-slim

# Evita archivos .pyc y buffering en logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependencias primero (mejor cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el codigo de la aplicacion
COPY app ./app

# El puerto lo define la plataforma via la variable PORT (default 8000)
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
