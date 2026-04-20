"""TEMSA Digital Twin — Teknik Dokümantasyon PDF Üretici"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Colors ──
TEMSA_RED = HexColor("#E30613")
DARK = HexColor("#1a1a2e")
BLUE = HexColor("#2563eb")
GRAY = HexColor("#64748b")
LIGHT_BG = HexColor("#f1f5f9")
WHITE = HexColor("#ffffff")
TABLE_HEADER_BG = HexColor("#1e293b")
TABLE_ALT_BG = HexColor("#f8fafc")
TABLE_BORDER = HexColor("#e2e8f0")
ACCENT_GREEN = HexColor("#059669")

W, H = A4

# ── Styles ──
def styles():
    s = {}
    s["title"] = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=26, leading=32, textColor=DARK, alignment=TA_LEFT, spaceAfter=4*mm)
    s["subtitle"] = ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11, leading=15, textColor=GRAY, spaceAfter=8*mm)
    s["h1"] = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=16, leading=22, textColor=DARK, spaceBefore=10*mm, spaceAfter=4*mm)
    s["h2"] = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, leading=17, textColor=BLUE, spaceBefore=6*mm, spaceAfter=3*mm)
    s["body"] = ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=14, textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=2*mm)
    s["body_bold"] = ParagraphStyle("body_bold", fontName="Helvetica-Bold", fontSize=9.5, leading=14, textColor=DARK, spaceAfter=2*mm)
    s["bullet"] = ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, leading=14, textColor=DARK, leftIndent=12*mm, bulletIndent=6*mm, spaceAfter=1.5*mm)
    s["small"] = ParagraphStyle("small", fontName="Helvetica", fontSize=8, leading=11, textColor=GRAY)
    s["toc"] = ParagraphStyle("toc", fontName="Helvetica", fontSize=10, leading=16, textColor=DARK, leftIndent=4*mm)
    s["quote"] = ParagraphStyle("quote", fontName="Helvetica-Oblique", fontSize=9, leading=13, textColor=GRAY, leftIndent=8*mm, rightIndent=8*mm, spaceBefore=3*mm, spaceAfter=3*mm)
    s["code"] = ParagraphStyle("code", fontName="Courier", fontSize=8, leading=11, textColor=DARK, leftIndent=6*mm, spaceAfter=2*mm, backColor=LIGHT_BG)
    return s

def make_table(headers, rows, col_widths=None):
    data = [headers] + rows
    if not col_widths:
        col_widths = [None] * len(headers)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("LEADING", (0, 0), (-1, -1), 13),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.4, TABLE_BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TABLE_ALT_BG]),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=TABLE_BORDER, spaceAfter=4*mm, spaceBefore=2*mm)

def header_footer(canvas, doc):
    canvas.saveState()
    # Header line
    canvas.setStrokeColor(TEMSA_RED)
    canvas.setLineWidth(2)
    canvas.line(20*mm, H - 12*mm, W - 20*mm, H - 12*mm)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(20*mm, H - 11*mm, "TEMSA Digital Twin Platform — Teknik Dokümantasyon")
    canvas.drawRightString(W - 20*mm, H - 11*mm, "Gizli — Kurum İçi Kullanım")
    # Footer
    canvas.setStrokeColor(TABLE_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 14*mm, W - 20*mm, 14*mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(20*mm, 9*mm, "© 2026 TEMSA Ulaşım Araçları A.Ş.")
    canvas.drawRightString(W - 20*mm, 9*mm, f"Sayfa {doc.page}")
    canvas.restoreState()

def cover_page(canvas, doc):
    canvas.saveState()
    # Red bar top
    canvas.setFillColor(TEMSA_RED)
    canvas.rect(0, H - 8*mm, W, 8*mm, fill=1, stroke=0)
    # Dark section
    canvas.setFillColor(DARK)
    canvas.rect(0, H - 100*mm, W, 92*mm, fill=1, stroke=0)
    # TEMSA logo text
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 36)
    canvas.drawString(25*mm, H - 50*mm, "TEMSA")
    canvas.setFont("Helvetica", 14)
    canvas.setFillColor(HexColor("#94a3b8"))
    canvas.drawString(25*mm, H - 60*mm, "Digital Twin Platform")
    # Title
    canvas.setFillColor(DARK)
    canvas.setFont("Helvetica-Bold", 22)
    canvas.drawString(25*mm, H - 125*mm, "Teknik Dokümantasyon")
    canvas.setFont("Helvetica", 11)
    canvas.setFillColor(GRAY)
    canvas.drawString(25*mm, H - 135*mm, "Sistem Mimarisi, API Referansı ve Bakım Kılavuzu")
    # Info box
    y = H - 165*mm
    canvas.setFillColor(LIGHT_BG)
    canvas.roundRect(25*mm, y - 42*mm, 100*mm, 42*mm, 3*mm, fill=1, stroke=0)
    canvas.setFillColor(DARK)
    canvas.setFont("Helvetica-Bold", 9)
    labels = [("Versiyon:", "1.0.0"), ("Tarih:", "16 Nisan 2026"), ("Hazırlayan:", "Oğuzhan İnandı"), ("Birim:", "Araç Tasarım Mühendisliği"), ("Durum:", "Üretime Hazır")]
    for i, (lbl, val) in enumerate(labels):
        yy = y - 6*mm - i * 7.5*mm
        canvas.drawString(30*mm, yy, lbl)
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(BLUE if lbl == "Durum:" else DARK)
        canvas.drawString(62*mm, yy, val)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.setFillColor(DARK)
    # Footer
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(25*mm, 20*mm, "© 2026 TEMSA Ulaşım Araçları A.Ş. — Tüm hakları saklıdır.")
    canvas.drawString(25*mm, 14*mm, "Bu belge kurum içi kullanım amaçlıdır.")
    canvas.restoreState()

def build():
    S = styles()
    out = os.path.join(os.path.dirname(__file__), "TEKNIK_DOKUMANTASYON.pdf")
    doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=20*mm)
    story = []

    # ═══════════════════════════ COVER ═══════════════════════════
    story.append(Spacer(1, 1))  # placeholder; cover drawn via onFirstPage
    story.append(PageBreak())

    # ═══════════════════════════ TOC ═══════════════════════════
    story.append(Paragraph("İçindekiler", S["h1"]))
    story.append(Spacer(1, 3*mm))
    toc_items = [
        "1.  Genel Bakış",
        "2.  Kullanılan Teknolojiler",
        "3.  Sistem Mimarisi",
        "4.  Docker Servisleri",
        "5.  Veritabanı Yapısı",
        "6.  API Endpoint Haritası",
        "7.  Platform Modülleri (14 Adet)",
        "8.  Güvenlik ve Kimlik Doğrulama",
        "9.  Kurulum ve Dağıtım",
        "10. Kaynak Kod Yapısı",
        "11. Bakım ve Sürdürülebilirlik Planı",
        "12. BT Ekibi Soru-Yanıtları",
    ]
    for item in toc_items:
        story.append(Paragraph(item, S["toc"]))
    story.append(PageBreak())

    # ════════════════════ 1. GENEL BAKIŞ ════════════════════
    story.append(Paragraph("1. Genel Bakış", S["h1"]))
    story.append(hr())
    story.append(Paragraph(
        "TEMSA Digital Twin Platform, TEMSA'nın araç modellerine ait CO₂ emisyon, yakıt tüketimi, ağırlık ve enerji "
        "verilerini tek bir dijital ortamda toplayan, analiz eden ve raporlayan <b>kurumsal web uygulamasıdır</b>.",
        S["body"]))
    story.append(Paragraph(
        "Avrupa Birliği'nin resmi <b>VECTO</b> (Vehicle Energy Consumption Calculation Tool) aracı ile üretilen "
        "sertifikalı sonuçları işler, filo bazlı emisyon hesaplamaları yapar, makine öğrenmesi tabanlı tahminler "
        "üretir ve regülasyon uyumluluk takibi sağlar.",
        S["body"]))
    story.append(Spacer(1, 3*mm))
    story.append(make_table(
        ["Metrik", "Değer"],
        [
            ["Aktif Modül Sayısı", "14 üretime hazır sayfa"],
            ["Backend API", "7 router grubu, 50+ endpoint"],
            ["Veritabanı", "15+ tablo, 5 ENUM tipi"],
            ["Docker Konteyner", "8 bağımsız servis"],
            ["Backend Dosya", "~26 Python dosyası"],
            ["Frontend Bileşen", "~35+ React componenti"],
        ],
        col_widths=[55*mm, 110*mm]
    ))

    # ════════════════════ 2. TEKNOLOJİLER ════════════════════
    story.append(Paragraph("2. Kullanılan Teknolojiler", S["h1"]))
    story.append(hr())
    story.append(Paragraph("Tüm teknolojiler açık kaynaklıdır. Ticari lisans bağımlılığı yoktur.", S["body"]))
    story.append(Spacer(1, 2*mm))
    story.append(make_table(
        ["Katman", "Teknoloji", "Versiyon", "Açıklama"],
        [
            ["Frontend", "React.js", "18.3", "Kullanıcı arayüzü — dünyanın en popüler UI kütüphanesi"],
            ["Frontend", "Vite", "4.x", "Hızlı build ve geliştirme aracı"],
            ["Frontend", "Tailwind CSS", "3.x", "CSS framework — hızlı stil geliştirme"],
            ["Frontend", "Recharts", "2.15", "Grafik ve çizelge kütüphanesi"],
            ["Backend", "Python FastAPI", "0.115", "Yüksek performanslı REST API framework"],
            ["Backend", "SQLAlchemy", "2.0", "Veritabanı ORM (async destekli)"],
            ["Backend", "ReportLab", "4.2", "PDF rapor üretim motoru"],
            ["Veritabanı", "PostgreSQL", "16", "Kurumsal ilişkisel veritabanı"],
            ["Cache", "Redis", "7", "Önbellek ve mesaj kuyruğu"],
            ["Auth", "JWT + bcrypt", "—", "Kimlik doğrulama ve şifreleme"],
            ["Altyapı", "Docker Compose", "Latest", "Konteyner orkestrasyonu"],
        ],
        col_widths=[25*mm, 30*mm, 18*mm, 92*mm]
    ))

    # ════════════════════ 3. MİMARİ ════════════════════
    story.append(PageBreak())
    story.append(Paragraph("3. Sistem Mimarisi", S["h1"]))
    story.append(hr())
    story.append(Paragraph(
        "Sistem <b>microservice-tabanlı</b> bir yaklaşımla tasarlanmıştır. Her bileşen kendi Docker konteynerinde "
        "çalışır; bu sayede bağımsız olarak güncellenebilir, ölçeklenebilir ve taşınabilir.",
        S["body"]))
    story.append(Spacer(1, 3*mm))

    # Architecture diagram as table
    arch_data = [
        ["Katman", "Bileşen", "Port", "Görev"],
        ["Kullanıcı", "Web Browser", "—", "Kullanıcının sisteme eriştiği nokta"],
        ["Frontend", "React SPA (temsa-frontend)", "3000", "Kullanıcı arayüzü, tüm modül ekranları"],
        ["API Gateway", "Ana Backend (FastAPI)", "8000", "Araç, CO₂, filo, analiz, auth, PDF endpoint'leri"],
        ["API Gateway", "BOM Backend (FastAPI)", "8001", "BOM proje, entegrasyon, Excel işleme"],
        ["API Gateway", "Simutem Backend", "8002", "Elektrikli otobüs enerji simülasyonu"],
        ["API Gateway", "Homologasyon Backend", "5001", "Regülasyon web scraper"],
        ["Veri", "PostgreSQL (Ana)", "5433", "Araç, varyant, simülasyon, CO₂ verileri"],
        ["Veri", "PostgreSQL (BOM)", "5434", "BOM proje ve entegrasyon verileri"],
        ["Veri", "Redis", "6379", "Önbellek ve oturum yönetimi"],
    ]
    t = Table(arch_data, colWidths=[25*mm, 55*mm, 15*mm, 70*mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("LEADING", (0, 0), (-1, -1), 13),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.4, TABLE_BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TABLE_ALT_BG]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("<b>Veri Akışı:</b> Kullanıcı → React Frontend → REST API → FastAPI Backend → PostgreSQL / Redis", S["body"]))

    # ════════════════════ 4. DOCKER SERVİSLERİ ════════════════════
    story.append(Paragraph("4. Docker Servisleri", S["h1"]))
    story.append(hr())
    story.append(Paragraph("Tüm sistem <b>docker compose up -d</b> komutuyla tek seferde başlatılır.", S["body"]))
    story.append(Spacer(1, 2*mm))
    story.append(make_table(
        ["Servis", "Konteyner", "Port", "Image", "Healthcheck"],
        [
            ["Veritabanı", "temsa-db", "5433", "postgres:16-alpine", "pg_isready"],
            ["Redis", "temsa-redis", "6379", "redis:7-alpine", "redis-cli ping"],
            ["Ana Backend", "temsa-backend", "8000", "Python 3.12 + FastAPI", "GET /health"],
            ["Frontend", "temsa-frontend", "3000", "Node.js + Vite", "HTTP 200"],
            ["BOM DB", "temsa-bom-db", "5434", "postgres:16-alpine", "pg_isready"],
            ["BOM Backend", "temsa-bom-backend", "8001", "Python + FastAPI", "—"],
            ["Simutem", "temsa-simutem-backend", "8002", "Python + FastAPI", "—"],
            ["Homologasyon", "temsa-homolog-backend", "5001", "Python + Flask", "—"],
        ],
        col_widths=[25*mm, 35*mm, 14*mm, 42*mm, 30*mm]
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("<b>Kalıcı Veri Hacimleri:</b> pgdata (ana DB), redisdata (cache), bom_pgdata (BOM DB), bom_uploads (Excel dosyaları)", S["body"]))

    # ════════════════════ 5. VERİTABANI ════════════════════
    story.append(PageBreak())
    story.append(Paragraph("5. Veritabanı Yapısı", S["h1"]))
    story.append(hr())
    story.append(Paragraph("Ana veritabanı <b>temsa_twin</b> adıyla PostgreSQL 16 üzerinde çalışır. Şema <b>db/init.sql</b> dosyasında tanımlıdır.", S["body"]))
    story.append(Spacer(1, 2*mm))
    story.append(make_table(
        ["Tablo", "Açıklama"],
        [
            ["vehicles", "Ana araç modelleri (coach, city bus, EV, diesel)"],
            ["vehicle_variants", "Araç varyant detayları (motor, şanzıman, lastik, ADAS)"],
            ["fuel_consumption_maps", "Motor yakıt tüketim haritası (hız × tork × tüketim)"],
            ["full_load_drag_curves", "Motor tork ve sürtünme eğrileri"],
            ["gear_ratios", "Vites kutusu oranları (varyant bazlı)"],
            ["torque_converter_chars", "Tork konvertör performans verileri"],
            ["axle_loss_maps", "Aks kayıp haritası"],
            ["simulation_runs", "Simülasyon koşumu meta verileri"],
            ["simulation_results", "Simülasyon çıktıları (CO₂, yakıt, enerji)"],
            ["real_test_results", "Gerçek yol/pist test sonuçları"],
            ["vecto_results_certified", "AB sertifikalı resmi VECTO sonuçları"],
            ["vecto_simulation_outputs", "Ham VECTO simülasyon çıktıları"],
            ["fleets / fleet_items", "Filo tanımları ve araç atamaları"],
            ["import_logs", "Dosya içe aktarma geçmişi"],
        ],
        col_widths=[50*mm, 115*mm]
    ))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("<b>ENUM Tipleri:</b> vehicle_category, engine_type, simulation_source, simulation_status, test_type", S["body"]))
    story.append(Paragraph("<b>View:</b> v_variant_summary — Araç + varyant birleşik özet görünümü", S["body"]))
    story.append(Paragraph("<b>Migration:</b> 6 adet SQL migration dosyası (migration_fleet, v2–v6)", S["body"]))

    # ════════════════════ 6. API ENDPOINT ════════════════════
    story.append(Paragraph("6. API Endpoint Haritası", S["h1"]))
    story.append(hr())

    story.append(Paragraph("<b>Ana Backend (Port 8000)</b>", S["h2"]))
    story.append(make_table(
        ["Router", "Prefix", "Açıklama"],
        [
            ["auth.py", "/api/v1/auth", "Giriş, kayıt, JWT token, kullanıcı yönetimi"],
            ["vehicles.py", "/api/v1", "Araç ve varyant CRUD işlemleri"],
            ["simulations.py", "/api/v1", "XML yükleme, toplu içe aktarma, dashboard verileri"],
            ["analysis.py", "/api/v1/analysis", "Sıralama, karşılaştırma, insight motoru"],
            ["co2_v2.py", "/api/v1", "CO₂ emisyon, filo hesaplama, benchmark"],
            ["pdf_report.py", "/api/pdf-report", "VECTO XML → PDF rapor dönüşümü"],
            ["vecto_code.py", "/api/vecto-code", "25 karakterlik VECTO kod üretici"],
        ],
        col_widths=[30*mm, 35*mm, 100*mm]
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("<b>BOM Backend (Port 8001):</b> Proje CRUD, Excel parse, item güncelleme, filtreli export, diff/reupload, onay/kilit, istatistik, geçmiş", S["body"]))
    story.append(Paragraph("<b>Simutem (Port 8002):</b> Elektrikli otobüs enerji simülasyonu", S["body"]))
    story.append(Paragraph("<b>Homologasyon (Port 5001):</b> UNECE regülasyon web scraper", S["body"]))

    # ════════════════════ 7. MODÜLLER ════════════════════
    story.append(PageBreak())
    story.append(Paragraph("7. Platform Modülleri", S["h1"]))
    story.append(hr())
    story.append(Paragraph("Platformda <b>14 adet üretime hazır modül</b> ve 5 altyapı modülü bulunmaktadır.", S["body"]))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph("<b>Üretime Hazır Modüller</b>", S["h2"]))
    story.append(make_table(
        ["#", "Modül", "Açıklama"],
        [
            ["1", "CO₂ Emisyonlar", "VECTO sertifikalı emisyon sonuçları ve trend analizi"],
            ["2", "Filo CO₂ Hesaplama", "AB uyumlu ağırlıklı filo emisyon hesaplaması"],
            ["3", "Digital Twin", "Araç dijital ikizi, varyant bazlı teknik detay"],
            ["4", "Ağırlık Hesaplama", "Araç ağırlık dağılımı ve kapasite hesabı"],
            ["5", "Enerji Analizi", "Enerji tüketimi analizi, misyon bazlı kıyaslama"],
            ["6", "Benchmark", "Varyant performans karşılaştırma"],
            ["7", "Malzeme Listesi", "SAP malzeme listesi görüntüleme ve arama"],
            ["8", "VECTO İçe Aktarma", "VECTO XML dosyalarını veritabanına aktarma"],
            ["9", "Sanal Test", "Sanal test senaryoları ve sonuç karşılaştırma"],
            ["10", "Filo Takip", "Filo araçları konum ve durum takibi"],
            ["11", "Bulgular", "AI destekli anomali tespiti ve öneriler"],
            ["12", "Sıralamalar", "Enerji, yakıt, ağırlık bazlı varyant sıralama"],
            ["13", "ML Tahmin", "Makine öğrenmesi ile yakıt/CO₂ tahmini"],
            ["14", "Regülasyon Takip", "UNECE regülasyonlarını otomatik izleme"],
        ],
        col_widths=[8*mm, 35*mm, 122*mm]
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("<b>Altyapı Modülleri:</b> Dashboard, Varyant Listesi, VECTO Çıktıları, BOM & Entegrasyon, Yönetim Paneli, Landing Page, Login", S["body"]))

    # ════════════════════ 8. GÜVENLİK ════════════════════
    story.append(Paragraph("8. Güvenlik ve Kimlik Doğrulama", S["h1"]))
    story.append(hr())

    story.append(Paragraph("<b>Kimlik Doğrulama</b>", S["h2"]))
    story.append(make_table(
        ["Özellik", "Detay"],
        [
            ["Protokol", "JWT (JSON Web Token) — HS256 algoritması"],
            ["Şifreleme", "bcrypt ile hash'lenmiş şifreler"],
            ["Token Süresi", "8 saat (480 dakika)"],
            ["Login", "POST /api/v1/auth/login (OAuth2)"],
            ["Secret Key", ".env dosyasından okunur (production'da değiştirilecek)"],
        ],
        col_widths=[35*mm, 130*mm]
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("<b>Kullanıcı Rolleri</b>", S["h2"]))
    story.append(make_table(
        ["Rol", "Yetki"],
        [
            ["admin", "Tüm modüller + kullanıcı yönetimi"],
            ["manager", "Tüm modüller (yönetim paneli hariç)"],
            ["analyst", "Veri ve analiz modülleri"],
            ["viewer", "Salt okunur erişim"],
        ],
        col_widths=[30*mm, 135*mm]
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("<b>Ek Güvenlik Önlemleri:</b>", S["body_bold"]))
    for txt in [
        "CORS politikası — yalnızca izin verilen kaynaklara erişim",
        "SQL Injection koruması — SQLAlchemy ORM ile parametrik sorgular",
        "Input doğrulama — Pydantic ile istek verisi kontrolü",
        "Endpoint koruması — FastAPI Depends() ile her endpoint'e auth kontrolü",
    ]:
        story.append(Paragraph(f"•  {txt}", S["bullet"]))

    # ════════════════════ 9. KURULUM ════════════════════
    story.append(PageBreak())
    story.append(Paragraph("9. Kurulum ve Dağıtım", S["h1"]))
    story.append(hr())

    story.append(Paragraph("<b>Sunucu Gereksinimleri</b>", S["h2"]))
    story.append(make_table(
        ["Bileşen", "Minimum", "Önerilen"],
        [
            ["CPU", "4 çekirdek", "8 çekirdek"],
            ["RAM", "8 GB", "16 GB"],
            ["Disk", "50 GB SSD", "100 GB SSD"],
            ["İşletim Sistemi", "Linux veya Windows Server", "Ubuntu 22.04 LTS"],
            ["Docker", "Docker Engine 24+", "Docker Engine 26+"],
        ],
        col_widths=[40*mm, 55*mm, 55*mm]
    ))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("<b>Kurulum Adımları</b>", S["h2"]))
    steps = [
        "Kaynak kodu sunucuya kopyalayın (git clone veya dosya transferi)",
        ".env dosyasını oluşturun ve DB_PASSWORD, SECRET_KEY değerlerini ayarlayın",
        "docker compose up -d --build komutuyla tüm servisleri başlatın",
        "http://sunucu-ip:3000 adresinden uygulamaya erişin",
        "http://sunucu-ip:8000/health adresinden backend sağlık kontrolü yapın",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"<b>{i}.</b>  {step}", S["bullet"]))

    # ════════════════════ 10. KAYNAK KOD ════════════════════
    story.append(Paragraph("10. Kaynak Kod Yapısı", S["h1"]))
    story.append(hr())
    story.append(make_table(
        ["Dizin / Dosya", "Açıklama"],
        [
            ["docker-compose.yml", "Tüm servislerin Docker orkestrasyon dosyası"],
            ["backend/app/main.py", "FastAPI uygulaması başlangıç noktası"],
            ["backend/app/models.py", "Veritabanı tabloları (SQLAlchemy ORM)"],
            ["backend/app/routers/ (11 dosya)", "API endpoint router dosyaları"],
            ["backend/app/services/ (7 dosya)", "İş mantığı servisleri (parser, motor, vb.)"],
            ["frontend/src/App.jsx", "Ana uygulama, navigasyon ve yönlendirme"],
            ["frontend/src/api.js", "Backend API istemci fonksiyonları"],
            ["frontend/src/components/ (35+ dosya)", "React bileşenleri (her modül ayrı dosya)"],
            ["db/init.sql", "Veritabanı şema tanımı"],
            ["backend/migration_*.sql (6 adet)", "Veritabanı migration dosyaları"],
        ],
        col_widths=[60*mm, 105*mm]
    ))

    # ════════════════════ 11. BAKIM ════════════════════
    story.append(Paragraph("11. Bakım ve Sürdürülebilirlik Planı", S["h1"]))
    story.append(hr())

    story.append(Paragraph(
        "Projenin tamamı açık kaynak standart teknolojilerle yazılmıştır. React ve Python bilen herhangi bir "
        "web geliştiricisi sistemi kolayca devralabilir.",
        S["body"]))
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph("<b>Neden Kolay Bakılır?</b>", S["h2"]))
    for txt in [
        "<b>Modüler yapı:</b> Her modül bağımsız bir React dosyası — birini değiştirmek diğerlerini etkilemez",
        "<b>Standart teknolojiler:</b> React, Python, PostgreSQL, Docker — milyonlarca geliştirici tarafından biliniyor",
        "<b>Docker:</b> Sunucu bağımlılığı yok — tek komutla herhangi bir makinede çalışır",
        "<b>Hızlı onboarding:</b> Yeni geliştirici docker compose up ile 5 dakikada çalışır duruma gelir",
    ]:
        story.append(Paragraph(f"•  {txt}", S["bullet"]))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("<b>Olası Bakım İşlemleri</b>", S["h2"]))
    story.append(make_table(
        ["Durum", "Yapılacak"],
        [
            ["Hata düzeltme", "İlgili .jsx veya .py dosyasını düzenle → docker compose restart"],
            ["Yeni modül ekleme", "Yeni React bileşeni oluştur → App.jsx'e ekle"],
            ["DB değişikliği", "Yeni SQL migration yaz → docker exec ile uygula"],
            ["Güvenlik yaması", "requirements.txt / package.json güncelle → rebuild"],
            ["Sunucu taşıma", "Docker volume yedekle → yeni sunucuda docker compose up"],
        ],
        col_widths=[35*mm, 130*mm]
    ))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("<b>Geliştirici Ayrılma Senaryosu — Adaptasyon Süreleri:</b>", S["body_bold"]))
    story.append(make_table(
        ["Aşama", "Süre"],
        [
            ["Sistemi ayağa kaldırma", "< 1 saat"],
            ["Kod yapısını anlama", "1–2 iş günü"],
            ["Bağımsız geliştirme yapabilme", "~1 hafta"],
        ],
        col_widths=[55*mm, 55*mm]
    ))

    # ════════════════════ 12. BT YANITLARI ════════════════════
    story.append(PageBreak())
    story.append(Paragraph("12. BT Ekibi Soru-Yanıtları", S["h1"]))
    story.append(hr())
    story.append(Paragraph(
        "Aşağıda BT Altyapı ekibinin sunucu talebi sürecinde sorduğu sorulara yanıtlar yer almaktadır.",
        S["body"]))

    # Q1
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Soru 1: Uygulama hangi yazılım dili ve mimariyle geliştirildi?", S["h2"]))
    story.append(Paragraph(
        "Platform, kurumsal yazılım dünyasının en yaygın açık kaynak teknolojileriyle geliştirilmiştir:",
        S["body"]))
    for txt in [
        "<b>Frontend:</b> React.js 18 (JavaScript) — Meta tarafından geliştirilen, dünyanın en çok kullanılan arayüz kütüphanesi",
        "<b>Backend:</b> Python FastAPI — Modern, yüksek performanslı REST API framework'ü",
        "<b>Veritabanı:</b> PostgreSQL 16 — Kurumsal dünyada en güvenilir açık kaynak veritabanı",
        "<b>Altyapı:</b> Docker + Docker Compose — Konteyner tabanlı, sunucudan bağımsız dağıtım",
    ]:
        story.append(Paragraph(f"•  {txt}", S["bullet"]))
    story.append(Paragraph(
        "Mimari olarak <b>API-first microservice yaklaşımı</b> kullanılmıştır. 8 Docker konteynerinden oluşan sistem, "
        "her biri bağımsız çalışır ve güncellenebilir. Kullanılan tüm teknolojiler <b>ücretsiz ve açık kaynaklıdır</b> — "
        "herhangi bir ticari lisans maliyeti yoktur.",
        S["body"]))

    # Q2
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Soru 2: Geliştirici ayrılırsa, bakımı ve desteği kim üstlenecek?", S["h2"]))
    story.append(Paragraph(
        "Projenin birincil geliştiricisi <b>Oğuzhan İnandı</b>'dır (Araç Tasarım Mühendisi). "
        "Ayrılma senaryosuna karşı şu önlemler mevcuttur:",
        S["body"]))
    for txt in [
        "<b>Standart teknolojiler:</b> React, Python, PostgreSQL ve Docker dünyada milyonlarca geliştirici tarafından biliniyor — junior–mid seviye bir web geliştiricisi projeyi devralabilir",
        "<b>Modüler yapı:</b> Her modül bağımsız çalışıyor, birindeki değişiklik diğerlerini etkilemiyor",
        "<b>Docker:</b> Sunucu bağımlılığı yok — docker compose up ile her makinede dakikalar içinde çalışır",
        "<b>Kapsamlı dokümantasyon:</b> Bu belge tüm sistem detaylarını içermektedir",
        "<b>Hızlı adaptasyon:</b> Yeni geliştirici ~1-2 gün içinde kodu anlayabilir, 1 hafta içinde bağımsız geliştirme yapabilir",
    ]:
        story.append(Paragraph(f"•  {txt}", S["bullet"]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "<b>Önerimiz:</b> BT ekibinden bir Python/React geliştiriciye sistemin tanıtılması. Bu, kurumsal sürdürülebilirlik "
        "açısından en sağlıklı yaklaşım olacaktır.",
        S["body"]))

    # Q3
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Soru 3: Teknik dokümantasyon ve kaynak kodların güvenli alanı var mı?", S["h2"]))
    story.append(Paragraph("<b>Evet, her ikisi de mevcuttur:</b>", S["body"]))
    for txt in [
        "<b>Teknik Dokümantasyon:</b> Bu belge (TEKNIK_DOKUMANTASYON) — sistem mimarisi, DB şeması, API haritası, güvenlik ve bakım planını kapsar",
        "<b>Kaynak Kod:</b> Git ile versiyon kontrollü, tüm kod + konfigürasyon + DB şemaları tek repo'da",
        "<b>Hassas Veriler:</b> Şifreler ve gizli anahtarlar .env dosyalarıyla yönetilir, Git'e dahil edilmez",
    ]:
        story.append(Paragraph(f"•  {txt}", S["bullet"]))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("<b>BT ile birlikte yapılabilecek aksiyonlar:</b>", S["body_bold"]))
    for txt in [
        "Kodun kurumsal Git sunucusuna (GitLab/Azure DevOps) aktarılması",
        "CI/CD pipeline kurulumu (otomatik build ve deploy)",
        "Düzenli veritabanı yedekleme planı (pg_dump)",
        "SSL/TLS sertifikası ile HTTPS yapılandırması",
        "Docker image'ların kurumsal registry'de saklanması",
    ]:
        story.append(Paragraph(f"•  {txt}", S["bullet"]))

    # ════════════════════ SON SAYFA ════════════════════
    story.append(Spacer(1, 15*mm))
    story.append(hr())
    story.append(Paragraph(
        "<i>Bu dokümantasyon yaşayan bir belgedir ve platform geliştikçe güncellenecektir.</i>",
        S["quote"]))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph(
        "<b>TEMSA Ulaşım Araçları A.Ş.</b> — Dijital İkiz Platformu<br/>"
        "Araç Tasarım Mühendisliği — Nisan 2026",
        S["small"]))

    # ════════════════════ BUILD ════════════════════
    doc.build(story, onFirstPage=cover_page, onLaterPages=header_footer)
    print(f"PDF olusturuldu: {out}")

if __name__ == "__main__":
    build()
