import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000/api/vecto-code';

const FIELD_LABELS = {
  vehicle_model: 'Arac Modeli',
  sub_model: 'Alt Model',
  energy_source: 'Enerji Kaynagi',
  engine: 'Motor',
  gearbox: 'Sanziman',
  rear_axle: 'Arka Aks',
  front_tire: 'On Lastik',
  rear_tire: 'Arka Lastik',
  additional_axle_tire: 'Ek Aks Lastigi',
};

const CODE_POSITIONS = [
  { field: 'vehicle_model', start: 0, len: 3, color: '#ef4444' },
  { field: 'sub_model', start: 3, len: 3, color: '#2563eb' },
  { field: 'energy_source', start: 6, len: 1, color: '#16a34a' },
  { field: 'engine', start: 7, len: 3, color: '#d97706' },
  { field: 'gearbox', start: 10, len: 3, color: '#7c3aed' },
  { field: 'rear_axle', start: 13, len: 3, color: '#0891b2' },
  { field: 'front_tire', start: 16, len: 3, color: '#be185d' },
  { field: 'rear_tire', start: 19, len: 3, color: '#4f46e5' },
  { field: 'additional_axle_tire', start: 22, len: 3, color: '#78716c' },
];

export default function VectoCodePanel() {
  const [components, setComponents] = useState(null);
  const [selection, setSelection] = useState({
    vehicle_model: '', sub_model: '', energy_source: '',
    engine: '', gearbox: '', rear_axle: '',
    front_tire: '', rear_tire: '', additional_axle_tire: '000',
  });
  const [cascadeOptions, setCascadeOptions] = useState({});
  const [generatedCode, setGeneratedCode] = useState(null);
  const [decodeInput, setDecodeInput] = useState('');
  const [decodeResult, setDecodeResult] = useState(null);
  const [mode, setMode] = useState('generate'); // 'generate' | 'decode'
  const [copied, setCopied] = useState(false);

  // Load all components on mount
  useEffect(() => {
    fetch(`${API}/components`).then(r => r.json()).then(setComponents).catch(console.error);
  }, []);

  // Load cascade options when drivetrain selection changes
  const loadCascadeOptions = useCallback(async () => {
    const params = new URLSearchParams();
    if (selection.vehicle_model) params.set('vehicle_model', selection.vehicle_model);
    if (selection.sub_model) params.set('sub_model', selection.sub_model);
    if (selection.energy_source) params.set('energy_source', selection.energy_source);
    if (selection.engine) params.set('engine', selection.engine);
    if (selection.gearbox) params.set('gearbox', selection.gearbox);
    try {
      const r = await fetch(`${API}/options?${params}`);
      const data = await r.json();
      setCascadeOptions(data);
    } catch (e) { console.error(e); }
  }, [selection.vehicle_model, selection.sub_model, selection.energy_source, selection.engine, selection.gearbox]);

  useEffect(() => { loadCascadeOptions(); }, [loadCascadeOptions]);

  const handleSelect = (field, value) => {
    setSelection(prev => {
      const next = { ...prev, [field]: value };
      // Reset downstream fields when a parent changes
      const cascadeFields = ['vehicle_model', 'sub_model', 'energy_source', 'engine', 'gearbox', 'rear_axle'];
      const idx = cascadeFields.indexOf(field);
      if (idx >= 0) {
        for (let i = idx + 1; i < cascadeFields.length; i++) {
          next[cascadeFields[i]] = '';
        }
      }
      return next;
    });
    setGeneratedCode(null);
  };

  const canGenerate = selection.vehicle_model && selection.sub_model && selection.energy_source &&
    selection.engine && selection.gearbox && selection.rear_axle &&
    selection.front_tire && selection.rear_tire && selection.additional_axle_tire;

  const handleGenerate = async () => {
    try {
      const r = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selection),
      });
      const data = await r.json();
      if (data.success) setGeneratedCode(data);
    } catch (e) { console.error(e); }
  };

  const handleDecode = async () => {
    if (decodeInput.trim().length !== 25) return;
    try {
      const r = await fetch(`${API}/decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: decodeInput.trim() }),
      });
      const data = await r.json();
      if (data.success) setDecodeResult(data);
      else setDecodeResult({ error: data.error });
    } catch (e) { console.error(e); }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSelection({
      vehicle_model: '', sub_model: '', energy_source: '',
      engine: '', gearbox: '', rear_axle: '',
      front_tire: '', rear_tire: '', additional_axle_tire: '000',
    });
    setGeneratedCode(null);
  };

  // Build live code preview
  const liveCode = `${selection.vehicle_model || '___'}${selection.sub_model || '___'}${selection.energy_source || '_'}${selection.engine || '___'}${selection.gearbox || '___'}${selection.rear_axle || '___'}${selection.front_tire || '___'}${selection.rear_tire || '___'}${selection.additional_axle_tire || '___'}`;

  const getOptions = (field) => {
    if (!components) return [];
    const cascadeFieldMap = {
      sub_model: 'sub_models',
      energy_source: 'energy_sources',
      engine: 'engines',
      gearbox: 'gearboxes',
      rear_axle: 'rear_axles',
    };
    if (cascadeFieldMap[field] && selection.vehicle_model) {
      return cascadeOptions[cascadeFieldMap[field]] || [];
    }
    const allFieldMap = {
      vehicle_model: 'vehicle_models',
      sub_model: 'sub_models',
      energy_source: 'energy_sources',
      engine: 'engines',
      gearbox: 'gearboxes',
      rear_axle: 'rear_axles',
      front_tire: 'front_tires',
      rear_tire: 'rear_tires',
      additional_axle_tire: 'additional_axle_tires',
    };
    return components[allFieldMap[field]] || [];
  };

  if (!components) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#3b82f6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#e6edf3]">VECTO Kod Olusturucu</h2>
          <p className="text-[#8b949e] text-sm mt-1">Arac konfigurasyonuna gore 25 haneli VECTO varyant kodu olusturun veya mevcut kodlari cozumleyin</p>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-[#161b22] rounded-lg border border-[#21262d] p-1">
          <button
            onClick={() => setMode('generate')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'generate' ? 'bg-[#3b82f6] text-white' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            Kod Olustur
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'decode' ? 'bg-[#3b82f6] text-white' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            Kod Cozumle
          </button>
        </div>
      </div>

      {/* Code Structure Legend */}
      <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-4">
        <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Kod Yapisi (25 Karakter)</h3>
        <div className="flex flex-wrap gap-2">
          {CODE_POSITIONS.map(p => (
            <div key={p.field} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
              <span className="text-[11px] text-[#8b949e]">{FIELD_LABELS[p.field]} ({p.len})</span>
            </div>
          ))}
        </div>
      </div>

      {mode === 'generate' ? (
        <>
          {/* Live Code Preview */}
          <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Canli Onizleme</h3>
              {generatedCode && (
                <button
                  onClick={() => handleCopy(generatedCode.vecto_code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] rounded-md text-xs font-medium text-white transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    {copied ? <path d="M5 13l4 4L19 7" /> : <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}
                  </svg>
                  {copied ? 'Kopyalandi!' : 'Kopyala'}
                </button>
              )}
            </div>
            <div className="font-mono text-2xl tracking-[0.15em] flex">
              {CODE_POSITIONS.map(p => {
                const segment = liveCode.substring(p.start, p.start + p.len);
                const isSet = !segment.includes('_');
                return (
                  <span
                    key={p.field}
                    className={`transition-all duration-300 ${isSet ? 'opacity-100' : 'opacity-30'}`}
                    style={{ color: p.color }}
                    title={`${FIELD_LABELS[p.field]}: ${isSet ? segment : 'Secilmedi'}`}
                  >
                    {segment}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Drivetrain Configuration (Cascading) */}
          <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#e6edf3]">Aktarma Organlari Konfigurasyonu</h3>
              <button onClick={handleReset} className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition">
                Sifirla
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['vehicle_model', 'sub_model', 'energy_source', 'engine', 'gearbox', 'rear_axle'].map(field => {
                const opts = getOptions(field);
                const pos = CODE_POSITIONS.find(p => p.field === field);
                const isDisabled = field !== 'vehicle_model' && !selection.vehicle_model;
                return (
                  <div key={field}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: pos?.color || '#8b949e' }}>
                      {FIELD_LABELS[field]}
                    </label>
                    <select
                      value={selection[field]}
                      onChange={(e) => handleSelect(field, e.target.value)}
                      disabled={isDisabled}
                      className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5 text-sm text-[#e6edf3] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Secin --</option>
                      {opts.map(o => (
                        <option key={o.code} value={o.code}>{o.code} — {o.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tire Configuration */}
          <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-6">
            <h3 className="text-sm font-semibold text-[#e6edf3] mb-4">Lastik Konfigurasyonu</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['front_tire', 'rear_tire', 'additional_axle_tire'].map(field => {
                const opts = getOptions(field);
                const pos = CODE_POSITIONS.find(p => p.field === field);
                return (
                  <div key={field}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: pos?.color || '#8b949e' }}>
                      {FIELD_LABELS[field]}
                    </label>
                    <select
                      value={selection[field]}
                      onChange={(e) => handleSelect(field, e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2.5 text-sm text-[#e6edf3] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/30"
                    >
                      <option value="">-- Secin --</option>
                      {opts.map(o => (
                        <option key={o.code} value={o.code}>{o.code} — {o.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="px-8 py-3 bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] hover:from-[#2563eb] hover:to-[#0891b2] disabled:bg-[#21262d] disabled:from-[#21262d] disabled:to-[#21262d] disabled:text-[#484f58] text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-[#3b82f6]/20 disabled:shadow-none"
            >
              VECTO Kodu Olustur
            </button>
            {generatedCode && (
              <span className="text-[#3fb950] text-sm font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Kod basariyla olusturuldu!
              </span>
            )}
          </div>

          {/* Generated Result */}
          {generatedCode && (
            <div className="bg-[#161b22] rounded-xl border border-[#238636]/30 p-6">
              <h3 className="text-sm font-semibold text-[#3fb950] mb-4">Olusturulan VECTO Kodu</h3>
              <div className="bg-[#0d1117] rounded-lg p-4 mb-4 flex items-center justify-between">
                <code className="text-xl font-mono font-bold text-[#e6edf3] tracking-[0.2em]">{generatedCode.vecto_code}</code>
                <button
                  onClick={() => handleCopy(generatedCode.vecto_code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-md text-xs text-[#e6edf3] transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    {copied ? <path d="M5 13l4 4L19 7" /> : <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}
                  </svg>
                  {copied ? 'Kopyalandi!' : 'Kopyala'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(generatedCode.description).map(([key, val]) => {
                  const pos = CODE_POSITIONS.find(p => p.field === key);
                  return (
                    <div key={key} className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: pos?.color || '#8b949e' }}>
                        {FIELD_LABELS[key]}
                      </div>
                      <div className="text-sm text-[#e6edf3]">{val}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Decode Mode */
        <div className="space-y-6">
          <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-6">
            <h3 className="text-sm font-semibold text-[#e6edf3] mb-4">VECTO Kodu Cozumle</h3>
            <div className="flex gap-3">
              <input
                type="text"
                maxLength={25}
                value={decodeInput}
                onChange={(e) => { setDecodeInput(e.target.value.toUpperCase()); setDecodeResult(null); }}
                placeholder="25 haneli VECTO kodunu girin..."
                className="flex-1 bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-3 text-lg font-mono text-[#e6edf3] tracking-[0.15em] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/30 placeholder:text-[#484f58] placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              />
              <button
                onClick={handleDecode}
                disabled={decodeInput.trim().length !== 25}
                className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#21262d] disabled:text-[#484f58] text-white rounded-lg text-sm font-semibold transition-all"
              >
                Cozumle
              </button>
            </div>
            <div className="mt-2 text-xs text-[#484f58]">
              {decodeInput.length}/25 karakter
            </div>
          </div>

          {/* Decode color preview */}
          {decodeInput.length > 0 && (
            <div className="bg-[#161b22] rounded-xl border border-[#21262d] p-6">
              <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Kod Pozisyon Analizi</h3>
              <div className="font-mono text-2xl tracking-[0.15em] flex">
                {CODE_POSITIONS.map(p => {
                  const segment = decodeInput.substring(p.start, p.start + p.len).padEnd(p.len, ' ');
                  return (
                    <span key={p.field} style={{ color: p.color }} title={FIELD_LABELS[p.field]}>
                      {segment}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Decode result */}
          {decodeResult && !decodeResult.error && (
            <div className="bg-[#161b22] rounded-xl border border-[#238636]/30 p-6">
              <h3 className="text-sm font-semibold text-[#3fb950] mb-4">Cozumleme Sonucu</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['vehicle_model', 'sub_model', 'energy_source', 'engine', 'gearbox', 'rear_axle', 'front_tire', 'rear_tire', 'additional_axle_tire'].map(key => {
                  const item = decodeResult[key];
                  const pos = CODE_POSITIONS.find(p => p.field === key);
                  return (
                    <div key={key} className="bg-[#0d1117] rounded-lg p-3 border border-[#21262d]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: pos?.color || '#8b949e' }}>
                        {FIELD_LABELS[key]}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold" style={{ color: pos?.color }}>{item.code}</span>
                        <span className="text-sm text-[#8b949e]">—</span>
                        <span className={`text-sm ${item.name === 'Unknown' ? 'text-[#f85149]' : 'text-[#e6edf3]'}`}>
                          {item.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {decodeResult?.error && (
            <div className="bg-[#161b22] rounded-xl border border-[#f85149]/30 p-4">
              <span className="text-[#f85149] text-sm">{decodeResult.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
