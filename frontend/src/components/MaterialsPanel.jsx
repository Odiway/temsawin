import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMaterials, getMaterialCount, createMaterial, updateMaterial,
  deleteMaterial, importMM03,
} from './bomApi';

const KALEM_OPTIONS = ['F','Y','E','H','C','J','X DETAY','X-Kesilerek Kullanilan','Kesilerek kullaniliyor'];
const BIRIM_OPTIONS = ['AD','KG','M','M2','L','D'];

const KALEM_COLORS = {
  'F': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'Y': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'E': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'H': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'C': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'J': 'bg-lime-500/15 text-lime-400 border-lime-500/20',
  'X DETAY': 'bg-red-500/10 text-red-400/80 border-red-500/15',
};

export default function MaterialsPanel() {
  const [materials, setMaterials] = useState([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const [mRes, cRes] = await Promise.all([
      getMaterials({ search: search || undefined, offset: page * 100, limit: 100 }),
      getMaterialCount(),
    ]);
    setMaterials(mRes.data);
    setCount(cRes.data.count);
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult('');
    try {
      const res = await importMM03(file);
      setImportResult(`ok:${res.data.created} yeni, ${res.data.updated} guncellendi (toplam: ${res.data.total})`);
      await load();
    } catch (err) {
      setImportResult('err:' + (err?.message || 'Ice aktarma basarisiz'));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Malzemeyi silmek istediginize emin misiniz?')) return;
    await deleteMaterial(id);
    await load();
  };

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Malzeme Master</h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="text-slate-400 font-medium">{count.toLocaleString('tr-TR')}</span> malzeme kayitli &mdash; SAP MM03 Kalem Tipi eslestirme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-all">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline mr-1.5 -mt-0.5"><path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Manuel Ekle
          </button>
          <label className={'px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ' + (importing ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20')}>
            {importing ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Ice aktariliyor...
              </span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline mr-1.5 -mt-0.5"><path d="M7 2v7M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 10v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                MM03 Excel Yukle
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </div>

      {importResult && (
        <div className={'mb-5 p-4 rounded-xl text-sm flex items-center gap-2 ' + (importResult.startsWith('ok:') ? 'bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400' : 'bg-red-500/[0.08] border border-red-500/20 text-red-400')}>
          <span>{importResult.startsWith('ok:') ? '✓' : '⚠'}</span>
          {importResult.replace(/^(ok:|err:)/, '')}
        </div>
      )}

      {showAdd && <AddMaterialForm onSave={() => { load(); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />}

      {/* Search */}
      <div className="mb-5 relative">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input type="text" placeholder="Malzeme no veya aciklama ara..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full bg-[#161b22] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/30 transition" />
      </div>

      {/* Table */}
      <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-slate-500 text-[11px]">
              <th className="px-4 py-3 text-left font-medium">Malzeme No</th>
              <th className="px-4 py-3 text-left font-medium">Kalem Tipi</th>
              <th className="px-4 py-3 text-left font-medium">Birim</th>
              <th className="px-4 py-3 text-left font-medium">Aciklama</th>
              <th className="px-4 py-3 text-left font-medium">Kaynak</th>
              <th className="px-4 py-3 text-left font-medium w-16">Islem</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(m => (
              <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition">
                <td className="px-4 py-2.5 font-mono text-xs text-white">{m.material_no}</td>
                <td className="px-4 py-2.5">
                  <span className={'px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap border ' + (KALEM_COLORS[m.kalem_tipi] || 'bg-slate-800/50 text-slate-500 border-slate-700/30')}>
                    {m.kalem_tipi}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{m.birim}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[300px] truncate">{m.description}</td>
                <td className="px-4 py-2.5">
                  <span className={'text-[10px] px-1.5 py-0.5 rounded ' + (m.source === 'mm03' ? 'bg-emerald-500/10 text-emerald-500/70' : 'bg-slate-800 text-slate-600')}>
                    {m.source}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 4h7M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M6 6.5v3M8 6.5v3M4.5 4l.5 7a1 1 0 001 1h2a1 1 0 001-1l.5-7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 text-slate-800">
                    <rect x="4" y="6" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="1.5"/><path d="M12 16h16M12 22h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p className="text-slate-600 text-sm">{search ? 'Sonuc bulunamadi' : 'Henuz malzeme yok'}</p>
                  {!search && <p className="text-slate-700 text-xs mt-1">MM03 Excel yukleyin veya manuel ekleyin</p>}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400 transition">← Onceki</button>
          <span className="text-xs text-slate-600">Sayfa <span className="text-slate-400">{page + 1}</span> · {count.toLocaleString('tr-TR')} kayit</span>
          <button onClick={() => setPage(page + 1)} disabled={materials.length < 100} className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-20 text-slate-400 transition">Sonraki →</button>
        </div>
      </div>
    </div>
  );
}

function AddMaterialForm({ onSave, onCancel }) {
  const [matNo, setMatNo] = useState('');
  const [kalem, setKalem] = useState('Y');
  const [birim, setBirim] = useState('AD');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (!matNo.trim()) { setError('Malzeme no gerekli'); return; }
    try {
      await createMaterial({ material_no: matNo.trim(), kalem_tipi: kalem, birim, description: desc });
      onSave();
    } catch (err) {
      setError(err?.message || 'Kaydetme hatasi');
    }
  };

  return (
    <div className="bg-[#161b22] border border-white/[0.06] rounded-2xl p-5 mb-5">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-400"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        Yeni Malzeme Ekle
      </h3>
      {error && <div className="text-xs text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-lg px-3 py-2 mb-3">{error}</div>}
      <div className="grid grid-cols-4 gap-3">
        <input placeholder="Malzeme No" value={matNo} onChange={e => setMatNo(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/30 transition" />
        <select value={kalem} onChange={e => setKalem(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/30 transition">
          {KALEM_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={birim} onChange={e => setBirim(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/30 transition">
          {BIRIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <input placeholder="Aciklama" value={desc} onChange={e => setDesc(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/30 transition" />
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={save} className="px-5 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 text-sm font-medium transition-all">Kaydet</button>
        <button onClick={onCancel} className="px-5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.04] text-slate-500 hover:bg-white/[0.06] text-sm transition">Iptal</button>
      </div>
    </div>
  );
}
