# Utilidades comunes para generar los manuales en PDF (reportlab).
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image,
                                Table, TableStyle, PageBreak, KeepTogether, NextPageTemplate,
                                ListFlowable, ListItem, CondPageBreak)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

F = '/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('Sans', F + 'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Sans-Bold', F + 'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Mono', F + 'DejaVuSansMono.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('Sans', normal='Sans', bold='Sans-Bold', italic='Sans', boldItalic='Sans-Bold')

NAVY = colors.HexColor('#17303B')
VERDE = colors.HexColor('#00A86B')
VERDE_CLARO = colors.HexColor('#EFFCF6')
VERDE_BORDE = colors.HexColor('#C6F2DF')
NARANJA = colors.HexColor('#E0521C')
NARANJA_CLARO = colors.HexColor('#FFF5F0')
NARANJA_BORDE = colors.HexColor('#FFD4C2')
GRIS = colors.HexColor('#5E6B70')
GRIS_CLARO = colors.HexColor('#F3F6F7')
BORDE = colors.HexColor('#DDE3E6')
TEXTO = colors.HexColor('#1B2328')

ANCHO, ALTO = A4
MARGEN = 2 * cm
UTIL = ANCHO - 2 * MARGEN

E = {
    'p': ParagraphStyle('p', fontName='Sans', fontSize=10, leading=14.5, textColor=TEXTO, spaceAfter=6),
    'peq': ParagraphStyle('peq', fontName='Sans', fontSize=8.5, leading=12, textColor=GRIS),
    'h1': ParagraphStyle('h1', fontName='Sans-Bold', fontSize=18, leading=22, textColor=NAVY, spaceBefore=4, spaceAfter=10),
    'h2': ParagraphStyle('h2', fontName='Sans-Bold', fontSize=13, leading=17, textColor=NAVY, spaceBefore=12, spaceAfter=6),
    'h3': ParagraphStyle('h3', fontName='Sans-Bold', fontSize=10.5, leading=14, textColor=VERDE, spaceBefore=8, spaceAfter=4),
    'pie': ParagraphStyle('pie', fontName='Sans', fontSize=8, leading=11, textColor=GRIS, alignment=TA_CENTER, spaceBefore=3, spaceAfter=10),
    'celda': ParagraphStyle('celda', fontName='Sans', fontSize=8.8, leading=12, textColor=TEXTO),
    'celda_b': ParagraphStyle('celda_b', fontName='Sans-Bold', fontSize=8.8, leading=12, textColor=colors.white),
    'caja': ParagraphStyle('caja', fontName='Sans', fontSize=9.3, leading=13.5, textColor=TEXTO),
    'mono': ParagraphStyle('mono', fontName='Mono', fontSize=8.5, leading=12, textColor=TEXTO, backColor=GRIS_CLARO,
                           borderPadding=(6, 8, 6, 8), spaceBefore=4, spaceAfter=10, leftIndent=8, rightIndent=8),
    'toc1': ParagraphStyle('toc1', fontName='Sans-Bold', fontSize=10, leading=13.2, textColor=NAVY, leftIndent=0),
    'toc2': ParagraphStyle('toc2', fontName='Sans', fontSize=9, leading=11.4, textColor=TEXTO, leftIndent=16),
}


class Documento(BaseDocTemplate):
    def __init__(self, ruta, titulo, subtitulo, **kw):
        super().__init__(ruta, pagesize=A4, leftMargin=MARGEN, rightMargin=MARGEN, topMargin=2.3 * cm,
                         bottomMargin=2 * cm, title=titulo, author='Sistema POS', subject=subtitulo, **kw)
        self.titulo = titulo
        self.subtitulo = subtitulo
        marco = Frame(MARGEN, 2 * cm, UTIL, ALTO - 4.3 * cm, id='cuerpo')
        self.addPageTemplates([
            PageTemplate(id='portada', frames=[Frame(MARGEN, 2 * cm, UTIL, ALTO - 4 * cm)], onPage=self._portada),
            PageTemplate(id='normal', frames=[marco], onPage=self._pagina),
        ])

    def afterFlowable(self, f):
        if isinstance(f, Paragraph) and getattr(f, '_nivel_toc', None) is not None:
            texto = f.getPlainText()
            clave = 'h%d-%d' % (f._nivel_toc, id(f))
            self.canv.bookmarkPage(clave)
            self.canv.addOutlineEntry(texto, clave, level=f._nivel_toc, closed=False)
            self.notify('TOCEntry', (f._nivel_toc, texto, self.page, clave))

    def _portada(self, c, doc):
        c.saveState()
        c.setFillColor(NAVY)
        c.rect(0, ALTO - 11 * cm, ANCHO, 11 * cm, stroke=0, fill=1)
        c.setFillColor(VERDE)
        c.rect(0, ALTO - 11.25 * cm, ANCHO, 0.25 * cm, stroke=0, fill=1)
        c.setFillColor(colors.HexColor('#19D990'))
        c.setFont('Sans-Bold', 12)
        c.drawString(MARGEN, ALTO - 3 * cm, 'POS  ·  DROGUERÍA')
        c.setFillColor(colors.white)
        y = ALTO - 5.2 * cm
        for linea in self.titulo.split('\n'):
            c.setFont('Sans-Bold', 25)
            c.drawString(MARGEN, y, linea)
            y -= 1.05 * cm
        c.setFont('Sans', 12)
        c.setFillColor(colors.HexColor('#C9D6DB'))
        c.drawString(MARGEN, y - 0.3 * cm, self.subtitulo)
        c.setFillColor(GRIS)
        c.setFont('Sans', 9)
        c.drawString(MARGEN, 2.2 * cm, 'Sistema POS · versión HTML/CSS/JS (sin instalación ni servidor)')
        c.drawRightString(ANCHO - MARGEN, 2.2 * cm, 'Versión 1.0 · Septiembre de 2026')
        c.restoreState()

    def _pagina(self, c, doc):
        c.saveState()
        c.setStrokeColor(BORDE)
        c.setLineWidth(0.6)
        c.line(MARGEN, ALTO - 1.55 * cm, ANCHO - MARGEN, ALTO - 1.55 * cm)
        c.setFont('Sans-Bold', 8)
        c.setFillColor(NAVY)
        c.drawString(MARGEN, ALTO - 1.3 * cm, 'Sistema POS')
        c.setFont('Sans', 8)
        c.setFillColor(GRIS)
        c.drawRightString(ANCHO - MARGEN, ALTO - 1.3 * cm, self.titulo.replace('\n', ' '))
        c.line(MARGEN, 1.45 * cm, ANCHO - MARGEN, 1.45 * cm)
        c.drawRightString(ANCHO - MARGEN, 1.0 * cm, 'Página %d' % doc.page)
        c.restoreState()


def h1(texto):
    p = Paragraph(texto, E['h1'])
    p._nivel_toc = 0
    return p


def h2(texto):
    p = Paragraph(texto, E['h2'])
    p._nivel_toc = 1
    return p


def h3(texto):
    return Paragraph(texto, E['h3'])


def p(texto):
    return Paragraph(texto, E['p'])


def viñetas(items, numerada=False, inicio=1):
    return ListFlowable(
        [ListItem(Paragraph(t, E['p']), leftIndent=14, value=(i + inicio if numerada else None)) for i, t in enumerate(items)],
        bulletType='1' if numerada else 'bullet', start=inicio if numerada else None,
        bulletFontName='Sans-Bold' if numerada else 'Sans', bulletFontSize=9.5 if numerada else 8,
        bulletColor=VERDE, leftIndent=16, bulletDedent=12 if numerada else 10, spaceAfter=6)


def pasos(items, inicio=1):
    return viñetas(items, numerada=True, inicio=inicio)


def caja(titulo, texto, tipo='consejo'):
    fondo, borde, color = {
        'consejo': (VERDE_CLARO, VERDE_BORDE, VERDE),
        'aviso': (NARANJA_CLARO, NARANJA_BORDE, NARANJA),
        'nota': (GRIS_CLARO, BORDE, NAVY),
    }[tipo]
    contenido = [Paragraph('<font color="%s"><b>%s</b></font>' % (color.hexval().replace('0x', '#'), titulo), E['caja'])]
    for parrafo in (texto if isinstance(texto, list) else [texto]):
        contenido.append(Paragraph(parrafo, E['caja']))
    t = Table([[contenido]], colWidths=[UTIL])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), fondo),
        ('BOX', (0, 0), (-1, -1), 0.8, borde),
        ('LINEBEFORE', (0, 0), (0, -1), 3, color),
        ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return KeepTogether([Spacer(1, 3), t, Spacer(1, 8)])


def tabla(encabezado, filas, anchos=None):
    anchos = anchos or [UTIL / len(encabezado)] * len(encabezado)
    total = sum(anchos)
    anchos = [a * UTIL / total for a in anchos]
    datos = [[Paragraph(h, E['celda_b']) for h in encabezado]]
    datos += [[Paragraph(str(c), E['celda']) for c in f] for f in filas]
    t = Table(datos, colWidths=anchos, repeatRows=1)
    estilo = [
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, BORDE),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(datos)):
        if i % 2 == 0:
            estilo.append(('BACKGROUND', (0, i), (-1, i), GRIS_CLARO))
    t.setStyle(TableStyle(estilo))
    return KeepTogether([t, Spacer(1, 10)]) if len(filas) < 14 else t


def figura(ruta, pie=None, ancho=None, alto_max=None, recorte=None):
    """Imagen con marco fino y pie de figura. `recorte` = (x0, y0, x1, y1) en fracciones."""
    img = PILImage.open(ruta)
    if recorte:
        w, h = img.size
        caja_px = (int(recorte[0] * w), int(recorte[1] * h), int(recorte[2] * w), int(recorte[3] * h))
        img = img.crop(caja_px)
        base, ext = os.path.splitext(ruta)
        ruta = base + '-rec-%d-%d-%d-%d' % tuple(int(r * 100) for r in recorte) + ext
        img.save(ruta, quality=85)
    w, h = img.size
    ancho = ancho or UTIL * 0.92
    alto = ancho * h / w
    alto_max = alto_max or 12.5 * cm
    if alto > alto_max:
        alto = alto_max
        ancho = alto * w / h
    im = Image(ruta, width=ancho, height=alto)
    marco = Table([[im]], colWidths=[ancho + 2])
    marco.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.6, BORDE), ('LEFTPADDING', (0, 0), (-1, -1), 1),
                               ('RIGHTPADDING', (0, 0), (-1, -1), 1), ('TOPPADDING', (0, 0), (-1, -1), 1),
                               ('BOTTOMPADDING', (0, 0), (-1, -1), 1)]))
    partes = [Spacer(1, 4), marco]
    if pie:
        partes.append(Paragraph(pie, E['pie']))
    else:
        partes.append(Spacer(1, 10))
    return KeepTogether(partes)


def indice():
    toc = TableOfContents()
    toc.levelStyles = [E['toc1'], E['toc2']]
    toc.dotsMinLevel = 0
    return [Paragraph('Contenido', E['h1']), Spacer(1, 6), toc, PageBreak()]


def construir(ruta, titulo, subtitulo, historia):
    doc = Documento(ruta, titulo, subtitulo)
    completa = [NextPageTemplate('normal'), PageBreak()] + indice() + historia
    doc.multiBuild(completa)
