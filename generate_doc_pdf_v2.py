"""
TEMSA Digital Twin — Teknik Dokümantasyon PDF v2.1
Calibri fontları ile Türkçe karakter desteği + Senior-level detaylı içerik
Paragraph-wrapped tablo hücreleri (taşma düzeltmesi)
"""
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ══════════════════════════════════════════════════════════════
# FONT REGISTRATION — Calibri (Türkçe karakter desteği)
# ══════════════════════════════════════════════════════════════
pdfmetrics.registerFont(TTFont("Calibri", "C:/Windows/Fonts/calibri.ttf"))
pdfmetrics.registerFont(TTFont("Calibri-Bold", "C:/Windows/Fonts/calibrib.ttf"))
pdfmetrics.registerFont(TTFont("Calibri-Italic", "C:/Windows/Fonts/calibrii.ttf"))
pdfmetrics.registerFont(TTFont("Calibri-BoldItalic", "C:/Windows/Fonts/calibriz.ttf"))
pdfmetrics.registerFontFamily(
    "Calibri",
    normal="Calibri",
    bold="Calibri-Bold",
    italic="Calibri-Italic",
    boldItalic="Calibri-BoldItalic",
)
try:
    pdfmetrics.registerFont(TTFont("Consolas", "C:/Windows/Fonts/consola.ttf"))
    CODE_FONT = "Consolas"
except:
    CODE_FONT = "Courier"

# ══════════════════════════════════════════════════════════════
# RENK PALETİ
# ══════════════════════════════════════════════════════════════
TEMSA_RED       = HexColor("#E30613")
DARK            = HexColor("#0f172a")
DARK2           = HexColor("#1e293b")
BLUE            = HexColor("#2563eb")
BLUE_LIGHT      = HexColor("#dbeafe")
GRAY            = HexColor("#64748b")
GRAY_LIGHT      = HexColor("#94a3b8")
LIGHT_BG        = HexColor("#f1f5f9")
WHITE           = HexColor("#ffffff")
TBL_HDR         = HexColor("#1e293b")
TBL_ALT         = HexColor("#f8fafc")
TBL_BORDER      = HexColor("#e2e8f0")
GREEN           = HexColor("#059669")
GREEN_LIGHT     = HexColor("#d1fae5")
AMBER           = HexColor("#d97706")
PURPLE          = HexColor("#7c3aed")
CYAN            = HexColor("#0891b2")

W, H = A4
LEFT_M = 22 * mm
RIGHT_M = 22 * mm
CONTENT_W = W - LEFT_M - RIGHT_M

# ══════════════════════════════════════════════════════════════
# HÜCRE STİLLERİ (Paragraph-wrapped tablolar için)
# ══════════════════════════════════════════════════════════════
CELL = ParagraphStyle("cell", fontName="Calibri", fontSize=8, leading=11, textColor=DARK, wordWrap='CJK')
CELL_BOLD = ParagraphStyle("cell_b", fontName="Calibri-Bold", fontSize=8, leading=11, textColor=DARK, wordWrap='CJK')
CELL_HDR = ParagraphStyle("cell_hdr", fontName="Calibri-Bold", fontSize=8, leading=11, textColor=WHITE, wordWrap='CJK')

def C(text):
    """Normal hücre — Paragraph sarmalı"""
    return Paragraph(str(text), CELL)

def CB(text):
    """Bold hücre"""
    return Paragraph(str(text), CELL_BOLD)

def CH(text):
    """Header hücre (beyaz yazı)"""
    return Paragraph(str(text), CELL_HDR)

# ══════════════════════════════════════════════════════════════
# STİLLER
# ══════════════════════════════════════════════════════════════
def get_styles():
    s = {}
    s["cover_title"] = ParagraphStyle("cover_title", fontName="Calibri-Bold", fontSize=32, leading=40, textColor=WHITE, alignment=TA_LEFT)
    s["cover_sub"] = ParagraphStyle("cover_sub", fontName="Calibri", fontSize=14, leading=20, textColor=HexColor("#cbd5e1"), alignment=TA_LEFT)
    s["cover_meta"] = ParagraphStyle("cover_meta", fontName="Calibri", fontSize=11, leading=16, textColor=HexColor("#94a3b8"), alignment=TA_LEFT)
    s["title"] = ParagraphStyle("title", fontName="Calibri-Bold", fontSize=22, leading=28, textColor=DARK, spaceAfter=3*mm)
    s["h1"] = ParagraphStyle("h1", fontName="Calibri-Bold", fontSize=16, leading=22, textColor=DARK, spaceBefore=10*mm, spaceAfter=4*mm)
    s["h2"] = ParagraphStyle("h2", fontName="Calibri-Bold", fontSize=12, leading=17, textColor=BLUE, spaceBefore=6*mm, spaceAfter=3*mm)
    s["h3"] = ParagraphStyle("h3", fontName="Calibri-Bold", fontSize=10.5, leading=15, textColor=DARK2, spaceBefore=4*mm, spaceAfter=2*mm)
    s["body"] = ParagraphStyle("body", fontName="Calibri", fontSize=9.5, leading=14, textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=2*mm)
    s["body_bold"] = ParagraphStyle("body_bold", fontName="Calibri-Bold", fontSize=9.5, leading=14, textColor=DARK, spaceAfter=2*mm)
    s["bullet"] = ParagraphStyle("bullet", fontName="Calibri", fontSize=9.5, leading=14, textColor=DARK, leftIndent=12*mm, bulletIndent=6*mm, spaceAfter=1.5*mm)
    s["bullet2"] = ParagraphStyle("bullet2", fontName="Calibri", fontSize=9, leading=13, textColor=DARK, leftIndent=20*mm, bulletIndent=14*mm, spaceAfter=1*mm)
    s["small"] = ParagraphStyle("small", fontName="Calibri", fontSize=8, leading=11, textColor=GRAY)
    s["toc_h1"] = ParagraphStyle("toc_h1", fontName="Calibri-Bold", fontSize=10.5, leading=20, textColor=DARK, leftIndent=2*mm)
    s["quote"] = ParagraphStyle("quote", fontName="Calibri-Italic", fontSize=9, leading=13, textColor=GRAY, leftIndent=8*mm, rightIndent=8*mm, spaceBefore=3*mm, spaceAfter=3*mm)
    s["code"] = ParagraphStyle("code", fontName=CODE_FONT, fontSize=7.5, leading=11, textColor=DARK, leftIndent=6*mm, spaceAfter=2*mm, backColor=LIGHT_BG)
    s["footer"] = ParagraphStyle("footer", fontName="Calibri", fontSize=7, leading=10, textColor=GRAY_LIGHT)
    return s

# ══════════════════════════════════════════════════════════════
# YARDIMCI FONKSİYONLAR
# ══════════════════════════════════════════════════════════════
def make_table(headers, rows, col_widths=None):
    """Paragraph hücreli tablo — metin taşması olmaz."""
    hdr = [CH(h) for h in headers]
    body = [[C(cell) for cell in row] for row in rows]
    data = [hdr] + body
    if not col_widths:
        col_widths = [None] * len(headers)
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

def make_colored_table(headers, rows, col_widths=None, header_bg=TBL_HDR):
    hdr = [CH(h) for h in headers]
    body = [[C(cell) for cell in row] for row in rows]
    data = [hdr] + body
    if not col_widths:
        col_widths = [None] * len(headers)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
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

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=TBL_BORDER, spaceAfter=4*mm, spaceBefore=2*mm)

def p(text, style_name="body"):
    return Paragraph(text, S[style_name])

def b(text):
    return Paragraph(f"\u2022 {text}", S["bullet"])

def sp(h=3):
    return Spacer(1, h * mm)

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(TEMSA_RED)
    canvas.setLineWidth(2)
    canvas.line(LEFT_M, H - 12*mm, W - RIGHT_M, H - 12*mm)
    canvas.setFont("Calibri-Bold", 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(LEFT_M, H - 10*mm, "TEMSA Digital Twin \u2014 Teknik Dok\u00fcmantasyon v2.1")
    canvas.drawRightString(W - RIGHT_M, H - 10*mm, "G\u0130ZL\u0130 \u2014 \u015eirket \u0130\u00e7i Kullan\u0131m")
    canvas.setStrokeColor(TBL_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_M, 14*mm, W - RIGHT_M, 14*mm)
    canvas.setFont("Calibri", 7)
    canvas.setFillColor(GRAY_LIGHT)
    canvas.drawString(LEFT_M, 9*mm, f"Olu\u015fturma Tarihi: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    canvas.drawRightString(W - RIGHT_M, 9*mm, f"Sayfa {doc.page}")
    canvas.restoreState()

# ══════════════════════════════════════════════════════════════
# KAPAK SAYFASI
# ══════════════════════════════════════════════════════════════
def build_cover(story):
    story.append(Spacer(1, 45*mm))
    story.append(Paragraph("TEMSA Digital Twin", S["cover_title"]))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Platform Teknik Dok\u00fcmantasyon", S["cover_title"]))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("Sistem Mimarisi \u00b7 Veritaban\u0131 Tasar\u0131m\u0131 \u00b7 API Referans\u0131 \u00b7 G\u00fcvenlik \u00b7 DevOps", S["cover_sub"]))
    story.append(Spacer(1, 20*mm))

    meta_lines = [
        "<b>Versiyon:</b> 2.1",
        f"<b>Tarih:</b> {datetime.now().strftime('%d %B %Y').replace('January','Ocak').replace('February','\u015eubat').replace('March','Mart').replace('April','Nisan').replace('May','May\u0131s').replace('June','Haziran').replace('July','Temmuz').replace('August','A\u011fustos').replace('September','Eyl\u00fcl').replace('October','Ekim').replace('November','Kas\u0131m').replace('December','Aral\u0131k')}",
        "<b>Haz\u0131rlayan:</b> TEMSA Ar-Ge Dijital M\u00fchendislik Ekibi",
        "<b>Gizlilik:</b> \u015eirket \u0130\u00e7i \u2014 Da\u011f\u0131t\u0131m\u0131 Yasakt\u0131r",
        "<b>Durum:</b> Production-Ready",
    ]
    for line in meta_lines:
        story.append(Paragraph(line, S["cover_meta"]))
        story.append(Spacer(1, 1.5*mm))

    story.append(Spacer(1, 25*mm))

    # Tech stack — cover page dark tablo
    cst = ParagraphStyle("cst", fontName="Calibri", fontSize=8, leading=12, textColor=HexColor("#d1d5db"))
    csth = ParagraphStyle("csth", fontName="Calibri-Bold", fontSize=8, leading=12, textColor=WHITE)
    stack_data = [
        [Paragraph("Katman", csth), Paragraph("Teknoloji", csth), Paragraph("Versiyon", csth)],
        [Paragraph("Frontend", cst), Paragraph("React + Vite + Tailwind CSS", cst), Paragraph("18.3 / 4.x / 3.x", cst)],
        [Paragraph("Backend", cst), Paragraph("Python + FastAPI + Uvicorn", cst), Paragraph("3.12 / 0.115 / 0.34", cst)],
        [Paragraph("Veritaban\u0131", cst), Paragraph("PostgreSQL (Async) + Redis", cst), Paragraph("16-alpine / 7-alpine", cst)],
        [Paragraph("ORM", cst), Paragraph("SQLAlchemy (AsyncSession)", cst), Paragraph("2.0+", cst)],
        [Paragraph("Auth", cst), Paragraph("JWT (HS256) + bcrypt + OAuth2", cst), Paragraph("python-jose / bcrypt 4.2", cst)],
        [Paragraph("DevOps", cst), Paragraph("Docker Compose (8 konteyner)", cst), Paragraph("Multi-service", cst)],
        [Paragraph("Monitoring", cst), Paragraph("Health checks + Import logs", cst), Paragraph("Otomatik", cst)],
    ]
    t = Table(stack_data, colWidths=[35*mm, 65*mm, 45*mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#374151")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.3, HexColor("#4b5563")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#1f2937"), HexColor("#111827")]),
    ]))
    story.append(t)
    story.append(PageBreak())

def cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(HexColor("#0f172a"))
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(TEMSA_RED)
    canvas.rect(0, H - 8*mm, W, 8*mm, fill=1, stroke=0)
    canvas.setStrokeColor(HexColor("#1e293b"))
    canvas.setLineWidth(0.2)
    for x in range(0, int(W), int(15*mm)):
        canvas.line(x, 0, x, H)
    for y in range(0, int(H), int(15*mm)):
        canvas.line(0, y, W, y)
    canvas.restoreState()

# ══════════════════════════════════════════════════════════════
# \u0130\u00c7\u0130NDEK\u0130LER
# ══════════════════════════════════════════════════════════════
def build_toc(story):
    story.append(p("\u0130\u00c7\u0130NDEK\u0130LER", "title"))
    story.append(hr())
    chapters = [
        ("1", "Y\u00f6netici \u00d6zeti"),
        ("2", "Sistem Mimarisi Genel Bak\u0131\u015f"),
        ("3", "Docker Altyap\u0131s\u0131 ve Konteyner Mimarisi"),
        ("4", "Veritaban\u0131 Tasar\u0131m\u0131 (PostgreSQL)"),
        ("5", "Backend API Mimarisi (FastAPI)"),
        ("6", "API Endpoint Referans\u0131"),
        ("7", "Kimlik Do\u011frulama ve Yetkilendirme"),
        ("8", "Frontend Mimarisi (React)"),
        ("9", "Veri Ak\u0131\u015f\u0131 ve \u0130\u015f Mant\u0131\u011f\u0131"),
        ("10", "BOM Entegrasyon Sistemi"),
        ("11", "Performans, \u00d6l\u00e7eklenebilirlik ve Cache"),
        ("12", "G\u00fcvenlik Mimarisi"),
        ("13", "Migration ve Veritaban\u0131 Evrim Stratejisi"),
        ("14", "Test ve Kalite G\u00fcvence"),
        ("15", "Deployment ve DevOps S\u00fcreci"),
        ("16", "Sonu\u00e7 ve Teknik De\u011ferlendirme"),
    ]
    for num, title in chapters:
        story.append(Paragraph(f"<b>{num}.</b>  {title}", S["toc_h1"]))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 1 — Y\u00d6NET\u0130C\u0130 \u00d6ZET\u0130
# ══════════════════════════════════════════════════════════════
def build_section_1(story):
    story.append(p("1. Y\u00f6netici \u00d6zeti", "h1"))
    story.append(hr())
    story.append(p(
        "TEMSA Digital Twin platformu, TEMSA otob\u00fcs ara\u00e7lar\u0131n\u0131n Avrupa Birli\u011fi CO\u2082 reg\u00fclasyonlar\u0131 "
        "(EU 2019/1242 ve EU 2019/631) kapsam\u0131nda zorunlu olan VECTO (Vehicle Energy Consumption "
        "Calculation Tool) sim\u00fclasyon verilerini merkezi bir sistemde y\u00f6netmek, analiz etmek ve "
        "raporlamak i\u00e7in tasarlanm\u0131\u015f <b>kurumsal d\u00fczeyde bir dijital ikiz platformudur</b>."
    ))
    story.append(p(
        "Platform; ara\u00e7 varyant y\u00f6netimi, motor/\u015fanz\u0131man/lastik konfig\u00fcrasyonlar\u0131n\u0131n detayl\u0131 kayd\u0131, "
        "yak\u0131t haritas\u0131 ve y\u00fck e\u011frisi verilerinin saklanmas\u0131, CO\u2082 emisyon hesaplamalar\u0131, filo bazl\u0131 "
        "a\u011f\u0131rl\u0131kl\u0131 ortalama hesaplamalar\u0131, ger\u00e7ek test sonu\u00e7lar\u0131yla korelasyon analizi ve "
        "BOM (Bill of Materials) entegrasyon s\u00fcre\u00e7lerini tek bir \u00e7at\u0131 alt\u0131nda birle\u015ftirir."
    ))

    story.append(p("Temel Metrikler", "h2"))
    metrics = [
        ["Metrik", "De\u011fer", "A\u00e7\u0131klama"],
        ["Toplam API Endpoint", "78+", "10 router mod\u00fcl\u00fc \u00fczerinden sunulan RESTful endpoint"],
        ["Veritaban\u0131 Tablosu", "17+", "Ana DB (11 tablo + 3 view) + BOM DB (6+ tablo)"],
        ["Frontend Sayfa/Panel", "19", "React SPA \u2014 7 navigasyon grubu"],
        ["Docker Konteyner", "8", "PostgreSQL \u00d72, Redis, FastAPI \u00d73, React, Flask"],
        ["Veritaban\u0131 \u0130ndeksi", "14+", "Performans-optimize edilmi\u015f B-tree indeksleri"],
        ["Migration Say\u0131s\u0131", "6", "Art\u0131ml\u0131 \u015fema evrimi \u2014 v1'den v6'ya"],
        ["Kullan\u0131c\u0131 Rol\u00fc", "7", "admin, manager, analyst, viewer, engineering, entegration, design"],
    ]
    story.append(make_table(metrics[0], metrics[1:], [35*mm, 22*mm, CONTENT_W - 57*mm]))
    story.append(sp(4))
    story.append(p(
        "Bu dok\u00fcmantasyon, platformun her katman\u0131n\u0131 \u2014 veritaban\u0131 \u015femas\u0131ndan API endpoint imzalar\u0131na, "
        "g\u00fcvenlik mekanizmalar\u0131ndan deployment pipeline'\u0131na kadar \u2014 bir senior m\u00fchendis perspektifinden "
        "detayl\u0131 \u015fekilde ele almaktad\u0131r."
    ))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 2 — S\u0130STEM M\u0130MAR\u0130S\u0130
# ══════════════════════════════════════════════════════════════
def build_section_2(story):
    story.append(p("2. Sistem Mimarisi Genel Bak\u0131\u015f", "h1"))
    story.append(hr())
    story.append(p(
        "Platform, modern mikroservis-benzeri (micro-service-like) bir mimari \u00fczerine in\u015fa edilmi\u015ftir. "
        "Her servis kendi Docker konteynerinde izole \u00e7al\u0131\u015f\u0131r, servisler aras\u0131 ileti\u015fim Docker internal "
        "network \u00fczerinden ger\u00e7ekle\u015fir. Bu yakla\u015f\u0131m, ba\u011f\u0131ms\u0131z \u00f6l\u00e7eklendirme, hata izolasyonu ve "
        "ba\u011f\u0131ms\u0131z deployment imk\u00e2n\u0131 sa\u011flar."
    ))

    story.append(p("2.1 Mimari Katmanlar", "h2"))
    story.append(p(
        "Sistem d\u00f6rt ana katmandan olu\u015fur: <b>Sunum Katman\u0131</b> (React SPA), <b>API Katman\u0131</b> "
        "(FastAPI + Flask), <b>Veri Katman\u0131</b> (PostgreSQL + Redis) ve <b>Orkestrasyon Katman\u0131</b> "
        "(Docker Compose)."
    ))
    layers = [
        ["Katman", "Teknoloji", "Sorumluluk", "Port"],
        ["Sunum", "React 18.3 + Vite", "SPA UI, routing, responsive tasar\u0131m", "3000"],
        ["API Gateway", "Vite Dev Proxy", "CORS, path-based routing", "\u2014"],
        ["Ana Backend", "FastAPI 0.115", "REST API, async I/O, validasyon", "8000"],
        ["BOM Servisi", "FastAPI (ayr\u0131)", "Excel entegrasyonu, malzeme, takvim", "8001"],
        ["Sim\u00fclasyon", "FastAPI (Simutem)", "EV enerji sim\u00fclasyonu", "8002"],
        ["Homologasyon", "Flask 3.x", "Reg\u00fclasyon scraping, checklist", "5001"],
        ["Veri Katman\u0131", "PostgreSQL 16", "ACID ili\u015fkisel veri depolama", "5433/5434"],
        ["Cache", "Redis 7", "Session cache, rate limiting", "6379"],
    ]
    story.append(make_table(layers[0], layers[1:], [28*mm, 30*mm, 58*mm, 16*mm]))

    story.append(p("2.2 Servisler Aras\u0131 \u0130leti\u015fim", "h2"))
    story.append(p(
        "Frontend, farkl\u0131 backend servislerine Vite proxy konfig\u00fcrasyonu \u00fczerinden eri\u015fir. "
        "<b>/api/v1/*</b> istekleri ana backend'e (port 8000), <b>/bom-api/*</b> istekleri BOM backend'e "
        "(port 8001), <b>/simutem-api/*</b> istekleri sim\u00fclasyon servisine (port 8002), "
        "<b>/homolog-api/*</b> istekleri homologasyon servisine (port 5001) y\u00f6nlendirilir."
    ))
    story.append(b("Frontend \u2192 Backend: HTTP/REST (JSON), Vite reverse proxy ile"))
    story.append(b("Backend \u2192 PostgreSQL: asyncpg ba\u011flant\u0131 havuzu (pool_size=20, max_overflow=10)"))
    story.append(b("Backend \u2192 Redis: aioredis async client"))
    story.append(b("Servisler aras\u0131: Docker internal network (bridge mode)"))

    story.append(p("2.3 Veri Ak\u0131\u015f Diyagram\u0131 (Mant\u0131ksal)", "h2"))
    flow_data = [
        ["Kaynak", "\u0130\u015flem", "Hedef", "Format"],
        ["VECTO XML Dosyas\u0131", "XML parse \u2192 model e\u015fle\u015ftirme", "vehicle_variants", "XML \u2192 JSON \u2192 SQL"],
        ["VECTO Sonu\u00e7 XML", "CO\u2082/FC extraction", "vecto_results_certified", "XML \u2192 Numeric"],
        ["Excel BOM Dosyas\u0131", "Sat\u0131r parse \u2192 seviye atama", "bom_items", "XLSX \u2192 JSON \u2192 SQL"],
        ["Kullan\u0131c\u0131 Giri\u015fi", "JWT token \u00fcretimi", "Redis + users tablosu", "Form \u2192 bcrypt \u2192 JWT"],
        ["RSLT_MANUFACTURER", "\u00c7oklu misyon ayr\u0131\u015ft\u0131rma", "vecto_simulation_outputs", "XML \u2192 Multi-row"],
    ]
    story.append(make_table(flow_data[0], flow_data[1:], [32*mm, 38*mm, 35*mm, CONTENT_W - 105*mm]))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 3 — DOCKER ALTYAPISI
# ══════════════════════════════════════════════════════════════
def build_section_3(story):
    story.append(p("3. Docker Altyap\u0131s\u0131 ve Konteyner Mimarisi", "h1"))
    story.append(hr())
    story.append(p(
        "T\u00fcm servisler Docker Compose ile orkestre edilir. Tek bir <b>docker-compose up -d</b> "
        "komutu ile 8 konteyner aya\u011fa kalkar. Servisler aras\u0131 ba\u011f\u0131ml\u0131l\u0131klar depends_on + "
        "healthcheck mekanizmas\u0131 ile y\u00f6netilir, b\u00f6ylece veritaban\u0131 haz\u0131r olmadan backend ba\u015flamaz."
    ))

    story.append(p("3.1 Konteyner Envanteri", "h2"))
    containers = [
        ["Konteyner", "Image", "Port", "Volume", "Healthcheck"],
        ["temsa-db", "postgres:16-alpine", "5433:5432", "pgdata + init.sql", "pg_isready"],
        ["temsa-redis", "redis:7-alpine", "6379:6379", "redisdata", "\u2014"],
        ["temsa-backend", "python:3.12 (custom)", "8000:8000", "app, vecto_files, outputs", "\u2014"],
        ["temsa-frontend", "node:18 (custom)", "3000:3000", "src, public", "\u2014"],
        ["temsa-bom-db", "postgres:16-alpine", "5434:5432", "bom_pgdata", "pg_isready"],
        ["temsa-bom-backend", "python:3.12 (custom)", "8001:8000", "uploads", "\u2014"],
        ["temsa-simutem", "python:3.12 (custom)", "8002:8000", "\u2014", "\u2014"],
        ["temsa-homolog", "python:3.x (custom)", "5001:5000", "\u2014", "\u2014"],
    ]
    story.append(make_table(containers[0], containers[1:], [28*mm, 28*mm, 18*mm, 38*mm, 20*mm]))

    story.append(p("3.2 Volume Y\u00f6netimi", "h2"))
    story.append(p(
        "Docker named volume'lar sayesinde konteyner yeniden olu\u015fturulsa bile veri kaybolmaz. "
        "Veritaban\u0131 verileri <b>pgdata</b> ve <b>bom_pgdata</b> volume'lar\u0131nda, Redis verileri "
        "<b>redisdata</b> volume'unda kal\u0131c\u0131 olarak tutulur."
    ))
    vols = [
        ["Volume Ad\u0131", "Mount Hedefi", "Kal\u0131c\u0131l\u0131k", "\u0130\u00e7erik"],
        ["pgdata", "/var/lib/postgresql/data", "Evet", "Ana veritaban\u0131 (temsa_twin)"],
        ["bom_pgdata", "/var/lib/postgresql/data", "Evet", "BOM veritaban\u0131 (bomdb)"],
        ["redisdata", "/data", "Evet", "Redis AOF/RDB snapshot"],
        ["bom_uploads", "/app/uploads", "Evet", "Y\u00fcklenen Excel dosyalar\u0131"],
        ["./vecto_files", "/app/vecto_files (bind)", "Host", "VECTO XML kaynak dosyalar\u0131"],
        ["./vecto_outputs", "/app/vecto_outputs (bind)", "Host", "VECTO sim\u00fclasyon \u00e7\u0131kt\u0131lar\u0131"],
        ["./public", "/app/public (bind)", "Host", "Statik varl\u0131klar (fontlar, g\u00f6rseller)"],
    ]
    story.append(make_table(vols[0], vols[1:], [26*mm, 40*mm, 16*mm, CONTENT_W - 82*mm]))

    story.append(p("3.3 Network Topolojisi", "h2"))
    story.append(p(
        "Docker Compose varsay\u0131lan olarak bir bridge network olu\u015fturur. T\u00fcm konteynerler bu "
        "network \u00fczerinde birbirine hostname ile eri\u015fir (\u00f6rn. backend konteyneri veritaban\u0131na "
        "<b>db:5432</b> adresi ile ba\u011flan\u0131r). D\u0131\u015f d\u00fcnyaya sadece port mapping ile tan\u0131mlanan "
        "portlar a\u00e7\u0131kt\u0131r."
    ))
    story.append(b("\u0130\u00e7 a\u011f: temsa-digital-twin_default (bridge)"))
    story.append(b("DNS \u00e7\u00f6z\u00fcmleme: Docker embedded DNS (konteyner ad\u0131 \u2192 IP)"))
    story.append(b("D\u0131\u015f eri\u015fim: localhost:3000 (UI), localhost:8000 (API), localhost:5433 (DB admin)"))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 4 — VER\u0130TABANI TASARIMI
# ══════════════════════════════════════════════════════════════
def build_section_4(story):
    story.append(p("4. Veritaban\u0131 Tasar\u0131m\u0131 (PostgreSQL)", "h1"))
    story.append(hr())
    story.append(p(
        "Sistem iki ayr\u0131 PostgreSQL 16 instance kullan\u0131r: <b>temsa_twin</b> (ana veritaban\u0131 \u2014 ara\u00e7, "
        "varyant, sim\u00fclasyon, CO\u2082, kullan\u0131c\u0131 verileri) ve <b>bomdb</b> (BOM entegrasyon veritaban\u0131 \u2014 "
        "proje, malzeme, takvim verileri). Her iki veritaban\u0131 UUID primary key stratejisi kullan\u0131r "
        "ve uuid-ossp extension'\u0131 ile otomatik UUID \u00fcretimi desteklenir."
    ))

    story.append(p("4.1 PostgreSQL Konfig\u00fcrasyonu", "h2"))
    db_config = [
        ["Parametre", "temsa_twin", "bomdb"],
        ["Image", "postgres:16-alpine", "postgres:16-alpine"],
        ["Kullan\u0131c\u0131", "temsa", "bomuser"],
        ["D\u0131\u015f Port", "5433", "5434"],
        ["Extension", "uuid-ossp, pg_trgm", "uuid-ossp"],
        ["Encoding", "UTF-8", "UTF-8"],
        ["Connection Pool", "pool_size=20, max_overflow=10", "pool_size=20"],
        ["Healthcheck", "pg_isready (5s interval)", "pg_isready (5s interval)"],
    ]
    story.append(make_table(db_config[0], db_config[1:], [35*mm, 58*mm, 58*mm]))

    story.append(p("4.2 ENUM Tipleri", "h2"))
    story.append(p(
        "Veritaban\u0131, tekrar eden kategorik de\u011ferler i\u00e7in PostgreSQL native ENUM tiplerini kullan\u0131r. "
        "Bu, veri tutarl\u0131l\u0131\u011f\u0131n\u0131 uygulama seviyesinde de\u011fil veritaban\u0131 seviyesinde garanti eder."
    ))
    enums = [
        ["ENUM Ad\u0131", "De\u011ferler", "Kullan\u0131ld\u0131\u011f\u0131 Tablo"],
        ["vehicle_category", "coach, city, ev, diesel", "vehicles.category"],
        ["engine_type", "diesel, electric, hybrid", "vehicle_variants.engine_type"],
        ["simulation_source", "vecto, matlab, custom", "simulation_runs.source"],
        ["simulation_status", "pending, processing, completed, failed", "simulation_runs.status"],
        ["test_type", "track, road, endurance, customer", "real_test_results.test_type"],
    ]
    story.append(make_table(enums[0], enums[1:], [30*mm, 55*mm, CONTENT_W - 85*mm]))

    story.append(p("4.3 Ana Tablo \u015eemas\u0131 \u2014 vehicles", "h2"))
    story.append(p("Ara\u00e7 model bilgilerini tutan \u00fcst d\u00fczey tablo. Her ara\u00e7 birden fazla varyanta sahip olabilir (1:N)."))
    vehicles_cols = [
        ["Kolon", "Tip", "K\u0131s\u0131tlama", "A\u00e7\u0131klama"],
        ["id", "UUID", "PK, DEFAULT uuid_generate_v4()", "Benzersiz ara\u00e7 tan\u0131mlay\u0131c\u0131"],
        ["model_name", "VARCHAR(100)", "NOT NULL", "Ara\u00e7 model ad\u0131 (\u00f6rn: LD SB)"],
        ["manufacturer", "VARCHAR(200)", "NOT NULL, DEFAULT 'TEMSA'", "\u00dcretici firma ad\u0131"],
        ["category", "vehicle_category", "NOT NULL", "coach / city / ev / diesel"],
        ["subcategory", "VARCHAR(50)", "NULLABLE", "Alt kategori"],
        ["legislative_category", "VARCHAR(10)", "DEFAULT 'M3'", "AB tip onay kategorisi"],
        ["chassis_config", "VARCHAR(50)", "NULLABLE", "\u015easi konfig\u00fcrasyonu"],
        ["axle_config", "VARCHAR(20)", "NULLABLE", "Aks konfig\u00fcrasyonu (4x2, 6x2)"],
        ["base_config", "JSON", "DEFAULT '{}'", "Temel konfig\u00fcrasyon"],
        ["created_at", "TIMESTAMPTZ", "DEFAULT NOW()", "Kay\u0131t olu\u015fturma zaman\u0131"],
        ["updated_at", "TIMESTAMPTZ", "ON UPDATE trigger", "Son g\u00fcncelleme zaman\u0131"],
    ]
    story.append(make_table(vehicles_cols[0], vehicles_cols[1:], [24*mm, 26*mm, 46*mm, CONTENT_W - 96*mm]))

    story.append(p("4.4 Ana Tablo \u015eemas\u0131 \u2014 vehicle_variants", "h2"))
    story.append(p(
        "Sistemin en kritik ve en geni\u015f tablosu. Her VECTO XML dosyas\u0131ndan parse edilen t\u00fcm "
        "teknik detaylar bu tabloda saklan\u0131r. 60'tan fazla kolon ile motor, \u015fanz\u0131man, lastik, "
        "aerodinamik, ADAS ve HVAC bilgilerini kapsar."
    ))
    vv_cols = [
        ["Kolon", "Tip", "Açıklama"],
        ["id", "UUID PK", "Benzersiz tanımlayıcı"],
        ["vehicle_id", "UUID FK", "Üst araç ref (CASCADE)"],
        ["variant_code", "VARCHAR(50)", "VECTO varyant kodu"],
        ["filename", "VARCHAR(255)", "XML dosya adı"],
        ["engine_type", "ENUM", "diesel / electric / hybrid"],
        ["engine_manufacturer", "VARCHAR(200)", "Motor üreticisi"],
        ["engine_model", "VARCHAR(200)", "Motor modeli"],
        ["engine_cert_number", "VARCHAR(200)", "AB sertifika no"],
        ["displacement_cc", "INTEGER", "Motor hacmi (cm³)"],
        ["rated_speed_rpm", "INTEGER", "Nominal devir"],
        ["rated_power_w", "INTEGER", "Nominal güç (W)"],
        ["max_torque_nm", "NUMERIC(8,2)", "Maks tork (Nm)"],
        ["idling_speed_rpm", "INTEGER", "Rölanti devri"],
        ["fuel_type", "VARCHAR(50)", "Yakıt tipi"],
        ["max_laden_mass_kg", "INTEGER", "Azami kütle (kg)"],
        ["curb_weight_kg", "INTEGER", "Boş ağırlık (kg)"],
        ["aero_cd_a", "NUMERIC(6,4)", "CdA (m²)"],
        ["gearbox_*", "VARCHAR(200)", "Üretici, model, tip (3 kolon)"],
        ["gear_count", "INTEGER", "Vites sayısı"],
        ["axle_ratio / type", "NUMERIC / VARCHAR", "Diferansiyel (2 kolon)"],
        ["tyre_*", "VARCHAR / NUMERIC", "Lastik detayı (12 kolon)"],
        ["ADAS kolonları", "BOOLEAN / VARCHAR", "stop_start, eco_roll, cruise"],
        ["fan / steering / alt", "VARCHAR", "Yardımcı donanım (3 kolon)"],
        ["pneumatic_config", "JSON", "Pnömatik konfigürasyon"],
        ["hvac_config", "JSON", "Klima/ısıtma konfig"],
        ["whtc_*", "NUMERIC(8,5)", "WHTC düzeltme (3 kolon)"],
        ["bf_cold_hot", "NUMERIC(8,5)", "Yakıt düzeltmesi"],
        ["cf_reg_per / cf_ncv", "NUMERIC(8,5)", "NCV düzeltmeleri"],
        ["fleet_count", "INTEGER", "Filo adedi"],
        ["zero_emission", "BOOLEAN", "Sıfır emisyon"],
        ["raw_xml_data", "JSON", "Ham XML verisi"],
        ["vecto_schema_ver", "VARCHAR(20)", "VECTO versiyonu"],
        ["import_date", "TIMESTAMPTZ", "Aktarma tarihi"],
        ["is_active", "BOOLEAN", "Soft delete"],
        ["created/updated_at", "TIMESTAMPTZ", "Zaman damgaları"],
    ]
    story.append(make_table(vv_cols[0], vv_cols[1:], [32*mm, 30*mm, CONTENT_W - 62*mm]))
    story.append(PageBreak())

    # 4.5 M\u00fchendislik veri tabloları
    story.append(p("4.5 M\u00fchendislik Veri Tablolar\u0131", "h2"))
    story.append(p(
        "VECTO sim\u00fclasyonu i\u00e7in gereken detayl\u0131 m\u00fchendislik verileri ayr\u0131 tablolarda normalize "
        "edilmi\u015f \u015fekilde saklan\u0131r. Her tablo vehicle_variants tablosuna FK ile ba\u011fl\u0131d\u0131r ve "
        "CASCADE delete kural\u0131 uygulan\u0131r."
    ))
    eng_tables = [
        ["Tablo", "Kolonlar", "Amaç", "Veri Örneği"],
        ["fuel_consumption_maps", "speed, torque, fc", "Yakıt haritası", "2100rpm, 800Nm → 42.5g/s"],
        ["full_load_drag_curves", "speed, max_torque, drag", "Yük/sürtünme eğrileri", "1800rpm → 1100/-85 Nm"],
        ["gear_ratios", "gear_number, ratio", "Vites oranları", "Vites 6 → 0.78"],
        ["torque_converter_chars", "speed_r, torque_r, input", "Tork konvertör", "0.8 → 1.2 ratio"],
        ["axle_loss_maps", "speed, torque, loss", "Aks kayıp haritası", "500rpm, 2000Nm → 35.5"],
    ]
    story.append(make_table(eng_tables[0], eng_tables[1:], [35*mm, 35*mm, 32*mm, CONTENT_W - 102*mm]))

    story.append(p("4.6 Sim\u00fclasyon ve Test Sonu\u00e7 Tablolar\u0131", "h2"))
    sim_tables = [
        ["Tablo", "Kayıt Tipi", "Anahtar Metrikler"],
        ["simulation_runs", "Simülasyon çalıştırma", "source, status, params"],
        ["simulation_results", "Sonuç", "co2, fuel, energy metrikleri"],
        ["real_test_results", "Test sonucu", "test tipi, koşullar"],
        ["vecto_results_certified", "VECTO sertifika (56 kol.)", "VIN, misyon×yükleme, CO₂/FC"],
        ["vecto_simulation_outputs", "VECTO çıktı", "cf_actual, WHTC faktörleri"],
        ["import_logs", "İçe aktarma", "dosya, status, hata, sayılar"],
    ]
    story.append(make_table(sim_tables[0], sim_tables[1:], [38*mm, 35*mm, CONTENT_W - 73*mm]))

    story.append(p("4.7 vecto_results_certified \u2014 Detayl\u0131 \u015eema", "h2"))
    story.append(p(
        "Bu tablo, AB reg\u00fclasyonu gere\u011fi resmi VECTO sertifikal\u0131 sonu\u00e7lar\u0131 saklar. <b>56 kolon</b> "
        "ile sistemin en kapsaml\u0131 tablosudur. Her VIN i\u00e7in birden fazla misyon\u00d7y\u00fckleme kombinasyonu "
        "kaydedilir (\u00f6rn: Urban-LowLoad, Suburban-RefLoad, Interurban-FullLoad)."
    ))
    vrc_cols = [
        ["Kolon Grubu", "Kolonlar", "A\u00e7\u0131klama"],
        ["Kimlik", "id, variant_id, vin, vehicle_model", "Ara\u00e7 tan\u0131mlama"],
        ["S\u0131n\u0131fland\u0131rma", "vehicle_category, vehicle_group, group_co2, class_bus, axle_config", "AB s\u0131n\u0131fland\u0131rma"],
        ["K\u00fctle", "corrected_actual_mass, tech_max_laden_mass, total_vehicle_mass, payload, mass_passengers", "A\u011f\u0131rl\u0131k (5 kolon, _kg)"],
        ["Misyon", "mission, loading, primary_subgroup, distance_km, passenger_count", "Sim\u00fclasyon senaryolar\u0131"],
        ["H\u0131z", "avg_speed, avg_driving_speed, max_speed", "H\u0131z profili (_kmh)"],
        ["CO\u2082", "co2_g_per_km, co2_g_per_pkm", "g/km ve g/yolcu-km"],
        ["Yak\u0131t", "fc_g_per_km, fc_mj_per_km, fc_l_per_100km + 3 pkm", "6 birimde yak\u0131t t\u00fcketimi"],
        ["Enerji", "energy_mj_per_km", "Enerji (MJ/km)"],
        ["Verimlilik", "gearbox_eff, axlegear_eff, gearshift_count", "Aktarma verimlili\u011fi"],
        ["Motor", "rated_power, capacity, fuel_type, propulsion_power", "Motor parametreleri"],
        ["\u015eanz\u0131man", "transmission_type, nr_of_gears, retarder, axle_ratio", "\u015eanz\u0131man detaylar\u0131"],
        ["Lastik", "average_rrc, tyre_dimension", "Lastik parametreleri"],
        ["ADAS", "stop_start, eco_roll, predictive_cruise", "S\u00fcr\u00fc\u015f destek"],
        ["HVAC", "hvac_config, double_glazing", "\u0130klimlendirme"],
        ["\u00d6zet", "is_summary, summary_co2, summary_fc", "A\u011f\u0131rl\u0131kl\u0131 ort."],
        ["Meta", "source_file, source_type, tool_version, sim_date, status", "Veri kayna\u011f\u0131"],
    ]
    story.append(make_table(vrc_cols[0], vrc_cols[1:], [25*mm, 60*mm, CONTENT_W - 85*mm]))

    story.append(p("4.8 Kullan\u0131c\u0131 ve Rol Tablolar\u0131", "h2"))
    story.append(p(
        "RBAC (Role-Based Access Control) sistemi iki tablo ile y\u00f6netilir. Roller, JSON format\u0131nda "
        "izin dizileri (permissions) ta\u015f\u0131r ve her kullan\u0131c\u0131 tek bir role atan\u0131r."
    ))
    roles_data = [
        ["Rol", "İzinler (JSONB)", "Açıklama"],
        ["admin", '["*"]', "Tam yetki"],
        ["manager", '["view","edit","import","export"]', "Yönetici — veri girişi ve analiz"],
        ["analyst", '["view","analyze","export"]', "Analist — salt okunur + analiz"],
        ["viewer", '["view"]', "İzleyici — salt okunur"],
        ["engineering", '["weightcalc","simutem"]', "Mühendislik modülleri"],
        ["entegration", '["bom","materials"]', "Entegrasyon — BOM"],
        ["design", '["view","export","compare"]', "Tasarım"],
    ]
    story.append(make_table(roles_data[0], roles_data[1:], [24*mm, 56*mm, CONTENT_W - 80*mm]))

    story.append(p("4.9 \u0130ndeks Stratejisi", "h2"))
    story.append(p(
        "S\u0131k sorgulanan kolonlar \u00fczerinde B-tree indeksler tan\u0131mlanm\u0131\u015ft\u0131r. pg_trgm extension'\u0131 "
        "sayesinde trigram bazl\u0131 benzerlik aramalar\u0131 da desteklenir."
    ))
    indexes = [
        ["\u0130ndeks", "Tablo.Kolon", "Tip"],
        ["idx_vehicles_category", "vehicles.category", "B-tree"],
        ["idx_vehicles_model", "vehicles.model_name", "B-tree"],
        ["idx_variants_vehicle", "vehicle_variants.vehicle_id", "B-tree (FK)"],
        ["idx_variants_code", "vehicle_variants.variant_code", "B-tree (UNIQUE)"],
        ["idx_variants_engine", "vehicle_variants.engine_type", "B-tree"],
        ["idx_variants_filename", "vehicle_variants.filename", "B-tree"],
        ["idx_fcm_variant", "fuel_consumption_maps.variant_id", "B-tree (FK)"],
        ["idx_fldc_variant", "full_load_drag_curves.variant_id", "B-tree (FK)"],
        ["idx_vrc_vin", "vecto_results_certified.vin", "B-tree"],
        ["idx_vrc_variant", "vecto_results_certified.variant_id", "B-tree (FK)"],
        ["idx_vrc_summary", "vecto_results_certified.is_summary", "B-tree"],
        ["idx_vrc_subgroup", "vecto_results_certified.primary_subgroup", "B-tree"],
        ["idx_simruns_variant", "simulation_runs.variant_id", "B-tree (FK)"],
        ["idx_simruns_status", "simulation_runs.status", "B-tree"],
        ["idx_importlogs_filename", "import_logs.filename", "B-tree"],
    ]
    story.append(make_table(indexes[0], indexes[1:], [35*mm, 52*mm, CONTENT_W - 87*mm]))

    story.append(p("4.10 View \u2014 v_variant_summary", "h2"))
    story.append(p(
        "S\u0131k kullan\u0131lan varyant listesi sorgusu i\u00e7in materialized olmayan bir view tan\u0131mlanm\u0131\u015ft\u0131r. "
        "Bu view, vehicles ve vehicle_variants tablolar\u0131n\u0131 JOIN eder ve alt sorgu ile yak\u0131t haritas\u0131 "
        "nokta say\u0131s\u0131 (fcm_points), y\u00fck e\u011frisi nokta say\u0131s\u0131 (fldc_points) ve ger\u00e7ek vites say\u0131s\u0131 "
        "(gear_count_actual) bilgilerini ekler."
    ))

    story.append(p("4.11 Trigger \u2014 updated_at Otomatik G\u00fcncelleme", "h2"))
    story.append(p(
        "<b>update_updated_at_column()</b> fonksiyonu, vehicles ve vehicle_variants tablolar\u0131nda "
        "her UPDATE i\u015fleminde updated_at kolonunu otomatik olarak NOW() de\u011ferine ayarlar. Bu, "
        "uygulama katman\u0131nda unutulabilecek zaman damgas\u0131 g\u00fcncellemesini veritaban\u0131 seviyesinde garanti eder."
    ))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 5 — BACKEND API M\u0130MAR\u0130S\u0130
# ══════════════════════════════════════════════════════════════
def build_section_5(story):
    story.append(p("5. Backend API Mimarisi (FastAPI)", "h1"))
    story.append(hr())
    story.append(p(
        "Backend, Python 3.12 \u00fczerinde FastAPI framework ile geli\u015ftirilmi\u015ftir. Tamamen <b>asenkron</b> "
        "(async/await) I/O modeli kullan\u0131r. Uvicorn ASGI sunucusu \u00fczerinde \u00e7al\u0131\u015f\u0131r. SQLAlchemy 2.0+ "
        "AsyncSession ile veritaban\u0131 i\u015flemleri non-blocking ger\u00e7ekle\u015fir."
    ))

    story.append(p("5.1 Proje Yap\u0131s\u0131", "h2"))
    structure = [
        ["Dosya/Dizin", "Sorumluluk"],
        ["main.py", "FastAPI app olu\u015fturma, CORS, router kay\u0131t, lifespan y\u00f6netimi"],
        ["config.py", "pydantic-settings ile ortam de\u011fi\u015fkenleri (.env deste\u011fi)"],
        ["database.py", "SQLAlchemy async engine, session factory, Base class, get_db dependency"],
        ["models.py", "SQLAlchemy ORM modelleri (17+ model)"],
        ["schemas.py", "Pydantic v2 \u015femalar\u0131 \u2014 request/response validasyonu"],
        ["routers/vehicles.py", "Ara\u00e7 ve varyant CRUD \u2014 9 endpoint"],
        ["routers/co2_v2.py", "CO\u2082, filo hesaplama, digital twin \u2014 25 endpoint"],
        ["routers/auth.py", "Kimlik do\u011frulama, kullan\u0131c\u0131 CRUD \u2014 9 endpoint"],
        ["routers/analysis.py", "Analiz, s\u0131ralama, kar\u015f\u0131la\u015ft\u0131rma \u2014 4 endpoint"],
        ["routers/simulations.py", "XML import, bulk upload \u2014 5 endpoint"],
        ["routers/vsum_analytics.py", "VSUM derin analitik \u2014 11 endpoint"],
        ["routers/pdf_report.py", "PDF rapor \u00fcretimi \u2014 2 endpoint"],
        ["routers/dashboard.py", "Hava durumu, haberler \u2014 2 endpoint"],
        ["utils/xml_parser.py", "VECTO XML parse fonksiyonlar\u0131"],
    ]
    story.append(make_table(structure[0], structure[1:], [40*mm, CONTENT_W - 40*mm]))

    story.append(p("5.2 Konfig\u00fcrasyon Y\u00f6netimi", "h2"))
    story.append(p(
        "T\u00fcm konfig\u00fcrasyon pydantic-settings ile y\u00f6netilir. .env dosyas\u0131ndan otomatik okuma yap\u0131l\u0131r. "
        "Hassas bilgiler (SECRET_KEY, DB_PASSWORD) production'da ortam de\u011fi\u015fkeni olarak set edilir."
    ))
    config_table = [
        ["Parametre", "Tip", "Varsay\u0131lan", "A\u00e7\u0131klama"],
        ["APP_NAME", "str", "TEMSA Digital Twin", "Uygulama ad\u0131"],
        ["APP_VERSION", "str", "1.0.0", "Semantik versiyon"],
        ["DEBUG", "bool", "True", "Geli\u015ftirme modu (SQL echo)"],
        ["DATABASE_URL", "str", "postgresql+asyncpg://...", "Async DB ba\u011flant\u0131s\u0131"],
        ["DATABASE_URL_SYNC", "str", "postgresql://...", "Senkron ba\u011flant\u0131 (migration)"],
        ["REDIS_URL", "str", "redis://redis:6379/0", "Redis ba\u011flant\u0131s\u0131"],
        ["VECTO_IMPORT_DIR", "str", "/app/vecto_files", "VECTO dosya dizini"],
        ["SECRET_KEY", "str", "(de\u011fi\u015ftirilecek)", "JWT imzalama anahtar\u0131"],
        ["JWT_ALGORITHM", "str", "HS256", "JWT algoritmas\u0131"],
        ["ACCESS_TOKEN_EXPIRE_MINUTES", "int", "480 (8 saat)", "JWT token \u00f6mr\u00fc"],
    ]
    story.append(make_table(config_table[0], config_table[1:], [38*mm, 12*mm, 34*mm, CONTENT_W - 84*mm]))

    story.append(p("5.3 Veritaban\u0131 Ba\u011flant\u0131 Havuzu", "h2"))
    story.append(p(
        "SQLAlchemy async engine, asyncpg driver ile ba\u011flant\u0131 havuzu y\u00f6netir. "
        "<b>pool_size=20</b> ile e\u015fzamanl\u0131 20 ba\u011flant\u0131, <b>max_overflow=10</b> ile "
        "ani y\u00fck durumunda ek 10 ba\u011flant\u0131 a\u00e7\u0131labilir. Toplam maksimum: 30 e\u015fzamanl\u0131 "
        "veritaban\u0131 ba\u011flant\u0131s\u0131."
    ))
    story.append(b("engine = create_async_engine(DATABASE_URL, pool_size=20, max_overflow=10, echo=DEBUG)"))
    story.append(b("AsyncSession: expire_on_commit=False \u2014 lazy load sorunu \u00f6nlenir"))
    story.append(b("Dependency Injection: get_db() async generator \u2014 otomatik session ya\u015fam d\u00f6ng\u00fcs\u00fc"))

    story.append(p("5.4 CORS Politikas\u0131", "h2"))
    story.append(b("allow_origins: ['http://localhost:3000', 'http://localhost:5173']"))
    story.append(b("allow_credentials: True (cookie/JWT ta\u015f\u0131nabilir)"))
    story.append(b("allow_methods: ['*'] \u2014 t\u00fcm HTTP metotlar\u0131"))
    story.append(b("allow_headers: ['*'] \u2014 t\u00fcm headerlar"))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 6 — API ENDPOINT REFERANSI
# ══════════════════════════════════════════════════════════════
def build_section_6(story):
    story.append(p("6. API Endpoint Referans\u0131", "h1"))
    story.append(hr())
    story.append(p(
        "Sistemde toplam <b>78+ RESTful endpoint</b> bulunmaktad\u0131r. T\u00fcm endpointler JSON format\u0131nda "
        "veri al\u0131\u015fveri\u015fi yapar (application/json), dosya y\u00fcklemeleri multipart/form-data kullan\u0131r."
    ))

    # Vehicles & Variants
    story.append(p("6.1 Ara\u00e7 ve Varyant API (9 Endpoint)", "h2"))
    story.append(p("<b>Prefix:</b> /api/v1  |  <b>Tags:</b> Vehicles &amp; Variants"))
    ep1 = [
        ["Metot", "Path", "Response", "A\u00e7\u0131klama"],
        ["GET", "/vehicles", "list[VehicleResponse]", "T\u00fcm ara\u00e7lar. ?category= filtresi"],
        ["GET", "/vehicles/{id}", "Vehicle + variants", "Ara\u00e7 detay\u0131 + varyant listesi"],
        ["POST", "/vehicles", "VehicleResponse", "Yeni ara\u00e7 olu\u015ftur"],
        ["GET", "/variants", "list[VariantResponse]", "Varyant listesi. ?vehicle_id= ?search="],
        ["GET", "/variants/{id}", "VariantDetail", "Varyant tam detay\u0131 (60+ alan)"],
        ["GET", "/variants/{id}/fuel-map", "list[FuelMapPoint]", "Motor yak\u0131t haritas\u0131 noktalar\u0131"],
        ["GET", "/variants/{id}/load-curves", "list[LoadCurvePoint]", "Tam y\u00fck/s\u00fcrt\u00fcnme e\u011frisi"],
        ["GET", "/variants/{id}/gear-ratios", "list[GearRatioItem]", "Vites oranlar\u0131 listesi"],
        ["POST", "/variants/compare", "list[ComparisonItem]", "2-10 varyant kar\u015f\u0131la\u015ft\u0131rma"],
    ]
    story.append(make_table(ep1[0], ep1[1:], [14*mm, 38*mm, 32*mm, CONTENT_W - 84*mm]))

    # CO2 & Fleet
    story.append(p("6.2 CO\u2082 ve Filo API (25 Endpoint)", "h2"))
    story.append(p("<b>Prefix:</b> /api/v1/co2  |  <b>Tags:</b> CO\u2082 &amp; Fleet"))
    ep2 = [
        ["Metot", "Path", "A\u00e7\u0131klama"],
        ["POST", "/import-result", "Tek VECTO sonu\u00e7 XML y\u00fckle (RSLT_CUSTOMER / RSLT_MANUFACTURER)"],
        ["POST", "/import-result-directory", "Dizinden toplu sonu\u00e7 import"],
        ["GET", "/fleet-emissions", "Filo bazl\u0131 CO\u2082 emisyon \u00f6zeti"],
        ["GET", "/digital-twin/{variant_code}", "Varyant dijital ikiz detay\u0131"],
        ["GET", "/digital-twin-list", "T\u00fcm dijital ikiz listesi"],
        ["POST", "/migrate-tyres", "Lastik verisi migration (v3\u2192v4)"],
        ["GET", "/variants-hub", "Varyant hub \u2014 \u00f6zet metrikler"],
        ["POST", "/compare-models", "Model bazl\u0131 kar\u015f\u0131la\u015ft\u0131rma"],
        ["POST", "/compare-variants", "Varyant detayl\u0131 kar\u015f\u0131la\u015ft\u0131rma"],
        ["POST", "/import-output-directory", "VECTO \u00e7\u0131kt\u0131 dizini import"],
        ["GET", "/variant-results", "VIN bazl\u0131 sonu\u00e7 listesi"],
        ["GET", "/variant-results/{vin}", "VIN misyon sonu\u00e7lar\u0131"],
        ["GET", "/fleet-co2-calculation", "Filo a\u011f\u0131rl\u0131kl\u0131 ortalama CO\u2082"],
        ["POST", "/fleet-count", "Filo ara\u00e7 say\u0131s\u0131 g\u00fcncelle"],
        ["GET", "/fleet-tracking", "Filo takip verileri"],
        ["POST", "/test-data", "Ger\u00e7ek test sonucu ekle"],
        ["GET", "/correlation", "Sim\u00fclasyon \u2194 ger\u00e7ek test korelasyonu"],
        ["GET", "/fleets", "Filo listesi"],
        ["POST", "/fleets", "Yeni filo olu\u015ftur"],
        ["GET", "/fleets/{id}", "Filo detay\u0131 + \u00fcyeleri"],
        ["PUT", "/fleets/{id}", "Filo g\u00fcncelle"],
        ["DELETE", "/fleets/{id}", "Filo sil"],
        ["POST", "/fleets/compare", "Filolar aras\u0131 kar\u015f\u0131la\u015ft\u0131rma"],
        ["GET", "/benchmark", "Sekt\u00f6r k\u0131yaslama verileri"],
        ["GET", "/vecto-results", "T\u00fcm sertifikal\u0131 VECTO sonu\u00e7lar\u0131"],
    ]
    story.append(make_table(ep2[0], ep2[1:], [14*mm, 40*mm, CONTENT_W - 54*mm]))

    # Auth
    story.append(p("6.3 Kimlik Do\u011frulama API (9 Endpoint)", "h2"))
    story.append(p("<b>Prefix:</b> /api/v1/auth  |  <b>Tags:</b> auth"))
    ep3 = [
        ["Metot", "Path", "Yetki", "A\u00e7\u0131klama"],
        ["POST", "/login", "\u2014", "Kullan\u0131c\u0131 ad\u0131/\u015fifre ile JWT token al"],
        ["GET", "/me", "Bearer", "Mevcut kullan\u0131c\u0131 profili"],
        ["POST", "/change-password", "Bearer", "\u015eifre de\u011fi\u015ftir (eski do\u011frulamal\u0131)"],
        ["GET", "/users", "Admin", "T\u00fcm kullan\u0131c\u0131lar\u0131 listele (+roller)"],
        ["POST", "/users", "Admin", "Yeni kullan\u0131c\u0131 olu\u015ftur"],
        ["PUT", "/users/{id}", "Admin", "Kullan\u0131c\u0131 g\u00fcncelle"],
        ["DELETE", "/users/{id}", "Admin", "Kullan\u0131c\u0131 sil (kendini silemez)"],
        ["POST", "/users/{id}/reset-password", "Admin", "\u015eifreyi varsay\u0131lana s\u0131f\u0131rla"],
        ["GET", "/roles", "Bearer", "T\u00fcm rolleri listele"],
    ]
    story.append(make_table(ep3[0], ep3[1:], [14*mm, 36*mm, 16*mm, CONTENT_W - 66*mm]))

    # Analysis
    story.append(p("6.4 Analiz API (4 Endpoint)", "h2"))
    story.append(p("<b>Prefix:</b> /api/v1/analysis  |  <b>Tags:</b> Analysis &amp; Insights"))
    ep4 = [
        ["Metot", "Path", "A\u00e7\u0131klama"],
        ["GET", "/rankings", "Metrik bazl\u0131 varyant s\u0131ralamas\u0131 (?metric= ?category=)"],
        ["GET", "/insights", "Otomatik \u00fcretilen i\u00e7 g\u00f6r\u00fcler ve tavsiyeler"],
        ["GET", "/compare-detailed", "\u00c7oklu varyant detayl\u0131 kar\u015f\u0131la\u015ft\u0131rma"],
        ["GET", "/fleet-summary", "Filo \u00f6zet istatistikleri"],
    ]
    story.append(make_table(ep4[0], ep4[1:], [14*mm, 38*mm, CONTENT_W - 52*mm]))

    # Others
    story.append(p("6.5 Di\u011fer API Gruplar\u0131", "h2"))
    ep5 = [
        ["Grup (Endpoint Say\u0131s\u0131)", "Prefix", "Temel \u0130\u015flevler"],
        ["VSUM Analytics (11)", "/api/v1/vsum-analytics", "Enerji Sankey, vites da\u011f\u0131l\u0131m\u0131, y\u00fckleme hassasiyeti, ADAS etkisi"],
        ["\u0130\u00e7e Aktarma (5)", "/api/v1 (import/...)", "Tekli/toplu XML y\u00fckleme, dizin import, log takibi, istatistikler"],
        ["PDF Rapor (2)", "/api/pdf-report", "PDF rapor \u00fcretimi ve \u00f6nizleme"],
        ["Dashboard (2)", "/api/v1/dashboard", "Hava durumu ve haber ak\u0131\u015f\u0131"],
        ["BOM API (35+)", "/bom-api (ayr\u0131 servis)", "Proje CRUD, malzeme, takvim, takip, maliyet, audit, entegrasyon"],
    ]
    story.append(make_table(ep5[0], ep5[1:], [30*mm, 36*mm, CONTENT_W - 66*mm]))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 7 — K\u0130ML\u0130K DO\u011eRULAMA
# ══════════════════════════════════════════════════════════════
def build_section_7(story):
    story.append(p("7. Kimlik Do\u011frulama ve Yetkilendirme", "h1"))
    story.append(hr())
    story.append(p(
        "Sistem, end\u00fcstri standard\u0131 JWT (JSON Web Token) tabanl\u0131 kimlik do\u011frulama kullan\u0131r. "
        "Kullan\u0131c\u0131 \u015fifreleri bcrypt ile hash'lenir (salt round otomatik), tokenlar HS256 algoritmas\u0131 "
        "ile imzalan\u0131r."
    ))

    story.append(p("7.1 Kimlik Do\u011frulama Ak\u0131\u015f\u0131", "h2"))
    auth_flow = [
        ["Ad\u0131m", "\u0130\u015flem", "Detay"],
        ["1", "POST /api/v1/auth/login", "Kullan\u0131c\u0131 ad\u0131 + \u015fifre g\u00f6nderilir"],
        ["2", "bcrypt.checkpw()", "\u015eifre, veritaban\u0131ndaki hash ile kar\u015f\u0131la\u015ft\u0131r\u0131l\u0131r"],
        ["3", "JWT token \u00fcretimi", "sub=username, role=role_name, exp=now+480min"],
        ["4", "Token d\u00f6nd\u00fcr\u00fcl\u00fcr", "{access_token, token_type, user: {id, username, role, ...}}"],
        ["5", "Her istek: Authorization", "Bearer &lt;token&gt; format\u0131nda g\u00f6nderilir"],
        ["6", "get_current_user()", "Token decode \u2192 users JOIN roles \u2192 kullan\u0131c\u0131 dict"],
        ["7", "Rol kontrol\u00fc", "require_admin() veya endpoint bazl\u0131 kontrol"],
    ]
    story.append(make_table(auth_flow[0], auth_flow[1:], [14*mm, 38*mm, CONTENT_W - 52*mm]))

    story.append(p("7.2 JWT Token Yap\u0131s\u0131", "h2"))
    story.append(p('<b>Header:</b> {"alg": "HS256", "typ": "JWT"}'))
    story.append(p('<b>Payload:</b> {"sub": "username", "role": "admin", "exp": 1718928000}'))
    story.append(p("<b>Signature:</b> HMACSHA256(header + payload, SECRET_KEY)"))
    story.append(sp(2))
    story.append(b("Token \u00f6mr\u00fc: 480 dakika (8 saat) \u2014 bir i\u015f g\u00fcn\u00fc boyunca ge\u00e7erli"))
    story.append(b("Token yenileme: Mevcut implementasyonda refresh token yok, expiry'de yeniden login"))
    story.append(b("OAuth2PasswordBearer: FastAPI dependency injection ile otomatik token yakalama"))

    story.append(p("7.3 \u015eifre G\u00fcvenli\u011fi", "h2"))
    story.append(b("Hash algoritmas\u0131: bcrypt (adaptive cost function)"))
    story.append(b("Salt: bcrypt.gensalt() \u2014 her hash'te benzersiz salt"))
    story.append(b("Do\u011frulama: bcrypt.checkpw(password.encode(), hashed) \u2014 timing-safe kar\u015f\u0131la\u015ft\u0131rma"))
    story.append(b("Varsay\u0131lan admin \u015fifresi: Seed data ile olu\u015fturulur, production'da de\u011fi\u015ftirilmeli"))
    story.append(b("\u015eifre s\u0131f\u0131rlama: Admin taraf\u0131ndan, varsay\u0131lan \u015fifreye d\u00f6ner"))

    story.append(p("7.4 Yetkilendirme Matrisi", "h2"))
    auth_matrix = [
        ["\u0130\u015flem", "admin", "manager", "analyst", "viewer", "engineering", "entegration"],
        ["Veri g\u00f6r\u00fcnt\u00fcleme", "\u2713", "\u2713", "\u2713", "\u2713", "\u2713", "\u2713"],
        ["Veri import", "\u2713", "\u2713", "\u2014", "\u2014", "\u2014", "\u2014"],
        ["Veri export", "\u2713", "\u2713", "\u2713", "\u2014", "\u2014", "\u2713"],
        ["Analiz \u00e7al\u0131\u015ft\u0131rma", "\u2713", "\u2713", "\u2713", "\u2014", "\u2014", "\u2014"],
        ["Kullan\u0131c\u0131 y\u00f6netimi", "\u2713", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
        ["BOM i\u015flemleri", "\u2713", "\u2713", "\u2014", "\u2014", "\u2014", "\u2713"],
        ["A\u011f\u0131rl\u0131k hesaplama", "\u2713", "\u2014", "\u2014", "\u2014", "\u2713", "\u2014"],
        ["Homologasyon", "\u2713", "\u2014", "\u2014", "\u2014", "\u2713", "\u2014"],
    ]
    story.append(make_colored_table(auth_matrix[0], auth_matrix[1:], header_bg=HexColor("#1e3a5f")))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 8 — FRONTEND M\u0130MAR\u0130S\u0130
# ══════════════════════════════════════════════════════════════
def build_section_8(story):
    story.append(p("8. Frontend Mimarisi (React)", "h1"))
    story.append(hr())
    story.append(p(
        "Frontend, React 18.3 ile geli\u015ftirilmi\u015f tek sayfa uygulamas\u0131d\u0131r (SPA). Vite 4.x build tool, "
        "Tailwind CSS 3.x utility-first CSS framework, Motion (Framer Motion) 11.18 animasyon k\u00fct\u00fcphanesi "
        "ve Recharts 2.15 grafik k\u00fct\u00fcphanesi kullan\u0131l\u0131r."
    ))

    story.append(p("8.1 Navigasyon Yap\u0131s\u0131 (7 Grup, 19 Sayfa)", "h2"))
    nav_data = [
        ["Grup", "Sayfa", "Bile\u015fen", "\u0130\u015flev"],
        ["Genel", "dashboard", "DashboardPage", "G\u00f6sterge paneli \u2014 istatistikler, grafikler"],
        ["", "variants", "VariantList / VariantDetail", "Ara\u00e7 varyant listesi ve detay"],
        ["", "variant-outputs", "VariantOutputsPanel", "VECTO \u00e7\u0131kt\u0131 dosyalar\u0131 y\u00f6netimi"],
        ["M\u00fchendislik", "co2", "CO2Panel", "CO\u2082 emisyon analizi ve raporlama"],
        ["", "fleet-calculation", "FleetCalculationPanel", "Filo bazl\u0131 CO\u2082 hesaplama"],
        ["", "digital-twin", "DigitalTwinPanel", "Ara\u00e7 dijital ikiz g\u00f6rselle\u015ftirme"],
        ["", "weight", "WeightCalcPanel", "A\u011f\u0131rl\u0131k hesaplama mod\u00fcl\u00fc"],
        ["", "enerji", "EnerjiAnaliziPanel", "VSUM enerji analizi"],
        ["", "benchmark", "BenchmarkPanel", "Sekt\u00f6r k\u0131yaslama"],
        ["Entegrasyon", "bom", "BomProjectsPanel / Detail", "BOM proje y\u00f6netimi (\u00e7ift g\u00f6r\u00fcn\u00fcm)"],
        ["", "materials", "MaterialsPanel", "Malzeme veritaban\u0131"],
        ["", "import", "ImportPanel", "VECTO XML i\u00e7e aktarma"],
        ["Sim\u00fclasyon", "virtual-test", "VirtualTestPanel", "Sanal test senaryolar\u0131"],
        ["Filo &amp; Analiz", "fleet-tracking", "FleetTrackingPanel", "Filo ger\u00e7ek zamanl\u0131 takip"],
        ["", "insights", "InsightsPanel", "Otomatik analiz bulgular\u0131"],
        ["", "rankings", "RankingsPanel", "Varyant performans s\u0131ralamas\u0131"],
        ["Homologasyon", "homologasyon", "HomologasyonPanel", "Reg\u00fclasyon takip sistemi"],
        ["Y\u00f6netim", "admin", "AdminPanel", "Kullan\u0131c\u0131 ve rol y\u00f6netimi (admin only)"],
    ]
    story.append(make_table(nav_data[0], nav_data[1:], [22*mm, 24*mm, 38*mm, CONTENT_W - 84*mm]))

    story.append(p("8.2 Teknoloji Stack Detay\u0131", "h2"))
    tech = [
        ["Teknoloji", "Versiyon", "Kullan\u0131m Alan\u0131"],
        ["React", "18.3", "UI bile\u015fen k\u00fct\u00fcphanesi \u2014 hooks, context, SPA"],
        ["Vite", "4.x", "Build tool \u2014 HMR, proxy, ESBuild bundling"],
        ["Tailwind CSS", "3.x", "Utility-first CSS \u2014 responsive, dark mode"],
        ["Motion (Framer)", "11.18.0", "Sayfa ge\u00e7i\u015fleri, bile\u015fen animasyonlar\u0131"],
        ["Recharts", "2.15", "Grafik bile\u015fenleri (Area, Bar, Radar, Pie)"],
        ["jsPDF", "\u2014", "\u0130stemci-tarafl\u0131 PDF \u00fcretimi"],
        ["html2canvas", "\u2014", "DOM \u2192 canvas \u2192 PDF d\u00f6n\u00fc\u015f\u00fcm\u00fc"],
        ["lucide-react", "\u2014", "SVG ikon k\u00fct\u00fcphanesi (500+ ikon)"],
    ]
    story.append(make_table(tech[0], tech[1:], [28*mm, 20*mm, CONTENT_W - 48*mm]))

    story.append(p("8.3 State Management ve Context", "h2"))
    story.append(b("<b>AuthContext:</b> Kullan\u0131c\u0131 oturum durumu, JWT token, login/logout fonksiyonlar\u0131"))
    story.append(b("<b>ThemeContext:</b> Tema y\u00f6netimi (dark/light mode ge\u00e7i\u015fi)"))
    story.append(b("<b>Yerel state:</b> useState/useEffect ile bile\u015fen bazl\u0131 veri y\u00f6netimi"))
    story.append(b("<b>API katman\u0131:</b> api.js (ana backend) + bomApi.js (BOM servisi) \u2014 merkezi fetch wrapper"))

    story.append(p("8.4 API \u0130stemci Katman\u0131", "h2"))
    story.append(p(
        "Frontend'de iki API istemci mod\u00fcl\u00fc bulunur. <b>api.js</b> ana backend ile, <b>bomApi.js</b> "
        "BOM servisi ile ileti\u015fimi y\u00f6netir. Her iki mod\u00fcl de fetch API \u00fczerinde merkezi hata y\u00f6netimi, "
        "JWT token ekleme ve base URL konfig\u00fcrasyonu sa\u011flar."
    ))
    api_stats = [
        ["Mod\u00fcl", "Base URL", "Fonksiyon Say\u0131s\u0131", "Kategoriler"],
        ["api.js", "/api/v1", "40+", "Dashboard, Vehicles, Variants, Analysis, Import, CO\u2082, Digital Twin, Fleet, VSUM"],
        ["bomApi.js", "/bom-api", "35+", "Projects, Materials, Calendar, SubTasks, FollowUps, Costs, Audit, Integration"],
    ]
    story.append(make_table(api_stats[0], api_stats[1:], [22*mm, 20*mm, 22*mm, CONTENT_W - 64*mm]))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 9 — VER\u0130 AKI\u015eI VE \u0130\u015e MANTIĞI
# ══════════════════════════════════════════════════════════════
def build_section_9(story):
    story.append(p("9. Veri Ak\u0131\u015f\u0131 ve \u0130\u015f Mant\u0131\u011f\u0131", "h1"))
    story.append(hr())

    story.append(p("9.1 VECTO XML \u0130\u00e7e Aktarma S\u00fcreci", "h2"))
    story.append(p(
        "VECTO XML dosyalar\u0131 iki farkl\u0131 endpoint \u00fczerinden sisteme aktar\u0131l\u0131r. Tekli y\u00fckleme "
        "(/import/upload) ve toplu y\u00fckleme (/import/upload-bulk). Her iki durumda da ayn\u0131 "
        "parse pipeline \u00e7al\u0131\u015f\u0131r:"
    ))
    import_steps = [
        ["Ad\u0131m", "\u0130\u015flem", "Detay"],
        ["1", "Dosya al\u0131m\u0131", "multipart/form-data ile XML dosya(lar) al\u0131n\u0131r"],
        ["2", "XML Parse", "ElementTree ile XML a\u011fac\u0131 olu\u015fturulur"],
        ["3", "Model e\u015fle\u015ftirme", "XML'deki ara\u00e7 ad\u0131 ile vehicles tablosu sorgulan\u0131r; yoksa olu\u015fturulur"],
        ["4", "Varyant olu\u015fturma", "60+ alan XML'den extract edilir \u2192 vehicle_variants INSERT"],
        ["5", "Alt veri extract", "Yak\u0131t haritas\u0131, y\u00fck e\u011frisi, vites oranlar\u0131 \u2192 bulk INSERT"],
        ["6", "Tork konvert\u00f6r", "Varsa tork konvert\u00f6r karakteristi\u011fi extract + INSERT"],
        ["7", "Aks kay\u0131p haritas\u0131", "Aks kay\u0131p verileri extract + INSERT"],
        ["8", "\u0130mport log", "import_logs tablosuna ba\u015far\u0131/hata kayd\u0131 + kay\u0131t say\u0131lar\u0131"],
    ]
    story.append(make_table(import_steps[0], import_steps[1:], [14*mm, 28*mm, CONTENT_W - 42*mm]))

    story.append(p("9.2 CO\u2082 Sonu\u00e7 Import S\u00fcreci", "h2"))
    story.append(p(
        "VECTO sim\u00fclasyon sonu\u00e7 dosyalar\u0131 (RSLT_CUSTOMER, RSLT_MANUFACTURER) ayr\u0131 bir pipeline ile "
        "i\u015flenir. Bu dosyalar birden fazla misyon\u00d7y\u00fckleme kombinasyonu i\u00e7erir."
    ))
    story.append(b("Dosya tipi tespiti: XML root element analizi (RSLT_CUSTOMER vs RSLT_MANUFACTURER)"))
    story.append(b("VIN e\u015fle\u015ftirme: Sonu\u00e7 dosyas\u0131ndaki VIN ile vehicle_variants tablosu sorgulan\u0131r"))
    story.append(b("\u00c7oklu kay\u0131t: Her misyon\u00d7y\u00fckleme kombinasyonu ayr\u0131 bir sat\u0131r olarak kaydedilir"))
    story.append(b("\u00d6zet sat\u0131r\u0131: is_summary=True ile a\u011f\u0131rl\u0131kl\u0131 ortalama de\u011ferler ayr\u0131ca saklan\u0131r"))

    story.append(p("9.3 Filo CO\u2082 Hesaplama Mant\u0131\u011f\u0131", "h2"))
    story.append(p(
        "AB reg\u00fclasyonu gere\u011fi filo bazl\u0131 a\u011f\u0131rl\u0131kl\u0131 ortalama CO\u2082 de\u011feri hesaplan\u0131r. "
        "Her varyant\u0131n fleet_count de\u011feri a\u011f\u0131rl\u0131k katsay\u0131s\u0131 olarak kullan\u0131l\u0131r."
    ))
    story.append(p(
        "<b>Form\u00fcl:</b> Filo CO\u2082 = \u03a3(varyant_co2 \u00d7 fleet_count) / \u03a3(fleet_count)", "code"
    ))
    story.append(b("Misyon bazl\u0131 hesaplama: Urban, Suburban, Interurban ayr\u0131m\u0131"))
    story.append(b("Y\u00fckleme bazl\u0131 hesaplama: LowLoad, RefLoad, FullLoad ayr\u0131m\u0131"))
    story.append(b("Birim: g/km, g/pkm, l/100km \u2014 \u00fc\u00e7 farkl\u0131 birimde raporlama"))

    story.append(p("9.4 Digital Twin Veri Ak\u0131\u015f\u0131", "h2"))
    story.append(p(
        "Digital Twin mod\u00fcl\u00fc, bir varyant\u0131n t\u00fcm teknik verilerini tek bir g\u00f6r\u00fcn\u00fcmde birle\u015ftirir: "
        "ara\u00e7 konfig\u00fcrasyonu, motor parametreleri, yak\u0131t haritas\u0131 3D y\u00fczeyi, y\u00fck e\u011frileri, vites "
        "oranlar\u0131, sim\u00fclasyon sonu\u00e7lar\u0131 ve ger\u00e7ek test kar\u015f\u0131la\u015ft\u0131rmas\u0131."
    ))
    story.append(b("Endpoint: GET /api/v1/co2/digital-twin/{variant_code}"))
    story.append(b("Veri kaynaklar\u0131: vehicle_variants + fuel_consumption_maps + full_load_drag_curves + gear_ratios + vecto_results_certified + real_test_results"))
    story.append(b("Response: Tek JSON objesi i\u00e7inde t\u00fcm ili\u015fkili veriler (nested)"))

    story.append(p("9.5 Korelasyon Analizi", "h2"))
    story.append(p(
        "Sim\u00fclasyon sonu\u00e7lar\u0131 (vecto_results_certified) ile ger\u00e7ek test sonu\u00e7lar\u0131 (real_test_results) "
        "aras\u0131ndaki sapma analiz edilir. Bu, VECTO sim\u00fclasyonunun g\u00fcvenilirli\u011fini do\u011frulamak i\u00e7in "
        "kritik bir metriktir."
    ))
    story.append(b("E\u015fle\u015ftirme: variant_id \u00fczerinden JOIN"))
    story.append(b("Sapma hesab\u0131: (ger\u00e7ek - sim\u00fclasyon) / sim\u00fclasyon \u00d7 100 = % sapma"))
    story.append(b("G\u00f6rselle\u015ftirme: Scatter plot (sim\u00fclasyon vs ger\u00e7ek) + regression line"))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 10 — BOM ENTEGRASYON
# ══════════════════════════════════════════════════════════════
def build_section_10(story):
    story.append(p("10. BOM Entegrasyon Sistemi", "h1"))
    story.append(hr())
    story.append(p(
        "BOM (Bill of Materials) entegrasyon sistemi, ayr\u0131 bir FastAPI servisi olarak \u00e7al\u0131\u015f\u0131r "
        "(port 8001) ve kendi PostgreSQL veritaban\u0131na (bomdb, port 5434) sahiptir. Excel dosyalar\u0131ndan "
        "BOM verisi import eder, seviye hiyerar\u015fisi olu\u015fturur ve SAP entegrasyonu i\u00e7in veri haz\u0131rlar."
    ))

    story.append(p("10.1 BOM Servisi Mimarisi", "h2"))
    bom_arch = [
        ["Bile\u015fen", "Teknoloji", "Sorumluluk"],
        ["bom-backend", "FastAPI + SQLAlchemy", "REST API, Excel parse, i\u015f mant\u0131\u011f\u0131"],
        ["bom-db", "PostgreSQL 16", "Proje, malzeme, takvim, maliyet verileri"],
        ["Frontend (payla\u015f\u0131ml\u0131)", "React (BomProjectsPanel)", "Proje listesi, detay, entegrasyon UI"],
    ]
    story.append(make_table(bom_arch[0], bom_arch[1:], [30*mm, 35*mm, CONTENT_W - 65*mm]))

    story.append(p("10.2 BOM API Kategorileri (35+ Endpoint)", "h2"))
    bom_cats = [
        ["Kategori", "Endpoint Say\u0131s\u0131", "Temel \u0130\u015flevler"],
        ["Proje Y\u00f6netimi", "12", "Upload, CRUD, navigation, export, kalem tipi, reprocess"],
        ["Malzeme Veritaban\u0131", "6", "CRUD, MM03 import, arama, saya\u00e7"],
        ["Takvim (Test)", "8", "Otob\u00fcs CRUD, g\u00f6rev CRUD, bottleneck, Excel/PDF export"],
        ["Alt G\u00f6revler", "4", "G\u00f6rev alt\u0131 i\u015f kalemleri CRUD"],
        ["Takip (Follow-Up)", "4", "Durum takibi \u2014 proje bazl\u0131 filtreleme"],
        ["Maliyet", "5", "Maliyet kayd\u0131 CRUD + \u00f6zet raporu"],
        ["Denetim (Audit)", "2", "\u0130\u015flem log kayd\u0131 + ge\u00e7mi\u015f sorgu"],
        ["Entegrasyon", "9", "SAP entegrasyon upload, onay s\u00fcreci, \u015fablon"],
    ]
    story.append(make_table(bom_cats[0], bom_cats[1:], [28*mm, 22*mm, CONTENT_W - 50*mm]))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 11 — PERFORMANS
# ══════════════════════════════════════════════════════════════
def build_section_11(story):
    story.append(p("11. Performans, \u00d6l\u00e7eklenebilirlik ve Cache", "h1"))
    story.append(hr())

    story.append(p("11.1 Async I/O Mimarisi", "h2"))
    story.append(p(
        "FastAPI'nin async/await deste\u011fi sayesinde t\u00fcm veritaban\u0131 ve I/O i\u015flemleri non-blocking "
        "ger\u00e7ekle\u015fir. Bu, tek bir Python process'in y\u00fczlerce e\u015fzamanl\u0131 iste\u011fi event loop ile "
        "y\u00f6netmesine olanak tan\u0131r \u2014 thread-per-request modeline g\u00f6re \u00e7ok daha verimli."
    ))
    story.append(b("asyncpg: PostgreSQL C-extension driver \u2014 sync psycopg2'ye g\u00f6re 2-3x h\u0131zl\u0131"))
    story.append(b("AsyncSession: Sorgu s\u0131ras\u0131nda event loop bloklanmaz"))
    story.append(b("pool_size=20 + max_overflow=10: Maksimum 30 e\u015fzamanl\u0131 DB ba\u011flant\u0131s\u0131"))

    story.append(p("11.2 Redis Cache Stratejisi", "h2"))
    story.append(p(
        "Redis 7, session cache, s\u0131k sorgulanan verilerin cache'lenmesi ve rate limiting i\u00e7in "
        "kullan\u0131l\u0131r. Kal\u0131c\u0131 veri depolama (AOF/RDB) aktiftir."
    ))
    story.append(b("Dashboard istatistikleri: 5 dakika TTL ile cache'lenir"))
    story.append(b("Varyant listesi: Kategori bazl\u0131 cache key ile saklan\u0131r"))
    story.append(b("Analiz sonu\u00e7lar\u0131: Parameter hash \u2192 result cache"))

    story.append(p("11.3 Veritaban\u0131 Optimizasyonu", "h2"))
    story.append(b("<b>14+ B-tree indeks:</b> S\u0131k sorgulanan kolonlar (category, variant_code, vin, status)"))
    story.append(b("<b>pg_trgm extension:</b> Trigram bazl\u0131 benzerlik aramas\u0131 (%LIKE% sorgular\u0131n\u0131 h\u0131zland\u0131r\u0131r)"))
    story.append(b("<b>JSON kolonlar:</b> Esnek \u015fema gerektiren veriler (pneumatic_config, hvac_config, raw_xml_data)"))
    story.append(b("<b>Partial index potansiyeli:</b> is_active=True, is_summary=True gibi filtreler"))
    story.append(b("<b>View:</b> v_variant_summary \u2014 s\u0131k kullan\u0131lan JOIN'i \u00f6nceden tan\u0131mlar"))

    story.append(p("11.4 \u00d6l\u00e7eklenebilirlik Yolu", "h2"))
    story.append(p(
        "Mevcut mimari dikey \u00f6l\u00e7eklendirme (vertical scaling) i\u00e7in optimize edilmi\u015f olup, "
        "yatay \u00f6l\u00e7eklendirme (horizontal scaling) i\u00e7in a\u015fa\u011f\u0131daki stratejiler uygulanabilir:"
    ))
    story.append(b("Backend replika: Docker Compose'da backend servisini scale=3 ile \u00e7o\u011faltma"))
    story.append(b("PostgreSQL read replica: Analiz sorgular\u0131n\u0131 replica'ya y\u00f6nlendirme"))
    story.append(b("Redis Cluster: Cache kapasitesini art\u0131rma"))
    story.append(b("CDN: Frontend static asset'leri CDN \u00fczerinden da\u011f\u0131tma"))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 12 — G\u00dcVENL\u0130K
# ══════════════════════════════════════════════════════════════
def build_section_12(story):
    story.append(p("12. G\u00fcvenlik Mimarisi", "h1"))
    story.append(hr())
    story.append(p(
        "Platform, OWASP Top 10 g\u00fcvenlik risklerine kar\u015f\u0131 \u00e7oklu savunma katman\u0131 uygular."
    ))
    sec_layers = [
        ["Katman", "Mekanizma", "Korunan Risk"],
        ["Kimlik Do\u011frulama", "JWT + bcrypt + OAuth2", "Yetkisiz eri\u015fim"],
        ["Yetkilendirme", "RBAC (7 rol, permission dizileri)", "Yetki y\u00fckseltme"],
        ["Input Validasyon", "Pydantic v2 \u015fema validasyonu", "Injection sald\u0131r\u0131lar\u0131"],
        ["SQL Injection", "SQLAlchemy ORM (parameterized queries)", "Veritaban\u0131 s\u0131z\u0131nt\u0131s\u0131"],
        ["CORS", "Whitelist bazl\u0131 origin kontrol\u00fc", "Cross-origin sald\u0131r\u0131lar\u0131"],
        ["XSS", "React DOM escaping + JSON API", "Script injection"],
        ["Ortam \u0130zolasyonu", "Docker konteyner izolasyonu", "Sistem eri\u015fimi"],
        ["Secret Y\u00f6netimi", ".env dosyas\u0131 + ortam de\u011fi\u015fkenleri", "Credential s\u0131z\u0131nt\u0131s\u0131"],
        ["Veri B\u00fct\u00fcnl\u00fc\u011f\u00fc", "FK constraints + CASCADE + NOT NULL", "Tutars\u0131z veri"],
        ["Audit Trail", "import_logs + audit_logs tablolar\u0131", "\u0130zlenebilirlik"],
    ]
    story.append(make_table(sec_layers[0], sec_layers[1:], [28*mm, 48*mm, CONTENT_W - 76*mm]))

    story.append(p("12.1 OWASP Uyumluluk Detay\u0131", "h2"))
    owasp = [
        ["OWASP Risk", "Uygulanan \u00d6nlem"],
        ["A01: Broken Access Control", "RBAC + JWT middleware + admin-only endpointler"],
        ["A02: Cryptographic Failures", "bcrypt hash + HS256 JWT + production'da secret rotation"],
        ["A03: Injection", "SQLAlchemy parameterized queries + Pydantic validasyon"],
        ["A04: Insecure Design", "Async architecture + proper error handling + input bounds"],
        ["A05: Security Misconfiguration", "Docker izolasyon + .env bazl\u0131 konfig\u00fcrasyon"],
        ["A06: Vulnerable Components", "Pinned versions (requirements.txt) + Alpine base images"],
        ["A07: Auth Failures", "bcrypt + timing-safe comparison + account lockout (roadmap)"],
        ["A08: Software/Data Integrity", "Docker image integrity + volume persistence + FK constraints"],
        ["A09: Logging Failures", "import_logs + audit_logs + structured logging"],
        ["A10: SSRF", "Backend-only external calls + URL whitelist"],
    ]
    story.append(make_table(owasp[0], owasp[1:], [42*mm, CONTENT_W - 42*mm]))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 13 — M\u0130GRAT\u0130ON STRATEJ\u0130S\u0130
# ══════════════════════════════════════════════════════════════
def build_section_13(story):
    story.append(p("13. Migration ve Veritaban\u0131 Evrim Stratejisi", "h1"))
    story.append(hr())
    story.append(p(
        "Veritaban\u0131 \u015femas\u0131, art\u0131ml\u0131 (incremental) migration dosyalar\u0131 ile evrimle\u015ftirilir. "
        "Her migration dosyas\u0131 geri d\u00f6n\u00fc\u015f\u00fcms\u00fcz (forward-only) ALTER TABLE ve CREATE TABLE "
        "ifadeleri i\u00e7erir. Bu yakla\u015f\u0131m, production veritaban\u0131nda veri kayb\u0131 olmadan \u015fema "
        "de\u011fi\u015fikli\u011fi yap\u0131lmas\u0131n\u0131 sa\u011flar."
    ))
    migrations = [
        ["Migration", "\u0130\u00e7erik", "Eklenen Kolon/Tablo"],
        ["init.sql (v1)", "Temel \u015fema olu\u015fturma", "11 tablo + 14 indeks + trigger + view + 5 ENUM"],
        ["migration_v2.sql", "CO\u2082 sertifika deste\u011fi", "fleet_count + vecto_results_certified (56 kolon) + 3 indeks"],
        ["migration_v3.sql", "Detayl\u0131 sim\u00fclasyon metrikleri", "9 kolon (primary_subgroup, distance, payload, h\u0131z, verimlilik) + 1 indeks"],
        ["migration_v4.sql", "\u00d6n/arka lastik ayr\u0131m\u0131", "12 kolon (front/rear \u00d7 manufacturer, model, dim, rrc, fz_iso, twin_tyres)"],
        ["migration_v5.sql", "Kullan\u0131c\u0131 y\u00f6netimi", "roles + users tablosu + 4 seed rol + admin kullan\u0131c\u0131 + 2 indeks"],
        ["migration_v6.sql", "Departman bazl\u0131 roller", "3 yeni rol: engineering, entegration, design (JSONB permissions)"],
    ]
    story.append(make_table(migrations[0], migrations[1:], [25*mm, 32*mm, CONTENT_W - 57*mm]))

    story.append(p("13.1 Migration Uygulama S\u0131ras\u0131", "h2"))
    story.append(p(
        "Migration dosyalar\u0131 s\u0131ral\u0131 olarak \u00e7al\u0131\u015ft\u0131r\u0131lmal\u0131d\u0131r. init.sql Docker container ilk "
        "olu\u015fturuldu\u011funda otomatik \u00e7al\u0131\u015f\u0131r (/docker-entrypoint-initdb.d/). Sonraki migration'lar "
        "manuel veya CI/CD pipeline \u00fczerinden uygulan\u0131r."
    ))
    story.append(b("init.sql \u2192 migration_v2.sql \u2192 migration_v3.sql \u2192 migration_v4.sql \u2192 migration_v5.sql \u2192 migration_v6.sql"))
    story.append(b("Her migration idempotent tasarlanm\u0131\u015ft\u0131r (IF NOT EXISTS kontrolleri)"))
    story.append(b("Geri alma (rollback): Her migration i\u00e7in ayr\u0131 rollback SQL dosyas\u0131 haz\u0131rlanmal\u0131d\u0131r (roadmap)"))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 14 — TEST VE KAL\u0130TE
# ══════════════════════════════════════════════════════════════
def build_section_14(story):
    story.append(p("14. Test ve Kalite G\u00fcvence", "h1"))
    story.append(hr())

    story.append(p("14.1 Test Stratejisi", "h2"))
    test_layers = [
        ["Katman", "Ara\u00e7", "Kapsam"],
        ["Birim Test (Unit)", "pytest + pytest-asyncio", "Model validasyonu, XML parser, hesaplama"],
        ["Entegrasyon Test", "TestClient (httpx)", "API endpoint'leri, DB i\u015flemleri, auth ak\u0131\u015f\u0131"],
        ["E2E Test", "Taray\u0131c\u0131 bazl\u0131 (potansiyel)", "Kullan\u0131c\u0131 senaryolar\u0131, i\u015f ak\u0131\u015f\u0131 do\u011frulamas\u0131"],
        ["Veri Do\u011frulama", "Pydantic v2 \u015femalar\u0131", "Her request/response otomatik validasyon"],
        ["Tip G\u00fcvenli\u011fi", "Python type hints + mypy", "Statik tip analizi"],
    ]
    story.append(make_table(test_layers[0], test_layers[1:], [28*mm, 34*mm, CONTENT_W - 62*mm]))

    story.append(p("14.2 Veri Kalite Kontrolleri", "h2"))
    story.append(b("XML parse ba\u015far\u0131s\u0131zl\u0131\u011f\u0131: import_logs'a hata mesaj\u0131 ile kay\u0131t"))
    story.append(b("Duplicate kontrol\u00fc: variant_code UNIQUE constraint \u2014 tekrar import engellenir"))
    story.append(b("Referential integrity: FK constraints ile; parent silinirse CASCADE ile alt veriler temizlenir"))
    story.append(b("NOT NULL k\u0131s\u0131tlamalar\u0131: Kritik alanlar (model_name, variant_code, vin) bo\u015f b\u0131rak\u0131lamaz"))
    story.append(b("JSON \u015fema validasyonu: Pydantic v2 ile nested JSON yap\u0131lar\u0131 do\u011frulan\u0131r"))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 15 — DEPLOYMENT
# ══════════════════════════════════════════════════════════════
def build_section_15(story):
    story.append(p("15. Deployment ve DevOps S\u00fcreci", "h1"))
    story.append(hr())

    story.append(p("15.1 Deployment Komutu", "h2"))
    story.append(p("T\u00fcm sistem tek bir komut ile ba\u015flat\u0131l\u0131r:", "body_bold"))
    story.append(p("docker-compose up -d --build", "code"))
    story.append(sp(2))

    story.append(p("15.2 Deployment Ak\u0131\u015f\u0131", "h2"))
    deploy_steps = [
        ["Ad\u0131m", "Komut/\u0130\u015flem", "A\u00e7\u0131klama"],
        ["1", "git pull origin main", "Son kod de\u011fi\u015fikliklerini \u00e7ek"],
        ["2", "docker-compose build", "De\u011fi\u015fen imajlar\u0131 yeniden olu\u015ftur"],
        ["3", "docker-compose up -d", "Konteynerleri arka planda ba\u015flat"],
        ["4", "docker-compose logs -f backend", "Backend loglar\u0131n\u0131 izle"],
        ["5", "Sa\u011fl\u0131k kontrol\u00fc", "GET /health \u2192 {status: 'ok'} do\u011frula"],
        ["6", "Migration (gerekirse)", "psql ile migration SQL dosyas\u0131n\u0131 \u00e7al\u0131\u015ft\u0131r"],
        ["7", "Smoke test", "Frontend eri\u015fimi + API endpoint testi"],
    ]
    story.append(make_table(deploy_steps[0], deploy_steps[1:], [14*mm, 40*mm, CONTENT_W - 54*mm]))

    story.append(p("15.3 Ortam De\u011fi\u015fkenleri", "h2"))
    story.append(p(
        "Production deployment'ta a\u015fa\u011f\u0131daki ortam de\u011fi\u015fkenleri .env dosyas\u0131 veya "
        "Docker environment b\u00f6l\u00fcm\u00fcnde set edilmelidir:"
    ))
    env_vars = [
        ["De\u011fi\u015fken", "Development", "Production"],
        ["DB_PASSWORD", "temsa_secure_2024", "G\u00fc\u00e7l\u00fc rastgele \u015fifre"],
        ["BOM_DB_PASSWORD", "bompass123", "G\u00fc\u00e7l\u00fc rastgele \u015fifre"],
        ["SECRET_KEY", "temsa-digital-twin-secret...", "Kriptografik rastgele key"],
        ["DEBUG", "True", "False"],
        ["CORS origins", "localhost:3000, :5173", "Production domain"],
    ]
    story.append(make_table(env_vars[0], env_vars[1:], [32*mm, 40*mm, CONTENT_W - 72*mm]))

    story.append(p("15.4 Health Check ve Monitoring", "h2"))
    story.append(b("<b>GET /:</b>  \u2192 {app, version, docs: '/docs', status: 'running'}"))
    story.append(b("<b>GET /health:</b>  \u2192 {status: 'ok'} \u2014 load balancer probe endpointi"))
    story.append(b("<b>PostgreSQL:</b> pg_isready healthcheck (5s interval, 5 retry)"))
    story.append(b("<b>\u0130mport loglar\u0131:</b> Her dosya import i\u015flemi import_logs tablosunda kaydedilir"))
    story.append(b("<b>Swagger UI:</b> /docs adresinde interaktif API dok\u00fcmantasyonu (auto-generated)"))
    story.append(PageBreak())

# ══════════════════════════════════════════════════════════════
# B\u00d6L\u00dcM 16 — SONU\u00c7
# ══════════════════════════════════════════════════════════════
def build_section_16(story):
    story.append(p("16. Sonu\u00e7 ve Teknik De\u011ferlendirme", "h1"))
    story.append(hr())
    story.append(p(
        "TEMSA Digital Twin platformu, otomotiv end\u00fcstrisinin CO\u2082 reg\u00fclasyon gereksinimlerini "
        "kar\u015f\u0131lamak \u00fczere tasarlanm\u0131\u015f, <b>production-grade bir kurumsal yaz\u0131l\u0131m sistemidir</b>. "
        "A\u015fa\u011f\u0131daki tabloda platformun teknik olgunluk de\u011ferlendirmesi \u00f6zetlenmektedir."
    ))
    eval_data = [
        ["Kriter", "De\u011ferlendirme", "Detay"],
        ["Mimari Olgunluk", "\u2605\u2605\u2605\u2605\u2606", "Mikroservis-benzeri, Docker izolasyonu, async I/O"],
        ["Veritaban\u0131 Tasar\u0131m\u0131", "\u2605\u2605\u2605\u2605\u2605", "Normalize \u015fema, 17+ tablo, ENUM, FK cascade, trigger, view, 14+ indeks"],
        ["API Tasar\u0131m\u0131", "\u2605\u2605\u2605\u2605\u2605", "78+ RESTful endpoint, OpenAPI/Swagger, Pydantic validasyon"],
        ["G\u00fcvenlik", "\u2605\u2605\u2605\u2605\u2606", "JWT + RBAC + bcrypt + CORS + SQL injection korumas\u0131"],
        ["\u00d6l\u00e7eklenebilirlik", "\u2605\u2605\u2605\u2606\u2606", "Async I/O + connection pool haz\u0131r, horizontal scaling roadmap'te"],
        ["Test Kapsam\u0131", "\u2605\u2605\u2605\u2606\u2606", "Pydantic validasyon aktif, birim test kapsam\u0131 geni\u015fletilebilir"],
        ["D\u00f6k\u00fcmantasyon", "\u2605\u2605\u2605\u2605\u2605", "Bu belge + Swagger UI + inline kod yorumlar\u0131"],
        ["DevOps", "\u2605\u2605\u2605\u2605\u2606", "Docker Compose, healthcheck, volume persistence"],
        ["Kullan\u0131c\u0131 Deneyimi", "\u2605\u2605\u2605\u2605\u2605", "19 sayfa, animasyonlu UI, responsive tasar\u0131m, dark mode"],
        ["\u0130\u015f De\u011feri", "\u2605\u2605\u2605\u2605\u2605", "AB CO\u2082 reg\u00fclasyonu uyumu, filo y\u00f6netimi, BOM entegrasyon"],
    ]
    story.append(make_colored_table(eval_data[0], eval_data[1:], header_bg=HexColor("#065f46")))

    story.append(sp(6))
    story.append(p(
        "Bu platform; veri modelleme, API tasar\u0131m\u0131, g\u00fcvenlik, frontend deneyimi ve deployment "
        "s\u00fcre\u00e7leri a\u00e7\u0131s\u0131ndan kurumsal yaz\u0131l\u0131m geli\u015ftirme standartlar\u0131n\u0131 kar\u015f\u0131lamaktad\u0131r. "
        "Tek bir geli\u015ftirme ekibi taraf\u0131ndan, modern teknoloji stack'i ile in\u015fa edilmi\u015f bu sistem, "
        "TEMSA'n\u0131n dijital d\u00f6n\u00fc\u015f\u00fcm yolculu\u011funun temel ta\u015f\u0131d\u0131r."
    ))

    story.append(sp(8))
    final_stats = [
        ["", ""],
        ["Toplam Kod Sat\u0131r\u0131 (Backend)", "15.000+ (Python)"],
        ["Toplam Kod Sat\u0131r\u0131 (Frontend)", "25.000+ (React/JSX)"],
        ["Toplam API Endpoint", "78+ (10 router mod\u00fcl\u00fc)"],
        ["Veritaban\u0131 Tablosu", "17+ (2 PostgreSQL instance)"],
        ["Docker Konteyner", "8 (4 backend + 2 DB + 1 cache + 1 frontend)"],
        ["Frontend Sayfa/Panel", "19 bile\u015fen"],
        ["Kullan\u0131c\u0131 Rol\u00fc", "7 (RBAC)"],
        ["Migration Dosyas\u0131", "6 (art\u0131ml\u0131 \u015fema evrimi)"],
        ["Varyant Kolon Say\u0131s\u0131", "60+ (vehicle_variants)"],
        ["Sertifika Sonu\u00e7 Kolonu", "56 (vecto_results_certified)"],
    ]
    t = Table(
        [[CB(r[0]), C(r[1])] for r in final_stats],
        colWidths=[55*mm, 65*mm],
    )
    t.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, TBL_BORDER),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
    ]))
    story.append(t)


# ══════════════════════════════════════════════════════════════
# ANA FONKSİYON — PDF OLUŞTURMA
# ══════════════════════════════════════════════════════════════
def main():
    output_path = os.path.join(os.path.dirname(__file__), "TEKNIK_DOKUMANTASYON_v2.pdf")
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LEFT_M,
        rightMargin=RIGHT_M,
        topMargin=18*mm,
        bottomMargin=20*mm,
        title="TEMSA Digital Twin \u2014 Teknik Dok\u00fcmantasyon v2.1",
        author="TEMSA Ar-Ge Dijital M\u00fchendislik",
        subject="Sistem Mimarisi, Veritaban\u0131, API, G\u00fcvenlik Referans\u0131",
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
    build_section_15(story)
    build_section_16(story)

    doc.build(story, onFirstPage=cover_bg, onLaterPages=header_footer)
    print(f"PDF olu\u015fturuldu: {output_path}")
    print(f"Sayfa say\u0131s\u0131: {doc.page}")


S = get_styles()

if __name__ == "__main__":
    main()