import { useState, useRef } from 'react';

const API = '/api/pdf-report';

export default function PdfConverterPanel() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [pdfFormat, setPdfFormat] = useState('temsa');
  const dropRef = useRef(null);

  const handleFile = async (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.xml')) {
      setError('Lütfen bir XML dosyası seçin');
      return;
    }
    setFile(f);
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const res = await fetch(`${API}/preview`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).detail || 'Parse error');
      setPreview(await res.json());
    } catch (e) {
      setError(`XML okunamadı: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('ring-2', 'ring-[#C8102E]');
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  };

  const downloadPdf = async () => {
    if (!file) return;
    setGenerating(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/generate?format=${pdfFormat}`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).detail || 'PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${preview?.vehicle?.vin || 'VECTO'}_${pdfFormat === 'ec' ? 'EC_Report' : 'Report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`PDF oluşturulamadı: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  const v = preview?.vehicle;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C8102E]/10 border border-[#C8102E]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#C8102E]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            VECTO Rapor Dönüştürücü
          </h1>
          <p className="text-[13px] text-[#8b949e] mt-1">XML dosyasını yükleyin → PDF rapor olarak indirin</p>
        </div>
        {preview && (
          <button onClick={reset} className="px-4 py-2 rounded-lg bg-[#21262d] text-[#8b949e] text-[12px] font-semibold hover:text-white hover:bg-[#30363d] transition">
            Yeni Dosya Yükle
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-medium">
          {error}
        </div>
      )}

      {/* Upload area */}
      {!preview && !loading && (
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('ring-2', 'ring-[#C8102E]'); }}
          onDragLeave={() => dropRef.current?.classList.remove('ring-2', 'ring-[#C8102E]')}
          className="border-2 border-dashed border-[#30363d] rounded-xl p-16 text-center hover:border-[#C8102E]/40 transition-all cursor-pointer bg-[#161b22]/50"
          onClick={() => document.getElementById('xml-upload').click()}
        >
          <input
            id="xml-upload"
            type="file"
            accept=".xml"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="w-16 h-16 rounded-2xl bg-[#C8102E]/8 border border-[#C8102E]/15 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#C8102E]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[16px] font-bold text-[#e6edf3] mb-2">VECTO Result XML Dosyası Yükleyin</h3>
          <p className="text-[13px] text-[#8b949e] mb-4">Sürükle-bırak veya tıklayarak dosya seçin</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#21262d] text-[12px] text-[#8b949e]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" /></svg>
            NLTRHUK8X01001349.RSLT_CUSTOMER.xml gibi dosyalar
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-[#C8102E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[14px] text-[#8b949e]">XML dosyası okunuyor...</p>
        </div>
      )}

      {/* Preview + Download */}
      {preview && (
        <div className="space-y-5">
          {/* Format selector + Download bar */}
          <div className="p-4 rounded-xl bg-[#C8102E]/5 border border-[#C8102E]/15 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#C8102E]/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#C8102E]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">{file?.name}</p>
                  <p className="text-[11px] text-[#8b949e]">VIN: {v?.vin} · Model: {v?.model} · {preview.missions?.length || 0} misyon</p>
                </div>
              </div>
              <button
                onClick={downloadPdf}
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C8102E] text-white text-[13px] font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Oluşturuluyor...</>
                ) : (
                  <><svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg> PDF İndir</>
                )}
              </button>
            </div>

            {/* Format selector */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#8b949e] font-semibold">PDF Formatı:</span>
              <div className="flex rounded-lg overflow-hidden border border-[#30363d]">
                <button
                  onClick={() => setPdfFormat('temsa')}
                  className={`px-4 py-2 text-[12px] font-semibold transition-all ${
                    pdfFormat === 'temsa'
                      ? 'bg-[#C8102E] text-white'
                      : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm1 5a1 1 0 00-1 1v2a1 1 0 001 1h12a1 1 0 001-1v-2a1 1 0 00-1-1H4z" /></svg>
                    TEMSA (Tablolu)
                  </span>
                </button>
                <button
                  onClick={() => setPdfFormat('ec')}
                  className={`px-4 py-2 text-[12px] font-semibold transition-all ${
                    pdfFormat === 'ec'
                      ? 'bg-[#1f6032] text-white'
                      : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                    European Commission
                  </span>
                </button>
              </div>
              <span className="text-[10px] text-[#484f58] ml-1">
                {pdfFormat === 'temsa' ? 'Detaylı tablo formatı' : 'AB resmi VECTO CO₂ rapor formatı'}
              </span>
            </div>
          </div>

          {/* Preview grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Vehicle card */}
            <div className="t-panel col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#C8102E]" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" /><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <h2 className="text-[14px] font-bold text-white">Araç Bilgileri</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  ['VIN', v?.vin],
                  ['Model', v?.model],
                  ['Kategori', v?.category],
                  ['Araç Grubu', v?.vehicle_group],
                  ['Araç Grubu CO₂', v?.vehicle_group_co2],
                  ['Dingil Konfigürasyonu', v?.axle_config],
                  ['Max Yüklü Kütle', `${v?.max_laden_mass} ${v?.max_laden_mass_unit}`],
                  ['Düzeltilmiş Kütle', `${v?.corrected_mass} ${v?.corrected_mass_unit}`],
                  ['Toplam Tahrik Gücü', `${v?.total_propulsion_power} ${v?.total_propulsion_power_unit}`],
                  ['Otobüs Sınıfı', v?.bus_class],
                  ['Toplam Yolcu', v?.total_passengers],
                  ['Tip Onay No', v?.type_approval],
                ].map(([k, val], i) => (
                  <div key={i} className="flex justify-between items-baseline py-1.5 border-b border-[#21262d]">
                    <span className="text-[11px] text-[#8b949e]">{k}</span>
                    <span className="text-[11px] font-semibold text-[#e6edf3]">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Engine + ADAS card */}
            <div className="space-y-4">
              <div className="t-panel">
                <div className="flex items-center gap-2 mb-3">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#2563eb]" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <h2 className="text-[13px] font-bold text-white">Motor & Şanzıman</h2>
                </div>
                {[
                  ['Motor Gücü', `${v?.engine_power} ${v?.engine_power_unit}`],
                  ['Motor Hacmi', `${v?.engine_capacity} ${v?.engine_capacity_unit}`],
                  ['Yakıt Tipi', v?.fuel_type],
                  ['Şanzıman', `${v?.transmission_type} (${v?.nr_gears} vites)`],
                  ['Aks Oranı', v?.axle_ratio],
                  ['Retarder', v?.retarder],
                ].map(([k, val], i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-[#21262d]">
                    <span className="text-[10px] text-[#8b949e]">{k}</span>
                    <span className="text-[10px] font-semibold text-[#e6edf3]">{val}</span>
                  </div>
                ))}
              </div>

              <div className="t-panel">
                <h2 className="text-[13px] font-bold text-white mb-3">ADAS</h2>
                {[
                  ['Motor Start/Stop', v?.adas?.engine_stop_start],
                  ['Eco-Roll', v?.adas?.eco_roll_no_stop],
                  ['Prediktif Cruise', v?.adas?.predictive_cc],
                ].map(([k, val], i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-[#21262d]">
                    <span className="text-[10px] text-[#8b949e]">{k}</span>
                    <span className={`text-[10px] font-semibold ${val === 'true' ? 'text-[#3fb950]' : 'text-[#8b949e]'}`}>{val === 'true' ? 'Evet' : 'Hayır'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="t-panel">
            <div className="flex items-center gap-2 mb-4">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <h2 className="text-[14px] font-bold text-white">Simülasyon Sonuçları</h2>
              <span className="ml-auto text-[11px] text-[#3fb950] font-semibold bg-[#3fb950]/10 px-2 py-0.5 rounded">{preview.status}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#C8102E]/10 text-[#C8102E]">
                    {['Misyon', 'Durum', 'Yolcu', 'Yolcu Küt.', 'Araç Kütlesi', 'Ort. Hız', 'Yakıt Tipi', 'Yakıt (g/km)', 'Yakıt (g/p-km)', 'Yakıt (MJ/km)', 'Yakıt (l/100km)', 'Yakıt (l/p-km)', 'CO₂ (g/km)', 'CO₂ (g/p-km)'].map((h, i) => (
                      <th key={i} className="px-2 py-2.5 text-left font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.missions?.map((m, i) => (
                    <tr key={i} className="border-b border-[#21262d] hover:bg-[#161b22]">
                      <td className="px-2 py-2 font-semibold text-white">{m.mission} ({parseFloat(m.passenger_count) < 30 ? 'Low' : 'High'})</td>
                      <td className="px-2 py-2 text-[#3fb950]">{m.status || '—'}</td>
                      <td className="px-2 py-2 text-[#8b949e]">{m.passenger_count}</td>
                      <td className="px-2 py-2 text-[#8b949e]">{m.mass_passengers || '—'} kg</td>
                      <td className="px-2 py-2 text-[#8b949e]">{m.total_mass} kg</td>
                      <td className="px-2 py-2 text-[#8b949e]">{m.avg_speed} km/h</td>
                      <td className="px-2 py-2 text-[#8b949e]">{m.fuel_type || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-[#d97706]">{m.fuel?.['g/km'] || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-[#d97706]">{m.fuel?.['g/p-km'] || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-[#d97706]">{m.fuel?.['MJ/km'] || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-[#2563eb]">{m.fuel?.['l/100km'] || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-[#2563eb]">{m.fuel?.['l/p-km'] || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-[#C8102E]">{m.co2?.['g/km'] || '—'}</td>
                      <td className="px-2 py-2 font-semibold text-[#059669]">{m.co2?.['g/p-km'] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary row */}
          {preview.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'CO₂ Emisyonu', val: preview.summary.co2?.['g/km'], unit: 'g/km', color: '#C8102E' },
                { label: 'CO₂ (Yolcu başı)', val: preview.summary.co2?.['g/p-km'], unit: 'g/p-km', color: '#059669' },
                { label: 'Yakıt (l/100km)', val: preview.summary.fuel?.['l/100km'], unit: 'l/100km', color: '#2563eb' },
                { label: 'Yakıt (l/p-km)', val: preview.summary.fuel?.['l/p-km'], unit: 'l/p-km', color: '#2563eb' },
                { label: 'Yakıt (g/km)', val: preview.summary.fuel?.['g/km'], unit: 'g/km', color: '#d97706' },
                { label: 'Yakıt (g/p-km)', val: preview.summary.fuel?.['g/p-km'], unit: 'g/p-km', color: '#d97706' },
                { label: 'Yakıt (MJ/km)', val: preview.summary.fuel?.['MJ/km'], unit: 'MJ/km', color: '#d97706' },
                { label: 'Yakıt (MJ/p-km)', val: preview.summary.fuel?.['MJ/p-km'], unit: 'MJ/p-km', color: '#d97706' },
                { label: 'Ort. Yolcu', val: preview.summary.avg_passengers, unit: 'kişi', color: '#8b5cf6' },
                { label: 'Vocational', val: preview.summary.vocational, unit: '', color: '#6b7280' },
              ].filter(s => s.val && s.val !== '—').map((s, i) => (
                <div key={i} className="t-panel text-center">
                  <p className="text-[24px] font-extrabold tracking-tight" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] text-[#8b949e] font-semibold mt-0.5">{s.unit}</p>
                  <p className="text-[11px] text-[#e6edf3] font-semibold mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Signatures */}
          {preview.signatures?.length > 0 && (
            <div className="t-panel">
              <div className="flex items-center gap-2 mb-4">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <h2 className="text-[14px] font-bold text-white">Dijital İmzalar & Doğrulama</h2>
              </div>
              <div className="space-y-3">
                {preview.signatures.map((sig, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#0f1419] border border-[#21262d]">
                    <p className="text-[11px] font-bold text-[#7c3aed] mb-2">{sig.label}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[#8b949e] min-w-[100px]">Reference URI</span>
                        <span className="text-[10px] text-[#e6edf3] font-mono">{sig.uri}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[#8b949e] min-w-[100px]">Digest Algorithm</span>
                        <span className="text-[10px] text-[#e6edf3] font-mono">{sig.digest_algorithm?.split('#').pop()}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[#8b949e] min-w-[100px]">Digest Value</span>
                        <span className="text-[10px] text-[#e6edf3] font-mono break-all">{sig.digest_value}</span>
                      </div>
                      {sig.transforms?.map((t, j) => (
                        <div key={j} className="flex gap-2">
                          <span className="text-[10px] text-[#8b949e] min-w-[100px]">Transform {j + 1}</span>
                          <span className="text-[10px] text-[#e6edf3] font-mono break-all">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* App info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#161b22] border border-[#21262d] text-[11px] text-[#8b949e]">
            <span>VECTO Simulation Tool: <b className="text-[#e6edf3]">v{preview.app_info?.tool_version}</b></span>
            <span>Simülasyon Tarihi: <b className="text-[#e6edf3]">{preview.app_info?.date}</b></span>
          </div>
        </div>
      )}
    </div>
  );
}
