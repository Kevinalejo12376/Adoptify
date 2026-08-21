"""
Generacion de reportes Excel con openpyxl.

El libro se construye completamente en memoria (``io.BytesIO``) y se devuelve
como bytes. Se aplica formato profesional: encabezado con color, autofiltro,
fila congelada, anchos de columna, formatos numericos/de fecha, bordes y
alternancia de filas.
"""
# pyrefly: ignore [missing-import]
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.services.reportes.base import (
    Columna,
    TIPO_BOOLEANO,
    TIPO_ENTERO,
    TIPO_FECHA,
    TIPO_FECHA_HORA,
    TIPO_MONEDA,
    TIPO_NUMERO,
)

# ---------------------------------------------------------------------------
# Paleta (identidad Adoptify, misma del frontend)
# ---------------------------------------------------------------------------
COLOR_PRIMARIO = "FF4D7A"  # Rosa del gradiente (logo / botones)
COLOR_ACENTO = "F59E0B"  # Amber-500
COLOR_ZEBRA = "FFF1F2"  # Rose-50 (zebra)
COLOR_TEXTO = "1F2937"
COLOR_TEXTO_SUAVE = "6B7280"

_ALINEACIONES = {
    "left": "left",
    "center": "center",
    "right": "right",
}

# Formato openpyxl por defecto segun el tipo de columna
_FORMATOS_EXCEL = {
    TIPO_ENTERO: "#,##0",
    TIPO_NUMERO: "#,##0.00",
    TIPO_MONEDA: '"$"#,##0.00',
    TIPO_FECHA: "DD/MM/YYYY",
    TIPO_FECHA_HORA: "DD/MM/YYYY HH:MM",
}


def _formato_para(col: Columna) -> str:
    """Determina el formato de numero/fecha de la columna en Excel."""
    if col.formato_excel:
        return col.formato_excel
    return _FORMATOS_EXCEL.get(col.tipo, "General")


def construir_excel(
    *,
    titulo: str,
    subtitulo: str,
    columnas: List[Columna],
    filas: List[Dict[str, Any]],
) -> bytes:
    """Construye un libro Excel en memoria con formato profesional.

    Args:
        titulo: Titulo del reporte (usado como nombre de hoja).
        subtitulo: Texto secundario.
        columnas: Definicion de columnas.
        filas: Lista de dicts con los datos (claves = ``columna.clave``).

    Returns:
        bytes con el contenido del archivo .xlsx.
    """
    workbook = Workbook()
    hoja = workbook.active
    # El nombre de la hoja no puede exceder 31 caracteres
    hoja.title = _nombre_hoja(titulo)

    # ------------------------------------------------------------------
    # Estilos
    # ------------------------------------------------------------------
    fuente_titulo = Font(name="Calibri", size=14, bold=True, color=COLOR_PRIMARIO)
    fuente_sub = Font(name="Calibri", size=9, italic=True, color=COLOR_TEXTO_SUAVE)
    fuente_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    relleno_header = PatternFill(fill_type="solid", start_color=COLOR_PRIMARIO, end_color=COLOR_PRIMARIO)
    relleno_zebra = PatternFill(fill_type="solid", start_color=COLOR_ZEBRA, end_color=COLOR_ZEBRA)
    fuente_celda = Font(name="Calibri", size=10, color=COLOR_TEXTO)
    borde_fino = Side(style="thin", color="E5E7EB")
    borde = Border(left=borde_fino, right=borde_fino, top=borde_fino, bottom=borde_fino)

    # ------------------------------------------------------------------
    # Encabezado del documento (titulo + subtitulo)
    # ------------------------------------------------------------------
    hoja.cell(row=1, column=1, value=titulo).font = fuente_titulo
    hoja.cell(row=2, column=1, value=subtitulo).font = fuente_sub
    hoja.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(columnas))
    hoja.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(columnas))
    hoja.row_dimensions[1].height = 22
    hoja.row_dimensions[2].height = 14

    # ------------------------------------------------------------------
    # Fila de encabezado de columnas (fila 4)
    # ------------------------------------------------------------------
    header_row = 4
    for idx, col in enumerate(columnas, start=1):
        celda = hoja.cell(row=header_row, column=idx, value=col.titulo)
        celda.font = fuente_header
        celda.fill = relleno_header
        celda.alignment = Alignment(horizontal=_ALINEACIONES.get(col.alinear, "left"), vertical="center")
        celda.border = borde
    hoja.row_dimensions[header_row].height = 20

    # ------------------------------------------------------------------
    # Datos
    # ------------------------------------------------------------------
    fila_inicio = header_row + 1
    for i, fila in enumerate(filas):
        fila_excel = fila_inicio + i
        for j, col in enumerate(columnas, start=1):
            valor = _valor_celda(fila, col)
            celda = hoja.cell(row=fila_excel, column=j, value=valor)
            celda.font = fuente_celda
            celda.alignment = Alignment(
                horizontal=_ALINEACIONES.get(col.alinear, "left"),
                vertical="center",
                wrap_text=True,
            )
            celda.border = borde
            if col.tipo in _FORMATOS_EXCEL:
                celda.number_format = _formato_para(col)
            # Alternancia de filas
            if i % 2 == 1:
                celda.fill = relleno_zebra

    # ------------------------------------------------------------------
    # Ajustes de la hoja
    # ------------------------------------------------------------------
    ultima_fila = max(fila_inicio + len(filas) - 1, header_row)
    ultima_col = len(columnas)

    # Anchos de columna (clamped a un rango razonable)
    for j, col in enumerate(columnas, start=1):
        ancho = max(min(col.ancho_excel, 40), 10)
        hoja.column_dimensions[get_column_letter(j)].width = ancho

    # Autofiltro sobre el rango de datos
    if filas:
        hoja.auto_filter.ref = f"A{header_row}:{get_column_letter(ultima_col)}{ultima_fila}"

    # Congelar la fila de encabezado (y titulo)
    hoja.freeze_panes = f"A{fila_inicio}"

    # Altura de filas de datos para respetar el ajuste de texto
    for r in range(fila_inicio, ultima_fila + 1):
        hoja.row_dimensions[r].height = 18

    # Vista de impresion (pagina apaisada y ajuste al ancho)
    hoja.page_setup.orientation = "landscape"
    hoja.page_setup.fitToWidth = 1
    hoja.page_setup.fitToHeight = 0
    hoja.sheet_properties.pageSetUpPr.fitToPage = True
    hoja.print_title_rows = f"{header_row}:{header_row}"

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _nombre_hoja(titulo: str) -> str:
    """Normaliza el nombre de la hoja (max 31 chars, sin caracteres invalidos)."""
    limpio = "".join(c if c.isalnum() or c in " -_" else "" for c in titulo).strip()
    return (limpio or "Reporte")[:31]


def _valor_celda(fila: Dict[str, Any], col: Columna):
    """Normaliza el valor a escribir en la celda de Excel."""
    from app.services.reportes.base import _valor_excel

    valor = _valor_excel(fila.get(col.clave), col)
    # Convertir datetime naive a date si solo se usa la parte de fecha
    if isinstance(valor, datetime):
        if col.tipo == TIPO_FECHA and (valor.hour, valor.minute, valor.second) == (0, 0, 0):
            return valor.date()
    return valor
