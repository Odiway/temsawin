import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { useChartTheme } from './ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';

const TABS = [
  { key: 'fleet',    label: 'Filo Özeti',   icon: '🌍' },
  { key: 'models',   label: 'Model Bazlı',  icon: '📊' },
  { key: 'vehicles', label: 'Araç Detay',   icon: '🚌' },
  { key: 'import',   label: 'Sonuç Aktar',  icon: '📥' },
];

const GRADIENTS = {
  orange: 'from-orange-500 to-amber-400',
  green:  'from-emerald-500 to-teal-400',
  red:    'from-rose-500 to-pink-400',
  blue:   'from-blue-500 to-cyan-400',
  purple: 'from-violet-500 to-purple-400',
  amber:  'from-amber-500 to-yellow-400',
};

/* ── Animated counter hook ── */
function useAnimatedValue(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target == null) return;
    const t = Number(target);
    if (isNaN(t)) return;
    let start = 0; const startTime = performance.now();
    const step = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(start + (t - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

export default function CO2Panel({ onSelectVariant }) {
  const ct = useChartTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('fleet');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importDir, setImportDir] = useState('');
  const [fleetEdits, setFleetEdits] = useState({});
  const [savingFleet, setSavingFleet] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.getFleetEmissions());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // File upload handler
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

  // Directory import handler
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-80 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 animate-ping opacity-20" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 animate-spin" style={{animationDuration:'1.5s'}} />
        <div className="absolute inset-4 rounded-full bg-white" />
      </div>
      <span className="text-sm text-slate-400 font-medium animate-pulse">CO₂ verileri yükleniyor...</span>
    </div>
  );

  const fs = data?.fleet_summary;
  const ms = data?.model_summary;
  const vehicles = data?.vehicles || [];

  return (
    <div className="space-y-6">
      {/* ═══ HERO HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 border border-white/10"
      >
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-orange-500/10 animate-pulse"
              style={{
                width: 8 + i * 12, height: 8 + i * 12,
                left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.3}s`, animationDuration: `${2 + i * 0.5}s`,
              }} />
          ))}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500/20 to-transparent blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent blur-2xl" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30">
                🌿
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <span className="text-[8px] font-black text-white">CO₂</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">CO₂ Emisyon Yönetimi</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                VECTO sonuç dosyalarından — <span className="text-orange-400 font-semibold">{fs?.total_vehicles || 0}</span> araç, <span className="text-blue-400 font-semibold">{fs?.total_results || 0}</span> sonuç
              </p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 backdrop-blur-sm border border-white/10">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setViewMode(t.key)}
                className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
                  viewMode === t.key
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                {viewMode === t.key && (
                  <motion.div layoutId="co2tab" className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg shadow-lg shadow-orange-500/25" />
                )}
                <span className="relative z-10">{t.icon}</span>
                <span className="relative z-10">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══ KPI CARDS ═══ */}
      {fs && (
        <div className="grid grid-cols-5 gap-4">
          <HeroKPI label="Filo Ort. CO₂" value={fs.co2_avg} unit="g/km" gradient={GRADIENTS.orange} icon="🏭" delay={0} />
          <HeroKPI label="Min CO₂" value={fs.co2_min} unit="g/km" gradient={GRADIENTS.green} icon="🌱" delay={0.1} />
          <HeroKPI label="Max CO₂" value={fs.co2_max} unit="g/km" gradient={GRADIENTS.red} icon="🔥" delay={0.2} />
          <HeroKPI label="Toplam Araç" value={fs.total_vehicles} unit="VIN" gradient={GRADIENTS.blue} icon="🚌" delay={0.3} isInt />
          <HeroKPI label="Sonuç Sayısı" value={fs.total_results} unit="misyon" gradient={GRADIENTS.purple} icon="📋" delay={0.4} isInt />
        </div>
      )}

      <AnimatePresence mode="wait">
      {/* ═══ FLEET VIEW ═══ */}
      {viewMode === 'fleet' && (
        <motion.div key="fleet" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
        <div className="grid grid-cols-2 gap-6">
          {/* Best & Worst Cards */}
          <div className="space-y-4">
            {fs?.best_vehicle && (
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 p-5">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🏆</span>
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">En Düşük CO₂</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">{fs.best_vehicle.model}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{fs.best_vehicle.vin}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                        {fs.best_vehicle.summary_co2}
                      </div>
                      <div className="text-xs text-slate-400">g/km</div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    {fs.best_vehicle.summary_co2_pkm && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        {fs.best_vehicle.summary_co2_pkm} g/p-km
                      </span>
                    )}
                    {fs.best_vehicle.summary_fc_l_100km && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                        {fs.best_vehicle.summary_fc_l_100km} L/100km
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {fs?.worst_vehicle && (
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-transparent to-pink-500/5 p-5">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-rose-500/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">⚠️</span>
                    <span className="text-xs uppercase tracking-widest text-rose-400 font-bold">En Yüksek CO₂</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">{fs.worst_vehicle.model}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{fs.worst_vehicle.vin}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black bg-gradient-to-r from-rose-400 to-pink-300 bg-clip-text text-transparent">
                        {fs.worst_vehicle.summary_co2}
                      </div>
                      <div className="text-xs text-slate-400">g/km</div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    {fs.worst_vehicle.summary_co2_pkm && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                        {fs.worst_vehicle.summary_co2_pkm} g/p-km
                      </span>
                    )}
                    {fs.worst_vehicle.summary_fc_l_100km && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                        {fs.worst_vehicle.summary_fc_l_100km} L/100km
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Model Bar Chart (Recharts) */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Model Bazlı CO₂ Ortalaması
            </h3>
            {ms?.length > 0 ? (
              <ResponsiveContainer width="100%" height={ms.length * 55 + 20}>
                <BarChart data={ms} layout="vertical" margin={{ left: 60, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} unit=" g/km" />
                  <YAxis type="category" dataKey="model" tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<CO2Tooltip fs={fs} />} />
                  <defs>
                    <linearGradient id="co2bar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="co2_avg" fill="url(#co2bar)" radius={[0, 6, 6, 0]} barSize={24} animationDuration={1200} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState msg="Henüz VECTO sonucu yok" />
            )}
          </motion.div>
        </div>

        {/* CO2 Distribution Mini Visual */}
        {ms?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              CO₂ Dağılım Haritası
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Pie chart for model distribution */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <defs>
                      {ms.map((_, i) => (
                        <linearGradient key={i} id={`pieCo2-${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={['#f97316','#3b82f6','#10b981','#8b5cf6','#f43f5e','#06b6d4','#eab308'][i % 7]} />
                          <stop offset="100%" stopColor={['#fbbf24','#60a5fa','#34d399','#a78bfa','#fb7185','#22d3ee','#fde047'][i % 7]} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie data={ms.map(m => ({ name: m.model, value: m.vehicle_count }))}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value" animationDuration={1200}
                      stroke="none">
                      {ms.map((_, i) => <Cell key={i} fill={`url(#pieCo2-${i})`} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} araç`, n]} contentStyle={ct.tooltip.contentStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend + stats */}
              <div className="flex flex-col justify-center space-y-2">
                {ms.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: ['#f97316','#3b82f6','#10b981','#8b5cf6','#f43f5e','#06b6d4','#eab308'][i % 7] }} />
                    <span className="text-xs text-slate-300 font-medium flex-1">{m.model}</span>
                    <span className="text-xs font-bold text-orange-400">{m.co2_avg} g/km</span>
                    <span className="text-[10px] text-slate-500">{m.vehicle_count} araç</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        </motion.div>
      )}

      {/* ═══ MODEL VIEW ═══ */}
      {viewMode === 'models' && (
        <motion.div key="models" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
          {ms?.length > 0 ? ms.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-5 group hover:border-orange-500/20 transition-all duration-300">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-orange-500/5 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-lg shadow-lg shadow-orange-500/20">
                      🚌
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{m.model}</h4>
                      <span className="text-xs text-slate-400">{m.vehicle_count} araç</span>
                    </div>
                  </div>
                  <div className="flex gap-6 items-end">
                    <MetricBox label="Ort. CO₂" value={m.co2_avg} className="text-orange-400" />
                    <MetricBox label="Min-Max" value={`${m.co2_min} — ${m.co2_max}`} className="text-slate-300" />
                    <MetricBox label="Spread" value={m.co2_spread} className="text-amber-400" />
                  </div>
                </div>
                {/* Gradient range bar */}
                <div className="relative h-4 rounded-full overflow-hidden bg-slate-800/60">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 opacity-25 rounded-full" />
                  <motion.div className="absolute top-0 h-full w-1 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"
                    initial={{ left: '0%' }}
                    animate={{ left: `${((m.co2_avg - (fs?.co2_min || 0)) / ((fs?.co2_max || 1) - (fs?.co2_min || 0))) * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                  <div className="absolute left-0 top-full mt-1 text-[9px] text-emerald-400 font-semibold">{fs?.co2_min}</div>
                  <div className="absolute right-0 top-full mt-1 text-[9px] text-rose-400 font-semibold">{fs?.co2_max}</div>
                </div>
              </div>
            </motion.div>
          )) : <EmptyState msg="Veri yok — VECTO sonuç dosyalarını yükleyin" />}
        </motion.div>
      )}

      {/* ═══ VEHICLE DETAIL VIEW ═══ */}
      {viewMode === 'vehicles' && (
        <motion.div key="vehicles" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
          {/* Fleet Count Save Bar */}
          {Object.keys(fleetEdits).length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <span className="text-xs text-blue-400 font-semibold">✏️ {Object.keys(fleetEdits).length} varyant değiştirildi</span>
              <button onClick={async () => {
                setSavingFleet(true);
                try {
                  const updates = Object.entries(fleetEdits).map(([variant_id, fleet_count]) => ({ variant_id, fleet_count }));
                  await api.updateFleetCounts(updates);
                  setFleetEdits({});
                  await load();
                } catch (e) { console.error(e); }
                setSavingFleet(false);
              }} disabled={savingFleet}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all hover:shadow-blue-500/40">
                {savingFleet ? 'Kaydediliyor...' : '💾 Filo Sayılarını Kaydet'}
              </button>
            </motion.div>
          )}

          {vehicles.length > 0 ? vehicles.map((v, i) => {
            const currentFleet = fleetEdits[v.variant_id] !== undefined ? fleetEdits[v.variant_id] : (v.fleet_count || 0);
            return (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 overflow-hidden group hover:border-blue-500/20 transition-all duration-300">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-base font-bold text-white">{v.model || 'Bilinmeyen Model'}</h4>
                    <span className="text-xs text-slate-400 font-mono">{v.vin}</span>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {v.vehicle_group && <MiniTag text={`Grup: ${v.vehicle_group}`} />}
                      {v.class_bus && <MiniTag text={`Sınıf: ${v.class_bus}`} />}
                      {v.power_kw && <MiniTag text={`${v.power_kw} kW`} />}
                      {v.fuel_type && <MiniTag text={v.fuel_type} />}
                      {v.total_passengers && <MiniTag text={`${v.total_passengers} yolcu`} />}
                    </div>
                  </div>
                  <div className="flex gap-5 items-end">
                    {v.variant_id && (
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 uppercase mb-1 font-semibold tracking-wide">Filo</div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setFleetEdits(prev => ({ ...prev, [v.variant_id]: Math.max(0, currentFleet - 1) }))}
                            className="w-7 h-7 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-bold flex items-center justify-center transition-colors">−</button>
                          <span className="w-10 text-center text-lg font-black text-blue-400">{currentFleet}</span>
                          <button onClick={() => setFleetEdits(prev => ({ ...prev, [v.variant_id]: currentFleet + 1 }))}
                            className="w-7 h-7 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-bold flex items-center justify-center transition-colors">+</button>
                        </div>
                      </div>
                    )}
                    {v.summary_co2 && (
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold tracking-wide">CO₂</div>
                        <div className="text-2xl font-black bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">{v.summary_co2}</div>
                        <div className="text-[9px] text-slate-500">g/km</div>
                      </div>
                    )}
                    {v.summary_co2_pkm && (
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold tracking-wide">CO₂/Yolcu</div>
                        <div className="text-lg font-bold text-emerald-400">{v.summary_co2_pkm}</div>
                        <div className="text-[9px] text-slate-500">g/p-km</div>
                      </div>
                    )}
                    {v.summary_fc_l_100km && (
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold tracking-wide">Yakıt</div>
                        <div className="text-lg font-bold text-blue-400">{v.summary_fc_l_100km}</div>
                        <div className="text-[9px] text-slate-500">L/100km</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mission breakdown */}
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/5">
                        {['Misyon','Yük','Durum','Yolcu','Y.Küt.(kg)','A.Küt.(kg)','Hız(km/h)','Yakıt Tipi',
                          'g/km','g/p-km','MJ/km','MJ/p-km','L/100km','L/p-km','CO₂ g/km','CO₂ g/p-km'].map((h,hi)=>(
                          <th key={hi} className="px-1.5 py-1.5 text-left font-bold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {v.missions?.map((m, j) => (
                        <tr key={j} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                          <td className="px-1.5 py-1.5 font-semibold text-white">{m.mission}</td>
                          <td className="px-1.5 py-1.5 text-slate-400">{m.loading}</td>
                          <td className="px-1.5 py-1.5 text-emerald-400 font-medium">{m.status || '—'}</td>
                          <td className="px-1.5 py-1.5 text-slate-400">{m.passengers ?? '—'}</td>
                          <td className="px-1.5 py-1.5 text-slate-400">{m.mass_passengers_kg ?? '—'}</td>
                          <td className="px-1.5 py-1.5 text-slate-400">{m.total_mass_kg ?? '—'}</td>
                          <td className="px-1.5 py-1.5 text-slate-400">{m.avg_speed ?? '—'}</td>
                          <td className="px-1.5 py-1.5 text-slate-400">{m.fuel_type || '—'}</td>
                          <td className="px-1.5 py-1.5 font-semibold text-amber-400">{m.fc_g_km?.toFixed(1) ?? '—'}</td>
                          <td className="px-1.5 py-1.5 text-amber-400/70">{m.fc_g_pkm?.toFixed(3) ?? '—'}</td>
                          <td className="px-1.5 py-1.5 text-amber-400/70">{m.fc_mj_km?.toFixed(2) ?? '—'}</td>
                          <td className="px-1.5 py-1.5 text-amber-400/70">{m.fc_mj_pkm?.toFixed(4) ?? '—'}</td>
                          <td className="px-1.5 py-1.5 font-semibold text-blue-400">{m.fc_l_100km?.toFixed(2) ?? '—'}</td>
                          <td className="px-1.5 py-1.5 text-blue-400/70">{m.fc_l_pkm?.toFixed(5) ?? '—'}</td>
                          <td className="px-1.5 py-1.5 font-bold text-orange-400">{m.co2_g_km?.toFixed(1) ?? '—'}</td>
                          <td className="px-1.5 py-1.5 font-semibold text-emerald-400">{m.co2_g_pkm?.toFixed(2) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          );
          }) : (
            <EmptyState msg="Henüz VECTO Sonucu Yok" sub="VECTO sonuç dosyalarını (RSLT_CUSTOMER veya RSLT_MANUFACTURER XML) yükleyin" action={() => setViewMode('import')} actionLabel="Sonuç Aktar" />
          )}
        </motion.div>
      )}

      {/* ═══ IMPORT VIEW ═══ */}
      {viewMode === 'import' && (
        <motion.div key="import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
          {/* File Upload */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-lg shadow-lg shadow-blue-500/20">📄</div>
              <div>
                <h3 className="text-sm font-bold text-white">VECTO Sonuç Dosyası Yükle</h3>
                <p className="text-xs text-slate-400">RSLT_CUSTOMER veya RSLT_MANUFACTURER XML dosyalarını seçin</p>
              </div>
            </div>
            <label className="block">
              <input type="file" accept=".xml" multiple onChange={handleFileUpload} disabled={importing}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gradient-to-r file:from-blue-500 file:to-cyan-500 file:text-white file:cursor-pointer file:shadow-lg file:shadow-blue-500/25 hover:file:shadow-blue-500/40 file:transition-all" />
            </label>
          </div>

          {/* Directory Import */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center text-lg shadow-lg shadow-violet-500/20">📁</div>
              <div>
                <h3 className="text-sm font-bold text-white">Klasörden Toplu Aktar</h3>
                <p className="text-xs text-slate-400">VECTO sonuç dosyalarının bulunduğu klasör yolunu girin</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input type="text" value={importDir} onChange={e => setImportDir(e.target.value)}
                placeholder="C:\Vecto\Results veya \\server\share\results"
                className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" />
              <button onClick={handleDirImport} disabled={importing || !importDir}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/25 disabled:opacity-50 transition-all hover:shadow-violet-500/40">
                {importing ? 'Aktarılıyor...' : '🚀 Aktar'}
              </button>
            </div>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-lg">📋</span> Aktarım Sonucu
              </h3>
              <div className="space-y-2">
                {importResult.map((r, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${r.status === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                    {r.file && <div className="text-xs font-mono text-white">{r.file}</div>}
                    {r.vin && <div className="text-[11px] text-slate-400">VIN: {r.vin} — {r.model}</div>}
                    {r.results_imported != null && <div className="text-[11px] text-emerald-400 font-medium">✅ {r.results_imported} sonuç aktarıldı</div>}
                    {r.summary_co2 && <div className="text-[11px] text-orange-400 font-medium">🏭 Özet CO₂: {r.summary_co2} g/km</div>}
                    {r.files_processed != null && <div className="text-[11px] text-slate-400">📁 {r.files_processed} dosya işlendi, {r.results_imported} sonuç aktarıldı</div>}
                    {r.error && <div className="text-[11px] text-rose-400">❌ {r.error}</div>}
                    {r.errors?.length > 0 && r.errors.map((e, j) => (
                      <div key={j} className="text-[10px] text-rose-400">⚠️ {e.file}: {e.error}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Importing spinner */}
          {importing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-blue-400 font-medium">VECTO sonuçları aktarılıyor...</span>
            </motion.div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

/* ── Helper Components ── */

function HeroKPI({ label, value, unit, gradient, icon, delay, isInt }) {
  const anim = useAnimatedValue(value, 1000);
  const display = value == null ? '—' : isInt ? Math.round(anim) : anim.toFixed(1);
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-4 text-center hover:border-white/20 transition-all duration-300">
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity blur-xl`} />
      <div className="relative z-10">
        <span className="text-xl">{icon}</span>
        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">{label}</div>
        <div className={`text-2xl font-black mt-1 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{display}</div>
        <div className="text-[10px] text-slate-500 font-medium">{unit}</div>
      </div>
    </motion.div>
  );
}

function CO2Tooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl">
      <div className="text-xs font-bold text-white mb-1">{d.model}</div>
      <div className="text-[11px] text-orange-400 font-semibold">{d.co2_avg} g/km</div>
      <div className="text-[10px] text-slate-400">{d.vehicle_count} araç &middot; {d.co2_min}–{d.co2_max}</div>
    </div>
  );
}

function EmptyState({ msg, sub, action, actionLabel }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-10 text-center">
      <div className="text-4xl mb-3 opacity-40">📭</div>
      <div className="text-slate-400 text-sm font-semibold">{msg}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      {action && (
        <button onClick={action} className="mt-4 px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function MetricBox({ label, value, className }) {
  return (
    <div className="text-center">
      <div className="text-[9px] text-slate-500 uppercase font-semibold tracking-wide">{label}</div>
      <div className={`text-lg font-bold ${className}`}>{value}</div>
    </div>
  );
}

function MiniTag({ text }) {
  return <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-slate-400 font-medium border border-white/10">{text}</span>;
}
