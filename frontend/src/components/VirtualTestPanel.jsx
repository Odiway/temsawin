import { useState, useEffect } from 'react';
import { api } from '../api';

export default function VirtualTestPanel() {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [baseVariant, setBaseVariant] = useState('');
  const [params, setParams] = useState({ target_power_kw: '', target_mass_kg: '', target_axle_ratio: '' });
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.getVirtualTestOptions().then(d => { setOptions(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const runTest = async () => {
    if (!baseVariant) return;
    setRunning(true);
    try {
      const body = { base_variant_id: parseInt(baseVariant) };
      if (params.target_power_kw) body.target_power_kw = parseFloat(params.target_power_kw);
      if (params.target_mass_kg) body.target_mass_kg = parseFloat(params.target_mass_kg);
      if (params.target_axle_ratio) body.target_axle_ratio = parseFloat(params.target_axle_ratio);
      const r = await api.runVirtualTest(body);
      setResult(r);
    } catch (e) {
      console.error(e);
    }
    setRunning(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e6edf3]">Sanal Test Laboratuvari</h1>
        <p className="text-[13px] text-[#8b949e] mt-1">Fiziksel test yapmadan varyant performansini tahmin edin — test basina ~15-25K EUR tasarruf</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="t-panel p-5 col-span-1">
          <h3 className="text-[14px] font-bold text-[#e6edf3] mb-4">Test Konfigurasyonu</h3>

          <label className="block text-[11px] text-[#8b949e] uppercase font-bold mb-1">Baz Varyant</label>
          <select value={baseVariant} onChange={e => setBaseVariant(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[12px] text-[#e6edf3] mb-4 focus:border-[#E30613] outline-none">
            <option value="">Secin...</option>
            {options?.base_variants?.map(v => (
              <option key={v.id} value={v.id}>{v.model} — {v.power_kw}kW {v.mass_kg}kg</option>
            ))}
          </select>

          <label className="block text-[11px] text-[#8b949e] uppercase font-bold mb-1">Hedef Guc (kW)</label>
          <input type="number" value={params.target_power_kw} onChange={e => setParams(p => ({ ...p, target_power_kw: e.target.value }))}
            placeholder={options?.engines?.[0] ? `ör. ${options.engines[Math.floor(options.engines.length / 2)]}` : ''}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[12px] text-[#e6edf3] mb-2 focus:border-[#E30613] outline-none" />
          {options?.engines && <div className="text-[10px] text-[#484f58] mb-4">Mevcut: {options.engines.join(', ')} kW</div>}

          <label className="block text-[11px] text-[#8b949e] uppercase font-bold mb-1">Hedef Kutle (kg)</label>
          <input type="number" value={params.target_mass_kg} onChange={e => setParams(p => ({ ...p, target_mass_kg: e.target.value }))}
            placeholder={options?.masses?.[0] ? `ör. ${options.masses[Math.floor(options.masses.length / 2)]}` : ''}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[12px] text-[#e6edf3] mb-2 focus:border-[#E30613] outline-none" />
          {options?.masses && <div className="text-[10px] text-[#484f58] mb-4">Aralik: {Math.min(...options.masses)} — {Math.max(...options.masses)} kg</div>}

          <label className="block text-[11px] text-[#8b949e] uppercase font-bold mb-1">Hedef Aks Orani</label>
          <input type="number" step="0.01" value={params.target_axle_ratio} onChange={e => setParams(p => ({ ...p, target_axle_ratio: e.target.value }))}
            placeholder={options?.axle_ratios?.[0] ? `ör. ${options.axle_ratios[0]}` : ''}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[12px] text-[#e6edf3] mb-4 focus:border-[#E30613] outline-none" />
          {options?.axle_ratios && <div className="text-[10px] text-[#484f58] mb-4">Mevcut: {options.axle_ratios.map(r => r.toFixed(2)).join(', ')}</div>}

          <button onClick={runTest} disabled={!baseVariant || running}
            className="w-full py-2.5 rounded-md font-bold text-[13px] transition bg-[#E30613] text-white hover:bg-[#ff1a27] disabled:opacity-40 disabled:cursor-not-allowed">
            {running ? 'Hesaplaniyor...' : 'Sanal Test Baslat'}
          </button>

          <div className="mt-4 p-3 bg-[#0d1117] rounded-md">
            <div className="text-[10px] text-[#484f58] uppercase font-bold mb-1">Maliyet Tasarrufu</div>
            <div className="text-[13px] text-[#3fb950] font-semibold">~€15,000 — €25,000 / test</div>
            <div className="text-[10px] text-[#484f58] mt-1">Fiziksel VECTO testi yerine dijital ikiz tahmini</div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="col-span-2 space-y-4">
          {!result ? (
            <div className="t-panel p-12 flex flex-col items-center justify-center text-center">
              <svg className="w-16 h-16 text-[#30363d] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-[15px] font-bold text-[#484f58]">Sanal Test Bekliyor</h3>
              <p className="text-[12px] text-[#484f58] mt-1">Sol panelden konfigurasyonu secip testi baslatin</p>
            </div>
          ) : (
            <>
              {/* Confidence Indicator */}
              {result.virtual?.confidence && (
                <div className="t-panel p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Tahmin Guveni</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[20px] font-black ${result.virtual.confidence.level === 'high' ? 'text-[#3fb950]' : result.virtual.confidence.level === 'medium' ? 'text-[#d29922]' : 'text-[#f85149]'}`}>
                          {result.virtual.confidence.level === 'high' ? 'YUKSEK' : result.virtual.confidence.level === 'medium' ? 'ORTA' : 'DUSUK'}
                        </span>
                        <span className="text-[12px] text-[#8b949e]">%{(result.virtual.confidence.score * 100).toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-[#484f58]">
                      <div>Benzer varyant: {result.virtual.confidence.similar_variants_count}</div>
                      <div>Interpolasyon faktoru: {(result.virtual.confidence.interpolation_factor * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-[#0d1117] rounded overflow-hidden">
                    <div className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${result.virtual.confidence.score * 100}%`,
                        background: result.virtual.confidence.level === 'high' ? '#3fb950' : result.virtual.confidence.level === 'medium' ? '#d29922' : '#f85149',
                      }} />
                  </div>
                </div>
              )}

              {/* Base vs Virtual Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="t-panel p-5 border-l-4 border-[#8b949e]">
                  <span className="text-[10px] uppercase tracking-wider text-[#8b949e] font-bold">Baz Varyant</span>
                  <h4 className="text-[15px] font-bold text-[#e6edf3] mt-1">{result.base?.model_name}</h4>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Metric label="Guc" value={result.base?.power_kw} unit="kW" />
                    <Metric label="Kutle" value={result.base?.mass_kg?.toLocaleString()} unit="kg" />
                    <Metric label="CO2" value={result.base?.co2_weighted} unit="g/km" color="#E30613" big />
                    <Metric label="Yakit" value={result.base?.fuel_l_100km} unit="L/100km" color="#58a6ff" big />
                  </div>
                </div>
                <div className="t-panel p-5 border-l-4 border-[#E30613]">
                  <span className="text-[10px] uppercase tracking-wider text-[#E30613] font-bold">Sanal Varyant (Tahmin)</span>
                  <h4 className="text-[15px] font-bold text-[#e6edf3] mt-1">Hedef Konfigürasyon</h4>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Metric label="Guc" value={params.target_power_kw || result.base?.power_kw} unit="kW" />
                    <Metric label="Kutle" value={(params.target_mass_kg || result.base?.mass_kg)?.toLocaleString()} unit="kg" />
                    <Metric label="CO2" value={result.virtual?.co2_weighted} unit="g/km" color="#E30613" big />
                    <Metric label="Yakit" value={result.virtual?.fuel_l_100km} unit="L/100km" color="#58a6ff" big />
                  </div>
                </div>
              </div>

              {/* Delta Analysis */}
              {result.delta && (
                <div className="t-panel p-5">
                  <h3 className="text-[14px] font-bold text-[#e6edf3] mb-3">Fark Analizi</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <DeltaCard label="CO2 Fark" value={result.delta.co2_change_g_km} unit="g/km" pct={result.delta.co2_change_pct} />
                    <DeltaCard label="Yakit Fark" value={result.delta.fuel_change_l_100km} unit="L/100km" pct={result.delta.fuel_change_pct} />
                    {result.virtual?.co2_urban && <Metric label="CO2 Sehirici" value={result.virtual.co2_urban} unit="g/km" color="#d29922" />}
                    {result.virtual?.co2_motorway && <Metric label="CO2 Otoban" value={result.virtual.co2_motorway} unit="g/km" color="#58a6ff" />}
                  </div>
                </div>
              )}

              {/* Cycle Breakdown */}
              {result.virtual && (
                <div className="t-panel p-5">
                  <h3 className="text-[14px] font-bold text-[#e6edf3] mb-3">Cevrim Bazli Sonuclar</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Sehirici (Urban)', val: result.virtual.co2_urban, base: result.base?.co2_urban, weight: '35%', icon: '🏙️' },
                      { label: 'Kirsalararasi (Rural)', val: result.virtual.co2_rural, base: result.base?.co2_rural, weight: '35%', icon: '🛤️' },
                      { label: 'Otoyol (Motorway)', val: result.virtual.co2_motorway, base: result.base?.co2_motorway, weight: '30%', icon: '🛣️' },
                    ].map((c, i) => (
                      <div key={i} className="bg-[#0d1117] rounded-lg p-4">
                        <div className="text-[12px] text-[#8b949e] font-semibold">{c.icon} {c.label}</div>
                        <div className="text-[10px] text-[#484f58]">Agirlik: {c.weight}</div>
                        <div className="flex items-end gap-3 mt-2">
                          <div>
                            <div className="text-[10px] text-[#484f58]">Tahmin</div>
                            <div className="text-[18px] font-black text-[#E30613]">{c.val ?? '—'}</div>
                          </div>
                          {c.base && (
                            <div>
                              <div className="text-[10px] text-[#484f58]">Baz</div>
                              <div className="text-[14px] font-semibold text-[#484f58]">{c.base}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, color, big }) {
  return (
    <div>
      <div className="text-[10px] text-[#484f58] uppercase">{label}</div>
      <div className={`${big ? 'text-[18px]' : 'text-[14px]'} font-bold`} style={{ color: color || '#e6edf3' }}>
        {value ?? '—'} <span className="text-[10px] font-normal text-[#484f58]">{unit}</span>
      </div>
    </div>
  );
}

function DeltaCard({ label, value, unit, pct }) {
  const positive = value > 0;
  const color = positive ? '#f85149' : '#3fb950';
  return (
    <div className="bg-[#0d1117] rounded-lg p-3 text-center">
      <div className="text-[10px] text-[#484f58] uppercase font-bold">{label}</div>
      <div className="text-[18px] font-black mt-1" style={{ color }}>
        {positive ? '+' : ''}{value?.toFixed(1)} <span className="text-[10px] font-normal">{unit}</span>
      </div>
      {pct !== undefined && (
        <div className="text-[11px] font-semibold" style={{ color }}>
          {positive ? '+' : ''}{pct?.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
