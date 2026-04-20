# TEMSA Digital Twin Platform — Teknik Dokümantasyon

> **Versiyon:** 1.0.0  
> **Son Güncelleme:** 16 Nisan 2026  
> **Hazırlayan:** Oğuzhan İnandı — Araç Tasarım Mühendisi, TEMSA Ulaşım Araçları A.Ş.  
> **Durum:** Üretim Ortamı (Production-Ready)

---

## İçindekiler

1. [Yönetici Özeti](#1-yönetici-özeti)
2. [Yazılım Dili ve Mimari](#2-yazılım-dili-ve-mimari)
3. [Sistem Bileşenleri](#3-sistem-bileşenleri)
4. [Veritabanı Yapısı](#4-veritabanı-yapısı)
5. [API Endpoint Haritası](#5-api-endpoint-haritası)
6. [Platform Modülleri](#6-platform-modülleri)
7. [Güvenlik ve Kimlik Doğrulama](#7-güvenlik-ve-kimlik-doğrulama)
8. [Dağıtım ve Altyapı (Deployment)](#8-dağıtım-ve-altyapı-deployment)
9. [Kaynak Kod Yönetimi](#9-kaynak-kod-yönetimi)
10. [Bakım, Destek ve Sürdürülebilirlik Planı](#10-bakım-destek-ve-sürdürülebilirlik-planı)
11. [Geliştirme Ortamı Kurulumu](#11-geliştirme-ortamı-kurulumu)
12. [Monitoring ve Healthcheck](#12-monitoring-ve-healthcheck)
13. [BT Mail Yanıtları](#13-bt-mail-yanıtları)

---

## 1. Yönetici Özeti

TEMSA Digital Twin Platform, TEMSA Ulaşım Araçları'nın araç varyantlarına ait CO₂ emisyon, yakıt tüketimi, ağırlık ve enerji verilerini dijital ikiz (digital twin) yaklaşımıyla merkezi bir sistemde toplayan, analiz eden ve raporlayan **kurumsal web uygulamasıdır**.

Platform; AB Komisyonu'nun resmi **VECTO (Vehicle Energy Consumption Calculation Tool)** aracı ile üretilen sertifikalı sonuçları işler, filo bazlı emisyon hesaplamaları yapar, ML (machine learning) tabanlı tahminler üretir ve düzenleyici uyumluluk (regulatory compliance) takibi sağlar.

### Temel Sayılar

| Metrik | Değer |
|--------|-------|
| Aktif Modül Sayısı | 14 adet üretime hazır sayfa |
| Backend API Endpoint | 7 router grubu, 50+ endpoint |
| Veritabanı Tablosu | 15+ tablo, 5 ENUM tipi, 1 view |
| Konteyner Sayısı | 8 Docker servisi |
| Toplam Kaynak Dosya (Backend) | ~26 Python dosyası |
| Toplam Kaynak Dosya (Frontend) | ~35+ React bileşeni |

---

## 2. Yazılım Dili ve Mimari

### 2.1. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Versiyon | Lisans |
|--------|-----------|----------|--------|
| **Frontend** | React.js (JavaScript/JSX) | 18.3 | MIT |
| **Build Aracı** | Vite | 4.x | MIT |
| **CSS Framework** | Tailwind CSS | 3.x | MIT |
| **Animasyon** | Motion (Framer Motion) | 11.18 | MIT |
| **Grafik Kütüphanesi** | Recharts | 2.15 | MIT |
| **PDF İşleme** | jsPDF + html2canvas | 2.5 / 1.4 | MIT |
| **Backend** | Python FastAPI | 0.115 | MIT |
| **ASGI Server** | Uvicorn | 0.34 | BSD |
| **ORM** | SQLAlchemy (async) | 2.0 | MIT |
| **Veritabanı** | PostgreSQL | 16 Alpine | PostgreSQL License |
| **Cache/Broker** | Redis | 7 Alpine | BSD |
| **XML İşleme** | lxml | 5.3 | BSD |
| **PDF Rapor (Backend)** | ReportLab | 4.2 | BSD |
| **Auth** | python-jose (JWT) + bcrypt | 3.3 / 4.2 | MIT |
| **HTTP Client** | httpx | 0.28 | BSD |
| **Konteyner** | Docker + Docker Compose | Latest | Apache 2.0 |

### 2.2. Mimari Diyagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        KULLANICI (Web Browser)                  │
│                        http://localhost:3000                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND — React 18 + Vite                    │
│   temsa-frontend (Port 3000)                                    │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│   │ CO2Panel │ │ Digital  │ │ BOM &    │ │ 14 adet üretime  │  │
│   │          │ │ TwinPanel│ │ Entegr.  │ │ hazır modül      │  │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│        │             │            │                 │            │
│        └─────────────┴────────────┴─────────────────┘            │
│                          REST API Calls                          │
└──────────────┬────────────────┬──────────────┬──────────────────┘
               │                │              │
               ▼                ▼              ▼
┌──────────────────┐ ┌─────────────────┐ ┌────────────────────────┐
│ TEMSA Backend    │ │ BOM Backend     │ │ Diğer Backend'ler      │
│ FastAPI (8000)   │ │ FastAPI (8001)  │ │ Simutem (8002)         │
│                  │ │                 │ │ Homologasyon (5001)    │
│ • Araç/Varyant   │ │ • BOM Proje     │ │                        │
│ • CO2 Emisyon    │ │ • Entegrasyon   │ │                        │
│ • Filo Hesaplama │ │ • Excel Parse   │ │                        │
│ • ML Tahmin      │ │ • Diff/Approve  │ │                        │
│ • Auth/JWT       │ │                 │ │                        │
│ • PDF Rapor      │ │                 │ │                        │
└───────┬──────────┘ └───────┬─────────┘ └────────────────────────┘
        │                    │
        ▼                    ▼
┌──────────────────┐ ┌─────────────────┐
│ PostgreSQL 16    │ │ PostgreSQL 16   │       ┌──────────────┐
│ temsa_twin DB    │ │ bomdb DB        │       │ Redis 7      │
│ (Port 5433)      │ │ (Port 5434)     │       │ Cache/Broker │
│                  │ │                 │       │ (Port 6379)  │
│ 15+ tablo        │ │ BOM tabloları   │       │              │
│ 5 ENUM           │ │                 │       │              │
│ 6 migration      │ │                 │       │              │
└──────────────────┘ └─────────────────┘       └──────────────┘
```

### 2.3. Mimari Yaklaşım

- **Microservice-oriented Monorepo**: Tüm servisler tek bir repo'da yönetilir, ancak bağımsız Docker konteynerlerinde çalışır
- **API-First Design**: Frontend tamamen REST API üzerinden backend ile haberleşir
- **Async I/O**: Backend, Python `asyncio` + SQLAlchemy async ile yüksek performanslı non-blocking I/O kullanır
- **Client-Side Rendering (CSR)**: React SPA mimarisi, Vite ile hot-reload ve optimized build
- **Component-Based UI**: Her modül bağımsız React bileşeni olarak geliştirilmiş, kolay bakım ve genişleme sağlar

---

## 3. Sistem Bileşenleri

### 3.1. Docker Servisleri

| Servis | Konteyner Adı | Port | Image / Build | Açıklama |
|--------|---------------|------|---------------|----------|
| **PostgreSQL** | temsa-db | 5433 | `postgres:16-alpine` | Ana veritabanı |
| **Redis** | temsa-redis | 6379 | `redis:7-alpine` | Cache ve broker |
| **Backend** | temsa-backend | 8000 | Python 3.12 FastAPI | Ana API sunucusu |
| **Frontend** | temsa-frontend | 3000 | Node.js + Vite | React SPA |
| **BOM DB** | temsa-bom-db | 5434 | `postgres:16-alpine` | BOM entegrasyon DB |
| **BOM Backend** | temsa-bom-backend | 8001 | Python FastAPI | BOM/Entegrasyon API |
| **Simutem** | temsa-simutem-backend | 8002 | Python FastAPI | EV simülasyon API |
| **Homologasyon** | temsa-homolog-backend | 5001 | Python Flask | Regülasyon scraper |

### 3.2. Kalıcı Veri Hacimleri (Persistent Volumes)

| Volume | Amaç |
|--------|------|
| `pgdata` | Ana PostgreSQL verisi |
| `redisdata` | Redis kalıcı cache |
| `bom_pgdata` | BOM veritabanı verisi |
| `bom_uploads` | BOM Excel yükleme dosyaları |

---

## 4. Veritabanı Yapısı

### 4.1. Ana Veritabanı (temsa_twin)

```
┌─────────────────────────────────────────────────────────────────┐
│                       temsa_twin (PostgreSQL 16)                │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   CORE TABLES       │   SIMULATION        │   ANALYTICS         │
│                     │                     │                     │
│ • vehicles          │ • simulation_runs   │ • vecto_results_    │
│ • vehicle_variants  │ • simulation_       │   certified         │
│ • fuel_consumption_ │   results           │ • vecto_simulation_ │
│   maps              │ • real_test_results │   outputs           │
│ • full_load_drag_   │ • import_logs       │ • fleets            │
│   curves            │                     │ • fleet_items       │
│ • gear_ratios       │                     │                     │
│ • torque_converter_ │                     │                     │
│   chars             │                     │                     │
│ • axle_loss_maps    │                     │                     │
├─────────────────────┴─────────────────────┴─────────────────────┤
│   VIEWS: v_variant_summary                                      │
│   ENUMS: vehicle_category, engine_type, simulation_source,      │
│          simulation_status, test_type                            │
│   MIGRATIONS: 6 adet (migration_fleet, v2, v3, v4, v5, v6)     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2. Tablo Açıklamaları

| Tablo | Kayıt Tipi | Açıklama |
|-------|------------|----------|
| `vehicles` | Araç modelleri | Coach, City Bus, EV, Diesel bazında ana araç tanımları |
| `vehicle_variants` | Araç varyantları | Motor, şanzıman, lastik, ADAS, konfigürasyon detayları |
| `fuel_consumption_maps` | Yakıt haritası | Hız × tork × tüketim matrisi |
| `full_load_drag_curves` | Motor eğrileri | Maksimum tork ve sürtünme eğrileri |
| `gear_ratios` | Vites oranları | Varyant başına vites kutusu oranları |
| `torque_converter_chars` | Konvertör karakteristikleri | Tork konvertör performans eğrileri |
| `axle_loss_maps` | Aks kayıp haritası | Hız × tork → kayıp matrisi |
| `simulation_runs` | Simülasyon koşuları | VECTO/MATLAB/custom simülasyon meta verileri |
| `simulation_results` | Simülasyon sonuçları | CO₂, yakıt, enerji, menzil çıktıları |
| `real_test_results` | Gerçek test verileri | Pist, yol, dayanım, müşteri test sonuçları |
| `import_logs` | İçe aktarma günlüğü | Dosya yükleme ve parse geçmişi |
| `vecto_results_certified` | Sertifikalı VECTO sonuçları | AB resmi RSLT dosyalarından parse edilmiş veriler |
| `vecto_simulation_outputs` | Ham VECTO çıktıları | VECTO aracının ürettiği ham simülasyon verileri |
| `fleets` | Filo tanımları | Adlandırılmış filo konfigürasyonları |
| `fleet_items` | Filo araçları | Filo → VIN/adet eşleştirmeleri |

---

## 5. API Endpoint Haritası

### 5.1. Ana Backend (Port 8000)

| Router | Prefix | Endpoint Sayısı | Açıklama |
|--------|--------|-----------------|----------|
| `auth.py` | `/api/v1/auth` | ~6 | Giriş, kayıt, kullanıcı yönetimi, JWT token |
| `vehicles.py` | `/api/v1` | ~10 | Araç/varyant CRUD, listeleme, filtreleme |
| `simulations.py` | `/api/v1` | ~8 | XML yükleme, toplu içe aktarma, dashboard istatistikleri |
| `analysis.py` | `/api/v1/analysis` | ~6 | Sıralama, karşılaştırma, insight motoru |
| `co2_v2.py` | `/api/v1` | ~12 | CO₂ emisyon, filo hesaplama, benchmark, VECTO parse |
| `pdf_report.py` | `/api/pdf-report` | ~2 | XML → PDF rapor dönüşümü |
| `vecto_code.py` | `/api/vecto-code` | ~3 | 25 karakterlik VECTO kod üretici |
| `ml_prediction.py` | `/api/v1/ml-prediction` | ~4 | Random Forest ile FC/CO₂ tahmin |

### 5.2. BOM Backend (Port 8001)

| Endpoint Grubu | Açıklama |
|----------------|----------|
| BOM Project CRUD | Proje oluşturma, listeleme, silme |
| Excel Upload/Parse | PLM Excel dosyası yükleme ve parse |
| Item Management | Kalem tipi, sipariş durumu güncelleme |
| Export | Filtreli Excel indirme |
| Integration Upload | Entegrasyon dosyası yükleme |
| Diff/Reupload | Operatör dosyası karşılaştırma |
| Approve/Lock | Satır onaylama ve kilitleme |
| Stats/History | İstatistik ve işlem geçmişi |

### 5.3. Diğer Backend'ler

| Servis | Port | Açıklama |
|--------|------|----------|
| Simutem | 8002 | Elektrikli otobüs enerji simülasyonu |
| Homologasyon | 5001 | UNECE regülasyon web scraper |

---

## 6. Platform Modülleri

### Üretime Hazır Modüller (14 adet)

| # | Modül | Sayfa Anahtarı | Açıklama |
|---|-------|----------------|----------|
| 1 | **CO₂ Emisyonlar** | `co2` | VECTO sertifikalı emisyon sonuçları, trend analizi, varyant karşılaştırma |
| 2 | **Filo CO₂ Hesaplama** | `fleet-calculation` | AB regülasyonuna uygun ağırlıklı filo emisyon hesaplaması |
| 3 | **Digital Twin** | `digital-twin` | Araç dijital ikiz modeli, varyant bazlı detaylı teknik veri |
| 4 | **Ağırlık Hesaplama** | `weight` | Araç ağırlık dağılımı ve kapasite hesaplama |
| 5 | **Enerji Analizi** | `enerji` | Enerji tüketimi analizi, misyon bazlı karşılaştırma |
| 6 | **Benchmark** | `benchmark` | Varyant performans kıyaslama, çoklu metrik analiz |
| 7 | **Malzeme Listesi** | `materials` | SAP malzeme listesi görüntüleme ve arama |
| 8 | **VECTO İçe Aktarma** | `import` | VECTO XML dosyalarını veritabanına toplu aktarma |
| 9 | **Sanal Test** | `virtual-test` | Sanal test senaryoları ve sonuç karşılaştırma |
| 10 | **Filo Takip** | `fleet-tracking` | Filo araçları konum ve durum takibi |
| 11 | **Bulgular** | `insights` | AI destekli anomali tespiti ve optimizasyon önerileri |
| 12 | **Sıralamalar** | `rankings` | Enerji, yakıt ve ağırlık bazlı varyant sıralama |
| 13 | **ML Tahmin** | `ml-prediction` | Random Forest ile yakıt/CO₂ tahmin motoru |
| 14 | **Regülasyon Takip** | `homologasyon` | UNECE regülasyonları otomatik izleme ve checklist |

### Altyapı Modülleri (Her zaman aktif)

| Modül | Sayfa Anahtarı | Açıklama |
|-------|----------------|----------|
| Dashboard | `dashboard` | Ana gösterge paneli, özet metrikler |
| Varyantlar | `variants` | Araç varyant listesi ve detay görüntüleme |
| VECTO Çıktıları | `variant-outputs` | VECTO araç çıktıları görüntüleme |
| BOM & Entegrasyon | `bom` | PLM/BOM proje yönetimi ve Excel entegrasyonu |
| Yönetim Paneli | `admin` | Kullanıcı yönetimi, rol ataması (sadece admin) |
| Landing Page | — | Kurumsal karşılama sayfası |
| Login | — | Kimlik doğrulama ekranı |

---

## 7. Güvenlik ve Kimlik Doğrulama

### 7.1. Kimlik Doğrulama (Authentication)

| Bileşen | Uygulama |
|---------|----------|
| **Protokol** | JWT (JSON Web Token) — HS256 algoritması |
| **Kütüphane** | `python-jose[cryptography]` |
| **Token Süresi** | 480 dakika (8 saat) |
| **Şifre Hashing** | `bcrypt` (salt rounds ile) |
| **Login Endpoint** | `POST /api/v1/auth/login` (OAuth2PasswordBearer) |
| **Secret Key** | `.env` ile konfigüre edilebilir, production'da değiştirilecek |

### 7.2. Yetkilendirme (Authorization)

| Rol | Açıklama | Erişim |
|-----|----------|--------|
| `admin` | Sistem yöneticisi | Tüm modüller + kullanıcı yönetimi |
| `manager` | Müdür | Tüm modüller (yönetim paneli hariç) |
| `analyst` | Analist | Veri modülleri |
| `viewer` | İzleyici | Salt okunur erişim |

### 7.3. API Güvenliği

- **CORS**: Yalnızca `localhost:3000` ve `localhost:5173` kaynaklarına izin verilir (production'da düzenlenecek)
- **Dependency Injection**: FastAPI `Depends()` ile endpoint bazlı koruma
- **`get_current_user`**: Her korumalı endpoint için JWT doğrulama
- **`require_admin`**: Admin-only endpoint'ler için ekstra kontrol
- **SQL Injection Koruması**: SQLAlchemy ORM ile parametrized queries
- **Input Validation**: Pydantic schema ile istek gövdesi doğrulama

---

## 8. Dağıtım ve Altyapı (Deployment)

### 8.1. Gereksinimler

| Bileşen | Minimum | Tavsiye |
|---------|---------|---------|
| **CPU** | 4 çekirdek | 8 çekirdek |
| **RAM** | 8 GB | 16 GB |
| **Disk** | 50 GB SSD | 100 GB SSD |
| **OS** | Linux (Ubuntu/RHEL) veya Windows Server | Ubuntu 22.04 LTS |
| **Docker** | Docker Engine 24+ | Docker Engine 26+ |
| **Docker Compose** | v2.20+ | v2.27+ |

### 8.2. Kurulum

```bash
# 1. Repo'yu klonlayın
git clone <repo-url> temsa-digital-twin
cd temsa-digital-twin

# 2. Ortam değişkenlerini ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin: DB_PASSWORD, SECRET_KEY, vb.

# 3. Docker ile başlatın
docker compose up -d --build

# 4. Sağlık kontrolü
curl http://localhost:8000/health
curl http://localhost:3000
```

### 8.3. Port Haritası

| Port | Servis | Dahili Port |
|------|--------|-------------|
| 3000 | Frontend (React) | 3000 |
| 8000 | Ana Backend (FastAPI) | 8000 |
| 8001 | BOM Backend (FastAPI) | 8000 |
| 8002 | Simutem Backend | 8000 |
| 5001 | Homologasyon Backend | 5000 |
| 5433 | Ana PostgreSQL | 5432 |
| 5434 | BOM PostgreSQL | 5432 |
| 6379 | Redis | 6379 |

### 8.4. Healthcheck

Tüm kritik servisler Docker healthcheck ile izlenir:

```yaml
# PostgreSQL
test: ["CMD-SHELL", "pg_isready -U temsa -d temsa_twin"]
interval: 5s

# Redis
test: ["CMD", "redis-cli", "ping"]
interval: 5s

# Backend
GET /health → { "status": "ok" }
```

---

## 9. Kaynak Kod Yönetimi

### 9.1. Depo Yapısı

```
temsa-digital-twin/
├── docker-compose.yml          ← Docker orkestrasyon
├── TEKNIK_DOKUMANTASYON.md     ← Bu dokümantasyon
│
├── backend/                    ← Ana FastAPI Backend
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             ← FastAPI uygulama başlangıcı
│       ├── config.py           ← Ortam değişkenleri
│       ├── database.py         ← DB bağlantı yönetimi
│       ├── models.py           ← SQLAlchemy ORM modelleri
│       ├── schemas.py          ← Pydantic veri şemaları
│       ├── routers/            ← API endpoint router'ları (11 adet)
│       └── services/           ← İş mantığı servisleri (7 adet)
│
├── frontend/                   ← React SPA Frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx             ← Ana uygulama, navigasyon, routing
│       ├── api.js              ← Ana backend API client
│       └── components/         ← React bileşenleri (35+ dosya)
│           ├── bomApi.js       ← BOM backend API client
│           ├── CO2Panel.jsx
│           ├── BomProjectsPanel.jsx
│           ├── DashboardPage.jsx
│           └── ...
│
├── db/
│   └── init.sql                ← Veritabanı şema tanımı
│
├── simutem-backend/            ← EV Simülasyon mikroservisi
├── vecto_files/                ← VECTO girdi dosyaları
├── vecto_outputs/              ← VECTO çıktı dosyaları
└── Output Files/               ← İşlenmiş VECTO sonuçları
```

### 9.2. Kod Güvenliği

- Kaynak kod Git ile versiyon kontrollü
- `.env` dosyaları `.gitignore` ile korunur
- Hassas bilgiler (şifre, secret key) ortam değişkenleri ile yönetilir
- Dockerfile'lar minimal base image kullanır (`python:3.12-slim`, `alpine`)

---

## 10. Bakım, Destek ve Sürdürülebilirlik Planı

### 10.1. Kod Bakım Kolaylığı

| Özellik | Açıklama |
|---------|----------|
| **Modüler Mimari** | Her modül bağımsız React bileşeni — yeni modül eklemek veya mevcut modülü güncellemek diğerlerini etkilemez |
| **Standart Teknolojiler** | React, FastAPI, PostgreSQL, Docker — sektörde en yaygın kullanılan, geniş topluluk desteği olan araçlar |
| **Konteyner Tabanlı** | Docker Compose ile tek komut kurulum/güncelleme — sunucu bağımsız |
| **API-First** | Frontend ve backend bağımsız geliştirilebilir/güncellenebilir |
| **Kolay Onboarding** | Yeni bir geliştirici `docker compose up -d` ile 5 dakikada çalışır duruma gelir |

### 10.2. Bakım Senaryoları

| Senaryo | Çözüm |
|---------|-------|
| Bug fix | İlgili `.jsx` veya `.py` dosyasını düzenle → `docker compose restart <servis>` |
| Yeni modül ekleme | Yeni React bileşeni oluştur → App.jsx'e nav entry ekle → İsteğe bağlı backend endpoint |
| Veritabanı değişikliği | Yeni migration SQL dosyası oluştur → `docker exec` ile uygula |
| Güvenlik yaması | `requirements.txt` / `package.json` güncelle → `docker compose build --no-cache` |
| Sunucu taşıma | Tüm Docker volume'ları yedekle → Yeni sunucuda `docker compose up -d` |

### 10.3. Devamlılık Planı

**Birincil Geliştirici:** Oğuzhan İnandı (Araç Tasarım Mühendisi)

**Teknik Devir Teslim Kolaylığı:**
1. Tüm kod açık kaynak standart teknolojilerle yazılmıştır — herhangi bir React + Python bilen geliştirici devralabilir
2. Bu dokümantasyon, kod yapısı ve API haritası ile yeni geliştiricinin sistemi anlaması sağlanır
3. Docker sayesinde geliştirme ortamı kurulumu dakikalar içinde tamamlanır
4. Veritabanı şemaları `init.sql` + migration dosyalarıyla tam tanımlıdır

**Tavsiye:** BT ekibinden bir Python/React geliştiricinin sisteme aşinalık kazanması için proje paylaşımı yapılabilir. Geliştirici ayrılma senaryosunda kodun bakımı için:
- 1-2 günlük orientasyon yeterlidir (Docker + proje yapısı)
- Kritik backend değişiklikleri SQL migration + FastAPI endpoint ekleme bilgisi gerektirir
- Frontend değişiklikleri React + Tailwind CSS bilgisi gerektirir

---

## 11. Geliştirme Ortamı Kurulumu

### Gereksinimler

- **Node.js** 18+ (frontend geliştirme için)
- **Python** 3.12+ (backend geliştirme için)
- **Docker Desktop** (konteyner yönetimi)
- **Git** (versiyon kontrol)
- **VS Code** (önerilen IDE — workspace dosyası mevcut)

### Hızlı Başlangıç

```bash
# 1. Tüm servisleri başlatın
docker compose up -d --build

# 2. Frontend geliştirme modu (hot-reload)
cd frontend && npm install && npm run dev

# 3. Backend loglarını izleyin
docker logs -f temsa-backend

# 4. Veritabanına bağlanın
docker exec -it temsa-db psql -U temsa -d temsa_twin
```

---

## 12. Monitoring ve Healthcheck

### Servis Durumu Kontrolleri

```bash
# Tüm konteynerlerin durumu
docker compose ps

# Backend health
curl http://localhost:8000/health

# Frontend erişilebilirlik
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# PostgreSQL bağlantı kontrolü
docker exec temsa-db pg_isready -U temsa -d temsa_twin

# Redis bağlantı kontrolü
docker exec temsa-redis redis-cli ping
```

### Log Yönetimi

```bash
# Tek servis logu
docker logs temsa-backend --tail 100 -f

# Tüm servis logları
docker compose logs -f --tail 50
```

---

## 13. BT Mail Yanıtları

Aşağıda BT ekibinin sorularına detaylı yanıtlar hazırlanmıştır:

---

### Soru 1: "Uygulama tam olarak hangi yazılım dili ve mimariyle geliştirildi?"

**Yanıt:**

Platform, kurumsal yazılım dünyasında en yaygın kullanılan açık kaynak teknolojilerle geliştirilmiştir:

- **Frontend:** React.js 18 (JavaScript) — Meta tarafından geliştirilen, dünyada en çok kullanılan UI framework'ü
- **Backend:** Python FastAPI — Modern, yüksek performanslı Python web framework'ü (async/await destekli)
- **Veritabanı:** PostgreSQL 16 — Kurumsal dünyada en güvenilir açık kaynak ilişkisel veritabanı
- **Dağıtım:** Docker + Docker Compose — Konteyner tabanlı, sunucu bağımsız, tek komutla kurulum

Mimari olarak **API-first microservice yaklaşımı** benimsenmiştir. 8 Docker konteynerinden oluşan sistem, her biri bağımsız ölçeklenebilir ve güncellenebilir durumdadır.

Kullanılan tüm teknolojiler MIT/BSD/Apache lisanslı açık kaynak yazılımlardır. Herhangi bir ticari lisans bağımlılığı yoktur.

---

### Soru 2: "Kodun bakımını ve teknik desteğini kim üstlenecek?"

**Yanıt:**

Projenin **birincil geliştiricisi Oğuzhan İnandı**'dır (Araç Tasarım Mühendisi). Ayrılma senaryosuna karşı aşağıdaki önlemler alınmıştır:

1. **Standart Teknolojiler:** React, Python, PostgreSQL ve Docker dünyada milyonlarca geliştirici tarafından kullanılmaktadır. Herhangi bir junior-mid seviye web geliştiricisi bu projeyi devralabilir.

2. **Modüler Yapı:** Her modül bağımsız çalışır. Bir modüldeki değişiklik diğerlerini etkilemez. Bu, bakımı kolaylaştırır ve risk yayılmasını önler.

3. **Docker Konteynerizasyon:** Sunucu bağımlılığı yoktur. `docker compose up -d` komutuyla herhangi bir Linux/Windows sunucuda dakikalar içinde ayağa kalkar.

4. **Kapsamlı Dokümantasyon:** Bu dokümantasyon, sistem mimarisi, veritabanı şeması, API endpoint haritası ve kurulum rehberini detaylı şekilde içermektedir.

5. **Düşük Onboarding Süresi:** Yeni bir geliştirici için tahmini adaptasyon süresi:
   - Sistemi ayağa kaldırma: **< 1 saat**
   - Kod yapısını anlama: **1-2 iş günü**
   - Bağımsız geliştirme yapabilme: **1 hafta**

**Önerimiz:** BT ekibinden bir Python/React geliştiriciye sistemin tanıtılması ve knowledge transfer yapılması. Bu, kurumsal sürdürülebilirlik açısından en sağlıklı yaklaşım olacaktır.

---

### Soru 3: "Teknik bir dokümantasyon ve kaynak kodların tutulduğu güvenli bir alan var mı?"

**Yanıt:**

**Evet, her ikisi de mevcuttur:**

1. **Teknik Dokümantasyon:**
   - Bu dosya (`TEKNIK_DOKUMANTASYON.md`) — 400+ satırlık kapsamlı teknik referans
   - Sistem mimarisi, veritabanı şeması, API haritası, güvenlik detayları, kurulum rehberi ve bakım planını içerir
   - Proje kaynak kodunun kök dizininde bulunur, her zaman güncel tutulur

2. **Kaynak Kod:**
   - Kaynak kod Git versiyon kontrol sistemi ile yönetilmektedir
   - Tüm kod, konfigürasyon ve veritabanı şemaları tek bir monorepo'da bulunur
   - Docker volume'lar ile veritabanı verisi kalıcı şekilde saklanır

3. **Güvenli Saklama Önerileri:**
   - Kaynak kodun kurumsal Git sunucusuna (GitLab/Azure DevOps) aktarılması
   - Düzenli veritabanı yedekleme (pg_dump) planlanması
   - Docker image'ların kurumsal registry'de saklanması

**BT ekibiyle yapılabilecek aksiyonlar:**
- Kodun kurumsal Git altyapınıza taşınması
- CI/CD pipeline kurulumu (otomatik build & deploy)
- Düzenli yedekleme planı oluşturulması
- SSL/TLS sertifikası ile HTTPS yapılandırması (production)

---

*Bu dokümantasyon yaşayan bir belge olup, platform geliştikçe güncellenecektir.*
