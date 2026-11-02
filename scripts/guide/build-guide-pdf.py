"""Builds the PDF copy of the HQ Guide from the JSON written by export-guide.mjs.

Usage:
  node scripts/guide/export-guide.mjs /tmp/guide.json
  python3 scripts/guide/build-guide-pdf.py /tmp/guide.json "Supreme Team HQ Guide.pdf" "November 2026"

Needs ReportLab plus the Carlito and Poppins fonts (falls back to Liberation Sans and DejaVu Sans).
No italics anywhere, by the owner's standing preference.
"""
import json
import os
import re
import subprocess
import sys

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame, KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

INK = HexColor('#111827')
MUTED = HexColor('#4B5563')
ACCENT = HexColor('#1E3A8A')
RULE = HexColor('#CBD5E1')
SOFT = HexColor('#EEF2FF')


def font_file(name):
    out = subprocess.run(['fc-list', ':', 'file'], capture_output=True, text=True).stdout.splitlines()
    for line in out:
        path = line.split(':')[0].strip()
        if os.path.basename(path) == name:
            return path
    return None


def register(alias, *candidates):
    for c in candidates:
        p = font_file(c)
        if p:
            pdfmetrics.registerFont(TTFont(alias, p))
            return TTFont(alias, p)
    raise SystemExit(f'No font found for {alias}: {candidates}')


BODY = register('Body', 'Carlito-Regular.ttf', 'LiberationSans-Regular.ttf', 'DejaVuSans.ttf')
register('BodyBold', 'Carlito-Bold.ttf', 'LiberationSans-Bold.ttf', 'DejaVuSans-Bold.ttf')
HEAD = register('Head', 'Poppins-SemiBold.ttf', 'Poppins-Bold.ttf', 'Carlito-Bold.ttf', 'DejaVuSans-Bold.ttf')
register('HeadLight', 'Poppins-Regular.ttf', 'Carlito-Regular.ttf', 'DejaVuSans.ttf')
FALLBACK = register('Fallback', 'DejaVuSans.ttf', 'FreeSans.ttf')


def has_glyphs(font, text):
    cmap = font.face.charToGlyph
    return all(ord(ch) in cmap or ch in ' \n' for ch in text)


missing = set()


def clean(text):
    """Escape for ReportLab markup and set curly quotes; never adds italics."""
    t = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    t = re.sub(r'"([^"]*)"', '\u201c\\1\u201d', t)
    t = re.sub(r"(\w)'(\w)", '\\1\u2019\\2', t)
    out = []
    for ch in t:
        if ord(ch) > 127 and ord(ch) not in BODY.face.charToGlyph:
            if ord(ch) in FALLBACK.face.charToGlyph:
                out.append(f'<font name="Fallback">{ch}</font>')
                continue
            missing.add(ch)
        out.append(ch)
    return ''.join(out)


def head_font(text, fallback='BodyBold'):
    return 'Head' if has_glyphs(HEAD, text) else fallback


S = {
    'cover_kicker': ParagraphStyle('ck', fontName='HeadLight', fontSize=12, leading=16, textColor=MUTED),
    'cover_title': ParagraphStyle('ct', fontName='Head', fontSize=34, leading=40, textColor=INK),
    'cover_sub': ParagraphStyle('cs', fontName='Body', fontSize=15, leading=21, textColor=MUTED),
    'cover_meta': ParagraphStyle('cm', fontName='Body', fontSize=11, leading=15, textColor=MUTED),
    'toc_title': ParagraphStyle('tt', fontName='Head', fontSize=22, leading=28, textColor=INK, spaceAfter=10),
    'part_kicker': ParagraphStyle('pk', fontName='HeadLight', fontSize=11, leading=14, textColor=ACCENT),
    'part_title': ParagraphStyle('pt', fontName='Head', fontSize=30, leading=36, textColor=INK, spaceAfter=14),
    'part_item': ParagraphStyle('pi', fontName='BodyBold', fontSize=12, leading=16, textColor=INK, spaceBefore=8),
    'part_item_sub': ParagraphStyle('pis', fontName='Body', fontSize=10.5, leading=14, textColor=MUTED),
    'kicker': ParagraphStyle('k', fontName='HeadLight', fontSize=9.5, leading=12, textColor=ACCENT),
    'title': ParagraphStyle('t', fontName='Head', fontSize=21, leading=26, textColor=INK, spaceBefore=2, spaceAfter=8),
    'summary': ParagraphStyle('s', fontName='Body', fontSize=12.5, leading=17.5, textColor=INK),
    'h2': ParagraphStyle('h2', fontName='Head', fontSize=13.5, leading=18, textColor=ACCENT, spaceBefore=14, spaceAfter=4),
    'h3': ParagraphStyle('h3', fontName='BodyBold', fontSize=12, leading=16, textColor=INK, spaceBefore=8, spaceAfter=2),
    'p': ParagraphStyle('p', fontName='Body', fontSize=11.5, leading=16, textColor=INK, spaceAfter=5, alignment=TA_LEFT),
    'li': ParagraphStyle('li', fontName='Body', fontSize=11.5, leading=15.5, textColor=INK, leftIndent=18, bulletIndent=4, spaceAfter=3),
    'intro': ParagraphStyle('in', fontName='Body', fontSize=11.5, leading=16, textColor=INK, spaceAfter=8),
}


class Rule(Flowable):
    def __init__(self, width=None, color=RULE, thickness=0.8, space=4):
        super().__init__()
        self.w, self.color, self.t, self.space = width, color, thickness, space

    def wrap(self, aw, ah):
        self.aw = self.w or aw
        return self.aw, self.space * 2

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.t)
        self.canv.line(0, self.space, self.aw, self.space)


class Marker(Flowable):
    """Zero-size flowable that records an outline entry and a TOC line where it lands."""

    def __init__(self, level, text, key):
        super().__init__()
        self.level, self.text, self.key = level, text, key

    def wrap(self, aw, ah):
        return 0, 0

    def draw(self):
        c = self.canv
        c.bookmarkPage(self.key)
        c.addOutlineEntry(self.text, self.key, level=self.level, closed=self.level == 0)
        self._doctemplate.notify('TOCEntry', (self.level, clean(self.text), c.getPageNumber(), self.key))


class GuideDoc(BaseDocTemplate):
    def __init__(self, path, edition, **kw):
        super().__init__(path, pagesize=LETTER, leftMargin=0.85 * inch, rightMargin=0.85 * inch,
                         topMargin=0.9 * inch, bottomMargin=0.85 * inch,
                         title='Supreme Team HQ Guide', author='Supreme Team Media',
                         subject='How every part of HQ works, screen by screen', **kw)
        self.edition = edition
        self.current_part = ''
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='f', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id='cover', frames=[frame], onPage=self.plain),
            PageTemplate(id='body', frames=[frame], onPageEnd=self.decorate),
        ])

    def handle_documentBegin(self):
        self.current_part = ''
        super().handle_documentBegin()

    def afterFlowable(self, f):
        if isinstance(f, PartFlag):
            self.current_part = f.name

    def plain(self, canv, doc):
        pass

    def decorate(self, canv, doc):
        # Drawn at the end of each page, so the header names the part this page belongs to.
        canv.saveState()
        w, h = LETTER
        canv.setFont('Body', 9)
        canv.setFillColor(MUTED)
        canv.drawString(self.leftMargin, h - 0.55 * inch, 'Supreme Team HQ Guide')
        if self.current_part:
            canv.drawRightString(w - self.rightMargin, h - 0.55 * inch, clean(self.current_part))
        canv.setStrokeColor(RULE)
        canv.setLineWidth(0.6)
        canv.line(self.leftMargin, h - 0.62 * inch, w - self.rightMargin, h - 0.62 * inch)
        canv.drawString(self.leftMargin, 0.5 * inch, self.edition)
        canv.drawRightString(w - self.rightMargin, 0.5 * inch, f'Page {canv.getPageNumber()}')
        canv.restoreState()


class PartFlag(Flowable):
    def __init__(self, name):
        super().__init__()
        self.name = name

    def wrap(self, aw, ah):
        return 0, 0

    def draw(self):
        pass


def blocks_to_flowables(blocks):
    out = []
    for b in blocks:
        t = b['type']
        if t == 'h2':
            out.append(CondPageBreak(1.3 * inch))
            out.append(Paragraph(clean(b['text']), ParagraphStyle('h2x', parent=S['h2'], fontName=head_font(b['text']))))
        elif t == 'h3':
            out.append(CondPageBreak(1.0 * inch))
            out.append(Paragraph(clean(b['text']), S['h3']))
        elif t == 'p':
            out.append(Paragraph(clean(b['text']), S['p']))
        elif t in ('ul', 'ol'):
            for i, item in enumerate(b['items'], 1):
                bullet = f'{i}.' if t == 'ol' else '\u2022'
                out.append(Paragraph(clean(item), S['li'], bulletText=bullet))
            out.append(Spacer(1, 4))
    return out


def summary_box(text, width):
    tbl = Table([[Paragraph(clean(text), S['summary'])]], colWidths=[width])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SOFT),
        ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBEFORE', (0, 0), (0, -1), 3, ACCENT),
    ]))
    return tbl


def main():
    src, out, edition_date = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else '')
    data = json.load(open(src, encoding='utf-8'))
    parts = data['parts']
    total = sum(len(p['articles']) for p in parts)
    edition = f'Edition of {edition_date}' if edition_date else 'Supreme Team Media'
    doc = GuideDoc(out, edition)
    width = doc.width
    story = []

    # Cover
    story += [Spacer(1, 1.6 * inch), Paragraph('SUPREME TEAM MEDIA', S['cover_kicker']), Spacer(1, 10),
              Paragraph('Supreme Team HQ Guide', S['cover_title']), Spacer(1, 12),
              Paragraph('How every part of HQ works, screen by screen.', S['cover_sub']), Spacer(1, 18),
              Rule(width=2.2 * inch, color=ACCENT, thickness=2.5), Spacer(1, 18),
              Paragraph(clean(f'{total} articles in {len(parts)} parts.'), S['cover_meta']),
              Paragraph(clean(edition), S['cover_meta']), Spacer(1, 2.2 * inch),
              Paragraph(clean('The same text lives in HQ under "Guide" in the menu, where it can be searched. '
                              'When a screen changes, the Guide is updated and a new PDF is made from it.'), S['cover_meta']),
              NextPageTemplate('body'), PageBreak()]

    # Contents
    toc = TableOfContents()
    toc.dotsMinLevel = 1
    toc.levelStyles = [
        ParagraphStyle('toc0', fontName='Head', fontSize=12.5, leading=17, textColor=ACCENT, spaceBefore=10, spaceAfter=2),
        ParagraphStyle('toc1', fontName='Body', fontSize=11, leading=14.5, leftIndent=14, textColor=INK),
    ]
    story += [PartFlag(''), Paragraph('Contents', S['toc_title']), toc, PageBreak()]

    for pi, p in enumerate(parts, 1):
        name = p['name']
        story += [PartFlag(name), Marker(0, name, f'part{pi}'),
                  Spacer(1, 1.2 * inch), Paragraph(f'PART {pi}', S['part_kicker']), Spacer(1, 4),
                  Paragraph(clean(name), ParagraphStyle('ptx', parent=S['part_title'], fontName=head_font(name))),
                  Rule(width=1.6 * inch, color=ACCENT, thickness=2), Spacer(1, 8)]
        for a in p['articles']:
            story.append(Paragraph(clean(a['title']), S['part_item']))
            if a['summary']:
                story.append(Paragraph(clean(a['summary']), S['part_item_sub']))
        story.append(PageBreak())
        for a in p['articles']:
            story += [Marker(1, a['title'], f"a-{a['slug']}"),
                      Paragraph(clean(name.upper()), S['kicker']),
                      Paragraph(clean(a['title']), ParagraphStyle('tx', parent=S['title'], fontName=head_font(a['title'])))]
            if a['summary']:
                story += [summary_box(a['summary'], width), Spacer(1, 6)]
            story += blocks_to_flowables(a['blocks'])
            story.append(PageBreak())

    doc.multiBuild(story)
    if missing:
        print('WARNING: characters missing from the body font:', ''.join(sorted(missing)))
    print(f'[guide] wrote {out}')


if __name__ == '__main__':
    main()
