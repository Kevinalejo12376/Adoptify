"""
Generacion de reportes PDF con ReportLab.

El documento se construye completamente en memoria (``io.BytesIO``) y se
devuelve como bytes, sin escribir ningun archivo en el servidor. Usa ``Table``
con ``repeatRows=1`` para repetir el encabezado en cada pagina.

El diseno replica la identidad visual de Adoptify de forma sutil y profesional:
    - Franja superior con degradado rosa claro -> ambar claro y el logo de la
      marca, con el titulo del reporte en un tono rosa moderado.
    - Bloque de metadatos con el usuario que genera el reporte, su correo, la
      fecha de generacion y el total de registros.
    - Tabla con encabezado degradado suave (rose-100 -> ambar-100), filas zebra
      en tonos muy claros de la marca, bordes suaves y esquinas redondeadas.
    - Pie de pagina con la marca y la numeracion "Pagina X de Y".

Nota: con ReportLab la alineacion de una celda que contiene un ``Paragraph``
se controla desde el ``ParagraphStyle`` (no con ``ALIGN`` de la tabla), por eso
se crean estilos de celda por alineacion.
"""
# pyrefly: ignore [missing-import]
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as _pdf_canvas
from reportlab.platypus import (
    Flowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services.reportes.base import (
    Columna,
    extraer_datos_usuario,
    HEX_ACENTO,
    HEX_AMBAR_100,
    HEX_AMBAR_50,
    HEX_BORDE,
    HEX_ENCABEZADO_TEXTO,
    HEX_NARANJA,
    HEX_PRIMARIO,
    HEX_ROSA,
    HEX_ROSA_100,
    HEX_ROSA_50,
    HEX_TEXTO,
    HEX_TEXTO_SUAVE,
)

# ---------------------------------------------------------------------------
# Identidad visual sutil de Adoptify (tonos claros y formales)
# ---------------------------------------------------------------------------
def _hex(valor: str) -> HexColor:
    """Convierte un valor hexadecimal (con o sin '#') a Color de ReportLab."""
    return HexColor(valor if valor.startswith("#") else "#" + valor)


ROSA = _hex(HEX_ROSA)  # Rose-400 (degradados sutiles)
NARANJA = _hex(HEX_NARANJA)  # Amber-400 (degradados sutiles)
COLOR_PRIMARIO = _hex(HEX_PRIMARIO)  # Rose-500 (titulos / acentos)
COLOR_ACENTO = _hex(HEX_ACENTO)  # Amber-500
COLOR_ROSA_100 = _hex(HEX_ROSA_100)
COLOR_AMBAR_100 = _hex(HEX_AMBAR_100)
COLOR_ROSA_50 = _hex(HEX_ROSA_50)
COLOR_AMBAR_50 = _hex(HEX_AMBAR_50)
COLOR_TEXTO = _hex(HEX_TEXTO)  # Gray-800
COLOR_TEXTO_SUAVE = _hex(HEX_TEXTO_SUAVE)  # Gray-500
COLOR_BORDE = _hex(HEX_BORDE)
COLOR_ENCABEZADO_TEXTO = _hex(HEX_ENCABEZADO_TEXTO)  # Rose-800
COLOR_MARCA = _hex("#BE123C")  # Rose-700 (marca sobre la franja clara)

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

    def __init__(self, width, height, c1=COLOR_ROSA_100, c2=COLOR_AMBAR_100, pasos=60):
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
        "meta_clave": ParagraphStyle(
            "ReporteMetaClave",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=12,
            textColor=COLOR_TEXTO,
        ),
        "meta_valor": ParagraphStyle(
            "ReporteMetaValor",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=COLOR_TEXTO_SUAVE,
        ),
        "celda_header": ParagraphStyle(
            "ReporteCeldaHeader",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=COLOR_ENCABEZADO_TEXTO,
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
    """Dibuja el encabezado de cada pagina: franja suave, logo y titulo."""
    ancho, alto = doc.pagesize
    margen = 12 * mm

    # ---- Franja superior: degradado rosa claro -> ambar claro ----
    alto_franja = 10 * mm
    _dibujar_gradiente(
        canvas, 0, alto - alto_franja, ancho, alto_franja,
        COLOR_ROSA_100, COLOR_AMBAR_100,
    )

    # ---- Logo de Adoptify sobre un "chip" blanco (izquierda) ----
    logo_ancho = 40
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

    # ---- Titulo del reporte (derecha, en un rosa moderado de marca) ----
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.setFillColor(COLOR_MARCA)
    canvas.drawRightString(ancho - margen, alto - alto_franja / 2 - 4, titulo)

    # ---- Linea de acento suave bajo la franja ----
    canvas.setStrokeColor(COLOR_ACENTO)
    canvas.setLineWidth(0.8)
    canvas.line(margen, alto - alto_franja - 0.8, ancho - margen, alto - alto_franja - 0.8)


class _CanvasNumerado(_pdf_canvas.Canvas):
    """Canvas que permite dibujar el numero total de paginas al guardar.

    Implementa el patron ``NumberedCanvas`` de ReportLab: guarda el estado de
    cada pagina y al final dibuja el pie con "Pagina X de Y".
    """

    def __init__(self, *args, margen_izq: float = 0, ancho: float = 0, **kwargs):
        super().__init__(*args, **kwargs)
        self._estados_paginas = []
        self._margen_izq = margen_izq
        self._ancho = ancho

    def showPage(self):
        self._estados_paginas.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._estados_paginas)
        for numero, estado in enumerate(self._estados_paginas, start=1):
            self.__dict__.update(estado)
            self._pie_pagina(numero, total)
            super().showPage()
        super().save()

    def _pie_pagina(self, numero: int, total: int):
        """Dibuja el pie de pagina: linea suave, marca y numeracion."""
        self.saveState()
        margen = self._margen_izq
        ancho = self._ancho
        y_pie = 8 * mm
        self.setStrokeColor(COLOR_BORDE)
        self.setLineWidth(0.5)
        self.line(margen, y_pie + 3 * mm, ancho - margen, y_pie + 3 * mm)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(COLOR_TEXTO_SUAVE)
        self.drawString(margen, y_pie, "Adoptify · Documento generado automáticamente")
        self.drawRightString(ancho - margen, y_pie, f"Página {numero} de {total}")
        self.restoreState()


def _canvas_factory(margen_izq: float, ancho: float):
    """Fabrica el canvas numerado inyectando los margenes del documento."""

    def _crear(*args, **kwargs):
        return _CanvasNumerado(*args, margen_izq=margen_izq, ancho=ancho, **kwargs)

    return _crear


# ---------------------------------------------------------------------------
# Tabla de metadatos (usuario que genera, fecha y total de registros)
# ---------------------------------------------------------------------------
def _tabla_meta(usuario: Any, total: int, generado: str) -> Table:
    """Tabla compacta con los metadatos del reporte.

    Si hay usuario, muestra quien lo genero y su correo; siempre muestra la
    fecha de generacion y el total de registros.
    """
    estilos = _estilos()
    datos_usuario = extraer_datos_usuario(usuario)
    if datos_usuario:
        filas = [
            [
                Paragraph("Generado por", estilos["meta_clave"]),
                Paragraph(datos_usuario["nombre"], estilos["meta_valor"]),
                Paragraph("Correo", estilos["meta_clave"]),
                Paragraph(datos_usuario["email"], estilos["meta_valor"]),
            ],
            [
                Paragraph("Fecha de generación", estilos["meta_clave"]),
                Paragraph(generado, estilos["meta_valor"]),
                Paragraph("Total de registros", estilos["meta_clave"]),
                Paragraph(str(total), estilos["meta_valor"]),
            ],
        ]
    else:
        filas = [
            [
                Paragraph("Fecha de generación", estilos["meta_clave"]),
                Paragraph(generado, estilos["meta_valor"]),
                Paragraph("Total de registros", estilos["meta_clave"]),
                Paragraph(str(total), estilos["meta_valor"]),
            ],
        ]
    tabla = Table(filas, colWidths=[30 * mm, 65 * mm, 35 * mm, 50 * mm])
    tabla.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, COLOR_BORDE),
        ("BOX", (0, 0), (-1, -1), 0.8, COLOR_PRIMARIO),
        ("BACKGROUND", (0, 0), (0, -1), COLOR_ROSA_50),
    ]))
    return tabla


# ---------------------------------------------------------------------------
# Construccion principal
# ---------------------------------------------------------------------------
def construir_pdf(
    *,
    titulo: str,
    subtitulo: str,
    columnas: List[Columna],
    filas: List[Dict[str, Any]],
    usuario: Any = None,
) -> bytes:
    """Construye un PDF tabular en memoria con la identidad visual de Adoptify.

    Args:
        titulo: Titulo del reporte.
        subtitulo: Texto secundario (fecha de generacion, etc).
        columnas: Definicion de columnas.
        filas: Lista de dicts con los datos (claves = ``columna.clave``).
        usuario: Usuario (objeto o dict) que genera el reporte; se muestra en
            los metadatos para dejar trazabilidad del autor.

    Returns:
        bytes con el contenido del PDF.
    """
    estilos = _estilos()
    buffer = BytesIO()

    # Orientacion horizontal si hay muchas columnas para mejor legibilidad
    pagina = landscape(A4) if len(columnas) > 5 else A4
    margen = 12 * mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=pagina,
        leftMargin=margen,
        rightMargin=margen,
        topMargin=16 * mm,
        bottomMargin=15 * mm,
        title=titulo,
        author="Adoptify",
    )

    ahora = datetime.now(timezone.utc)
    generado = ahora.strftime("%d/%m/%Y %H:%M") + " (UTC)"

    elementos = [
        Paragraph(titulo, estilos["titulo"]),
        Paragraph(subtitulo, estilos["subtitulo"]),
        Spacer(1, 2 * mm),
        # Barra de separacion con el degradado suave de la marca
        _BarraGradiente(width=doc.width, height=2.6),
        Spacer(1, 4 * mm),
        _tabla_meta(usuario, len(filas), generado),
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
        canvasmaker=_canvas_factory(margen, pagina[0]),
    )
    return buffer.getvalue()


def _valores_fila(fila: Dict[str, Any], columnas: List[Columna]) -> List[str]:
    """Extrae y formatea los valores de una fila en el orden de las columnas."""
    from app.services.reportes.base import _formatear_valor_pdf

    return [_formatear_valor_pdf(fila.get(c.clave), c) for c in columnas]


def _estilo_tabla(columnas: List[Columna], n_filas: int) -> TableStyle:
    """Construye el estilo visual de la tabla (estetica sutil de "cards").

    El encabezado recorre un degradado suave rose-100 -> ambar-100 de izquierda
    a derecha con texto rose-800, y las filas alternan rose-50 / ambar-50. La
    alineacion de cada celda (Paragraph) se define en su propio ParagraphStyle;
    aqui NO se usan ALIGN.
    """
    n_cols = max(len(columnas), 1)
    commands = [
        # Tipografia general
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_ENCABEZADO_TEXTO),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("TEXTCOLOR", (0, 1), (-1, -1), COLOR_TEXTO),
        # Bordes suaves internos y contorno con acento rosado
        ("GRID", (0, 0), (-1, -1), 0.4, COLOR_BORDE),
        ("BOX", (0, 0), (-1, -1), 0.9, COLOR_PRIMARIO),
        # Espaciado interno
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        # Encabezado con borde inferior resaltado (ambar)
        ("LINEBELOW", (0, 0), (-1, 0), 1.0, COLOR_ACENTO),
        # Esquinas redondeadas (cards)
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]

    # Encabezado con degradado suave rose-100 -> ambar-100 a lo largo de las columnas
    for i in range(n_cols):
        frac = (i + 0.5) / n_cols
        commands.append(("BACKGROUND", (i, 0), (i, 0), _color_gradiente(frac, COLOR_ROSA_100, COLOR_AMBAR_100)))

    # Alternancia de filas (zebra) en tonos muy claros de la marca
    for r in range(1, n_filas + 1):
        color_zebra = COLOR_ROSA_50 if r % 2 == 1 else COLOR_AMBAR_50
        commands.append(("BACKGROUND", (0, r), (-1, r), color_zebra))

    return TableStyle(commands)
