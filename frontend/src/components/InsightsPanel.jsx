import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend,
} from 'recharts';

const SEVERITY_MAP = {
  info: { color: 'blue', icon: 'ℹ', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  success: { color: 'emerald', icon: '✓', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  warning: { color: 'amber', icon: '⚠', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  danger: { color: 'red', icon: '✗', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
};

const TYPE_ICONS = {
  fleet_overview: '🌐',
  power_analysis: '⚡',
  fuel_efficiency: '⛽',
  recommendation: '💡',
  gearbox_analysis: '⚙',
  anomaly: '🔍',
  axle_optimization: '🔧',
};

const TYPE_LABELS = {
  fleet_overview: 'Filo Genel Bakış',
  power_analysis: 'Güç Analizi',
  fuel_efficiency: 'Yakıt Verimliliği',
  recommendation: 'Tavsiye',
  gearbox_analysis: 'Şanzıman Analizi',
  anomaly: 'Anomali Tespiti',
  axle_optimization: 'Aks Optimizasyonu',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function InsightsPanel() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    Promise.all([api.getInsights(), api.getFleetSummary()])
      .then(([ins, sum]) => { setInsights(ins.insights || ins); setSummary(sum); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const insightList = Array.isArray(insights) ? insights : [];
  const types = [...new Set(insightList.map(i => i.type))];
  const filtered = filter === 'all' ? insightList : insightList.filter(i => i.type === filter);

  // Group by severity
  const bySeverity = {};
  insightList.forEach(i => { bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1; });
  const severityData = Object.entries(bySeverity).map(([k, v]) => ({ name: k, value: v }));

  // Group by type
  const byType = {};
  insightList.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1; });
  const typeData = Object.entries(byType).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v }));

  const gauges = summary?.gauges || {};

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">AI İçgörüler & Analiz</h2>
          <p className="text-xs text-slate-500">{insightList.length} içgörü tespit edildi</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-[10px] text-emerald-400">Analiz motoru aktif</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(SEVERITY_MAP).map(([key, s]) => (
          <div key={key} className={`g-panel ${s.bg} ${s.border}`}>
            <div className="g-panel-body text-center py-3">
              <div className="text-xl">{s.icon}</div>
              <div className="text-2xl font-bold text-white mt-1">{bySeverity[key] || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-0.5">{key}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="g-panel">
          <div className="g-panel-header"><span className="g-panel-title">Kategori Dağılımı</span></div>
          <div className="g-panel-body flex justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={70} innerRadius={35} paddingAngle={3}>
                  {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="g-panel">
          <div className="g-panel-header"><span className="g-panel-title">Ciddiyet Dağılımı</span></div>
          <div className="g-panel-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.name === 'info' ? '#3b82f6' :
                      entry.name === 'success' ? '#10b981' :
                      entry.name === 'warning' ? '#f59e0b' : '#ef4444'
                    } />
                  ))}
                </Bar>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fleet stats from summary */}
      {summary?.gauges?.length > 0 && (
        <div className="g-panel">
          <div className="g-panel-header"><span className="g-panel-title">Filo Metrikleri</span></div>
          <div className="g-panel-body">
            <div className="grid grid-cols-4 gap-4 text-center">
              {summary.gauges.map((g, i) => (
                <div key={i}>
                  <div className="text-sm font-bold text-slate-200">{g.value} {g.unit}</div>
                  <div className="text-[10px] text-slate-500">{g.label}</div>
                  <div className="text-[9px] text-slate-600">{g.min}–{g.max} {g.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-1 bg-[#0d1117] border border-slate-800 rounded-md p-0.5 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition ${
            filter === 'all' ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}>
          Tümü ({insightList.length})
        </button>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              filter === t ? 'bg-blue-500/15 text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {TYPE_ICONS[t]} {TYPE_LABELS[t] || t} ({byType[t]})
          </button>
        ))}
      </div>

      {/* Insights list */}
      <div className="space-y-3">
        {filtered.map((insight, i) => {
          const sev = SEVERITY_MAP[insight.severity] || SEVERITY_MAP.info;
          return (
            <div key={i} className={`g-panel ${sev.bg} ${sev.border} transition hover:border-opacity-40`}>
              <div className="g-panel-body p-4">
                <div className="flex items-start gap-3">
                  <div className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[insight.type] || '📊'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${sev.text}`}>{TYPE_LABELS[insight.type] || insight.type}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sev.bg} ${sev.text} border ${sev.border}`}>
                        {insight.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{insight.message}</p>

                    {/* Data details */}
                    {insight.data && (
                      <div className="mt-3 pt-3 border-t border-slate-800/30">
                        {renderInsightData(insight)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderInsightData(insight) {
  const data = insight.data;
  if (!data) return null;

  // For different insight types, render relevant data visualizations
  if (data.categories) {
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.categories).map(([cat, count]) => (
          <div key={cat} className="px-2 py-1 bg-slate-800/40 rounded text-[10px]">
            <span className="text-slate-400">{cat}:</span>{' '}
            <span className="text-white font-bold">{count}</span>
          </div>
        ))}
      </div>
    );
  }

  if (data.power_range) {
    return (
      <div className="flex flex-wrap gap-3 text-[11px]">
        <div><span className="text-slate-500">Aralık:</span> <span className="text-white">{data.power_range.min}–{data.power_range.max} kW</span></div>
        <div><span className="text-slate-500">Ortalama:</span> <span className="text-white">{data.average_power_kw} kW</span></div>
        <div><span className="text-slate-500">Std Sapma:</span> <span className="text-white">{data.std_dev?.toFixed(1)} kW</span></div>
      </div>
    );
  }

  if (data.best_model) {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-emerald-400 font-bold">★ En İyi:</span>
        <span className="text-white">{data.best_model}</span>
        {data.best_score && <span className="text-slate-500">({data.best_score})</span>}
      </div>
    );
  }

  if (data.brands) {
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.brands).map(([brand, count]) => (
          <span key={brand} className="tag bg-purple-500/15 text-purple-400">{brand}: {count}</span>
        ))}
      </div>
    );
  }

  if (data.variant_code) {
    return (
      <div className="text-[10px] font-mono text-amber-300/60">{data.variant_code}</div>
    );
  }

  if (data.low_ratio || data.high_ratio || data.efficiency_leader) {
    return (
      <div className="flex flex-wrap gap-3 text-[11px]">
        {data.low_ratio && <div><span className="text-slate-500">En Düşük:</span> <span className="text-white">{data.low_ratio.model} ({data.low_ratio.ratio})</span></div>}
        {data.high_ratio && <div><span className="text-slate-500">En Yüksek:</span> <span className="text-white">{data.high_ratio.model} ({data.high_ratio.ratio})</span></div>}
        {data.efficiency_leader && <div><span className="text-slate-500">Verimlilik Lideri:</span> <span className="text-emerald-400 font-bold">{data.efficiency_leader}</span></div>}
      </div>
    );
  }

  // Generic key-value display
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(data).slice(0, 8).map(([k, v]) => (
        <div key={k} className="px-2 py-1 bg-slate-800/40 rounded text-[10px]">
          <span className="text-slate-500">{k}:</span>{' '}
          <span className="text-white">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
    </div>
  );
}
