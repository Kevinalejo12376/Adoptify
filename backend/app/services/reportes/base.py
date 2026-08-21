"""
Nucleo del modulo de generacion de reportes.

Define la infraestructura reutilizable para generar reportes en PDF (ReportLab)
y Excel (openpyxl) completamente en memoria, sin almacenar archivos en el
servidor ni depender de servicios externos.

Arquitectura escalable:
    - ``Columna``: describe una columna del reporte (titulo, tipo, ancho, etc).
    - ``GeneradorReporte``: clase base abstracta. Cada tipo de reporte concreto
      solo debe implementar ``obtener_filas()`` y la maquinaria de PDF/Excel
      queda centralizada aqui.

Para agregar un nuevo tipo de reporte:
    1. Crear una subclase de ``GeneradorReporte``.
    2. Definir ``codigo``, ``titulo``, ``columnas`` y ``obtener_filas()``.
    3. Registrarla en ``reportes/__init__.py`` (diccionario REGISTRO_REPORTES).
"""
# pyrefly: ignore [missing-import]
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

import requests
from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# Logo institucional (servido desde Cloudinary)
# ---------------------------------------------------------------------------
# Se centraliza aqui para reutilizarlo en PDF (ReportLab) y Excel (openpyxl).
# Se sube con backend/scripts/upload_assets_to_cloudinary.py.
LOGO_URL = (
    "https://res.cloudinary.com/kj0wube2/image/upload/"
    "v1786743743/frontend-assets/logo/logo.png"
)

_logo_bytes_cache: Optional[bytes] = None


def obtener_logo_bytes() -> Optional[bytes]:
    """Descarga el logo de Adoptify desde Cloudinary (con cache en memoria).

    Devuelve ``None`` si la descarga falla (p. ej. sin conexion a internet),
    para que la generacion de reportes nunca falle por el logo: los llamadores
    deben omitir el logo en ese caso.
    """
    global _logo_bytes_cache
    if _logo_bytes_cache is not None:
        return _logo_bytes_cache
    try:
        resp = requests.get(LOGO_URL, timeout=5)
        if resp.status_code == 200 and resp.content:
            _logo_bytes_cache = resp.content
    except Exception:
        # Sin cache: se reintenta en la siguiente generacion.
        pass
    return _logo_bytes_cache


# ---------------------------------------------------------------------------
# Tipos de columna soportados
# ---------------------------------------------------------------------------
TIPO_TEXTO = "texto"
TIPO_ENTERO = "entero"
TIPO_NUMERO = "numero"
TIPO_MONEDA = "moneda"
TIPO_FECHA = "fecha"
TIPO_FECHA_HORA = "fecha_hora"
TIPO_BOOLEANO = "booleano"


@dataclass
class Columna:
    """Descripcion de una columna de un reporte."""

    clave: str  # Clave del valor dentro del dict de cada fila
    titulo: str  # Titulo visible (encabezado)
    tipo: str = TIPO_TEXTO
    ancho_pdf: float = 70  # Ancho en puntos (PDF)
    ancho_excel: int = 16  # Ancho aproximado en caracteres (Excel)
    alinear: str = "left"  # left | center | right
    formato: Optional[str] = None  # Formato opcional, ej. "%.2f"
    # Formato de numero de Excel (openpyxl). Si es None se infiere del tipo.
    formato_excel: Optional[str] = None


def _formatear_valor_pdf(valor: Any, col: Columna) -> str:
    """Convierte un valor a texto listo para renderizar en PDF."""
    if valor is None:
        return "—"

    if col.tipo in (TIPO_NUMERO, TIPO_MONEDA, TIPO_ENTERO):
        if isinstance(valor, (int, float)):
            fmt = col.formato or {"entero": "%d", "numero": "%.2f", "moneda": "%.2f"}.get(col.tipo, "%.2f")
            return (fmt % valor).replace(".", ",") if col.tipo == TIPO_MONEDA else fmt % valor
        return str(valor)

    if col.tipo == TIPO_FECHA:
        if isinstance(valor, datetime):
            return valor.strftime("%d/%m/%Y %H:%M")
        if isinstance(valor, date):
            return valor.strftime("%d/%m/%Y")
        return str(valor)

    if col.tipo == TIPO_FECHA_HORA:
        if isinstance(valor, datetime):
            return valor.strftime("%d/%m/%Y %H:%M")
        if isinstance(valor, date):
            return valor.strftime("%d/%m/%Y %H:%M")
        return str(valor)

    if col.tipo == TIPO_BOOLEANO:
        return "Sí" if valor else "No"

    return str(valor)


def _valor_excel(valor: Any, col: Columna):
    """Normaliza el valor a guardar en la celda de Excel."""
    if valor is None:
        return None

    if col.tipo == TIPO_BOOLEANO:
        return "Sí" if valor else "No"

    if col.tipo == TIPO_FECHA:
        if isinstance(valor, datetime):
            # Solo la parte de fecha, con formato de fecha
            return valor.replace(tzinfo=None) if valor.tzinfo else valor
        if isinstance(valor, date):
            return valor
        return str(valor)

    if col.tipo == TIPO_FECHA_HORA:
        if isinstance(valor, datetime):
            return valor.replace(tzinfo=None) if valor.tzinfo else valor
        if isinstance(valor, date):
            return datetime.combine(valor, datetime.min.time())
        return str(valor)

    return valor


class GeneradorReporte(ABC):
    """Clase base abstracta para todos los reportes.

    Subclases concretas deben implementar:
        - ``codigo``, ``titulo``, ``descripcion`` (atributos)
        - ``columnas`` (lista de ``Columna``)
        - ``obtener_filas(db)``: consulta la BD y devuelve lista de dicts.
    """

    codigo: str = ""
    titulo: str = ""
    descripcion: str = ""
    nombre_archivo: str = "reporte"  # Nombre base (sin extension)
    columnas: List[Columna] = field(default_factory=list)

    @abstractmethod
    def obtener_filas(self, db: Session) -> List[Dict[str, Any]]:
        """Consulta la base de datos y devuelve las filas del reporte.

        Cada fila es un dict donde las claves coinciden con ``clave`` de las
        columnas definidas.
        """

    # ------------------------------------------------------------------
    # Utilidades compartidas
    # ------------------------------------------------------------------
    def _meta(self, db: Session) -> Dict[str, str]:
        """Metadatos que se muestran en el encabezado del reporte."""
        return {
            "titulo": self.titulo,
            "subtitulo": (
                f"Generado el {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} "
                f"(UTC) · Adoptify"
            ),
        }

    # ------------------------------------------------------------------
    # Generacion de archivos (en memoria)
    # ------------------------------------------------------------------
    def generar_pdf(self, db: Session) -> bytes:
        """Construye el PDF del reporte en memoria y devuelve sus bytes."""
        # Import perezoso: evita ciclos de importacion dentro del paquete.
        from app.services.reportes import pdf as pdf_utils

        filas = self.obtener_filas(db)
        meta = self._meta(db)
        return pdf_utils.construir_pdf(
            titulo=meta["titulo"],
            subtitulo=meta["subtitulo"],
            columnas=self.columnas,
            filas=filas,
        )

    def generar_excel(self, db: Session) -> bytes:
        """Construye el libro Excel del reporte en memoria y devuelve sus bytes."""
        # Import perezoso: evita ciclos de importacion dentro del paquete.
        from app.services.reportes import excel as excel_utils

        filas = self.obtener_filas(db)
        meta = self._meta(db)
        return excel_utils.construir_excel(
            titulo=self.titulo,
            subtitulo=meta["subtitulo"],
            columnas=self.columnas,
            filas=filas,
        )

    # ------------------------------------------------------------------
    # Formateo de celdas (reutilizado por PDF y Excel)
    # ------------------------------------------------------------------
    def celda_pdf(self, fila: Dict[str, Any], col: Columna) -> str:
        return _formatear_valor_pdf(fila.get(col.clave), col)

    def celda_excel(self, fila: Dict[str, Any], col: Columna):
        return _valor_excel(fila.get(col.clave), col)
