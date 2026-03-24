import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ScatterChart, Scatter, ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const SUBGROUP_COLORS = { P31SD: '#3fb950', P31DD: '#58a6ff', P32SD: '#d29922', P32DD: '#f85149' };
const MISSION_ORDER = ['Heavy Urban', 'Urban', 'Suburban', 'Interurban', 'Coach'];

export default function VariantDetail({ variantId, onBack }) {
  const [data, setData] = useState(null);
  const [fuelMap, setFuelMap] = useState([]);
  const [loadCurves, setLoadCurves] = useState([]);
  const [gearRatios, setGearRatios] = useState([]);
  const [outputData, setOutputData] = useState(null);
  const [outputLoading, setOutputLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('specs');

  useEffect(() => {
    api.getVariant(variantId).then(setData).catch(console.error);
    api.getVariantFuelMap(variantId).then(setFuelMap).catch(console.error);
    api.getVariantLoadCurves(variantId).then(setLoadCurves).catch(console.error);
    api.getVariantGearRatios(variantId).then(setGearRatios).catch(console.error);
  }, [variantId]);

  // Load output results once we have the variant code
  useEffect(() => {
    if (!data?.variant?.variant_code) return;
    setOutputLoading(true);
    api.getVariantResultDetail(data.variant.variant_code)
      .then(setOutputData)
      .catch(() => setOutputData(null))
      .finally(() => setOutputLoading(false));
  }, [data?.variant?.variant_code]);

  if (!data) {
    return <div className="text-center py-12 text-slate-500">Loading...</div>;
  }

  const v = data.variant;
  const veh = data.vehicle;
  const hasOutput = outputData && outputData.summary;
  const tabs = ['specs', 'fuel-map', 'torque-curve', 'gearbox', ...(hasOutput ? ['results'] : [])];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-blue-400 transition"
        >
          ← Geri
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-100">{v.variant_code}</h2>
          <p className="text-sm text-slate-500">
            {veh?.model_name} — {v.engine_manufacturer} {v.engine_model}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            v.engine_type === 'diesel' ? 'bg-amber-500/15 text-amber-400' :
            v.engine_type === 'electric' ? 'bg-emerald-500/15 text-emerald-400' :
            'bg-purple-500/15 text-purple-400'
          }`}>
            {v.engine_type}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 uppercase">
            {veh?.category}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'specs' ? 'Teknik Özellikler' :
             tab === 'fuel-map' ? 'Yakıt Haritası' :
             tab === 'torque-curve' ? 'Tork Eğrisi' :
             tab === 'results' ? `VECTO Sonuçları` : 'Şanzıman'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'specs' && <SpecsTab variant={v} vehicle={veh} counts={data.data_counts} />}
      {activeTab === 'fuel-map' && <FuelMapTab data={fuelMap} />}
      {activeTab === 'torque-curve' && <TorqueCurveTab data={loadCurves} />}
      {activeTab === 'gearbox' && <GearboxTab ratios={gearRatios} variant={v} />}
      {activeTab === 'results' && hasOutput && <ResultsTab output={outputData} />}
      {activeTab === 'results' && outputLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function SpecsTab({ variant: v, vehicle: veh, counts }) {
  const sections = [
    {
      title: 'Motor',
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
      items: [
        ['Üretici', v.gearbox_manufacturer],
        ['Model', v.gearbox_model],
        ['Tip', v.gearbox_type],
        ['Vites Sayısı', v.gear_count],
      ],
    },
    {
      title: 'Aks & Lastik',
      items: [
        ['Aks Oranı', v.axle_ratio],
        ['Aks Tipi', v.axle_type],
        ['\u00d6n Lastik Üretici', v.tyre_front_manufacturer || v.tyre_manufacturer],
        ['\u00d6n Lastik Model', v.tyre_front_model || v.tyre_model],
        ['\u00d6n Lastik Boyut', v.tyre_front_dimension || v.tyre_dimension],
        ['Arka Lastik Üretici', v.tyre_rear_manufacturer || v.tyre_manufacturer],
        ['Arka Lastik Model', v.tyre_rear_model || v.tyre_model],
        ['Arka Lastik Boyut', v.tyre_rear_dimension || v.tyre_dimension],
      ],
    },
    {
      title: 'ADAS & Yardımcı',
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
    <div className="space-y-4">
      {/* Data counts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Yakıt Haritası Noktası', counts?.fuel_map_points || 0],
          ['Yük Eğrisi Noktası', counts?.load_curve_points || 0],
          ['Vites Oranı', counts?.gear_ratios || 0],
        ].map(([label, val]) => (
          <div key={label} className="bg-[#0d1117] border border-slate-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-400">{val}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sections.map((sec) => (
          <div key={sec.title} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-3">{sec.title}</h3>
            <div className="space-y-1.5">
              {sec.items.filter(([, val]) => val != null).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-slate-500">{key}</span>
                  <span className="text-slate-300 font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FuelMapTab({ data }) {
  if (data.length === 0) return <p className="text-slate-500 py-8 text-center">Yakıt haritası verisi yok</p>;

  // Group by engine speed for scatter
  const speeds = [...new Set(data.map((d) => d.engine_speed))].sort((a, b) => a - b);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

  return (
    <div className="space-y-4">
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Yakıt Tüketim Haritası (Tork vs Yakıt)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="torque" name="Tork (Nm)" stroke="#64748b" fontSize={11} />
            <YAxis dataKey="fuel_consumption" name="Yakıt (g/h)" stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(val) => [Math.round(val), '']}
            />
            <Legend />
            {speeds.slice(0, 10).map((spd, i) => (
              <Scatter
                key={spd}
                name={`${Math.round(spd)} rpm`}
                data={data.filter((d) => d.engine_speed === spd)}
                fill={colors[i % colors.length]}
                r={3}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 max-h-[300px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#111827]">
            <tr className="text-left text-slate-500 uppercase tracking-wider">
              <th className="pb-2 pr-4">RPM</th>
              <th className="pb-2 pr-4">Tork (Nm)</th>
              <th className="pb-2">Yakıt (g/h)</th>
            </tr>
          </thead>
          <tbody className="text-slate-400">
            {data.slice(0, 200).map((d, i) => (
              <tr key={i} className="border-t border-slate-800/30">
                <td className="py-1 pr-4">{d.engine_speed}</td>
                <td className="py-1 pr-4">{d.torque}</td>
                <td className="py-1">{d.fuel_consumption}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TorqueCurveTab({ data }) {
  if (data.length === 0) return <p className="text-slate-500 py-8 text-center">Tork eğrisi verisi yok</p>;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Full Load & Drag Tork Eğrileri</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="engine_speed" name="RPM" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="max_torque"
            name="Maks Tork (Nm)"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="drag_torque"
            name="Drag Tork (Nm)"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function GearboxTab({ ratios, variant }) {
  if (ratios.length === 0) return <p className="text-slate-500 py-8 text-center">Vites oranı verisi yok</p>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Vites Oranları</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ratios}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="gear_number" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            />
            <Bar dataKey="ratio" name="Oran" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Şanzıman Detayları</h3>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Üretici</span>
            <span className="text-slate-300">{variant.gearbox_manufacturer || '-'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Model</span>
            <span className="text-slate-300">{variant.gearbox_model || '-'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Aks Oranı</span>
            <span className="text-slate-300">{variant.axle_ratio || '-'}</span>
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 uppercase tracking-wider">
              <th className="pb-2">Vites</th>
              <th className="pb-2 text-right">Oran</th>
            </tr>
          </thead>
          <tbody>
            {ratios.map((r) => (
              <tr key={r.gear_number} className="border-t border-slate-800/30 text-slate-400">
                <td className="py-1.5">{r.gear_number}. Vites</td>
                <td className="py-1.5 text-right font-mono text-slate-300">{r.ratio.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultsTab({ output }) {
  const subgroups = Object.entries(output.subgroups || {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Toplam Sonuç</div>
          <div className="text-xl font-black text-slate-100 mt-1">{output.summary?.total_results}</div>
        </div>
        <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Ort CO2</div>
          <div className="text-xl font-black text-[#E30613] mt-1">{output.summary?.co2_avg}</div>
          <div className="text-[9px] text-slate-500">g/km</div>
        </div>
        <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Min CO2</div>
          <div className="text-xl font-black text-emerald-400 mt-1">{output.summary?.co2_min}</div>
          <div className="text-[9px] text-slate-500">g/km</div>
        </div>
        <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Max CO2</div>
          <div className="text-xl font-black text-red-400 mt-1">{output.summary?.co2_max}</div>
          <div className="text-[9px] text-slate-500">g/km</div>
        </div>
      </div>

      {/* Vehicle output info */}
      {output.vehicle && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">VECTO Çıktı Bilgileri</h3>
          <div className="grid grid-cols-4 gap-4 text-xs">
            {[
              ['Araç Grubu', output.vehicle.vehicle_group],
              ['Kategori', output.vehicle.vehicle_category],
              ['Motor Gücü', output.vehicle.engine_rated_power_kw ? `${output.vehicle.engine_rated_power_kw} kW` : null],
              ['Yakıt', output.vehicle.fuel_type],
              ['Aks', output.vehicle.axle_configuration],
              ['Maks Yüklü Kütle', output.vehicle.tech_max_laden_mass_kg ? `${output.vehicle.tech_max_laden_mass_kg} kg` : null],
              ['VECTO Versiyon', output.vehicle.tool_version],
            ].filter(([, v]) => v != null).map(([k, val]) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-300 font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subgroup Badges */}
      <div className="flex gap-2">
        {subgroups.map(([sg, sgData]) => (
          <div key={sg} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-[#111827]">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SUBGROUP_COLORS[sg] || '#8b949e' }} />
            <span className="text-xs font-bold" style={{ color: SUBGROUP_COLORS[sg] || '#8b949e' }}>{sg}</span>
            <span className="text-xs text-slate-400">{sgData.co2_avg} g/km</span>
          </div>
        ))}
      </div>

      {/* Per-subgroup mission tables */}
      {subgroups.map(([sg, sgData]) => (
        <div key={sg} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SUBGROUP_COLORS[sg] }} />
              <span className="text-sm font-bold text-slate-100">{sg}</span>
            </div>
            <span className="text-xs text-slate-500">CO2 Ort: <b style={{ color: SUBGROUP_COLORS[sg] }}>{sgData.co2_avg} g/km</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  {['Misyon', 'Yük', 'CO2 g/km', 'CO2 g/pkm', 'Yakıt g/km', 'L/100km', 'Enerji MJ/km', 'Mesafe km', 'Yolcu', 'Hız km/h'].map(h => (
                    <th key={h} className="px-2 py-2 text-left font-bold whitespace-nowrap">{h}</th>
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
                    <tr key={j} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                      <td className="px-2 py-1.5 font-semibold text-slate-200">{m.mission}</td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${m.loading?.includes('Low') ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>
                          {m.loading?.includes('Low') ? 'LOW' : 'REF'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono font-bold text-[#E30613]">{m.co2_g_km?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-emerald-400">{m.co2_g_pkm?.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-amber-400">{m.fc_g_km?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-blue-400">{m.fc_l_100km?.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-purple-400">{m.energy_mj_km?.toFixed(2) || '—'}</td>
                      <td className="px-2 py-1.5 font-mono text-slate-400">{m.distance_km?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-slate-400">{m.passenger_count?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-slate-400">{m.avg_speed?.toFixed(1)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
