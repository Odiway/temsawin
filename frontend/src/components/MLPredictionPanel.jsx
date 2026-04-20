import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart, Area,
  Cell, ReferenceLine,
} from 'recharts';
import { useChartTheme } from './ThemeContext';
import { api } from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const MISSION_COLORS = {
  Coach: '#3b82f6',
  HeavyUrban: '#ef4444',
  Interurban: '#10b981',
  Suburban: '#f59e0b',
  Urban: '#8b5cf6',
};

const TABS = [
  { key: 'predict', label: 'Hızlı Tahmin', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { key: 'compare', label: 'Senaryo Karşılaştırma', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'sweep', label: 'Hassasiyet Analizi', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
];

const PARAM_CONFIG = [
  { key: 'total_mass_kg', label: 'Toplam Kütle', unit: 'kg', min: 8000, max: 30000, step: 100, default: 18000 },
  { key: 'avg_speed_kmh', label: 'Ortalama Hız', unit: 'km/h', min: 5, max: 120, step: 1, default: 45 },
  { key: 'cdxa', label: 'CdxA', unit: 'm²', min: 2, max: 10, step: 0.1, default: 5.5 },
  { key: 'total_rrc', label: 'Yuvarlanma Direnci', unit: 'RRC', min: 0.003, max: 0.012, step: 0.0005, default: 0.0065 },
  { key: 'engine_power_kw', label: 'Motor Gücü', unit: 'kW', min: 100, max: 400, step: 10, default: 240 },
];

const MISSIONS = ['Coach', 'HeavyUrban', 'Interurban', 'Suburban', 'Urban'];

// ─── Shared UI ───────────────────────────────────────────────────
function ErrorBox({ msg }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      {msg}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-slate-900/50 p-5 ${className}`}>
      {children}
    </div>
  );
}

function ParamForm({ form, setForm, compact = false }) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      {PARAM_CONFIG.map(f => (
        <div key={f.key}>
          <label className="block text-xs text-slate-400 mb-1">
            {f.label} <span className="text-slate-600">({f.unit})</span>
          </label>
          <input
            type="number"
            min={f.min}
            max={f.max}
            step={f.step}
            value={form[f.key]}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="range"
            min={f.min}
            max={f.max}
            step={f.step}
            value={form[f.key]}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) }))}
            className="w-full mt-1 accent-blue-500"
          />
        </div>
      ))}
    </div>
  );
}

// ─── 1. Hızlı Tahmin — Predict all missions at once ─────────────
function QuickPredict() {
  const chartTheme = useChartTheme();
  const [form, setForm] = useState(
    Object.fromEntries(PARAM_CONFIG.map(p => [p.key, p.default]))
  );
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.mlPredictAllMissions(form);
      setResults(res.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tooltipStyle = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Araç Parametreleri</h3>
          <button
            onClick={handlePredict}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            Tüm Misyonlar İçin Tahmin Et
          </button>
        </div>
        <ParamForm form={form} setForm={setForm} />
      </Card>

      {error && <ErrorBox msg={error} />}

      {results && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Results table */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Misyon Bazlı Tahminler</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs">Misyon</th>
                    <th className="text-right py-2 px-3 text-blue-400 font-medium text-xs">FC (g/km)</th>
                    <th className="text-right py-2 px-3 text-purple-400 font-medium text-xs">CO₂ (g/km)</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">FC (L/100km)</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">CO₂ Sınıf</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const fcL100 = (r.rf_fc / 832 * 100).toFixed(1);
                    const co2Class = r.rf_co2 < 800 ? 'A' : r.rf_co2 < 1000 ? 'B' : r.rf_co2 < 1200 ? 'C' : r.rf_co2 < 1500 ? 'D' : 'E';
                    const classColor = { A: '#10b981', B: '#84cc16', C: '#f59e0b', D: '#f97316', E: '#ef4444' }[co2Class];
                    return (
                      <tr key={r.mission} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: MISSION_COLORS[r.mission] || COLORS[i] }} />
                            <span className="text-white font-medium">{r.mission}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-blue-300 font-medium">{r.rf_fc}</td>
                        <td className="py-3 px-3 text-right font-mono text-purple-300 font-medium">{r.rf_co2}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">{fcL100}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: classColor + '20', color: classColor }}>{co2Class}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <h4 className="text-sm font-semibold text-white mb-4">Yakıt Tüketimi — Misyon Karşılaştırması</h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={results} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="mission" tick={{ fill: chartTheme.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} label={{ value: 'g/km', angle: -90, position: 'insideLeft', fill: chartTheme.text, fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="rf_fc" name="FC (g/km)" radius={[6, 6, 0, 0]}>
                    {results.map((r, i) => (
                      <Cell key={i} fill={MISSION_COLORS[r.mission] || COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h4 className="text-sm font-semibold text-white mb-4">CO₂ Emisyonu — Misyon Karşılaştırması</h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={results} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="mission" tick={{ fill: chartTheme.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} label={{ value: 'g/km', angle: -90, position: 'insideLeft', fill: chartTheme.text, fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="rf_co2" name="CO₂ (g/km)" radius={[6, 6, 0, 0]}>
                    {results.map((r, i) => (
                      <Cell key={i} fill={MISSION_COLORS[r.mission] || COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Summary insight */}
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(() => {
                const best = results.reduce((a, b) => a.rf_fc < b.rf_fc ? a : b);
                const worst = results.reduce((a, b) => a.rf_fc > b.rf_fc ? a : b);
                const avg = (results.reduce((s, r) => s + r.rf_fc, 0) / results.length).toFixed(1);
                const spread = (worst.rf_fc - best.rf_fc).toFixed(1);
                return [
                  { label: 'En Verimli', value: best.mission, sub: `${best.rf_fc} g/km`, color: '#10b981' },
                  { label: 'En Yüksek Tüketim', value: worst.mission, sub: `${worst.rf_fc} g/km`, color: '#ef4444' },
                  { label: 'Ortalama FC', value: avg, sub: 'g/km', color: '#3b82f6' },
                  { label: 'Misyon Farkı', value: spread, sub: 'g/km Δ', color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-xs text-slate-400">{s.label}</p>
                    <p className="text-lg font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-slate-500">{s.sub}</p>
                  </div>
                ));
              })()}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ─── 2. Senaryo Karşılaştırma ───────────────────────────────────
function ScenarioCompare() {
  const chartTheme = useChartTheme();
  const [form, setForm] = useState(
    Object.fromEntries(PARAM_CONFIG.map(p => [p.key, p.default]))
  );
  const [mission, setMission] = useState('Urban');
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const nextId = useRef(1);

  const addScenario = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.mlPredict({ ...form, mission });
      const scenario = {
        id: nextId.current++,
        name: `S${nextId.current - 1}`,
        params: { ...form, mission },
        rf_fc: res.random_forest.fc_g_km,
        rf_co2: res.random_forest.co2_g_km,
      };
      setScenarios(prev => [...prev, scenario]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const removeScenario = (id) => setScenarios(prev => prev.filter(s => s.id !== id));
  const clearAll = () => { setScenarios([]); nextId.current = 1; };

  const tooltipStyle = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' };

  const chartData = scenarios.map(s => ({
    name: s.name,
    fc: s.rf_fc,
    co2: s.rf_co2,
  }));

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Yeni Senaryo Ekle</h3>
          <div className="flex gap-2">
            <select
              value={mission}
              onChange={e => setMission(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm"
            >
              {MISSIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              onClick={addScenario}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              )}
              Senaryo Ekle
            </button>
          </div>
        </div>
        <ParamForm form={form} setForm={setForm} compact />
      </Card>

      {error && <ErrorBox msg={error} />}

      {scenarios.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Scenarios table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Senaryolar ({scenarios.length})</h3>
              <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 transition-colors">Tümünü Temizle</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-2 text-slate-400 font-medium text-xs">#</th>
                    <th className="text-left py-2 px-2 text-slate-400 font-medium text-xs">Misyon</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium text-xs">Kütle</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium text-xs">Hız</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium text-xs">CdxA</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium text-xs">RRC</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium text-xs">Güç</th>
                    <th className="text-right py-2 px-2 text-blue-400 font-medium text-xs">FC (g/km)</th>
                    <th className="text-right py-2 px-2 text-purple-400 font-medium text-xs">CO₂ (g/km)</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium text-xs">L/100km</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s, i) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: COLORS[i % COLORS.length] }}>
                          {s.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-white text-xs">{s.params.mission}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-300">{s.params.total_mass_kg}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-300">{s.params.avg_speed_kmh}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-300">{s.params.cdxa}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-300">{s.params.total_rrc}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-300">{s.params.engine_power_kw}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-medium text-blue-300">{s.rf_fc}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-medium text-purple-300">{s.rf_co2}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-300">{((s.rf_fc / 832) * 100).toFixed(1)}</td>
                      <td className="py-2.5 px-2 text-right">
                        <button onClick={() => removeScenario(s.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {scenarios.length >= 2 && (() => {
              const best = scenarios.reduce((a, b) => a.rf_fc < b.rf_fc ? a : b);
              return (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xs text-emerald-400">
                    En verimli senaryo: <strong>{best.name}</strong> ({best.params.mission}) — {best.rf_fc} g/km FC, {best.rf_co2} g/km CO₂
                  </p>
                </div>
              );
            })()}
          </Card>

          {/* Comparison charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <h4 className="text-sm font-semibold text-white mb-4">FC Karşılaştırması (g/km)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="name" tick={{ fill: chartTheme.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="fc" name="FC (g/km)" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h4 className="text-sm font-semibold text-white mb-4">CO₂ Karşılaştırması (g/km)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="name" tick={{ fill: chartTheme.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="co2" name="CO₂ (g/km)" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </motion.div>
      )}

      {scenarios.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <p className="text-sm text-slate-400">Parametreleri ayarlayıp "Senaryo Ekle" butonuna basarak farklı konfigürasyonları karşılaştırın.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── 3. Hassasiyet Analizi (Parameter Sweep) ─────────────────────
function SensitivitySweep() {
  const chartTheme = useChartTheme();
  const [form, setForm] = useState(
    Object.fromEntries(PARAM_CONFIG.map(p => [p.key, p.default]))
  );
  const [mission, setMission] = useState('Urban');
  const [sweepParam, setSweepParam] = useState('total_mass_kg');
  const [sweepData, setSweepData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sweepConfig = PARAM_CONFIG.find(p => p.key === sweepParam);

  const handleSweep = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.mlSweep({
        ...form,
        mission,
        sweep_param: sweepParam,
        sweep_min: sweepConfig.min,
        sweep_max: sweepConfig.max,
        sweep_steps: 25,
      });
      setSweepData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tooltipStyle = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Baz Parametreler</h3>
          <div className="flex gap-2 flex-wrap">
            <select
              value={mission}
              onChange={e => setMission(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm"
            >
              {MISSIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              onClick={handleSweep}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" /></svg>
              )}
              Analiz Et
            </button>
          </div>
        </div>
        <ParamForm form={form} setForm={setForm} compact />
      </Card>

      {/* Sweep parameter selector */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">Taranacak Parametre</h3>
        <div className="flex gap-2 flex-wrap">
          {PARAM_CONFIG.map(p => (
            <button
              key={p.key}
              onClick={() => setSweepParam(p.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${sweepParam === p.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
            >
              {p.label} ({p.unit})
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {sweepConfig.label}: {sweepConfig.min} → {sweepConfig.max} {sweepConfig.unit} aralığında taranacak (25 nokta)
        </p>
      </Card>

      {error && <ErrorBox msg={error} />}

      {sweepData && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* FC sweep curve */}
          <Card>
            <h4 className="text-sm font-semibold text-white mb-4">
              Yakıt Tüketimi vs {sweepConfig.label} ({mission})
            </h4>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={sweepData.results}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis
                  dataKey="x"
                  tick={{ fill: chartTheme.text, fontSize: 11 }}
                  label={{ value: `${sweepConfig.label} (${sweepConfig.unit})`, position: 'insideBottom', offset: -5, fill: chartTheme.text, fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: chartTheme.text, fontSize: 11 }}
                  label={{ value: 'FC (g/km)', angle: -90, position: 'insideLeft', fill: chartTheme.text, fontSize: 10 }}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n === 'rf_fc' ? 'Random Forest' : 'Linear Regression']} />
                <Legend formatter={v => v === 'rf_fc' ? 'Random Forest' : 'Linear Regression'} />
                <ReferenceLine x={form[sweepParam]} stroke="#fff" strokeDasharray="5 5" label={{ value: 'Mevcut', fill: '#fff', fontSize: 10 }} />
                <Area type="monotone" dataKey="rf_fc" fill="#3b82f6" fillOpacity={0.1} stroke="none" />
                <Line type="monotone" dataKey="rf_fc" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="lr_fc" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* CO2 sweep curve */}
          <Card>
            <h4 className="text-sm font-semibold text-white mb-4">
              CO₂ Emisyonu vs {sweepConfig.label} ({mission})
            </h4>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={sweepData.results}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis
                  dataKey="x"
                  tick={{ fill: chartTheme.text, fontSize: 11 }}
                  label={{ value: `${sweepConfig.label} (${sweepConfig.unit})`, position: 'insideBottom', offset: -5, fill: chartTheme.text, fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: chartTheme.text, fontSize: 11 }}
                  label={{ value: 'CO₂ (g/km)', angle: -90, position: 'insideLeft', fill: chartTheme.text, fontSize: 10 }}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n === 'rf_co2' ? 'Random Forest' : 'Linear Regression']} />
                <Legend formatter={v => v === 'rf_co2' ? 'Random Forest' : 'Linear Regression'} />
                <ReferenceLine x={form[sweepParam]} stroke="#fff" strokeDasharray="5 5" label={{ value: 'Mevcut', fill: '#fff', fontSize: 10 }} />
                <Area type="monotone" dataKey="rf_co2" fill="#8b5cf6" fillOpacity={0.1} stroke="none" />
                <Line type="monotone" dataKey="rf_co2" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="lr_co2" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Sensitivity summary */}
          <Card>
            <h4 className="text-sm font-semibold text-white mb-3">Hassasiyet Özeti</h4>
            {(() => {
              const d = sweepData.results;
              const first = d[0], last = d[d.length - 1];
              const fcDelta = (last.rf_fc - first.rf_fc).toFixed(1);
              const co2Delta = (last.rf_co2 - first.rf_co2).toFixed(1);
              const fcPct = (((last.rf_fc - first.rf_fc) / first.rf_fc) * 100).toFixed(1);
              const co2Pct = (((last.rf_co2 - first.rf_co2) / first.rf_co2) * 100).toFixed(1);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400">{sweepConfig.label} Aralığı</p>
                    <p className="text-sm font-mono text-white mt-1">{first.x} → {last.x}</p>
                    <p className="text-xs text-slate-500">{sweepConfig.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">FC Değişimi</p>
                    <p className={`text-sm font-mono mt-1 font-bold ${+fcDelta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {+fcDelta > 0 ? '+' : ''}{fcDelta} g/km
                    </p>
                    <p className="text-xs text-slate-500">{+fcPct > 0 ? '+' : ''}{fcPct}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">CO₂ Değişimi</p>
                    <p className={`text-sm font-mono mt-1 font-bold ${+co2Delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {+co2Delta > 0 ? '+' : ''}{co2Delta} g/km
                    </p>
                    <p className="text-xs text-slate-500">{+co2Pct > 0 ? '+' : ''}{co2Pct}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">FC Eğim</p>
                    <p className="text-sm font-mono text-white mt-1">
                      {(+fcDelta / (last.x - first.x)).toFixed(4)}
                    </p>
                    <p className="text-xs text-slate-500">g/km per {sweepConfig.unit}</p>
                  </div>
                </div>
              );
            })()}
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────
export default function MLPredictionPanel() {
  const [tab, setTab] = useState('predict');
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const status = await api.getMlStatus();
        if (status.is_trained) {
          setReady(true);
        } else {
          await api.trainMlModel();
          setReady(true);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  if (initializing) {
    return (
      <div className="space-y-5">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">ML modeli hazırlanıyor...</p>
          <p className="text-xs text-slate-500">770 VECTO simülasyonu verisi üzerinde eğitim yapılıyor</p>
        </div>
      </div>
    );
  }

  if (error || !ready) {
    return (
      <div className="space-y-5">
        <Header />
        <ErrorBox msg={error || 'Model eğitimi başarısız oldu.'} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header />

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${tab === t.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} /></svg>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'predict' && <QuickPredict />}
          {tab === 'compare' && <ScenarioCompare />}
          {tab === 'sweep' && <SensitivitySweep />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">FC / CO₂ Regresyon Aracı</h2>
        <p className="text-xs text-slate-400">Araç parametrelerinden yakıt tüketimi ve emisyon tahmini — VECTO Surrogate ML</p>
      </div>
    </div>
  );
}
