import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Treemap,
} from 'recharts';

const COLORS = ['#E30613', '#3fb950', '#f0883e', '#58a6ff', '#bc8cff', '#f778ba', '#39d2c0', '#d2a8ff'];
const CAT_COLORS = { coach: '#58a6ff', city: '#39d2c0', ev: '#3fb950', diesel: '#f0883e' };

const HERO_IMAGE = 'https://www.temsa.com/en/images/slider/slider-1.jpg';
const FLEET_IMAGES = [
  'https://www.temsa.com/en/images/common/temsa-hd-12.png',
  'https://www.temsa.com/en/images/common/maraton-12.png',
  'https://www.temsa.com/en/images/common/temsa-avenue-electron.png',
];

function GaugeCard({ label, value, unit, min, max }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 50;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const half = circ * 0.75;
  const offset = half - (half * pct / 100);

  return (
    <div className="t-panel text-center">
      <div className="t-panel-body py-4 px-3">
        <svg viewBox="0 0 100 65" className="w-full max-w-[130px] mx-auto">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#21262d" strokeWidth="7"
            strokeDasharray={`${half} ${circ}`} strokeDashoffset="0" strokeLinecap="round"
            transform="rotate(135 50 50)" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#E30613" strokeWidth="7"
            strokeDasharray={`${half} ${circ}`} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(135 50 50)" className="gauge-ring" />
          <text x="50" y="44" textAnchor="middle" className="fill-[#e6edf3] text-[14px] font-bold">{value}</text>
          <text x="50" y="55" textAnchor="middle" className="fill-[#484f58] text-[7px]">{unit}</text>
        </svg>
        <div className="text-[11px] text-[#8b949e] font-semibold mt-1">{label}</div>
        <div className="flex justify-between text-[9px] text-[#484f58] mt-1 px-3">
          <span>{min}</span>
          <span>{max} {unit}</span>
        </div>
      </div>
    </div>
  );
}

const CustomTreemapContent = ({ x, y, width, height, name, variants, category }) => {
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4}
        fill={CAT_COLORS[category] || '#30363d'} fillOpacity={0.25}
        stroke={CAT_COLORS[category] || '#30363d'} strokeWidth={1} strokeOpacity={0.4} />
      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle"
        className="fill-[#e6edf3] text-[10px] font-bold">{width > 60 ? name : name.substring(0, 6)}</text>
      <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle"
        className="fill-[#8b949e] text-[8px]">{variants} varyant</text>
    </g>
  );
};

export default function Dashboard({ stats, onNavigate, onSelectVariant }) {
  const [fleet, setFleet] = useState(null);
  const [insights, setInsights] = useState(null);
  const [rankings, setRankings] = useState(null);

  useEffect(() => {
    api.getFleetSummary().then(setFleet).catch(console.error);
    api.getInsights().then(setInsights).catch(console.error);
    api.getRankings('overall', null).then(setRankings).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const catData = Object.entries(stats.variants_by_category).map(([k, v]) => ({ name: k, value: v }));
  const engData = Object.entries(stats.variants_by_engine_type).map(([k, v]) => ({ name: k, value: v }));
  const topVariants = rankings?.rankings?.slice(0, 5) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero banner */}
      <div className="relative h-48 rounded-xl overflow-hidden border border-[#21262d]">
        <img src={HERO_IMAGE} alt="TEMSA Fleet" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1419] via-[#0f1419]/80 to-transparent" />
        <div className="relative z-10 flex items-center h-full px-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-[#E30613] rounded-full" />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">VECTO Fleet Overview</h1>
            </div>
            <p className="text-sm text-[#8b949e] max-w-md leading-relaxed">
              TEMSA arac filosunun VECTO beyanname verilerine dayali performans, yakit tuketimi ve teknik ozellik analizi.
            </p>
            <div className="flex gap-6 mt-4">
              <div>
                <div className="stat-value text-white">{stats.total_vehicles}</div>
                <div className="text-[10px] text-[#8b949e] mt-0.5">Arac Modeli</div>
              </div>
              <div>
                <div className="stat-value text-white">{stats.total_variants}</div>
                <div className="text-[10px] text-[#8b949e] mt-0.5">Toplam Varyant</div>
              </div>
              <div>
                <div className="stat-value text-white">{Object.keys(stats.variants_by_engine_type).length}</div>
                <div className="text-[10px] text-[#8b949e] mt-0.5">Motor Tipi</div>
              </div>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            {FLEET_IMAGES.map((img, i) => (
              <img key={i} src={img} alt="" className="h-28 object-contain opacity-60 hover:opacity-90 transition drop-shadow-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Gauge row */}
      {fleet?.gauges && (
        <div className="grid grid-cols-4 gap-4">
          {fleet.gauges.map(g => <GaugeCard key={g.label} {...g} />)}
        </div>
      )}

      {/* 3-column chart row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Category distribution */}
        <div className="col-span-4 t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Kategori Dagilimi</span>
          </div>
          <div className="t-panel-body">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={65} innerRadius={35} dataKey="value" paddingAngle={3}>
                  {catData.map((_, i) => <Cell key={i} fill={Object.values(CAT_COLORS)[i] || COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {catData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: Object.values(CAT_COLORS)[i] || COLORS[i] }} />
                  <span className="text-[11px] text-[#8b949e] capitalize">{d.name}</span>
                  <span className="text-[11px] text-[#e6edf3] font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Model treemap */}
        <div className="col-span-4 t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Model Dagilimi</span>
          </div>
          <div className="t-panel-body">
            {fleet?.model_distribution && (
              <ResponsiveContainer width="100%" height={220}>
                <Treemap data={fleet.model_distribution} dataKey="variants" aspectRatio={4 / 3} content={<CustomTreemapContent />} />
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Power histogram */}
        <div className="col-span-4 t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Guc Dagilimi (kW)</span>
          </div>
          <div className="t-panel-body">
            {fleet?.power_histogram && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={fleet.power_histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="range" stroke="#484f58" fontSize={9} angle={-30} textAnchor="end" height={40} />
                  <YAxis stroke="#484f58" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#E30613" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top performers */}
        <div className="col-span-5 t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">En Iyi Performans Gosteren Varyantlar</span>
            <button onClick={() => onNavigate('rankings')} className="text-[11px] text-[#E30613] hover:text-[#b8050f] font-medium">
              Tumunu gor
            </button>
          </div>
          <div className="t-panel-body p-0">
            {topVariants.map((v, i) => (
              <div key={v.variant_id} onClick={() => onSelectVariant(v.variant_id)}
                className="flex items-center gap-3 px-5 py-3 border-b border-[#21262d] hover:bg-[#21262d]/50 cursor-pointer transition">
                <div className={`w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold ${
                  i === 0 ? 'bg-[#E30613]/15 text-[#E30613]' :
                  i === 1 ? 'bg-[#8b949e]/15 text-[#8b949e]' :
                  i === 2 ? 'bg-[#f0883e]/15 text-[#f0883e]' :
                  'bg-[#21262d] text-[#484f58]'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#e6edf3] truncate">{v.model_name}</div>
                  <div className="text-[10px] text-[#484f58] truncate">{v.fingerprint}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {v.tags?.slice(0, 2).map((t, j) => (
                    <span key={j} className={`tag bg-${t.color}-500/10 text-${t.color}-400`}>{t.value}</span>
                  ))}
                </div>
                <div className="text-right flex-shrink-0 pl-2">
                  <div className="text-[14px] font-bold text-[#e6edf3]">{v.scores.overall}</div>
                  <div className="text-[9px] text-[#484f58]">skor</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet Insights */}
        <div className="col-span-7 t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Filo Analiz Raporu</span>
          </div>
          <div className="t-panel-body space-y-2 max-h-[350px] overflow-y-auto">
            {insights?.insights?.map((ins, i) => {
              const sevClass = ins.severity === 'success' ? 'border-[#3fb950]/20 bg-[#3fb950]/5' :
                ins.severity === 'warning' ? 'border-[#f0883e]/20 bg-[#f0883e]/5' : 'border-[#21262d] bg-[#161b22]';
              return (
                <div key={i} className={`border rounded-lg p-3 ${sevClass}`}>
                  <div className="text-[12px] font-semibold text-[#e6edf3] mb-1">{ins.title}</div>
                  <div className="text-[11px] text-[#8b949e] leading-relaxed">{ins.message}</div>
                </div>
              );
            })}
            {!insights && <div className="text-center py-8 text-[#484f58] text-sm">Analiz yukleniyor...</div>}
          </div>
        </div>
      </div>

      {/* Recent imports */}
      <div className="t-panel">
        <div className="t-panel-header">
          <span className="t-panel-title">Son Veri Aktarimlari</span>
          <button onClick={() => onNavigate('import')} className="text-[11px] text-[#E30613] hover:text-[#b8050f] font-medium">
            Yeni Aktarim
          </button>
        </div>
        <div className="t-panel-body p-0">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] text-[#484f58] uppercase tracking-wider border-b border-[#21262d]">
                <th className="px-5 py-2.5">Dosya</th>
                <th className="py-2.5">Model</th>
                <th className="py-2.5">Varyant Kodu</th>
                <th className="py-2.5">Durum</th>
                <th className="py-2.5">Tarih</th>
              </tr>
            </thead>
            <tbody className="text-[#8b949e]">
              {stats.recent_imports?.slice(0, 5).map((log, i) => (
                <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                  <td className="px-5 py-2.5 font-mono text-[11px]">{log.filename}</td>
                  <td className="py-2.5 text-[#e6edf3] font-medium">{log.vehicle_model || '-'}</td>
                  <td className="py-2.5 font-mono text-[11px]">{log.variant_code || '-'}</td>
                  <td className="py-2.5">
                    <span className={`tag ${log.status === 'success' ? 'bg-[#3fb950]/10 text-[#3fb950]' : 'bg-[#E30613]/10 text-[#E30613]'}`}>
                      {log.status === 'success' ? 'Basarili' : 'Hata'}
                    </span>
                  </td>
                  <td className="py-2.5 text-[#484f58]">{log.imported_at?.split(' ')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
