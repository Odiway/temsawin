// Adana Büyükşehir Belediyesi Toplu Taşıma Hat Verileri
// Kaynak: https://ulasimbilgi.adana.bel.tr/Otobusler

export const ROUTE_CATEGORIES = {
  urban: { label: 'Şehir İçi', color: '#3b82f6', icon: '🏙️' },
  suburban: { label: 'Banliyö', color: '#10b981', icon: '🛣️' },
  intercity: { label: 'İlçeler Arası', color: '#f59e0b', icon: '🚌' },
  regional: { label: 'Bölgesel', color: '#8b5cf6', icon: '📍' },
  shuttle: { label: 'Mezarlık Servisi', color: '#64748b', icon: '🔄' },
};

// Adana coğrafi referans noktaları (yaklaşık koordinatlar)
const LANDMARKS = {
  'BALCALI': [37.058, 35.363],
  'TEKNOKENT': [37.060, 35.350],
  'REAL': [37.003, 35.295],
  'ESKİ VİLAYET': [36.986, 35.328],
  'TAŞKÖPRÜ': [36.997, 35.325],
  'OPTİMUM': [37.010, 35.315],
  'HAVALİMANI': [36.982, 35.280],
  'MERKEZ OTOGAR': [37.005, 35.303],
  'ÇİFTEMİNARE': [36.988, 35.335],
  'KANAL KÖPRÜ': [36.995, 35.340],
  'ATÜ': [37.060, 35.350],
  'GÜLBAHÇESİ': [37.050, 35.380],
  'ŞEHİR HASTANESİ': [37.040, 35.355],
  'YÜREĞİR OTOGARI': [37.005, 35.370],
  'KÜÇÜK SAAT': [36.990, 35.330],
  'AQUALAND': [36.998, 35.310],
  'KOZAN': [37.452, 35.814],
  'CEYHAN': [37.029, 35.814],
  'YUMURTALIK': [36.763, 35.790],
  'KARATAŞ': [36.566, 35.383],
  'POZANTI': [37.428, 34.872],
  'KARAİSALI': [37.246, 35.078],
  'ALADAĞ': [37.548, 35.395],
  'İMAMOĞLU': [37.307, 35.674],
};

export const ADANA_ROUTES = [
  // ═══════ 1xx — Şehir İçi Hatları ═══════
  { id: '105', name: 'Balcalı - Teknokent', start: 'BALCALI', end: 'TEKNOKENT', category: 'urban', distance_km: 8.5, stops: 18, travel_time_min: 25, elevation_m: 15, frequency_min: 20 },
  { id: '110', name: 'Real - Beyceli', start: 'REAL', end: 'BEYCELİ', category: 'urban', distance_km: 18.2, stops: 32, travel_time_min: 55, elevation_m: 25, frequency_min: 15 },
  { id: '111', name: 'Eski Vilayet - Sofulu', start: 'ESKİ VİLAYET', end: 'SOFULU', category: 'urban', distance_km: 14.5, stops: 28, travel_time_min: 45, elevation_m: 20, frequency_min: 20 },
  { id: '112A', name: 'A - Beyceli - Balcalı', start: 'BEYCELİ', end: 'BALCALI', category: 'urban', distance_km: 22.0, stops: 38, travel_time_min: 65, elevation_m: 30, frequency_min: 20 },
  { id: '112B', name: 'B - Balcalı - Buruk Toki', start: 'BALCALI', end: 'BURUK TOKİ', category: 'urban', distance_km: 15.8, stops: 26, travel_time_min: 48, elevation_m: 20, frequency_min: 25 },
  { id: '113', name: 'E.Vilayet - Akkuyu Toki', start: 'ESKİ VİLAYET', end: 'AKKUYU TOKİ', category: 'urban', distance_km: 12.3, stops: 24, travel_time_min: 40, elevation_m: 15, frequency_min: 20 },
  { id: '114A', name: '114A - Optimum - Real', start: 'OPTİMUM', end: 'REAL', category: 'urban', distance_km: 10.5, stops: 22, travel_time_min: 35, elevation_m: 10, frequency_min: 15 },
  { id: '114B', name: '114B - Real - Optimum', start: 'REAL', end: 'OPTİMUM', category: 'urban', distance_km: 11.0, stops: 23, travel_time_min: 38, elevation_m: 10, frequency_min: 20 },
  { id: '115', name: 'Optimum - Karslılar Mah.', start: 'OPTİMUM', end: 'KARSLILAR MAH.', category: 'urban', distance_km: 13.7, stops: 26, travel_time_min: 42, elevation_m: 20, frequency_min: 20 },
  { id: '116', name: 'Y.Doğan - Balcalı - ATÜ', start: 'Y. DOĞAN', end: 'ATÜ', category: 'urban', distance_km: 19.5, stops: 34, travel_time_min: 58, elevation_m: 25, frequency_min: 15 },
  { id: '117', name: 'Taşköprü - Kılıçlı - Kızılkaş', start: 'TAŞKÖPRÜ', end: 'KIZILKAŞ', category: 'suburban', distance_km: 24.0, stops: 30, travel_time_min: 55, elevation_m: 45, frequency_min: 30 },
  { id: '118A', name: 'A - Eski Vilayet - Balcalı', start: 'ESKİ VİLAYET', end: 'BALCALI', category: 'urban', distance_km: 16.0, stops: 30, travel_time_min: 50, elevation_m: 20, frequency_min: 15 },
  { id: '118B', name: 'B - Balcalı - Eski Vilayet', start: 'BALCALI', end: 'ESKİ VİLAYET', category: 'urban', distance_km: 16.5, stops: 31, travel_time_min: 52, elevation_m: 20, frequency_min: 20 },
  { id: '119A', name: '119A - Eski Vilayet - Yeniyayla', start: 'ESKİ VİLAYET', end: 'YENİYAYLA', category: 'urban', distance_km: 14.0, stops: 27, travel_time_min: 45, elevation_m: 18, frequency_min: 20 },
  { id: '119B', name: '119B - Buruk Toki - Eski Vilayet', start: 'BURUK TOKİ', end: 'ESKİ VİLAYET', category: 'urban', distance_km: 13.5, stops: 25, travel_time_min: 42, elevation_m: 15, frequency_min: 25 },
  { id: '120', name: 'Taşköprü - Buruk Mez. - Ünlüce', start: 'TAŞKÖPRÜ', end: 'ÜNLÜCE', category: 'suburban', distance_km: 20.0, stops: 28, travel_time_min: 50, elevation_m: 35, frequency_min: 30 },
  { id: '121', name: 'Real - Balcalı - ATÜ', start: 'REAL', end: 'ATÜ', category: 'urban', distance_km: 21.0, stops: 36, travel_time_min: 60, elevation_m: 25, frequency_min: 15 },
  { id: '122', name: 'Mobilyacılar - Balcalı', start: 'MOBİLYACILAR', end: 'BALCALI', category: 'urban', distance_km: 17.5, stops: 30, travel_time_min: 52, elevation_m: 22, frequency_min: 20 },
  { id: '123', name: 'Balcalı - Afetevleri', start: 'BALCALI', end: 'AFETEVLERİ', category: 'urban', distance_km: 15.0, stops: 28, travel_time_min: 46, elevation_m: 18, frequency_min: 20 },
  { id: '124', name: 'Balcalı - Real', start: 'BALCALI', end: 'REAL', category: 'urban', distance_km: 18.0, stops: 32, travel_time_min: 55, elevation_m: 20, frequency_min: 15 },
  { id: '125', name: 'Havalimanı - Buruk Toki', start: 'HAVALİMANI', end: 'BURUK TOKİ', category: 'urban', distance_km: 16.5, stops: 28, travel_time_min: 50, elevation_m: 15, frequency_min: 20 },
  { id: '126', name: 'Mobilyacılar - Metal Sanayi - B.Dikili', start: 'MOBİLYACILAR', end: 'BÜYÜK DİKİLİ', category: 'suburban', distance_km: 25.0, stops: 35, travel_time_min: 65, elevation_m: 40, frequency_min: 25 },
  { id: '127', name: 'İncirlik Mah. - Balcalı', start: 'İNCİRLİK MAH.', end: 'BALCALI', category: 'urban', distance_km: 20.0, stops: 34, travel_time_min: 58, elevation_m: 22, frequency_min: 20 },
  { id: '130', name: 'Hadırlı - Balcalı', start: 'HADIRLI', end: 'BALCALI', category: 'suburban', distance_km: 22.5, stops: 30, travel_time_min: 55, elevation_m: 35, frequency_min: 25 },
  { id: '131', name: 'Akkapı - Balcalı', start: 'AKKAPI', end: 'BALCALI', category: 'urban', distance_km: 17.0, stops: 30, travel_time_min: 52, elevation_m: 20, frequency_min: 20 },
  { id: '132', name: 'K.Oba Mezarlığı - Gülbahçesi - Balcalı', start: 'K.OBA MEZARLIĞI', end: 'BALCALI', category: 'urban', distance_km: 19.0, stops: 33, travel_time_min: 56, elevation_m: 22, frequency_min: 20 },
  { id: '133', name: 'Dağlıoğlu - Balcalı', start: 'DAĞLIOĞLU', end: 'BALCALI', category: 'suburban', distance_km: 24.0, stops: 28, travel_time_min: 55, elevation_m: 45, frequency_min: 30 },
  { id: '135', name: 'Sarıçam Bld. - Şehir Hastanesi - Gülbahçesi', start: 'SARIÇAM BLD.', end: 'GÜLBAHÇESİ', category: 'urban', distance_km: 18.5, stops: 32, travel_time_min: 55, elevation_m: 25, frequency_min: 15 },
  { id: '140', name: 'Real - Akkuyu Toki', start: 'REAL', end: 'AKKUYU TOKİ', category: 'urban', distance_km: 14.0, stops: 26, travel_time_min: 42, elevation_m: 15, frequency_min: 15 },
  { id: '142', name: 'E.Vilayet - Real', start: 'ESKİ VİLAYET', end: 'REAL', category: 'urban', distance_km: 11.0, stops: 22, travel_time_min: 35, elevation_m: 10, frequency_min: 15 },
  { id: '144', name: 'Real - ATÜ', start: 'REAL', end: 'ATÜ', category: 'urban', distance_km: 20.5, stops: 35, travel_time_min: 60, elevation_m: 25, frequency_min: 15 },
  { id: '151', name: 'Beyceli - Real', start: 'BEYCELİ', end: 'REAL', category: 'urban', distance_km: 19.0, stops: 33, travel_time_min: 55, elevation_m: 22, frequency_min: 15 },
  { id: '153', name: 'Şambayat - Balcalı', start: 'ŞAMBAYAT', end: 'BALCALI', category: 'suburban', distance_km: 23.0, stops: 30, travel_time_min: 55, elevation_m: 35, frequency_min: 25 },
  { id: '154', name: 'Balcalı - Real - Yeşiloba', start: 'BALCALI', end: 'YEŞİLOBA', category: 'urban', distance_km: 22.0, stops: 38, travel_time_min: 65, elevation_m: 25, frequency_min: 15 },
  { id: '155', name: 'Hastaneler - Balcalı - ATÜ', start: 'HASTANELER', end: 'ATÜ', category: 'urban', distance_km: 18.0, stops: 32, travel_time_min: 55, elevation_m: 22, frequency_min: 15 },
  { id: '156', name: 'Real - Balcalı', start: 'REAL', end: 'BALCALI', category: 'urban', distance_km: 17.5, stops: 30, travel_time_min: 52, elevation_m: 20, frequency_min: 15 },
  { id: '157', name: 'Real - E.Vilayet', start: 'REAL', end: 'ESKİ VİLAYET', category: 'urban', distance_km: 11.5, stops: 23, travel_time_min: 38, elevation_m: 10, frequency_min: 15 },
  { id: '158', name: 'Osmangazi - Real', start: 'OSMANGAZİ', end: 'REAL', category: 'urban', distance_km: 15.0, stops: 28, travel_time_min: 46, elevation_m: 18, frequency_min: 15 },
  { id: '159A', name: 'A - Gülbahçesi - Çukurova Hast.', start: 'GÜLBAHÇESİ', end: 'ÇUKUROVA HAST.', category: 'urban', distance_km: 12.0, stops: 22, travel_time_min: 38, elevation_m: 15, frequency_min: 20 },
  { id: '159B', name: 'B - Çukurova D. Hast - Gülbahçesi', start: 'ÇUKUROVA D. HAST', end: 'GÜLBAHÇESİ', category: 'urban', distance_km: 13.0, stops: 24, travel_time_min: 40, elevation_m: 15, frequency_min: 25 },
  { id: '160A', name: 'A - Real - Şehir Hastanesi - ATÜ', start: 'REAL', end: 'ATÜ', category: 'urban', distance_km: 24.0, stops: 38, travel_time_min: 68, elevation_m: 28, frequency_min: 15 },
  { id: '160B', name: 'B - ATÜ - Şehir Hastanesi - Real', start: 'ATÜ', end: 'REAL', category: 'urban', distance_km: 24.5, stops: 39, travel_time_min: 70, elevation_m: 28, frequency_min: 20 },
  { id: '161', name: 'Real - ATÜ', start: 'REAL', end: 'ATÜ', category: 'urban', distance_km: 20.0, stops: 34, travel_time_min: 58, elevation_m: 25, frequency_min: 15 },
  { id: '162', name: 'Real - Şehir Hastanesi - Çınarlı', start: 'REAL', end: 'ÇINARLI', category: 'urban', distance_km: 16.0, stops: 30, travel_time_min: 50, elevation_m: 18, frequency_min: 20 },
  { id: '164', name: 'DSİ Toki - Hastaneler - Gökçeler', start: 'DSİ TOKİ', end: 'GÖKÇELER', category: 'suburban', distance_km: 22.0, stops: 30, travel_time_min: 55, elevation_m: 35, frequency_min: 25 },
  { id: '165', name: 'Sarıçam Belediyesi - Yolgeçen', start: 'SARIÇAM BELEDİYESİ', end: 'YOLGEÇEN', category: 'suburban', distance_km: 26.0, stops: 28, travel_time_min: 55, elevation_m: 40, frequency_min: 30 },
  { id: '166', name: 'Yenidoğan - Sarıhuğular', start: 'YENİDOĞAN', end: 'SARIHUĞULAR', category: 'suburban', distance_km: 20.0, stops: 25, travel_time_min: 48, elevation_m: 35, frequency_min: 30 },
  { id: '170', name: 'Havutlu - Menekşe - Balcalı', start: 'HAVUTLU', end: 'BALCALI', category: 'suburban', distance_km: 28.0, stops: 32, travel_time_min: 60, elevation_m: 45, frequency_min: 25 },
  { id: '172', name: 'Kanara - B.Evleri - Ş.Toki', start: 'KANARA', end: 'Ş.TOKİ', category: 'urban', distance_km: 15.0, stops: 26, travel_time_min: 45, elevation_m: 18, frequency_min: 20 },
  { id: '173', name: 'Yeniköy - Taşçı - Taşköprü', start: 'YENİKÖY', end: 'TAŞKÖPRÜ', category: 'suburban', distance_km: 22.0, stops: 24, travel_time_min: 48, elevation_m: 40, frequency_min: 40 },
  { id: '174', name: 'Merkez Otogar - Sarıçam Belediye', start: 'MERKEZ OTOGAR', end: 'SARIÇAM BELEDİYE', category: 'urban', distance_km: 18.0, stops: 32, travel_time_min: 55, elevation_m: 22, frequency_min: 15 },
  { id: '175', name: 'Kanal Köprü - Çatalan', start: 'KANAL KÖPRÜ', end: 'ÇATALAN', category: 'intercity', distance_km: 42.0, stops: 25, travel_time_min: 75, elevation_m: 120, frequency_min: 40 },
  { id: '176', name: 'Çifteminare - Salbaş', start: 'ÇİFTEMİNARE', end: 'SALBAŞ', category: 'suburban', distance_km: 30.0, stops: 28, travel_time_min: 60, elevation_m: 55, frequency_min: 35 },
  { id: '177', name: 'Çifteminare - K.Yusuflu', start: 'ÇİFTEMİNARE', end: 'K.YUSUFLU', category: 'suburban', distance_km: 25.0, stops: 26, travel_time_min: 52, elevation_m: 45, frequency_min: 30 },
  { id: '178', name: 'Taşköprü - Solaklı - Gümüşyazı', start: 'TAŞKÖPRÜ', end: 'GÜMÜŞYAZI', category: 'suburban', distance_km: 32.0, stops: 28, travel_time_min: 60, elevation_m: 65, frequency_min: 35 },
  { id: '179', name: 'Taşköprü - Helvacı', start: 'TAŞKÖPRÜ', end: 'HELVACI', category: 'suburban', distance_km: 28.0, stops: 24, travel_time_min: 52, elevation_m: 55, frequency_min: 35 },
  { id: '180', name: 'Taşköprü - Zağırlı', start: 'TAŞKÖPRÜ', end: 'ZAĞIRLI', category: 'suburban', distance_km: 26.0, stops: 22, travel_time_min: 48, elevation_m: 50, frequency_min: 40 },
  { id: '181', name: 'Taşköprü - Herekli', start: 'TAŞKÖPRÜ', end: 'HEREKLİ', category: 'suburban', distance_km: 30.0, stops: 26, travel_time_min: 55, elevation_m: 60, frequency_min: 35 },
  { id: '182', name: 'Kahyalar - Kanalköprü', start: 'KAHYALAR', end: 'KANALKÖPRÜ', category: 'suburban', distance_km: 22.0, stops: 24, travel_time_min: 48, elevation_m: 40, frequency_min: 30 },
  { id: '183', name: 'Taşköprü - Kürkçüler', start: 'TAŞKÖPRÜ', end: 'KÜRKÇÜLER', category: 'suburban', distance_km: 25.0, stops: 22, travel_time_min: 48, elevation_m: 50, frequency_min: 35 },
  { id: '184', name: 'Taşköprü - Baklalı', start: 'TAŞKÖPRÜ', end: 'BAKLALI', category: 'suburban', distance_km: 28.0, stops: 24, travel_time_min: 52, elevation_m: 55, frequency_min: 40 },
  { id: '185', name: 'Küçük Saat - İncirlik', start: 'KÜÇÜK SAAT', end: 'İNCİRLİK', category: 'urban', distance_km: 15.0, stops: 28, travel_time_min: 45, elevation_m: 15, frequency_min: 20 },
  { id: '186', name: 'Taşköprü - Suluca', start: 'TAŞKÖPRÜ', end: 'SULUCA', category: 'suburban', distance_km: 24.0, stops: 20, travel_time_min: 46, elevation_m: 48, frequency_min: 40 },
  { id: '187', name: 'Taşköprü - Geçitli - Çelemli', start: 'TAŞKÖPRÜ', end: 'ÇELEMLİ', category: 'suburban', distance_km: 35.0, stops: 26, travel_time_min: 60, elevation_m: 70, frequency_min: 40 },
  { id: '188', name: 'Karaisalı - Çifteminare', start: 'KARAİSALI', end: 'ÇİFTEMİNARE', category: 'intercity', distance_km: 55.0, stops: 22, travel_time_min: 85, elevation_m: 180, frequency_min: 45 },
  { id: '189', name: 'Çifteminare - Mürseloğlu', start: 'ÇİFTEMİNARE', end: 'MÜRSELOĞLU', category: 'suburban', distance_km: 20.0, stops: 22, travel_time_min: 45, elevation_m: 35, frequency_min: 30 },
  { id: '190', name: 'Kanal Köprü - Körüklü', start: 'KANAL KÖPRÜ', end: 'KÖRÜKLÜ', category: 'suburban', distance_km: 22.0, stops: 24, travel_time_min: 48, elevation_m: 38, frequency_min: 30 },
  { id: '191', name: 'Taşköprü - Yakapınar', start: 'TAŞKÖPRÜ', end: 'YAKAPINAR', category: 'suburban', distance_km: 26.0, stops: 24, travel_time_min: 50, elevation_m: 42, frequency_min: 30 },
  { id: '192', name: 'Kanal Köprü - Çiçekli', start: 'KANAL KÖPRÜ', end: 'ÇİÇEKLİ', category: 'suburban', distance_km: 22.0, stops: 22, travel_time_min: 46, elevation_m: 35, frequency_min: 35 },
  { id: '193', name: 'E.Vilayet - Küçükçıldırım', start: 'ESKİ VİLAYET', end: 'KÜÇÜKÇILDIRIM', category: 'suburban', distance_km: 18.0, stops: 22, travel_time_min: 42, elevation_m: 30, frequency_min: 30 },
  { id: '194', name: 'Taşköprü - Şeyhganim', start: 'TAŞKÖPRÜ', end: 'ŞEYHGANİM', category: 'suburban', distance_km: 20.0, stops: 20, travel_time_min: 42, elevation_m: 38, frequency_min: 40 },
  { id: '195', name: 'Balcalı - Organize Makina İkmal', start: 'BALCALI', end: 'ORGANİZE MAKİNA İKMAL', category: 'urban', distance_km: 14.0, stops: 24, travel_time_min: 42, elevation_m: 15, frequency_min: 20 },
  { id: '196', name: 'K.Köprü - Çakallı', start: 'KANAL KÖPRÜ', end: 'ÇAKALLI', category: 'suburban', distance_km: 24.0, stops: 22, travel_time_min: 48, elevation_m: 40, frequency_min: 35 },
  { id: '197', name: 'Aqualand - Çiçekli', start: 'AQUALAND', end: 'ÇİÇEKLİ', category: 'suburban', distance_km: 22.0, stops: 24, travel_time_min: 48, elevation_m: 35, frequency_min: 30 },
  { id: '198', name: 'Y.Otogar - Karlık', start: 'Y. OTOGAR', end: 'KARLIK', category: 'suburban', distance_km: 20.0, stops: 22, travel_time_min: 45, elevation_m: 32, frequency_min: 35 },
  { id: '199', name: 'Taşköprü - Sayca - Otluk', start: 'TAŞKÖPRÜ', end: 'OTLUK', category: 'suburban', distance_km: 30.0, stops: 24, travel_time_min: 55, elevation_m: 60, frequency_min: 40 },
  { id: '210', name: 'Aqualand - K.Yolu - Karayusuflu', start: 'AQUALAND', end: 'KARAYUSUFLU', category: 'suburban', distance_km: 18.0, stops: 26, travel_time_min: 48, elevation_m: 25, frequency_min: 25 },
  { id: '250', name: 'Merkez Otogar - Akkuyu Toki', start: 'MERKEZ OTOGAR', end: 'AKKUYU TOKİ', category: 'urban', distance_km: 16.0, stops: 28, travel_time_min: 48, elevation_m: 18, frequency_min: 20 },

  // ═══════ 3xx — Yarı Şehir İçi / Banliyö ═══════
  { id: '300', name: 'Çağ Üniversitesi - Yüreğir Otogarı', start: 'ÇAĞ ÜNİVERSİTESİ', end: 'YÜREĞİR OTOGARI', category: 'suburban', distance_km: 35.0, stops: 32, travel_time_min: 65, elevation_m: 45, frequency_min: 25 },
  { id: '303A', name: '303A - Karahan - Ruh Sağlığı', start: 'KARAHAN', end: 'RUH SAĞLIĞI', category: 'urban', distance_km: 14.0, stops: 26, travel_time_min: 42, elevation_m: 15, frequency_min: 20 },
  { id: '303B', name: '303B - 2.Etap Toki - Şambayat - Ruh Sağlığı', start: '2.ETAP TOKİ', end: 'RUH SAĞLIĞI', category: 'urban', distance_km: 16.0, stops: 28, travel_time_min: 48, elevation_m: 18, frequency_min: 25 },
  { id: '304', name: 'Anadolu Lisesi - Şambayat Toki', start: 'ANADOLU LİSESİ', end: 'ŞAMBAYAT TOKİ', category: 'urban', distance_km: 12.0, stops: 22, travel_time_min: 38, elevation_m: 12, frequency_min: 20 },
  { id: '305', name: 'DSİ Toki - İnönü Adliyesi', start: 'DSİ TOKİ', end: 'İNÖNÜ ADLİYESİ', category: 'urban', distance_km: 14.0, stops: 26, travel_time_min: 42, elevation_m: 15, frequency_min: 20 },

  // ═══════ 4xx — İlçeler Arası Hatlar ═══════
  { id: '401', name: 'Havalimanı - Kozan', start: 'HAVALİMANI', end: 'KOZAN', category: 'intercity', distance_km: 85.0, stops: 22, travel_time_min: 120, elevation_m: 250, frequency_min: 60 },
  { id: '402', name: 'Adana - Aladağ', start: 'ADANA', end: 'ALADAĞ', category: 'intercity', distance_km: 75.0, stops: 18, travel_time_min: 110, elevation_m: 320, frequency_min: 60 },
  { id: '403', name: 'Adana - Ceyhan - Yumurtalık', start: 'ADANA', end: 'YUMURTALIK', category: 'intercity', distance_km: 80.0, stops: 24, travel_time_min: 120, elevation_m: 65, frequency_min: 45 },
  { id: '404', name: 'Taşköprü - Karataş - Yeşilköy', start: 'TAŞKÖPRÜ', end: 'YEŞİLKÖY', category: 'intercity', distance_km: 60.0, stops: 20, travel_time_min: 90, elevation_m: 30, frequency_min: 50 },
  { id: '405', name: 'Adana - Pozantı', start: 'ADANA', end: 'POZANTI', category: 'intercity', distance_km: 95.0, stops: 18, travel_time_min: 130, elevation_m: 750, frequency_min: 60 },
  { id: '406', name: 'Adana - Tuzla - Tabaklar', start: 'ADANA', end: 'TABAKLAR', category: 'intercity', distance_km: 45.0, stops: 20, travel_time_min: 75, elevation_m: 80, frequency_min: 45 },
  { id: '407', name: 'Havalimanı - Çokçapınar - Ceyhan', start: 'HAVALİMANI', end: 'CEYHAN', category: 'intercity', distance_km: 70.0, stops: 22, travel_time_min: 100, elevation_m: 55, frequency_min: 50 },
  { id: '408', name: 'Adana - İmamoğlu - Akdam', start: 'ADANA', end: 'AKDAM', category: 'intercity', distance_km: 65.0, stops: 18, travel_time_min: 95, elevation_m: 120, frequency_min: 60 },
  { id: '409', name: 'Adana - Gerdibi', start: 'ADANA', end: 'GERDİBİ', category: 'intercity', distance_km: 50.0, stops: 16, travel_time_min: 80, elevation_m: 150, frequency_min: 60 },
  { id: '410', name: 'Adana - Beyören - İmamoğlu', start: 'ADANA', end: 'İMAMOĞLU', category: 'intercity', distance_km: 60.0, stops: 18, travel_time_min: 90, elevation_m: 110, frequency_min: 60 },
  { id: '411', name: 'Adana - Tuzla Kapı Mah.', start: 'ADANA', end: 'TUZLA KAPI MH', category: 'intercity', distance_km: 48.0, stops: 18, travel_time_min: 78, elevation_m: 85, frequency_min: 50 },
  { id: '413', name: 'Yumurtalık - Ceyhan - Deveciuşağı', start: 'YUMURTALIK', end: 'DEVECİUŞAĞI', category: 'intercity', distance_km: 55.0, stops: 16, travel_time_min: 85, elevation_m: 45, frequency_min: 60 },

  // ═══════ 5xx — Bölgesel Hatlar (Ceyhan/Kozan) ═══════
  { id: '502', name: 'Ceyhan - K.Pınarı - K.Kulağı - İncirli', start: 'CEYHAN', end: 'İNCİRLİ', category: 'regional', distance_km: 35.0, stops: 18, travel_time_min: 60, elevation_m: 55, frequency_min: 50 },
  { id: '503', name: 'Ceyhan - Sarımazı', start: 'CEYHAN', end: 'SARIMAZI', category: 'regional', distance_km: 25.0, stops: 14, travel_time_min: 45, elevation_m: 35, frequency_min: 50 },
  { id: '504', name: 'Ceyhan - Dutlupınar - Dokuztekne', start: 'CEYHAN', end: 'DOKUZTEKNE', category: 'regional', distance_km: 30.0, stops: 16, travel_time_min: 52, elevation_m: 45, frequency_min: 50 },
  { id: '505', name: 'Ceyhan - Birkent', start: 'CEYHAN', end: 'BİRKENT', category: 'regional', distance_km: 20.0, stops: 12, travel_time_min: 38, elevation_m: 30, frequency_min: 50 },
  { id: '506', name: 'Ceyhan - Günlüce', start: 'CEYHAN', end: 'GÜNLÜCE', category: 'regional', distance_km: 22.0, stops: 14, travel_time_min: 42, elevation_m: 35, frequency_min: 50 },
  { id: '507', name: 'Ceyhan - Doruk', start: 'CEYHAN', end: 'DORUK', category: 'regional', distance_km: 28.0, stops: 14, travel_time_min: 48, elevation_m: 42, frequency_min: 60 },
  { id: '511', name: 'Kozan - Ayşehoca', start: 'KOZAN', end: 'AYŞEHOCA', category: 'regional', distance_km: 20.0, stops: 12, travel_time_min: 38, elevation_m: 45, frequency_min: 60 },
  { id: '512', name: 'Ceyhan - Hacıbeyli', start: 'CEYHAN', end: 'HACIBEYLİ', category: 'regional', distance_km: 18.0, stops: 12, travel_time_min: 35, elevation_m: 28, frequency_min: 50 },

  // ═══════ 6xx — Mezarlık Servis Hatları ═══════
  { id: '600', name: 'Buruk Mezarlığı - Eski Vilayet', start: 'BURUK MEZARLIĞI', end: 'ESKİ VİLAYET', category: 'shuttle', distance_km: 8.0, stops: 14, travel_time_min: 25, elevation_m: 10, frequency_min: 30 },
  { id: '601', name: 'Kabasakal Mezarlığı - Eski Vilayet', start: 'KABASAKAL MEZARLIĞI', end: 'ESKİ VİLAYET', category: 'shuttle', distance_km: 10.0, stops: 16, travel_time_min: 30, elevation_m: 12, frequency_min: 30 },
  { id: '602', name: 'Akkapı Mezarlığı - Eski Vilayet', start: 'AKKAPI MEZARLIĞI', end: 'ESKİ VİLAYET', category: 'shuttle', distance_km: 9.0, stops: 14, travel_time_min: 28, elevation_m: 10, frequency_min: 30 },
  { id: '603', name: 'Asri Mezarlığı - Eski Vilayet', start: 'ASRİ MEZARLIĞI', end: 'ESKİ VİLAYET', category: 'shuttle', distance_km: 7.0, stops: 12, travel_time_min: 22, elevation_m: 8, frequency_min: 30 },
  { id: '604', name: 'Küçükoba Mezarlığı - Eski Vilayet', start: 'KÜÇÜKOBA MEZARLIĞI', end: 'ESKİ VİLAYET', category: 'shuttle', distance_km: 10.0, stops: 16, travel_time_min: 30, elevation_m: 12, frequency_min: 30 },
  { id: '605', name: 'Alihocalı Mezarlığı - Kanara - Eski Vilayet', start: 'ALİHOCALI MEZARLIĞI', end: 'ESKİ VİLAYET', category: 'shuttle', distance_km: 12.0, stops: 18, travel_time_min: 35, elevation_m: 15, frequency_min: 30 },
  { id: '606', name: 'Alihocalı Mezarlığı - Akdeniz', start: 'ALİHOCALI MEZARLIĞI', end: 'AKDENİZ', category: 'shuttle', distance_km: 8.0, stops: 14, travel_time_min: 25, elevation_m: 10, frequency_min: 30 },
];

// TEMSA Araç Varyantları - Simülasyon İçin
export const TEMSA_VARIANTS = [
  {
    id: 'avenue-ev',
    name: 'Avenue EV',
    type: 'electric',
    length_m: 12,
    capacity: 80,
    curb_mass_kg: 13500,
    battery_kwh: 300,
    range_km: 300,
    max_power_kw: 250,
    consumption_kwh_per_km: 1.0,
    charging_time_h: 3.5,
    co2_per_km: 0,
    icon: '🔋',
    color: '#22c55e',
    suitable_for: ['urban', 'suburban'],
  },
  {
    id: 'avenue-electron',
    name: 'Avenue Electron',
    type: 'electric',
    length_m: 12,
    capacity: 85,
    curb_mass_kg: 14200,
    battery_kwh: 350,
    range_km: 350,
    max_power_kw: 280,
    consumption_kwh_per_km: 1.0,
    charging_time_h: 4.0,
    co2_per_km: 0,
    icon: '⚡',
    color: '#3b82f6',
    suitable_for: ['urban', 'suburban', 'intercity'],
  },
  {
    id: 'md9-electrity',
    name: 'MD9 electriCITY',
    type: 'electric',
    length_m: 9.5,
    capacity: 65,
    curb_mass_kg: 10800,
    battery_kwh: 230,
    range_km: 250,
    max_power_kw: 200,
    consumption_kwh_per_km: 0.92,
    charging_time_h: 3.0,
    co2_per_km: 0,
    icon: '🔌',
    color: '#06b6d4',
    suitable_for: ['urban', 'shuttle'],
  },
  {
    id: 'prestij-ev',
    name: 'Prestij EV',
    type: 'electric',
    length_m: 8.1,
    capacity: 50,
    curb_mass_kg: 7500,
    battery_kwh: 170.8,
    range_km: 200,
    max_power_kw: 125,
    consumption_kwh_per_km: 0.85,
    charging_time_h: 2.5,
    co2_per_km: 0,
    icon: '🚌',
    color: '#8b5cf6',
    suitable_for: ['urban', 'shuttle', 'suburban'],
  },
  {
    id: 'avenue-lf-diesel',
    name: 'Avenue LF (Dizel)',
    type: 'diesel',
    length_m: 12,
    capacity: 90,
    curb_mass_kg: 12000,
    fuel_tank_l: 250,
    range_km: 600,
    max_power_kw: 210,
    consumption_l_per_100km: 38,
    co2_per_km: 1010,
    icon: '⛽',
    color: '#f59e0b',
    suitable_for: ['urban', 'suburban', 'intercity', 'regional'],
  },
  {
    id: 'safir-plus-diesel',
    name: 'Safir Plus (Dizel)',
    type: 'diesel',
    length_m: 13,
    capacity: 51,
    curb_mass_kg: 18500,
    fuel_tank_l: 400,
    range_km: 800,
    max_power_kw: 310,
    consumption_l_per_100km: 28,
    co2_per_km: 745,
    icon: '🚍',
    color: '#ef4444',
    suitable_for: ['intercity', 'regional'],
  },
  {
    id: 'maraton-diesel',
    name: 'Maraton (Dizel)',
    type: 'diesel',
    length_m: 12.2,
    capacity: 49,
    curb_mass_kg: 17200,
    fuel_tank_l: 370,
    range_km: 750,
    max_power_kw: 290,
    consumption_l_per_100km: 30,
    co2_per_km: 798,
    icon: '🛤️',
    color: '#ec4899',
    suitable_for: ['intercity', 'regional'],
  },
  {
    id: 'avenue-lf-cng',
    name: 'Avenue LF (CNG)',
    type: 'cng',
    length_m: 12,
    capacity: 88,
    curb_mass_kg: 12800,
    fuel_tank_l: 1200, // Nm³
    range_km: 450,
    max_power_kw: 200,
    consumption_l_per_100km: 48, // Nm³/100km
    co2_per_km: 750,
    icon: '💨',
    color: '#10b981',
    suitable_for: ['urban', 'suburban'],
  },
];

// Simülasyon hesaplama fonksiyonları
export function simulateRoute(route, variant, params = {}) {
  const {
    passenger_load = 0.65,       // %65 doluluk
    hvac_active = true,
    traffic_factor = 1.2,        // trafik yoğunluğu çarpanı
    temperature_c = 30,          // Adana sıcak iklim
    elevation_factor = 1.0,
    regen_efficiency = 0.35,     // rejeneratif frenleme verimi
  } = params;

  const passengers = Math.round(variant.capacity * passenger_load);
  const passenger_mass = passengers * 70; // 70 kg/yolcu
  const total_mass = variant.curb_mass_kg + passenger_mass;

  // Enerji/yakıt tüketim hesaplama
  const stops_per_km = route.stops / route.distance_km;
  const elevation_penalty = 1 + (route.elevation_m / route.distance_km) * 0.05;
  const stop_penalty = 1 + stops_per_km * 0.08;
  const mass_factor = total_mass / variant.curb_mass_kg;
  const traffic_mult = route.category === 'urban' ? traffic_factor : (route.category === 'suburban' ? traffic_factor * 0.7 : 1.1);

  // HVAC enerji ek tüketimi (Adana sıcak iklim)
  const hvac_factor = hvac_active ? (temperature_c > 25 ? 1 + (temperature_c - 25) * 0.015 : 1.0) : 1.0;

  let energy_consumption, fuel_consumption, co2_total, cost_per_trip;
  let range_sufficient, remaining_range;

  if (variant.type === 'electric') {
    // Elektrikli: kWh/km hesaplama
    const base_consumption = variant.consumption_kwh_per_km;
    const adjusted_consumption = base_consumption * elevation_penalty * stop_penalty * mass_factor * traffic_mult * hvac_factor;
    const regen_savings = variant.type === 'electric' ? adjusted_consumption * regen_efficiency * (stops_per_km / 5.0) : 0;
    energy_consumption = Math.max(adjusted_consumption - regen_savings, base_consumption * 0.6);
    fuel_consumption = null;

    const total_energy = energy_consumption * route.distance_km;
    remaining_range = ((variant.battery_kwh - total_energy) / energy_consumption);
    range_sufficient = remaining_range > 0;

    co2_total = 0;
    cost_per_trip = total_energy * 2.5; // TL/kWh ortalama
  } else if (variant.type === 'cng') {
    const base_consumption = variant.consumption_l_per_100km / 100;
    const adjusted = base_consumption * elevation_penalty * stop_penalty * mass_factor * traffic_mult;
    fuel_consumption = adjusted;
    energy_consumption = null;

    const total_fuel = fuel_consumption * route.distance_km;
    remaining_range = ((variant.fuel_tank_l - total_fuel) / fuel_consumption);
    range_sufficient = remaining_range > 0;

    co2_total = variant.co2_per_km * route.distance_km / 1000; // kg CO2
    cost_per_trip = total_fuel * 11.5; // TL/Nm³
  } else {
    // Dizel
    const base_consumption = variant.consumption_l_per_100km / 100;
    const adjusted = base_consumption * elevation_penalty * stop_penalty * mass_factor * traffic_mult;
    fuel_consumption = adjusted;
    energy_consumption = null;

    const total_fuel = fuel_consumption * route.distance_km;
    remaining_range = ((variant.fuel_tank_l - total_fuel) / fuel_consumption);
    range_sufficient = remaining_range > 0;

    co2_total = variant.co2_per_km * route.distance_km / 1000; // kg CO2
    cost_per_trip = total_fuel * 42.0; // TL/lt dizel
  }

  // Menzil yeterliliği (gidiş-dönüş)
  const round_trip_distance = route.distance_km * 2;
  const daily_trips = Math.floor((16 * 60) / (route.travel_time_min * 2 + 10)); // 16 saat sefer, 10 dk mola
  const range_for_day = variant.type === 'electric'
    ? variant.battery_kwh / energy_consumption
    : variant.range_km;
  const can_cover_daily = range_for_day >= round_trip_distance * Math.min(daily_trips, 3);

  // Uygunluk puanı
  let suitability_score = 50;
  if (variant.suitable_for.includes(route.category)) suitability_score += 20;
  if (range_sufficient) suitability_score += 15;
  if (can_cover_daily) suitability_score += 10;
  if (variant.capacity >= route.stops * 2) suitability_score += 5;
  suitability_score = Math.min(100, suitability_score);

  const travel_time_adjusted = route.travel_time_min * traffic_mult;

  return {
    route,
    variant,
    passengers,
    total_mass,
    energy_consumption_kwh_km: energy_consumption,
    fuel_consumption_l_km: fuel_consumption,
    total_energy_kwh: energy_consumption ? energy_consumption * route.distance_km : null,
    total_fuel_l: fuel_consumption ? fuel_consumption * route.distance_km : null,
    co2_total_kg: co2_total,
    cost_per_trip,
    cost_per_km: cost_per_trip / route.distance_km,
    range_sufficient,
    remaining_range: Math.max(0, remaining_range),
    can_cover_daily,
    daily_trips,
    round_trip_distance,
    travel_time_adjusted: Math.round(travel_time_adjusted),
    suitability_score,
    avg_speed_kmh: route.distance_km / (travel_time_adjusted / 60),
    stops_per_km,
    elevation_penalty,
    hvac_factor,
    traffic_mult,
  };
}

// Tüm varyantlar için topluca simülasyon
export function simulateAllVariants(route, params = {}) {
  return TEMSA_VARIANTS.map(v => simulateRoute(route, v, params));
}

// Günlük filo operasyon maliyeti
export function calculateDailyFleetCost(route, variant, fleet_size = 1, params = {}) {
  const sim = simulateRoute(route, variant, params);
  const daily_cost = sim.cost_per_trip * sim.daily_trips * 2 * fleet_size; // gidiş-dönüş
  const daily_co2 = sim.co2_total_kg * sim.daily_trips * 2 * fleet_size;
  return {
    ...sim,
    fleet_size,
    daily_cost,
    monthly_cost: daily_cost * 26, // 26 iş günü
    yearly_cost: daily_cost * 312,
    daily_co2_kg: daily_co2,
    yearly_co2_ton: (daily_co2 * 312) / 1000,
  };
}
