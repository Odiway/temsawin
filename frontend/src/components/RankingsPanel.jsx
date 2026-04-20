import { useState, useEffect } from 'react';
import { api } from '../api';
import { useChartTheme } from './ThemeContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';

const METRICS = [
  { key: 'overall', label: 'Genel Skor', icon: '' },
  { key: 'power_to_weight', label: 'Guc/Agirlik', icon: '' },
  { key: 'torque_density', label: 'Tork Yogunlugu', icon: '' },
  { key: 'efficiency', label: 'Yakit Verimliligi', icon: '' },
];

const CATEGORIES = [
  { key: '', label: 'Tumu' },
  { key: 'coach', label: 'Coach' },
  { key: 'city', label: 'City' },
  { key: 'diesel', label: 'Diesel' },
];

const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#06b6d4', '#8b5cf6', '#f43f5e', '#eab308'];

export default function RankingsPanel({ onSelectVariant }) {
  const ct = useChartTheme();
  const [rankings, setRankings] = useState(null);
  const [metric, setMetric] = useState('overall');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getRankings(metric, category || null)
      .then(setRankings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [metric, category]);

  const topItems = rankings?.rankings?.slice(0, 10) || [];
  const allItems = rankings?.rankings || [];

  // Radar data for top 5
  const radarData = topItems.slice(0, 5).map(v => ({
    name: `${v.model_name} (${v.variant_code.slice(0, 8)})`,
    power: v.metrics.power_kw || 0,
    torque: v.metrics.torque_nm || 0,
    efficiency: v.scores.efficiency_score ? Math.round(1 / v.scores.efficiency_score * 100) : 0,
    ptw: v.scores.power_to_weight || 0,
    td: v.scores.torque_density || 0,
  }));

  // Scatter data: power vs torque, size = overall score
  const scatterData = allItems.map(v => ({
    x: v.metrics.power_kw || 0,
    y: v.metrics.torque_nm || 0,
    z: v.scores.overall || 1,
    name: v.model_name,
    code: v.variant_code,
    id: v.variant_id,
    category: v.category,
  }));

  // Bar chart data for top 10
  const barData = topItems.map((v, i) => ({
    name: `${v.model_name.substring(0, 10)} ${v.variant_code.substring(0, 6)}`,
    score: v.scores[metric] || v.scores.overall || 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
    id: v.variant_id,
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-[#e6edf3]">Varyant Siralamalari</h2>
        <p className="text-xs text-[#8b949e]">Performans metriklerine gore en iyi varyantlar</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-[#0f1419] border border-[#21262d] rounded-md p-0.5">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                metric === m.key ? 'bg-[#3b82f6]/15 text-[#3b82f6] font-bold' : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-[#0f1419] border border-[#21262d] rounded-md p-0.5">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                category === c.key ? 'bg-[#3fb950]/15 text-[#3fb950]' : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Podium - Top 3 */}
          <div className="grid grid-cols-3 gap-3">
            {topItems.slice(0, 3).map((v, i) => (
              <div key={v.variant_id}
                onClick={() => onSelectVariant(v.variant_id)}
                className={`g-panel cursor-pointer hover:border-slate-600 transition ${i === 0 ? 'ring-1 ring-amber-500/30' : ''}`}>
                <div className="g-panel-body text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-black"
                    style={{ background: `${MEDAL_COLORS[i]}20`, color: MEDAL_COLORS[i] }}>
                    {i + 1}
                  </div>
                  <div className="text-sm font-bold text-slate-200">{v.model_name}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{v.variant_code.substring(0, 20)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{v.fingerprint}</div>
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {v.tags?.filter(t => ['power_class', 'gearbox', 'axle_class'].includes(t.key)).map((t, j) => (
                      <span key={j} className={`tag bg-${t.color}-500/15 text-${t.color}-400 border border-${t.color}-500/20`}>{t.value}</span>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-slate-600">Güç</span><br/><b className="text-slate-300">{v.metrics.power_kw} kW</b></div>
                    <div><span className="text-slate-600">Tork</span><br/><b className="text-slate-300">{v.metrics.torque_nm} Nm</b></div>
                    <div><span className="text-slate-600">Verimlilik</span><br/><b className="text-slate-300">{v.scores.efficiency_score?.toFixed(3) || '—'}</b></div>
                    <div><span className="text-slate-600">Skor</span><br/><b className="text-blue-400 text-sm">{v.scores.overall}</b></div>
                  </div>
                  {v.fuel_stats?.avg_consumption && (
                    <div className="mt-2 text-[10px] text-slate-500">
                      Ort. Yakıt: <b className="text-amber-400">{v.fuel_stats.avg_consumption} g/h</b>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-12 gap-3">
            {/* Score bar chart */}
            <div className="col-span-6 g-panel">
              <div className="g-panel-header">
                <span className="g-panel-title">Top 10 — {METRICS.find(m => m.key === metric)?.label}</span>
              </div>
              <div className="g-panel-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.isDark ? '#1e293b' : '#e2e8f0'} />
                    <XAxis type="number" stroke={ct.isDark ? '#64748b' : '#94a3b8'} fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke={ct.isDark ? '#64748b' : '#94a3b8'} fontSize={9} width={110} />
                    <Tooltip contentStyle={ct.tooltip.contentStyle} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Power vs Torque scatter */}
            <div className="col-span-6 g-panel">
              <div className="g-panel-header">
                <span className="g-panel-title">Güç vs Tork Dağılımı</span>
              </div>
              <div className="g-panel-body">
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.isDark ? '#1e293b' : '#e2e8f0'} />
                    <XAxis dataKey="x" name="Güç (kW)" stroke={ct.isDark ? '#64748b' : '#94a3b8'} fontSize={10} />
                    <YAxis dataKey="y" name="Tork (Nm)" stroke={ct.isDark ? '#64748b' : '#94a3b8'} fontSize={10} />
                    <ZAxis dataKey="z" range={[30, 200]} />
                    <Tooltip
                      contentStyle={ct.tooltip.contentStyle}
                      formatter={(val, name) => [val, name === 'x' ? 'kW' : name === 'y' ? 'Nm' : 'Skor']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                    />
                    <Scatter data={scatterData} onClick={(d) => onSelectVariant(d.id)}>
                      {scatterData.map((d, i) => (
                        <Cell key={i} fill={
                          d.category === 'coach' ? '#6366f1' :
                          d.category === 'city' ? '#14b8a6' : '#f59e0b'
                        } cursor="pointer" />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full ranking table */}
          <div className="g-panel">
            <div className="g-panel-header">
              <span className="g-panel-title">Tam Sıralama ({allItems.length} varyant)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800/40">
                    <th className="px-3 py-2 w-10">#</th>
                    <th className="py-2">Model</th>
                    <th className="py-2">Tanımlama</th>
                    <th className="py-2 text-right">Güç (kW)</th>
                    <th className="py-2 text-right">Tork (Nm)</th>
                    <th className="py-2 text-right">GVW (kg)</th>
                    <th className="py-2 text-right">Güç/Ağırlık</th>
                    <th className="py-2 text-right">Tork Yoğ.</th>
                    <th className="py-2 text-right">Verimlilik</th>
                    <th className="py-2 text-right">Ort. Yakıt</th>
                    <th className="py-2 text-right">Genel</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  {allItems.map((v, i) => (
                    <tr key={v.variant_id} onClick={() => onSelectVariant(v.variant_id)}
                      className="border-b border-slate-800/20 hover:bg-slate-800/20 cursor-pointer transition">
                      <td className="px-3 py-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          i < 3 ? `bg-[${MEDAL_COLORS[i]}]/20 text-[${MEDAL_COLORS[i]}]` : 'bg-slate-800 text-slate-500'
                        }`} style={i < 3 ? { background: `${MEDAL_COLORS[i]}20`, color: MEDAL_COLORS[i] } : {}}>
                          {v.rank || i + 1}
                        </span>
                      </td>
                      <td className="py-2 font-bold text-slate-200">{v.model_name}</td>
                      <td className="py-2">
                        <div className="text-[10px] text-slate-500">{v.fingerprint}</div>
                        <div className="flex gap-0.5 mt-0.5">
                          {v.tags?.filter(t => ['power_class', 'gearbox', 'transmission'].includes(t.key)).slice(0, 3).map((t, j) => (
                            <span key={j} className={`inline-block px-1 py-0 rounded text-[8px] font-bold bg-${t.color}-500/15 text-${t.color}-400`}>
                              {t.value}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono">{v.metrics.power_kw || '—'}</td>
                      <td className="py-2 text-right font-mono">{v.metrics.torque_nm || '—'}</td>
                      <td className="py-2 text-right font-mono">{v.metrics.max_laden_mass_kg || '—'}</td>
                      <td className="py-2 text-right font-mono">{v.scores.power_to_weight?.toFixed(2) || '—'}</td>
                      <td className="py-2 text-right font-mono">{v.scores.torque_density?.toFixed(1) || '—'}</td>
                      <td className="py-2 text-right font-mono">{v.scores.efficiency_score?.toFixed(4) || '—'}</td>
                      <td className="py-2 text-right">{v.fuel_stats?.avg_consumption || '—'}</td>
                      <td className="py-2 text-right font-bold text-blue-400">{v.scores.overall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
