import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const SUBGROUP_COLORS = {
  P31SD: '#3fb950', P31DD: '#58a6ff', P32SD: '#d29922', P32DD: '#f85149', Unknown: '#8b949e',
};

export default function FleetCalculationPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('summary');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.getFleetCO2Calculation());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div>;

  const fs = data?.fleet_summary;
  const byVariant = data?.by_variant || [];
  const bySgMission = data?.by_subgroup_mission || [];
  const byMission = data?.by_mission || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">Filo CO2 Hesaplama</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            EU 2017/2400 — Agirlikli filo emisyonlari (Filo CO2 = ΣVaryant CO2 × Adet / ΣAdet)
          </p>
        </div>
        <div className="flex gap-2">
          {['summary', 'subgroup', 'mission', 'variant'].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${viewMode === m ? 'bg-[#3b82f6] text-white' : 'bg-[#21262d] text-[#8b949e] hover:text-white'}`}>
              {m === 'summary' ? 'Filo Ozeti' : m === 'subgroup' ? 'Alt Grup' : m === 'mission' ? 'Misyon' : 'Varyant'}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet KPIs */}
      {fs && (
        <div className="grid grid-cols-5 gap-4">
          <KPICard label="Filo Toplam Arac" value={fs.total_fleet_vehicles} color="#06b6d4" />
          <KPICard label="Filo Ort. CO2" value={fs.fleet_avg_co2_g_km} unit="g/km" color="#58a6ff" />
          <KPICard label="Toplam Agirlikli CO2" value={fs.total_weighted_co2?.toLocaleString()} color="#d29922" />
          <KPICard label="Varyant (Sonuclu)" value={fs.total_variants_with_results} color="#3fb950" />
          <KPICard label="Varyant (Filoda)" value={fs.variants_in_fleet} color="#f85149" />
        </div>
      )}

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Mission CO2 Overview */}
          <div className="t-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-[#21262d]">
              <h3 className="text-[14px] font-bold text-[#e6edf3]">Misyon Bazli Filo CO2</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  {['Misyon', 'Yuklenme', 'Filo Ort. CO2', 'Arac Sayisi'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byMission.map((m, i) => (
                  <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                    <td className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3]">{m.mission}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.loading === 'LowLoading' ? 'bg-[#3fb950]/10 text-[#3fb950]' : 'bg-[#f85149]/10 text-[#f85149]'}`}>
                        {m.loading === 'LowLoading' ? 'Dusuk' : 'Referans'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[13px] font-mono font-bold text-[#f97316]">{m.fleet_avg_co2_g_km} g/km</td>
                    <td className="px-3 py-2 text-[11px] text-[#8b949e]">{m.total_vehicles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Contributors */}
          <div className="t-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-[#21262d]">
              <h3 className="text-[14px] font-bold text-[#e6edf3]">En Buyuk CO2 Katkisi</h3>
            </div>
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#161b22]">
                  <tr className="border-b border-[#21262d]">
                    {['Varyant', 'Model', 'Adet', 'Ort.CO2', 'Filo CO2', 'Katki %'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byVariant.filter(v => v.fleet_count > 0).map((v, i) => (
                    <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                      <td className="px-3 py-2 text-[10px] font-mono text-[#e6edf3]">{v.vin?.substring(0, 20)}</td>
                      <td className="px-3 py-2 text-[11px] font-semibold text-[#58a6ff]">{v.model}</td>
                      <td className="px-3 py-2 text-[12px] font-bold text-[#06b6d4]">{v.fleet_count}</td>
                      <td className="px-3 py-2 text-[11px] font-mono text-[#3fb950]">{v.avg_co2_g_km}</td>
                      <td className="px-3 py-2 text-[12px] font-mono font-semibold text-[#d29922]">{v.fleet_co2_total}</td>
                      <td className="px-3 py-2">
                        {v.contribution_pct != null && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 bg-[#0d1117] rounded overflow-hidden">
                              <div className="h-full bg-[#3b82f6] rounded" style={{ width: `${Math.min(v.contribution_pct, 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-[#8b949e] w-10 text-right">{v.contribution_pct}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {byVariant.filter(v => v.fleet_count > 0).length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-[#484f58] text-[13px]">
                      Filo sayilari henuz girilmedi — Filo Takibi panelinden arac sayilarini girin
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subgroup View */}
      {viewMode === 'subgroup' && (
        <div className="t-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[#21262d]">
            <h3 className="text-[14px] font-bold text-[#e6edf3]">Alt Grup × Misyon Bazli Filo CO2</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21262d]">
                {['Alt Grup', 'Misyon', 'Yuklenme', 'Filo Ort. CO2', 'Filo Ort. Yakit', 'Enerji (MJ/km)', 'Arac', 'Varyant'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bySgMission.map((r, i) => (
                <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                  <td className="px-3 py-2 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SUBGROUP_COLORS[r.subgroup] || '#8b949e' }} />
                    <span className="text-[12px] font-bold text-[#e6edf3]">{r.subgroup}</span>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[#e6edf3]">{r.mission}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.loading === 'LowLoading' ? 'bg-[#3fb950]/10 text-[#3fb950]' : 'bg-[#f85149]/10 text-[#f85149]'}`}>
                      {r.loading === 'LowLoading' ? 'Dusuk' : 'Referans'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[13px] font-mono font-bold text-[#f97316]">{r.fleet_avg_co2_g_km} g/km</td>
                  <td className="px-3 py-2 text-[11px] font-mono text-[#58a6ff]">{r.fleet_avg_fc_l_100km ? `${r.fleet_avg_fc_l_100km} L/100km` : '—'}</td>
                  <td className="px-3 py-2 text-[11px] font-mono text-[#3fb950]">{r.fleet_avg_energy_mj_km ? `${r.fleet_avg_energy_mj_km}` : '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e]">{r.total_vehicles}</td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e]">{r.variant_count}</td>
                </tr>
              ))}
              {bySgMission.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-[#484f58] text-[13px]">
                  Hesaplama icin oncce filo sayilarini girin
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Mission View */}
      {viewMode === 'mission' && (
        <div className="t-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[#21262d]">
            <h3 className="text-[14px] font-bold text-[#e6edf3]">Misyon Bazli Filo CO2</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            {byMission.map((m, i) => (
              <div key={i} className="bg-[#0d1117] rounded-lg p-4 border border-[#21262d]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[13px] font-bold text-[#e6edf3]">{m.mission}</span>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${m.loading === 'LowLoading' ? 'bg-[#3fb950]/10 text-[#3fb950]' : 'bg-[#f85149]/10 text-[#f85149]'}`}>
                      {m.loading === 'LowLoading' ? 'Dusuk' : 'Referans'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#484f58]">{m.total_vehicles} arac</span>
                </div>
                <div className="text-[28px] font-black text-[#f97316]">
                  {m.fleet_avg_co2_g_km}
                  <span className="text-[12px] font-normal text-[#484f58] ml-1">g/km</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variant View */}
      {viewMode === 'variant' && (
        <div className="t-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[#21262d]">
            <h3 className="text-[14px] font-bold text-[#e6edf3]">Tum Varyantlar — Filo Katkisi</h3>
          </div>
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#161b22]">
                <tr className="border-b border-[#21262d]">
                  {['Varyant Kodu', 'Model', 'Filo Adet', 'Sonuc', 'Ort. CO2', 'Filo CO2 Toplam', 'Katki %'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byVariant.map((v, i) => (
                  <tr key={i} className={`border-b border-[#21262d]/50 transition ${v.fleet_count > 0 ? 'hover:bg-[#21262d]/30' : 'opacity-40'}`}>
                    <td className="px-3 py-2 text-[10px] font-mono text-[#e6edf3]">{v.vin?.substring(0, 25)}</td>
                    <td className="px-3 py-2 text-[11px] font-semibold text-[#58a6ff]">{v.model}</td>
                    <td className="px-3 py-2 text-[12px] font-bold text-[#06b6d4]">{v.fleet_count}</td>
                    <td className="px-3 py-2 text-[11px] text-[#8b949e]">{v.result_count}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-[#3fb950]">{v.avg_co2_g_km || '—'}</td>
                    <td className="px-3 py-2 text-[12px] font-mono font-semibold text-[#d29922]">{v.fleet_co2_total || '—'}</td>
                    <td className="px-3 py-2">
                      {v.contribution_pct != null && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 bg-[#0d1117] rounded overflow-hidden">
                            <div className="h-full bg-[#3b82f6] rounded" style={{ width: `${Math.min(v.contribution_pct, 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-[#8b949e] w-10 text-right">{v.contribution_pct}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formula Explanation */}
      <div className="t-panel p-4">
        <h3 className="text-[13px] font-bold text-[#e6edf3] mb-2">EU 2017/2400 Filo CO2 Hesaplama Formulu</h3>
        <div className="text-[12px] text-[#8b949e] space-y-1">
          <p><strong className="text-[#e6edf3]">CO2_fleet</strong> = Σ(N_v × CO2_v) / Σ(N_v)</p>
          <p className="text-[11px]">N_v = Varyant v icin filodaki arac sayisi</p>
          <p className="text-[11px]">CO2_v = Varyant v icin VECTO sertifikali CO2 (g/km)</p>
          <p className="text-[11px] mt-2 text-[#484f58]">Her alt grup (P31SD/DD, P32SD/DD) ve misyon (Heavy Urban, Urban, Suburban, Interurban, Coach) icin ayri hesaplanir.</p>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, unit, color }) {
  return (
    <div className="t-panel p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{label}</div>
      <div className="text-[24px] font-black mt-1" style={{ color }}>{value ?? '—'}</div>
      {unit && <div className="text-[11px] text-[#484f58]">{unit}</div>}
    </div>
  );
}
