import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function CorrelationPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddTest, setShowAddTest] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.getCorrelation());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" /></div>;

  const s = data?.summary || {};
  const pairs = data?.pairs || [];
  const vectoOverview = data?.vecto_overview || [];
  const qLevel = typeof s.quality === 'object' ? s.quality?.level : s.quality;
  const qualityColor = { excellent: '#3fb950', good: '#58a6ff', moderate: '#d29922', poor: '#f85149', no_data: '#484f58' }[qLevel] || '#8b949e';
  const qualityLabel = { excellent: 'MUKEMMEL', good: 'IYI', moderate: 'ORTA', poor: 'ZAYIF', no_data: 'VERI YOK' }[qLevel] || 'BILINMIYOR';
  const qualityNote = typeof s.quality === 'object' ? s.quality?.note : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">Korelasyon Analizi</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            Resmi VECTO sonuclari vs test ekibi gercek olcum verileri — {data?.vecto_results_count || 0} VECTO sonucu, {data?.test_results_count || 0} test verisi
          </p>
        </div>
        <div className="flex gap-2">
          {['overview', 'vecto', 'pairs', 'add-test'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${activeTab === t ? 'bg-[#3b82f6] text-white' : 'bg-[#21262d] text-[#8b949e] hover:text-white'}`}>
              {t === 'overview' ? 'Genel' : t === 'vecto' ? 'VECTO Sonuclari' : t === 'pairs' ? 'Korelasyon Ciftleri' : 'Test Verisi Ekle'}
            </button>
          ))}
        </div>
      </div>

      {/* Quality Badge + KPIs */}
      <div className="grid grid-cols-6 gap-4">
        <div className="t-panel p-4 col-span-2 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-4" style={{ borderColor: qualityColor }}>
            <span className="text-[11px] font-black text-center leading-tight" style={{ color: qualityColor }}>{qualityLabel}</span>
          </div>
          <div>
            <div className="text-[10px] text-[#484f58] uppercase font-bold">Korelasyon Kalitesi</div>
            <div className="text-[28px] font-black" style={{ color: qualityColor }}>{s.r_squared?.toFixed(4) ?? '—'}</div>
            <div className="text-[11px] text-[#484f58]">R² (Belirleme Katsayisi)</div>
            {qualityNote && <div className="text-[10px] mt-1" style={{ color: qualityColor }}>{qualityNote}</div>}
          </div>
        </div>
        <KPI label="MAPE" value={s.mape_pct != null ? `%${s.mape_pct.toFixed(1)}` : '—'} desc="Ort. Mutlak Yuzde Hata" color={s.mape_pct != null ? (s.mape_pct < 20 ? '#3fb950' : s.mape_pct < 50 ? '#d29922' : '#f85149') : '#484f58'} />
        <KPI label="Bias" value={s.bias_g_km != null ? `${s.bias_g_km.toFixed(0)}` : '—'} desc="g/km (sistematik sapma)" color={s.bias_g_km != null ? (Math.abs(s.bias_g_km) < 100 ? '#3fb950' : '#f85149') : '#484f58'} />
        <KPI label="RMSE" value={s.rmse_g_km != null ? `${s.rmse_g_km.toFixed(0)}` : '—'} desc="g/km (kok ort. kare hata)" color={s.rmse_g_km != null ? (s.rmse_g_km < 200 ? '#3fb950' : '#f85149') : '#484f58'} />
        <KPI label="Eslesme" value={s.total_pairs || 0} desc={`VECTO-Test cifti`} color="#58a6ff" />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Interpretation */}
          <div className="t-panel p-5">
            <h3 className="text-[14px] font-bold text-[#e6edf3] mb-3">Yorum</h3>
            <div className="space-y-3 text-[12px] text-[#8b949e] leading-relaxed">
              {pairs.length > 0 ? (
                <>
                  <p>
                    Resmi VECTO simulasyon sonuclari ile test ekibinin gercek olcum verileri karsilastirilmaktadir.
                    <span style={{ color: qualityColor }} className="font-semibold ml-1">
                      {s.bias_g_km > 0 ? 'Test verileri VECTO sonuclarindan yuksek' : s.bias_g_km < 0 ? 'Test verileri VECTO sonuclarindan dusuk' : 'Denge durumunda'}
                    </span>.
                  </p>
                  <p>
                    Ortalama sapma: <span className="text-[#f97316] font-bold">{s.bias_g_km?.toFixed(0)} g/km</span>.
                    Bu, gercek kosullardaki ek direncler (klima, trafik, surucu davranisi) nedeniyle beklenen bir sonuctur.
                  </p>
                  <div className="p-3 bg-[#0d1117] rounded-md border border-[#30363d] mt-2">
                    <span className="text-[10px] uppercase font-bold text-[#d29922]">R&D Aksiyonu</span>
                    <p className="mt-1 text-[11px]">
                      Korelasyonu iyilestirmek icin: (1) Farkli kosullarda test tekrarları yapilmasi,
                      (2) Test koşullarinin standardize edilmesi (sicaklik, ruzgar, yol profili),
                      (3) Daha fazla varyant icin test verisi toplanmasi.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-[#484f58] mb-3">Henuz korelasyon verisi yok.</p>
                  <p className="text-[#8b949e]">VECTO sonuclari yuklendikten sonra, test ekibinden gelen gercek olcum verilerini ekleyin.</p>
                  <button onClick={() => setActiveTab('add-test')} className="mt-3 px-4 py-2 bg-[#3b82f6] text-white rounded-md text-[12px] font-semibold">
                    Test Verisi Ekle
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Scatter plot */}
          <div className="t-panel p-5">
            <h3 className="text-[14px] font-bold text-[#e6edf3] mb-3">VECTO vs Test — Dagılım</h3>
            {pairs.length > 0 ? (
              <ScatterPlot pairs={pairs} />
            ) : (
              <div className="flex items-center justify-center h-48 text-[#484f58] text-[13px]">Eslestirilmis veri yok</div>
            )}
          </div>
        </div>
      )}

      {/* VECTO Results Tab */}
      {activeTab === 'vecto' && (
        <div className="t-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21262d]">
                {['VIN', 'Model', 'Misyon', 'Yukleme', 'CO2 (g/km)', 'Yakit (L/100km)'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vectoOverview.length > 0 ? vectoOverview.map((r, i) => (
                <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                  <td className="px-3 py-2 text-[11px] text-[#8b949e] font-mono">{r.vin?.substring(0, 17)}</td>
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3]">{r.model}</td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e] capitalize">{r.mission}</td>
                  <td className="px-3 py-2 text-[11px] text-[#8b949e]">{r.loading}</td>
                  <td className="px-3 py-2 text-[12px] font-mono text-[#3fb950]">{r.co2_g_km?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2 text-[12px] font-mono text-[#58a6ff]">{r.fc_l_100km?.toFixed(1) ?? '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-[#484f58]">Henuz VECTO sonucu yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pairs Tab */}
      {activeTab === 'pairs' && (
        <div className="t-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21262d]">
                {['Model', 'Varyant', 'Test Tipi', 'VECTO CO2', 'Test CO2', 'Fark (g/km)', 'Fark %', 'Test Tarihi'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pairs.length > 0 ? pairs.map((p, i) => {
                const dc = Math.abs(p.delta_pct || 0) < 15 ? '#3fb950' : Math.abs(p.delta_pct || 0) < 30 ? '#d29922' : '#f85149';
                return (
                  <tr key={i} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/30 transition">
                    <td className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3]">{p.model_name}</td>
                    <td className="px-3 py-2 text-[11px] text-[#8b949e] font-mono">{p.variant_code?.substring(0, 15)}</td>
                    <td className="px-3 py-2 text-[11px] text-[#8b949e] capitalize">{p.test_type}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-[#3fb950]">{p.vecto_co2?.toFixed(1)}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-[#58a6ff]">{p.test_co2?.toFixed(1)}</td>
                    <td className="px-3 py-2 text-[12px] font-mono font-semibold" style={{ color: dc }}>
                      {p.delta > 0 ? '+' : ''}{p.delta?.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-[12px] font-mono font-semibold" style={{ color: dc }}>
                      {p.delta_pct > 0 ? '+' : ''}{p.delta_pct?.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-[10px] text-[#484f58]">{p.test_date?.substring(0, 10)}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-[#484f58]">
                  Henuz korelasyon cifti yok — test verisi ekleyin
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Test Data Tab */}
      {activeTab === 'add-test' && <TestDataForm onAdded={load} />}
    </div>
  );
}

function TestDataForm({ onAdded }) {
  const [variants, setVariants] = useState([]);
  const [form, setForm] = useState({
    variant_id: '', test_type: 'track', co2_g_per_km: '', fuel_l_per_100km: '', notes: '', tested_at: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getVariants().then(d => setVariants(d.variants || d)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.variant_id || (!form.co2_g_per_km && !form.fuel_l_per_100km)) return;
    setSubmitting(true);
    try {
      const payload = {
        variant_id: form.variant_id,
        test_type: form.test_type,
        co2_g_per_km: form.co2_g_per_km ? parseFloat(form.co2_g_per_km) : null,
        fuel_l_per_100km: form.fuel_l_per_100km ? parseFloat(form.fuel_l_per_100km) : null,
        notes: form.notes || null,
        tested_at: form.tested_at || null,
      };
      await api.addTestData(payload);
      setResult({ status: 'success', msg: 'Test verisi eklendi!' });
      setForm({ variant_id: '', test_type: 'track', co2_g_per_km: '', fuel_l_per_100km: '', notes: '', tested_at: '' });
      onAdded?.();
    } catch (err) {
      setResult({ status: 'error', msg: err.message });
    }
    setSubmitting(false);
  };

  return (
    <div className="t-panel p-6 max-w-2xl">
      <h3 className="text-[14px] font-bold text-[#e6edf3] mb-1">Test Ekibi Verisi Ekle</h3>
      <p className="text-[11px] text-[#484f58] mb-4">Gercek test olcum sonuclarini girin — VECTO sonuclariyla korelasyon icin</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-[#8b949e] block mb-1">Varyant</label>
            <select value={form.variant_id} onChange={e => setForm(f => ({ ...f, variant_id: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#e6edf3] focus:border-[#3b82f6] outline-none">
              <option value="">Secin...</option>
              {variants.map(v => (
                <option key={v.id} value={v.id}>{v.variant_code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[#8b949e] block mb-1">Test Tipi</label>
            <select value={form.test_type} onChange={e => setForm(f => ({ ...f, test_type: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#e6edf3] focus:border-[#3b82f6] outline-none">
              <option value="track">Pist Testi</option>
              <option value="road">Yol Testi</option>
              <option value="endurance">Dayaniklilik</option>
              <option value="customer">Musteri Sahasi</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[#8b949e] block mb-1">CO2 (g/km)</label>
            <input type="number" step="0.1" value={form.co2_g_per_km} onChange={e => setForm(f => ({ ...f, co2_g_per_km: e.target.value }))}
              placeholder="ör: 750.5"
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#e6edf3] placeholder-[#484f58] focus:border-[#3b82f6] outline-none" />
          </div>
          <div>
            <label className="text-[11px] text-[#8b949e] block mb-1">Yakit (L/100km)</label>
            <input type="number" step="0.1" value={form.fuel_l_per_100km} onChange={e => setForm(f => ({ ...f, fuel_l_per_100km: e.target.value }))}
              placeholder="ör: 28.5"
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#e6edf3] placeholder-[#484f58] focus:border-[#3b82f6] outline-none" />
          </div>
          <div>
            <label className="text-[11px] text-[#8b949e] block mb-1">Test Tarihi</label>
            <input type="date" value={form.tested_at} onChange={e => setForm(f => ({ ...f, tested_at: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#e6edf3] focus:border-[#3b82f6] outline-none" />
          </div>
          <div>
            <label className="text-[11px] text-[#8b949e] block mb-1">Notlar</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Test kosullari, sicaklik, vb."
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#e6edf3] placeholder-[#484f58] focus:border-[#3b82f6] outline-none" />
          </div>
        </div>
        <button type="submit" disabled={submitting || !form.variant_id}
          className="px-4 py-2 bg-[#3b82f6] text-white rounded-md text-[12px] font-semibold disabled:opacity-50">
          {submitting ? 'Ekleniyor...' : 'Test Verisi Ekle'}
        </button>
      </form>

      {result && (
        <div className={`mt-3 p-3 rounded text-[12px] ${result.status === 'success' ? 'bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30' : 'bg-[#f85149]/10 text-[#f85149] border border-[#f85149]/30'}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, desc, color }) {
  return (
    <div className="t-panel p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[#484f58] font-bold">{label}</div>
      <div className="text-[22px] font-black mt-1" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[#484f58]">{desc}</div>
    </div>
  );
}

function ScatterPlot({ pairs }) {
  if (!pairs?.length) return null;
  const maxVal = Math.max(...pairs.map(p => Math.max(p.vecto_co2 || 0, p.test_co2 || 0))) * 1.15;
  const W = 500, H = 400, P = 50;
  const plotW = W - P * 2, plotH = H - P * 2;

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[500px]">
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={P} y1={P + plotH * (1 - f)} x2={P + plotW} y2={P + plotH * (1 - f)} stroke="#21262d" strokeWidth={0.5} />
            <text x={P - 5} y={P + plotH * (1 - f) + 3} textAnchor="end" fill="#484f58" fontSize="8">{(maxVal * f).toFixed(0)}</text>
            <line x1={P + plotW * f} y1={P} x2={P + plotW * f} y2={P + plotH} stroke="#21262d" strokeWidth={0.5} />
            <text x={P + plotW * f} y={P + plotH + 15} textAnchor="middle" fill="#484f58" fontSize="8">{(maxVal * f).toFixed(0)}</text>
          </g>
        ))}
        {/* Perfect 1:1 line */}
        <line x1={P} y1={P + plotH} x2={P + plotW} y2={P} stroke="#30363d" strokeWidth={1} strokeDasharray="4 4" />
        {/* Points */}
        {pairs.map((p, i) => {
          const x = P + (p.vecto_co2 / maxVal) * plotW;
          const y = P + plotH - (p.test_co2 / maxVal) * plotH;
          const c = Math.abs(p.delta_pct || 0) < 15 ? '#3fb950' : Math.abs(p.delta_pct || 0) < 30 ? '#d29922' : '#f85149';
          return <circle key={i} cx={x} cy={y} r={5} fill={c} opacity={0.85} stroke="#0d1117" strokeWidth={1}>
            <title>{p.model_name} | VECTO:{p.vecto_co2?.toFixed(0)} Test:{p.test_co2?.toFixed(0)} ({p.delta_pct?.toFixed(1)}%)</title>
          </circle>;
        })}
        <text x={P + plotW / 2} y={H - 5} textAnchor="middle" fill="#8b949e" fontSize="10">VECTO CO2 (g/km)</text>
        <text x={12} y={P + plotH / 2} textAnchor="middle" fill="#8b949e" fontSize="10" transform={`rotate(-90, 12, ${P + plotH / 2})`}>Test CO2 (g/km)</text>
      </svg>
      <div className="ml-4 space-y-1 mt-6">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3fb950]" /><span className="text-[10px] text-[#8b949e]">&lt;15% fark</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#d29922]" /><span className="text-[10px] text-[#8b949e]">15-30% fark</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f85149]" /><span className="text-[10px] text-[#8b949e]">&gt;30% fark</span></div>
        <div className="flex items-center gap-2 mt-2"><div className="w-8 h-0 border-t border-dashed border-[#30363d]" /><span className="text-[10px] text-[#484f58]">1:1 cizgi</span></div>
      </div>
    </div>
  );
}
