import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api';
import { useChartTheme } from './ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { generateListComparePdf, usePdfState } from './usePdfExport';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, AreaChart, Area, LineChart, Line,
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
  '#3b82f6', '#58a6ff', '#3fb950', '#d29922', '#f85149',
  '#bc8cff', '#39d2c0', '#f0883e', '#ff7b72', '#79c0ff',
];

/* ── HUD Style Constants ── */
const HUD_GLOW = 'rgba(37,99,235,0.35)';
const HUD_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const HUD_SCAN_KEYFRAMES = `
@keyframes hudScan { 0% { top: 0%; opacity: 0.6; } 100% { top: 100%; opacity: 0; } }
@keyframes hudPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
@keyframes hudGlow { 0%,100% { box-shadow: 0 0 8px rgba(37,99,235,0.2); } 50% { box-shadow: 0 0 20px rgba(37,99,235,0.35); } }
@keyframes arcSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes dataStream { 0% { background-position: 0% 0%; } 100% { background-position: 0% 100%; } }
`;

function HudFrame({ children, className = '', glow = false }) {
  return (
    <div className={`relative rounded-xl border border-[#dbe8ff] bg-gradient-to-br from-white via-[#f8fbff] to-[#eef5ff] backdrop-blur-md overflow-hidden ${glow ? 'shadow-[0_0_30px_rgba(37,99,235,0.12)]' : ''} ${className}`}>
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-blue-400/60 rounded-tl-xl" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-blue-400/60 rounded-tr-xl" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-blue-400/60 rounded-bl-xl" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-blue-400/60 rounded-br-xl" />
      {/* Scan line */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" style={{ animation: 'hudScan 3s linear infinite' }} />
      {children}
    </div>
  );
}

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
      <div className="text-[10px] text-[#8ba0c0] uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${accent || 'text-[#10203f]'}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#5f78a7] mt-1">{sub}</div>}
    </div>
  );
}

function OverviewMode({ data, onSelectModel, onSelectVariant, compareList, onToggleCompare }) {
  const ct = useChartTheme();
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
        <KpiCard label="En Yuksek CO₂" value={a.co2_max ? `${a.co2_max}` : '—'} sub={a.worst_variant?.substring(0, 15)} accent="text-[#1e40af]" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="t-panel p-4">
          <h3 className="text-sm font-bold text-[#10203f] mb-3">Model Bazli CO₂ (g/km)</h3>
          {modelCO2.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modelCO2} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fill: ct.isDark ? '#5f78a7' : '#64748b', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: ct.isDark ? '#10203f' : '#1e293b', fontSize: 11 }} width={75} />
                <Tooltip contentStyle={ct.tooltip.contentStyle} labelStyle={ct.tooltip.labelStyle} />
                <Bar dataKey="co2" radius={[0, 4, 4, 0]}>
                  {modelCO2.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[#8ba0c0]">VECTO sonuclari yuklenmedi</div>
          )}
        </div>

        <div className="t-panel p-4">
          <h3 className="text-sm font-bold text-[#10203f] mb-3">Guc vs CO₂ Dagilimi</h3>
          {scatter.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.isDark ? '#dbe8ff' : '#e2e8f0'} />
                <XAxis type="number" dataKey="x" name="Guc (kW)" tick={{ fill: ct.isDark ? '#5f78a7' : '#64748b', fontSize: 10 }} label={{ value: 'kW', position: 'insideBottom', fill: ct.isDark ? '#8ba0c0' : '#94a3b8', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="CO₂ (g/km)" tick={{ fill: ct.isDark ? '#5f78a7' : '#64748b', fontSize: 10 }} label={{ value: 'g/km', angle: -90, position: 'insideLeft', fill: ct.isDark ? '#8ba0c0' : '#94a3b8', fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={ct.tooltip.contentStyle} />
                <Scatter data={scatter} fill="#3b82f6" fillOpacity={0.7}>
                  {scatter.map((_, i) => <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[#8ba0c0]">Yeterli veri yok</div>
          )}
        </div>
      </div>

      {/* Model Cards */}
      <div>
        <h3 className="text-sm font-bold text-[#10203f] mb-3">Model Ozeti</h3>
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
                    <div className="relative h-24 bg-gradient-to-br from-[#eef5ff] to-[#eaf3ff] overflow-hidden">
                      {img && <img src={img} alt={m.model} className="absolute inset-0 w-full h-full object-contain p-3 opacity-70 group-hover:opacity-90 transition duration-300" />}
                      <div className="absolute bottom-2 left-3">
                        <div className="text-base font-extrabold text-white drop-shadow">{m.model}</div>
                        <div className="text-[10px] text-[#5f78a7]">{m.category}</div>
                      </div>
                      <div className="absolute top-2 right-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#dbe8ff]/80 text-[#10203f]">{m.variant_count} varyant</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[9px] text-[#8ba0c0] uppercase">CO₂ Ort</div>
                          <div className="text-sm font-bold text-[#58a6ff]">{m.co2_avg || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[#8ba0c0] uppercase">Guc</div>
                          <div className="text-sm font-bold text-[#10203f]">{m.power_range || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[#8ba0c0] uppercase">Filo</div>
                          <div className="text-sm font-bold text-[#d29922]">{m.fleet_total}</div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-[#8ba0c0]">Veri Tamligi</span>
                          <span className="text-[#5f78a7]">{m.data_completeness}%</span>
                        </div>
                        <div className="h-1.5 bg-[#dbe8ff] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${m.data_completeness}%`, background: m.data_completeness === 100 ? '#3fb950' : m.data_completeness > 50 ? '#3b82f6' : '#1d4ed8' }} />
                        </div>
                      </div>
                      {m.co2_spread > 0 && (
                        <div className="text-[10px] text-[#5f78a7]">
                          CO₂ aralik: {m.co2_min} — {m.co2_max} g/km <span className="text-[#8ba0c0]">(fark: {m.co2_spread})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* BACK */}
                  <div className="t-panel absolute inset-0 group-hover:[transform:rotateY(0deg)] [transform:rotateY(-180deg)] transition-transform duration-500 overflow-hidden" style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}>
                    <div className="p-3 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-extrabold text-[#3b82f6]">{m.model}</div>
                        <span className="text-[9px] text-[#5f78a7] bg-[#dbe8ff] px-1.5 py-0.5 rounded">{m.variant_count} varyant</span>
                      </div>
                      <div className="space-y-1.5 text-[10px] flex-1 overflow-y-auto">
                        <div className="flex justify-between"><span className="text-[#8ba0c0]">Kategori</span><span className="text-[#10203f]">{m.category || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-[#8ba0c0]">Motor</span><span className="text-[#5f78a7] text-right truncate ml-2">{engines.join(', ') || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-[#8ba0c0]">Sanziman</span><span className="text-[#5f78a7] text-right truncate ml-2">{gearboxes.join(', ') || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-[#8ba0c0]">Lastik</span><span className="text-[#5f78a7]">{tyres.join(', ') || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-[#8ba0c0]">Guc</span><span className="text-[#10203f] font-bold">{m.power_range || '—'} kW</span></div>
                        <div className="flex justify-between"><span className="text-[#8ba0c0]">CO₂ Ort</span><span className="text-[#58a6ff] font-bold">{m.co2_avg ? `${m.co2_avg} g/km` : '—'}</span></div>
                        {m.co2_min && <div className="flex justify-between"><span className="text-[#8ba0c0]">CO₂ Aralik</span><span className="text-[#5f78a7]">{m.co2_min} — {m.co2_max}</span></div>}
                        <div className="flex justify-between"><span className="text-[#8ba0c0]">VECTO Sonuc</span><span className={m.has_output_count > 0 ? 'text-[#3fb950]' : 'text-[#8ba0c0]'}>{m.has_output_count}/{m.variant_count}</span></div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#dbe8ff] text-center">
                        <span className="text-[9px] text-[#3b82f6] font-bold">Varyantlari Gor →</span>
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
        <h3 className="text-sm font-bold text-[#10203f] mb-3">Tum Varyantlar</h3>
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
        <div className="relative h-32 bg-gradient-to-br from-[#eef5ff] to-[#eaf3ff] overflow-hidden rounded-t-lg">
          {img && <img src={img} alt={modelName} className="absolute inset-0 w-full h-full object-contain p-6 opacity-30" />}
          <div className="absolute inset-0 flex items-end p-4">
            <div>
              <button onClick={onBack} className="text-[10px] text-[#5f78a7] hover:text-[#3b82f6] transition mb-2 flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                Tum Modeller
              </button>
              <h2 className="text-xl font-extrabold text-white drop-shadow">{modelName}</h2>
              <div className="text-xs text-[#5f78a7]">{model?.category} · {modelVars.length} varyant</div>
            </div>
          </div>
        </div>
        {model && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4">
            <div className="text-center">
              <div className="text-[9px] text-[#8ba0c0] uppercase">CO₂ Ort</div>
              <div className="text-sm font-bold text-[#58a6ff]">{model.co2_avg || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-[#8ba0c0] uppercase">Guc</div>
              <div className="text-sm font-bold text-[#10203f]">{model.power_range || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-[#8ba0c0] uppercase">CO₂ Min</div>
              <div className="text-sm font-bold text-[#3fb950]">{model.co2_min || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-[#8ba0c0] uppercase">CO₂ Max</div>
              <div className="text-sm font-bold text-[#1e40af]">{model.co2_max || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-[#8ba0c0] uppercase">Veri Tamligi</div>
              <div className="text-sm font-bold text-[#d29922]">{model.data_completeness}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Variant cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {modelVars.map(v => (
          <div key={v.variant_code}
            className="t-panel p-4 cursor-pointer hover:border-[#c7dcff] transition-all group"
            onClick={() => onSelectVariant(v.variant_id)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-[#10203f] group-hover:text-[#3b82f6] transition">{v.model}</h4>
                <div className="font-mono text-[9px] text-[#8ba0c0] mt-0.5">{v.variant_code}</div>
              </div>
              {v.has_output
                ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3fb950]/15 text-[#3fb950] font-bold">VECTO ✓</span>
                : <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#dbe8ff] text-[#8ba0c0]">Eksik</span>
              }
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
              <div className="flex justify-between"><span className="text-[#8ba0c0]">Guc</span><span className="text-[#10203f] font-bold">{v.power_kw ? `${v.power_kw} kW` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#8ba0c0]">Tork</span><span className="text-[#10203f]">{v.max_torque_nm ? `${v.max_torque_nm} Nm` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#8ba0c0]">Motor</span><span className="text-[#5f78a7] truncate ml-2">{v.engine_model || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#8ba0c0]">Sanziman</span><span className="text-[#5f78a7] truncate ml-2">{v.gearbox_model || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#8ba0c0]">Aks Orani</span><span className="text-[#5f78a7]">{v.axle_ratio || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#8ba0c0]">Lastik</span><span className="text-[#5f78a7]">{v.tyre_front_dimension || v.tyre_dimension || '—'}</span></div>
            </div>
            {v.avg_co2 && (
              <div className="mt-3 pt-2 border-t border-[#dbe8ff]/40 flex justify-between items-center">
                <span className="text-[9px] text-[#8ba0c0]">CO₂ Ortalama</span>
                <span className="text-sm font-bold text-[#58a6ff]">{v.avg_co2} g/km</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full table */}
      <div>
        <h3 className="text-sm font-bold text-[#10203f] mb-3">{modelName} Tum Varyantlar</h3>
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
  const { exporting, run: runPdf } = usePdfState();

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
          <h3 className="text-sm font-bold text-[#10203f]">Varyant Sec (en az 2)</h3>
          <input type="text" placeholder="Ara... model, kod, motor" value={search}
            onChange={e => setSearch(e.target.value)}
            className="t-input flex-1 min-w-[200px]" />
          {selected.length > 0 && (
            <button onClick={() => { setSelected([]); setResult(null); }}
              className="text-[10px] text-[#5f78a7] hover:text-[#2563eb] transition">
              Temizle ({selected.length})
            </button>
          )}
          <button onClick={runCompare} disabled={selected.length < 2 || loading}
            className="px-5 py-2 bg-[#3b82f6] text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-[#2563eb] transition-all hover:shadow-lg hover:shadow-[#3b82f6]/20">
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
                  ? 'ring-2 ring-[#3b82f6] bg-[#3b82f6]/5 shadow-lg shadow-[#3b82f6]/10'
                  : 'hover:border-[#c7dcff] hover:bg-[#eef5ff]/80 hover:shadow-md hover:-translate-y-0.5'
              }`}>
              {/* Add / Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleVariant(v.variant_code); }}
                className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center z-10 transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#3b82f6] hover:bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.38)] rotate-[135deg]'
                    : 'bg-[#dbe8ff]/80 hover:bg-[#c7dcff] hover:scale-110 rotate-0'
                }`}
                title={isSelected ? 'Karsilastirmadan cikar' : 'Karsilastirmaya ekle'}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke={isSelected ? 'white' : '#5f78a7'} strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              {/* Bus image */}
              <div className="relative h-20 bg-gradient-to-br from-[#f0f7ff] to-[#eaf3ff] overflow-hidden">
                {img ? (
                  <img src={img} alt={v.model} className={`absolute inset-0 w-full h-full object-contain p-2 transition duration-300 ${isSelected ? 'opacity-90 scale-105' : 'opacity-70 group-hover:opacity-90 group-hover:scale-105'}`} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#dbe8ff]" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="6" width="18" height="10" rx="2" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></svg>
                  </div>
                )}
                {/* VECTO badge */}
                <div className="absolute top-2 left-2">
                  {v.has_output
                    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3fb950]/15 text-[#3fb950] text-[8px] font-bold tracking-wide"><span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shadow-[0_0_4px_rgba(63,185,80,0.6)] inline-block" />VECTO</span>
                    : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#dbe8ff]/80 text-[#8ba0c0] text-[8px] font-bold tracking-wide"><span className="w-1.5 h-1.5 rounded-full bg-[#8ba0c0] inline-block" />Eksik</span>
                  }
                </div>
              </div>
              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <div className="text-[11px] font-bold text-[#10203f] truncate group-hover:text-[#3b82f6] transition">{v.model}</div>
                <div className="font-mono text-[8px] text-[#8ba0c0] leading-tight truncate">{v.variant_code}</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                  <div className="text-[#5f78a7]">{v.power_kw ? `${v.power_kw} kW` : '—'}</div>
                  <div className="text-right text-[#58a6ff] font-bold">{v.avg_co2 ? `${v.avg_co2}` : '—'}<span className="text-[#8ba0c0] font-normal ml-0.5">g/km</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <style>{HUD_SCAN_KEYFRAMES}</style>

          {/* ═══ HUD COMMAND BAR ═══ */}
          <HudFrame glow>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setResult(null)}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition font-semibold">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                  Seçime Dön
                </button>
                <div className="h-4 w-px bg-cyan-500/20" />
                <div className="flex items-center gap-2">
                  <div className="relative w-3 h-3">
                    <div className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping" />
                    <div className="absolute inset-0.5 rounded-full bg-cyan-400" />
                  </div>
                  <span className="text-[10px] text-cyan-400/80 font-mono uppercase tracking-widest">
                    {result.length} Varyant Analiz Ediliyor
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[9px] font-mono text-[#5f78a7]">
                  <span>TEMSA</span>
                  <span className="text-cyan-500">DIGITAL TWIN</span>
                  <span>v2.0</span>
                </div>
                <div className="h-4 w-px bg-cyan-500/20" />
                <button
                  disabled={exporting}
                  onClick={() => runPdf(generateListComparePdf, { variants: result })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition
                    bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-cyan-600
                    disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
                >
                  {exporting ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  )}
                  {exporting ? 'Oluşturuluyor...' : 'PDF İndir'}
                </button>
              </div>
            </div>
          </HudFrame>

          {/* ═══ VARIANT HUD CARDS ═══ */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${result.length}, 1fr)` }}>
            {result.map((r, i) => {
              const img = getVehicleImage(r.model);
              const color = HUD_COLORS[i % HUD_COLORS.length];
              return (
                <motion.div key={r.variant_code}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <HudFrame className="group hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all duration-500">
                    {/* Color accent top bar */}
                    <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {img ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#dbe8ff] bg-gradient-to-br from-[#f0f7ff] to-[#eaf3ff] flex items-center justify-center">
                            <img src={img} alt={r.model} className="w-full h-full object-contain p-1 opacity-80 group-hover:opacity-100 transition" />
                            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg border border-[#dbe8ff] bg-gradient-to-br from-[#f0f7ff] to-[#eaf3ff] flex items-center justify-center">
                            <span className="text-2xl opacity-40">🚌</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-extrabold text-white truncate">{r.model}</div>
                          <div className="font-mono text-[8px] leading-tight truncate" style={{ color }}>{r.variant_code}</div>
                        </div>
                        <div className="w-2 h-8 rounded-full overflow-hidden bg-[#eef5ff]">
                          <div className="w-full rounded-full" style={{ height: '70%', background: `linear-gradient(to top, ${color}, transparent)`, animation: 'hudPulse 2s ease infinite' }} />
                        </div>
                      </div>
                      {/* Quick stats grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Güç', val: r.power_kw ? `${r.power_kw} kW` : '—', accent: r.power_kw },
                          { label: 'Tork', val: r.max_torque_nm ? `${r.max_torque_nm} Nm` : '—', accent: r.max_torque_nm },
                          { label: 'CO₂', val: r.co2_avg ? `${fmt(r.co2_avg, 1)}` : '—', accent: r.co2_avg },
                        ].map((s, si) => (
                          <div key={si} className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/5">
                            <div className="text-[8px] text-[#5f78a7] uppercase tracking-wider">{s.label}</div>
                            <div className="text-xs font-bold mt-0.5" style={{ color: s.accent ? color : '#64748b' }}>{s.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </HudFrame>
                </motion.div>
              );
            })}
          </div>

          {/* ═══ RADAR CHART ═══ */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <HudFrame glow>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 rounded-full bg-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Radar Karşılaştırma</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent ml-2" />
                </div>
                <VariantRadarChart variants={result} />
              </div>
            </HudFrame>
          </motion.div>

          {/* ═══ SPECS TABLE ═══ */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <HudFrame>
              <div className="p-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-blue-500/15">
                      <th className="text-left px-4 py-3 w-44 sticky left-0 bg-white text-[10px] text-cyan-400/60 uppercase tracking-widest font-bold">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-3 bg-cyan-400 rounded-full" />
                          Özellik
                        </div>
                      </th>
                      {result.map((r, i) => {
                        const img = getVehicleImage(r.model);
                        const color = HUD_COLORS[i % HUD_COLORS.length];
                        return (
                          <th key={r.variant_code} className="text-center px-3 py-3 min-w-[160px]">
                            <div className="flex flex-col items-center gap-1.5">
                              {img && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center border" style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}10, transparent)` }}>
                                  <img src={img} alt={r.model} className="w-full h-full object-contain p-1" />
                                </div>
                              )}
                              <div className="font-bold text-[11px]" style={{ color }}>{r.model}</div>
                              <div className="font-mono text-[8px] text-slate-600 leading-tight">{r.variant_code.substring(0, 16)}</div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="text-[#5f78a7]">
                    {[
                      { section: 'MOTOR', icon: '⚡' },
                      { label: 'Motor', key: 'engine' },
                      { label: 'Güç (kW)', key: 'power_kw', render: v => fmt(v, 1), highlight: true, lowerBetter: false },
                      { label: 'Güç (HP)', key: 'power_hp', render: v => fmt(v, 0), highlight: true, lowerBetter: false },
                      { label: 'Tork (Nm)', key: 'max_torque_nm', render: v => fmt(v, 0), highlight: true, lowerBetter: false },
                      { label: 'Hacim (cc)', key: 'displacement_cc' },
                      { label: 'Yakıt', key: 'fuel_type' },
                      { section: 'ARAÇ', icon: '🚌' },
                      { label: 'Max Yüklü Ağırlık (kg)', key: 'max_laden_mass_kg', render: v => fmt(v, 0), highlight: true, lowerBetter: true },
                      { label: 'Boş Ağırlık (kg)', key: 'curb_weight_kg', render: v => fmt(v, 0), highlight: true, lowerBetter: true },
                      { label: 'Güç/Ağırlık', key: 'power_weight_ratio', render: v => fmt(v, 2), highlight: true, lowerBetter: false },
                      { section: 'AKTARMA ORGANLARI', icon: '⚙️' },
                      { label: 'Şanzıman', key: 'gearbox' },
                      { label: 'Vites Sayısı', key: 'gear_count' },
                      { label: 'Şanzıman Tipi', key: 'gearbox_type' },
                      { label: 'Aks Oranı', key: 'axle_ratio', render: v => fmt(v, 3) },
                      { label: 'Aks Tipi', key: 'axle_type' },
                      { section: 'LASTİKLER', icon: '🛞' },
                      { label: 'Ön Lastik', key: 'tyre_front' },
                      { label: 'Ön Lastik Boyut', key: 'tyre_front_dimension' },
                      { label: 'Arka Lastik', key: 'tyre_rear' },
                      { label: 'Arka Lastik Boyut', key: 'tyre_rear_dimension' },
                      { section: 'ADAS', icon: '🛡️' },
                      { label: 'Start/Stop', key: 'engine_stop_start', render: v => v ? '✓' : '✗' },
                      { label: 'Eco Roll', key: 'eco_roll', render: v => v ? '✓' : '✗' },
                      { label: 'Predictive Cruise', key: 'predictive_cruise' },
                      { section: 'CO₂ SONUÇLARI', icon: '🌿' },
                      { label: 'CO₂ Ortalama (g/km)', key: 'co2_avg', render: v => fmt(v, 1), highlight: true, lowerBetter: true },
                      { label: 'CO₂ Min', key: 'co2_min', render: v => fmt(v, 1), highlight: true, lowerBetter: true },
                      { label: 'CO₂ Max', key: 'co2_max', render: v => fmt(v, 1), highlight: true, lowerBetter: true },
                      { label: 'Filo Adet', key: 'fleet_count' },
                    ].map((row) => {
                      if (row.section) {
                        return (
                          <tr key={row.section}>
                            <td colSpan={result.length + 1} className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/5 to-transparent border-t border-b border-blue-500/15">
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{row.icon}</span>
                                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.15em]">{row.section}</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/15 to-transparent" />
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      const numVals = result.map(r => typeof r[row.key] === 'number' ? r[row.key] : null);
                      const valid = numVals.filter(x => x != null);
                      const bestVal = row.highlight && valid.length >= 2 ? (row.lowerBetter ? Math.min(...valid) : Math.max(...valid)) : null;
                      const worstVal = row.highlight && valid.length >= 2 ? (row.lowerBetter ? Math.max(...valid) : Math.min(...valid)) : null;
                      const hasDiff = bestVal != null && worstVal != null && bestVal !== worstVal;
                      const textVals = result.map(r => row.render ? row.render(r[row.key]) : String(r[row.key] ?? '—'));
                      const uniqueTexts = new Set(textVals);
                      const isDiff = !row.highlight && uniqueTexts.size > 1;
                      return (
                        <tr key={row.label} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${isDiff ? 'bg-amber-500/[0.03]' : ''}`}>
                          <td className={`px-4 py-2.5 font-medium text-[11px] sticky left-0 ${isDiff ? 'text-amber-400 bg-amber-500/[0.03]' : 'text-[#10203f] bg-white'}`}>
                            {row.label}{isDiff && <span className="ml-1 text-cyan-400 text-[8px]">◆</span>}
                          </td>
                          {result.map((r, i) => (
                            <td key={r.variant_code} className={`text-center px-3 py-2.5 ${
                              hasDiff && numVals[i] === bestVal ? 'font-bold' :
                              hasDiff && numVals[i] === worstVal ? 'font-bold' :
                              isDiff ? 'font-medium' : ''
                            }`} style={{
                              color: hasDiff && numVals[i] === bestVal ? '#34d399' :
                                     hasDiff && numVals[i] === worstVal ? '#f87171' :
                                     isDiff ? '#fbbf24' : undefined,
                              background: hasDiff && numVals[i] === bestVal ? 'rgba(16,185,129,0.08)' :
                                          hasDiff && numVals[i] === worstVal ? 'rgba(248,113,113,0.06)' : undefined,
                            }}>
                              {row.render ? row.render(r[row.key]) : (r[row.key] ?? '—')}
                              {hasDiff && numVals[i] === bestVal && <span className="ml-1 text-[8px]">★</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </HudFrame>
          </motion.div>

          {/* ═══ MISSION CO₂ COMPARISON ═══ */}
          {result.some(r => r.missions?.length > 0) && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <HudFrame>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-4 rounded-full bg-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Misyon Bazlı CO₂ Karşılaştırma</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent ml-2" />
                  </div>
                  <MissionCompareChart variants={result} />
                </div>
              </HudFrame>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function VariantRadarChart({ variants }) {
  const ct = useChartTheme();
  const radarData = useMemo(() => {
    const metrics = [
      { key: 'power_kw', label: 'Güç (kW)' },
      { key: 'max_torque_nm', label: 'Tork (Nm)' },
      { key: 'max_laden_mass_kg', label: 'Kütle (kg)' },
      { key: 'co2_avg', label: 'CO₂ (g/km)' },
      { key: 'axle_ratio', label: 'Aks Oranı' },
      { key: 'gear_count', label: 'Vites Sayısı' },
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
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={radarData}>
        <PolarGrid stroke={ct.isDark ? 'rgba(6,182,212,0.12)' : 'rgba(59,130,246,0.12)'} strokeDasharray="3 3" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: ct.isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 600 }} />
        <PolarRadiusAxis tick={{ fill: ct.isDark ? '#475569' : '#94a3b8', fontSize: 8 }} domain={[0, 100]} axisLine={false} />
        {variants.map((v, i) => (
          <Radar key={v.variant_code}
            name={`${v.model} (${v.variant_code.substring(0, 12)})`}
            dataKey={v.variant_code}
            stroke={HUD_COLORS[i % HUD_COLORS.length]}
            fill={HUD_COLORS[i % HUD_COLORS.length]}
            fillOpacity={0.08} strokeWidth={2.5}
            dot={{ r: 3, fill: HUD_COLORS[i % HUD_COLORS.length], strokeWidth: 0 }}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
        <Tooltip contentStyle={ct.tooltip.contentStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function SpecDistributionChart({ variants }) {
  const ct = useChartTheme();
  const specData = useMemo(() => {
    return [
      { name: 'Güç', key: 'power_kw', unit: 'kW' },
      { name: 'Tork', key: 'max_torque_nm', unit: 'Nm' },
      { name: 'Ağırlık', key: 'max_laden_mass_kg', unit: 'kg' },
    ].map(spec => {
      const entry = { name: spec.name };
      variants.forEach((v, i) => {
        entry[`v${i}`] = v[spec.key] || 0;
      });
      return entry;
    });
  }, [variants]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={specData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
        <defs>
          {variants.map((_, i) => (
            <linearGradient key={i} id={`hudBar${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={HUD_COLORS[i % HUD_COLORS.length]} stopOpacity={0.9} />
              <stop offset="100%" stopColor={HUD_COLORS[i % HUD_COLORS.length]} stopOpacity={0.3} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.isDark ? 'rgba(6,182,212,0.08)' : '#e2e8f0'} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: ct.isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ct.isDark ? '#64748b' : '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={ct.tooltip.contentStyle} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {variants.map((v, i) => (
          <Bar key={i} dataKey={`v${i}`} name={v.model} fill={`url(#hudBar${i})`} radius={[4, 4, 0, 0]} barSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function MissionCompareChart({ variants }) {
  const ct = useChartTheme();
  const missionNames = [...new Set(variants.flatMap(v => (v.missions || []).map(m => m.mission)))].filter(Boolean);
  const chartData = missionNames.map(mission => {
    const entry = { mission };
    variants.forEach((v, i) => {
      const m = (v.missions || []).find(x => x.mission === mission);
      entry[`v${i}`] = m?.co2_g_km || null;
    });
    return entry;
  });

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ left: 10, bottom: 20 }}>
        <defs>
          {variants.map((_, i) => (
            <linearGradient key={i} id={`missionBar${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={HUD_COLORS[i % HUD_COLORS.length]} stopOpacity={0.9} />
              <stop offset="100%" stopColor={HUD_COLORS[i % HUD_COLORS.length]} stopOpacity={0.2} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.isDark ? 'rgba(6,182,212,0.08)' : '#e2e8f0'} vertical={false} />
        <XAxis dataKey="mission" tick={{ fill: ct.isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} angle={-15} textAnchor="end" height={50} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ct.isDark ? '#64748b' : '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
          label={{ value: 'g/km', angle: -90, position: 'insideLeft', fill: ct.isDark ? '#475569' : '#64748b', fontSize: 10 }} />
        <Tooltip contentStyle={ct.tooltip.contentStyle} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {variants.map((v, i) => (
          <Bar key={i} dataKey={`v${i}`} name={`${v.model} (${(v.variant_code || '').substring(0, 10)})`}
            fill={`url(#missionBar${i})`} radius={[4, 4, 0, 0]} barSize={24} />
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
    <span className={`ml-1 text-[8px] ${sortKey === col ? 'text-[#3b82f6]' : 'text-[#c7dcff]'}`}>
      {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <div className="t-panel">
      <div className="flex flex-wrap gap-2 p-3 border-b border-[#dbe8ff]">
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
        <span className="text-[10px] text-[#8ba0c0] self-center ml-auto">{sorted.length} / {variants.length} varyant</span>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#f8fbff] z-10">
            <tr className="text-[10px] text-[#8ba0c0] uppercase tracking-wider border-b border-[#dbe8ff]">
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
          <tbody className="text-[#5f78a7]">
            {sorted.map(v => (
              <tr key={v.variant_code}
                className="border-b border-[#dbe8ff]/30 hover:bg-[#dbe8ff]/30 cursor-pointer transition"
                onClick={() => onSelectVariant && onSelectVariant(v.variant_id)}>
                <td className="px-3 py-2 font-bold text-[#10203f]">{v.model}</td>
                <td className="px-3 py-2 font-mono text-[10px]">{v.variant_code}</td>
                <td className="px-2 py-2 text-center">
                  {v.has_output
                    ? <span className="inline-block w-2 h-2 rounded-full bg-[#3fb950]" title="VECTO sonucu var" />
                    : <span className="inline-block w-2 h-2 rounded-full bg-[#8ba0c0]" title="Sonuc eksik" />
                  }
                </td>
                <td className="px-3 py-2 text-right font-bold text-[#10203f]">{v.power_kw || '—'}</td>
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
                          ? 'bg-[#3b82f6] text-white shadow-[0_0_6px_rgba(37,99,235,0.35)]'
                          : 'bg-[#dbe8ff] text-[#8ba0c0] hover:bg-[#c7dcff] hover:text-[#5f78a7]'
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
  const ct = useChartTheme();
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
          <div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-[#5f78a7]">Veri yukleniyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="t-panel p-6 text-center">
        <div className="text-[#1d4ed8] text-sm mb-2">Veri yuklenemedi</div>
        <div className="text-[10px] text-[#8ba0c0]">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#dbe8ff] bg-gradient-to-br from-white via-[#f6faff] to-[#ebf4ff] p-5 md:p-6 shadow-[0_16px_40px_rgba(37,99,235,0.12)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2)_0%,transparent_34%),radial-gradient(circle_at_8%_85%,rgba(14,165,233,0.15)_0%,transparent_30%)]" />
        <img src="https://www.temsa.com/en/images/common/temsa-avenue-electron.png" alt="TEMSA bus" className="pointer-events-none absolute right-4 bottom-2 h-28 md:h-36 object-contain opacity-25" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-blue-100 text-blue-700 border border-blue-200">TEMSA Variant Intelligence</span>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#12386f] mt-2">Varyant Merkezi</h2>
            <p className="text-sm text-[#4d6ea4] mt-1">
              {hubData.analytics.total_variants} varyant · {hubData.analytics.total_models} model · {hubData.analytics.variants_with_output} VECTO sonucu
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-blue-100 bg-white/80 px-3 py-2">
              <div className="text-[10px] text-blue-700/70 uppercase">Model</div>
              <div className="text-sm font-bold text-blue-800">{hubData.analytics.total_models}</div>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-white/80 px-3 py-2">
              <div className="text-[10px] text-cyan-700/70 uppercase">Varyant</div>
              <div className="text-sm font-bold text-cyan-800">{hubData.analytics.total_variants}</div>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white/80 px-3 py-2">
              <div className="text-[10px] text-blue-700/70 uppercase">VECTO</div>
              <div className="text-sm font-bold text-blue-800">{hubData.analytics.variants_with_output}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      {!modelView && (
        <div className="flex gap-1 bg-[#eef5ff] p-1 rounded-lg border border-[#dbe8ff]">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMode(m.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                activeMode === m.key
                  ? 'bg-[#3b82f6]/15 text-[#3b82f6] shadow-sm'
                  : 'text-[#5f78a7] hover:text-[#10203f] hover:bg-[#dbe8ff]/50'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={m.icon} />
              </svg>
              {m.label}
              {m.key === 'variant-compare' && compareList.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[#3b82f6] text-white min-w-[18px] text-center">{compareList.length}</span>
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
            className="flex items-center gap-2 px-4 py-3 bg-[#3b82f6] text-white text-xs font-bold rounded-full shadow-lg shadow-[#3b82f6]/30 hover:bg-[#2563eb] transition-all hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Karsilastir ({compareList.length})
          </button>
          <button
            onClick={() => setCompareList([])}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#dbe8ff] border border-[#c7dcff] text-[#5f78a7] text-[10px] flex items-center justify-center hover:bg-[#c7dcff] transition"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
