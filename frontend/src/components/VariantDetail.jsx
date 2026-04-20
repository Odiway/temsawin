import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ScatterChart, Scatter, ResponsiveContainer, BarChart, Bar, Area, AreaChart,
  Cell,
} from 'recharts';
import { generateVariantPdf, usePdfState } from './usePdfExport';

const SUBGROUP_COLORS = { P31SD: '#34d399', P31DD: '#60a5fa', P32SD: '#fbbf24', P32DD: '#f87171' };
const MISSION_ORDER = ['Heavy Urban', 'Urban', 'Suburban', 'Interurban', 'Coach'];

/* ── Shared chart theme ── */
const CHART_GRID = { strokeDasharray: '3 3', stroke: '#1e293b', strokeOpacity: 0.6 };
const CHART_AXIS = { stroke: '#475569', fontSize: 11, fontFamily: 'Inter', tickLine: false };
const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148,163,184,0.15)',
    borderRadius: '10px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)',
    padding: '10px 14px',
    fontSize: '12px',
  },
  labelStyle: { color: '#94a3b8', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#e2e8f0', padding: '2px 0' },
  cursor: { stroke: 'rgba(148,163,184,0.2)', strokeWidth: 1 },
};

/* ── Color palette for scatter ── */
const SCATTER_PALETTE = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#f472b6', '#2dd4bf', '#fb923c', '#818cf8', '#a3e635',
  '#e879f9', '#22d3ee', '#facc15', '#4ade80', '#f97316',
];

/* ── Gradient bar fill with rounded gradient defs ── */
const BAR_GRADIENT = (
  <defs>
    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
    </linearGradient>
    <linearGradient id="torqueGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.15} />
      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="dragGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#f87171" stopOpacity={0.1} />
      <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
    </linearGradient>
  </defs>
);

/* ── Panel wrapper ── */
function Panel({ children, className = '' }) {
  return (
    <div className={`bg-[#0f172a]/80 backdrop-blur-sm border border-slate-700/40 rounded-2xl overflow-hidden shadow-lg shadow-black/10 ${className}`}>
      {children}
    </div>
  );
}
function PanelHeader({ title, right }) {
  return (
    <div className="px-6 py-4 border-b border-slate-700/30 flex items-center justify-between">
      <h3 className="text-[13px] font-semibold text-slate-200 tracking-tight">{title}</h3>
      {right && <div className="text-xs text-slate-500">{right}</div>}
    </div>
  );
}

export default function VariantDetail({ variantId, onBack }) {
  const [data, setData] = useState(null);
  const [fuelMap, setFuelMap] = useState([]);
  const [loadCurves, setLoadCurves] = useState([]);
  const [gearRatios, setGearRatios] = useState([]);
  const [outputData, setOutputData] = useState(null);
  const [outputLoading, setOutputLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('specs');
  const { exporting, run: runPdf } = usePdfState();

  useEffect(() => {
    api.getVariant(variantId).then(setData).catch(console.error);
    api.getVariantFuelMap(variantId).then(setFuelMap).catch(console.error);
    api.getVariantLoadCurves(variantId).then(setLoadCurves).catch(console.error);
    api.getVariantGearRatios(variantId).then(setGearRatios).catch(console.error);
  }, [variantId]);

  useEffect(() => {
    if (!data?.variant?.variant_code) return;
    setOutputLoading(true);
    api.getVariantResultDetail(data.variant.variant_code)
      .then(setOutputData)
      .catch(() => setOutputData(null))
      .finally(() => setOutputLoading(false));
  }, [data?.variant?.variant_code]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  const v = data.variant;
  const veh = data.vehicle;
  const hasOutput = outputData && outputData.summary;
  const tabs = ['specs', 'fuel-map', 'torque-curve', 'gearbox', ...(hasOutput ? ['results'] : [])];
  const tabLabels = {
    specs: 'Teknik Özellikler',
    'fuel-map': 'Yakıt Haritası',
    'torque-curve': 'Tork Eğrisi',
    gearbox: 'Şanzıman',
    results: 'VECTO Sonuçları',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start gap-5">
        <button
          onClick={onBack}
          className="mt-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-200"
        >
          ← Geri
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-50 tracking-tight truncate">{v.variant_code}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {veh?.model_name} — {v.engine_manufacturer} {v.engine_model}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => runPdf(generateVariantPdf, {
              variant: v, vehicle: veh, counts: data.data_counts,
              fuelMap, loadCurves, gearRatios, outputData,
            })}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600/10 text-red-400 ring-1 ring-red-500/20 text-[11px] font-semibold hover:bg-red-600/20 transition-all duration-200 disabled:opacity-50"
          >
            {exporting ? (
              <><div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> PDF Oluşturuluyor...</>
            ) : (
              <><svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg> PDF İndir</>
            )}
          </button>
          <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
            v.engine_type === 'diesel' ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' :
            v.engine_type === 'electric' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
            'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20'
          }`}>
            {v.engine_type}
          </span>
          <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 uppercase tracking-wide ring-1 ring-blue-500/20">
            {veh?.category}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-slate-700/40">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-[13px] font-medium border-b-2 transition-all duration-200 ${
              activeTab === tab
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="animate-fade-in">
        {activeTab === 'specs' && <SpecsTab variant={v} vehicle={veh} counts={data.data_counts} />}
        {activeTab === 'fuel-map' && <FuelMapTab data={fuelMap} />}
        {activeTab === 'torque-curve' && <TorqueCurveTab data={loadCurves} />}
        {activeTab === 'gearbox' && <GearboxTab ratios={gearRatios} variant={v} />}
        {activeTab === 'results' && hasOutput && <ResultsTab output={outputData} />}
        {activeTab === 'results' && outputLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SPECS TAB
   ══════════════════════════════════════════════════════════ */
function SpecsTab({ variant: v, vehicle: veh, counts }) {
  const sections = [
    {
      title: 'Motor',
      icon: '⚙',
      items: [
        ['Üretici', v.engine_manufacturer],
        ['Model', v.engine_model],
        ['Sertifika No', v.engine_cert_number],
        ['Hacim', v.displacement_cc ? `${v.displacement_cc} cc` : null],
        ['Nominal Devir', v.rated_speed_rpm ? `${v.rated_speed_rpm} rpm` : null],
        ['Nominal Güç', v.rated_power_w ? `${Math.round(v.rated_power_w / 1000)} kW (${Math.round(v.rated_power_w / 745.7)} HP)` : null],
        ['Maks Tork', v.max_torque_nm ? `${v.max_torque_nm} Nm` : null],
        ['Rölanti', v.idling_speed_rpm ? `${v.idling_speed_rpm} rpm` : null],
        ['Yakıt Tipi', v.fuel_type],
      ],
    },
    {
      title: 'Araç',
      icon: '🚌',
      items: [
        ['Model', veh?.model_name],
        ['Kategori', veh?.category],
        ['Şasi', veh?.chassis_config],
        ['Aks Konfigürasyonu', veh?.axle_config],
        ['Maks GVW', v.max_laden_mass_kg ? `${v.max_laden_mass_kg} kg` : null],
        ['Sıfır Emisyon', v.zero_emission_vehicle ? 'Evet' : 'Hayır'],
      ],
    },
    {
      title: 'Şanzıman',
      icon: '⚡',
      items: [
        ['Üretici', v.gearbox_manufacturer],
        ['Model', v.gearbox_model],
        ['Tip', v.gearbox_type],
        ['Vites Sayısı', v.gear_count],
      ],
    },
    {
      title: 'Aks & Lastik',
      icon: '🔧',
      items: [
        ['Aks Oranı', v.axle_ratio],
        ['Aks Tipi', v.axle_type],
        ['Ön Lastik Üretici', v.tyre_front_manufacturer || v.tyre_manufacturer],
        ['Ön Lastik Model', v.tyre_front_model || v.tyre_model],
        ['Ön Lastik Boyut', v.tyre_front_dimension || v.tyre_dimension],
        ['Arka Lastik Üretici', v.tyre_rear_manufacturer || v.tyre_manufacturer],
        ['Arka Lastik Model', v.tyre_rear_model || v.tyre_model],
        ['Arka Lastik Boyut', v.tyre_rear_dimension || v.tyre_dimension],
      ],
    },
    {
      title: 'ADAS & Yardımcı',
      icon: '📡',
      items: [
        ['Motor Start/Stop', v.engine_stop_start ? 'Evet' : 'Hayır'],
        ['Eco Roll', v.eco_roll ? 'Evet' : 'Hayır'],
        ['Prediktif Cruise', v.predictive_cruise],
        ['Fan Teknolojisi', v.fan_technology],
        ['Direksiyon Pompa', v.steering_pump_tech],
        ['Alternatör', v.alternator_tech],
        ['Retarder', v.retarder_type],
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Yakıt Haritası Noktası', counts?.fuel_map_points || 0, 'from-blue-500/10 to-blue-600/5', 'text-blue-400', 'ring-blue-500/20'],
          ['Yük Eğrisi Noktası', counts?.load_curve_points || 0, 'from-emerald-500/10 to-emerald-600/5', 'text-emerald-400', 'ring-emerald-500/20'],
          ['Vites Oranı', counts?.gear_ratios || 0, 'from-amber-500/10 to-amber-600/5', 'text-amber-400', 'ring-amber-500/20'],
        ].map(([label, val, grad, textColor, ring]) => (
          <div key={label} className={`bg-gradient-to-br ${grad} ring-1 ${ring} rounded-xl p-5 text-center transition-transform duration-200 hover:scale-[1.02]`}>
            <div className={`text-2xl font-extrabold ${textColor} tabular-nums`}>{val}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-semibold">{label}</div>
          </div>
        ))}
      </div>

      {/* Spec sections */}
      <div className="grid grid-cols-2 gap-4">
        {sections.map((sec) => (
          <Panel key={sec.title}>
            <div className="px-5 py-3.5 border-b border-slate-700/30 flex items-center gap-2">
              <span className="text-sm">{sec.icon}</span>
              <h3 className="text-[13px] font-semibold text-blue-400 tracking-tight">{sec.title}</h3>
            </div>
            <div className="px-5 py-4 space-y-0">
              {sec.items.filter(([, val]) => val != null).map(([key, val], i) => (
                <div key={key} className={`flex justify-between items-center py-2.5 text-[13px] ${i > 0 ? 'border-t border-slate-800/40' : ''}`}>
                  <span className="text-slate-500">{key}</span>
                  <span className="text-slate-200 font-medium text-right">{val}</span>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FUEL MAP TAB
   ══════════════════════════════════════════════════════════ */
function FuelMapTab({ data }) {
  if (data.length === 0) return <p className="text-slate-500 py-12 text-center text-sm">Yakıt haritası verisi yok</p>;

  const speeds = [...new Set(data.map((d) => d.engine_speed))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title="Yakıt Tüketim Haritası (Tork vs Yakıt)" right={`${data.length} veri noktası`} />
        <div className="p-6">
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="torque" name="Tork (Nm)" {...CHART_AXIS} label={{ value: 'Tork (Nm)', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 11 } }} />
              <YAxis dataKey="fuel_consumption" name="Yakıt (g/h)" {...CHART_AXIS} label={{ value: 'Yakıt (g/h)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#64748b', fontSize: 11 } }} />
              <Tooltip {...CHART_TOOLTIP} formatter={(val) => [Math.round(val * 100) / 100, '']} />
              <Legend
                wrapperStyle={{ paddingTop: 16, fontSize: 11 }}
                iconType="circle"
                iconSize={8}
              />
              {speeds.slice(0, 15).map((spd, i) => (
                <Scatter
                  key={spd}
                  name={`${Math.round(spd)} rpm`}
                  data={data.filter((d) => d.engine_speed === spd)}
                  fill={SCATTER_PALETTE[i % SCATTER_PALETTE.length]}
                  fillOpacity={0.75}
                  r={4}
                  strokeWidth={0}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Veri Tablosu" right={`İlk ${Math.min(200, data.length)} kayıt`} />
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-[#0f172a] z-10">
              <tr className="border-b border-slate-700/40">
                <th className="px-6 py-3 text-left text-[11px] text-slate-500 uppercase tracking-wider font-semibold">RPM</th>
                <th className="px-6 py-3 text-left text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Tork (Nm)</th>
                <th className="px-6 py-3 text-left text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Yakıt (g/h)</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {data.slice(0, 200).map((d, i) => (
                <tr key={i} className="border-t border-slate-800/25 hover:bg-slate-800/20 transition-colors duration-100">
                  <td className="px-6 py-2.5 font-mono tabular-nums">{d.engine_speed}</td>
                  <td className="px-6 py-2.5 font-mono tabular-nums">{d.torque}</td>
                  <td className="px-6 py-2.5 font-mono tabular-nums">{d.fuel_consumption}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TORQUE CURVE TAB
   ══════════════════════════════════════════════════════════ */
function TorqueCurveTab({ data }) {
  if (data.length === 0) return <p className="text-slate-500 py-12 text-center text-sm">Tork eğrisi verisi yok</p>;

  return (
    <Panel>
      <PanelHeader title="Full Load & Drag Tork Eğrileri" right="RPM bazlı" />
      <div className="p-6">
        <ResponsiveContainer width="100%" height={440}>
          <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            {BAR_GRADIENT}
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              dataKey="engine_speed"
              name="RPM"
              {...CHART_AXIS}
              label={{ value: 'Motor Devir (RPM)', position: 'insideBottom', offset: -5, style: { fill: '#64748b', fontSize: 11 } }}
            />
            <YAxis
              {...CHART_AXIS}
              label={{ value: 'Tork (Nm)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#64748b', fontSize: 11 } }}
            />
            <Tooltip {...CHART_TOOLTIP} />
            <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="max_torque"
              name="Maks Tork (Nm)"
              stroke="#60a5fa"
              strokeWidth={2.5}
              fill="url(#torqueGrad)"
              dot={false}
              activeDot={{ r: 5, stroke: '#60a5fa', strokeWidth: 2, fill: '#0f172a' }}
            />
            <Area
              type="monotone"
              dataKey="drag_torque"
              name="Drag Tork (Nm)"
              stroke="#f87171"
              strokeWidth={2}
              fill="url(#dragGrad)"
              dot={false}
              activeDot={{ r: 4, stroke: '#f87171', strokeWidth: 2, fill: '#0f172a' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════
   GEARBOX TAB
   ══════════════════════════════════════════════════════════ */
function GearboxTab({ ratios, variant }) {
  if (ratios.length === 0) return <p className="text-slate-500 py-12 text-center text-sm">Vites oranı verisi yok</p>;

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Chart — 3 cols */}
      <div className="col-span-3">
        <Panel className="h-full">
          <PanelHeader title="Vites Oranları" />
          <div className="p-6">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={ratios} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                {BAR_GRADIENT}
                <CartesianGrid {...CHART_GRID} />
                <XAxis
                  dataKey="gear_number"
                  {...CHART_AXIS}
                  tickFormatter={(v) => `${v}. Vites`}
                />
                <YAxis {...CHART_AXIS} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value) => [value.toFixed(4), 'Oran']}
                  labelFormatter={(label) => `${label}. Vites`}
                />
                <Bar dataKey="ratio" name="Oran" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {ratios.map((_, i) => (
                    <Cell key={i} fillOpacity={1 - i * 0.06} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Details — 2 cols */}
      <div className="col-span-2">
        <Panel className="h-full">
          <PanelHeader title="Şanzıman Detayları" />
          <div className="p-5 space-y-0">
            {[
              ['Üretici', variant.gearbox_manufacturer],
              ['Model', variant.gearbox_model],
              ['Aks Oranı', variant.axle_ratio],
            ].map(([k, val], i) => (
              <div key={k} className={`flex justify-between items-center py-3 text-[13px] ${i > 0 ? 'border-t border-slate-800/40' : ''}`}>
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-200 font-semibold">{val || '—'}</span>
              </div>
            ))}

            <div className="mt-4 pt-3 border-t border-slate-700/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Vites</span>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Oran</span>
              </div>
              {ratios.map((r, i) => (
                <div key={r.gear_number} className={`flex justify-between items-center py-2.5 ${i > 0 ? 'border-t border-slate-800/30' : ''}`}>
                  <span className="text-[13px] text-slate-400">{r.gear_number}. Vites</span>
                  <span className="text-[13px] font-mono font-semibold text-slate-200 tabular-nums">{r.ratio.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RESULTS TAB
   ══════════════════════════════════════════════════════════ */
function ResultsTab({ output }) {
  const subgroups = Object.entries(output.subgroups || {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Sonuç', value: output.summary?.total_results, color: 'text-slate-50', grad: 'from-slate-500/10 to-slate-600/5', ring: 'ring-slate-500/20' },
          { label: 'Ort CO2', value: output.summary?.co2_avg, unit: 'g/km', color: 'text-orange-400', grad: 'from-orange-500/10 to-orange-600/5', ring: 'ring-orange-500/20' },
          { label: 'Min CO2', value: output.summary?.co2_min, unit: 'g/km', color: 'text-emerald-400', grad: 'from-emerald-500/10 to-emerald-600/5', ring: 'ring-emerald-500/20' },
          { label: 'Max CO2', value: output.summary?.co2_max, unit: 'g/km', color: 'text-red-400', grad: 'from-red-500/10 to-red-600/5', ring: 'ring-red-500/20' },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-gradient-to-br ${kpi.grad} ring-1 ${kpi.ring} rounded-xl p-5 text-center transition-transform duration-200 hover:scale-[1.02]`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{kpi.label}</div>
            <div className={`text-2xl font-extrabold ${kpi.color} mt-2 tabular-nums`}>{kpi.value}</div>
            {kpi.unit && <div className="text-[10px] text-slate-600 mt-0.5 font-medium">{kpi.unit}</div>}
          </div>
        ))}
      </div>

      {/* Vehicle Info */}
      {output.vehicle && (
        <Panel>
          <PanelHeader title="VECTO Çıktı Bilgileri" />
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 gap-x-8 gap-y-3">
              {[
                ['Araç Grubu', output.vehicle.vehicle_group],
                ['Kategori', output.vehicle.vehicle_category],
                ['Motor Gücü', output.vehicle.engine_rated_power_kw ? `${output.vehicle.engine_rated_power_kw} kW` : null],
                ['Yakıt', output.vehicle.fuel_type],
                ['Aks', output.vehicle.axle_configuration],
                ['Maks Yüklü Kütle', output.vehicle.tech_max_laden_mass_kg ? `${output.vehicle.tech_max_laden_mass_kg} kg` : null],
                ['VECTO Versiyon', output.vehicle.tool_version],
              ].filter(([, v]) => v != null).map(([k, val]) => (
                <div key={k} className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{k}</span>
                  <span className="text-[13px] text-slate-200 font-semibold mt-0.5">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Subgroup pills */}
      <div className="flex gap-3 flex-wrap">
        {subgroups.map(([sg, sgData]) => (
          <div
            key={sg}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl ring-1 ring-slate-700/40 bg-[#0f172a]/80 backdrop-blur-sm transition-transform duration-200 hover:scale-[1.03]"
          >
            <div className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-[#0f172a]" style={{ backgroundColor: SUBGROUP_COLORS[sg] || '#8b949e', ringColor: SUBGROUP_COLORS[sg] || '#8b949e' }} />
            <span className="text-xs font-bold" style={{ color: SUBGROUP_COLORS[sg] || '#8b949e' }}>{sg}</span>
            <span className="text-xs text-slate-400 font-medium">{sgData.co2_avg} g/km</span>
          </div>
        ))}
      </div>

      {/* Mission tables */}
      {subgroups.map(([sg, sgData]) => (
        <Panel key={sg}>
          <div className="px-6 py-3.5 border-b border-slate-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SUBGROUP_COLORS[sg] }} />
              <span className="text-sm font-bold text-slate-100">{sg}</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              CO2 Ort: <b className="ml-1" style={{ color: SUBGROUP_COLORS[sg] }}>{sgData.co2_avg} g/km</b>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-700/30">
                  {['Misyon', 'Yük', 'CO2 g/km', 'CO2 g/pkm', 'Yakıt g/km', 'L/100km', 'Enerji MJ/km', 'Mesafe km', 'Yolcu', 'Hız km/h'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sgData.missions || [])
                  .sort((a, b) => {
                    const mi = MISSION_ORDER.indexOf(a.mission) - MISSION_ORDER.indexOf(b.mission);
                    return mi !== 0 ? mi : (a.loading || '').localeCompare(b.loading || '');
                  })
                  .map((m, j) => (
                    <tr key={j} className="border-b border-slate-800/20 hover:bg-slate-800/15 transition-colors duration-100">
                      <td className="px-4 py-3 font-semibold text-slate-200">{m.mission}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide ${
                          m.loading?.includes('Low')
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                        }`}>
                          {m.loading?.includes('Low') ? 'LOW' : 'REF'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-orange-400 tabular-nums">{m.co2_g_km?.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-emerald-400 tabular-nums">{m.co2_g_pkm?.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-amber-400 tabular-nums">{m.fc_g_km?.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-blue-400 tabular-nums">{m.fc_l_100km?.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-purple-400 tabular-nums">{m.energy_mj_km?.toFixed(2) || '—'}</td>
                      <td className="px-4 py-3 font-mono text-slate-400 tabular-nums">{m.distance_km?.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-slate-400 tabular-nums">{m.passenger_count?.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-slate-400 tabular-nums">{m.avg_speed?.toFixed(1)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}
