import { useState, useEffect } from 'react';
import { api } from '../api';

export default function CO2Panel({ onSelectVariant }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('fleet');

  useEffect(() => {
    api.getFleetEmissions().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="t-panel p-6 text-[#8b949e]">CO2 verisi yüklenemedi.</div>;

  const { fleet_summary: fs, model_summary: ms, category_breakdown: cb, variants } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">CO2 Emisyon Analizi</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">Filo geneli CO2, yakit tuketimi ve BSFC verimlilik haritasi</p>
        </div>
        <div className="flex gap-2">
          {['fleet', 'models', 'variants'].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${viewMode === m ? 'bg-[#E30613] text-white' : 'bg-[#21262d] text-[#8b949e] hover:text-white'}`}>
              {m === 'fleet' ? 'Filo Ozeti' : m === 'models' ? 'Model Bazli' : 'Varyant Detay'}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet KPI Cards */}
      {fs && (
        <div className="grid grid-cols-5 gap-4">
          <KPICard label="Filo Ort. CO2" value={fs.fleet_co2_avg} unit="g/km" color="#E30613" />
          <KPICard label="Min CO2" value={fs.fleet_co2_min} unit="g/km" color="#3fb950" />
          <KPICard label="Max CO2" value={fs.fleet_co2_max} unit="g/km" color="#f85149" />
          <KPICard label="Ort. Yakit" value={fs.fleet_fuel_avg} unit="L/100km" color="#58a6ff" />
          <KPICard label="Analiz Edilen" value={fs.total_variants_analyzed} unit="varyant" color="#d29922" />
        </div>
      )}

      {/* Fleet View */}
      {viewMode === 'fleet' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="t-panel p-5">
            <h3 className="text-[14px] font-bold text-[#e6edf3] mb-4">Kategori Bazli CO2</h3>
            {cb?.map((cat, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <span className="text-[12px] text-[#8b949e] w-16 uppercase font-semibold">{cat.category}</span>
                <div className="flex-1 h-8 bg-[#0d1117] rounded relative overflow-hidden">
                  <div className="h-full rounded transition-all duration-700"
                    style={{
                      width: `${Math.min((cat.co2_avg / (fs?.fleet_co2_max || 1)) * 100, 100)}%`,
                      background: `linear-gradient(90deg, #E30613, ${cat.co2_avg > (fs?.fleet_co2_avg || 0) ? '#f85149' : '#3fb950'})`,
                    }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
                    {cat.co2_avg} g/km ({cat.count} varyant)
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Best & Worst */}
          <div className="space-y-4">
            {fs?.best_variant && (
              <div className="t-panel p-4 border-l-4 border-[#3fb950]">
                <span className="text-[10px] uppercase tracking-wider text-[#3fb950] font-bold">En Iyi Varyant</span>
                <div className="mt-2">
                  <span className="text-[15px] font-bold text-[#e6edf3]">{fs.best_variant.model_name}</span>
                  <span className="text-[12px] text-[#8b949e] ml-2">{fs.best_variant.variant_code}</span>
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-[20px] font-black text-[#3fb950]">{fs.best_variant.co2_weighted} <span className="text-[11px] font-normal">g/km</span></span>
                  <span className="text-[14px] text-[#8b949e] mt-1">{fs.best_variant.fuel_l_100km} L/100km</span>
                </div>
              </div>
            )}
            {fs?.worst_variant && (
              <div className="t-panel p-4 border-l-4 border-[#f85149]">
                <span className="text-[10px] uppercase tracking-wider text-[#f85149] font-bold">En Kotu Varyant</span>
                <div className="mt-2">
                  <span className="text-[15px] font-bold text-[#e6edf3]">{fs.worst_variant.model_name}</span>
                  <span className="text-[12px] text-[#8b949e] ml-2">{fs.worst_variant.variant_code}</span>
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-[20px] font-black text-[#f85149]">{fs.worst_variant.co2_weighted} <span className="text-[11px] font-normal">g/km</span></span>
                  <span className="text-[14px] text-[#8b949e] mt-1">{fs.worst_variant.fuel_l_100km} L/100km</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model View */}
      {viewMode === 'models' && (
        <div className="space-y-3">
          {ms?.map((m, i) => (
            <div key={i} className="t-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-[15px] font-bold text-[#e6edf3]">{m.model_name}</h4>
                  <span className="text-[11px] text-[#8b949e] uppercase">{m.category} — {m.variant_count} varyant</span>
                </div>
                <div className="flex gap-6 items-end">
                  <div className="text-center">
                    <div className="text-[10px] text-[#484f58] uppercase">Ort. CO2</div>
                    <div className="text-[18px] font-black text-[#E30613]">{m.co2_avg}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[#484f58] uppercase">Min-Max</div>
                    <div className="text-[13px] font-semibold text-[#8b949e]">{m.co2_min} — {m.co2_max}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[#484f58] uppercase">Spread</div>
                    <div className="text-[13px] font-semibold text-[#d29922]">{m.co2_spread}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[#484f58] uppercase">Yakit</div>
                    <div className="text-[13px] font-semibold text-[#58a6ff]">{m.fuel_avg} L</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[#484f58] uppercase">En Iyi BSFC</div>
                    <div className="text-[13px] font-semibold text-[#3fb950]">{m.bsfc_best} g/kWh</div>
                  </div>
                </div>
              </div>
              {/* CO2 range bar */}
              <div className="h-3 bg-[#0d1117] rounded overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-[#3fb950] via-[#d29922] to-[#f85149] rounded" style={{ width: '100%', opacity: 0.3 }} />
                <div className="absolute top-0 h-full w-0.5 bg-[#E30613]" style={{ left: `${((m.co2_avg - (fs?.fleet_co2_min || 0)) / ((fs?.fleet_co2_max || 1) - (fs?.fleet_co2_min || 0))) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Variant View */}
      {viewMode === 'variants' && (
        <div className="t-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21262d]">
                {['Model', 'Varyant', 'Guc (kW)', 'Kutle (kg)', 'CO2 Urban', 'CO2 Rural', 'CO2 Motorway', 'CO2 Agirlikli', 'Yakit L/100km', 'BSFC Opt.'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants?.map((v, i) => (
                <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 cursor-pointer transition" onClick={() => onSelectVariant?.(v.variant_id)}>
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3]">{v.model_name}</td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e] font-mono">{v.variant_code?.substring(0, 15)}..</td>
                  <td className="px-3 py-2 text-[12px] text-[#e6edf3]">{v.power_kw}</td>
                  <td className="px-3 py-2 text-[12px] text-[#e6edf3]">{v.mass_kg?.toLocaleString()}</td>
                  <td className="px-3 py-2"><CO2Badge value={v.co2_urban} /></td>
                  <td className="px-3 py-2"><CO2Badge value={v.co2_rural} /></td>
                  <td className="px-3 py-2"><CO2Badge value={v.co2_motorway} /></td>
                  <td className="px-3 py-2"><CO2Badge value={v.co2_weighted} highlight /></td>
                  <td className="px-3 py-2 text-[12px] text-[#58a6ff] font-mono">{v.fuel_l_100km}</td>
                  <td className="px-3 py-2 text-[12px] text-[#3fb950] font-mono">{v.bsfc_optimal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, unit, color }) {
  return (
    <div className="t-panel p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{label}</div>
      <div className="text-[22px] font-black mt-1" style={{ color }}>{value ?? '—'}</div>
      <div className="text-[10px] text-[#484f58]">{unit}</div>
    </div>
  );
}

function CO2Badge({ value, highlight }) {
  if (!value) return <span className="text-[#484f58]">—</span>;
  const color = value < 1000 ? '#3fb950' : value < 2000 ? '#d29922' : '#f85149';
  return (
    <span className={`text-[12px] font-mono font-semibold ${highlight ? 'px-2 py-0.5 rounded bg-[#0d1117]' : ''}`} style={{ color }}>
      {value}
    </span>
  );
}
