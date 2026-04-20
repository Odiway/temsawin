import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

/* ── Animated counter ── */
function AnimVal({ value, suffix = '', decimals = 0 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const observed = useRef(false);
  useEffect(() => {
    const end = typeof value === 'number' ? value : parseFloat(value) || 0;
    if (!end || observed.current) { setN(value); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !observed.current) {
        observed.current = true;
        let start = 0;
        const step = Math.max(end / 50, 0.1);
        const iv = setInterval(() => {
          start += step;
          if (start >= end) { setN(end); clearInterval(iv); }
          else setN(decimals ? parseFloat(start.toFixed(decimals)) : Math.floor(start));
        }, 25);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value, decimals]);
  return <span ref={ref}>{typeof n === 'number' ? (decimals ? n.toFixed(decimals) : n) : n}{suffix}</span>;
}

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [fleet, setFleet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStats().catch(() => null),
      api.getFleetSummary().catch(() => null),
    ]).then(([s, f]) => {
      setStats(s);
      setFleet(f);
    }).finally(() => setLoading(false));
  }, []);

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Günaydın' : hours < 18 ? 'İyi Günler' : 'İyi Akşamlar';

  return (
    <div className="dash-page">
      {/* Hero banner with parallax bus */}
      <div className="dash-hero">
        <div className="dash-hero-bg">
          <img src="/slider-1.jpg" alt="" className="dash-hero-img" />
          <div className="dash-hero-overlay" />
        </div>
        <div className="dash-hero-content">
          <div className="dash-hero-badge">
            <span className="dash-pulse" />
            Sistem Aktif — Tüm Modüller Çalışıyor
          </div>
          <h1>{greeting}, <span className="dash-hero-name">{user?.full_name || 'Kullanıcı'}</span></h1>
          <p>TEMSA Digital Twin platformuna hoş geldiniz. Araç verilerinizi yönetin ve analiz edin.</p>
        </div>

        {/* Floating 3D cards on hero */}
        <div className="dash-hero-cards">
          <div className="dash-float-card dash-float-1">
            <div className="dash-float-icon" style={{ '--fc': '#E30613' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div className="dash-float-val"><AnimVal value={stats?.total_variants || 0} /></div>
            <div className="dash-float-lbl">Aktif Varyant</div>
          </div>
          <div className="dash-float-card dash-float-2">
            <div className="dash-float-icon" style={{ '--fc': '#3b82f6' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
            </div>
            <div className="dash-float-val"><AnimVal value={stats?.total_vehicles || 0} /></div>
            <div className="dash-float-lbl">Araç Modeli</div>
          </div>
          <div className="dash-float-card dash-float-3">
            <div className="dash-float-icon" style={{ '--fc': '#10b981' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div className="dash-float-val">VECTO</div>
            <div className="dash-float-lbl">Sertifikalı</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Strip */}
      <div className="dash-stats-strip">
        {[
          { label: 'Toplam Araç', value: stats?.total_vehicles || 0, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: '#E30613' },
          { label: 'Varyant Sayısı', value: stats?.total_variants || 0, icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', color: '#3b82f6' },
          { label: 'Motor Tipleri', value: stats?.engine_types || 3, icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', color: '#f59e0b' },
          { label: 'Sistem Durumu', value: 'Aktif', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: '#10b981', isText: true },
        ].map((s, i) => (
          <div key={i} className="dash-stat" style={{ '--stat-c': s.color, animationDelay: `${i * 0.1}s` }}>
            <div className="dash-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-val">
                {s.isText ? s.value : <AnimVal value={s.value} />}
              </div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform Modules Grid */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2>Platform Modülleri</h2>
          <p>Dijital ikiz ekosisteminin tüm araçlarına hızlı erişim</p>
        </div>

        <div className="dash-modules">
          {[
            { key: 'variants', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', title: 'Varyant Yönetimi', desc: 'Tüm araç varyantlarını görüntüleyin, karşılaştırın ve analiz edin', color: '#E30613', stats: `${stats?.total_variants || 0} varyant` },
            { key: 'sustainability', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Filo & Karşılaştırma', desc: 'Filo oluşturma, karşılaştırma ve sürdürülebilirlik analizi', color: '#3b82f6', stats: 'Otobüs görselleri' },
            { key: 'range-calculation', icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Menzil Hesaplama', desc: 'Elektrikli otobüs menzil tahmini — batarya, güzergah, iklim', color: '#10b981', stats: 'EV menzil' },
            { key: 'bom', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', title: 'BOM & Entegrasyon', desc: 'Malzeme listeleri yönetimi ve PLM entegrasyon araçları', color: '#ec4899', stats: 'PLM bağlantılı' },
          ].map((mod, i) => (
            <div
              key={mod.key}
              className={`dash-mod ${mod.adminOnly ? 'dash-mod-admin' : ''}`}
              style={{ '--mod-c': mod.color, animationDelay: `${0.1 + i * 0.08}s` }}
              onClick={() => onNavigate(mod.key)}
            >
              <div className="dash-mod-glow" />
              <div className="dash-mod-header">
                <div className="dash-mod-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={mod.icon} /></svg>
                </div>
                <span className="dash-mod-badge">{mod.stats}</span>
              </div>
              <h3>{mod.title}</h3>
              <p>{mod.desc}</p>
              <div className="dash-mod-action">
                Modüle Git
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" /></svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technology section */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2>Platform Teknolojileri</h2>
          <p>Endüstri standardı araçlar ve sertifikasyonlar</p>
        </div>

        <div className="dash-tech-grid">
          {[
            { name: 'VECTO', desc: 'AB resmi CO₂ simülasyon aracı', badge: 'Sertifikalı' },
            { name: 'BOM Entegrasyon', desc: 'PLM malzeme listesi entegrasyonu', badge: 'Bağlantılı' },
            { name: 'EU Regulation', desc: '(EU) 2019/1242 uyumlu raporlama', badge: 'Uyumlu' },
            { name: 'XML to PDF', desc: 'VECTO çıktılarını PDF rapor olarak dışa aktarma', badge: 'Otomatik' },
          ].map((t, i) => (
            <div key={i} className="dash-tech" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
              <div className="dash-tech-badge">{t.badge}</div>
              <h4>{t.name}</h4>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-quick">
        <button className="dash-quick-btn" onClick={() => onNavigate('variants')} style={{ '--qb-c': '#E30613' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Varyant Ara
        </button>
        <button className="dash-quick-btn" onClick={() => onNavigate('sustainability')} style={{ '--qb-c': '#3b82f6' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Filo Karşılaştır
        </button>
        <button className="dash-quick-btn" onClick={() => onNavigate('range-calculation')} style={{ '--qb-c': '#10b981' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Menzil Hesapla
        </button>
      </div>
    </div>
  );
}
