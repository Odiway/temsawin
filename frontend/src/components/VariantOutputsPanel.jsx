import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const SUBGROUP_COLORS = {
  P31SD: '#3fb950', P31DD: '#58a6ff', P32SD: '#d29922', P32DD: '#f85149', Unknown: '#8b949e',
};

const MISSION_ORDER = ['Heavy Urban', 'Urban', 'Suburban', 'Interurban', 'Coach'];

export default function VariantOutputsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVin, setSelectedVin] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importDir, setImportDir] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.getVariantResults());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (vin) => {
    setSelectedVin(vin);
    setDetailLoading(true);
    try {
      setDetail(await api.getVariantResultDetail(vin));
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const handleImport = async () => {
    if (!importDir) return;
    setImporting(true);
    setImportResult(null);
    try {
      const r = await api.importOutputDirectory(importDir);
      setImportResult(r);
      load();
    } catch (e) {
      setImportResult({ status: 'error', error: e.message });
    }
    setImporting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div>;

  const variants = data?.variants || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">Varyant Cikti Sonuclari</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            VECTO RSLT_MANUFACTURER cikti dosyalarindan — {data?.total_variants || 0} varyant, {data?.total_results || 0} sonuc
          </p>
        </div>
        {selectedVin && (
          <button onClick={() => { setSelectedVin(null); setDetail(null); }}
            className="px-3 py-1.5 bg-[#21262d] text-[#8b949e] hover:text-white rounded-md text-[12px] font-semibold">
            ← Listeye Don
          </button>
        )}
      </div>

      {/* Import Section */}
      {!selectedVin && (
        <div className="t-panel p-4">
          <h3 className="text-[13px] font-bold text-[#e6edf3] mb-3">Cikti Dosyalarini Iceri Aktar</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={importDir}
              onChange={e => setImportDir(e.target.value)}
              placeholder="Output Files klasor yolu (ornek: /app/Output Files)"
              className="flex-1 bg-[#0d1117] border border-[#21262d] rounded-md px-3 py-2 text-[12px] text-[#e6edf3] focus:border-[#3b82f6] outline-none"
            />
            <button onClick={handleImport} disabled={importing || !importDir}
              className="px-4 py-2 bg-[#3b82f6] text-white rounded-md text-[12px] font-semibold disabled:opacity-50">
              {importing ? 'Aktariliyor...' : 'Iceri Aktar'}
            </button>
          </div>
          {importResult && (
            <div className={`mt-3 p-3 rounded-md text-[12px] ${importResult.status === 'error' ? 'bg-[#f85149]/10 text-[#f85149]' : 'bg-[#3fb950]/10 text-[#3fb950]'}`}>
              {importResult.status === 'error'
                ? `Hata: ${importResult.error}`
                : `${importResult.variants_imported} varyant, ${importResult.results_imported} sonuc aktarildi${importResult.error_count > 0 ? ` (${importResult.error_count} hata)` : ''}`}
            </div>
          )}
        </div>
      )}

      {/* Variant Detail View */}
      {selectedVin && detail && !detailLoading && (
        <VariantDetailView detail={detail} />
      )}
      {selectedVin && detailLoading && (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div>
      )}

      {/* Variant List */}
      {!selectedVin && variants.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="Toplam Varyant" value={data.total_variants} color="#06b6d4" />
            <KPICard label="Toplam Sonuc" value={data.total_results} color="#58a6ff" />
            <KPICard label="Ort. CO2" value={variants.length > 0 ? Math.round(variants.reduce((s, v) => s + (v.avg_co2_g_km || 0), 0) / variants.filter(v => v.avg_co2_g_km).length) : '—'} unit="g/km" color="#d29922" />
            <KPICard label="CO2 Araligi" value={variants.length > 0 ? `${Math.round(Math.min(...variants.filter(v => v.min_co2_g_km).map(v => v.min_co2_g_km)))} — ${Math.round(Math.max(...variants.filter(v => v.max_co2_g_km).map(v => v.max_co2_g_km)))}` : '—'} unit="g/km" color="#3fb950" />
          </div>

          {/* Variant Table */}
          <div className="t-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-[#21262d]">
              <h3 className="text-[14px] font-bold text-[#e6edf3]">Varyant Listesi</h3>
            </div>
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#161b22] z-10">
                  <tr className="border-b border-[#21262d]">
                    {['Varyant Kodu', 'Model', 'Grup', 'Motor (kW)', 'Yakit', 'Sonuc', 'Ort. CO2', 'Min CO2', 'Max CO2'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={i} onClick={() => loadDetail(v.vin)}
                      className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 cursor-pointer transition">
                      <td className="px-3 py-2 text-[11px] font-mono text-[#e6edf3]">{v.vin}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-[#58a6ff]">{v.model}</td>
                      <td className="px-3 py-2 text-[11px] text-[#8b949e]">{v.vehicle_group}</td>
                      <td className="px-3 py-2 text-[11px] text-[#8b949e]">{v.engine_rated_power_kw || '—'}</td>
                      <td className="px-3 py-2 text-[11px] text-[#8b949e]">{v.fuel_type || 'Diesel'}</td>
                      <td className="px-3 py-2 text-[11px] font-bold text-[#d29922]">{v.result_count}</td>
                      <td className="px-3 py-2 text-[12px] font-mono font-bold text-[#f97316]">{v.avg_co2_g_km}</td>
                      <td className="px-3 py-2 text-[12px] font-mono text-[#3fb950]">{v.min_co2_g_km}</td>
                      <td className="px-3 py-2 text-[12px] font-mono text-[#f85149]">{v.max_co2_g_km}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!selectedVin && variants.length === 0 && (
        <div className="t-panel p-12 text-center">
          <p className="text-[#484f58] text-[14px]">Henuz cikti verisi yok — yukaridaki alandan Output Files klasorunu aktarin.</p>
        </div>
      )}
    </div>
  );
}


function VariantDetailView({ detail }) {
  const { vehicle, subgroups, summary } = detail;

  return (
    <div className="space-y-6">
      {/* Vehicle Info */}
      <div className="t-panel p-4">
        <div className="grid grid-cols-6 gap-4">
          <InfoItem label="Model" value={vehicle.model} />
          <InfoItem label="Grup" value={vehicle.vehicle_group} />
          <InfoItem label="Kategori" value={vehicle.vehicle_category} />
          <InfoItem label="Motor (kW)" value={vehicle.engine_rated_power_kw} />
          <InfoItem label="Max Yuklenmis" value={vehicle.tech_max_laden_mass_kg ? `${vehicle.tech_max_laden_mass_kg} kg` : '—'} />
          <InfoItem label="VECTO" value={vehicle.tool_version} />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Toplam Sonuc" value={summary.total_results} color="#58a6ff" />
        <KPICard label="Ort. CO2" value={summary.co2_avg} unit="g/km" color="#f97316" />
        <KPICard label="Min CO2" value={summary.co2_min} unit="g/km" color="#3fb950" />
        <KPICard label="Max CO2" value={summary.co2_max} unit="g/km" color="#f85149" />
      </div>

      {/* Subgroup Tables */}
      {Object.entries(subgroups).sort(([a], [b]) => a.localeCompare(b)).map(([sg, data]) => (
        <div key={sg} className="t-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[#21262d] flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SUBGROUP_COLORS[sg] || '#8b949e' }} />
            <h3 className="text-[14px] font-bold text-[#e6edf3]">{sg}</h3>
            {data.co2_avg && (
              <span className="text-[11px] text-[#8b949e]">Ort. CO2: <span className="text-[#f97316] font-bold">{data.co2_avg} g/km</span></span>
            )}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21262d]">
                {['Misyon', 'Yuklenme', 'CO2 (g/km)', 'CO2 (g/p-km)', 'Yakit (g/km)', 'Yakit (L/100km)', 'Enerji (MJ/km)', 'Mesafe', 'Yolcu', 'Kutle (kg)', 'Ort.Hiz', 'Vites Deg.'].map(h => (
                  <th key={h} className="px-2 py-2 text-left text-[9px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.missions
                .sort((a, b) => MISSION_ORDER.indexOf(a.mission) - MISSION_ORDER.indexOf(b.mission) || a.loading.localeCompare(b.loading))
                .map((m, i) => (
                  <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                    <td className="px-2 py-1.5 text-[11px] font-semibold text-[#e6edf3]">{m.mission}</td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.loading === 'LowLoading' ? 'bg-[#3fb950]/10 text-[#3fb950]' : 'bg-[#f85149]/10 text-[#f85149]'}`}>
                        {m.loading === 'LowLoading' ? 'Dusuk' : 'Referans'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-[11px] font-mono font-bold text-[#f97316]">{m.co2_g_km?.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#d29922]">{m.co2_g_pkm?.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#8b949e]">{m.fc_g_km?.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#58a6ff]">{m.fc_l_100km?.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#3fb950]">{m.energy_mj_km?.toFixed(2) || '—'}</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#8b949e]">{m.distance_km?.toFixed(1) || '—'} km</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#8b949e]">{m.passenger_count?.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#8b949e]">{m.total_mass_kg?.toFixed(0)}</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#8b949e]">{m.avg_speed?.toFixed(1)} km/h</td>
                    <td className="px-2 py-1.5 text-[11px] font-mono text-[#8b949e]">{m.gearshift_count || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
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

function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{label}</div>
      <div className="text-[13px] text-[#e6edf3] font-semibold mt-0.5">{value || '—'}</div>
    </div>
  );
}
