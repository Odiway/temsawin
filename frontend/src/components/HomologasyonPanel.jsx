import { useState, useCallback } from 'react';

const STATUS_OPTIONS = [
  { value: '', label: '— Seçiniz —', color: '#484f58' },
  { value: 'uygun', label: '✅ Uygun', color: '#10b981' },
  { value: 'uygun_degil', label: '❌ Uygun Değil', color: '#ef4444' },
  { value: 'kismen', label: '⚠ Kısmen Uygun', color: '#f59e0b' },
  { value: 'muaf', label: '🔵 Muaf', color: '#3b82f6' },
  { value: 'beklemede', label: '⏳ Beklemede', color: '#8b5cf6' },
];

export default function HomologasyonPanel() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(null);

  const generateChecklist = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true); setError(null); setChecklist(null);
    try {
      const res = await fetch('/homolog-api/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Add local compliance status to each requirement
      const cl = data.checklist;
      // Backend may return 'items' with 'requirement' field — normalize to 'requirements' with 'text'
      const rawReqs = cl?.requirements || cl?.items || [];
      cl.requirements = rawReqs.map((r, i) => ({
        ...r,
        text: r.text || r.requirement || '',
        _status: r._status || '',
        _notes: r._notes || '',
        _id: i,
      }));
      setChecklist(cl);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const updateRequirement = (id, updates) => {
    setChecklist(prev => ({
      ...prev,
      requirements: prev.requirements.map(r => r._id === id ? { ...r, ...updates } : r),
    }));
  };

  const exportFile = useCallback(async (format) => {
    if (!checklist) return;
    setExportLoading(format);
    try {
      const endpoint = format === 'excel' ? '/homolog-api/api/export' : '/homolog-api/api/export-word';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const ext = format === 'excel' ? 'xlsx' : 'docx';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `regulation_checklist.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e.message);
    } finally {
      setExportLoading(null);
    }
  }, [checklist]);

  // Filter & search
  const filtered = checklist?.requirements?.filter(r => {
    if (filter !== 'all' && r.category?.toLowerCase() !== filter) return true; // show all if category doesn't match filter choice
    if (filter !== 'all') {
      const cat = (r.category || '').toLowerCase();
      if (cat !== filter.toLowerCase()) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (r.text || '').toLowerCase().includes(term) ||
        (r.section || '').toLowerCase().includes(term) ||
        (r.category || '').toLowerCase().includes(term);
    }
    return true;
  }) || [];

  const categories = checklist?.requirements
    ? [...new Set(checklist.requirements.map(r => r.category).filter(Boolean))]
    : [];

  const stats = checklist?.requirements ? {
    total: checklist.requirements.length,
    uygun: checklist.requirements.filter(r => r._status === 'uygun').length,
    uygun_degil: checklist.requirements.filter(r => r._status === 'uygun_degil').length,
    kismen: checklist.requirements.filter(r => r._status === 'kismen').length,
    beklemede: checklist.requirements.filter(r => r._status === 'beklemede').length,
    bos: checklist.requirements.filter(r => !r._status).length,
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">📋</span>
          Homologasyon Checklist
        </h2>
        <p className="text-sm text-[#8b949e] mt-1">Regülasyon URL'si girin, otomatik kontrol listesi oluşturun</p>
      </div>

      {/* URL Input */}
      <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-5">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" /></svg>
            </div>
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateChecklist()}
              placeholder="https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-571/..."
              className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg pl-10 pr-4 py-3 text-white text-sm placeholder-[#484f58] focus:border-[#10b981] outline-none transition" />
          </div>
          <button onClick={generateChecklist} disabled={loading || !url.trim()}
            className={`px-6 py-3 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              loading ? 'bg-[#21262d] text-[#484f58]' : 'bg-[#10b981] text-white hover:bg-[#059669]'
            }`}>
            {loading ? (
              <><div className="w-4 h-4 border-2 border-[#484f58] border-t-white rounded-full animate-spin" /> Ayrıştırılıyor...</>
            ) : 'Oluştur'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {checklist && stats && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-4">
              <div className="text-[10px] text-[#484f58] uppercase">Toplam Madde</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            </div>
            <div className="bg-[#161b22] rounded-xl border border-emerald-500/30 p-4">
              <div className="text-[10px] text-emerald-400 uppercase">Uygun</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.uygun}</div>
            </div>
            <div className="bg-[#161b22] rounded-xl border border-red-500/30 p-4">
              <div className="text-[10px] text-red-400 uppercase">Uygun Değil</div>
              <div className="text-2xl font-bold text-red-400 mt-1">{stats.uygun_degil}</div>
            </div>
            <div className="bg-[#161b22] rounded-xl border border-yellow-500/30 p-4">
              <div className="text-[10px] text-yellow-400 uppercase">Değerlendirilmemiş</div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.bos}</div>
            </div>
          </div>

          {/* Progress Bar */}
          {stats.total > 0 && (
            <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-4">
              <div className="flex justify-between text-xs text-[#8b949e] mb-2">
                <span>İlerleme</span>
                <span>{stats.total - stats.bos}/{stats.total} değerlendirildi ({((stats.total - stats.bos) / stats.total * 100).toFixed(0)}%)</span>
              </div>
              <div className="w-full h-3 bg-[#0d1117] rounded-full overflow-hidden flex">
                {stats.uygun > 0 && <div className="h-full bg-emerald-500" style={{ width: `${stats.uygun / stats.total * 100}%` }} />}
                {stats.kismen > 0 && <div className="h-full bg-yellow-500" style={{ width: `${stats.kismen / stats.total * 100}%` }} />}
                {stats.uygun_degil > 0 && <div className="h-full bg-red-500" style={{ width: `${stats.uygun_degil / stats.total * 100}%` }} />}
                {stats.beklemede > 0 && <div className="h-full bg-purple-500" style={{ width: `${stats.beklemede / stats.total * 100}%` }} />}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Ara..."
              className="flex-1 min-w-[200px] bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-2 text-white text-sm placeholder-[#484f58] outline-none" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-white text-sm">
              <option value="all">Tüm Kategoriler</option>
              {categories.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
            <button onClick={() => exportFile('excel')} disabled={exportLoading === 'excel'}
              className="px-4 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition flex items-center gap-1">
              {exportLoading === 'excel' ? '...' : '📊 Excel'}
            </button>
            <button onClick={() => exportFile('word')} disabled={exportLoading === 'word'}
              className="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition flex items-center gap-1">
              {exportLoading === 'word' ? '...' : '📝 Word'}
            </button>
          </div>

          {/* Info Banner */}
          {checklist.title && (
            <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-4">
              <h3 className="text-sm font-semibold text-white">{checklist.title}</h3>
              {checklist.section && <p className="text-xs text-[#8b949e] mt-1">{checklist.section}</p>}
              <a href={checklist.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline mt-1 inline-block">
                Kaynak: {checklist.source_url}
              </a>
            </div>
          )}

          {/* Requirements Checklist Table */}
          <div className="bg-[#161b22] rounded-xl border border-[#21262d] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#484f58] text-[11px] uppercase border-b border-[#21262d]">
                  <th className="text-left px-4 py-2 w-8">#</th>
                  <th className="text-left px-4 py-2 w-24">Bölüm</th>
                  <th className="text-left px-4 py-2">Gereklilik</th>
                  <th className="text-left px-4 py-2 w-24">Kategori</th>
                  <th className="text-left px-4 py-2 w-40">Uygunluk</th>
                  <th className="text-left px-4 py-2 w-40">Notlar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r._id} className="border-b border-[#21262d]/50 hover:bg-[#21262d]/20">
                    <td className="px-4 py-2 text-[#484f58] text-xs">{idx + 1}</td>
                    <td className="px-4 py-2 text-[#8b949e] text-xs font-mono">{r.section || '—'}</td>
                    <td className="px-4 py-2 text-white text-xs leading-relaxed">{r.text}</td>
                    <td className="px-4 py-2">
                      {r.category && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#21262d] text-[#8b949e]">{r.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select value={r._status} onChange={e => updateRequirement(r._id, { _status: e.target.value })}
                        className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs"
                        style={{ color: STATUS_OPTIONS.find(s => s.value === r._status)?.color }}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input value={r._notes || ''} onChange={e => updateRequirement(r._id, { _notes: e.target.value })}
                        placeholder="Not ekle..."
                        className="w-full bg-[#0d1117] border border-[#21262d] rounded px-2 py-1 text-xs text-white placeholder-[#484f58] outline-none" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-[#8b949e] text-sm">Sonuç bulunamadı</div>
            )}
          </div>

          {/* Tables from regulation */}
          {checklist.tables?.length > 0 && (
            <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Regülasyon Tabloları ({checklist.tables.length})</h3>
              {checklist.tables.map((table, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  {table.caption && <p className="text-xs text-[#8b949e] mb-2">{table.caption}</p>}
                  <div className="overflow-x-auto rounded-lg border border-[#21262d]">
                    <table className="w-full text-xs">
                      {table.headers?.length > 0 && (
                        <thead><tr className="bg-[#0d1117] text-[#8b949e]">
                          {table.headers.map((h, j) => <th key={j} className="px-3 py-1.5 text-left border-b border-[#21262d]">{h}</th>)}
                        </tr></thead>
                      )}
                      <tbody>
                        {table.rows?.map((row, j) => (
                          <tr key={j} className="border-b border-[#21262d]/30">
                            {row.map((cell, k) => <td key={k} className="px-3 py-1.5 text-[#8b949e]">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!checklist && !loading && (
        <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-white mb-2">Homologasyon Kontrol Listesi Oluşturucu</h3>
          <p className="text-sm text-[#8b949e]">Bir regülasyon URL'si girin ve otomatik kontrol listesi oluşturun</p>
          <p className="text-xs text-[#484f58] mt-2">Desteklenen kaynaklar: eCFR, UNECE, EUR-Lex ve diğer regülasyon siteleri</p>
        </div>
      )}
    </div>
  );
}
