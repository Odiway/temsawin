import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function CO2Panel({ onSelectVariant }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('fleet');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importDir, setImportDir] = useState('');
  const [fleetEdits, setFleetEdits] = useState({});
  const [savingFleet, setSavingFleet] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.getFleetEmissions());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // File upload handler
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setImporting(true);
    setImportResult(null);
    const results = [];
    for (const file of files) {
      try {
        const r = await api.importResultFile(file);
        results.push({ file: file.name, ...r });
      } catch (err) {
        results.push({ file: file.name, status: 'error', error: err.message });
      }
    }
    setImportResult(results);
    setImporting(false);
    load();
  };

  // Directory import handler
  const handleDirImport = async () => {
    if (!importDir) return;
    setImporting(true);
    setImportResult(null);
    try {
      const r = await api.importResultDirectory(importDir);
      setImportResult([r]);
    } catch (err) {
      setImportResult([{ status: 'error', error: err.message }]);
    }
    setImporting(false);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" /></div>;

  const fs = data?.fleet_summary;
  const ms = data?.model_summary;
  const vehicles = data?.vehicles || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">CO2 Emisyon Yonetimi</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            Resmi VECTO sonuc dosyalarindan — {fs?.total_vehicles || 0} arac, {fs?.total_results || 0} sonuc
          </p>
        </div>
        <div className="flex gap-2">
          {['fleet', 'models', 'vehicles', 'import'].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${viewMode === m ? 'bg-[#E30613] text-white' : 'bg-[#21262d] text-[#8b949e] hover:text-white'}`}>
              {m === 'fleet' ? 'Filo Ozeti' : m === 'models' ? 'Model Bazli' : m === 'vehicles' ? 'Arac Detay' : 'Sonuc Aktar'}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet KPI Cards */}
      {fs && (
        <div className="grid grid-cols-5 gap-4">
          <KPICard label="Filo Ort. CO2" value={fs.co2_avg} unit="g/km" color="#E30613" />
          <KPICard label="Min CO2" value={fs.co2_min} unit="g/km" color="#3fb950" />
          <KPICard label="Max CO2" value={fs.co2_max} unit="g/km" color="#f85149" />
          <KPICard label="Toplam Arac" value={fs.total_vehicles} unit="VIN" color="#58a6ff" />
          <KPICard label="Sonuc Sayisi" value={fs.total_results} unit="misyon" color="#d29922" />
        </div>
      )}

      {/* Fleet View */}
      {viewMode === 'fleet' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Best & Worst Vehicles */}
          <div className="space-y-4">
            {fs?.best_vehicle && (
              <div className="t-panel p-4 border-l-4 border-[#3fb950]">
                <span className="text-[10px] uppercase tracking-wider text-[#3fb950] font-bold">En Dusuk CO2</span>
                <div className="mt-2">
                  <span className="text-[15px] font-bold text-[#e6edf3]">{fs.best_vehicle.model}</span>
                  <span className="text-[12px] text-[#8b949e] ml-2 font-mono">{fs.best_vehicle.vin}</span>
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  <span className="text-[20px] font-black text-[#3fb950]">
                    {fs.best_vehicle.summary_co2} <span className="text-[11px] font-normal">g/km</span>
                  </span>
                  {fs.best_vehicle.summary_co2_pkm && (
                    <span className="text-[14px] text-[#059669] mt-1">{fs.best_vehicle.summary_co2_pkm} g/p-km</span>
                  )}
                  {fs.best_vehicle.summary_fc_l_100km && (
                    <span className="text-[14px] text-[#8b949e] mt-1">{fs.best_vehicle.summary_fc_l_100km} L/100km</span>
                  )}
                </div>
              </div>
            )}
            {fs?.worst_vehicle && (
              <div className="t-panel p-4 border-l-4 border-[#f85149]">
                <span className="text-[10px] uppercase tracking-wider text-[#f85149] font-bold">En Yuksek CO2</span>
                <div className="mt-2">
                  <span className="text-[15px] font-bold text-[#e6edf3]">{fs.worst_vehicle.model}</span>
                  <span className="text-[12px] text-[#8b949e] ml-2 font-mono">{fs.worst_vehicle.vin}</span>
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  <span className="text-[20px] font-black text-[#f85149]">
                    {fs.worst_vehicle.summary_co2} <span className="text-[11px] font-normal">g/km</span>
                  </span>
                  {fs.worst_vehicle.summary_co2_pkm && (
                    <span className="text-[14px] text-[#059669] mt-1">{fs.worst_vehicle.summary_co2_pkm} g/p-km</span>
                  )}
                  {fs.worst_vehicle.summary_fc_l_100km && (
                    <span className="text-[14px] text-[#8b949e] mt-1">{fs.worst_vehicle.summary_fc_l_100km} L/100km</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Model Summary Bars */}
          <div className="t-panel p-5">
            <h3 className="text-[14px] font-bold text-[#e6edf3] mb-4">Model Bazli CO2 Ortalamasi</h3>
            {ms?.length > 0 ? ms.map((m, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <span className="text-[12px] text-[#8b949e] w-20 font-semibold truncate">{m.model}</span>
                <div className="flex-1 h-8 bg-[#0d1117] rounded relative overflow-hidden">
                  <div className="h-full rounded transition-all duration-700"
                    style={{
                      width: `${Math.min((m.co2_avg / (fs?.co2_max || 1000)) * 100, 100)}%`,
                      background: `linear-gradient(90deg, #E30613, ${m.co2_avg > (fs?.co2_avg || 0) ? '#f85149' : '#3fb950'})`,
                    }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
                    {m.co2_avg} g/km ({m.vehicle_count} arac)
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-[#484f58] text-center py-4">Henuz VECTO sonucu yok</div>
            )}
          </div>
        </div>
      )}

      {/* Model View */}
      {viewMode === 'models' && (
        <div className="space-y-3">
          {ms?.length > 0 ? ms.map((m, i) => (
            <div key={i} className="t-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-[15px] font-bold text-[#e6edf3]">{m.model}</h4>
                  <span className="text-[11px] text-[#8b949e]">{m.vehicle_count} arac</span>
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
                </div>
              </div>
              <div className="h-3 bg-[#0d1117] rounded overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-[#3fb950] via-[#d29922] to-[#f85149] rounded" style={{ width: '100%', opacity: 0.3 }} />
                <div className="absolute top-0 h-full w-0.5 bg-[#E30613]"
                  style={{ left: `${((m.co2_avg - (fs?.co2_min || 0)) / ((fs?.co2_max || 1) - (fs?.co2_min || 0))) * 100}%` }} />
              </div>
            </div>
          )) : <div className="t-panel p-6 text-[#484f58] text-center">Veri yok — VECTO sonuc dosyalarini yukleyin</div>}
        </div>
      )}

      {/* Vehicle Detail View */}
      {viewMode === 'vehicles' && (
        <div className="space-y-3">
          {/* Fleet Count Save Bar */}
          {Object.keys(fleetEdits).length > 0 && (
            <div className="flex items-center justify-between p-3 bg-[#E30613]/10 border border-[#E30613]/30 rounded-lg">
              <span className="text-[12px] text-[#E30613] font-semibold">{Object.keys(fleetEdits).length} varyant degistirildi</span>
              <button onClick={async () => {
                setSavingFleet(true);
                try {
                  const updates = Object.entries(fleetEdits).map(([variant_id, fleet_count]) => ({ variant_id, fleet_count }));
                  await api.updateFleetCounts(updates);
                  setFleetEdits({});
                  await load();
                } catch (e) { console.error(e); }
                setSavingFleet(false);
              }} disabled={savingFleet}
                className="px-4 py-1.5 bg-[#E30613] text-white rounded-md text-[12px] font-semibold disabled:opacity-50">
                {savingFleet ? 'Kaydediliyor...' : 'Filo Sayilarini Kaydet'}
              </button>
            </div>
          )}

          {vehicles.length > 0 ? vehicles.map((v, i) => {
            const currentFleet = fleetEdits[v.variant_id] !== undefined ? fleetEdits[v.variant_id] : (v.fleet_count || 0);
            return (
            <div key={i} className="t-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-[15px] font-bold text-[#e6edf3]">{v.model || 'Bilinmeyen Model'}</h4>
                  <span className="text-[11px] text-[#8b949e] font-mono">{v.vin}</span>
                  <div className="flex gap-3 mt-1 text-[10px] text-[#484f58]">
                    {v.vehicle_group && <span>Grup: {v.vehicle_group}</span>}
                    {v.class_bus && <span>Sinif: {v.class_bus}</span>}
                    {v.power_kw && <span>{v.power_kw} kW</span>}
                    {v.fuel_type && <span>{v.fuel_type}</span>}
                    {v.total_passengers && <span>{v.total_passengers} yolcu</span>}
                  </div>
                </div>
                <div className="flex gap-4 items-end">
                  {/* Fleet Count Controls */}
                  {v.variant_id && (
                    <div className="text-center">
                      <div className="text-[10px] text-[#484f58] uppercase mb-1">Filo Sayisi</div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setFleetEdits(prev => ({ ...prev, [v.variant_id]: Math.max(0, currentFleet - 1) }))}
                          className="w-6 h-6 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded text-[14px] font-bold flex items-center justify-center">−</button>
                        <span className="w-10 text-center text-[16px] font-black text-[#58a6ff]">{currentFleet}</span>
                        <button onClick={() => setFleetEdits(prev => ({ ...prev, [v.variant_id]: currentFleet + 1 }))}
                          className="w-6 h-6 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded text-[14px] font-bold flex items-center justify-center">+</button>
                      </div>
                    </div>
                  )}
                  {v.summary_co2 && (
                    <div className="text-center">
                      <div className="text-[10px] text-[#484f58] uppercase">Ozet CO2</div>
                      <div className="text-[22px] font-black text-[#E30613]">{v.summary_co2}</div>
                      <div className="text-[10px] text-[#484f58]">g/km</div>
                    </div>
                  )}
                  {v.summary_co2_pkm && (
                    <div className="text-center">
                      <div className="text-[10px] text-[#484f58] uppercase">CO2/Yolcu</div>
                      <div className="text-[18px] font-bold text-[#059669]">{v.summary_co2_pkm}</div>
                      <div className="text-[10px] text-[#484f58]">g/p-km</div>
                    </div>
                  )}
                  {v.summary_fc_l_100km && (
                    <div className="text-center">
                      <div className="text-[10px] text-[#484f58] uppercase">Yakit</div>
                      <div className="text-[18px] font-bold text-[#58a6ff]">{v.summary_fc_l_100km}</div>
                      <div className="text-[10px] text-[#484f58]">L/100km</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mission breakdown */}
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-[#484f58] border-b border-[#21262d]">
                      {['Misyon','Yuk','Durum','Yolcu','Y.Kut.(kg)','A.Kut.(kg)','Hiz(km/h)','Yakit Tipi',
                        'g/km','g/p-km','MJ/km','MJ/p-km','L/100km','L/p-km','CO2 g/km','CO2 g/p-km'].map((h,i)=>(
                        <th key={i} className="px-1.5 py-1 text-left font-bold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {v.missions?.map((m, j) => (
                      <tr key={j} className="border-b border-[#161b22] hover:bg-[#161b22]">
                        <td className="px-1.5 py-1 font-semibold text-[#e6edf3]">{m.mission}</td>
                        <td className="px-1.5 py-1 text-[#8b949e]">{m.loading}</td>
                        <td className="px-1.5 py-1 text-[#3fb950]">{m.status || '—'}</td>
                        <td className="px-1.5 py-1 text-[#8b949e]">{m.passengers ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[#8b949e]">{m.mass_passengers_kg ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[#8b949e]">{m.total_mass_kg ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[#8b949e]">{m.avg_speed ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[#8b949e]">{m.fuel_type || '—'}</td>
                        <td className="px-1.5 py-1 font-semibold text-[#d97706]">{m.fc_g_km?.toFixed(1) ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[#d97706]">{m.fc_g_pkm?.toFixed(3) ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[#d97706]">{m.fc_mj_km?.toFixed(2) ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[#d97706]">{m.fc_mj_pkm?.toFixed(4) ?? '—'}</td>
                        <td className="px-1.5 py-1 font-semibold text-[#58a6ff]">{m.fc_l_100km?.toFixed(2) ?? '—'}</td>
                        <td className="px-1.5 py-1 text-[#58a6ff]">{m.fc_l_pkm?.toFixed(5) ?? '—'}</td>
                        <td className="px-1.5 py-1 font-semibold text-[#E30613]">{m.co2_g_km?.toFixed(1) ?? '—'}</td>
                        <td className="px-1.5 py-1 font-semibold text-[#059669]">{m.co2_g_pkm?.toFixed(2) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
          }) : (
            <div className="t-panel p-8 text-center">
              <div className="text-[#484f58] text-lg mb-2">Henuz VECTO Sonucu Yok</div>
              <p className="text-[#484f58] text-[13px] mb-4">VECTO sonuc dosyalarini (RSLT_CUSTOMER veya RSLT_MANUFACTURER XML) yukleyin</p>
              <button onClick={() => setViewMode('import')} className="px-4 py-2 bg-[#E30613] text-white rounded-md text-[13px] font-semibold">
                Sonuc Aktar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Import View */}
      {viewMode === 'import' && (
        <div className="space-y-4">
          {/* File Upload */}
          <div className="t-panel p-6">
            <h3 className="text-[14px] font-bold text-[#e6edf3] mb-1">VECTO Sonuc Dosyasi Yukle</h3>
            <p className="text-[11px] text-[#484f58] mb-4">RSLT_CUSTOMER veya RSLT_MANUFACTURER XML dosyalarini secin</p>
            <label className="block">
              <input type="file" accept=".xml" multiple onChange={handleFileUpload} disabled={importing}
                className="block w-full text-[12px] text-[#8b949e] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[12px] file:font-semibold file:bg-[#E30613] file:text-white hover:file:bg-[#c8050f] file:cursor-pointer" />
            </label>
          </div>

          {/* Directory Import */}
          <div className="t-panel p-6">
            <h3 className="text-[14px] font-bold text-[#e6edf3] mb-1">Klasorden Toplu Aktar</h3>
            <p className="text-[11px] text-[#484f58] mb-4">VECTO sonuc dosyalarinin bulundugu klasor yolunu girin</p>
            <div className="flex gap-2">
              <input type="text" value={importDir} onChange={e => setImportDir(e.target.value)}
                placeholder="C:\Vecto\Results veya \\server\share\results"
                className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#e6edf3] placeholder-[#484f58] focus:border-[#E30613] outline-none" />
              <button onClick={handleDirImport} disabled={importing || !importDir}
                className="px-4 py-2 bg-[#E30613] text-white rounded-md text-[12px] font-semibold disabled:opacity-50">
                {importing ? 'Aktariliyor...' : 'Aktar'}
              </button>
            </div>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="t-panel p-6">
              <h3 className="text-[14px] font-bold text-[#e6edf3] mb-3">Aktarim Sonucu</h3>
              <div className="space-y-2">
                {importResult.map((r, i) => (
                  <div key={i} className={`p-3 rounded border ${r.status === 'success' ? 'border-[#3fb950]/30 bg-[#3fb950]/5' : 'border-[#f85149]/30 bg-[#f85149]/5'}`}>
                    {r.file && <div className="text-[12px] font-mono text-[#e6edf3]">{r.file}</div>}
                    {r.vin && <div className="text-[11px] text-[#8b949e]">VIN: {r.vin} — {r.model}</div>}
                    {r.results_imported != null && <div className="text-[11px] text-[#3fb950]">{r.results_imported} sonuc aktarildi</div>}
                    {r.summary_co2 && <div className="text-[11px] text-[#E30613]">Ozet CO2: {r.summary_co2} g/km</div>}
                    {r.files_processed != null && <div className="text-[11px] text-[#8b949e]">{r.files_processed} dosya islendi, {r.results_imported} sonuc aktarildi</div>}
                    {r.error && <div className="text-[11px] text-[#f85149]">{r.error}</div>}
                    {r.errors?.length > 0 && r.errors.map((e, j) => (
                      <div key={j} className="text-[10px] text-[#f85149]">{e.file}: {e.error}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Importing spinner */}
          {importing && (
            <div className="flex items-center gap-3 p-4 t-panel">
              <div className="w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] text-[#8b949e]">VECTO sonuclari aktariliyor...</span>
            </div>
          )}
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
