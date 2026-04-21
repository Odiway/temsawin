import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { useChartTheme } from './ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import FleetPanel from './FleetPanel';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════
   Constants
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

const MODEL_COLORS = ['#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#f43f5e', '#06b6d4', '#eab308', '#ec4899'];

const SUBGROUP_COLORS = {
  P31SD: '#3fb950', P31DD: '#58a6ff', P32SD: '#d29922', P32DD: '#f85149', Unknown: '#8b949e',
};

const fmt = (v, d = 1) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return v.toFixed(d);
  return String(v);
};

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export default function SustainabilityPanel() {
  const ct = useChartTheme();
  const [emData, setEmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('overview');

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importDir, setImportDir] = useState('');

  // Expanded model in overview
  const [expandedModel, setExpandedModel] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const em = await api.getFleetEmissions();
      setEmData(em);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setImporting(true);
    setImportResult(null);
    const results = [];
    for (const file of files) {
      try {
        const r = await api.importResultFile(file);
        results.push({ file: file.name, ...r });
      } catch (err) {
        results.push({ file: file.name, status: 'error', error: err.message });
      }
    }
    setImportResult(results);
    setImporting(false);
    load();
  };

  const handleDirImport = async () => {
    if (!importDir) return;
    setImporting(true);
    setImportResult(null);
    try {
      const r = await api.importResultDirectory(importDir);
      setImportResult([r]);
    } catch (err) {
      setImportResult([{ status: 'error', error: err.message }]);
    }
    setImporting(false);
    load();
  };

  const fs = emData?.fleet_summary;
  const ms = emData?.model_summary || [];
  const vehicles = emData?.vehicles || [];

  // Group vehicles by model
  const vehiclesByModel = useMemo(() => {
    const map = {};
    vehicles.forEach(v => {
      const model = v.model || 'Bilinmeyen';
      if (!map[model]) map[model] = [];
      map[model].push(v);
    });
    return map;
  }, [vehicles]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-80 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-emerald-400 animate-spin" style={{ animationDuration: '2s', borderTopColor: 'transparent' }} />
        <div className="absolute inset-5 rounded-full bg-emerald-500/20" />
      </div>
      <span className="text-sm text-[#5f78a7] font-medium animate-pulse">Sürdürülebilirlik verileri yükleniyor...</span>
    </div>
  );

  const SECTIONS = [
    { key: 'overview', label: 'Emisyon Özeti' },
    { key: 'fleets', label: 'Filo Yönetimi' },
    { key: 'import', label: 'Veri Aktar' },
  ];

  return (
    <div className="space-y-5">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#eef5ff] via-[#f0f9ff] to-[#eef5ff] border border-[#dbe8ff] shadow-sm">
        {/* Background ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/[0.06] blur-3xl" />
          <div className="absolute -left-10 bottom-0 w-60 h-60 rounded-full bg-cyan-500/[0.04] blur-3xl" />
        </div>
        <div className="relative z-10 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            {/* Leaf/sustainability icon */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c4 0 8.5-3 11-8.5 0 0-2-1-5-.5"/>
                  <path d="M17 8c2-3 4-5 4-5s-3 .5-6 2"/>
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
                <span className="text-[7px] font-black text-emerald-900">CO₂</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#10203f] tracking-tight">Sürdürülebilirlik & Emisyon</h1>
              <p className="text-sm text-[#5f78a7] mt-0.5">
                Karbon emisyon yönetimi — <span className="text-emerald-400 font-semibold">{fs?.total_vehicles || 0}</span> araç, <span className="text-cyan-400 font-semibold">{fs?.total_results || 0}</span> VECTO sonucu
              </p>
            </div>
          </div>
          {/* Section tabs */}
          <div className="flex gap-1 bg-[#eef5ff] rounded-xl p-1 border border-[#dbe8ff]">
            {SECTIONS.map(s => (
              <button key={s.key} onClick={() => setSection(s.key)}
                className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                  section === s.key ? 'text-white' : 'text-[#5f78a7] hover:text-[#10203f] hover:bg-[#dbe8ff]/50'
                }`}>
                {section === s.key && (
                  <motion.div layoutId="sustab" className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-lg shadow-emerald-500/25" />
                )}
                <span className="relative z-10">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ KPI STRIP ═══ */}
      {fs && (
        <div className="grid grid-cols-5 gap-3">
          <KpiCard label="Filo Ort. CO₂" value={fmt(fs.co2_avg, 1)} unit="g/km" color="#10b981" />
          <KpiCard label="En İyi" value={fmt(fs.co2_min, 1)} unit="g/km" color="#34d399" />
          <KpiCard label="En Kötü" value={fmt(fs.co2_max, 1)} unit="g/km" color="#f87171" />
          <KpiCard label="Toplam Araç" value={fs.total_vehicles} unit="VIN" color="#06b6d4" />
          <KpiCard label="Sonuç Sayısı" value={fs.total_results} unit="misyon" color="#8b5cf6" />
        </div>
      )}

      <AnimatePresence mode="wait">
      {/* ═══════════════════════════════════════════════
          SECTION 1: EMİSYON ÖZETİ
         ═══════════════════════════════════════════════ */}
      {section === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">

          {/* Best & Worst side by side */}
          {fs && (fs.best_vehicle || fs.worst_vehicle) && (
            <div className="grid grid-cols-2 gap-4">
              {fs.best_vehicle && <HeroVehicleCard vehicle={fs.best_vehicle} type="best" />}
              {fs.worst_vehicle && <HeroVehicleCard vehicle={fs.worst_vehicle} type="worst" />}
            </div>
          )}

          {/* Model Cards with Bus Images */}
          <div>
            <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="text-base font-bold text-[#10203f]">Model Bazılı Karbon Emisyon</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-blue-500/20 to-transparent" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {ms.map((m, i) => {
                const img = getVehicleImage(m.model);
                const isExpanded = expandedModel === m.model;
                const modelVehicles = vehiclesByModel[m.model] || [];
                const color = MODEL_COLORS[i % MODEL_COLORS.length];
                return (
                  <motion.div key={m.model} layout
                    className={`rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                      isExpanded ? 'col-span-3 border-blue-500/30 bg-[#eef5ff]' : 'border-[#dbe8ff] bg-white hover:border-blue-500/30'
                    }`}
                    onClick={() => setExpandedModel(isExpanded ? null : m.model)}>
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Bus image */}
                        <div className="w-24 h-16 rounded-lg bg-[#f0f7ff] overflow-hidden flex items-center justify-center flex-shrink-0">
                          {img ? (
                            <img src={img} alt={m.model} className="w-full h-full object-contain opacity-90"
                              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                          ) : null}
                          <div className={`${img ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                            <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#bfd4ff]" fill="none" stroke="currentColor" strokeWidth="1.2">
                              <rect x="2" y="6" width="20" height="12" rx="3" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" />
                              <line x1="6" y1="9" x2="6" y2="13" /><line x1="10" y1="9" x2="10" y2="13" /><line x1="14" y1="9" x2="14" y2="13" /><line x1="18" y1="9" x2="18" y2="13" />
                            </svg>
                          </div>
                        </div>
                        {/* Model info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#10203f]">{m.model}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eef5ff] text-[#5f78a7] border border-[#dbe8ff]">
                              {m.vehicle_count} araç
                            </span>
                          </div>
                          {/* CO₂ range bar */}
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1 relative h-2 rounded-full bg-[#eef5ff] overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-rose-500/30 rounded-full" />
                              {fs && m.co2_avg && (
                                <motion.div className="absolute top-0 h-full w-1.5 rounded-full"
                                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                                  initial={{ left: '0%' }}
                                  animate={{ left: `${Math.min(((m.co2_avg - (fs.co2_min || 800)) / ((fs.co2_max || 1400) - (fs.co2_min || 800))) * 100, 100)}%` }}
                                  transition={{ duration: 1, delay: i * 0.1 }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        {/* CO₂ value */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-black" style={{ color }}>{fmt(m.co2_avg, 1)}</div>
                          <div className="text-[9px] text-[#8ba0c0] uppercase">g/km ort.</div>
                        </div>
                        {/* Min-Max */}
                        <div className="text-right flex-shrink-0 pl-3 border-l border-white/5">
                          <div className="text-[10px] text-emerald-400 font-semibold">{fmt(m.co2_min, 1)}</div>
                          <div className="text-[10px] text-rose-400 font-semibold">{fmt(m.co2_max, 1)}</div>
                          <div className="text-[8px] text-[#8ba0c0]">min / max</div>
                        </div>
                        {/* Expand icon */}
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-[#8ba0c0] ml-2">
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" /></svg>
                        </motion.div>
                      </div>
                    </div>

                    {/* Expanded: show variants under this model */}
                    <AnimatePresence>
                      {isExpanded && modelVehicles.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-[#dbe8ff]" onClick={e => e.stopPropagation()}>
                          <div className="p-4 grid grid-cols-3 gap-3">
                            {modelVehicles.map((v, vi) => (
                              <VariantMiniCard key={v.vin || vi} vehicle={v} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Model distribution chart */}
          {ms.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {/* Bar chart */}
              <div className="rounded-xl border border-[#dbe8ff] bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-bold text-[#10203f]">Model CO₂ Ortalaması</h3>
                </div>
                <ResponsiveContainer width="100%" height={ms.length * 48 + 20}>
                  <BarChart data={ms} layout="vertical" margin={{ left: 60, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#8ba0c0', fontSize: 10 }} axisLine={false} tickLine={false} unit=" g/km" />
                    <YAxis type="category" dataKey="model" tick={{ fill: '#10203f', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip content={<Co2Tooltip />} />
                    <defs>
                      <linearGradient id="co2g" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="co2_avg" fill="url(#co2g)" radius={[0, 6, 6, 0]} barSize={22} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Pie chart */}
              <div className="rounded-xl border border-[#dbe8ff] bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-cyan-500" />
                  <h3 className="text-sm font-bold text-[#10203f]">Araç Dağılımı</h3>
                </div>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie
                        data={ms.map(m => ({ name: m.model, value: m.vehicle_count }))}
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={3} dataKey="value" animationDuration={1200} stroke="none">
                        {ms.map((_, i) => <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} araç`, n]} contentStyle={ct.tooltip.contentStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {ms.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] }} />
                        <span className="text-[11px] text-[#5f78a7] flex-1 truncate">{m.model}</span>
                        <span className="text-[10px] font-bold text-[#5f78a7]">{m.vehicle_count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          SECTION 2: FİLO YÖNETİMİ
         ═══════════════════════════════════════════════ */}
      {section === 'fleets' && (
        <motion.div key="fleets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <FleetPanel embedded />
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          SECTION 3: VERİ AKTAR
         ═══════════════════════════════════════════════ */}
      {section === 'import' && (
        <motion.div key="import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
          {/* File Upload */}
          <div className="rounded-xl border border-[#dbe8ff] bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 12 15 15" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#10203f]">VECTO Sonuç Dosyası Yüklr</h3>
                <p className="text-xs text-[#5f78a7]">RSLT_CUSTOMER veya RSLT_MANUFACTURER XML dosyalarını seçin</p>
              </div>
            </div>
            <label className="block">
              <input type="file" accept=".xml" multiple onChange={handleFileUpload} disabled={importing}
                className="block w-full text-xs text-[#5f78a7] file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gradient-to-r file:from-cyan-500 file:to-blue-500 file:text-white file:cursor-pointer file:shadow-lg file:shadow-cyan-500/25 hover:file:shadow-cyan-500/40 file:transition-all" />
            </label>
          </div>

          {/* Directory Import */}
          <div className="rounded-xl border border-[#dbe8ff] bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#10203f]">Klasörden Toplu Aktar</h3>
                <p className="text-xs text-[#5f78a7]">VECTO sonuç dosyalarının bulunduğu klasör yolunu girin</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input type="text" value={importDir} onChange={e => setImportDir(e.target.value)}
                placeholder="C:\Vecto\Results veya \\server\share\results"
                className="flex-1 px-4 py-2.5 bg-[#f8fbff] border border-[#dbe8ff] rounded-xl text-xs text-[#10203f] placeholder-[#8ba0c0] focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" />
              <button onClick={handleDirImport} disabled={importing || !importDir}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/25 disabled:opacity-50 transition-all hover:shadow-violet-500/40">
                {importing ? 'Aktarılıyor...' : 'Aktar'}
              </button>
            </div>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="rounded-xl border border-[#dbe8ff] bg-white p-5">
              <h3 className="text-sm font-bold text-[#10203f] mb-3">Aktarım Sonucu</h3>
              <div className="space-y-2">
                {importResult.map((r, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${r.status === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                    {r.file && <div className="text-xs font-mono text-[#10203f]">{r.file}</div>}
                    {r.vin && <div className="text-[11px] text-[#5f78a7]">VIN: {r.vin} — {r.model}</div>}
                    {r.results_imported != null && <div className="text-[11px] text-emerald-400 font-medium">{r.results_imported} sonuç aktarıldı</div>}
                    {r.summary_co2 && <div className="text-[11px] text-emerald-400">Özet CO₂: {r.summary_co2} g/km</div>}
                    {r.files_processed != null && <div className="text-[11px] text-[#5f78a7]">{r.files_processed} dosya işlendi, {r.results_imported} sonuç aktarıldı</div>}
                    {r.error && <div className="text-[11px] text-rose-400">{r.error}</div>}
                    {r.errors?.length > 0 && r.errors.map((e, j) => (
                      <div key={j} className="text-[10px] text-rose-400">{e.file}: {e.error}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {importing && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-cyan-400 font-medium">VECTO sonuçları aktarılıyor...</span>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════════════════ */

function KpiCard({ label, value, unit, color }) {
  return (
    <div className="rounded-xl border border-[#dbe8ff] bg-white p-3.5 text-center shadow-sm">
      <div className="text-[9px] uppercase tracking-widest text-[#8ba0c0] font-bold">{label}</div>
      <div className="text-xl font-black mt-0.5" style={{ color }}>{value ?? '—'}</div>
      {unit && <div className="text-[9px] text-[#8ba0c0]">{unit}</div>}
    </div>
  );
}

function HeroVehicleCard({ vehicle, type }) {
  const img = getVehicleImage(vehicle.model);
  const isBest = type === 'best';
  const borderColor = isBest ? 'border-emerald-500/20' : 'border-rose-500/20';
  const gradFrom = isBest ? 'from-emerald-500/5' : 'from-rose-500/5';
  const gradTo = isBest ? 'to-teal-500/5' : 'to-pink-500/5';
  const textColor = isBest ? 'from-emerald-400 to-teal-300' : 'from-rose-400 to-pink-300';
  const labelColor = isBest ? 'text-emerald-400' : 'text-rose-400';
  const label = isBest ? 'EN DÜŞÜK CO₂' : 'EN YÜKSEK CO₂';

  return (
    <motion.div initial={{ opacity: 0, x: isBest ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: isBest ? 0.1 : 0.2 }}
      className={`relative overflow-hidden rounded-xl border ${borderColor} bg-gradient-to-br ${gradFrom} via-transparent ${gradTo} p-5 bg-white`}>
      <div className="flex items-center gap-5">
        {/* Bus image */}
          <div className="w-28 h-20 rounded-lg bg-[#f0f7ff] overflow-hidden flex items-center justify-center flex-shrink-0">
          {img ? (
            <img src={img} alt={vehicle.model} className="w-full h-full object-contain opacity-90" />
          ) : (
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-[#bfd4ff]" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="6" width="20" height="12" rx="3" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" />
            </svg>
          )}
        </div>
        {/* Info */}
        <div className="flex-1">
          <div className={`text-[10px] uppercase tracking-widest ${labelColor} font-bold mb-1`}>{label}</div>
          <div className="text-lg font-bold text-[#10203f]">{vehicle.model}</div>
          <div className="text-[10px] text-[#5f78a7] font-mono mt-0.5">{vehicle.vin}</div>
          <div className="flex gap-3 mt-2">
            {vehicle.summary_co2_pkm && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isBest ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/20 text-rose-400 bg-rose-500/5'} font-semibold`}>
                {vehicle.summary_co2_pkm} g/p-km
              </span>
            )}
            {vehicle.summary_fc_l_100km && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/20 text-cyan-400 bg-cyan-500/5 font-semibold">
                {vehicle.summary_fc_l_100km} L/100km
              </span>
            )}
          </div>
        </div>
        {/* Big CO₂ number */}
        <div className="text-right flex-shrink-0">
          <div className={`text-4xl font-black bg-gradient-to-r ${textColor} bg-clip-text text-transparent`}>
            {vehicle.summary_co2}
          </div>
          <div className="text-xs text-[#8ba0c0]">g/km</div>
        </div>
      </div>
    </motion.div>
  );
}

function VariantMiniCard({ vehicle: v }) {
  const img = getVehicleImage(v.model);
  return (
    <div className="rounded-lg border border-[#dbe8ff] bg-[#f8fbff] p-3">
      <div className="flex items-center gap-3">
          <div className="w-14 h-9 rounded bg-[#eef5ff] overflow-hidden flex items-center justify-center flex-shrink-0">
          {img ? <img src={img} alt={v.model} className="w-full h-full object-contain opacity-70" /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-[#10203f] truncate">{v.vin}</div>
            <div className="flex gap-1.5 mt-0.5 flex-wrap">
              {v.power_kw && <span className="text-[8px] px-1 py-0.5 rounded bg-[#eef5ff] text-[#5f78a7]">{v.power_kw} kW</span>}
              {v.fuel_type && <span className="text-[8px] px-1 py-0.5 rounded bg-[#eef5ff] text-[#5f78a7]">{v.fuel_type}</span>}
          </div>
        </div>
        {v.summary_co2 != null && (
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-black text-emerald-400">{v.summary_co2}</div>
            <div className="text-[7px] text-slate-600">g/km</div>
          </div>
        )}
      </div>
      {/* Mission mini row */}
      {v.missions?.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {v.missions.map((m, i) => (
            <span key={i} className="text-[7px] px-1.5 py-0.5 rounded bg-emerald-500/5 text-emerald-400/70 border border-emerald-500/10">
              {m.mission?.split(' ').pop()} {m.co2_g_km?.toFixed(0)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Co2Tooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#f0f7ff]/95 backdrop-blur-md border border-[#dbe8ff] rounded-xl p-3 shadow-lg">
      <div className="text-xs font-bold text-[#10203f] mb-1">{d.model}</div>
      <div className="text-[11px] text-emerald-600 font-semibold">{d.co2_avg} g/km</div>
      <div className="text-[10px] text-[#5f78a7]">{d.vehicle_count} araç &middot; {d.co2_min}–{d.co2_max}</div>
    </div>
  );
}

function EmptyBox({ msg, sub }) {
  return (
    <div className="rounded-xl border border-[#dbe8ff] bg-[#f8fbff] p-10 text-center">
      <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-[#bfd4ff] mb-3" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="2" y="6" width="20" height="12" rx="3" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" />
        <line x1="6" y1="9" x2="6" y2="13" /><line x1="10" y1="9" x2="10" y2="13" /><line x1="14" y1="9" x2="14" y2="13" /><line x1="18" y1="9" x2="18" y2="13" />
      </svg>
      <div className="text-[#5f78a7] text-sm font-semibold">{msg}</div>
      {sub && <p className="text-xs text-[#8ba0c0] mt-1">{sub}</p>}
    </div>
  );
}
