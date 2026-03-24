import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════
   Constants & Helpers
   ═══════════════════════════════════════════════════════════ */

const VEHICLE_IMAGES = {
  'AVENUE': 'https://www.temsa.com/en/images/common/temsa-avenue-electron.png',
  'HD': 'https://www.temsa.com/en/images/common/temsa-hd-12.png',
  'MD9LE': 'https://www.temsa.com/en/images/common/temsa-md-9-le.png',
  'MD9 ELECTRIC': 'https://www.temsa.com/en/images/common/temsa-md-9-le.png',
  'MD': 'https://www.temsa.com/en/images/common/temsa-md-9.png',
  'LD': 'https://www.temsa.com/en/images/common/temsa-id-sb-plus.png',
  'MARATON': 'https://www.temsa.com/en/images/common/maraton-12.png',
  'PRESTIJ': 'https://www.temsa.com/en/images/common/prestij.png',
};

function getVehicleImage(modelName) {
  if (!modelName) return null;
  const upper = modelName.toUpperCase();
  for (const [key, url] of Object.entries(VEHICLE_IMAGES)) {
    if (upper.includes(key.toUpperCase())) return url;
  }
  return null;
}

const MODEL_COLORS = [
  '#E30613', '#58a6ff', '#3fb950', '#d29922', '#f85149',
  '#bc8cff', '#39d2c0', '#f0883e', '#ff7b72', '#79c0ff',
];

function fmt(v, d = 1) {
  if (v == null) return '—';
  return typeof v === 'number' ? v.toFixed(d) : v;
}

/* ═══════════════════════════════════════════════════════════
   MODE: OVERVIEW – Fleet analytics + model cards
   ═══════════════════════════════════════════════════════════ */

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="t-panel p-4">
      <div className="text-[10px] text-[#484f58] uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${accent || 'text-[#e6edf3]'}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#8b949e] mt-1">{sub}</div>}
    </div>
  );
}

function OverviewMode({ data, onSelectModel, onSelectVariant, compareList, onToggleCompare }) {
  const { analytics: a, models, variants } = data;

  const modelCO2 = models
    .filter(m => m.co2_avg)
    .sort((a, b) => a.co2_avg - b.co2_avg)
    .map((m, i) => ({ name: m.model, co2: m.co2_avg, fill: MODEL_COLORS[i % MODEL_COLORS.length] }));

  const scatter = variants
    .filter(v => v.power_kw && v.avg_co2)
    .map(v => ({ x: v.power_kw, y: v.avg_co2, name: v.variant_code, model: v.model }));

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Toplam Varyant" value={a.total_variants} sub={`${a.total_models} model`} />
        <KpiCard label="VECTO Sonuc" value={a.variants_with_output} sub={`${a.variants_without_output} eksik`} accent="text-[#3fb950]" />
        <KpiCard label="Filo Toplam" value={a.total_fleet} />
        <KpiCard label="Ort. CO₂" value={a.co2_avg ? `${a.co2_avg}` : '—'} sub="g/km" accent="text-[#58a6ff]" />
        <KpiCard label="En Dusuk CO₂" value={a.co2_min ? `${a.co2_min}` : '—'} sub={a.best_variant?.substring(0, 15)} accent="text-[#3fb950]" />
        <KpiCard label="En Yuksek CO₂" value={a.co2_max ? `${a.co2_max}` : '—'} sub={a.worst_variant?.substring(0, 15)} accent="text-[#f85149]" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="t-panel p-4">
          <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Model Bazli CO₂ (g/km)</h3>
          {modelCO2.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modelCO2} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e6edf3', fontSize: 11 }} width={75} />
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} labelStyle={{ color: '#e6edf3' }} />
                <Bar dataKey="co2" radius={[0, 4, 4, 0]}>
                  {modelCO2.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[#484f58]">VECTO sonuclari yuklenmedi</div>
          )}
        </div>

        <div className="t-panel p-4">
          <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Guc vs CO₂ Dagilimi</h3>
          {scatter.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis type="number" dataKey="x" name="Guc (kW)" tick={{ fill: '#8b949e', fontSize: 10 }} label={{ value: 'kW', position: 'insideBottom', fill: '#484f58', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="CO₂ (g/km)" tick={{ fill: '#8b949e', fontSize: 10 }} label={{ value: 'g/km', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                <Scatter data={scatter} fill="#E30613" fillOpacity={0.7}>
                  {scatter.map((_, i) => <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[#484f58]">Yeterli veri yok</div>
          )}
        </div>
      </div>

      {/* Model Cards */}
      <div>
        <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Model Ozeti</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {models.map((m, idx) => {
            const img = getVehicleImage(m.model);
            const mUpper = m.model.toUpperCase();
            const mVariants = variants.filter(v => v.model.toUpperCase() === mUpper);
            const engines = [...new Set(mVariants.map(v => v.engine_model).filter(Boolean))];
            const gearboxes = [...new Set(mVariants.map(v => v.gearbox_model).filter(Boolean))];
            const tyres = [...new Set(mVariants.map(v => v.tyre_front_dimension || v.tyre_dimension).filter(Boolean))];
            return (
              <div key={m.model} className="cursor-pointer" style={{ perspective: '1000px' }} onClick={() => onSelectModel(m.model)}>
                <div className="relative w-full transition-transform duration-500 group" style={{ transformStyle: 'preserve-3d' }}>
                  {/* FRONT */}
                  <div className="t-panel group-hover:[transform:rotateY(180deg)] transition-transform duration-500" style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}>
                    <div className="relative h-24 bg-gradient-to-br from-[#161b22] to-[#0f1419] overflow-hidden">
                      {img && <img src={img} alt={m.model} className="absolute inset-0 w-full h-full object-contain p-3 opacity-70 group-hover:opacity-90 transition duration-300" />}
                      <div className="absolute bottom-2 left-3">
                        <div className="text-base font-extrabold text-white drop-shadow">{m.model}</div>
                        <div className="text-[10px] text-[#8b949e]">{m.category}</div>
                      </div>
                      <div className="absolute top-2 right-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#21262d]/80 text-[#e6edf3]">{m.variant_count} varyant</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[9px] text-[#484f58] uppercase">CO₂ Ort</div>
                          <div className="text-sm font-bold text-[#58a6ff]">{m.co2_avg || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[#484f58] uppercase">Guc</div>
                          <div className="text-sm font-bold text-[#e6edf3]">{m.power_range || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[#484f58] uppercase">Filo</div>
                          <div className="text-sm font-bold text-[#d29922]">{m.fleet_total}</div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-[#484f58]">Veri Tamligi</span>
                          <span className="text-[#8b949e]">{m.data_completeness}%</span>
                        </div>
                        <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${m.data_completeness}%`, background: m.data_completeness === 100 ? '#3fb950' : m.data_completeness > 50 ? '#d29922' : '#f85149' }} />
                        </div>
                      </div>
                      {m.co2_spread > 0 && (
                        <div className="text-[10px] text-[#8b949e]">
                          CO₂ aralik: {m.co2_min} — {m.co2_max} g/km <span className="text-[#484f58]">(fark: {m.co2_spread})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* BACK */}
                  <div className="t-panel absolute inset-0 group-hover:[transform:rotateY(0deg)] [transform:rotateY(-180deg)] transition-transform duration-500 overflow-hidden" style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}>
                    <div className="p-3 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-extrabold text-[#E30613]">{m.model}</div>
                        <span className="text-[9px] text-[#8b949e] bg-[#21262d] px-1.5 py-0.5 rounded">{m.variant_count} varyant</span>
                      </div>
                      <div className="space-y-1.5 text-[10px] flex-1 overflow-y-auto">
                        <div className="flex justify-between"><span className="text-[#484f58]">Kategori</span><span className="text-[#e6edf3]">{m.category || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-[#484f58]">Motor</span><span className="text-[#8b949e] text-right truncate ml-2">{engines.join(', ') || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-[#484f58]">Sanziman</span><span className="text-[#8b949e] text-right truncate ml-2">{gearboxes.join(', ') || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-[#484f58]">Lastik</span><span className="text-[#8b949e]">{tyres.join(', ') || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-[#484f58]">Guc</span><span className="text-[#e6edf3] font-bold">{m.power_range || '—'} kW</span></div>
                        <div className="flex justify-between"><span className="text-[#484f58]">CO₂ Ort</span><span className="text-[#58a6ff] font-bold">{m.co2_avg ? `${m.co2_avg} g/km` : '—'}</span></div>
                        {m.co2_min && <div className="flex justify-between"><span className="text-[#484f58]">CO₂ Aralik</span><span className="text-[#8b949e]">{m.co2_min} — {m.co2_max}</span></div>}
                        <div className="flex justify-between"><span className="text-[#484f58]">VECTO Sonuc</span><span className={m.has_output_count > 0 ? 'text-[#3fb950]' : 'text-[#484f58]'}>{m.has_output_count}/{m.variant_count}</span></div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#21262d] text-center">
                        <span className="text-[9px] text-[#E30613] font-bold">Varyantlari Gor →</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Variant List */}
      <div>
        <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Tum Varyantlar</h3>
        <VariantTable variants={variants} onSelectVariant={onSelectVariant} compareList={compareList} onToggleCompare={onToggleCompare} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODE: MODEL VARIANTS (drill-down from model card)
   ═══════════════════════════════════════════════════════════ */

function ModelVariantsMode({ data, modelName, onBack, onSelectVariant }) {
  const { variants, models } = data;
  const model = models.find(m => m.model === modelName);
  const modelUpper = modelName.toUpperCase();
  const modelVars = useMemo(() => variants.filter(v => v.model.toUpperCase() === modelUpper), [variants, modelUpper]);
  const img = getVehicleImage(modelName);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back button + model header */}
      <div className="t-panel">
        <div className="relative h-32 bg-gradient-to-br from-[#161b22] to-[#0f1419] overflow-hidden rounded-t-lg">
          {img && <img src={img} alt={modelName} className="absolute inset-0 w-full h-full object-contain p-6 opacity-30" />}
          <div className="absolute inset-0 flex items-end p-4">
            <div>
              <button onClick={onBack} className="text-[10px] text-[#8b949e] hover:text-[#E30613] transition mb-2 flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                Tum Modeller
              </button>
              <h2 className="text-xl font-extrabold text-white drop-shadow">{modelName}</h2>
              <div className="text-xs text-[#8b949e]">{model?.category} · {modelVars.length} varyant</div>
            </div>
          </div>
        </div>
        {model && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4">
            <div className="text-center">
              <div className="text-[9px] text-[#484f58] uppercase">CO₂ Ort</div>
              <div className="text-sm font-bold text-[#58a6ff]">{model.co2_avg || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-[#484f58] uppercase">Guc</div>
              <div className="text-sm font-bold text-[#e6edf3]">{model.power_range || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-[#484f58] uppercase">CO₂ Min</div>
              <div className="text-sm font-bold text-[#3fb950]">{model.co2_min || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-[#484f58] uppercase">CO₂ Max</div>
              <div className="text-sm font-bold text-[#f85149]">{model.co2_max || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-[#484f58] uppercase">Veri Tamligi</div>
              <div className="text-sm font-bold text-[#d29922]">{model.data_completeness}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Variant cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {modelVars.map(v => (
          <div key={v.variant_code}
            className="t-panel p-4 cursor-pointer hover:border-[#30363d] transition-all group"
            onClick={() => onSelectVariant(v.variant_id)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#e6edf3] group-hover:text-[#E30613] transition">{v.model}</h4>
                <div className="font-mono text-[9px] text-[#484f58] mt-0.5">{v.variant_code}</div>
              </div>
              {v.has_output
                ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3fb950]/15 text-[#3fb950] font-bold">VECTO ✓</span>
                : <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#484f58]">Eksik</span>
              }
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
              <div className="flex justify-between"><span className="text-[#484f58]">Guc</span><span className="text-[#e6edf3] font-bold">{v.power_kw ? `${v.power_kw} kW` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#484f58]">Tork</span><span className="text-[#e6edf3]">{v.max_torque_nm ? `${v.max_torque_nm} Nm` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#484f58]">Motor</span><span className="text-[#8b949e] truncate ml-2">{v.engine_model || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#484f58]">Sanziman</span><span className="text-[#8b949e] truncate ml-2">{v.gearbox_model || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#484f58]">Aks Orani</span><span className="text-[#8b949e]">{v.axle_ratio || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#484f58]">Lastik</span><span className="text-[#8b949e]">{v.tyre_front_dimension || v.tyre_dimension || '—'}</span></div>
            </div>
            {v.avg_co2 && (
              <div className="mt-3 pt-2 border-t border-[#21262d]/40 flex justify-between items-center">
                <span className="text-[9px] text-[#484f58]">CO₂ Ortalama</span>
                <span className="text-sm font-bold text-[#58a6ff]">{v.avg_co2} g/km</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full table */}
      <div>
        <h3 className="text-sm font-bold text-[#e6edf3] mb-3">{modelName} Tum Varyantlar</h3>
        <VariantTable variants={modelVars} onSelectVariant={onSelectVariant} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODE: VARIANT COMPARISON
   ═══════════════════════════════════════════════════════════ */

function VariantCompareMode({ data, initialSelected = [] }) {
  const { variants } = data;
  const [selected, setSelected] = useState(initialSelected);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync when initialSelected changes (user adds from overview)
  useEffect(() => {
    if (initialSelected.length > 0) setSelected(initialSelected);
  }, [initialSelected.join(',')]);

  const filtered = useMemo(() => {
    if (!search) return variants;
    const s = search.toLowerCase();
    return variants.filter(v =>
      v.variant_code.toLowerCase().includes(s) ||
      (v.model || '').toLowerCase().includes(s) ||
      (v.engine_model || '').toLowerCase().includes(s)
    );
  }, [variants, search]);

  const toggleVariant = (code) => {
    setSelected(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]);
    setResult(null);
  };

  const runCompare = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    try {
      const res = await api.compareVariantsDetailed(selected);
      setResult(res.variants);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Search + Compare bar */}
      <div className="t-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-[#e6edf3]">Varyant Sec (en az 2)</h3>
          <input type="text" placeholder="Ara... model, kod, motor" value={search}
            onChange={e => setSearch(e.target.value)}
            className="t-input flex-1 min-w-[200px]" />
          {selected.length > 0 && (
            <button onClick={() => { setSelected([]); setResult(null); }}
              className="text-[10px] text-[#8b949e] hover:text-[#f85149] transition">
              Temizle ({selected.length})
            </button>
          )}
          <button onClick={runCompare} disabled={selected.length < 2 || loading}
            className="px-5 py-2 bg-[#E30613] text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-[#c00510] transition-all hover:shadow-lg hover:shadow-[#E30613]/20">
            {loading ? 'Yukleniyor...' : `Karsilastir (${selected.length})`}
          </button>
        </div>
      </div>

      {/* Variant Cards Grid - collapse when results shown */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-y-auto pr-1 transition-all ${result ? 'max-h-0 overflow-hidden opacity-0' : 'max-h-[520px] opacity-100'}`}>
        {filtered.map(v => {
          const img = getVehicleImage(v.model);
          const isSelected = selected.includes(v.variant_code);
          return (
            <div key={v.variant_code}
              className={`t-panel cursor-default transition-all duration-300 group relative overflow-hidden card-hover-glow ${
                isSelected
                  ? 'ring-2 ring-[#E30613] bg-[#E30613]/5 shadow-lg shadow-[#E30613]/10'
                  : 'hover:border-[#30363d] hover:bg-[#161b22]/80 hover:shadow-md hover:-translate-y-0.5'
              }`}>
              {/* Add / Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleVariant(v.variant_code); }}
                className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center z-10 transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#E30613] hover:bg-[#c00510] shadow-[0_0_8px_rgba(227,6,19,0.4)] rotate-[135deg]'
                    : 'bg-[#21262d]/80 hover:bg-[#30363d] hover:scale-110 rotate-0'
                }`}
                title={isSelected ? 'Karsilastirmadan cikar' : 'Karsilastirmaya ekle'}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke={isSelected ? 'white' : '#8b949e'} strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              {/* Bus image */}
              <div className="relative h-20 bg-gradient-to-br from-[#1a2030] to-[#0f1419] overflow-hidden">
                {img ? (
                  <img src={img} alt={v.model} className={`absolute inset-0 w-full h-full object-contain p-2 transition duration-300 ${isSelected ? 'opacity-90 scale-105' : 'opacity-70 group-hover:opacity-90 group-hover:scale-105'}`} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#21262d]" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="6" width="18" height="10" rx="2" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></svg>
                  </div>
                )}
                {/* VECTO badge */}
                <div className="absolute top-2 left-2">
                  {v.has_output
                    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3fb950]/15 text-[#3fb950] text-[8px] font-bold tracking-wide"><span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shadow-[0_0_4px_rgba(63,185,80,0.6)] inline-block" />VECTO</span>
                    : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#21262d]/80 text-[#484f58] text-[8px] font-bold tracking-wide"><span className="w-1.5 h-1.5 rounded-full bg-[#484f58] inline-block" />Eksik</span>
                  }
                </div>
              </div>
              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <div className="text-[11px] font-bold text-[#e6edf3] truncate group-hover:text-[#E30613] transition">{v.model}</div>
                <div className="font-mono text-[8px] text-[#484f58] leading-tight truncate">{v.variant_code}</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                  <div className="text-[#8b949e]">{v.power_kw ? `${v.power_kw} kW` : '—'}</div>
                  <div className="text-right text-[#58a6ff] font-bold">{v.avg_co2 ? `${v.avg_co2}` : '—'}<span className="text-[#484f58] font-normal ml-0.5">g/km</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Back to picker */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setResult(null)}
                className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#E30613] transition">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                Secime Don
              </button>
              <span className="text-[10px] text-[#484f58]">{result.length} varyant karsilastiriliyor</span>
            </div>
          </div>

          {/* Spider/Radar Chart */}
          <VariantRadarChart variants={result} />

          <div className="t-panel overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-[#484f58] uppercase border-b border-[#21262d]">
                  <th className="text-left px-4 py-3 w-44 sticky left-0 bg-[#0d1117]">Ozellik</th>
                  {result.map((r, i) => {
                    const img = getVehicleImage(r.model);
                    return (
                      <th key={r.variant_code} className="text-center px-3 py-3 min-w-[160px]" style={{ color: MODEL_COLORS[i % MODEL_COLORS.length] }}>
                        <div className="flex flex-col items-center gap-1.5">
                          {img && (
                            <div className="w-12 h-12 rounded-lg bg-[#161b22] border border-[#21262d] overflow-hidden flex items-center justify-center">
                              <img src={img} alt={r.model} className="w-full h-full object-contain p-1" />
                            </div>
                          )}
                          <div className="font-bold text-[11px]">{r.model}</div>
                          <div className="font-mono text-[8px] text-[#484f58] leading-tight">{r.variant_code.substring(0, 16)}</div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="text-[#8b949e]">
                {[
                  { section: 'Motor' },
                  { label: 'Motor', key: 'engine' },
                  { label: 'Guc (kW)', key: 'power_kw', render: v => fmt(v, 1), highlight: true, lowerBetter: false },
                  { label: 'Guc (HP)', key: 'power_hp', render: v => fmt(v, 0), highlight: true, lowerBetter: false },
                  { label: 'Tork (Nm)', key: 'max_torque_nm', render: v => fmt(v, 0), highlight: true, lowerBetter: false },
                  { label: 'Hacim (cc)', key: 'displacement_cc' },
                  { label: 'Yakit', key: 'fuel_type' },
                  { section: 'Arac' },
                  { label: 'Max Yuklü Agirlik (kg)', key: 'max_laden_mass_kg', render: v => fmt(v, 0), highlight: true, lowerBetter: true },
                  { label: 'Bos Agirlik (kg)', key: 'curb_weight_kg', render: v => fmt(v, 0), highlight: true, lowerBetter: true },
                  { label: 'Guc/Agirlik', key: 'power_weight_ratio', render: v => fmt(v, 2), highlight: true, lowerBetter: false },
                  { section: 'Aktarma Organlari' },
                  { label: 'Sanziman', key: 'gearbox' },
                  { label: 'Vites Sayisi', key: 'gear_count' },
                  { label: 'Sanziman Tipi', key: 'gearbox_type' },
                  { label: 'Aks Orani', key: 'axle_ratio', render: v => fmt(v, 3) },
                  { label: 'Aks Tipi', key: 'axle_type' },
                  { section: 'Lastikler' },
                  { label: 'On Lastik', key: 'tyre_front' },
                  { label: 'On Lastik Boyut', key: 'tyre_front_dimension' },
                  { label: 'Arka Lastik', key: 'tyre_rear' },
                  { label: 'Arka Lastik Boyut', key: 'tyre_rear_dimension' },
                  { section: 'ADAS' },
                  { label: 'Start/Stop', key: 'engine_stop_start', render: v => v ? '✓' : '✗' },
                  { label: 'Eco Roll', key: 'eco_roll', render: v => v ? '✓' : '✗' },
                  { label: 'Predictive Cruise', key: 'predictive_cruise' },
                  { section: 'CO₂ Sonuclari' },
                  { label: 'CO₂ Ortalama (g/km)', key: 'co2_avg', render: v => fmt(v, 1), highlight: true, lowerBetter: true },
                  { label: 'CO₂ Min', key: 'co2_min', render: v => fmt(v, 1), highlight: true, lowerBetter: true },
                  { label: 'CO₂ Max', key: 'co2_max', render: v => fmt(v, 1), highlight: true, lowerBetter: true },
                  { label: 'Filo Adet', key: 'fleet_count' },
                ].map((row) => {
                  if (row.section) {
                    return (
                      <tr key={row.section} className="bg-[#161b22]">
                        <td colSpan={result.length + 1} className="px-4 py-2 text-[10px] font-bold text-[#e6edf3] uppercase tracking-widest">{row.section}</td>
                      </tr>
                    );
                  }
                  const numVals = result.map(r => typeof r[row.key] === 'number' ? r[row.key] : null);
                  const valid = numVals.filter(x => x != null);
                  const bestVal = row.highlight && valid.length >= 2 ? (row.lowerBetter ? Math.min(...valid) : Math.max(...valid)) : null;
                  const worstVal = row.highlight && valid.length >= 2 ? (row.lowerBetter ? Math.max(...valid) : Math.min(...valid)) : null;
                  const hasDiff = bestVal != null && worstVal != null && bestVal !== worstVal;
                  // Text difference detection
                  const textVals = result.map(r => row.render ? row.render(r[row.key]) : String(r[row.key] ?? '—'));
                  const uniqueTexts = new Set(textVals);
                  const isDiff = !row.highlight && uniqueTexts.size > 1;
                  return (
                    <tr key={row.label} className={`border-b border-[#21262d]/40 ${isDiff ? 'bg-[#d29922]/5' : ''}`}>
                      <td className={`px-4 py-2 font-medium text-[11px] sticky left-0 ${isDiff ? 'text-[#d29922] bg-[#d29922]/5' : 'text-[#e6edf3] bg-[#0d1117]'}`}>
                        {row.label}{isDiff && <span className="ml-1 text-[8px]">●</span>}
                      </td>
                      {result.map((r, i) => (
                        <td key={r.variant_code} className={`text-center px-3 py-2 ${
                          hasDiff && numVals[i] === bestVal ? 'text-[#3fb950] font-bold bg-[#3fb950]/10' :
                          hasDiff && numVals[i] === worstVal ? 'text-[#f85149] font-bold bg-[#f85149]/10' :
                          isDiff ? 'text-[#d29922] font-medium' : ''
                        }`}>
                          {row.render ? row.render(r[row.key]) : (r[row.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result.some(r => r.missions?.length > 0) && (
            <div className="t-panel p-4">
              <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Misyon Bazli CO₂ Karsilastirma</h3>
              <MissionCompareChart variants={result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VariantRadarChart({ variants }) {
  const radarData = useMemo(() => {
    const metrics = [
      { key: 'power_kw', label: 'Guc (kW)' },
      { key: 'max_torque_nm', label: 'Tork (Nm)' },
      { key: 'max_laden_mass_kg', label: 'Kutle (kg)' },
      { key: 'co2_avg', label: 'CO₂ (g/km)' },
      { key: 'axle_ratio', label: 'Aks Orani' },
      { key: 'gear_count', label: 'Vites Sayisi' },
    ];
    return metrics.map(({ key, label }) => {
      const vals = variants.map(v => v[key] || 0);
      const max = Math.max(...vals, 1);
      const entry = { subject: label };
      variants.forEach(v => {
        entry[v.variant_code] = Math.round(((v[key] || 0) / max) * 100);
      });
      return entry;
    });
  }, [variants]);

  if (radarData.length === 0) return null;

  return (
    <div className="t-panel p-4">
      <h3 className="text-sm font-bold text-[#e6edf3] mb-3">Radar Karsilastirma</h3>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#21262d" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b949e', fontSize: 10 }} />
          <PolarRadiusAxis tick={{ fill: '#484f58', fontSize: 9 }} domain={[0, 100]} />
          {variants.map((v, i) => (
            <Radar key={v.variant_code}
              name={`${v.model} (${v.variant_code.substring(0, 12)})`}
              dataKey={v.variant_code}
              stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
              fill={MODEL_COLORS[i % MODEL_COLORS.length]}
              fillOpacity={0.12} strokeWidth={2} />
          ))}
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MissionCompareChart({ variants }) {
  const missionNames = [...new Set(variants.flatMap(v => v.missions.map(m => m.mission)))].filter(Boolean);
  const chartData = missionNames.map(mission => {
    const entry = { mission };
    variants.forEach(v => {
      const m = v.missions.find(x => x.mission === mission);
      entry[v.variant_code] = m?.co2_g_km || null;
    });
    return entry;
  });

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis dataKey="mission" tick={{ fill: '#8b949e', fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} label={{ value: 'g/km', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10 }} />
        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {variants.map((v, i) => (
          <Bar key={v.variant_code} dataKey={v.variant_code} name={`${v.model} (${v.variant_code.substring(0, 10)})`}
            fill={MODEL_COLORS[i % MODEL_COLORS.length]} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ═══════════════════════════════════════════════════════════
   Shared: Variant Table
   ═══════════════════════════════════════════════════════════ */

function VariantTable({ variants, onSelectVariant, compareList = [], onToggleCompare }) {
  const [sortKey, setSortKey] = useState('variant_code');
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const models = useMemo(() => [...new Set(variants.map(v => v.model))].sort(), [variants]);

  const sorted = useMemo(() => {
    let f = variants;
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(v => v.variant_code.toLowerCase().includes(s) || (v.model || '').toLowerCase().includes(s) || (v.engine_model || '').toLowerCase().includes(s));
    }
    if (modelFilter) f = f.filter(v => v.model === modelFilter);
    if (statusFilter === 'complete') f = f.filter(v => v.has_output);
    if (statusFilter === 'missing') f = f.filter(v => !v.has_output);

    return [...f].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (va == null) va = sortDir === 'asc' ? Infinity : -Infinity;
      if (vb == null) vb = sortDir === 'asc' ? Infinity : -Infinity;
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [variants, sortKey, sortDir, search, modelFilter, statusFilter]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => (
    <span className={`ml-1 text-[8px] ${sortKey === col ? 'text-[#E30613]' : 'text-[#30363d]'}`}>
      {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <div className="t-panel">
      <div className="flex flex-wrap gap-2 p-3 border-b border-[#21262d]">
        <input type="text" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} className="t-input w-48" />
        <select value={modelFilter} onChange={e => setModelFilter(e.target.value)} className="t-input">
          <option value="">Tum Modeller</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="t-input">
          <option value="">Tum Durum</option>
          <option value="complete">VECTO Sonuclu</option>
          <option value="missing">Sonuc Eksik</option>
        </select>
        <span className="text-[10px] text-[#484f58] self-center ml-auto">{sorted.length} / {variants.length} varyant</span>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#0d1117] z-10">
            <tr className="text-[10px] text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
              <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('model')}>Model<SortIcon col="model" /></th>
              <th className="text-left px-3 py-2 cursor-pointer" onClick={() => toggleSort('variant_code')}>Varyant Kodu<SortIcon col="variant_code" /></th>
              <th className="text-center px-2 py-2">Durum</th>
              <th className="text-right px-3 py-2 cursor-pointer" onClick={() => toggleSort('power_kw')}>Guc kW<SortIcon col="power_kw" /></th>
              <th className="text-right px-3 py-2 cursor-pointer" onClick={() => toggleSort('max_torque_nm')}>Tork Nm<SortIcon col="max_torque_nm" /></th>
              <th className="text-right px-2 py-2">Hacim</th>
              <th className="text-left px-2 py-2">Sanziman</th>
              <th className="text-right px-2 py-2">Aks</th>
              <th className="text-left px-2 py-2">On Lastik</th>
              <th className="text-left px-2 py-2">Arka Lastik</th>
              <th className="text-right px-3 py-2 cursor-pointer" onClick={() => toggleSort('avg_co2')}>CO₂<SortIcon col="avg_co2" /></th>
              <th className="text-right px-2 py-2">Yakit</th>
              <th className="text-right px-2 py-2">Filo</th>
              {onToggleCompare && <th className="text-center px-2 py-2 w-8">⇆</th>}
            </tr>
          </thead>
          <tbody className="text-[#8b949e]">
            {sorted.map(v => (
              <tr key={v.variant_code}
                className="border-b border-[#21262d]/30 hover:bg-[#21262d]/30 cursor-pointer transition"
                onClick={() => onSelectVariant && onSelectVariant(v.variant_id)}>
                <td className="px-3 py-2 font-bold text-[#e6edf3]">{v.model}</td>
                <td className="px-3 py-2 font-mono text-[10px]">{v.variant_code}</td>
                <td className="px-2 py-2 text-center">
                  {v.has_output
                    ? <span className="inline-block w-2 h-2 rounded-full bg-[#3fb950]" title="VECTO sonucu var" />
                    : <span className="inline-block w-2 h-2 rounded-full bg-[#484f58]" title="Sonuc eksik" />
                  }
                </td>
                <td className="px-3 py-2 text-right font-bold text-[#e6edf3]">{v.power_kw || '—'}</td>
                <td className="px-3 py-2 text-right">{v.max_torque_nm || '—'}</td>
                <td className="px-2 py-2 text-right">{v.displacement_cc || '—'}</td>
                <td className="px-2 py-2 text-[10px]">{v.gearbox_model || '—'}</td>
                <td className="px-2 py-2 text-right">{v.axle_ratio || '—'}</td>
                <td className="px-2 py-2 text-[10px]">{v.tyre_front_dimension || v.tyre_dimension || '—'}</td>
                <td className="px-2 py-2 text-[10px]">{v.tyre_rear_dimension || v.tyre_dimension || '—'}</td>
                <td className="px-3 py-2 text-right font-bold text-[#58a6ff]">{v.avg_co2 || '—'}</td>
                <td className="px-2 py-2 text-right text-[10px]">{v.avg_fc || '—'}</td>
                <td className="px-2 py-2 text-right">{v.fleet_count || 0}</td>
                {onToggleCompare && (
                  <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleCompare(v.variant_code)}
                      className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${
                        compareList.includes(v.variant_code)
                          ? 'bg-[#E30613] text-white shadow-[0_0_6px_rgba(227,6,19,0.4)]'
                          : 'bg-[#21262d] text-[#484f58] hover:bg-[#30363d] hover:text-[#8b949e]'
                      }`}
                      title={compareList.includes(v.variant_code) ? 'Karsilastirmadan cikar' : 'Karsilastirmaya ekle'}
                    >
                      {compareList.includes(v.variant_code) ? '✓' : '+'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN: Unified Variant Hub
   ═══════════════════════════════════════════════════════════ */

const MODES = [
  { key: 'overview', label: 'Genel Bakis', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'variant-compare', label: 'Varyant Karsilastirma', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
];

export default function VariantList({ onSelectVariant }) {
  const [hubData, setHubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMode, setActiveMode] = useState('overview');
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelView, setModelView] = useState(null);
  const [compareList, setCompareList] = useState([]);

  const toggleCompare = useCallback((code) => {
    setCompareList(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getVariantsHub()
      .then(d => { setHubData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectModel = useCallback((model) => {
    setModelView(model);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-[#8b949e]">Veri yukleniyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="t-panel p-6 text-center">
        <div className="text-[#f85149] text-sm mb-2">Veri yuklenemedi</div>
        <div className="text-[10px] text-[#484f58]">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#e6edf3]">Varyant Merkezi</h2>
          <p className="text-xs text-[#8b949e]">
            {hubData.analytics.total_variants} varyant · {hubData.analytics.total_models} model · {hubData.analytics.variants_with_output} VECTO sonucu
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      {!modelView && (
        <div className="flex gap-1 bg-[#161b22] p-1 rounded-lg border border-[#21262d]">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMode(m.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                activeMode === m.key
                  ? 'bg-[#E30613]/15 text-[#E30613] shadow-sm'
                  : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={m.icon} />
              </svg>
              {m.label}
              {m.key === 'variant-compare' && compareList.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#E30613] text-white min-w-[18px] text-center">{compareList.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Active Mode Content */}
      {modelView ? (
        <ModelVariantsMode data={hubData} modelName={modelView} onBack={() => setModelView(null)} onSelectVariant={onSelectVariant} />
      ) : activeMode === 'overview' ? (
        <OverviewMode data={hubData} onSelectModel={handleSelectModel} onSelectVariant={onSelectVariant} compareList={compareList} onToggleCompare={toggleCompare} />
      ) : activeMode === 'variant-compare' ? (
        <VariantCompareMode data={hubData} initialSelected={compareList} />
      ) : null}

      {/* Floating compare badge */}
      {compareList.length > 0 && activeMode !== 'variant-compare' && !modelView && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <button
            onClick={() => setActiveMode('variant-compare')}
            className="flex items-center gap-2 px-4 py-3 bg-[#E30613] text-white text-xs font-bold rounded-full shadow-lg shadow-[#E30613]/30 hover:bg-[#c00510] transition-all hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Karsilastir ({compareList.length})
          </button>
          <button
            onClick={() => setCompareList([])}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#21262d] border border-[#30363d] text-[#8b949e] text-[10px] flex items-center justify-center hover:bg-[#30363d] transition"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
