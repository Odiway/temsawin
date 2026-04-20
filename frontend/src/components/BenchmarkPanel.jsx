import { useState, useEffect } from 'react';
import { api } from '../api';

export default function BenchmarkPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBenchmark().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div>;

  const vehicles = data?.vehicles || [];

  // Collect all unique mission keys
  const allMissions = new Set();
  vehicles.forEach(v => Object.keys(v.missions || {}).forEach(k => allMissions.add(k)));
  const missionKeys = [...allMissions].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e6edf3]">Varyant Benchmark</h1>
        <p className="text-[13px] text-[#8b949e] mt-1">
          Farkli VIN/varyantlari misyon bazinda CO2 ve yakit tuketimi ile karsilastirin — {vehicles.length} arac
        </p>
      </div>

      {vehicles.length > 0 ? (
        <div className="t-panel overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold sticky left-0 bg-[#161b22]">VIN / Model</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">Guc</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">Kutle</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">Aks Orani</th>
                {missionKeys.map(mk => (
                  <th key={mk} className="px-3 py-2.5 text-center text-[10px] uppercase tracking-wider text-[#484f58] font-bold">
                    {mk.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, i) => (
                <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                  <td className="px-3 py-2 sticky left-0 bg-[#161b22]">
                    <div className="text-[12px] font-semibold text-[#e6edf3]">{v.model || '—'}</div>
                    <div className="text-[10px] text-[#484f58] font-mono">{v.vin}</div>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e]">{v.power_kw ? `${v.power_kw} kW` : '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e]">{v.mass_kg ? `${v.mass_kg} kg` : '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e]">{v.axle_ratio ?? '—'}</td>
                  {missionKeys.map(mk => {
                    const m = v.missions?.[mk];
                    return (
                      <td key={mk} className="px-3 py-2 text-center">
                        {m ? (
                          <div>
                            <div className="text-[12px] font-mono font-semibold" style={{
                              color: m.co2_g_km < 700 ? '#3fb950' : m.co2_g_km < 900 ? '#d29922' : '#f85149'
                            }}>
                              {m.co2_g_km?.toFixed(1)}
                            </div>
                            {m.fc_l_100km && <div className="text-[9px] text-[#484f58]">{m.fc_l_100km.toFixed(1)} L</div>}
                          </div>
                        ) : <span className="text-[#484f58]">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="t-panel p-8 text-center">
          <div className="text-[#484f58] text-lg mb-2">Henuz Benchmark Verisi Yok</div>
          <p className="text-[#484f58] text-[13px]">Oncelikle VECTO sonuc dosyalarini CO2 sayfasindan yukleyin</p>
        </div>
      )}
    </div>
  );
}
