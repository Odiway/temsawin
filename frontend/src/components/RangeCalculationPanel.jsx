import { useState, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════
   Electric Bus Range Calculator
   Battery capacity, route profile, passenger load,
   climate conditions → estimated range in km
   ═══════════════════════════════════════════════════════ */

const VEHICLE_PRESETS = [
  { name: 'Avenue EV (12m)', battery: 350, consumption: 1.05, maxPass: 80, weight: 13500, img: 'https://www.temsa.com/en/images/common/temsa-avenue-electron.png' },
  { name: 'MD9 Electric (9m)', battery: 230, consumption: 0.78, maxPass: 55, weight: 10200, img: 'https://www.temsa.com/en/images/common/temsa-md-9-le.png' },
  { name: 'Avenue EV (18m)', battery: 500, consumption: 1.35, maxPass: 120, weight: 18500, img: 'https://www.temsa.com/en/images/common/temsa-avenue-electron.png' },
  { name: 'Özel (Manuel Giriş)', battery: 300, consumption: 1.0, maxPass: 70, weight: 12000, img: null },
];

const ROUTE_PROFILES = [
  { name: 'Şehir İçi (Düz)', factor: 1.0, label: 'Düz hat, sık durak' },
  { name: 'Şehir İçi (Eğimli)', factor: 1.18, label: 'Tepelik güzergah' },
  { name: 'Banliyö', factor: 0.88, label: 'Orta mesafe, az durak' },
  { name: 'Şehirlerarası', factor: 0.75, label: 'Otoyol ağırlıklı' },
];

const CLIMATE_FACTORS = [
  { name: 'Ilıman (15–25°C)', factor: 1.0 },
  { name: 'Sıcak (>30°C)', factor: 1.12 },
  { name: 'Soğuk (<5°C)', factor: 1.25 },
  { name: 'Aşırı Soğuk (<-10°C)', factor: 1.40 },
];

function Slider({ label, value, onChange, min, max, step = 1, unit = '' }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="rc-slider">
      <div className="rc-slider-head">
        <span className="rc-slider-label">{label}</span>
        <span className="rc-slider-val">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, #1e293b ${pct}%, #1e293b 100%)` }}
      />
      <div className="rc-slider-range">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function RangeCalculationPanel() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [battery, setBattery] = useState(350);
  const [consumption, setConsumption] = useState(1.05);
  const [passengers, setPassengers] = useState(40);
  const [routeIdx, setRouteIdx] = useState(0);
  const [climateIdx, setClimateIdx] = useState(0);
  const [hvacLoad, setHvacLoad] = useState(15);
  const [auxLoad, setAuxLoad] = useState(5);
  const [socMin, setSocMin] = useState(10);

  const preset = VEHICLE_PRESETS[presetIdx];

  const handlePreset = (i) => {
    setPresetIdx(i);
    setBattery(VEHICLE_PRESETS[i].battery);
    setConsumption(VEHICLE_PRESETS[i].consumption);
    setPassengers(Math.round(VEHICLE_PRESETS[i].maxPass * 0.5));
  };

  const calc = useMemo(() => {
    const usable = battery * (1 - socMin / 100);
    const loadFactor = 1 + (passengers / preset.maxPass) * 0.12;
    const routeFactor = ROUTE_PROFILES[routeIdx].factor;
    const climateFactor = CLIMATE_FACTORS[climateIdx].factor;
    const totalConsumption = consumption * loadFactor * routeFactor * climateFactor;
    const hvacEnergy = hvacLoad * 0.001 * 100; // rough kWh per 100km
    const auxEnergy = auxLoad * 0.001 * 100;
    const effectiveConsumption = totalConsumption + (hvacEnergy + auxEnergy) / 100;
    const range = usable / effectiveConsumption;
    const idealRange = battery / consumption;
    const efficiency = (range / idealRange) * 100;
    return {
      range: Math.round(range),
      idealRange: Math.round(idealRange),
      usable: Math.round(usable),
      effectiveConsumption: effectiveConsumption.toFixed(2),
      efficiency: Math.round(efficiency),
      runTime: (range / 18).toFixed(1), // avg 18 km/h city
    };
  }, [battery, consumption, passengers, routeIdx, climateIdx, hvacLoad, auxLoad, socMin, preset]);

  const effColor = calc.efficiency > 75 ? '#10b981' : calc.efficiency > 55 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rc-page">
      {/* Header */}
      <div className="rc-header">
        <div>
          <h1 className="rc-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="rc-title-icon">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Elektrikli Otobüs Menzil Hesaplayıcı
          </h1>
          <p className="rc-subtitle">Batarya kapasitesi, güzergah profili, yolcu yükü ve iklim koşullarına göre menzil tahmini</p>
        </div>
      </div>

      <div className="rc-grid">
        {/* ─── Left: Inputs ─── */}
        <div className="rc-inputs">

          {/* Vehicle Selection */}
          <div className="rc-card">
            <h3 className="rc-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="rc-card-icon"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
              Araç Seçimi
            </h3>
            <div className="rc-presets">
              {VEHICLE_PRESETS.map((v, i) => (
                <button key={i} className={`rc-preset ${presetIdx === i ? 'active' : ''}`} onClick={() => handlePreset(i)}>
                  {v.img && <img src={v.img} alt={v.name} className="rc-preset-img" />}
                  <span>{v.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Battery & Consumption */}
          <div className="rc-card">
            <h3 className="rc-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="rc-card-icon"><rect x="2" y="7" width="18" height="10" rx="2" /><path d="M22 11v2" /><rect x="4" y="9" width={`${(battery/600)*14}`} height="6" rx="1" fill="#3b82f6" opacity="0.3" /></svg>
              Batarya & Tüketim
            </h3>
            <Slider label="Batarya Kapasitesi" value={battery} onChange={setBattery} min={100} max={600} step={10} unit=" kWh" />
            <Slider label="Baz Tüketim" value={consumption} onChange={setConsumption} min={0.5} max={2.0} step={0.05} unit=" kWh/km" />
            <Slider label="Min. SoC (Şarj Sınırı)" value={socMin} onChange={setSocMin} min={5} max={25} step={1} unit="%" />
          </div>

          {/* Route Profile */}
          <div className="rc-card">
            <h3 className="rc-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="rc-card-icon"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              Güzergah Profili
            </h3>
            <div className="rc-options">
              {ROUTE_PROFILES.map((r, i) => (
                <button key={i} className={`rc-option ${routeIdx === i ? 'active' : ''}`} onClick={() => setRouteIdx(i)}>
                  <span className="rc-option-name">{r.name}</span>
                  <span className="rc-option-desc">{r.label}</span>
                  <span className="rc-option-factor">×{r.factor}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Load & Climate */}
          <div className="rc-card">
            <h3 className="rc-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="rc-card-icon"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Yolcu & Çevre
            </h3>
            <Slider label="Yolcu Sayısı" value={passengers} onChange={setPassengers} min={0} max={preset.maxPass} unit=" kişi" />
            <div className="rc-options rc-options-sm">
              {CLIMATE_FACTORS.map((c, i) => (
                <button key={i} className={`rc-option rc-option-sm ${climateIdx === i ? 'active' : ''}`} onClick={() => setClimateIdx(i)}>
                  <span className="rc-option-name">{c.name}</span>
                  <span className="rc-option-factor">×{c.factor}</span>
                </button>
              ))}
            </div>
            <Slider label="HVAC (Klima) Yükü" value={hvacLoad} onChange={setHvacLoad} min={0} max={40} unit=" kW" />
            <Slider label="Yardımcı Yük" value={auxLoad} onChange={setAuxLoad} min={0} max={15} unit=" kW" />
          </div>
        </div>

        {/* ─── Right: Results ─── */}
        <div className="rc-results">

          {/* Big range display */}
          <div className="rc-result-hero">
            <div className="rc-result-ring" style={{ '--eff': calc.efficiency, '--eff-color': effColor }}>
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#dbe8ff" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={effColor} strokeWidth="8"
                  strokeDasharray={`${calc.efficiency * 3.267} 326.7`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              <div className="rc-result-ring-text">
                <span className="rc-range-num">{calc.range}</span>
                <span className="rc-range-unit">km</span>
              </div>
            </div>
            <div className="rc-result-hero-info">
              <h2>Tahmini Menzil</h2>
              <p>{preset.name} • {ROUTE_PROFILES[routeIdx].name} • {CLIMATE_FACTORS[climateIdx].name}</p>
            </div>
          </div>

          {/* Detail cards */}
          <div className="rc-detail-grid">
            <div className="rc-detail">
              <span className="rc-detail-label">Kullanılabilir Enerji</span>
              <span className="rc-detail-val">{calc.usable} <small>kWh</small></span>
            </div>
            <div className="rc-detail">
              <span className="rc-detail-label">Efektif Tüketim</span>
              <span className="rc-detail-val">{calc.effectiveConsumption} <small>kWh/km</small></span>
            </div>
            <div className="rc-detail">
              <span className="rc-detail-label">İdeal Menzil</span>
              <span className="rc-detail-val">{calc.idealRange} <small>km</small></span>
            </div>
            <div className="rc-detail">
              <span className="rc-detail-label">Verimlilik</span>
              <span className="rc-detail-val" style={{ color: effColor }}>{calc.efficiency}<small>%</small></span>
            </div>
            <div className="rc-detail">
              <span className="rc-detail-label">Tahmini Çalışma Süresi</span>
              <span className="rc-detail-val">{calc.runTime} <small>saat</small></span>
            </div>
            <div className="rc-detail">
              <span className="rc-detail-label">Yolcu Yükleme</span>
              <span className="rc-detail-val">{passengers}/{preset.maxPass} <small>kişi</small></span>
            </div>
          </div>

          {/* Range bar comparison */}
          <div className="rc-card rc-compare">
            <h3 className="rc-card-title">Menzil Karşılaştırması</h3>
            <div className="rc-bar-group">
              <div className="rc-bar-row">
                <span className="rc-bar-label">İdeal (laboratuvar)</span>
                <div className="rc-bar-track">
                  <div className="rc-bar-fill rc-bar-ideal" style={{ width: '100%' }}>
                    {calc.idealRange} km
                  </div>
                </div>
              </div>
              <div className="rc-bar-row">
                <span className="rc-bar-label">Gerçek Dünya Tahmini</span>
                <div className="rc-bar-track">
                  <div className="rc-bar-fill rc-bar-real" style={{ width: `${calc.efficiency}%` }}>
                    {calc.range} km
                  </div>
                </div>
              </div>
            </div>
            <p className="rc-bar-note">
              Gerçek menzil, güzergah eğimi, trafik yoğunluğu, sürücü davranışı ve
              batarya yaşlanmasına bağlı olarak değişkenlik gösterebilir.
            </p>
          </div>

          {/* Vehicle image */}
          {preset.img && (
            <div className="rc-vehicle-img">
              <img src={preset.img} alt={preset.name} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .rc-page { max-width: 1400px; margin: 0 auto; }
        .rc-header { margin-bottom: 24px; }
        .rc-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 800; color: #10203f; margin: 0; }
        .rc-title-icon { width: 24px; height: 24px; color: #3b82f6; }
        .rc-subtitle { font-size: 13px; color: #5f78a7; margin-top: 6px; }
        .rc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media(max-width: 1024px) { .rc-grid { grid-template-columns: 1fr; } }
        .rc-inputs { display: flex; flex-direction: column; gap: 16px; }
        .rc-results { display: flex; flex-direction: column; gap: 16px; }
        .rc-card { background: #ffffff; border: 1px solid #dbe8ff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(37,99,235,0.05); }
        .rc-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #10203f; margin: 0 0 16px 0; }
        .rc-card-icon { width: 18px; height: 18px; color: #3b82f6; }

        .rc-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .rc-preset { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; background: #f8fbff; border: 1px solid #dbe8ff; border-radius: 10px; color: #5f78a7; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-align: center; }
        .rc-preset:hover { border-color: rgba(59,130,246,0.4); color: #10203f; }
        .rc-preset.active { border-color: #3b82f6; background: rgba(37,99,235,0.06); color: #10203f; box-shadow: 0 0 0 1px rgba(59,130,246,0.2); }
        .rc-preset-img { width: 80px; height: 40px; object-fit: contain; filter: brightness(0.95); }
        .rc-preset.active .rc-preset-img { filter: brightness(1.05); }

        .rc-slider { margin-bottom: 14px; }
        .rc-slider:last-child { margin-bottom: 0; }
        .rc-slider-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .rc-slider-label { font-size: 11.5px; color: #5f78a7; font-weight: 500; }
        .rc-slider-val { font-size: 12px; color: #10203f; font-weight: 700; font-variant-numeric: tabular-nums; }
        .rc-slider input[type=range] { width: 100%; height: 6px; border-radius: 3px; -webkit-appearance: none; appearance: none; outline: none; cursor: pointer; }
        .rc-slider input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; border: 2px solid #fff; cursor: grab; box-shadow: 0 0 6px rgba(59,130,246,0.4); }
        .rc-slider-range { display: flex; justify-content: space-between; margin-top: 2px; font-size: 9px; color: #8ba0c0; }

        .rc-options { display: flex; flex-direction: column; gap: 6px; }
        .rc-options-sm { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px; }
        .rc-option { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #f8fbff; border: 1px solid #dbe8ff; border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left; }
        .rc-option:hover { border-color: rgba(59,130,246,0.4); background: rgba(37,99,235,0.03); }
        .rc-option.active { border-color: #3b82f6; background: rgba(37,99,235,0.06); }
        .rc-option-sm { flex-direction: column; align-items: flex-start; padding: 8px 10px; gap: 2px; }
        .rc-option-name { font-size: 12px; color: #10203f; font-weight: 600; flex: 1; }
        .rc-option-desc { font-size: 10px; color: #5f78a7; }
        .rc-option-factor { font-size: 10px; color: #3b82f6; font-weight: 700; font-variant-numeric: tabular-nums; }

        .rc-result-hero { display: flex; align-items: center; gap: 24px; background: linear-gradient(135deg, #eef5ff, #f0f9ff); border: 1px solid #dbe8ff; border-radius: 16px; padding: 28px; }
        .rc-result-ring { position: relative; width: 140px; height: 140px; flex-shrink: 0; }
        .rc-result-ring svg { width: 100%; height: 100%; }
        .rc-result-ring-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .rc-range-num { font-size: 36px; font-weight: 900; color: #10203f; line-height: 1; font-variant-numeric: tabular-nums; }
        .rc-range-unit { font-size: 14px; color: #5f78a7; font-weight: 600; }
        .rc-result-hero-info h2 { font-size: 18px; font-weight: 800; color: #10203f; margin: 0 0 6px 0; }
        .rc-result-hero-info p { font-size: 12px; color: #5f78a7; margin: 0; }

        .rc-detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .rc-detail { background: #ffffff; border: 1px solid #dbe8ff; border-radius: 10px; padding: 14px; }
        .rc-detail-label { display: block; font-size: 10px; color: #5f78a7; font-weight: 500; margin-bottom: 4px; }
        .rc-detail-val { font-size: 18px; font-weight: 800; color: #10203f; font-variant-numeric: tabular-nums; }
        .rc-detail-val small { font-size: 11px; color: #5f78a7; font-weight: 500; margin-left: 2px; }

        .rc-compare { margin-top: 4px; }
        .rc-bar-group { display: flex; flex-direction: column; gap: 10px; }
        .rc-bar-row { display: flex; align-items: center; gap: 12px; }
        .rc-bar-label { font-size: 11px; color: #5f78a7; width: 140px; flex-shrink: 0; text-align: right; }
        .rc-bar-track { flex: 1; height: 28px; background: #eef5ff; border-radius: 6px; overflow: hidden; }
        .rc-bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; font-size: 11px; font-weight: 700; color: #fff; transition: width 0.5s ease; min-width: 60px; }
        .rc-bar-ideal { background: linear-gradient(90deg, #2563eb, #60a5fa); }
        .rc-bar-real { background: linear-gradient(90deg, #059669, #34d399); }
        .rc-bar-note { margin-top: 12px; font-size: 10.5px; color: #8ba0c0; line-height: 1.5; }

        .rc-vehicle-img { display: flex; justify-content: center; padding: 16px; background: #f8fbff; border: 1px solid #dbe8ff; border-radius: 12px; }
        .rc-vehicle-img img { max-width: 320px; height: auto; filter: drop-shadow(0 4px 20px rgba(37,99,235,0.15)); }
      `}</style>
    </div>
  );
}
