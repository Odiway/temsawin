import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line, Area, Treemap,
} from 'recharts';
import { useChartTheme } from './ThemeContext';
import { api } from '../api';

// ─── Palette ─────────────────────────────────────────────────────
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
const ENERGY_COLORS = {
  E_air: '#3b82f6', E_roll: '#10b981', E_grad: '#f59e0b', E_brake: '#ef4444',
  E_vehi_inertia: '#8b5cf6', E_aux_sum: '#ec4899', E_tc_loss: '#06b6d4',
  E_gbx_loss: '#84cc16', E_axl_loss: '#f97316', E_powertrain_inertia: '#6366f1',
  E_shift_loss: '#a855f7', E_wheelEnd_saved: '#14b8a6',
};

const TABS = [
  { key: 'energy', label: 'Enerji Akışı', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { key: 'dynamics', label: 'Sürüş Dinamiği', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { key: 'gear', label: 'Vites Haritası', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { key: 'drivetrain', label: 'Aktarma Kayıpları', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { key: 'busaux', label: 'Yardımcı Enerji', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'waterfall', label: 'FC Zinciri', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
  { key: 'loading', label: 'Yükleme Hassasiyeti', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
  { key: 'engine', label: 'Motor Çalışma', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'adas', label: 'ADAS Etki', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { key: 'component', label: 'Komponent Verim', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

// ─── Shared Loading / Error ─────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-xs text-slate-400">Yükleniyor...</span>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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

// ─── useApi hook ─────────────────────────────────────────────────
function useApi(fetcher) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await fetcher()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ─── 1. Energy Flow ─────────────────────────────────────────────
function EnergyFlowSection() {
  const ct = useChartTheme();
  const { data, loading, error } = useApi(api.getEnergySankey);
  const [selectedLoading, setSelectedLoading] = useState('Low');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.sankey_data.filter(d => d.loading === selectedLoading);
  const chartData = items.map(d => ({
    mission: d.mission,
    'Hava Direnci': d.energy.E_air,
    'Yuvarlanma': d.energy.E_roll,
    'Eğim': d.energy.E_grad,
    'Fren': d.energy.E_brake,
    'Atalet': d.energy.E_vehi_inertia,
    'Yrd. Donanım': d.energy.E_aux_sum,
    'TC Kayıp': d.energy.E_tc_loss,
    'Şanzıman Kayıp': d.energy.E_gbx_loss,
    'Dingil Kayıp': d.energy.E_axl_loss,
    'Güç Aktarma Ataleti': d.energy.E_powertrain_inertia,
  }));

  const barKeys = ['Hava Direnci', 'Yuvarlanma', 'Eğim', 'Fren', 'Atalet', 'Yrd. Donanım', 'TC Kayıp', 'Şanzıman Kayıp', 'Dingil Kayıp', 'Güç Aktarma Ataleti'];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['Low', 'Reference'].map(l => (
          <button key={l} onClick={() => setSelectedLoading(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedLoading === l ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {l === 'Low' ? 'Düşük Yük' : 'Referans Yük'}
          </button>
        ))}
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Enerji Dağılımı — Misyon Bazlı (kWh)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis {...ct.axis} dataKey="mission" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
            <YAxis {...ct.axis} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
            <Tooltip {...ct.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {barKeys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.slice(0, 4).map(d => (
          <Card key={d.mission} className="text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{d.mission}</div>
            <div className="text-lg font-bold text-blue-400 mt-1">{d.energy.E_fcmap_pos?.toFixed(1)} kWh</div>
            <div className="text-[10px] text-slate-500">Motor Toplam Enerji</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── 2. Driving Dynamics ────────────────────────────────────────
function DrivingDynamicsSection() {
  const ct = useChartTheme();
  const { data, loading, error } = useApi(api.getDrivingDynamics);
  const [selectedLoading, setSelectedLoading] = useState('Low');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.dynamics.filter(d => d.loading === selectedLoading);
  const barData = items.map(d => ({
    mission: d.mission,
    'Hızlanma': d.AccelerationTimeShare,
    'Yavaşlama': d.DecelerationTimeShare,
    'Sabit Hız': d.CruiseTimeShare,
    'Durma': d.StopTimeShare,
    'Serbest': d.CoastingTimeShare,
    'Fren': d.BrakingTimeShare,
  }));

  const radarData = items.map(d => ({
    mission: d.mission,
    'Ort. Hız': d.avg_speed_kmh,
    'Maks Hız': d.max_speed_kmh,
    'Motor RPM': d.n_eng_avg / 30, // Scale for radar
    'Vites Değişimi': d.gear_shifts,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['Low', 'Reference'].map(l => (
          <button key={l} onClick={() => setSelectedLoading(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedLoading === l ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {l === 'Low' ? 'Düşük Yük' : 'Referans Yük'}
          </button>
        ))}
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Sürüş Profili Zaman Dağılımı (%)</h3>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={barData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis {...ct.axis} dataKey="mission" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
            <YAxis {...ct.axis} domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
            <Tooltip {...ct.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Hızlanma" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Yavaşlama" stackId="a" fill="#ef4444" />
            <Bar dataKey="Sabit Hız" stackId="a" fill="#10b981" />
            <Bar dataKey="Durma" stackId="a" fill="#64748b" />
            <Bar dataKey="Serbest" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Fren" stackId="a" fill="#ec4899" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      {/* Speed & RPM KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map(d => (
          <Card key={d.mission} className="text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{d.mission}</div>
            <div className="text-lg font-bold text-emerald-400">{d.avg_speed_kmh?.toFixed(1)} km/h</div>
            <div className="text-[10px] text-slate-500">Ort. Hız</div>
            <div className="text-xs text-slate-400 mt-1">{d.n_eng_avg?.toFixed(0)} RPM</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── 3. Gear Usage Heatmap ──────────────────────────────────────
function GearUsageSection() {
  const { data, loading, error } = useApi(api.getGearUsage);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.gear_usage;
  const missions = [...new Set(items.map(d => d.mission))];
  const gearLabels = ['N/Boş', '1. Vites', '2. Vites', '3. Vites', '4. Vites', '5. Vites', '6. Vites'];

  const getColor = (val) => {
    if (val === 0 || val == null) return 'bg-slate-800/50';
    if (val < 5) return 'bg-blue-900/60 text-blue-300';
    if (val < 15) return 'bg-blue-700/60 text-blue-200';
    if (val < 30) return 'bg-yellow-700/60 text-yellow-200';
    if (val < 50) return 'bg-orange-600/60 text-orange-100';
    return 'bg-red-600/70 text-red-100';
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Vites Kullanım Isı Haritası (% Zaman Payı)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Misyon</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Yük</th>
                {gearLabels.map(g => (
                  <th key={g} className="text-center py-2 px-2 text-slate-400 font-medium">{g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((d, idx) => (
                <tr key={idx} className="border-t border-white/5">
                  <td className="py-2 px-3 text-white font-medium">{d.mission}</td>
                  <td className="py-2 px-3 text-slate-400">{d.loading === 'Low' ? 'Düşük' : 'Ref.'}</td>
                  {[0, 1, 2, 3, 4, 5, 6].map(i => {
                    const val = d[`gear_${i}`];
                    return (
                      <td key={i} className="py-2 px-2 text-center">
                        <span className={`inline-block w-12 py-1 rounded text-[10px] font-bold ${getColor(val)}`}>
                          {val?.toFixed(1) || '—'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Legend */}
      <div className="flex gap-2 items-center text-[10px] text-slate-400">
        <span>Yoğunluk:</span>
        {[{ label: '0%', cls: 'bg-slate-800/50' }, { label: '<5%', cls: 'bg-blue-900/60' }, { label: '<15%', cls: 'bg-blue-700/60' }, { label: '<30%', cls: 'bg-yellow-700/60' }, { label: '<50%', cls: 'bg-orange-600/60' }, { label: '50%+', cls: 'bg-red-600/70' }].map(l => (
          <span key={l.label} className={`px-2 py-0.5 rounded ${l.cls}`}>{l.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── 4. Drivetrain Losses ───────────────────────────────────────
function DrivetrainLossSection() {
  const ct = useChartTheme();
  const { data, loading, error } = useApi(api.getDrivetrainLosses);
  const [selectedLoading, setSelectedLoading] = useState('Low');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.losses.filter(d => d.loading === selectedLoading);
  const chartData = items.map(d => ({
    mission: d.mission,
    'Tork Konvertör': d.E_tc_loss,
    'Vites Değişim': d.E_shift_loss,
    'Şanzıman': d.E_gbx_loss,
    'Dingil': d.E_axl_loss,
  }));

  const pieData = items.reduce((acc, d) => {
    acc[0].value += d.E_tc_loss || 0;
    acc[1].value += d.E_shift_loss || 0;
    acc[2].value += d.E_gbx_loss || 0;
    acc[3].value += d.E_axl_loss || 0;
    return acc;
  }, [
    { name: 'Tork Konvertör', value: 0 },
    { name: 'Vites Değişim', value: 0 },
    { name: 'Şanzıman', value: 0 },
    { name: 'Dingil', value: 0 },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['Low', 'Reference'].map(l => (
          <button key={l} onClick={() => setSelectedLoading(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedLoading === l ? 'bg-orange-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {l === 'Low' ? 'Düşük Yük' : 'Referans Yük'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">Aktarma Organı Kayıpları (kWh)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
              <CartesianGrid {...ct.grid} />
              <XAxis {...ct.axis} dataKey="mission" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
              <YAxis {...ct.axis} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
              <Tooltip {...ct.tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Tork Konvertör" stackId="a" fill="#06b6d4" />
              <Bar dataKey="Vites Değişim" stackId="a" fill="#a855f7" />
              <Bar dataKey="Şanzıman" stackId="a" fill="#84cc16" />
              <Bar dataKey="Dingil" stackId="a" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Toplam Kayıp Oranı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#64748b' }}>
                {pieData.map((_, i) => <Cell key={i} fill={['#06b6d4', '#a855f7', '#84cc16', '#f97316'][i]} />)}
              </Pie>
              <Tooltip {...ct.tooltip} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── 5. Bus Auxiliary Energy ────────────────────────────────────
function BusAuxSection() {
  const ct = useChartTheme();
  const { data, loading, error } = useApi(api.getBusAuxiliary);
  const [selectedLoading, setSelectedLoading] = useState('Low');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.auxiliary.filter(d => d.loading === selectedLoading);
  const chartData = items.map(d => ({
    mission: d.mission,
    'Fan': d.E_aux_FAN,
    'Direksiyon': d.E_aux_STP,
    'HVAC Mekanik': d.E_BusAux_HVAC_mech,
    'HVAC Elektrik': d.E_BusAux_HVAC_el,
    'Aux Isıtıcı': d.E_BusAux_AuxHeater,
    'ES Tüketim': d.E_BusAux_ES_consumed,
    'Kompresör': d.E_PS_compressorOn,
    'Motor Çalıştırma': d.E_ice_start,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['Low', 'Reference'].map(l => (
          <button key={l} onClick={() => setSelectedLoading(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedLoading === l ? 'bg-pink-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {l === 'Low' ? 'Düşük Yük' : 'Referans Yük'}
          </button>
        ))}
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Yardımcı Donanım Enerji Dağılımı (kWh)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis {...ct.axis} dataKey="mission" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
            <YAxis {...ct.axis} label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
            <Tooltip {...ct.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Fan" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Direksiyon" stackId="a" fill="#10b981" />
            <Bar dataKey="HVAC Mekanik" stackId="a" fill="#f59e0b" />
            <Bar dataKey="HVAC Elektrik" stackId="a" fill="#06b6d4" />
            <Bar dataKey="Aux Isıtıcı" stackId="a" fill="#ef4444" />
            <Bar dataKey="ES Tüketim" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="Kompresör" stackId="a" fill="#ec4899" />
            <Bar dataKey="Motor Çalıştırma" stackId="a" fill="#84cc16" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.slice(0, 4).map(d => (
          <Card key={d.mission} className="text-center">
            <div className="text-[10px] text-slate-500 uppercase">{d.mission}</div>
            <div className="text-lg font-bold text-pink-400">{d.E_aux_sum?.toFixed(2)} kWh</div>
            <div className="text-[10px] text-slate-500">Toplam Yardımcı Enerji</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── 6. FC Correction Waterfall ─────────────────────────────────
function FCWaterfallSection() {
  const ct = useChartTheme();
  const { data, loading, error } = useApi(api.getFcWaterfall);
  const [selectedMission, setSelectedMission] = useState(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.waterfall;
  const missions = [...new Set(items.map(d => d.mission))];
  const active = selectedMission || missions[0];
  const missionData = items.filter(d => d.mission === active);

  const stages = [
    { key: 'fc_map_g_km', label: 'FC-Map' },
    { key: 'fc_ncvc_g_km', label: 'FC-NCVc' },
    { key: 'fc_whtcc_g_km', label: 'FC-WHTCc' },
    { key: 'fc_ess_g_km', label: 'FC-ESS' },
    { key: 'fc_ess_corr_g_km', label: 'FC-ESS Corr' },
    { key: 'fc_busaux_ps_corr_g_km', label: 'FC-PS Corr' },
    { key: 'fc_busaux_es_corr_g_km', label: 'FC-ES Corr' },
    { key: 'fc_busaux_auxheater_corr_g_km', label: 'FC-AuxHeat' },
    { key: 'fc_final_g_km', label: 'FC-Final' },
  ];

  // Build waterfall bars for each loading
  const chartData = stages.map((s) => {
    const row = { stage: s.label };
    missionData.forEach(d => {
      row[d.loading] = d[s.key] || 0;
    });
    return row;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {missions.map(m => (
          <button key={m} onClick={() => setSelectedMission(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${active === m ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {m}
          </button>
        ))}
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">FC Düzeltme Zinciri — {active} (g/km)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis {...ct.axis} dataKey="stage" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
            <YAxis {...ct.axis} label={{ value: 'g/km', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
            <Tooltip {...ct.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Low" fill="#3b82f6" name="Düşük Yük" barSize={28} />
            <Bar dataKey="Reference" fill="#f59e0b" name="Referans Yük" barSize={28} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
      {/* Delta table */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">Düzeltme Farkları</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-slate-400">Aşama</th>
                {missionData.map(d => (
                  <th key={d.loading} className="text-right py-2 px-3 text-slate-400">{d.loading === 'Low' ? 'Düşük' : 'Ref.'} (g/km)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stages.map((s, i) => (
                <tr key={s.key} className="border-t border-white/5">
                  <td className="py-1.5 px-3 text-white font-medium">{s.label}</td>
                  {missionData.map(d => (
                    <td key={d.loading} className={`py-1.5 px-3 text-right font-mono ${i === stages.length - 1 ? 'text-violet-400 font-bold' : 'text-slate-300'}`}>
                      {d[s.key]?.toFixed(1) || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── 7. Loading Sensitivity ─────────────────────────────────────
function LoadingSensitivitySection() {
  const ct = useChartTheme();
  const { data, loading, error } = useApi(api.getLoadingSensitivity);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.sensitivity;
  const chartData = items.map(d => ({
    name: `${d.vehicle_model?.slice(0, 15)} - ${d.mission}`,
    'Düşük CO₂': d.low_co2_g_km,
    'Referans CO₂': d.ref_co2_g_km,
    'Artış %': d.co2_increase_pct,
  }));

  const massData = items.filter(d => d.low_mass_kg && d.ref_mass_kg).map(d => ({
    name: `${d.vehicle_model?.slice(0, 15)} - ${d.mission}`,
    'Düşük Kütle': d.low_mass_kg,
    'Referans Kütle': d.ref_mass_kg,
    lowPax: d.low_pax,
    refPax: d.ref_pax,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Yükleme Hassasiyeti — CO₂ Karşılaştırma (g/km)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 80 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis {...ct.axis} dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 9 }} />
            <YAxis {...ct.axis} label={{ value: 'g/km', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
            <Tooltip {...ct.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Düşük CO₂" fill="#3b82f6" barSize={18} />
            <Bar dataKey="Referans CO₂" fill="#ef4444" barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      {/* Sensitivity table */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">Detay Tablosu</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-2 text-slate-400">Model</th>
                <th className="text-left py-2 px-2 text-slate-400">Misyon</th>
                <th className="text-right py-2 px-2 text-slate-400">Düşük Yolcu</th>
                <th className="text-right py-2 px-2 text-slate-400">Ref. Yolcu</th>
                <th className="text-right py-2 px-2 text-slate-400">CO₂ Düşük</th>
                <th className="text-right py-2 px-2 text-slate-400">CO₂ Ref.</th>
                <th className="text-right py-2 px-2 text-slate-400">CO₂ Artış</th>
                <th className="text-right py-2 px-2 text-slate-400">FC Düşük</th>
                <th className="text-right py-2 px-2 text-slate-400">FC Ref.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                  <td className="py-1.5 px-2 text-white">{d.vehicle_model}</td>
                  <td className="py-1.5 px-2 text-slate-300">{d.mission}</td>
                  <td className="py-1.5 px-2 text-right text-slate-300">{d.low_pax?.toFixed(0) || '—'}</td>
                  <td className="py-1.5 px-2 text-right text-slate-300">{d.ref_pax?.toFixed(0) || '—'}</td>
                  <td className="py-1.5 px-2 text-right text-blue-400 font-mono">{d.low_co2_g_km?.toFixed(1)}</td>
                  <td className="py-1.5 px-2 text-right text-red-400 font-mono">{d.ref_co2_g_km?.toFixed(1)}</td>
                  <td className={`py-1.5 px-2 text-right font-bold font-mono ${d.co2_increase_pct > 20 ? 'text-red-400' : d.co2_increase_pct > 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    +{d.co2_increase_pct?.toFixed(1)}%
                  </td>
                  <td className="py-1.5 px-2 text-right text-slate-300 font-mono">{d.low_fc_l_100km?.toFixed(1)}</td>
                  <td className="py-1.5 px-2 text-right text-slate-300 font-mono">{d.ref_fc_l_100km?.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── 8. Engine Operating Point ──────────────────────────────────
function EngineOperatingSection() {
  const ct = useChartTheme();
  const { data, loading, error } = useApi(api.getEngineOperatingPoint);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const points = data.operating_points;
  const missions = [...new Set(points.map(p => p.mission))];

  const scatterData = missions.map((m, i) => ({
    mission: m,
    color: COLORS[i % COLORS.length],
    points: points.filter(p => p.mission === m).map(p => ({
      x: p.n_eng_avg,
      y: p.specific_fc_g_kwh,
      z: p.P_fcmap_pos || 50,
      eff: p.avg_engine_efficiency,
      model: p.vehicle_model,
      loading: p.loading,
    })),
  }));

  const barData = points.map(p => ({
    name: `${p.vehicle_model?.slice(0, 12)}-${p.mission}-${p.loading?.charAt(0)}`,
    RPM: p.n_eng_avg,
    'Sp. FC (g/kWh)': p.specific_fc_g_kwh,
    Verim: (p.avg_engine_efficiency || 0) * 100,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Motor Çalışma Noktası — RPM vs Spesifik FC</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis {...ct.axis} type="number" dataKey="x" name="RPM" unit=" rpm"
              label={{ value: 'Ort. Motor Devri (rpm)', position: 'bottom', fill: ct.axis.stroke }} />
            <YAxis {...ct.axis} type="number" dataKey="y" name="Sp.FC" unit=" g/kWh"
              label={{ value: 'Sp. FC (g/kWh)', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
            <Tooltip {...ct.tooltip}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs">
                    <div className="text-white font-semibold">{d.model}</div>
                    <div className="text-slate-400">{d.loading}</div>
                    <div className="text-blue-400">{d.x?.toFixed(0)} RPM</div>
                    <div className="text-amber-400">{d.y?.toFixed(1)} g/kWh</div>
                    <div className="text-emerald-400">Verim: {(d.eff * 100)?.toFixed(1)}%</div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {scatterData.map(s => (
              <Scatter key={s.mission} name={s.mission} data={s.points} fill={s.color} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Motor Verimi Karşılaştırma</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} margin={{ top: 10, right: 30, left: 10, bottom: 80 }}>
            <CartesianGrid {...ct.grid} />
            <XAxis {...ct.axis} dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 8 }} />
            <YAxis {...ct.axis} yAxisId="left" label={{ value: '%', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
            <YAxis {...ct.axis} yAxisId="right" orientation="right" label={{ value: 'g/kWh', angle: 90, position: 'insideRight', fill: ct.axis.stroke }} />
            <Tooltip {...ct.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="Verim" fill="#10b981" barSize={14} name="Verim %" />
            <Bar yAxisId="right" dataKey="Sp. FC (g/kWh)" fill="#f59e0b" barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── 9. ADAS Impact ─────────────────────────────────────────────
function AdasImpactSection() {
  const { data, loading, error } = useApi(api.getAdasImpact);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.adas_data;

  const techLabels = {
    aux_tech_fan: 'Fan', aux_tech_ac: 'Klima',
    aux_tech_ps: 'Direksiyon', aux_tech_es: 'Elek. Sis.',
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">ADAS & Teknoloji Konfigürasyonu</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-2 text-slate-400">Varyant</th>
                <th className="text-left py-2 px-2 text-slate-400">Model</th>
                <th className="text-left py-2 px-2 text-slate-400">ADAS</th>
                <th className="text-left py-2 px-2 text-slate-400">Vites Stratejisi</th>
                <th className="text-left py-2 px-2 text-slate-400">Fan</th>
                <th className="text-left py-2 px-2 text-slate-400">Klima</th>
                <th className="text-left py-2 px-2 text-slate-400">Direksiyon</th>
                <th className="text-left py-2 px-2 text-slate-400">Elek. Sis.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                  <td className="py-1.5 px-2 text-blue-400 font-mono text-[10px]">{v.file}</td>
                  <td className="py-1.5 px-2 text-white">{v.vehicle_model}</td>
                  <td className="py-1.5 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.adas_tech && v.adas_tech !== 'None' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'}`}>
                      {v.adas_tech || 'Yok'}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-slate-300">{v.shift_strategy || '—'}</td>
                  <td className="py-1.5 px-2 text-slate-300 text-[10px]">{v.aux_tech_fan || '—'}</td>
                  <td className="py-1.5 px-2 text-slate-300 text-[10px]">{v.aux_tech_ac || '—'}</td>
                  <td className="py-1.5 px-2 text-slate-300 text-[10px]">{v.aux_tech_ps || '—'}</td>
                  <td className="py-1.5 px-2 text-slate-300 text-[10px]">{v.aux_tech_es || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Per-variant mission CO2 breakdown */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">Varyant Bazlı Misyon CO₂ & ICE Durumu</h3>
        <div className="space-y-3">
          {items.slice(0, 6).map((v, vi) => (
            <div key={vi} className="border border-white/5 rounded-xl p-3">
              <div className="text-xs font-semibold text-white mb-2">{v.vehicle_model} <span className="text-slate-500">({v.file})</span></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {v.missions.map((m, mi) => (
                  <div key={mi} className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-500">{m.mission} ({m.loading === 'Low' ? 'D' : 'R'})</div>
                    <div className="text-sm font-bold text-blue-400">{m.co2_g_km?.toFixed(0)} g/km</div>
                    {m.ICE_off_ts != null && (
                      <div className="text-[10px] text-emerald-400">ICE Kapalı: {m.ICE_off_ts?.toFixed(1)}%</div>
                    )}
                    {m.CoastingTimeShare != null && (
                      <div className="text-[10px] text-amber-400">Serbest: {m.CoastingTimeShare?.toFixed(1)}%</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── 10. Component Efficiency ───────────────────────────────────
function ComponentEfficiencySection() {
  const ct = useChartTheme();
  const { data, loading, error } = useApi(api.getComponentEfficiency);
  const [selectedLoading, setSelectedLoading] = useState('Low');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data.efficiency.filter(d => d.loading === selectedLoading);
  const chartData = items.map(d => ({
    mission: d.mission,
    'Motor': (d.avg_engine_efficiency || 0) * 100,
    'Şanzıman': (d.avg_gearbox_efficiency || 0) * 100,
    'Tork Konv. (kilitsiz)': (d.avg_tc_efficiency_no_lockup || 0) * 100,
    'Tork Konv. (kilitli)': (d.avg_tc_efficiency_lockup || 0) * 100,
    'Dingil': (d.avg_axlegear_efficiency || 0) * 100,
  }));

  const radarData = items.map(d => ({
    subject: d.mission,
    Motor: (d.avg_engine_efficiency || 0) * 100,
    Şanzıman: (d.avg_gearbox_efficiency || 0) * 100,
    Dingil: (d.avg_axlegear_efficiency || 0) * 100,
    TC: (d.avg_tc_efficiency_lockup || 0) * 100,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['Low', 'Reference'].map(l => (
          <button key={l} onClick={() => setSelectedLoading(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedLoading === l ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {l === 'Low' ? 'Düşük Yük' : 'Referans Yük'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Komponent Verimliliği (%)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid {...ct.grid} />
              <XAxis {...ct.axis} dataKey="mission" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
              <YAxis {...ct.axis} domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft', fill: ct.axis.stroke }} />
              <Tooltip {...ct.tooltip} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Motor" fill="#3b82f6" barSize={12} />
              <Bar dataKey="Şanzıman" fill="#10b981" barSize={12} />
              <Bar dataKey="Tork Konv. (kilitsiz)" fill="#f59e0b" barSize={12} />
              <Bar dataKey="Tork Konv. (kilitli)" fill="#06b6d4" barSize={12} />
              <Bar dataKey="Dingil" fill="#8b5cf6" barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Radar — Misyon Bazlı Verim</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
              <Radar name="Motor" dataKey="Motor" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
              <Radar name="Şanzıman" dataKey="Şanzıman" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
              <Radar name="Dingil" dataKey="Dingil" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
              <Radar name="TC" dataKey="TC" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip {...ct.tooltip} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {/* Efficiency Table */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">Verimlilik Detay</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-slate-400">Misyon</th>
                <th className="text-right py-2 px-3 text-slate-400">Motor %</th>
                <th className="text-right py-2 px-3 text-slate-400">Şanzıman %</th>
                <th className="text-right py-2 px-3 text-slate-400">TC (Kilitsiz) %</th>
                <th className="text-right py-2 px-3 text-slate-400">TC (Kilitli) %</th>
                <th className="text-right py-2 px-3 text-slate-400">Dingil %</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="py-1.5 px-3 text-white font-medium">{d.mission}</td>
                  <td className="py-1.5 px-3 text-right text-blue-400 font-mono">{((d.avg_engine_efficiency || 0) * 100).toFixed(1)}</td>
                  <td className="py-1.5 px-3 text-right text-emerald-400 font-mono">{((d.avg_gearbox_efficiency || 0) * 100).toFixed(1)}</td>
                  <td className="py-1.5 px-3 text-right text-amber-400 font-mono">{((d.avg_tc_efficiency_no_lockup || 0) * 100).toFixed(1)}</td>
                  <td className="py-1.5 px-3 text-right text-cyan-400 font-mono">{((d.avg_tc_efficiency_lockup || 0) * 100).toFixed(1)}</td>
                  <td className="py-1.5 px-3 text-right text-violet-400 font-mono">{((d.avg_axlegear_efficiency || 0) * 100).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════════════════════════════════
export default function EnerjiAnaliziPanel() {
  const [tab, setTab] = useState('energy');

  const SECTION_MAP = {
    energy: EnergyFlowSection,
    dynamics: DrivingDynamicsSection,
    gear: GearUsageSection,
    drivetrain: DrivetrainLossSection,
    busaux: BusAuxSection,
    waterfall: FCWaterfallSection,
    loading: LoadingSensitivitySection,
    engine: EngineOperatingSection,
    adas: AdasImpactSection,
    component: ComponentEfficiencySection,
  };

  const ActiveSection = SECTION_MAP[tab];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 via-violet-600/10 to-pink-600/10 border border-white/10 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.08),transparent_60%)]" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Enerji & Performans Analizi</h1>
            <p className="text-sm text-slate-400 mt-0.5">VECTO .vsum derin analiz — 196 kolon, 10 analiz modülü</p>
          </div>
        </div>
        {/* Tab Row */}
        <div className="relative mt-5 flex gap-1 flex-wrap bg-white/5 rounded-xl p-1 backdrop-blur-sm border border-white/10">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                tab === t.key ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              {tab === t.key && (
                <motion.div layoutId="eatab"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg shadow-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
              )}
              <svg className="w-3.5 h-3.5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
              </svg>
              <span className="relative z-10 hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Section Render */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <ActiveSection />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
