import { useState, useEffect, useRef } from 'react';

/* ───────── Utility: Parallax hook ───────── */
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return y;
}

/* ───────── Reveal-on-scroll observer ───────── */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );
    const t = setTimeout(() => document.querySelectorAll('.fade-up').forEach(el => obs.observe(el)), 120);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, []);
}

/* ───────── Counter animation ───────── */
function AnimNum({ value, suffix = '' }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        let start = 0;
        const end = typeof value === 'number' ? value : parseInt(value) || 0;
        if (!end) { setN(value); return; }
        const step = Math.ceil(end / 40);
        const iv = setInterval(() => {
          start += step;
          if (start >= end) { setN(end); clearInterval(iv); }
          else setN(start);
        }, 30);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);
  return <span ref={ref}>{n}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════
   LANDING PAGE — Laboratory / Clinical Aesthetic
   ═══════════════════════════════════════════════════════ */
export default function LandingPage({ onNavigate, stats }) {
  const scrollY = useScrollY();
  useReveal();

  const busRef = useRef(null);
  const [busProgress, setBusProgress] = useState(0);

  useEffect(() => {
    const tick = () => {
      if (busRef.current) {
        const r = busRef.current.getBoundingClientRect();
        const h = busRef.current.offsetHeight - window.innerHeight;
        setBusProgress(Math.min(1, Math.max(0, -r.top / h)));
      }
    };
    window.addEventListener('scroll', tick, { passive: true });
    return () => window.removeEventListener('scroll', tick);
  }, []);

  const headerSolid = scrollY > 80;
  const heroFade = Math.max(0, 1 - scrollY / 600);

  // Bus zoom
  const scale = 1 + busProgress * 22;
  const frameOp = busProgress < 0.5 ? 1 : Math.max(0, 1 - (busProgress - 0.5) / 0.12);
  const dataOp = busProgress > 0.42 ? Math.min(1, (busProgress - 0.42) / 0.28) : 0;
  const labelOp = busProgress > 0.06 && busProgress < 0.5 ? Math.min(1, (busProgress - 0.06) / 0.06) : busProgress >= 0.5 ? Math.max(0, 1 - (busProgress - 0.5) / 0.06) : 0;

  return (
    <div className="lp">
      {/* ══════ HEADER ══════ */}
      <header className={`lp-hdr${headerSolid ? ' solid' : ''}`}>
        <div className="lp-hdr-in">
          <div className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="lp-brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <span className="lp-brand-name">TEMSA</span>
              <span className="lp-brand-sub">Digital Twin</span>
            </div>
          </div>
          <nav className="lp-nav-links">
            {[['fleet','Araçlar'], ['dive','İçeri Gir'], ['metrics','Analiz'], ['platform','Platform']].map(([id, label]) => (
              <a key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>{label}</a>
            ))}
          </nav>
          <button className="lp-cta-sm" onClick={() => onNavigate('dashboard')}>
            Platforma Giriş
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" /></svg>
          </button>
        </div>
      </header>

      {/* ══════ HERO — VIDEO ══════ */}
      <section className="lp-hero">
        <div className="lp-hero-media">
          <video
            autoPlay muted loop playsInline
            poster="/slider-1.jpg"
            className="lp-hero-video"
            style={{ transform: `scale(${1 + scrollY * 0.0003}) translateY(${scrollY * 0.12}px)` }}
          >
            <source src="/temsa-video-slider.webm" type="video/webm" />
          </video>
          <div className="lp-hero-overlay" />
        </div>

        <div className="lp-hero-body" style={{ opacity: heroFade, transform: `translateY(${scrollY * 0.18}px)` }}>
          <div className="lp-hero-tag">
            <span className="lp-pulse" />
            VECTO Sertifikalı Dijital İkiz Platformu
          </div>

          <h1 className="lp-hero-h1">
            Her Aracın İçinde
            <br />
            <span className="lp-h1-em">Bir Veri Evreni Var</span>
          </h1>

          <p className="lp-hero-p">
            Resmi VECTO sonuçlarıyla CO₂ emisyonu, yakıt tüketimi ve enerji analizi —
            laboratuvar hassasiyetinde, gerçek zamanlı filo yönetimi.
          </p>

          <div className="lp-hero-btns">
            <button className="btn-fill" onClick={() => onNavigate('dashboard')}>
              Platforma Giriş
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" /></svg>
            </button>
            <button className="btn-line" onClick={() => document.getElementById('dive')?.scrollIntoView({ behavior: 'smooth' })}>
              Keşfet
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" /></svg>
            </button>
          </div>

          {stats && (
            <div className="lp-hero-nums">
              <div><strong><AnimNum value={stats.total_vehicles} /></strong><span>Araç Modeli</span></div>
              <div className="lp-sep" />
              <div><strong><AnimNum value={stats.total_variants} /></strong><span>Varyant</span></div>
              <div className="lp-sep" />
              <div><strong>VECTO</strong><span>Sertifikalı</span></div>
            </div>
          )}
        </div>

        <div className="lp-scroll-cue" style={{ opacity: heroFade > 0.6 ? 1 : 0 }}>
          <div className="lp-scroll-track"><div className="lp-scroll-thumb" /></div>
        </div>
      </section>

      {/* ══════ FLEET STRIP ══════ */}
      <section id="fleet" className="lp-strip">
        <div className="lp-w">
          <div className="fade-up lp-sh">
            <span className="lp-label">Araç Platformları</span>
            <h2>Dünya Standartlarında Mühendislik</h2>
            <p>Her segmentte TEMSA dijital ikizleri — uzun yoldan şehir içine</p>
          </div>

          <div className="lp-fleet">
            {[
              { name: 'HD Serisi', cat: 'Uzun Yol', desc: 'Avrupa sertifikalı yüksek verimli uzun yol platformu', accent: 'var(--c-red)' },
              { name: 'LD Serisi', cat: 'Şehirlerarası', desc: 'Esnek konfigürasyon, optimize edilmiş emisyon değerleri', accent: 'var(--c-blue)' },
              { name: 'Avenue', cat: 'Şehir İçi', desc: 'Elektrikli ve dizel — düşük emisyonlu kentsel çözümler', accent: 'var(--c-green)' },
              { name: 'Maraton', cat: 'Turizm', desc: 'Konfor odaklı tasarım, verimlilik mühendisliği', accent: 'var(--c-amber)' },
            ].map((v, i) => (
              <div key={i} className="fade-up lp-fleet-card" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="lp-fc-img">
                  <img src="/slider-1.jpg" alt={v.name} loading="lazy" />
                  <div className="lp-fc-img-over" style={{ background: `linear-gradient(135deg, ${v.accent}08 0%, transparent 60%)` }} />
                </div>
                <div className="lp-fc-body">
                  <span className="lp-fc-cat" style={{ color: v.accent }}>{v.cat}</span>
                  <h3>{v.name}</h3>
                  <p>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ BUS DIVE — Scroll Zoom ══════ */}
      <section id="dive">
        <div ref={busRef} className="lp-dive-wrap">
          <div className="lp-dive-sticky">
            <div className="lp-dive-bg" />

            {/* Instruction */}
            <div className="lp-dive-hint" style={{ opacity: busProgress < 0.02 ? 1 : Math.max(0, 1 - busProgress / 0.06) }}>
              <h2>Aracın İçine Dalın</h2>
              <p>Kaydırarak dijital ikizin veri katmanlarını keşfedin</p>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 lp-bounce" style={{ color: 'var(--c-red)', marginTop: 16 }}>
                <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" />
              </svg>
            </div>

            {/* Bus front wireframe */}
            <div className="lp-dive-bus" style={{ transform: `scale(${scale})`, opacity: frameOp }}>
              <svg viewBox="0 0 320 420" fill="none" className="lp-dive-svg">
                <path d="M45 390 L45 65 Q45 22 85 22 L235 22 Q275 22 275 65 L275 390 Z" stroke="currentColor" strokeWidth="1.2" />
                <rect x="60" y="38" width="200" height="150" rx="18" stroke="currentColor" strokeWidth="1" fill="rgba(227,6,19,0.02)" />
                <line x1="160" y1="42" x2="160" y2="184" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
                <rect x="80" y="200" width="160" height="22" rx="4" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
                <rect x="52" y="240" width="55" height="22" rx="10" stroke="currentColor" strokeWidth="0.8" />
                <rect x="213" y="240" width="55" height="22" rx="10" stroke="currentColor" strokeWidth="0.8" />
                <rect x="85" y="280" width="150" height="45" rx="6" stroke="currentColor" strokeWidth="0.6" />
                {[288, 296, 304, 312].map((y, i) => <line key={i} x1="90" y1={y} x2="230" y2={y} stroke="currentColor" strokeWidth="0.3" opacity="0.2" />)}
                <rect x="55" y="355" width="210" height="18" rx="6" stroke="currentColor" strokeWidth="0.6" />
                <ellipse cx="30" cy="110" rx="14" ry="9" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
                <ellipse cx="290" cy="110" rx="14" ry="9" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
              </svg>
            </div>

            {/* Data labels floating mid-zoom */}
            <div className="lp-dive-labels" style={{ opacity: labelOp }}>
              {[
                { t: '14%', l: '12%', c: 'var(--c-red)', text: 'CO₂ Emisyonu' },
                { t: '22%', r: '10%', c: 'var(--c-blue)', text: 'Yakıt Tüketimi' },
                { t: '52%', l: '8%', c: 'var(--c-green)', text: 'Enerji Verimliliği' },
                { b: '24%', r: '12%', c: 'var(--c-amber)', text: 'Motor Performansı' },
                { t: '38%', l: '50%', c: 'var(--c-red)', text: 'VECTO Sertifikası', cx: true },
              ].map((lb, i) => (
                <div key={i} className="lp-dive-tag" style={{
                  top: lb.t, bottom: lb.b, left: lb.cx ? '50%' : lb.l, right: lb.r,
                  transform: lb.cx ? 'translateX(-50%)' : undefined,
                }}>
                  <span className="lp-dive-dot" style={{ background: lb.c }} />
                  {lb.text}
                </div>
              ))}
            </div>

            {/* Data world after full zoom */}
            <div className="lp-dive-data" style={{ opacity: dataOp }}>
              <div className="lp-dive-data-in">
                <span className="lp-label">Veri Katmanı</span>
                <h2>Aracın Dijital DNA'sı</h2>
                <p>Resmi VECTO simülasyonlarından sertifikalı emisyon verileri</p>
                <div className="lp-dive-cards">
                  {[
                    { val: '717.5', unit: 'g CO₂/km', label: 'Ortalama Emisyon', c: 'var(--c-red)' },
                    { val: '27.4', unit: 'L / 100km', label: 'Yakıt Tüketimi', c: 'var(--c-blue)' },
                    { val: 'A+', unit: 'Verimlilik', label: 'Enerji Sınıfı', c: 'var(--c-green)' },
                  ].map((d, i) => (
                    <div key={i} className="lp-dc" style={{ '--dc-c': d.c }}>
                      <div className="lp-dc-val">{d.val}</div>
                      <div className="lp-dc-unit">{d.unit}</div>
                      <div className="lp-dc-lbl">{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ METRICS ══════ */}
      <section id="metrics" className="lp-strip lp-strip-alt">
        <div className="lp-w">
          <div className="fade-up lp-sh">
            <span className="lp-label">Laboratuvar Verileri</span>
            <h2>Emisyon & Enerji Raporu</h2>
            <p>VECTO sertifikalı resmi sonuçlarla hassas analiz</p>
          </div>
          <div className="lp-kpis">
            {[
              { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', val: '717.5', unit: 'g/km', label: 'CO₂ Emisyonu', sub: 'VECTO sertifikalı ortalama', c: 'var(--c-red)' },
              { icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', val: '27.42', unit: 'L/100km', label: 'Yakıt Tüketimi', sub: 'Referans yükleme koşulları', c: 'var(--c-blue)' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', val: 'A+', unit: 'Sınıf', label: 'Enerji Verimliliği', sub: 'Avrupa enerji standardı', c: 'var(--c-green)' },
              { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', val: stats?.total_variants || '—', unit: '', label: 'Aktif Varyant', sub: 'Konfigürasyon sayısı', c: 'var(--c-amber)' },
            ].map((k, i) => (
              <div key={i} className="fade-up lp-kpi" style={{ transitionDelay: `${i * 80}ms`, '--kpi-c': k.c }}>
                <div className="lp-kpi-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={k.icon} /></svg>
                </div>
                <div className="lp-kpi-val">{k.val}<span>{k.unit}</span></div>
                <div className="lp-kpi-lbl">{k.label}</div>
                <div className="lp-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ PLATFORM FEATURES ══════ */}
      <section id="platform" className="lp-strip">
        <div className="lp-w">
          <div className="fade-up lp-sh">
            <span className="lp-label">Platform Modülleri</span>
            <h2>Dijital İkiz Ekosistemi</h2>
            <p>Tüm araç ve filo verilerini tek noktadan yönetin</p>
          </div>
          <div className="lp-mods">
            {[
              { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Filo & Karşılaştırma', desc: 'Filo oluşturma, karşılaştırma ve sürdürülebilirlik analizi', c: 'var(--c-green)', to: 'sustainability' },
              { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Menzil Hesaplama', desc: 'Elektrikli otobüs menzil tahmini — batarya, güzergah, iklim', c: 'var(--c-blue)', to: 'range-calculation' },
              { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', title: 'Varyantlar', desc: 'Tüm araç varyantlarını görüntüleyin ve VECTO sonuçlarını analiz edin', c: 'var(--c-amber)', to: 'variants' },
              { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', title: 'BOM & Entegrasyon', desc: 'Malzeme listeleri yönetimi ve PLM entegrasyon araçları', c: 'var(--c-purple)', to: 'bom' },
              { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', title: 'Dashboard', desc: 'Genel bakış, istatistikler ve hızlı erişim paneli', c: 'var(--c-red)', to: 'dashboard' },
            ].map((m, i) => (
              <div key={i} className="fade-up lp-mod" style={{ transitionDelay: `${i * 60}ms` }} onClick={() => onNavigate(m.to)}>
                <div className="lp-mod-ic" style={{ '--mod-c': m.c }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon} /></svg>
                </div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
                <span className="lp-mod-go" style={{ color: m.c }}>Keşfet →</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="lp-final">
        <div className="lp-final-bg" />
        <div className="lp-w fade-up" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h2>Dijital İkiz Platformuna Hazır mısınız?</h2>
          <p>Filo emisyonlarını takip edin, VECTO sertifikalı sonuçları analiz edin.</p>
          <button className="btn-fill btn-lg" onClick={() => onNavigate('dashboard')}>
            Platforma Giriş
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" /></svg>
          </button>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="lp-ft">
        <div className="lp-w">
          <div className="lp-ft-row">
            <div>
              <div className="lp-brand" style={{ cursor: 'default', marginBottom: 10 }}>
                <div className="lp-brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                <div><span className="lp-brand-name">TEMSA</span><span className="lp-brand-sub">Digital Twin</span></div>
              </div>
              <p className="lp-ft-desc">TEMSA Ulaşım Araçları A.Ş. — Dijital İkiz Platformu</p>
            </div>
            <nav className="lp-ft-links">
              {[['sustainability','Filo & Karşılaştırma'],['variants','Varyantlar'],['bom','BOM & Entegrasyon'],['dashboard','Dashboard']].map(([k,l]) => (
                <a key={k} onClick={() => onNavigate(k)}>{l}</a>
              ))}
            </nav>
          </div>
          <div className="lp-ft-copy">© 2026 TEMSA Ulaşım Araçları A.Ş. Tüm hakları saklıdır.</div>
        </div>
      </footer>
    </div>
  );
}
