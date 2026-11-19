"""Utilidades mínimas para agregar contenido (OOXML) a un .docx existente sin tocar lo que ya tiene.

Se usan desde generar-docx.py. Soporta: títulos (Heading1-3), párrafos con **negritas**, *cursivas* y
`código`, listas con viñeta, tablas, imágenes con pie de figura, filas de capturas de teléfono,
tabla de contenido (campo TOC), saltos de página y pie de página con número.
"""
import re
import struct
from xml.sax.saxutils import escape

AZUL = "0E5E8C"
GRIS = "5A6876"
BORDE = "BFC8D2"
FUENTE = "Arial"
EMU_POR_PULGADA = 914400


def tam_png(ruta):
    with open(ruta, "rb") as f:
        cab = f.read(24)
    if cab[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("No es PNG: " + ruta)
    return struct.unpack(">II", cab[16:24])


def _run(texto, negrita=False, cursiva=False, codigo=False, color=None, tam=None):
    props = [f'<w:rFonts w:ascii="{"Consolas" if codigo else FUENTE}" w:hAnsi="{"Consolas" if codigo else FUENTE}" w:cs="{FUENTE}"/>']
    if negrita:
        props.append("<w:b/><w:bCs/>")
    if cursiva:
        props.append("<w:i/><w:iCs/>")
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    if codigo:
        props.append('<w:color w:val="1F3A60"/>')
    t = tam or (18 if codigo else 21)
    if t:
        props.append(f'<w:sz w:val="{t}"/><w:szCs w:val="{t}"/>')
    if codigo:
        props.append('<w:shd w:val="clear" w:color="auto" w:fill="EEF2F6"/>')
    props.append('<w:lang w:val="es-MX"/>')
    return f'<w:r><w:rPr>{"".join(props)}</w:rPr><w:t xml:space="preserve">{escape(texto)}</w:t></w:r>'


def runs(texto, color=None, tam=None, negrita_base=False):
    """Convierte **negrita**, *cursiva* y `código` en runs."""
    salida = []
    for parte in re.split(r"(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)", texto):
        if not parte:
            continue
        if parte.startswith("**"):
            salida.append(_run(parte[2:-2], negrita=True, color=color, tam=tam))
        elif parte.startswith("`"):
            salida.append(_run(parte[1:-1], codigo=True))
        elif parte.startswith("*") and len(parte) > 2:
            salida.append(_run(parte[1:-1], cursiva=True, color=color, tam=tam, negrita=negrita_base))
        else:
            salida.append(_run(parte, color=color, tam=tam, negrita=negrita_base))
    return "".join(salida)


class Documento:
    def __init__(self):
        self.xml = []
        self.imagenes = []  # (rId, nombre_en_media, ruta_origen)
        self.n_img = 0
        self.n_fig = 0
        self.n_tabla = 0
        self.ancho_util_twips = 12240 - 1701 * 2  # carta con márgenes de la portada

    # ------------------------------------------------------------ bloques de texto
    def titulo(self, nivel, texto, salto=False):
        brk = '<w:pageBreakBefore/>' if salto else ''
        self.xml.append(f'<w:p><w:pPr><w:pStyle w:val="Heading{nivel}"/>{brk}</w:pPr>{runs(texto)}</w:p>')

    def parrafo(self, texto, alineacion="both", color=None, tam=None, antes=0, despues=120, sangria=0, junto=False):
        ind = f'<w:ind w:left="{sangria}"/>' if sangria else ''
        ind = ('<w:keepNext/>' if junto or texto.rstrip().endswith(':') else '') + ind
        self.xml.append(
            f'<w:p><w:pPr><w:spacing w:before="{antes}" w:after="{despues}" w:line="276" w:lineRule="auto"/>{ind}'
            f'<w:jc w:val="{alineacion}"/></w:pPr>{runs(texto, color=color, tam=tam)}</w:p>'
        )

    def vinetas(self, elementos):
        for e in elementos:
            self.xml.append(
                '<w:p><w:pPr><w:spacing w:before="0" w:after="80" w:line="264" w:lineRule="auto"/>'
                '<w:ind w:left="567" w:hanging="283"/><w:jc w:val="both"/></w:pPr>'
                + _run("•\t", color=AZUL, negrita=True)
                + runs(e)
                + "</w:p>"
            )

    def nota(self, texto, titulo=None):
        """Recuadro azul claro con borde izquierdo."""
        cuerpo = (runs(f"**{titulo}** ", color=AZUL) if titulo else "") + runs(texto)
        self.xml.append(
            '<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="0E5E8C"/></w:pBdr>'
            '<w:shd w:val="clear" w:color="auto" w:fill="E4F0F7"/><w:spacing w:before="120" w:after="160" w:line="264" w:lineRule="auto"/>'
            f'<w:ind w:left="170" w:right="113"/><w:jc w:val="both"/></w:pPr>{cuerpo}</w:p>'
        )

    def salto_pagina(self):
        self.xml.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

    def indice(self):
        """Campo TOC; Word lo actualiza al abrir/exportar."""
        self.xml.append(
            '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="0E5E8C"/></w:pBdr><w:spacing w:after="200"/></w:pPr>'
            + _run("Contenido", negrita=True, color=AZUL, tam=32) + "</w:p>"
        )
        self.xml.append(
            '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>'
            '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z </w:instrText></w:r>'
            '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
            + _run("Actualice la tabla de contenido (clic derecho > Actualizar campos).", color=GRIS)
            + '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'
        )

    # ------------------------------------------------------------ imágenes
    def _drawing(self, ruta, ancho_pulg):
        w, h = tam_png(ruta)
        cx = int(ancho_pulg * EMU_POR_PULGADA)
        cy = int(cx * h / w)
        self.n_img += 1
        rid = f"rIdImg{self.n_img}"
        nombre = f"reporte{self.n_img}.png"
        self.imagenes.append((rid, nombre, ruta))
        i = 1000 + self.n_img
        return (
            f'<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/>'
            f'<wp:docPr id="{i}" name="Imagen {i}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:nvPicPr><pic:cNvPr id="{i}" name="{nombre}"/><pic:cNvPicPr/></pic:nvPicPr>'
            f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
            f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            '<a:ln w="6350"><a:solidFill><a:srgbClr val="BFC8D2"/></a:solidFill></a:ln></pic:spPr>'
            "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"
        )

    def pie(self, texto):
        self.n_fig += 1
        self.xml.append(
            '<w:p><w:pPr><w:spacing w:before="60" w:after="200"/><w:jc w:val="center"/></w:pPr>'
            + _run(f"Figura {self.n_fig}. ", negrita=True, color=GRIS, tam=17)
            + runs(texto, color=GRIS, tam=17)
            + "</w:p>"
        )

    def figura(self, ruta, texto, ancho_pulg=6.0):
        self.xml.append(
            '<w:p><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="0"/><w:jc w:val="center"/></w:pPr>'
            + self._drawing(ruta, ancho_pulg)
            + "</w:p>"
        )
        self.pie(texto)

    def telefonos(self, elementos, ancho_pulg=None):
        """Fila de capturas de teléfono: [(ruta, leyenda)], en una tabla sin bordes."""
        n = len(elementos)
        ancho_pulg = ancho_pulg or (1.85 if n >= 3 else 2.15)
        col = self.ancho_util_twips // n
        celdas = []
        for ruta, leyenda in elementos:
            self.n_fig += 1
            celdas.append(
                f'<w:tc><w:tcPr><w:tcW w:w="{col}" w:type="dxa"/></w:tcPr>'
                '<w:p><w:pPr><w:spacing w:before="60" w:after="40"/><w:jc w:val="center"/></w:pPr>'
                + self._drawing(ruta, ancho_pulg)
                + "</w:p>"
                '<w:p><w:pPr><w:spacing w:before="0" w:after="60"/><w:jc w:val="center"/></w:pPr>'
                + _run(f"Figura {self.n_fig}. ", negrita=True, color=GRIS, tam=16)
                + runs(leyenda, color=GRIS, tam=16)
                + "</w:p></w:tc>"
            )
        self.xml.append(
            f'<w:tbl><w:tblPr><w:tblW w:w="{col * n}" w:type="dxa"/><w:jc w:val="center"/>'
            '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
            '<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'
            + "".join(f'<w:gridCol w:w="{col}"/>' for _ in elementos)
            + '</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>'
            + "".join(celdas)
            + "</w:tr></w:tbl>"
        )
        self.parrafo("", despues=0)

    # ------------------------------------------------------------ tablas
    def tabla(self, encabezados, filas, anchos=None, titulo=None, tam=18):
        """anchos en proporción; celdas aceptan el mismo marcado que los párrafos."""
        if titulo:
            self.n_tabla += 1
            self.xml.append(
                '<w:p><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="60"/></w:pPr>'
                + _run(f"Tabla {self.n_tabla}. ", negrita=True, color=AZUL, tam=18)
                + runs(titulo, color=AZUL, tam=18)
                + "</w:p>"
            )
        n = len(encabezados)
        anchos = anchos or [1] * n
        total = sum(anchos)
        cols = [int(self.ancho_util_twips * a / total) for a in anchos]
        borde = f'w:val="single" w:sz="4" w:space="0" w:color="{BORDE}"'

        def celda(texto, ancho, fondo=None, encabezado=False):
            shd = f'<w:shd w:val="clear" w:color="auto" w:fill="{fondo}"/>' if fondo else ""
            parrafos = "".join(
                '<w:p><w:pPr><w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr>'
                + (runs(linea, color="FFFFFF", tam=tam, negrita_base=True) if encabezado else runs(linea, tam=tam))
                + "</w:p>"
                for linea in str(texto).split("\n")
            )
            return (
                f'<w:tc><w:tcPr><w:tcW w:w="{ancho}" w:type="dxa"/>{shd}'
                '<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar>'
                f"</w:tcPr>{parrafos}</w:tc>"
            )

        filas_xml = [
            '<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>'
            + "".join(celda(e, c, AZUL, True) for e, c in zip(encabezados, cols))
            + "</w:tr>"
        ]
        for k, fila in enumerate(filas):
            fondo = "F5F7FA" if k % 2 else None
            filas_xml.append(
                '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + "".join(celda(v, c, fondo) for v, c in zip(fila, cols)) + "</w:tr>"
            )
        self.xml.append(
            f'<w:tbl><w:tblPr><w:tblW w:w="{sum(cols)}" w:type="dxa"/><w:jc w:val="center"/>'
            f"<w:tblBorders><w:top {borde}/><w:left {borde}/><w:bottom {borde}/><w:right {borde}/><w:insideH {borde}/><w:insideV {borde}/></w:tblBorders>"
            '<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'
            + "".join(f'<w:gridCol w:w="{c}"/>' for c in cols)
            + "</w:tblGrid>"
            + "".join(filas_xml)
            + "</w:tbl>"
        )
        self.parrafo("", despues=60)
