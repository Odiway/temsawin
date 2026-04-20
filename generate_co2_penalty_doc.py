# -*- coding: utf-8 -*-
"""
CO₂ Filo Hesaplama & Ceza Hesaplama — Matematiksel Dokümantasyon PDF
EU 2019/1242 ve EU 2017/2400 regülasyonlarına dayalı
"""
import os, math
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Fonts ──
pdfmetrics.registerFont(TTFont("Calibri", "C:/Windows/Fonts/calibri.ttf"))
pdfmetrics.registerFont(TTFont("Calibri-Bold", "C:/Windows/Fonts/calibrib.ttf"))
pdfmetrics.registerFont(TTFont("Calibri-Italic", "C:/Windows/Fonts/calibrii.ttf"))
pdfmetrics.registerFont(TTFont("Calibri-BoldItalic", "C:/Windows/Fonts/calibriz.ttf"))
pdfmetrics.registerFontFamily("Calibri", normal="Calibri", bold="Calibri-Bold",
                              italic="Calibri-Italic", boldItalic="Calibri-BoldItalic")

# ── Colors ──
DARK = HexColor("#0f172a")
DARK2 = HexColor("#1e293b")
BLUE = HexColor("#2563eb")
BLUE_DARK = HexColor("#1e40af")
RED = HexColor("#E30613")
GRAY = HexColor("#64748b")
GRAY_LIGHT = HexColor("#94a3b8")
WHITE = HexColor("#ffffff")
LIGHT_BG = HexColor("#f1f5f9")
TBL_HDR = HexColor("#1e293b")
TBL_ALT = HexColor("#f8fafc")
TBL_BORDER = HexColor("#e2e8f0")
GREEN = HexColor("#059669")
AMBER = HexColor("#d97706")

W, H = A4
LM = 22 * mm
RM = 22 * mm
CW = W - LM - RM  # content width

# ── Cell Styles ──
CELL = ParagraphStyle("c", fontName="Calibri", fontSize=8, leading=11, textColor=DARK, wordWrap='CJK')
CELL_B = ParagraphStyle("cb", fontName="Calibri-Bold", fontSize=8, leading=11, textColor=DARK, wordWrap='CJK')
CELL_H = ParagraphStyle("ch", fontName="Calibri-Bold", fontSize=8, leading=11, textColor=WHITE, wordWrap='CJK')

def C(t): return Paragraph(str(t), CELL)
def CB(t): return Paragraph(str(t), CELL_B)
def CH(t): return Paragraph(str(t), CELL_H)

# ── Page Styles ──
def get_styles():
    s = {}
    s["title"] = ParagraphStyle("title", fontName="Calibri-Bold", fontSize=24, leading=30, textColor=WHITE)
    s["sub"] = ParagraphStyle("sub", fontName="Calibri", fontSize=13, leading=18, textColor=HexColor("#cbd5e1"))
    s["meta"] = ParagraphStyle("meta", fontName="Calibri", fontSize=10, leading=15, textColor=GRAY_LIGHT)
    s["h1"] = ParagraphStyle("h1", fontName="Calibri-Bold", fontSize=18, leading=24, textColor=DARK, spaceBefore=8*mm, spaceAfter=4*mm)
    s["h2"] = ParagraphStyle("h2", fontName="Calibri-Bold", fontSize=13, leading=18, textColor=BLUE, spaceBefore=6*mm, spaceAfter=3*mm)
    s["h3"] = ParagraphStyle("h3", fontName="Calibri-Bold", fontSize=11, leading=15, textColor=DARK2, spaceBefore=4*mm, spaceAfter=2*mm)
    s["body"] = ParagraphStyle("body", fontName="Calibri", fontSize=9.5, leading=14, textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=2*mm)
    s["body_b"] = ParagraphStyle("body_b", fontName="Calibri-Bold", fontSize=9.5, leading=14, textColor=DARK, spaceAfter=2*mm)
    s["bullet"] = ParagraphStyle("bullet", fontName="Calibri", fontSize=9.5, leading=14, textColor=DARK, leftIndent=12*mm, bulletIndent=6*mm, spaceAfter=1.5*mm)
    s["formula"] = ParagraphStyle("formula", fontName="Calibri-Bold", fontSize=10.5, leading=16, textColor=BLUE_DARK, leftIndent=8*mm, spaceBefore=2*mm, spaceAfter=2*mm, backColor=HexColor("#eff6ff"), borderPadding=4)
    s["formula_note"] = ParagraphStyle("fnote", fontName="Calibri-Italic", fontSize=8.5, leading=12, textColor=GRAY, leftIndent=8*mm, spaceAfter=1.5*mm)
    s["small"] = ParagraphStyle("small", fontName="Calibri", fontSize=8, leading=11, textColor=GRAY)
    s["ref"] = ParagraphStyle("ref", fontName="Calibri-Italic", fontSize=8, leading=12, textColor=GRAY, leftIndent=4*mm, spaceAfter=1*mm)
    return s

S = get_styles()

def p(text, style="body"): return Paragraph(text, S[style])
def b(text): return Paragraph(f"\u2022 {text}", S["bullet"])
def sp(h=3): return Spacer(1, h*mm)
def f(text): return Paragraph(text, S["formula"])
def fn(text): return Paragraph(text, S["formula_note"])
def hr(): return HRFlowable(width="100%", thickness=0.5, color=TBL_BORDER, spaceAfter=4*mm, spaceBefore=2*mm)

def make_table(headers, rows, col_widths=None):
    hdr = [CH(h) for h in headers]
    body = [[C(c) for c in row] for row in rows]
    data = [hdr] + body
    if not col_widths:
        col_widths = [CW / len(headers)] * len(headers)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TBL_HDR),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, TBL_BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TBL_ALT]),
    ]))
    return t

def cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, H - 120*mm, W, 120*mm, fill=1, stroke=0)
    canvas.setStrokeColor(RED)
    canvas.setLineWidth(4)
    canvas.line(LM, H - 122*mm, W - RM, H - 122*mm)
    canvas.restoreState()

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(RED)
    canvas.setLineWidth(2)
    canvas.line(LM, H - 12*mm, W - RM, H - 12*mm)
    canvas.setFont("Calibri-Bold", 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(LM, H - 10*mm, "CO\u2082 Filo & Ceza Hesaplama \u2014 Matematiksel Dok\u00fcmantasyon")
    canvas.drawRightString(W - RM, H - 10*mm, "G\u0130ZL\u0130 \u2014 TEMSA \u015eirket \u0130\u00e7i")
    canvas.setStrokeColor(TBL_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(LM, 14*mm, W - RM, 14*mm)
    canvas.setFont("Calibri", 7)
    canvas.setFillColor(GRAY_LIGHT)
    canvas.drawString(LM, 9*mm, f"Olu\u015fturma: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    canvas.drawRightString(W - RM, 9*mm, f"Sayfa {doc.page}")
    canvas.restoreState()

# ═══════════════════════════════════════════════════════
# SECTIONS
# ═══════════════════════════════════════════════════════
def build_cover(story):
    story.append(Spacer(1, 35*mm))
    story.append(p("CO\u2082 Filo Ortalamas\u0131 &<br/>Ceza Hesaplama<br/>Matematiksel Dok\u00fcmantasyon", "title"))
    story.append(sp(6))
    story.append(p("EU Regulation 2019/1242 \u2014 A\u011f\u0131r Hizmet Ara\u00e7lar\u0131 CO\u2082 Standartlar\u0131<br/>"
                    "EU Regulation 2017/2400 \u2014 VECTO Sim\u00fclasyon Metodolojisi<br/>"
                    "EU Regulation 2018/956 \u2014 CO\u2082 \u0130zleme ve Raporlama", "sub"))
    story.append(sp(8))
    meta = [
        ["Haz\u0131rlayan", "TEMSA Ar-Ge Dijital M\u00fchendislik"],
        ["Versiyon", "1.0"],
        ["Tarih", datetime.now().strftime("%d.%m.%Y")],
        ["Gizlilik", "\u015eirket \u0130\u00e7i \u2014 AB Reg\u00fclasyon Uyumluluk Dok\u00fcman\u0131"],
    ]
    for k, v in meta:
        story.append(p(f"<b>{k}:</b> {v}", "meta"))
    story.append(PageBreak())


def build_toc(story):
    story.append(p("\u0130\u00e7indekiler", "h1"))
    story.append(hr())
    toc_items = [
        "1. Giri\u015f ve Reg\u00fclasyon \u00c7er\u00e7evesi",
        "2. VECTO Metodolojisi \u2014 Bireysel Ara\u00e7 CO\u2082 Hesaplama",
        "3. BSFC Haritas\u0131 ve Motor Verimlilik Analizi",
        "4. Yak\u0131t T\u00fcketimi D\u00fczeltme Fakt\u00f6rleri",
        "5. Seyir \u00c7evrimi Bazl\u0131 CO\u2082 Hesaplama",
        "6. A\u011f\u0131rl\u0131kl\u0131 Ortalama CO\u2082 (Ara\u00e7 Baz\u0131nda)",
        "7. Filo CO\u2082 Ortalamas\u0131 Hesaplama",
        "8. Alt Grup ve Misyon Bazl\u0131 Filo Analizi",
        "9. AB 2019/1242 \u2014 Filo Hedef De\u011feri Hesaplama",
        "10. A\u015f\u0131m Emisyon Primi (Ceza) Hesaplama",
        "11. ZLEV D\u00fczeltme Fakt\u00f6r\u00fc",
        "12. Saysal \u00d6rnek: Tam Hesaplama",
        "13. Do\u011frulama ve Kan\u0131t",
        "14. Referanslar",
    ]
    toc_style = ParagraphStyle("toc_item", fontName="Calibri", fontSize=10.5, leading=20, textColor=DARK, leftIndent=4*mm)
    for item in toc_items:
        story.append(Paragraph(item, toc_style))
    story.append(PageBreak())


def build_section_1(story):
    story.append(p("1. Giri\u015f ve Reg\u00fclasyon \u00c7er\u00e7evesi", "h1"))
    story.append(hr())

    story.append(p(
        "Bu dok\u00fcman, TEMSA Digital Twin platformundaki CO\u2082 filo ortalamas\u0131 ve ceza (a\u015f\u0131m emisyon primi) "
        "hesaplamalar\u0131n\u0131n matematiksel temellerini a\u00e7\u0131klar. T\u00fcm form\u00fcller Avrupa Birli\u011fi "
        "reg\u00fclasyonlar\u0131na dayanmaktad\u0131r."
    ))

    story.append(p("1.1 Yasal \u00c7er\u00e7eve", "h2"))
    regs = [
        ["Reg\u00fclasyon", "Konu", "Y\u00fcr\u00fcrl\u00fck"],
        ["EU 2019/1242", "A\u011f\u0131r hizmet ara\u00e7lar\u0131 CO\u2082 performans standartlar\u0131", "2019 \u2192 hedefler 2025+"],
        ["EU 2017/2400", "VECTO sim\u00fclasyon arac\u0131 \u2014 CO\u2082 ve yak\u0131t t\u00fcketimi belirleme", "2017"],
        ["EU 2018/956", "CO\u2082 izleme ve raporlama y\u00fck\u00fcml\u00fcl\u00fcleri", "2018"],
        ["EU 2019/318", "VECTO sim\u00fclasyon arac\u0131 g\u00fcncelleme (2. nesil)", "2019"],
        ["EN 590", "Dizel yak\u0131t standard\u0131 \u2014 emisyon fakt\u00f6r\u00fc kayna\u011f\u0131", "S\u00fcrekli"],
    ]
    story.append(make_table(regs[0], regs[1:], [28*mm, CW-28*mm-28*mm, 28*mm]))
    story.append(sp(3))

    story.append(p("1.2 Kapsam", "h2"))
    story.append(p(
        "EU 2019/1242, Madde 2'ye g\u00f6re kapsam: <b>M3 kategorisi</b> (yolcu ta\u015f\u0131mac\u0131l\u0131\u011f\u0131 \u2014 "
        "8'den fazla yolcu koltu\u011fu, 5 tonun \u00fczeri azami k\u00fctle) otob\u00fcsler ve midib\u00fcsler. "
        "TEMSA'n\u0131n t\u00fcm \u00fcr\u00fcn yelpazesi bu kategoriye girmektedir."
    ))
    story.append(b("<b>Alt Gruplar (Subgroup):</b> P31SD (tek katl\u0131 \u015fehir otob\u00fcs\u00fc), P31DD (\u00e7ift katl\u0131), P32SD (tek katl\u0131 \u015fehirler aras\u0131), P32DD (\u00e7ift katl\u0131 \u015fehirler aras\u0131)"))
    story.append(b("<b>Misyonlar:</b> HeavyUrban, Urban, Suburban, Interurban, Coach"))
    story.append(b("<b>Y\u00fckleme Seviyeleri:</b> LowLoading, ReferenceLoad, FullLoad"))

    story.append(p("1.3 Hesaplama Zinciri", "h2"))
    story.append(p(
        "Toplam hesaplama s\u00fcreci a\u015fa\u011f\u0131daki ad\u0131mlardan olu\u015fur:"
    ))
    chain = [
        ["Ad\u0131m", "\u0130\u015flem", "Girdi", "\u00c7\u0131kt\u0131"],
        ["1", "BSFC haritas\u0131 hesaplama", "Yak\u0131t haritas\u0131 (RPM, tork, FC)", "BSFC (g/kWh)"],
        ["2", "\u00c7evrim bazl\u0131 FC hesaplama", "BSFC + \u00e7evrim parametreleri", "FC (g/km)"],
        ["3", "D\u00fczeltme fakt\u00f6rleri uygulama", "FC + WHTC, BF, CF", "FC_corrected (g/km)"],
        ["4", "CO\u2082'ye d\u00f6n\u00fc\u015ft\u00fcrme", "FC_corrected × EF", "CO\u2082 (g/km)"],
        ["5", "A\u011f\u0131rl\u0131kl\u0131 ortalama", "CO\u2082 \u00e7evrimler", "CO\u2082_weighted (g/km)"],
        ["6", "Filo ortalamas\u0131", "CO\u2082_v × N_v", "CO\u2082_fleet (g/km)"],
        ["7", "Hedef hesaplama", "Referans + azalt\u0131m oranlar\u0131", "CO\u2082_target (g/km)"],
        ["8", "Ceza (a\u015f\u0131m primi)", "CO\u2082_fleet \u2212 CO\u2082_target", "E\u20ac / ara\u00e7"],
    ]
    story.append(make_table(chain[0], chain[1:], [10*mm, 32*mm, 42*mm, CW-84*mm]))
    story.append(PageBreak())


def build_section_2(story):
    story.append(p("2. VECTO Metodolojisi \u2014 Bireysel Ara\u00e7 CO\u2082", "h1"))
    story.append(hr())

    story.append(p(
        "EU 2017/2400 reg\u00fclasyonuna g\u00f6re, her arac\u0131n CO\u2082 emisyonu VECTO (Vehicle Energy Consumption "
        "Calculation Tool) sim\u00fclasyon arac\u0131 kullan\u0131larak belirlenir. Temel form\u00fcl:"
    ))

    story.append(f("CO\u2082 [g/km] = FC<sub>corrected</sub> [g/km] \u00d7 EF<sub>diesel</sub>"))
    story.append(fn("Kaynak: EU 2017/2400, Annex III, Madde 3.2"))

    story.append(p("Burada:"))
    story.append(b("<b>FC<sub>corrected</sub></b> \u2014 D\u00fczeltilmi\u015f yak\u0131t t\u00fcketimi (g/km)"))
    story.append(b("<b>EF<sub>diesel</sub></b> \u2014 Dizel emisyon fakt\u00f6r\u00fc = <b>3.169</b> g CO\u2082 / g yak\u0131t"))
    story.append(sp(2))

    story.append(p("2.1 Emisyon Fakt\u00f6r\u00fc Gerek\u00e7esi", "h2"))
    story.append(p(
        "EF = 3.169 de\u011feri EN 590 Avrupa dizel yak\u0131t standard\u0131ndan gelir. Dizel yak\u0131t\u0131n "
        "yakla\u015f\u0131k kimyasal form\u00fcl\u00fc C<sub>12</sub>H<sub>23</sub> olup:"
    ))
    story.append(f("C<sub>12</sub>H<sub>23</sub> + 17.75 O\u2082 \u2192 12 CO\u2082 + 11.5 H\u2082O"))
    story.append(fn("Mol k\u00fctleleri: C\u2081\u2082H\u2082\u2083 = 167 g/mol, 12\u00d7CO\u2082 = 12\u00d744 = 528 g/mol"))

    story.append(f("EF = 528 / 167 = 3.162 \u2248 3.169 (EN 590 resmi de\u011fer)"))
    story.append(fn(
        "Fark, dizel yak\u0131t\u0131n saf C\u2081\u2082H\u2082\u2083 olmay\u0131p C\u2081\u2080\u2013C\u2081\u2085 hidrokarbonlar\u0131n "
        "kar\u0131\u015f\u0131m\u0131 olmas\u0131ndan kaynaklan\u0131r. 3.169, EN 590 ref. de\u011feridir."
    ))

    story.append(p("2.2 D\u00fczeltilmi\u015f Yak\u0131t T\u00fcketimi", "h2"))
    story.append(f("FC<sub>corrected</sub> = FC<sub>base</sub> \u00d7 WHTC<sub>cycle</sub> \u00d7 BF<sub>ColdHot</sub> \u00d7 CF<sub>RegPer</sub> \u00d7 CF<sub>NCV</sub>"))
    story.append(fn("Kaynak: EU 2017/2400, Annex III, Madde 5.1"))
    story.append(p(
        "Her alt \u00e7arp\u0131m bir fiziksel d\u00fczeltme kayna\u011f\u0131n\u0131 temsil eder ve sonraki b\u00f6l\u00fcmlerde "
        "detayl\u0131 a\u00e7\u0131klanacakt\u0131r."
    ))
    story.append(PageBreak())


def build_section_3(story):
    story.append(p("3. BSFC Haritas\u0131 ve Motor Verimlilik Analizi", "h1"))
    story.append(hr())

    story.append(p(
        "BSFC (Brake-Specific Fuel Consumption), motorun her \u00e7al\u0131\u015fma noktas\u0131ndaki birim g\u00fc\u00e7 "
        "ba\u015f\u0131na yak\u0131t t\u00fcketimini g\u00f6sterir. VECTO, motor \u00fcreticisinin sa\u011flad\u0131\u011f\u0131 yak\u0131t "
        "haritas\u0131ndan BSFC'yi hesaplar."
    ))

    story.append(p("3.1 Mekanik G\u00fc\u00e7 Hesab\u0131", "h2"))
    story.append(f("P [kW] = (RPM \u00d7 T [Nm] \u00d7 \u03c0) / 30000"))
    story.append(fn("Kaynak: Temel fizik \u2014 d\u00f6nme g\u00fcc\u00fc form\u00fcl\u00fc. \u03c9 = 2\u03c0n/60, P = T\u00d7\u03c9"))

    story.append(p("<b>T\u00fcretme:</b>"))
    story.append(b("\u03c9 (a\u00e7\u0131sal h\u0131z) = 2\u03c0 \u00d7 RPM / 60 [rad/s]"))
    story.append(b("P = T \u00d7 \u03c9 = T \u00d7 2\u03c0 \u00d7 RPM / 60 [W]"))
    story.append(b("P [kW] = T \u00d7 2\u03c0 \u00d7 RPM / (60 \u00d7 1000) = T \u00d7 RPM \u00d7 \u03c0 / 30000"))

    story.append(p("3.2 BSFC Hesab\u0131", "h2"))
    story.append(f("BSFC [g/kWh] = FC [g/h] / P [kW]"))
    story.append(fn("Kaynak: ISO 3046, DIN 1940 \u2014 Motor performans standartlar\u0131"))
    story.append(p(
        "BSFC, motorun verimlilik haritas\u0131n\u0131 olu\u015fturur. D\u00fc\u015f\u00fck BSFC de\u011ferleri y\u00fcksek "
        "verimi, y\u00fcksek BSFC de\u011ferleri d\u00fc\u015f\u00fck verimi g\u00f6sterir. Tipik dizel motor BSFC aral\u0131\u011f\u0131: "
        "<b>195\u2013260 g/kWh</b>."
    ))

    story.append(p("3.3 \u00c7al\u0131\u015fma Noktas\u0131 Se\u00e7imi", "h2"))
    bsfc_table = [
        ["\u00c7evrim", "BSFC Percentil", "Gerek\u00e7e"],
        ["Urban", "P75 (en y\u00fcksek)", "\u015eehir i\u00e7i: S\u0131k dur-kalk, d\u00fc\u015f\u00fck verim b\u00f6lgesi"],
        ["Rural", "Ortalama", "Karma \u015fartlar: Orta verim b\u00f6lgesi"],
        ["Motorway", "P25 (en d\u00fc\u015f\u00fck)", "Otoyol: Sabit h\u0131z, optimum verim b\u00f6lgesi"],
    ]
    story.append(make_table(bsfc_table[0], bsfc_table[1:], [25*mm, 30*mm, CW-55*mm]))
    story.append(fn(
        "P25 = alt \u00e7eyrek = en verimli %25'lik dilim, P75 = \u00fcst \u00e7eyrek = en verimsiz %25'lik dilim"
    ))
    story.append(PageBreak())


def build_section_4(story):
    story.append(p("4. Yak\u0131t T\u00fcketimi D\u00fczeltme Fakt\u00f6rleri", "h1"))
    story.append(hr())
    story.append(p(
        "EU 2017/2400, Annex III'e g\u00f6re d\u00f6rt d\u00fczeltme fakt\u00f6r\u00fc uygulan\u0131r. "
        "Her biri, VECTO sim\u00fclasyonunun laboratuvar ko\u015fullar\u0131ndan ger\u00e7ek d\u00fcnya ko\u015fullar\u0131na "
        "yakla\u015ft\u0131r\u0131lmas\u0131n\u0131 sa\u011flar."
    ))

    factors = [
        ["Fakt\u00f6r", "Sembol", "Varsay\u0131lan", "Kaynak", "Fiziksel Anlam"],
        ["WHTC Urban", "WHTC_u", "1.08", "EU 2017/2400 Annex III", "\u015eehir i\u00e7i ge\u00e7ici y\u00fck d\u00fczeltmesi (+%8)"],
        ["WHTC Rural", "WHTC_r", "1.01", "EU 2017/2400 Annex III", "K\u0131rsal ge\u00e7ici y\u00fck d\u00fczeltmesi (+%1)"],
        ["WHTC Motorway", "WHTC_m", "1.00", "EU 2017/2400 Annex III", "Otoyol \u2014 d\u00fczeltme gerekmez"],
        ["Souk/S\u0131cak", "BF_ColdHot", "1.005", "EU 2017/2400 Madde 5.3", "So\u011fuk \u00e7al\u0131\u015ft\u0131rma etkisi (+%0.5)"],
        ["Periyodik", "CF_RegPer", "1.0", "EU 2017/2400 Madde 5.4", "Reg\u00fclasyon periyodik d\u00fczeltme"],
        ["NCV", "CF_NCV", "0.994", "EU 2017/2400 Madde 5.5", "Net kalorifik de\u011fer d\u00fczeltmesi (\u2212%0.6)"],
    ]
    story.append(make_table(factors[0], factors[1:], [22*mm, 18*mm, 16*mm, 35*mm, CW-91*mm]))

    story.append(p("4.1 WHTC D\u00fczeltme Fakt\u00f6r\u00fc Detay\u0131", "h2"))
    story.append(p(
        "WHTC (World Harmonized Transient Cycle), motorun ge\u00e7ici y\u00fck ko\u015fullar\u0131ndaki "
        "yak\u0131t t\u00fcketimi art\u0131\u015f\u0131n\u0131 modellemek i\u00e7in kullan\u0131l\u0131r. "
        "\u015eehir i\u00e7i s\u00fcr\u00fc\u015fte s\u0131k h\u0131zlanma/yava\u015flama nedeniyle motor daha fazla ge\u00e7ici "
        "y\u00fck alt\u0131nda \u00e7al\u0131\u015f\u0131r ve bu da WHTC_urban = 1.08 ile yans\u0131t\u0131l\u0131r."
    ))
    story.append(f("FC<sub>transient</sub> = FC<sub>steady-state</sub> \u00d7 WHTC<sub>cycle</sub>"))
    story.append(fn("WHTC > 1 ise ge\u00e7ici y\u00fck yak\u0131t t\u00fcketimini art\u0131r\u0131r, = 1 ise etkisi yok"))

    story.append(p("4.2 Toplam D\u00fczeltme \u00c7arpan\u0131", "h2"))
    story.append(p("T\u00fcm fakt\u00f6rlerin \u00e7arp\u0131sal etkisi:"))
    story.append(f("Toplam D\u00fczeltme (Urban) = 1.08 \u00d7 1.005 \u00d7 1.0 \u00d7 0.994 = 1.0785"))
    story.append(f("Toplam D\u00fczeltme (Rural) = 1.01 \u00d7 1.005 \u00d7 1.0 \u00d7 0.994 = 1.0089"))
    story.append(f("Toplam D\u00fczeltme (Motorway) = 1.00 \u00d7 1.005 \u00d7 1.0 \u00d7 0.994 = 0.9990"))
    story.append(fn("Motorway d\u00fczeltmesi < 1 \u2014 NCV d\u00fczeltmesi, WHTC ve BF'nin etkisini a\u015far"))
    story.append(PageBreak())


def build_section_5(story):
    story.append(p("5. Seyir \u00c7evrimi Bazl\u0131 CO\u2082 Hesaplama", "h1"))
    story.append(hr())

    story.append(p(
        "VECTO, M3 kategorisi otob\u00fcsler i\u00e7in \u00fc\u00e7 standart seyir \u00e7evrimi tan\u0131mlar. "
        "Her \u00e7evrim farkl\u0131 h\u0131z profili ve g\u00fc\u00e7 talebi ile karakterize edilir."
    ))

    story.append(p("5.1 \u00c7evrim Parametreleri", "h2"))
    cycles_data = [
        ["\u00c7evrim", "Ort. H\u0131z (km/h)", "G\u00fc\u00e7 Fraksiyonu", "A\u00e7\u0131klama"],
        ["Urban", "18", "%35", "\u015eehir i\u00e7i: Dur-kalk, d\u00fc\u015f\u00fck h\u0131z"],
        ["Rural", "45", "%45", "K\u0131rsal: Orta h\u0131z, karma trafik"],
        ["Motorway", "70", "%55", "Otoyol: Y\u00fcksek h\u0131z, sabit s\u00fcr\u00fc\u015f"],
    ]
    story.append(make_table(cycles_data[0], cycles_data[1:], [22*mm, 28*mm, 25*mm, CW-75*mm]))

    story.append(p("5.2 Hesaplama Ad\u0131mlar\u0131 (Her \u00c7evrim \u0130\u00e7in)", "h2"))
    story.append(p("<b>Ad\u0131m 1:</b> Ortalama g\u00fc\u00e7 talebi"))
    story.append(f("P<sub>avg</sub> = P<sub>rated</sub> \u00d7 f<sub>power</sub>"))
    story.append(fn("P_rated: Motor nominal g\u00fcc\u00fc (kW), f_power: \u00e7evrim g\u00fc\u00e7 fraksiyonu"))

    story.append(p("<b>Ad\u0131m 2:</b> Saatlik yak\u0131t t\u00fcketimi"))
    story.append(f("FC [g/h] = BSFC [g/kWh] \u00d7 P<sub>avg</sub> [kW]"))

    story.append(p("<b>Ad\u0131m 3:</b> Kilometre ba\u015f\u0131na yak\u0131t t\u00fcketimi"))
    story.append(f("FC [g/km] = FC [g/h] / v<sub>avg</sub> [km/h]"))
    story.append(fn("v_avg: \u00c7evrimin ortalama h\u0131z\u0131"))

    story.append(p("<b>Ad\u0131m 4:</b> D\u00fczeltilmi\u015f yak\u0131t t\u00fcketimi"))
    story.append(f("FC<sub>corrected</sub> = FC [g/km] \u00d7 WHTC \u00d7 BF \u00d7 CF_r \u00d7 CF_n"))

    story.append(p("<b>Ad\u0131m 5:</b> CO\u2082 emisyonu"))
    story.append(f("CO\u2082 [g/km] = FC<sub>corrected</sub> \u00d7 3.169"))

    story.append(p("<b>Ad\u0131m 6:</b> Yak\u0131t t\u00fcketimi (L/100km)"))
    story.append(f("FC [L/100km] = (FC<sub>corrected</sub> \u00d7 100) / (\u03c1<sub>diesel</sub> \u00d7 1000)"))
    story.append(fn("\u03c1_diesel = 0.832 kg/L (EN 590)"))
    story.append(PageBreak())


def build_section_6(story):
    story.append(p("6. A\u011f\u0131rl\u0131kl\u0131 Ortalama CO\u2082 (Ara\u00e7 Baz\u0131nda)", "h1"))
    story.append(hr())

    story.append(p(
        "Bir arac\u0131n toplam CO\u2082 de\u011feri, \u00fc\u00e7 \u00e7evrimin a\u011f\u0131rl\u0131kl\u0131 ortalamas\u0131d\u0131r. "
        "A\u011f\u0131rl\u0131k katsay\u0131lar\u0131 VECTO standartlar\u0131na g\u00f6re belirlenir."
    ))

    story.append(f("CO\u2082<sub>weighted</sub> = w<sub>u</sub> \u00d7 CO\u2082<sub>urban</sub> + w<sub>r</sub> \u00d7 CO\u2082<sub>rural</sub> + w<sub>m</sub> \u00d7 CO\u2082<sub>motorway</sub>"))
    story.append(fn("Kaynak: EU 2017/2400, Annex IV \u2014 Mission profile weighting"))

    story.append(p("6.1 A\u011f\u0131rl\u0131k Katsay\u0131lar\u0131", "h2"))
    weights_data = [
        ["Parametre", "Sembol", "De\u011fer", "Gerek\u00e7e"],
        ["Urban a\u011f\u0131rl\u0131k", "w_u", "0.35", "\u015eehir i\u00e7i kullan\u0131m oran\u0131 (%35)"],
        ["Rural a\u011f\u0131rl\u0131k", "w_r", "0.35", "K\u0131rsal kullan\u0131m oran\u0131 (%35)"],
        ["Motorway a\u011f\u0131rl\u0131k", "w_m", "0.30", "Otoyol kullan\u0131m oran\u0131 (%30)"],
        ["Toplam", "\u03a3", "1.00", "Normalize \u2014 toplamlar\u0131 1"],
    ]
    story.append(make_table(weights_data[0], weights_data[1:], [26*mm, 16*mm, 16*mm, CW-58*mm]))

    story.append(p("6.2 Formül Doğrulaması", "h2"))
    story.append(p(
        "Ağırlık katsayılarının toplamının 1'e eşit olması, "
        "sonucun fiziksel olarak anlamlı bir CO₂ değeri (g/km) olarak kalmasını garanti eder:"
    ))
    story.append(f("w<sub>u</sub> + w<sub>r</sub> + w<sub>m</sub> = 0.35 + 0.35 + 0.30 = 1.00 ✓"))
    story.append(PageBreak())


def build_section_7(story):
    story.append(p("7. Filo CO\u2082 Ortalamas\u0131 Hesaplama", "h1"))
    story.append(hr())
    story.append(p(
        "EU 2019/1242, Madde 4'e g\u00f6re filo CO\u2082 ortalamas\u0131, her varyant\u0131n (\u00fcretilen/sat\u0131lan "
        "ara\u00e7 konfigurasyonu) CO\u2082 de\u011ferinin, o varyanttaki ara\u00e7 say\u0131s\u0131 ile "
        "a\u011f\u0131rl\u0131kland\u0131r\u0131lmas\u0131yla hesaplan\u0131r."
    ))

    story.append(p("7.1 Temel Form\u00fcl", "h2"))
    story.append(f("CO\u2082<sub>fleet</sub> = \u03a3(N<sub>v</sub> \u00d7 CO\u2082<sub>v</sub>) / \u03a3(N<sub>v</sub>)"))
    story.append(fn("Kaynak: EU 2019/1242, Madde 4, \u00a7 1 \u2014 Manufacturer's average specific CO\u2082 emissions"))

    story.append(p("Burada:"))
    story.append(b("<b>N<sub>v</sub></b> \u2014 v varyant\u0131ndaki toplam ara\u00e7 say\u0131s\u0131 (fleet_count)"))
    story.append(b("<b>CO\u2082<sub>v</sub></b> \u2014 v varyant\u0131n\u0131n VECTO sertifika CO\u2082 de\u011feri (g/km)"))
    story.append(b("<b>\u03a3(N<sub>v</sub>)</b> \u2014 Filodaki toplam ara\u00e7 say\u0131s\u0131"))

    story.append(p("7.2 Matematiksel Gerek\u00e7e", "h2"))
    story.append(p(
        "Bu form\u00fcl, a\u011f\u0131rl\u0131kl\u0131 aritmetik ortalaman\u0131n standart tan\u0131m\u0131d\u0131r. "
        "Her arac\u0131n CO\u2082 emisyonunu e\u015fit \u015fekilde de\u011fil, filodaki say\u0131s\u0131na oranla hesaba katar:"
    ))
    story.append(f("\u0100 = \u03a3(w<sub>i</sub> \u00d7 x<sub>i</sub>) / \u03a3(w<sub>i</sub>)     [A\u011f\u0131rl\u0131kl\u0131 Ortalama Tan\u0131m\u0131]"))
    story.append(fn("w_i = N_v (ağırlıklar = araç sayıları), x_i = CO₂_v (değerler = CO₂ emisyonları)"))

    story.append(p("7.3 Katk\u0131 Y\u00fczdesi", "h2"))
    story.append(f("Katk\u0131<sub>v</sub> (%) = (N<sub>v</sub> \u00d7 CO\u2082<sub>v</sub>) / \u03a3(N<sub>v</sub> \u00d7 CO\u2082<sub>v</sub>) \u00d7 100"))
    story.append(fn("Her varyant\u0131n toplam filo emisyonuna katk\u0131 oran\u0131"))
    story.append(PageBreak())


def build_section_8(story):
    story.append(p("8. Alt Grup ve Misyon Bazl\u0131 Filo Analizi", "h1"))
    story.append(hr())

    story.append(p(
        "EU 2019/1242, Annex I'e g\u00f6re filo hesaplamas\u0131 sadece toplam de\u011fil, "
        "ayn\u0131 zamanda alt grup (subgroup) ve misyon (mission profile) baz\u0131nda da yap\u0131l\u0131r."
    ))

    story.append(p("8.1 Alt Grup Bazl\u0131 Hesaplama", "h2"))
    story.append(f("CO\u2082<sub>fleet,sg</sub> = \u03a3(N<sub>v\u2208sg</sub> \u00d7 CO\u2082<sub>v,sg</sub>) / \u03a3(N<sub>v\u2208sg</sub>)"))
    story.append(fn("sg \u2208 {P31SD, P31DD, P32SD, P32DD} \u2014 her alt grup ayr\u0131 hesaplan\u0131r"))

    subgroups = [
        ["Alt Grup", "Tan\u0131m", "\u00d6rnek TEMSA Modelleri"],
        ["P31SD", "Tek katl\u0131 \u015fehir otob\u00fcs\u00fc (Class I/II)", "Avenue, Prestij"],
        ["P31DD", "\u00c7ift katl\u0131 \u015fehir otob\u00fcs\u00fc", "\u2014"],
        ["P32SD", "Tek katl\u0131 \u015fehirler aras\u0131 (Class III)", "Maraton, Safari, LD SB"],
        ["P32DD", "\u00c7ift katl\u0131 \u015fehirler aras\u0131", "\u2014"],
    ]
    story.append(make_table(subgroups[0], subgroups[1:], [20*mm, 48*mm, CW-68*mm]))

    story.append(p("8.2 Misyon Bazl\u0131 Hesaplama", "h2"))
    story.append(f("CO\u2082<sub>fleet,m</sub> = \u03a3(N<sub>v</sub> \u00d7 CO\u2082<sub>v,m</sub>) / \u03a3(N<sub>v</sub>)"))
    story.append(fn("m \u2208 {HeavyUrban, Urban, Suburban, Interurban, Coach}"))
    story.append(p(
        "Her misyon profili farkl\u0131 bir kullan\u0131m senaryosunu temsil eder. VECTO, her varyant i\u00e7in "
        "her misyon profilinde ayr\u0131 CO\u2082 de\u011feri hesaplar."
    ))

    story.append(p("8.3 Matris G\u00f6r\u00fcn\u00fcm\u00fc", "h2"))
    story.append(p(
        "Sonalar alt grup \u00d7 misyon \u00d7 y\u00fckleme matrisinde toplan\u0131r:"
    ))
    story.append(f("CO\u2082<sub>fleet</sub>(sg, m, l) = \u03a3(N \u00d7 CO\u2082) / \u03a3(N)     \u2200 (sg, m, l) \u2208 Matris"))
    story.append(fn("l \u2208 {LowLoading, ReferenceLoad} \u2014 y\u00fckleme seviyeleri"))
    story.append(PageBreak())


def build_section_9(story):
    story.append(p("9. AB 2019/1242 \u2014 Filo Hedef De\u011feri Hesaplama", "h1"))
    story.append(hr())

    story.append(p(
        "EU 2019/1242, a\u011f\u0131r hizmet ara\u00e7lar\u0131 i\u00e7in CO\u2082 azalt\u0131m hedefleri belirler. "
        "Her \u00fcretici i\u00e7in \"spesifik emisyon hedefi\" (specific emission target), referans d\u00f6nemine "
        "g\u00f6re hesaplan\u0131r."
    ))

    story.append(p("9.1 Referans De\u011feri", "h2"))
    story.append(p(
        "Referans CO\u2082 de\u011feri, 2019 y\u0131l\u0131 <b>raporlama d\u00f6nemi</b> verilerine dayanarak "
        "AB Komisyonu taraf\u0131ndan ara\u00e7 grubu baz\u0131nda belirlenir."
    ))
    story.append(f("CO\u2082<sub>ref,sg</sub> = 2019 y\u0131l\u0131 AB geneli filo ortalama CO\u2082 (alt grup baz\u0131nda)"))
    story.append(fn("Kaynak: EU 2019/1242, Madde 1 ve Annex I"))

    story.append(p("9.2 Azalt\u0131m Hedefleri", "h2"))
    targets = [
        ["D\u00f6nem", "Azalt\u0131m Oran\u0131", "Hedef Y\u0131l\u0131", "Yasal Dayanak"],
        ["2025\u20132029", "%15", "2025", "EU 2019/1242, Madde 1(a)"],
        ["2030\u20132034", "%30", "2030", "EU 2019/1242, Madde 1(b)"],
        ["2035\u20132039", "%45 (revize)", "2035", "EU 2024/1610 (g\u00fcncelleme)"],
        ["2040+", "%90 (revize)", "2040", "EU 2024/1610 (g\u00fcncelleme)"],
    ]
    story.append(make_table(targets[0], targets[1:], [22*mm, 22*mm, 18*mm, CW-62*mm]))

    story.append(p("9.3 Spesifik Emisyon Hedefi Form\u00fcl\u00fc", "h2"))
    story.append(f("T<sub>sg</sub> = CO\u2082<sub>ref,sg</sub> \u00d7 (1 \u2212 rf<sub>sg</sub>)"))
    story.append(fn("T_sg: Alt grup spesifik hedef, rf_sg: Azaltım yüzdesi (/100)"))

    story.append(p("<b>\u00d6rnek (2025 d\u00f6nemi):</b>"))
    story.append(f("T<sub>P31SD</sub> = CO\u2082<sub>ref,P31SD</sub> \u00d7 (1 \u2212 0.15) = CO\u2082<sub>ref,P31SD</sub> \u00d7 0.85"))
    story.append(fn("Referans de\u011ferinin %85'i hedef olarak belirlenir"))

    story.append(p("9.4 \u00dcretici Baz\u0131nda Filo Hedefi", "h2"))
    story.append(p(
        "Her \u00fcretici i\u00e7in toplam filo hedefi, \u00fcretti\u011fi ara\u00e7lar\u0131n alt grup da\u011f\u0131l\u0131m\u0131na "
        "g\u00f6re a\u011f\u0131rl\u0131kl\u0131 ortalama ile hesaplan\u0131r:"
    ))
    story.append(f("T<sub>manufacturer</sub> = \u03a3(N<sub>sg</sub> \u00d7 T<sub>sg</sub>) / \u03a3(N<sub>sg</sub>)"))
    story.append(fn("N_sg: İlgili alt gruptaki toplam araç sayısı"))
    story.append(PageBreak())


def build_section_10(story):
    story.append(p("10. A\u015f\u0131m Emisyon Primi (Ceza) Hesaplama", "h1"))
    story.append(hr())

    story.append(p(
        "EU 2019/1242, <b>Madde 8</b>'e g\u00f6re, filonun ortalama CO\u2082 emisyonu hedefiniaştığında "
        "\u00fcreticiye \"a\u015f\u0131m emisyon primi\" (excess emission premium) \u00f6detilir. "
        "Bu, AB'nin CO\u2082 azalt\u0131m politikas\u0131n\u0131n en kritik uygulama mekanizmas\u0131d\u0131r."
    ))

    story.append(p("10.1 A\u015f\u0131m Tespiti", "h2"))
    story.append(f("E<sub>excess</sub> = CO\u2082<sub>fleet</sub> \u2212 T<sub>manufacturer</sub>"))
    story.append(fn("E\u2093 < 0 ise a\u015f\u0131m yok (surplus), E\u2093 > 0 ise ceza uygulan\u0131r"))
    
    story.append(p("E\u011fer E<sub>excess</sub> > 0 ise:"))

    story.append(p("10.2 Ceza Form\u00fcl\u00fc", "h2"))
    story.append(f("Ceza [\u20ac] = E<sub>excess</sub> [g CO\u2082/tkm] \u00d7 Birim Ceza [\u20ac/(g CO\u2082/tkm)] \u00d7 N<sub>total</sub>"))
    story.append(fn("Kaynak: EU 2019/1242, Madde 8, \u00a7 2"))

    story.append(p("10.3 Birim Ceza Miktarlar\u0131", "h2"))
    penalties = [
        ["D\u00f6nem", "Birim Ceza", "A\u00e7\u0131klama"],
        ["2025\u20132029", "4.250 \u20ac / (g CO\u2082/tkm)", "\u0130lk d\u00f6nem cezas\u0131"],
        ["2030\u20132039", "4.250 \u20ac / (g CO\u2082/tkm)", "VECTO g/tkm baz\u0131nda sabit devam"],
        ["2040+", "6.800 \u20ac / (g CO\u2082/tkm) (taslak)", "Artan ceza (EU 2024/1610 revizyon)"],
    ]
    story.append(make_table(penalties[0], penalties[1:], [22*mm, 38*mm, CW-60*mm]))

    story.append(p("10.4 tkm (ton-kilometre) Birimi A\u00e7\u0131klamas\u0131", "h2"))
    story.append(p(
        "A\u011f\u0131r hizmet ara\u00e7lar\u0131nda emisyon, <b>g CO\u2082/tkm</b> (gram CO\u2082 ba\u015f\u0131na ton-kilometre) "
        "birimi ile \u00f6l\u00e7\u00fcl\u00fcr. Bu, ta\u015f\u0131nan y\u00fck\u00fc de hesaba katar:"
    ))
    story.append(f("CO\u2082 [g/tkm] = CO\u2082 [g/km] / Payload [ton]"))
    story.append(fn("Yolcu otob\u00fcsleri i\u00e7in: payload = (yolcu say\u0131s\u0131 \u00d7 yolcu k\u00fctlesi) / 1000"))
    story.append(p(
        "Regülasyon yolcu otobüsleri için <b>g CO₂/pkm</b> (yolcu-kilometre) birimini de "
        "kullanır. Her iki birim de VECTO çıktısında raporlanır."
    ))

    story.append(p("10.5 Toplam Ceza Hesaplama \u00d6rne\u011fi", "h2"))
    story.append(p("<b>Varsay\u0131m:</b> Filo = 200 ara\u00e7, CO\u2082_fleet = 850 g/km, T = 800 g/km, Ortalama payload = 8 ton"))
    story.append(sp(2))
    story.append(f("E<sub>excess</sub> = (850 \u2212 800) / 8 = 6.25 g CO\u2082/tkm"))
    story.append(f("Ceza = 6.25 \u00d7 4250 \u00d7 200 = 5.312.500 \u20ac"))
    story.append(fn("Yakla\u015f\u0131k 5.3 milyon \u20ac \u2014 Bu, reg\u00fclasyona uyumun kritikli\u011fini g\u00f6sterir"))
    story.append(PageBreak())


def build_section_11(story):
    story.append(p("11. ZLEV D\u00fczeltme Fakt\u00f6r\u00fc", "h1"))
    story.append(hr())

    story.append(p(
        "EU 2019/1242, Madde 5'e g\u00f6re s\u0131f\u0131r ve d\u00fc\u015f\u00fck emisyonlu ara\u00e7lar (ZLEV) "
        "i\u00e7in bir te\u015fvik mekanizmas\u0131 tan\u0131mlanm\u0131\u015ft\u0131r. ZLEV oran\u0131 hedefi a\u015fan \u00fcreticiler, "
        "CO\u2082 hedeflerinde esneklik kazan\u0131r."
    ))

    story.append(p("11.1 ZLEV Tan\u0131m\u0131", "h2"))
    story.append(p(
        "ZLEV: CO\u2082 emisyonu <b>0 ile 1 g CO\u2082/kWh</b> aras\u0131nda olan ara\u00e7lar "
        "(tam elektrikli, yak\u0131t h\u00fcreli veya plug-in hibrid)."
    ))

    story.append(p("11.2 ZLEV Fakt\u00f6r\u00fc Form\u00fcl\u00fc", "h2"))
    story.append(f("ZLEV<sub>factor</sub> = 1 \u2212 (share<sub>ZLEV</sub> \u2212 benchmark<sub>ZLEV</sub>) \u00d7 multiplier"))
    story.append(fn("Kaynak: EU 2019/1242, Madde 5, \u00a7 1"))

    zlev_data = [
        ["Parametre", "2025\u20132029", "2030+"],
        ["share_ZLEV", "Filodan ZLEV oran\u0131", "Filodan ZLEV oran\u0131"],
        ["benchmark_ZLEV", "%2", "%5 (revize)"],
        ["multiplier", "0.03", "Kald\u0131r\u0131lmas\u0131 \u00f6ng\u00f6r\u00fcl\u00fcyor"],
        ["Maks. esneklik", "%3", "%5"],
    ]
    story.append(make_table(zlev_data[0], zlev_data[1:], [28*mm, CW/2 - 14*mm, CW/2 - 14*mm]))

    story.append(p("11.3 D\u00fczeltilmi\u015f Hedef", "h2"))
    story.append(f("T<sub>adjusted</sub> = T<sub>base</sub> / ZLEV<sub>factor</sub>"))
    story.append(fn("ZLEV_factor < 1 ise hedef yükselir (esneklik), > 1 ise hedef düşer (penaltı)"))
    story.append(p(
        "<b>\u00d6rnek:</b> ZLEV oran\u0131 = %5, benchmark = %2 ise:"
    ))
    story.append(f("ZLEV<sub>factor</sub> = 1 \u2212 (0.05 \u2212 0.02) \u00d7 0.03 = 1 \u2212 0.0009 = 0.9991"))
    story.append(f("T<sub>adjusted</sub> = 800 / 0.9991 = 800.72 g/km (+0.72 g/km esneklik)"))
    story.append(fn("ZLEV esnekli\u011fi maks. %3 ile s\u0131n\u0131rland\u0131r\u0131lm\u0131\u015ft\u0131r"))
    story.append(PageBreak())


def build_section_12(story):
    story.append(p("12. Say\u0131sal \u00d6rnek: Tam Hesaplama", "h1"))
    story.append(hr())

    story.append(p("A\u015fa\u011f\u0131da, 3 varyanttan olu\u015fan bir TEMSA filosu i\u00e7in t\u00fcm ad\u0131mlar g\u00f6sterilmektedir."))

    story.append(p("12.1 Varyant Verileri", "h2"))
    variants = [
        ["Varyant", "Co\u2082 (g/km)", "FC (L/100km)", "Filo Adedi", "Alt Grup"],
        ["LD SB E6-300", "812", "38.2", "80", "P32SD"],
        ["Avenue EV", "0", "0", "30", "P31SD"],
        ["Prestij CI-250", "925", "43.5", "90", "P31SD"],
    ]
    story.append(make_table(variants[0], variants[1:], [28*mm, 22*mm, 24*mm, 18*mm, CW-92*mm]))

    story.append(p("12.2 Filo Ortalamas\u0131 Hesab\u0131", "h2"))
    story.append(f("\u03a3(N \u00d7 CO\u2082) = (80 \u00d7 812) + (30 \u00d7 0) + (90 \u00d7 925) = 64.960 + 0 + 83.250 = 148.210"))
    story.append(f("\u03a3(N) = 80 + 30 + 90 = 200"))
    story.append(f("CO\u2082<sub>fleet</sub> = 148.210 / 200 = 741.05 g/km"))

    story.append(p("12.3 Alt Grup Bazl\u0131", "h2"))
    story.append(f("CO\u2082<sub>P32SD</sub> = 64.960 / 80 = 812.00 g/km (sadece LD SB)"))
    story.append(f("CO\u2082<sub>P31SD</sub> = (0 + 83.250) / (30 + 90) = 83.250 / 120 = 693.75 g/km"))
    story.append(fn("P31SD ortalamas\u0131 EV sayesinde \u00f6nemli \u00f6l\u00e7\u00fcde d\u00fc\u015f\u00fck"))

    story.append(p("12.4 Hedef Hesab\u0131 (2025 D\u00f6nemi, %15 Azalt\u0131m)", "h2"))
    story.append(p("Varsay\u0131m: CO\u2082_ref,P32SD = 900, CO\u2082_ref,P31SD = 850"))
    story.append(f("T<sub>P32SD</sub> = 900 \u00d7 0.85 = 765.00 g/km"))
    story.append(f("T<sub>P31SD</sub> = 850 \u00d7 0.85 = 722.50 g/km"))
    story.append(f("T<sub>manufacturer</sub> = (80 \u00d7 765 + 120 \u00d7 722.5) / 200 = (61.200 + 86.700) / 200 = 739.50 g/km"))

    story.append(p("12.5 A\u015f\u0131m ve Ceza", "h2"))
    story.append(f("E<sub>excess</sub> = 741.05 \u2212 739.50 = 1.55 g/km"))
    story.append(p("Ortalama payload = 8 ton varsay\u0131m\u0131yla:"))
    story.append(f("E<sub>excess</sub> [g/tkm] = 1.55 / 8 = 0.194 g CO\u2082/tkm"))
    story.append(f("Ceza = 0.194 \u00d7 4250 \u00d7 200 = 164.900 \u20ac"))
    story.append(fn("Yakla\u015f\u0131k 165 bin \u20ac \u2014 EV oran\u0131n\u0131 art\u0131rmak bu cezay\u0131 s\u0131f\u0131rlayabilir"))

    story.append(p("12.6 ZLEV Etkisi Senaryosu", "h2"))
    story.append(p("E\u011fer EV say\u0131s\u0131 30'dan 40'a \u00e7\u0131kar\u0131lsa:"))
    story.append(f("CO\u2082<sub>fleet</sub> = (80\u00d7812 + 40\u00d70 + 90\u00d7925) / (80+40+90) = 148.210 / 210 = 705.76 g/km"))
    story.append(f("E<sub>excess</sub> = 705.76 \u2212 739.50 = \u221233.74 g/km (\u2192 SURPLUS, CEZA YOK)"))
    story.append(fn("10 ek EV ara\u00e7 ile filo hedefin alt\u0131na iner \u2014 CO\u2082 kredisi kazan\u0131l\u0131r"))
    story.append(PageBreak())


def build_section_13(story):
    story.append(p("13. Do\u011frulama ve Kan\u0131t", "h1"))
    story.append(hr())

    story.append(p(
        "Bu b\u00f6l\u00fcm, hesaplama y\u00f6nteminin reg\u00fclasyona uygunlu\u011funu ve matematiksel "
        "do\u011frulu\u011funu kan\u0131tlar."
    ))

    story.append(p("13.1 Boyut Analizi (Dimensional Analysis)", "h2"))
    story.append(p("<b>CO\u2082 hesaplama zinciri:</b>"))
    story.append(f("[g/kWh] \u00d7 [kW] = [g/h]"))
    story.append(f("[g/h] / [km/h] = [g/km]"))
    story.append(f("[g/km] \u00d7 [boyutsuz] \u00d7 [g CO\u2082/g yak\u0131t] = [g CO\u2082/km] \u2714"))
    story.append(fn("Boyutlar tutarl\u0131 \u2014 sonu\u00e7 birimi do\u011fru"))

    story.append(p("<b>Ceza hesaplama:</b>"))
    story.append(f("[g/km] / [ton] = [g/tkm]"))
    story.append(f("[g/tkm] \u00d7 [\u20ac/(g/tkm)] \u00d7 [ara\u00e7] = [\u20ac] \u2714"))

    story.append(p("13.2 S\u0131n\u0131r Ko\u015fullar\u0131 Do\u011frulamas\u0131", "h2"))
    checks = [
        ["Ko\u015ful", "Beklenen", "Sonu\u00e7"],
        ["T\u00fcm ara\u00e7lar EV ise", "CO\u2082_fleet = 0", "\u03a3(N\u00d70)/\u03a3(N) = 0 \u2714"],
        ["Tek varyant", "CO\u2082_fleet = CO\u2082_v", "\u03a3(N\u00d7x)/\u03a3(N) = x \u2714"],
        ["A\u011f\u0131rl\u0131klar toplam\u0131", "w_u+w_r+w_m = 1", "0.35+0.35+0.30 = 1.00 \u2714"],
        ["EF \u00d7 0 yak\u0131t", "CO\u2082 = 0", "0 \u00d7 3.169 = 0 \u2714"],
        ["Negatif a\u015f\u0131m", "Ceza = 0", "max(0, E_excess) = 0 \u2714"],
        ["D\u00fczeltme = 1", "FC_corr = FC_base", "FC \u00d7 1\u00d71\u00d71\u00d71 = FC \u2714"],
    ]
    story.append(make_table(checks[0], checks[1:], [32*mm, 36*mm, CW-68*mm]))

    story.append(p("13.3 Reg\u00fclasyon Uyumluluk Matrisi", "h2"))
    compliance = [
        ["Hesaplama", "Reg\u00fclasyon Maddesi", "Uygulama"],
        ["VECTO CO\u2082", "EU 2017/2400, Annex III", "co2_engine.py \u2714"],
        ["WHTC d\u00fczeltme", "EU 2017/2400, Madde 5.1", "4 fakt\u00f6r uygulan\u0131yor \u2714"],
        ["EF diesel", "EN 590 (3.169)", "Sabit olarak kullan\u0131l\u0131yor \u2714"],
        ["Filo ortalamas\u0131", "EU 2019/1242, Madde 4", "A\u011f\u0131rl\u0131kl\u0131 ort. hesab\u0131 \u2714"],
        ["Alt grup ayr\u0131m\u0131", "EU 2019/1242, Annex I", "P31/P32 SD/DD ayr\u0131m\u0131 \u2714"],
        ["Hedef hesab\u0131", "EU 2019/1242, Madde 1", "ref \u00d7 (1\u2212rf) form\u00fcl\u00fc \u2714"],
        ["Ceza hesab\u0131", "EU 2019/1242, Madde 8", "4250 \u20ac/g/tkm \u00d7 a\u015f\u0131m \u00d7 N \u2714"],
        ["ZLEV fakt\u00f6r\u00fc", "EU 2019/1242, Madde 5", "Te\u015fvik mekanizmas\u0131 \u2714"],
    ]
    story.append(make_table(compliance[0], compliance[1:], [28*mm, 38*mm, CW-66*mm]))
    story.append(PageBreak())


def build_section_14(story):
    story.append(p("14. Referanslar", "h1"))
    story.append(hr())

    refs = [
        "[1] Regulation (EU) 2019/1242 \u2014 CO\u2082 emission performance standards for new heavy-duty vehicles. Official Journal of the European Union, L 198, 25.7.2019.",
        "[2] Regulation (EU) 2017/2400 \u2014 Determination of CO\u2082 emissions and fuel consumption of heavy-duty vehicles (VECTO). Official Journal, L 349, 29.12.2017.",
        "[3] Regulation (EU) 2018/956 \u2014 Monitoring and reporting of CO\u2082 emissions from new heavy-duty vehicles. Official Journal, L 173, 9.7.2018.",
        "[4] Regulation (EU) 2024/1610 \u2014 Amending Regulation 2019/1242 \u2014 Strengthened CO\u2082 targets for 2030\u20132040. Official Journal, 2024.",
        "[5] EN 590:2022 \u2014 Automotive fuels \u2014 Diesel \u2014 Requirements and test methods. CEN Standard.",
        "[6] ISO 3046-1:2002 \u2014 Reciprocating internal combustion engines \u2014 Performance.",
        "[7] VECTO User Manual v3.x \u2014 European Commission, DG CLIMA.",
        "[8] ICCT (2023) \u2014 CO\u2082 standards for heavy-duty vehicles in the EU: A technical overview.",
    ]
    for ref in refs:
        story.append(Paragraph(ref, S["ref"]))
        story.append(sp(1))

    story.append(sp(10))
    story.append(hr())
    story.append(p(
        "<i>Bu dok\u00fcman TEMSA Ar-Ge Dijital M\u00fchendislik birimi taraf\u0131ndan haz\u0131rlanm\u0131\u015ft\u0131r. "
        "T\u00fcm form\u00fcller ilgili AB reg\u00fclasyonlar\u0131na dayanmakta olup, TEMSA Digital Twin "
        "platformundaki hesaplamalar\u0131n matematiksel temelini olu\u015fturmaktad\u0131r.</i>", "small"
    ))


# ═══════════════════════════════
# MAIN
# ═══════════════════════════════
def main():
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "CO2_FILO_CEZA_HESAPLAMA.pdf")
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LM, rightMargin=RM,
        topMargin=18*mm, bottomMargin=20*mm,
        title="CO₂ Filo & Ceza Hesaplama — Matematiksel Dokümantasyon",
        author="TEMSA Ar-Ge Dijital Mühendislik",
    )

    story = []
    build_cover(story)
    build_toc(story)
    build_section_1(story)
    build_section_2(story)
    build_section_3(story)
    build_section_4(story)
    build_section_5(story)
    build_section_6(story)
    build_section_7(story)
    build_section_8(story)
    build_section_9(story)
    build_section_10(story)
    build_section_11(story)
    build_section_12(story)
    build_section_13(story)
    build_section_14(story)

    doc.build(story, onFirstPage=cover_bg, onLaterPages=header_footer)
    print(f"PDF oluşturuldu: {output_path}")
    print(f"Sayfa sayısı: {doc.page}")

if __name__ == "__main__":
    main()
