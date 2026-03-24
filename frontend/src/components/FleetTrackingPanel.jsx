import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function FleetTrackingPanel() {
  const [data, setData] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ft, vs] = await Promise.all([
        api.getFleetTracking(),
        api.getVariants(),
      ]);
      setData(ft);
      setVariants(vs.variants || vs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCountChange = (variantId, count) => {
    setEditing(prev => ({ ...prev, [variantId]: parseInt(count) || 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = Object.entries(editing).map(([variant_id, fleet_count]) => ({
      variant_id,
      fleet_count,
    }));
    try {
      await api.updateFleetCounts(updates);
      setEditing({});
      await load();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" /></div>;

  const hasEdits = Object.keys(editing).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">Filo Takibi</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            Her varyanttan kacar arac filoda — Filo CO2 = Arac Sayisi × Varyant CO2
          </p>
        </div>
        {hasEdits && (
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-[#E30613] text-white rounded-md text-[12px] font-semibold disabled:opacity-50">
            {saving ? 'Kaydediliyor...' : `${Object.keys(editing).length} Degisiklik Kaydet`}
          </button>
        )}
      </div>

      {/* Fleet KPIs */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="t-panel p-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">Toplam Arac</div>
            <div className="text-[28px] font-black text-[#E30613] mt-1">{data.total_vehicles_in_fleet}</div>
          </div>
          <div className="t-panel p-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">Filo Ort. CO2</div>
            <div className="text-[28px] font-black text-[#58a6ff] mt-1">{data.fleet_avg_co2_g_km ?? '—'} <span className="text-[12px] font-normal text-[#484f58]">g/km</span></div>
          </div>
          <div className="t-panel p-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">Toplam Agirlikli CO2</div>
            <div className="text-[28px] font-black text-[#d29922] mt-1">{data.total_weighted_co2 ?? '—'}</div>
          </div>
        </div>
      )}

      {/* Fleet items (variants with counts > 0) */}
      {data?.items?.length > 0 && (
        <div className="t-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[#21262d]">
            <h3 className="text-[14px] font-bold text-[#e6edf3]">Aktif Filo Varyantlari</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21262d]">
                {['Model', 'Varyant', 'Arac Sayisi', 'CO2 (g/km)', 'Yakit (L/100km)', 'Filo CO2 Toplam', 'Katki %'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3]">{item.model_name}</td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e] font-mono">{item.variant_code?.substring(0, 20)}</td>
                  <td className="px-3 py-2 text-[14px] font-bold text-[#E30613]">{item.fleet_count}</td>
                  <td className="px-3 py-2 text-[12px] font-mono text-[#3fb950]">{item.co2_g_km?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2 text-[12px] font-mono text-[#58a6ff]">{item.fc_l_100km?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2 text-[12px] font-mono font-semibold text-[#d29922]">{item.fleet_co2_total?.toFixed(0) ?? '—'}</td>
                  <td className="px-3 py-2">
                    {item.fleet_contribution_pct != null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-[#0d1117] rounded overflow-hidden">
                          <div className="h-full bg-[#E30613] rounded" style={{ width: `${item.fleet_contribution_pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-[#8b949e]">{item.fleet_contribution_pct}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All variants — set fleet counts */}
      <div className="t-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-[#21262d]">
          <h3 className="text-[14px] font-bold text-[#e6edf3]">Varyant Filo Sayilari</h3>
          <p className="text-[11px] text-[#484f58]">Her varyant icin filodaki arac sayisini girin</p>
        </div>
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#161b22]">
              <tr className="border-b border-[#21262d]">
                {['Model', 'Varyant Kodu', 'Motor', 'Guc (kW)', 'Filo Sayisi'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => {
                const currentCount = editing[v.id] !== undefined ? editing[v.id] : (v.fleet_count || 0);
                const isEdited = editing[v.id] !== undefined;
                return (
                  <tr key={i} className={`border-b border-[#21262d]/50 transition ${isEdited ? 'bg-[#E30613]/5' : 'hover:bg-[#21262d]/30'}`}>
                    <td className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3]">{v.vehicle_model_name || v.model_name || '—'}</td>
                    <td className="px-3 py-2 text-[11px] text-[#8b949e] font-mono">{v.variant_code?.substring(0, 25)}</td>
                    <td className="px-3 py-2 text-[11px] text-[#8b949e] capitalize">{v.engine_type || 'diesel'}</td>
                    <td className="px-3 py-2 text-[11px] text-[#8b949e]">{v.rated_power_w ? Math.round(v.rated_power_w / 1000) : '—'}</td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" value={currentCount}
                        onChange={e => handleCountChange(v.id, e.target.value)}
                        className="w-20 px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded text-[12px] text-[#e6edf3] text-center focus:border-[#E30613] outline-none" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
