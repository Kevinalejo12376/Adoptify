"""
Generacion de reportes PDF con ReportLab.

El documento se construye completamente en memoria (``io.BytesIO``) y se
devuelve como bytes, sin escribir ningun archivo en el servidor. Usa ``Table``
con ``repeatRows=1`` para repetir el encabezado en cada pagina.

El diseno replica la identidad visual de Adoptify:
    - Franja superior con degradado rosa -> naranja y el logo de la marca.
    - Tabla con encabezado degradado, filas zebra en rosa/ambar, bordes suaves
      y esquinas redondeadas (estetica de "cards" del frontend).
    - Pie de pagina con la marca y la numeracion.

Nota: con ReportLab la alineacion de una celda que contiene un ``Paragraph``
se controla desde el ``ParagraphStyle`` (no con ``ALIGN`` de la tabla), por eso
se crean estilos de celda por alineacion.
"""
# pyrefly: ignore [missing-import]
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services.reportes.base import Columna

# ---------------------------------------------------------------------------
# Identidad visual de Adoptify (misma paleta que el frontend)
# ---------------------------------------------------------------------------
ROSA = HexColor("#FF4D7A")  # Extremo rosa del gradiente (logo / botones)
NARANJA = HexColor("#FFA726")  # Extremo naranja del gradiente (logo / botones)
COLOR_PRIMARIO = HexColor("#E11D48")  # Rose-600 (titulos de marca)
COLOR_ACENTO = HexColor("#F59E0B")  # Amber-500
COLOR_ROSA_50 = HexColor("#FFF1F2")  # Rose-50 (zebra)
COLOR_AMBAR_50 = HexColor("#FFFBEB")  # Amber-50 (zebra)
COLOR_TEXTO = HexColor("#1F2937")  # Gray-800
COLOR_TEXTO_SUAVE = HexColor("#6B7280")  # Gray-500
COLOR_BORDE = HexColor("#F4D9DE")  # Borde rosado suave

# Logo de la marca (copia local dentro del paquete para que funcione en Vercel)
_LOGO = Path(__file__).resolve().parent / "assets" / "logo.png"

_ALINEACIONES = {
    "left": TA_LEFT,
    "center": TA_CENTER,
    "right": TA_RIGHT,
}


# ---------------------------------------------------------------------------
# Utilidades de color / degradado
# ---------------------------------------------------------------------------
def _color_gradiente(frac: float, c1: Color, c2: Color) -> Color:
    """Interpola entre dos colores en el rango 0..1 (fraccion de c1 a c2)."""
    frac = max(0.0, min(1.0, frac))
    return Color(
        c1.red + (c2.red - c1.red) * frac,
        c1.green + (c2.green - c1.green) * frac,
        c1.blue + (c2.blue - c1.blue) * frac,
    )


def _dibujar_gradiente(canvas, x: float, y: float, w: float, h: float,
                       c1: Color, c2: Color, pasos: int = 80) -> None:
    """Dibuja un degradado horizontal de ``c1`` a ``c2`` sobre el rectangulo."""
    paso_w = w / pasos
    for i in range(pasos):
        color = _color_gradiente(i / max(pasos - 1, 1), c1, c2)
        canvas.setFillColor(color)
        canvas.rect(x + i * paso_w, y, paso_w + 0.5, h, stroke=0, fill=1)


class _BarraGradiente(Flowable):
    """Flowable con degradado horizontal (barra de separacion del titulo)."""

    def __init__(self, width, height, c1=ROSA, c2=NARANJA, pasos=60):
        super().__init__()
        self.width = width
        self.height = height
        self.c1 = c1
        self.c2 = c2
        self.pasos = pasos

    def draw(self):
        _dibujar_gradiente(self.canv, 0, 0, self.width, self.height,
                           self.c1, self.c2, pasos=self.pasos)


# ---------------------------------------------------------------------------
# Estilos de texto
# ---------------------------------------------------------------------------
def _estilos():
    base = getSampleStyleSheet()
    estilos = {
        "titulo": ParagraphStyle(
            "ReporteTitulo",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=21,
            textColor=COLOR_PRIMARIO,
            spaceAfter=2,
        ),
        "subtitulo": ParagraphStyle(
            "ReporteSubtitulo",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=COLOR_TEXTO_SUAVE,
            spaceAfter=0,
        ),
        "celda_header": ParagraphStyle(
            "ReporteCeldaHeader",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=colors.white,
        ),
        "vacio": ParagraphStyle(
            "ReporteVacio",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=10,
            leading=14,
            textColor=COLOR_TEXTO_SUAVE,
            alignment=TA_CENTER,
        ),
    }
    # Estilos de celda de datos por alineacion
    for clave, alineacion in _ALINEACIONES.items():
        estilos[f"celda_{clave}"] = ParagraphStyle(
            f"ReporteCelda{clave.capitalize()}",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=COLOR_TEXTO,
            alignment=alineacion,
        )
    return estilos


def _estilo_celda(estilos, col: Columna) -> ParagraphStyle:
    """Devuelve el estilo de parrafo segun la alineacion de la columna."""
    return estilos[f"celda_{col.alinear}"] if col.alinear in _ALINEACIONES else estilos["celda_left"]


def _contenido_vacio(estilos) -> Paragraph:
    return Paragraph("No hay registros para mostrar en este reporte.", estilos["vacio"])


# ---------------------------------------------------------------------------
# Encabezado / pie de pagina (se dibuja en cada pagina)
# ---------------------------------------------------------------------------
def _encabezado_pie(canvas, doc, titulo: str) -> None:
    ancho, alto = doc.pagesize
    margen = 12 * mm

    # ---- Franja de gradiente superior (rosa -> naranja) ----
    alto_franja = 10 * mm
    _dibujar_gradiente(canvas, 0, alto - alto_franja, ancho, alto_franja, ROSA, NARANJA)

    # ---- Logo de Adoptify sobre un "chip" blanco (izquierda) ----
    logo_ancho = 44
    logo_alto = logo_ancho * 306 / 577  # Proporcion real del PNG (577x306)
    pad = 1.6 * mm
    chip_x = margen
    chip_y = alto - alto_franja + 1.1 * mm
    chip_w = logo_ancho + pad * 2
    chip_h = alto_franja - 2.2 * mm
    canvas.setFillColor(colors.white)
    canvas.roundRect(chip_x, chip_y, chip_w, chip_h, 3, stroke=0, fill=1)
    if _LOGO.exists():
        canvas.drawImage(
            str(_LOGO),
            chip_x + pad,
            chip_y + (chip_h - logo_alto) / 2,
            logo_ancho,
            logo_alto,
            preserveAspectRatio=True,
            mask="auto",
        )

    # ---- Titulo del reporte (derecha, en blanco) ----
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.setFillColor(colors.white)
    canvas.drawRightString(ancho - margen, alto - alto_franja / 2 - 4, titulo)

    # ---- Linea de acento bajo la franja ----
    canvas.setStrokeColor(NARANJA)
    canvas.setLineWidth(1.6)
    canvas.line(margen, alto - alto_franja - 0.8, ancho - margen, alto - alto_franja - 0.8)

    # ---- Pie de pagina ----
    y_pie = 8 * mm
    canvas.setStrokeColor(COLOR_BORDE)
    canvas.setLineWidth(0.5)
    canvas.line(margen, y_pie + 3 * mm, ancho - margen, y_pie + 3 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(COLOR_TEXTO_SUAVE)
    canvas.drawString(margen, y_pie, "Adoptify · Documento generado automáticamente")
    canvas.drawRightString(ancho - margen, y_pie, f"Página {doc.page}")


# ---------------------------------------------------------------------------
# Construccion principal
# ---------------------------------------------------------------------------
def construir_pdf(
    *,
    titulo: str,
    subtitulo: str,
    columnas: List[Columna],
    filas: List[Dict[str, Any]],
) -> bytes:
    """Construye un PDF tabular en memoria con la identidad visual de Adoptify.

    Args:
        titulo: Titulo del reporte.
        subtitulo: Texto secundario (fecha de generacion, etc).
        columnas: Definicion de columnas.
        filas: Lista de dicts con los datos (claves = ``columna.clave``).

    Returns:
        bytes con el contenido del PDF.
    """
    estilos = _estilos()
    buffer = BytesIO()

    # Orientacion horizontal si hay muchas columnas para mejor legibilidad
    pagina = landscape(A4) if len(columnas) > 5 else A4
    doc = SimpleDocTemplate(
        buffer,
        pagesize=pagina,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title=titulo,
        author="Adoptify",
    )

    elementos = [
        Paragraph(titulo, estilos["titulo"]),
        Paragraph(subtitulo, estilos["subtitulo"]),
        Spacer(1, 2 * mm),
        # Barra de separacion con el degradado de la marca
        _BarraGradiente(width=doc.width, height=2.6),
        Spacer(1, 5 * mm),
    ]

    if not filas:
        elementos.append(_contenido_vacio(estilos))
    else:
        # Encabezado + filas (Paragraph con estilo de alineacion por columna)
        data = [
            [
                Paragraph(c.titulo, estilos["celda_header"])
                for c in columnas
            ]
        ]
        for fila in filas:
            data.append(
                [
                    Paragraph(celda, _estilo_celda(estilos, col))
                    for celda, col in zip(_valores_fila(fila, columnas), columnas)
                ]
            )

        ancho_util = doc.width
        ancho_min = min(c.ancho_pdf for c in columnas)
        # Escalar los anchos si no caben en la pagina
        if sum(c.ancho_pdf for c in columnas) > ancho_util:
            factor = ancho_util / sum(c.ancho_pdf for c in columnas)
            anchos = [max(c.ancho_pdf * factor, ancho_min * 0.6) for c in columnas]
        else:
            anchos = [c.ancho_pdf for c in columnas]

        tabla = Table(data, colWidths=anchos, repeatRows=1)
        tabla.setStyle(_estilo_tabla(columnas, len(filas)))
        elementos.append(tabla)

    def _dibujar_pagina(canvas, doc_):
        _encabezado_pie(canvas, doc_, titulo)

    doc.build(
        elementos,
        onFirstPage=_dibujar_pagina,
        onLaterPages=_dibujar_pagina,
    )
    return buffer.getvalue()


def _valores_fila(fila: Dict[str, Any], columnas: List[Columna]) -> List[str]:
    """Extrae y formatea los valores de una fila en el orden de las columnas."""
    from app.services.reportes.base import _formatear_valor_pdf

    return [_formatear_valor_pdf(fila.get(c.clave), c) for c in columnas]


def _estilo_tabla(columnas: List[Columna], n_filas: int) -> TableStyle:
    """Construye el estilo visual de la tabla (estetica de "cards" del frontend).

    El encabezado recorre el degradado rosa -> naranja de izquierda a derecha y
    las filas alternan rosa-50 / ambar-50. La alineacion de cada celda
    (Paragraph) se define en su propio ParagraphStyle; aqui NO se usan ALIGN.
    """
    n_cols = max(len(columnas), 1)
    commands = [
        # Tipografia general
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("TEXTCOLOR", (0, 1), (-1, -1), COLOR_TEXTO),
        # Bordes suaves internos y contorno con acento rosado
        ("GRID", (0, 0), (-1, -1), 0.4, COLOR_BORDE),
        ("BOX", (0, 0), (-1, -1), 0.9, _color_gradiente(0.35, ROSA, NARANJA)),
        # Espaciado interno
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        # Encabezado con borde inferior resaltado (ambar)
        ("LINEBELOW", (0, 0), (-1, 0), 1.2, COLOR_ACENTO),
        # Esquinas redondeadas (cards)
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]

    # Encabezado con degradado rosa -> naranja a lo largo de las columnas
    for i in range(n_cols):
        frac = (i + 0.5) / n_cols
        commands.append(("BACKGROUND", (i, 0), (i, 0), _color_gradiente(frac, ROSA, NARANJA)))

    # Alternancia de filas (zebra) en tonos de la marca para mejor lectura
    for r in range(1, n_filas + 1):
        color_zebra = COLOR_ROSA_50 if r % 2 == 1 else COLOR_AMBAR_50
        commands.append(("BACKGROUND", (0, r), (-1, r), color_zebra))

    return TableStyle(commands)
