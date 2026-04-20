import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useChartTheme } from './ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

const SUBGROUP_COLORS = { P31SD: '#3fb950', P31DD: '#58a6ff', P32SD: '#d29922', P32DD: '#f85149' };
const MISSION_ORDER = ['Heavy Urban', 'Urban', 'Suburban', 'Interurban', 'Coach'];

export default function DigitalTwinPanel() {
  const ct = useChartTheme();
  const [twins, setTwins] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState(null);
  const [twinData, setTwinData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, complete, input_only, output_only

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      setTwins(await api.getDigitalTwinList());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const openTwin = async (code) => {
    setSelectedCode(code);
    setDetailLoading(true);
    try {
      setTwinData(await api.getDigitalTwin(code));
    } catch (e) { console.error(e); }
    setDetailLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div>;

  if (selectedCode && twinData) {
    return <TwinDetailView data={twinData} onBack={() => { setSelectedCode(null); setTwinData(null); }} onReload={loadList} />;
  }
  if (detailLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = (twins?.twins || []).filter(t => filter === 'all' || t.twin_status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#e6edf3]">Dijital Ikiz — Master Arac Gorunumu</h1>
        <p className="text-[13px] text-[#8b949e] mt-1">
          Her varyant icin girdi (XML spesifikasyon) + cikti (VECTO sonuc) verileri birlesik gorunum
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Toplam Varyant" value={twins?.total || 0} color="#e6edf3" />
        <KPI label="Tam Ikiz (Girdi+Cikti)" value={twins?.complete || 0} color="#3fb950" sub="complete" />
        <KPI label="Sadece Girdi" value={twins?.input_only || 0} color="#d29922" sub="input_only" />
        <KPI label="Sadece Cikti" value={twins?.output_only || 0} color="#58a6ff" sub="output_only" />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Tumu' },
          { key: 'complete', label: 'Tam Ikiz' },
          { key: 'input_only', label: 'Sadece Girdi' },
          { key: 'output_only', label: 'Sadece Cikti' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${filter === f.key ? 'bg-[#3b82f6] text-white' : 'bg-[#21262d] text-[#8b949e] hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Twin List */}
      <div className="t-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#21262d]">
              {['Durum', 'Varyant Kodu', 'Model', 'Grup', 'Guc', 'Yakit', 'Filo', 'Sonuc', 'Ort CO2', 'CO2 Aralik'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} onClick={() => openTwin(t.variant_code)}
                className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 cursor-pointer transition">
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    t.twin_status === 'complete' ? 'bg-[#3fb950]/15 text-[#3fb950]' :
                    t.twin_status === 'input_only' ? 'bg-[#d29922]/15 text-[#d29922]' :
                    'bg-[#58a6ff]/15 text-[#58a6ff]'
                  }`}>
                    {t.twin_status === 'complete' ? '● TAM' : t.twin_status === 'input_only' ? '◐ GIRDI' : '◑ CIKTI'}
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] font-mono text-[#e6edf3] font-semibold">{t.variant_code}</td>
                <td className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3]">{t.model || '—'}</td>
                <td className="px-3 py-2 text-[11px] text-[#8b949e]">{t.vehicle_group || '—'}</td>
                <td className="px-3 py-2 text-[11px] text-[#8b949e]">{t.power_kw ? `${t.power_kw} kW` : '—'}</td>
                <td className="px-3 py-2 text-[11px] text-[#8b949e]">{t.fuel_type || '—'}</td>
                <td className="px-3 py-2 text-[12px] font-bold text-[#58a6ff]">{t.fleet_count || 0}</td>
                <td className="px-3 py-2 text-[11px] text-[#8b949e]">{t.result_count || '—'}</td>
                <td className="px-3 py-2 text-[12px] font-bold text-[#f97316]">{t.avg_co2 || '—'}</td>
                <td className="px-3 py-2 text-[10px] text-[#484f58]">
                  {t.min_co2 && t.max_co2 ? `${t.min_co2} — ${t.max_co2}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-[#484f58]">Bu filtreye uygun varyant yok</div>
        )}
      </div>
    </div>
  );
}

function TwinDetailView({ data, onBack, onReload }) {
  const [activeTab, setActiveTab] = useState(data.twin_status === 'output_only' ? 'output' : 'overview');
  const [fleetCount, setFleetCount] = useState(data.input?.fleet_count || 0);
  const [savingFleet, setSavingFleet] = useState(false);

  const inp = data.input;
  const out = data.output;
  const tabs = [];
  tabs.push({ key: 'overview', label: 'Genel Bakis' });
  if (inp) tabs.push({ key: 'specs', label: 'Teknik Ozellikler' });
  if (out) tabs.push({ key: 'output', label: 'VECTO Sonuclari' });
  if (out) tabs.push({ key: 'charts', label: 'Grafikler' });

  const handleFleetSave = async () => {
    if (!inp?.variant_id) return;
    setSavingFleet(true);
    try {
      await api.updateFleetCounts([{ variant_id: inp.variant_id, fleet_count: fleetCount }]);
      onReload?.();
    } catch (e) { console.error(e); }
    setSavingFleet(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm text-[#8b949e] hover:text-[#3b82f6] transition">← Geri</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#e6edf3]">{data.variant_code}</h2>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
              data.twin_status === 'complete' ? 'bg-[#3fb950]/15 text-[#3fb950]' :
              data.twin_status === 'input_only' ? 'bg-[#d29922]/15 text-[#d29922]' :
              'bg-[#58a6ff]/15 text-[#58a6ff]'
            }`}>
              {data.twin_status === 'complete' ? 'TAM IKIZ' : data.twin_status === 'input_only' ? 'SADECE GIRDI' : 'SADECE CIKTI'}
            </span>
          </div>
          <p className="text-[12px] text-[#8b949e] mt-0.5">
            {inp?.vehicle_model || out?.vehicle_info?.model || '—'} — {inp?.engine?.model || ''} — {out?.vehicle_info?.vehicle_group || ''}
          </p>
        </div>
        {/* Fleet count control */}
        {inp?.variant_id && (
          <div className="flex items-center gap-3 bg-[#161b22] border border-[#21262d] rounded-lg px-4 py-2">
            <span className="text-[10px] text-[#484f58] uppercase font-bold">Filo</span>
            <button onClick={() => setFleetCount(Math.max(0, fleetCount - 1))}
              className="w-7 h-7 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded text-[16px] font-bold flex items-center justify-center">−</button>
            <span className="text-[20px] font-black text-[#58a6ff] w-10 text-center">{fleetCount}</span>
            <button onClick={() => setFleetCount(fleetCount + 1)}
              className="w-7 h-7 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded text-[16px] font-bold flex items-center justify-center">+</button>
            {fleetCount !== (data.input?.fleet_count || 0) && (
              <button onClick={handleFleetSave} disabled={savingFleet}
                className="px-3 py-1 bg-[#3b82f6] text-white rounded text-[11px] font-semibold disabled:opacity-50">
                {savingFleet ? '...' : 'Kaydet'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#21262d] pb-0">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition ${
              activeTab === tab.key ? 'border-[#3b82f6] text-[#3b82f6]' : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'specs' && inp && <SpecsTab input={inp} />}
      {activeTab === 'output' && out && <OutputTab output={out} />}
      {activeTab === 'charts' && out && <ChartsTab output={out} />}
    </div>
  );
}

function OverviewTab({ data }) {
  const inp = data.input;
  const out = data.output;

  return (
    <div className="space-y-5">
      {/* Twin Status Cards */}
      <div className="grid grid-cols-2 gap-5">
        {/* Input Card */}
        <div className={`t-panel p-5 border-l-4 ${inp ? 'border-[#3fb950]' : 'border-[#484f58]'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#3fb950]">Girdi — XML Spesifikasyon</span>
            {inp && <span className="text-[9px] px-2 py-0.5 bg-[#3fb950]/15 text-[#3fb950] rounded font-bold">MEVCUT</span>}
            {!inp && <span className="text-[9px] px-2 py-0.5 bg-[#484f58]/15 text-[#484f58] rounded font-bold">EKSIK</span>}
          </div>
          {inp ? (
            <div className="space-y-2">
              <InfoRow label="Model" value={inp.vehicle_model} />
              <InfoRow label="Motor" value={`${inp.engine?.manufacturer || ''} ${inp.engine?.model || ''}`} />
              <InfoRow label="Guc" value={inp.engine?.rated_power_kw ? `${inp.engine.rated_power_kw} kW (${inp.engine.rated_power_hp} HP)` : '—'} />
              <InfoRow label="Sanziman" value={`${inp.gearbox?.manufacturer || ''} ${inp.gearbox?.model || ''}`} />
              <InfoRow label="Aks Orani" value={inp.axle?.ratio} />
              <InfoRow label="On Lastik" value={inp.tyre_front?.dimension || inp.tyre?.dimension} />
              <InfoRow label="Arka Lastik" value={inp.tyre_rear?.dimension || inp.tyre?.dimension} />
              <InfoRow label="Filo Sayisi" value={inp.fleet_count} highlight />
              <div className="pt-2 border-t border-[#21262d] mt-2 flex gap-4 text-[10px] text-[#484f58]">
                <span>Yakit Haritasi: {inp.data_counts?.fuel_map_points || 0} pt</span>
                <span>Yuk Egrisi: {inp.data_counts?.load_curve_points || 0} pt</span>
                <span>Vites: {inp.data_counts?.gear_ratios || 0}</span>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[#484f58]">Bu varyant icin XML girdi dosyasi yuklenmemis</p>
          )}
        </div>

        {/* Output Card */}
        <div className={`t-panel p-5 border-l-4 ${out ? 'border-[#58a6ff]' : 'border-[#484f58]'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#58a6ff]">Cikti — VECTO Sonuclari</span>
            {out && <span className="text-[9px] px-2 py-0.5 bg-[#58a6ff]/15 text-[#58a6ff] rounded font-bold">MEVCUT</span>}
            {!out && <span className="text-[9px] px-2 py-0.5 bg-[#484f58]/15 text-[#484f58] rounded font-bold">EKSIK</span>}
          </div>
          {out ? (
            <div className="space-y-2">
              <InfoRow label="Model" value={out.vehicle_info?.model} />
              <InfoRow label="Grup" value={out.vehicle_info?.vehicle_group} />
              <InfoRow label="Motor Gucu" value={out.vehicle_info?.engine_rated_power_kw ? `${out.vehicle_info.engine_rated_power_kw} kW` : '—'} />
              <InfoRow label="VECTO Versiyon" value={out.vehicle_info?.tool_version} />
              <InfoRow label="Sonuc Sayisi" value={out.summary?.total_results} />
              <div className="pt-2 mt-2 border-t border-[#21262d]">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-[#484f58]">Ort CO2</div>
                    <div className="text-[18px] font-black text-[#f97316]">{out.summary?.co2_avg || '—'}</div>
                    <div className="text-[9px] text-[#484f58]">g/km</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#484f58]">Min</div>
                    <div className="text-[16px] font-bold text-[#3fb950]">{out.summary?.co2_min || '—'}</div>
                    <div className="text-[9px] text-[#484f58]">g/km</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#484f58]">Max</div>
                    <div className="text-[16px] font-bold text-[#f85149]">{out.summary?.co2_max || '—'}</div>
                    <div className="text-[9px] text-[#484f58]">g/km</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {Object.keys(out.subgroups || {}).sort().map(sg => (
                  <span key={sg} className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: `${SUBGROUP_COLORS[sg] || '#484f58'}20`, color: SUBGROUP_COLORS[sg] || '#8b949e' }}>
                    {sg}: {out.subgroups[sg]?.co2_avg} g/km
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[#484f58]">Bu varyant icin VECTO cikti dosyasi yuklenmemis</p>
          )}
        </div>
      </div>

      {/* Quick CO2 Summary per subgroup if output exists */}
      {out && (
        <div className="t-panel p-5">
          <h3 className="text-[14px] font-bold text-[#e6edf3] mb-4">Alt Grup × Misyon CO2 Matrisi (g/km)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#21262d]">
                  <th className="px-2 py-2 text-left text-[10px] text-[#484f58] font-bold">Alt Grup</th>
                  {MISSION_ORDER.map(m => (
                    <th key={m} colSpan={2} className="px-2 py-2 text-center text-[10px] text-[#484f58] font-bold">{m}</th>
                  ))}
                </tr>
                <tr className="border-b border-[#21262d]/50">
                  <th></th>
                  {MISSION_ORDER.map(m => (
                    <>{/* eslint-disable-next-line react/jsx-key */}
                      <th key={`${m}-low`} className="px-1 py-1 text-[8px] text-[#484f58]">Low</th>
                      <th key={`${m}-high`} className="px-1 py-1 text-[8px] text-[#484f58]">Ref</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(out.subgroups).sort(([a], [b]) => a.localeCompare(b)).map(([sg, sgData]) => {
                  const missionMap = {};
                  (sgData.missions || []).forEach(m => {
                    const key = `${m.mission}|${m.loading?.includes('Low') ? 'low' : 'ref'}`;
                    missionMap[key] = m;
                  });
                  return (
                    <tr key={sg} className="border-b border-[#161b22]">
                      <td className="px-2 py-2 font-bold" style={{ color: SUBGROUP_COLORS[sg] || '#8b949e' }}>{sg}</td>
                      {MISSION_ORDER.map(mission => (
                        <>
                          <td key={`${mission}-low`} className="px-1 py-2 text-center font-mono text-[#d29922]">
                            {missionMap[`${mission}|low`]?.co2_g_km?.toFixed(0) || '—'}
                          </td>
                          <td key={`${mission}-ref`} className="px-1 py-2 text-center font-mono font-bold text-[#f97316]">
                            {missionMap[`${mission}|ref`]?.co2_g_km?.toFixed(0) || '—'}
                          </td>
                        </>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SpecsTab({ input: inp }) {
  const sections = [
    {
      title: 'Motor', color: '#06b6d4',
      items: [
        ['Uretici', inp.engine?.manufacturer],
        ['Model', inp.engine?.model],
        ['Sertifika No', inp.engine?.cert_number],
        ['Hacim', inp.engine?.displacement_cc ? `${inp.engine.displacement_cc} cc` : null],
        ['Nominal Devir', inp.engine?.rated_speed_rpm ? `${inp.engine.rated_speed_rpm} rpm` : null],
        ['Nominal Guc', inp.engine?.rated_power_kw ? `${inp.engine.rated_power_kw} kW (${inp.engine.rated_power_hp} HP)` : null],
        ['Maks Tork', inp.engine?.max_torque_nm ? `${inp.engine.max_torque_nm} Nm` : null],
        ['Rolanti', inp.engine?.idling_speed_rpm ? `${inp.engine.idling_speed_rpm} rpm` : null],
        ['Yakit Tipi', inp.engine?.fuel_type],
      ],
    },
    {
      title: 'Arac', color: '#58a6ff',
      items: [
        ['Model', inp.vehicle_model],
        ['Uretici', inp.manufacturer],
        ['Kategori', inp.category],
        ['Sasi', inp.chassis_config],
        ['Aks Konfigurasyon', inp.axle_config],
        ['Maks GVW', inp.vehicle?.max_laden_mass_kg ? `${inp.vehicle.max_laden_mass_kg} kg` : null],
        ['Bos Agirlik', inp.vehicle?.curb_weight_kg ? `${inp.vehicle.curb_weight_kg} kg` : null],
        ['Sifir Emisyon', inp.vehicle?.zero_emission ? 'Evet' : 'Hayir'],
      ],
    },
    {
      title: 'Sanziman', color: '#d29922',
      items: [
        ['Uretici', inp.gearbox?.manufacturer],
        ['Model', inp.gearbox?.model],
        ['Tip', inp.gearbox?.type],
        ['Vites Sayisi', inp.gearbox?.gear_count],
      ],
    },
    {
      title: 'Aks & Lastik', color: '#3fb950',
      items: [
        ['Aks Orani', inp.axle?.ratio],
        ['Aks Tipi', inp.axle?.type],
        ['On Lastik', `${inp.tyre_front?.manufacturer || inp.tyre?.manufacturer || ''} ${inp.tyre_front?.model || inp.tyre?.model || ''}`],
        ['On Lastik Boyut', inp.tyre_front?.dimension || inp.tyre?.dimension],
        ['Arka Lastik', `${inp.tyre_rear?.manufacturer || inp.tyre?.manufacturer || ''} ${inp.tyre_rear?.model || inp.tyre?.model || ''}`],
        ['Arka Lastik Boyut', inp.tyre_rear?.dimension || inp.tyre?.dimension],
      ],
    },
    {
      title: 'ADAS & Yardimci', color: '#a371f7',
      items: [
        ['Motor Start/Stop', inp.adas?.engine_stop_start ? 'Evet' : 'Hayir'],
        ['Eco Roll', inp.adas?.eco_roll ? 'Evet' : 'Hayir'],
        ['Prediktif Cruise', inp.adas?.predictive_cruise || 'none'],
        ['Fan', inp.auxiliaries?.fan_technology],
        ['Direksiyon', inp.auxiliaries?.steering_pump_tech],
        ['Alternator', inp.auxiliaries?.alternator_tech],
        ['Retarder', inp.auxiliaries?.retarder_type],
      ],
    },
    {
      title: 'WHTC Duzeltme Faktorleri', color: '#f47067',
      items: [
        ['Urban', inp.correction_factors?.whtc_urban],
        ['Rural', inp.correction_factors?.whtc_rural],
        ['Motorway', inp.correction_factors?.whtc_motorway],
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {sections.map(sec => (
        <div key={sec.title} className="t-panel p-4 border-l-4" style={{ borderLeftColor: sec.color }}>
          <h3 className="text-[13px] font-bold mb-3" style={{ color: sec.color }}>{sec.title}</h3>
          <div className="space-y-1.5">
            {sec.items.filter(([, v]) => v != null && v !== '' && v !== 'none').map(([k, v]) => (
              <div key={k} className="flex justify-between text-[11px]">
                <span className="text-[#8b949e]">{k}</span>
                <span className="text-[#e6edf3] font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OutputTab({ output: out }) {
  return (
    <div className="space-y-4">
      {/* Vehicle Info from Output */}
      <div className="t-panel p-4">
        <h3 className="text-[13px] font-bold text-[#e6edf3] mb-3">VECTO Cikti Bilgileri</h3>
        <div className="grid grid-cols-4 gap-4 text-[11px]">
          <InfoRow label="Model" value={out.vehicle_info?.model} />
          <InfoRow label="Grup" value={out.vehicle_info?.vehicle_group} />
          <InfoRow label="Motor Gucu" value={out.vehicle_info?.engine_rated_power_kw ? `${out.vehicle_info.engine_rated_power_kw} kW` : '—'} />
          <InfoRow label="Yakit" value={out.vehicle_info?.fuel_type} />
          <InfoRow label="Kategori" value={out.vehicle_info?.vehicle_category} />
          <InfoRow label="Aks" value={out.vehicle_info?.axle_configuration} />
          <InfoRow label="Maks Yuklenmis Kutle" value={out.vehicle_info?.tech_max_laden_mass_kg ? `${out.vehicle_info.tech_max_laden_mass_kg} kg` : '—'} />
          <InfoRow label="VECTO" value={out.vehicle_info?.tool_version} />
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Toplam Sonuc" value={out.summary?.total_results} color="#e6edf3" />
        <KPI label="Ort CO2" value={`${out.summary?.co2_avg || '—'}`} color="#f97316" unit="g/km" />
        <KPI label="Min CO2" value={`${out.summary?.co2_min || '—'}`} color="#3fb950" unit="g/km" />
        <KPI label="Max CO2" value={`${out.summary?.co2_max || '—'}`} color="#f85149" unit="g/km" />
      </div>

      {/* Per-subgroup tables */}
      {Object.entries(out.subgroups).sort(([a], [b]) => a.localeCompare(b)).map(([sg, sgData]) => (
        <div key={sg} className="t-panel overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#21262d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SUBGROUP_COLORS[sg] || '#8b949e' }} />
              <span className="text-[13px] font-bold text-[#e6edf3]">{sg}</span>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="text-[#8b949e]">Sonuc: <b className="text-[#e6edf3]">{sgData.result_count}</b></span>
              <span className="text-[#8b949e]">Ort CO2: <b style={{ color: SUBGROUP_COLORS[sg] }}>{sgData.co2_avg} g/km</b></span>
              {sgData.fc_avg && <span className="text-[#8b949e]">Ort Yakit: <b className="text-[#58a6ff]">{sgData.fc_avg} L/100km</b></span>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[#21262d] text-[#484f58]">
                  {['Misyon', 'Yuk', 'CO2 g/km', 'CO2 g/pkm', 'Yakit g/km', 'L/100km', 'Enerji MJ/km', 'Mesafe km', 'Yolcu', 'Hiz km/h', 'Sanziman %', 'Aks %', 'Vites Deg.'].map(h => (
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
                    <tr key={j} className="border-b border-[#161b22] hover:bg-[#161b22]">
                      <td className="px-2 py-1.5 font-semibold text-[#e6edf3]">{m.mission}</td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${m.loading?.includes('Low') ? 'bg-[#3fb950]/15 text-[#3fb950]' : 'bg-[#58a6ff]/15 text-[#58a6ff]'}`}>
                          {m.loading?.includes('Low') ? 'LOW' : 'REF'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono font-bold text-[#f97316]">{m.co2_g_km?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#059669]">{m.co2_g_pkm?.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#d29922]">{m.fc_g_km?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#58a6ff]">{m.fc_l_100km?.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#a371f7]">{m.energy_mj_km?.toFixed(2) || '—'}</td>
                      <td className="px-2 py-1.5 font-mono text-[#8b949e]">{m.distance_km?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#8b949e]">{m.passenger_count?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#8b949e]">{m.avg_speed?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#8b949e]">{m.gearbox_eff?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#8b949e]">{m.axlegear_eff?.toFixed(1)}</td>
                      <td className="px-2 py-1.5 font-mono text-[#8b949e]">{m.gearshift_count || '—'}</td>
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

function ChartsTab({ output: out }) {
  // Build bar chart data: mission × subgroup CO2
  const missionData = {};
  Object.entries(out.subgroups || {}).forEach(([sg, sgData]) => {
    (sgData.missions || []).forEach(m => {
      const key = `${m.mission} (${m.loading?.includes('Low') ? 'Low' : 'Ref'})`;
      if (!missionData[key]) missionData[key] = { name: key };
      missionData[key][sg] = m.co2_g_km;
    });
  });
  const barData = Object.values(missionData).sort((a, b) => {
    const ai = MISSION_ORDER.findIndex(m => a.name.startsWith(m));
    const bi = MISSION_ORDER.findIndex(m => b.name.startsWith(m));
    return ai - bi;
  });

  // Radar chart data per subgroup
  const subgroups = Object.keys(out.subgroups || {}).sort();
  const radarData = MISSION_ORDER.map(mission => {
    const row = { mission };
    subgroups.forEach(sg => {
      const missions = out.subgroups[sg]?.missions || [];
      const refMission = missions.find(m => m.mission === mission && !m.loading?.includes('Low'));
      row[sg] = refMission?.co2_g_km || 0;
    });
    return row;
  });

  return (
    <div className="space-y-5">
      {/* Bar Chart: CO2 by Mission × Subgroup */}
      <div className="t-panel p-5">
        <h3 className="text-[14px] font-bold text-[#e6edf3] mb-4">Misyon × Alt Grup CO2 Karsilastirma</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.isDark ? '#21262d' : '#e2e8f0'} />
            <XAxis dataKey="name" stroke={ct.isDark ? '#484f58' : '#94a3b8'} fontSize={10} angle={-15} textAnchor="end" height={60} />
            <YAxis stroke={ct.isDark ? '#484f58' : '#94a3b8'} fontSize={10} label={{ value: 'CO2 (g/km)', angle: -90, position: 'insideLeft', style: { fill: ct.isDark ? '#484f58' : '#64748b', fontSize: 10 } }} />
            <Tooltip contentStyle={ct.tooltip.contentStyle} labelStyle={ct.tooltip.labelStyle} />
            <Legend />
            {subgroups.map(sg => (
              <Bar key={sg} dataKey={sg} fill={SUBGROUP_COLORS[sg] || '#8b949e'} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart: CO2 Profile */}
      <div className="t-panel p-5">
        <h3 className="text-[14px] font-bold text-[#e6edf3] mb-4">CO2 Misyon Profili (Referans Yuk)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke={ct.isDark ? '#21262d' : '#e2e8f0'} />
            <PolarAngleAxis dataKey="mission" tick={{ fill: ct.isDark ? '#8b949e' : '#64748b', fontSize: 11 }} />
            <PolarRadiusAxis stroke={ct.isDark ? '#21262d' : '#e2e8f0'} tick={{ fill: ct.isDark ? '#484f58' : '#94a3b8', fontSize: 9 }} />
            <Tooltip contentStyle={ct.tooltip.contentStyle} />
            <Legend />
            {subgroups.map(sg => (
              <Radar key={sg} name={sg} dataKey={sg} stroke={SUBGROUP_COLORS[sg]} fill={SUBGROUP_COLORS[sg]} fillOpacity={0.15} />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-[#8b949e]">{label}</span>
      <span className={`font-medium ${highlight ? 'text-[#f97316] font-bold' : 'text-[#e6edf3]'}`}>{value ?? '—'}</span>
    </div>
  );
}

function KPI({ label, value, color, unit, sub }) {
  return (
    <div className="t-panel p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{label}</div>
      <div className="text-[22px] font-black mt-1" style={{ color }}>{value ?? '—'}</div>
      {unit && <div className="text-[10px] text-[#484f58]">{unit}</div>}
    </div>
  );
}
