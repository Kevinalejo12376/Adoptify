"""
Generacion de reportes PDF con ReportLab.

El documento se construye completamente en memoria (``io.BytesIO``) y se
devuelve como bytes, sin escribir ningun archivo en el servidor. Usa ``Table``
con ``repeatRows=1`` para repetir el encabezado en cada pagina.

Nota: con ReportLab la alineacion de una celda que contiene un ``Paragraph``
se controla desde el ``ParagraphStyle`` (no con ``ALIGN`` de la tabla), por eso
se crean estilos de celda por alineacion.
"""
# pyrefly: ignore [missing-import]
from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services.reportes.base import Columna, obtener_logo_bytes

# ---------------------------------------------------------------------------
# Paleta de colores (identidad Adoptify)
# ---------------------------------------------------------------------------
COLOR_PRIMARIO = colors.HexColor("#E11D48")  # Rose-600
COLOR_ACENTO = colors.HexColor("#F59E0B")  # Amber-500
COLOR_ZEBRA = colors.HexColor("#FFF7ED")  # Orange-50
COLOR_TEXTO = colors.HexColor("#1F2937")  # Gray-800
COLOR_TEXTO_SUAVE = colors.HexColor("#6B7280")  # Gray-500
COLOR_BORDE = colors.HexColor("#E5E7EB")  # Gray-200

_ALINEACIONES = {
    "left": TA_LEFT,
    "center": TA_CENTER,
    "right": TA_RIGHT,
}


def _estilos():
    base = getSampleStyleSheet()
    estilos = {
        "titulo": ParagraphStyle(
            "ReporteTitulo",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=COLOR_PRIMARIO,
            spaceAfter=2,
        ),
        "subtitulo": ParagraphStyle(
            "ReporteSubtitulo",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
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


def construir_pdf(
    *,
    titulo: str,
    subtitulo: str,
    columnas: List[Columna],
    filas: List[Dict[str, Any]],
) -> bytes:
    """Construye un PDF tabular en memoria.

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
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=titulo,
        author="Adoptify",
    )

    elementos = []
    logo_bytes = obtener_logo_bytes()
    if logo_bytes is not None:
        try:
            from reportlab.lib.utils import ImageReader

            lector = ImageReader(BytesIO(logo_bytes))
            ancho_logo, alto_logo = lector.getSize()
            alto_final = 13 * mm
            ancho_final = alto_final * ancho_logo / alto_logo
            elementos.append(
                Image(BytesIO(logo_bytes), width=ancho_final, height=alto_final)
            )
            elementos.append(Spacer(1, 3 * mm))
        except Exception:
            # Si el logo no se puede cargar, se omite sin romper el reporte.
            pass

    elementos += [
        Paragraph(titulo, estilos["titulo"]),
        Paragraph(subtitulo, estilos["subtitulo"]),
        Spacer(1, 6 * mm),
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
        tabla.setStyle(_estilo_tabla(len(filas)))
        elementos.append(tabla)

    doc.build(elementos)
    return buffer.getvalue()


def _valores_fila(fila: Dict[str, Any], columnas: List[Columna]) -> List[str]:
    """Extrae y formatea los valores de una fila en el orden de las columnas."""
    from app.services.reportes.base import _formatear_valor_pdf

    return [_formatear_valor_pdf(fila.get(c.clave), c) for c in columnas]


def _estilo_tabla(n_filas: int) -> TableStyle:
    """Construye el estilo visual profesional de la tabla.

    Nota: la alineacion de cada celda (Paragraph) se define en su propio
    ParagraphStyle; aqui NO se usan comandos ALIGN.
    """
    commands = [
        # Encabezado con fondo de color primario
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARIO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("TEXTCOLOR", (0, 1), (-1, -1), COLOR_TEXTO),
        # Bordes
        ("GRID", (0, 0), (-1, -1), 0.4, COLOR_BORDE),
        ("BOX", (0, 0), (-1, -1), 0.8, COLOR_PRIMARIO),
        # Espaciado interno
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        # Encabezado con borde inferior resaltado
        ("LINEBELOW", (0, 0), (-1, 0), 1.2, COLOR_ACENTO),
    ]

    # Alternancia de filas (zebra) para mejor lectura
    for r in range(1, n_filas + 1):
        if r % 2 == 0:
            commands.append(("BACKGROUND", (0, r), (-1, r), COLOR_ZEBRA))

    return TableStyle(commands)
