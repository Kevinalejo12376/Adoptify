# -*- coding: utf-8 -*-
"""Genera un PDF de ejemplo para validar el diseno con la identidad de Adoptify.

Ejecutar desde la carpeta `backend`:
    python _prueba_pdf_diseno.py
"""
from datetime import datetime
from pathlib import Path

from app.services.reportes.base import (
    Columna,
    TIPO_BOOLEANO,
    TIPO_ENTERO,
    TIPO_FECHA_HORA,
)
from app.services.reportes.pdf import construir_pdf

columnas = [
    Columna("id", "ID", TIPO_ENTERO, ancho_pdf=35, ancho_excel=8, alinear="center"),
    Columna("nombre", "Nombre", ancho_pdf=90, ancho_excel=18),
    Columna("apellido", "Apellido", ancho_pdf=90, ancho_excel=16),
    Columna("email", "Correo", ancho_pdf=130, ancho_excel=26),
    Columna("rol", "Rol", ancho_pdf=80, ancho_excel=16),
    Columna("activo", "Activo", TIPO_BOOLEANO, ancho_pdf=45, ancho_excel=8, alinear="center"),
    Columna("ubicacion", "Ubicación", ancho_pdf=80, ancho_excel=16),
    Columna("creado_en", "Registrado", TIPO_FECHA_HORA, ancho_pdf=85, ancho_excel=16),
]

filas = []
for i in range(1, 60):
    filas.append({
        "id": i,
        "nombre": f"Nombre {i}",
        "apellido": f"Apellido {i}",
        "email": f"usuario{i}@correo.com",
        "rol": "usuario" if i % 3 else "refugio",
        "activo": i % 5 != 0,
        "ubicacion": "Bogotá" if i % 2 else "Medellín",
        "creado_en": datetime(2025, 1, (i % 28) + 1, 10, 30),
    })

pdf_bytes = construir_pdf(
    titulo="Reporte de Usuarios",
    subtitulo="Generado el 14/08/2026 21:00 (UTC) · Adoptify",
    columnas=columnas,
    filas=filas,
)

salida = Path("prueba_pdf_diseno.pdf")
salida.write_bytes(pdf_bytes)
print("PDF generado:", salida.resolve(), f"({len(pdf_bytes)} bytes, {len(filas)} filas)")
