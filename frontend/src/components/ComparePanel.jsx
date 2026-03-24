import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ComparePanel({ variantIds, onClear, onSelectVariant }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('specs');

  useEffect(() => {
    if (variantIds.length < 2) return;
    setLoading(true);
    api.getDetailedComparison(variantIds)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [variantIds]);

  if (variantIds.length < 2) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">⇔</div>
        <h2 className="text-lg font-bold text-slate-300 mb-2">Karşılaştırma Paneli</h2>
        <p className="text-sm text-slate-500">Varyant listesinden en az 2 varyant seçin.</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const variants = data.variants || [];
  const insights = data.insights || [];

  // Normalize for radar chart
  const radarKeys = ['power_kw', 'torque_nm', 'displacement_cc', 'max_laden_mass_kg', 'gear_count'];
  const radarLabels = { power_kw: 'Güç', torque_nm: 'Tork', displacement_cc: 'Hacim', max_laden_mass_kg: 'GVW', gear_count: 'Vites' };
  const maxVals = {};
  radarKeys.forEach(k => {
    maxVals[k] = Math.max(...variants.map(v => v.specs[k] || 0), 1);
  });
  const radarData = radarKeys.map(k => {
    const point = { metric: radarLabels[k] };
    variants.forEach((v, i) => {
      point[`v${i}`] = v.specs[k] ? Math.round((v.specs[k] / maxVals[k]) * 100) : 0;
    });
    return point;
  });

  // Spec comparison rows
  const specRows = [
    { label: 'Motor', key: 'engine' },
    { label: 'Güç (kW)', key: 'power_kw', unit: 'kW', best: 'max' },
    { label: 'Güç (HP)', key: 'power_hp', unit: 'HP', best: 'max' },
    { label: 'Tork (Nm)', key: 'torque_nm', unit: 'Nm', best: 'max' },
    { label: 'Hacim', key: 'displacement_cc', unit: 'cc' },
    { label: 'GVW', key: 'max_laden_mass_kg', unit: 'kg' },
    { label: 'Nominal Devir', key: 'rated_speed_rpm', unit: 'rpm' },
    { label: 'Rölanti', key: 'idling_speed_rpm', unit: 'rpm' },
    { label: 'Şanzıman', key: 'gearbox' },
    { label: 'Şanzıman Üretici', key: 'gearbox_mfg' },
    { label: 'Vites Sayısı', key: 'gear_count', best: 'max' },
    { label: 'Aks Oranı', key: 'axle_ratio' },
    { label: 'Aks Tipi', key: 'axle_type' },
    { label: 'Lastik', key: 'tyre' },
    { label: 'Yakıt Tipi', key: 'fuel_type' },
  ];

  const fuelRows = [
    { label: 'Ort. Yakıt (g/h)', fn: v => v.fuel_stats.avg, best: 'min' },
    { label: 'Min Yakıt (g/h)', fn: v => v.fuel_stats.min, best: 'min' },
    { label: 'Max Yakıt (g/h)', fn: v => v.fuel_stats.max },
    { label: 'Veri Noktası', fn: v => v.fuel_stats.points },
    { label: 'Tepe Tork (Nm)', fn: v => v.torque_stats.peak_torque, best: 'max' },
  ];

  function isBest(values, idx, mode) {
    if (!mode || values[idx] == null) return false;
    const valid = values.filter(v => v != null);
    if (valid.length < 2) return false;
    return mode === 'max' ? values[idx] >= Math.max(...valid) : values[idx] <= Math.min(...valid);
  }

  function isDiff(values) {
    const valid = values.filter(v => v != null && v !== '—');
    return new Set(valid).size > 1;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Varyant Karşılaştırma</h2>
          <p className="text-xs text-slate-500">{variants.length} varyant karşılaştırılıyor</p>
        </div>
        <button onClick={onClear} className="px-3 py-1 bg-slate-800 text-slate-400 rounded text-xs hover:bg-slate-700 transition">
          Temizle
        </button>
      </div>

      {/* Variant headers */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${variants.length}, 1fr)` }}>
        {variants.map((v, i) => (
          <div key={v.variant_id} className="g-panel cursor-pointer hover:border-slate-600 transition"
            onClick={() => onSelectVariant(v.variant_id)}
            style={{ borderTop: `3px solid ${COLORS[i]}` }}>
            <div className="g-panel-body text-center py-3">
              <div className="text-sm font-bold text-slate-200">{v.model_name}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{v.variant_code.substring(0, 18)}...</div>
              <div className="text-[10px] text-slate-400 mt-1">{v.fingerprint}</div>
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {v.tags?.slice(0, 4).map((t, j) => (
                  <span key={j} className={`tag bg-${t.color}-500/15 text-${t.color}-400`}>{t.value}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights for comparison */}
      {insights.length > 0 && (
        <div className="g-panel">
          <div className="g-panel-header">
            <span className="g-panel-title">◉ Karşılaştırma Analizi</span>
          </div>
          <div className="g-panel-body space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-blue-500/5 border border-blue-500/10 rounded">
                <span className="text-sm">
                  {ins.icon === 'zap' ? '⚡' : ins.icon === 'fuel' ? '⛽' : ins.icon === 'scale' ? '⚖' : '⚙'}
                </span>
                <span className="text-[11px] text-slate-300">{ins.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart tabs */}
      <div className="flex gap-1 bg-[#0d1117] border border-slate-800 rounded-md p-0.5 w-fit">
        {[
          { key: 'specs', label: 'Teknik Özellikler' },
          { key: 'radar', label: 'Radar Karşılaştırma' },
          { key: 'fuel', label: 'Yakıt Haritası Overlay' },
          { key: 'torque', label: 'Tork Eğrileri' },
          { key: 'gears', label: 'Şanzıman' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveChart(t.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              activeChart === t.key ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Specs comparison table */}
      {activeChart === 'specs' && (
        <div className="g-panel">
          <div className="g-panel-header"><span className="g-panel-title">Teknik Özellik Karşılaştırması</span></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/40">
                  <th className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase w-40">Özellik</th>
                  {variants.map((v, i) => (
                    <th key={i} className="px-3 py-2 text-center" style={{ borderBottom: `2px solid ${COLORS[i]}` }}>
                      <span className="text-[10px] text-slate-400">{v.model_name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specRows.map(row => {
                  const values = variants.map(v => v.specs[row.key]);
                  const hasDiff = isDiff(values);
                  return (
                    <tr key={row.key} className={`border-b border-slate-800/20 ${hasDiff ? 'bg-amber-500/[0.02]' : ''}`}>
                      <td className="px-4 py-2 text-slate-500">{row.label}</td>
                      {values.map((val, i) => (
                        <td key={i} className={`px-3 py-2 text-center ${
                          isBest(values, i, row.best) ? 'text-emerald-400 font-bold' :
                          hasDiff ? 'text-amber-200' : 'text-slate-400'
                        }`}>
                          {val != null ? `${val}${row.unit ? ` ${row.unit}` : ''}` : '—'}
                          {isBest(values, i, row.best) && ' ✓'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {/* Separator */}
                <tr><td colSpan={variants.length + 1} className="py-1 bg-slate-800/20" /></tr>
                {fuelRows.map((row, idx) => {
                  const values = variants.map(v => row.fn(v));
                  const hasDiff = isDiff(values);
                  return (
                    <tr key={idx} className={`border-b border-slate-800/20 ${hasDiff ? 'bg-amber-500/[0.02]' : ''}`}>
                      <td className="px-4 py-2 text-slate-500">{row.label}</td>
                      {values.map((val, i) => (
                        <td key={i} className={`px-3 py-2 text-center ${
                          isBest(values, i, row.best) ? 'text-emerald-400 font-bold' :
                          hasDiff ? 'text-amber-200' : 'text-slate-400'
                        }`}>
                          {val != null ? val : '—'}
                          {isBest(values, i, row.best) && ' ✓'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Radar chart */}
      {activeChart === 'radar' && (
        <div className="g-panel">
          <div className="g-panel-header"><span className="g-panel-title">Radar Karşılaştırma (Normalize %)</span></div>
          <div className="g-panel-body flex justify-center">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                <PolarRadiusAxis stroke="#334155" fontSize={9} />
                {variants.map((v, i) => (
                  <Radar key={i} name={v.model_name} dataKey={`v${i}`}
                    stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.1} strokeWidth={2} />
                ))}
                <Legend />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Fuel map overlay */}
      {activeChart === 'fuel' && (
        <div className="g-panel">
          <div className="g-panel-header"><span className="g-panel-title">Yakıt Tüketim Haritası — Overlay</span></div>
          <div className="g-panel-body">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="rpm" type="number" stroke="#64748b" fontSize={10}
                  domain={['auto', 'auto']} label={{ value: 'RPM', position: 'bottom', fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" fontSize={10}
                  label={{ value: 'Yakıt (g/h)', angle: -90, position: 'left', fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 10 }} />
                <Legend />
                {variants.map((v, i) => {
                  // Average fc per rpm bucket
                  const bucketMap = {};
                  v.fuel_map?.forEach(p => {
                    const rpm = Math.round(p.rpm / 100) * 100;
                    if (!bucketMap[rpm]) bucketMap[rpm] = [];
                    bucketMap[rpm].push(p.fc);
                  });
                  const avgData = Object.entries(bucketMap).map(([rpm, vals]) => ({
                    rpm: Number(rpm),
                    fc: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
                  })).sort((a, b) => a.rpm - b.rpm);

                  return (
                    <Line key={i} data={avgData} dataKey="fc" name={`${v.model_name} (${v.variant_code.slice(0, 8)})`}
                      stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Torque curves overlay */}
      {activeChart === 'torque' && (
        <div className="g-panel">
          <div className="g-panel-header"><span className="g-panel-title">Full Load Tork Eğrileri — Overlay</span></div>
          <div className="g-panel-body">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="rpm" type="number" stroke="#64748b" fontSize={10}
                  domain={['auto', 'auto']} label={{ value: 'RPM', position: 'bottom', fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#64748b" fontSize={10}
                  label={{ value: 'Tork (Nm)', angle: -90, position: 'left', fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 10 }} />
                <Legend />
                {variants.map((v, i) => (
                  <Line key={i} data={v.load_curves} dataKey="max_torque" name={`${v.model_name} Tork`}
                    stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gear ratios comparison */}
      {activeChart === 'gears' && (
        <div className="g-panel">
          <div className="g-panel-header"><span className="g-panel-title">Vites Oranları Karşılaştırması</span></div>
          <div className="g-panel-body">
            {(() => {
              const maxGears = Math.max(...variants.map(v => v.gear_ratios?.length || 0));
              const gearData = Array.from({ length: maxGears }, (_, g) => {
                const point = { gear: `${g + 1}. Vites` };
                variants.forEach((v, i) => {
                  point[`v${i}`] = v.gear_ratios?.[g]?.ratio || 0;
                });
                return point;
              });
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gearData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="gear" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                    <Legend />
                    {variants.map((v, i) => (
                      <Bar key={i} dataKey={`v${i}`} name={v.model_name} fill={COLORS[i]} radius={[2, 2, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
