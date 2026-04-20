import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';

/* ═══════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════ */

const VEHICLE_IMAGES = {
  'AVENUE': 'https://www.temsa.com/en/images/common/temsa-avenue-electron.png',
  'HD': 'https://www.temsa.com/en/images/common/temsa-hd-12.png',
  'MD9LE': 'https://www.temsa.com/en/images/common/temsa-md-9-le.png',
  'MD9 ELECTRIC': 'https://www.temsa.com/en/images/common/temsa-md-9-le.png',
  'MD': 'https://www.temsa.com/en/images/common/temsa-md-9.png',
  'LD': 'https://www.temsa.com/en/images/common/temsa-id-sb-plus.png',
  'MARATON': 'https://www.temsa.com/en/images/common/maraton-12.png',
  'PRESTIJ': 'https://www.temsa.com/en/images/common/prestij.png',
};

function getVehicleImage(modelName) {
  if (!modelName) return null;
  const upper = modelName.toUpperCase();
  for (const [key, url] of Object.entries(VEHICLE_IMAGES)) {
    if (upper.includes(key.toUpperCase())) return url;
  }
  return null;
}

const FLEET_COLORS = ['#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#f43f5e', '#06b6d4', '#eab308', '#ec4899'];

const fmt = (v, d = 1) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return v.toFixed(d);
  return String(v);
};

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export default function FleetPanel({ embedded = false }) {
  const [section, setSection] = useState('list');       // list | compare
  const [fleets, setFleets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingFleet, setEditingFleet] = useState(null);

  // Comparison state
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [comparing, setComparing] = useState(false);

  const loadFleets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listFleets();
      setFleets(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFleets(); }, [loadFleets]);

  const handleDeleteFleet = async (id) => {
    if (!confirm('Bu filoyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteFleet(id);
      setFleets(prev => prev.filter(f => f.id !== id));
      setSelectedForCompare(prev => prev.filter(x => x !== id));
    } catch (e) { console.error(e); }
  };

  const handleCompare = async () => {
    if (selectedForCompare.length < 2) return;
    setComparing(true);
    try {
      const data = await api.compareFleets(selectedForCompare);
      setCompareData(data);
      setSection('compare');
    } catch (e) { console.error(e); }
    setComparing(false);
  };

  const toggleCompareSelect = (id) => {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-80 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-blue-400 animate-spin" style={{ animationDuration: '2s', borderTopColor: 'transparent' }} />
        <div className="absolute inset-5 rounded-full bg-blue-500/20" />
      </div>
      <span className="text-sm text-slate-400 font-medium animate-pulse">Filolar yükleniyor...</span>
    </div>
  );

  const SECTIONS = [
    { key: 'list', label: 'Filolarım' },
    { key: 'compare', label: 'Filo Karşılaştır' },
  ];

  return (
    <div className="space-y-5">
      {/* ═══ HERO HEADER (standalone mode) ═══ */}
      {!embedded && (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#0c1a2e] to-slate-900 border border-blue-500/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/[0.07] blur-3xl" />
          <div className="absolute -left-10 bottom-0 w-60 h-60 rounded-full bg-cyan-500/[0.05] blur-3xl" />
        </div>
        <div className="relative z-10 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="1" y="6" width="15" height="9" rx="2" />
                  <circle cx="5" cy="15" r="1.5" /><circle cx="12" cy="15" r="1.5" />
                  <rect x="8" y="4" width="15" height="9" rx="2" opacity="0.5" />
                  <circle cx="12" cy="13" r="1.5" opacity="0.5" /><circle cx="19" cy="13" r="1.5" opacity="0.5" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center">
                <span className="text-[7px] font-black text-blue-900">{fleets.length}</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Filo Yönetimi</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Filolar oluşturun, karşılaştırın — <span className="text-blue-400 font-semibold">{fleets.length}</span> filo tanımlı
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Compare button */}
            {selectedForCompare.length >= 2 && section === 'list' && (
              <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={handleCompare} disabled={comparing}
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/25 disabled:opacity-50 transition-all hover:shadow-violet-500/40 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                {comparing ? 'Karşılaştırılıyor...' : `${selectedForCompare.length} Filo Karşılaştır`}
              </motion.button>
            )}
            {/* Tab selector */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 backdrop-blur-sm border border-white/10">
              {SECTIONS.map(s => (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    section === s.key ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}>
                  {section === s.key && (
                    <motion.div layoutId="fleettab" className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/25" />
                  )}
                  <span className="relative z-10">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ═══ Embedded toolbar ═══ */}
      {embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 backdrop-blur-sm border border-white/10">
              {SECTIONS.map(s => (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    section === s.key ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}>
                  {section === s.key && (
                    <motion.div layoutId="fleettab-emb" className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/25" />
                  )}
                  <span className="relative z-10">{s.label}</span>
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500">{fleets.length} filo tanımlı</span>
          </div>
          {selectedForCompare.length >= 2 && section === 'list' && (
            <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={handleCompare} disabled={comparing}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/25 disabled:opacity-50 transition-all hover:shadow-violet-500/40 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
              {comparing ? 'Karşılaştırılıyor...' : `${selectedForCompare.length} Filo Karşılaştır`}
            </motion.button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════════
            SECTION 1: FLEET LIST
           ═══════════════════════════════════════════════ */}
        {section === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            {/* New fleet button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <h2 className="text-base font-bold text-white">Kaydedilen Filolar</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-blue-500/20 to-transparent" />
              </div>
              <button onClick={() => { setEditingFleet(null); setShowBuilder(true); }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
                Yeni Filo Oluştur
              </button>
            </div>

            {/* Fleet cards grid */}
            {fleets.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="6" width="15" height="9" rx="2" />
                    <circle cx="5" cy="15" r="1.5" /><circle cx="12" cy="15" r="1.5" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Henüz filo tanımlanmadı</h3>
                <p className="text-xs text-slate-400">"Yeni Filo Oluştur" butonuna tıklayarak ilk filonuzu oluşturun</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                {fleets.map((fleet, fi) => (
                  <FleetCard
                    key={fleet.id}
                    fleet={fleet}
                    color={FLEET_COLORS[fi % FLEET_COLORS.length]}
                    isSelected={selectedForCompare.includes(fleet.id)}
                    onToggleSelect={() => toggleCompareSelect(fleet.id)}
                    onEdit={() => { setEditingFleet(fleet); setShowBuilder(true); }}
                    onDelete={() => handleDeleteFleet(fleet.id)}
                  />
                ))}
              </div>
            )}

            {selectedForCompare.length > 0 && selectedForCompare.length < 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-center">
                <span className="text-xs text-violet-400 font-medium">Karşılaştırmak için en az 1 filo daha seçin</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
            SECTION 2: FLEET COMPARISON
           ═══════════════════════════════════════════════ */}
        {section === 'compare' && (
          <motion.div key="compare" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            {!compareData || compareData.length < 2 ? (
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Karşılaştırma için filo seçin</h3>
                <p className="text-xs text-slate-400 mb-4">Filolarım sekmesinde en az 2 filo seçerek karşılaştırma yapın</p>
                <button onClick={() => setSection('list')}
                  className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg text-xs font-bold hover:bg-violet-500/30 transition-all">
                  Filolarıma Dön
                </button>
              </div>
            ) : (
              <FleetComparison data={compareData} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Fleet Builder Modal ═══ */}
      <AnimatePresence>
        {showBuilder && (
          <FleetBuilder
            existingFleet={editingFleet}
            onClose={() => { setShowBuilder(false); setEditingFleet(null); }}
            onSaved={() => { setShowBuilder(false); setEditingFleet(null); loadFleets(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   Fleet Card — shows in the grid
   ═══════════════════════════════════════════════════════════ */

function FleetCard({ fleet, color, isSelected, onToggleSelect, onEdit, onDelete }) {
  // Collect unique model images (skip empty model names)
  const uniqueModels = useMemo(() => {
    const seen = new Set();
    const models = [];
    for (const item of fleet.items || []) {
      const model = item.model?.trim();
      if (!model) continue;
      if (!seen.has(model)) {
        seen.add(model);
        models.push({ model, img: getVehicleImage(model), count: item.count });
      } else {
        const existing = models.find(m => m.model === model);
        if (existing) existing.count += item.count;
      }
    }
    return models;
  }, [fleet.items]);

  return (
    <motion.div layout
      className={`relative rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer group ${
        isSelected
          ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10 shadow-lg shadow-violet-500/10'
          : 'border-white/10 bg-slate-900/60 hover:border-blue-500/20'
      }`}
      onClick={onToggleSelect}>
      {/* Selection indicator */}
      <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
        isSelected ? 'border-violet-400 bg-violet-500' : 'border-white/20 bg-white/5'
      }`}>
        {isSelected && (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
        )}
      </div>

      {/* Stacked bus images */}
      <div className="relative h-36 bg-gradient-to-br from-slate-800/80 to-slate-900/80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-[2]" />
        {uniqueModels.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {uniqueModels.slice(0, 4).map((m, i) => {
              const total = Math.min(uniqueModels.length, 4);
              const offset = (i - (total - 1) / 2) * 60;
              const zIndex = total - i;
              return (
                <motion.div key={m.model}
                  initial={{ x: 0, opacity: 0, scale: 0.8 }}
                  animate={{ x: offset, opacity: 1 - i * 0.15, scale: 1 - i * 0.05 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="absolute"
                  style={{ zIndex }}>
                  {m.img ? (
                    <img src={m.img} alt={m.model} className="h-20 object-contain drop-shadow-lg" />
                  ) : (
                    <div className="w-24 h-16 rounded-lg bg-slate-700/50 flex items-center justify-center px-2">
                      <span className="text-[10px] font-bold text-slate-400 text-center truncate">{m.model}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center z-[1]">
            <div className="w-20 h-20 rounded-2xl bg-slate-700/40 flex items-center justify-center">
              <span className="text-3xl font-black text-slate-600">{fleet.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          </div>
        )}
        {/* Model tags */}
        <div className="absolute bottom-2 left-3 z-[3] flex gap-1 flex-wrap">
          {uniqueModels.slice(0, 3).map(m => (
            <span key={m.model} className="text-[8px] px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white/80 font-semibold">
              {m.model} ×{m.count}
            </span>
          ))}
          {uniqueModels.length > 3 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white/60">
              +{uniqueModels.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Fleet info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{fleet.name}</h3>
            {fleet.description && (
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{fleet.description}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-white/[0.03]">
            <div className="text-lg font-black text-blue-400">{fleet.total_vehicles}</div>
            <div className="text-[8px] text-slate-600 uppercase">Araç</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.03]">
            <div className="text-lg font-black text-cyan-400">{fleet.variant_count}</div>
            <div className="text-[8px] text-slate-600 uppercase">Varyant</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.03]">
            <div className="text-lg font-black" style={{ color }}>{fleet.fleet_avg_co2 ? fmt(fleet.fleet_avg_co2, 1) : '—'}</div>
            <div className="text-[8px] text-slate-600 uppercase">Ort. CO₂</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit}
            className="flex-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Düzenle
          </button>
          <button onClick={onDelete}
            className="px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Sil
          </button>
        </div>
      </div>
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════════════════
   Fleet Builder — Modal for creating/editing fleets
   ═══════════════════════════════════════════════════════════ */

function FleetBuilder({ existingFleet, onClose, onSaved }) {
  const [name, setName] = useState(existingFleet?.name || '');
  const [description, setDescription] = useState(existingFleet?.description || '');
  const [items, setItems] = useState({}); // vin → count
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Load available vehicles (from fleet emissions API)
    (async () => {
      try {
        const em = await api.getFleetEmissions();
        setVehicles(em?.vehicles || []);
      } catch (e) { console.error(e); }
      setLoadingVehicles(false);
    })();
  }, []);

  // Pre-fill items if editing
  useEffect(() => {
    if (existingFleet?.items) {
      const map = {};
      for (const it of existingFleet.items) {
        map[it.vin] = it.count;
      }
      setItems(map);
    }
  }, [existingFleet]);

  const vehiclesByModel = useMemo(() => {
    const map = {};
    vehicles.forEach(v => {
      const model = v.model || 'Bilinmeyen';
      if (!map[model]) map[model] = [];
      map[model].push(v);
    });
    return map;
  }, [vehicles]);

  const filteredModels = useMemo(() => {
    if (!search.trim()) return Object.entries(vehiclesByModel);
    const s = search.toLowerCase();
    return Object.entries(vehiclesByModel).filter(([model, vehList]) =>
      model.toLowerCase().includes(s) ||
      vehList.some(v => v.vin?.toLowerCase().includes(s))
    );
  }, [vehiclesByModel, search]);

  const totalSelected = useMemo(() => Object.values(items).reduce((a, b) => a + b, 0), [items]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        items: Object.entries(items)
          .filter(([, count]) => count > 0)
          .map(([vin, count]) => ({ vin, count })),
      };

      if (existingFleet?.id) {
        await api.updateFleet(existingFleet.id, payload);
      } else {
        await api.createFleet(payload);
      }
      onSaved();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">{existingFleet ? 'Filo Düzenle' : 'Yeni Filo Oluştur'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Varyant seçin ve araç adedi belirleyin</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Name & Description */}
        <div className="px-6 py-4 border-b border-white/5 flex gap-4 flex-shrink-0">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Filo Adı *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="ör: 2026 Ankara Şehir Filosu"
              className="mt-1 w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Açıklama</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="ör: Yaz dönemi filo planlaması"
              className="mt-1 w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
          </div>
        </div>

        {/* Search + Summary bar */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 flex-shrink-0">
          <div className="flex-1 relative">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Model veya VIN ara..."
              className="w-full pl-10 pr-3 py-2 bg-slate-800/30 border border-white/5 rounded-lg text-xs text-white placeholder-slate-600 focus:border-blue-500/30 outline-none transition-all" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              <span className="text-blue-400 font-bold">{totalSelected}</span> araç seçili
            </span>
            <span className="text-xs text-slate-400">
              <span className="text-cyan-400 font-bold">{Object.keys(items).filter(k => items[k] > 0).length}</span> varyant
            </span>
          </div>
        </div>

        {/* Variant list */}
        <div className="flex-1 overflow-auto">
          {loadingVehicles ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredModels.map(([model, modelVehicles]) => {
                const img = getVehicleImage(model);
                return (
                  <div key={model} className="rounded-lg border border-white/5 bg-slate-800/30 overflow-hidden">
                    <div className="px-4 py-2.5 flex items-center gap-3 bg-slate-800/40">
                      <div className="w-12 h-8 rounded bg-slate-700/50 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {img ? <img src={img} alt={model} className="w-full h-full object-contain opacity-80" /> : (
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <rect x="2" y="6" width="20" height="12" rx="3" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" />
                          </svg>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white flex-1">{model}</h4>
                      <span className="text-[10px] text-slate-500">{modelVehicles.length} varyant</span>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                      {modelVehicles.map(v => {
                        const vin = v.vin;
                        const count = items[vin] || 0;
                        return (
                          <div key={vin} className={`px-4 py-2 flex items-center gap-3 transition-colors ${count > 0 ? 'bg-blue-500/[0.03]' : 'hover:bg-white/[0.02]'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-mono text-slate-300 truncate">{vin}</div>
                              <div className="flex gap-1.5 mt-0.5">
                                {v.vehicle_group && <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-slate-500">{v.vehicle_group}</span>}
                                {v.power_kw && <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-slate-500">{v.power_kw} kW</span>}
                                {v.fuel_type && <span className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-slate-500">{v.fuel_type}</span>}
                              </div>
                            </div>
                            {v.summary_co2 != null && (
                              <div className="text-right px-2">
                                <div className="text-xs font-bold text-emerald-400">{v.summary_co2}</div>
                                <div className="text-[7px] text-slate-600">g/km</div>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => setItems(prev => ({ ...prev, [vin]: Math.max(0, (prev[vin] || 0) - 1) }))}
                                className="w-7 h-7 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-bold flex items-center justify-center transition-colors">−</button>
                              <span className={`w-8 text-center text-sm font-black ${count > 0 ? 'text-blue-400' : 'text-slate-600'}`}>{count}</span>
                              <button onClick={() => setItems(prev => ({ ...prev, [vin]: (prev[vin] || 0) + 1 }))}
                                className="w-7 h-7 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-bold flex items-center justify-center transition-colors">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-400">
            {totalSelected > 0 ? (
              <span><span className="text-blue-400 font-bold">{totalSelected}</span> araç, <span className="text-cyan-400 font-bold">{Object.keys(items).filter(k => items[k] > 0).length}</span> varyant</span>
            ) : 'Henüz araç seçilmedi'}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-colors">
              İptal
            </button>
            <button onClick={handleSave} disabled={!name.trim() || saving}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all hover:shadow-blue-500/40">
              {saving ? 'Kaydediliyor...' : (existingFleet ? 'Güncelle' : 'Filo Kaydet')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════════════════
   Fleet Comparison View
   ═══════════════════════════════════════════════════════════ */

function FleetComparison({ data }) {
  if (!data || data.length < 2) return null;

  // Build comparison metrics
  const metrics = data.map((f, i) => ({
    name: f.name,
    total_vehicles: f.total_vehicles,
    variant_count: f.variant_count,
    avg_co2: f.fleet_avg_co2,
    total_co2: f.total_weighted_co2,
    models: f.models || [],
    by_model: f.by_model || [],
    by_mission: f.by_mission || [],
    by_variant: f.by_variant || [],
    color: FLEET_COLORS[i % FLEET_COLORS.length],
  }));

  // Find best (lowest) CO2 fleet
  const bestIdx = metrics.reduce((best, m, i) =>
    m.avg_co2 && (!metrics[best].avg_co2 || m.avg_co2 < metrics[best].avg_co2) ? i : best
  , 0);

  // Bar chart data: CO2 per fleet
  const co2BarData = metrics.map(m => ({ name: m.name, co2: m.avg_co2 || 0 }));

  // Model-level comparison data
  const allModels = [...new Set(metrics.flatMap(m => m.by_model.map(x => x.model)))];
  const modelCompareData = allModels.map(model => {
    const row = { model };
    metrics.forEach((m, i) => {
      const found = m.by_model.find(x => x.model === model);
      row[`fleet${i}_co2`] = found?.avg_co2 || 0;
      row[`fleet${i}_count`] = found?.vehicles || 0;
    });
    return row;
  });

  return (
    <div className="space-y-5">
      {/* Fleet overview cards */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-5 rounded-full bg-violet-500" />
        <h2 className="text-base font-bold text-white">Filo Karşılaştırma</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-violet-500/20 to-transparent" />
      </div>

      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 4)}, minmax(0, 1fr))` }}>
        {metrics.map((m, i) => {
          const isBest = i === bestIdx && m.avg_co2;
          return (
            <div key={m.name} className={`rounded-xl border overflow-hidden ${
              isBest ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5' : 'border-white/10 bg-slate-900/60'
            }`}>
              {isBest && (
                <div className="px-3 py-1 bg-emerald-500/10 text-center">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">En Düşük CO₂</span>
                </div>
              )}
              {/* Stacked images */}
              <div className="relative h-24 bg-slate-800/40 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-[1]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {m.models.slice(0, 3).map((model, mi) => {
                    const img = getVehicleImage(model);
                    return img ? (
                      <motion.img key={model} src={img} alt={model}
                        className="h-14 object-contain absolute drop-shadow-md"
                        initial={{ x: 0, opacity: 0 }}
                        animate={{ x: (mi - (Math.min(m.models.length, 3) - 1) / 2) * 50, opacity: 1 - mi * 0.2 }}
                        style={{ zIndex: 3 - mi }}
                        transition={{ delay: mi * 0.1 }} />
                    ) : null;
                  })}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-white truncate">{m.name}</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="text-center p-1.5 rounded bg-white/[0.03]">
                    <div className="text-base font-black text-blue-400">{m.total_vehicles}</div>
                    <div className="text-[7px] text-slate-600 uppercase">Araç</div>
                  </div>
                  <div className="text-center p-1.5 rounded bg-white/[0.03]">
                    <div className="text-base font-black" style={{ color: m.color }}>{m.avg_co2 ? fmt(m.avg_co2, 1) : '—'}</div>
                    <div className="text-[7px] text-slate-600 uppercase">Ort. CO₂</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CO₂ comparison bar chart */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold text-white">Filo Ortalama CO₂ Karşılaştırma</h3>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(metrics.length * 50, 120)}>
            <BarChart data={co2BarData} layout="vertical" margin={{ left: 80, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} unit=" g/km" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={75} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                formatter={(v) => [`${v} g/km`, 'CO₂']} />
              <defs>
                <linearGradient id="fleetCo2Grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <Bar dataKey="co2" fill="url(#fleetCo2Grad)" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle count comparison */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-cyan-500" />
            <h3 className="text-sm font-bold text-white">Araç Sayısı & CO₂ Toplam</h3>
          </div>
          <div className="space-y-3">
            {metrics.map((m, i) => {
              const maxCo2 = Math.max(...metrics.map(x => x.total_co2 || 0));
              const pct = maxCo2 > 0 ? ((m.total_co2 || 0) / maxCo2) * 100 : 0;
              return (
                <div key={m.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-white truncate flex-1">{m.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-blue-400">{m.total_vehicles} araç</span>
                      <span className="text-[10px] font-mono" style={{ color: m.color }}>{m.total_co2?.toLocaleString()} g</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${m.color}, ${m.color}88)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Model-level comparison */}
      {modelCompareData.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-white">Model Bazlı Karşılaştırma</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-wider text-slate-600 font-bold">Model</th>
                  {metrics.map((m, i) => (
                    <th key={i} colSpan={2} className="px-3 py-2.5 text-center text-[9px] uppercase tracking-wider font-bold" style={{ color: m.color }}>
                      {m.name}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <th />
                  {metrics.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="px-2 py-1.5 text-center text-[8px] text-slate-600">Araç</th>
                      <th className="px-2 py-1.5 text-center text-[8px] text-slate-600">CO₂</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelCompareData.map((row, ri) => {
                  const img = getVehicleImage(row.model);
                  return (
                    <tr key={ri} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-7 rounded bg-slate-800/60 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {img ? <img src={img} alt="" className="w-full h-full object-contain opacity-60" /> : null}
                          </div>
                          <span className="text-[11px] font-bold text-white">{row.model}</span>
                        </div>
                      </td>
                      {metrics.map((m, i) => {
                        const count = row[`fleet${i}_count`] || 0;
                        const co2 = row[`fleet${i}_co2`] || 0;
                        // Find lowest CO2 for this model across fleets
                        const co2Vals = metrics.map((_, j) => row[`fleet${j}_co2`] || 0).filter(v => v > 0);
                        const minCo2 = co2Vals.length > 0 ? Math.min(...co2Vals) : 0;
                        const isBest = co2 > 0 && co2 === minCo2 && co2Vals.length > 1;
                        return (
                          <React.Fragment key={i}>
                            <td className="px-2 py-2.5 text-center">
                              <span className={`text-[11px] font-bold ${count > 0 ? 'text-blue-400' : 'text-slate-700'}`}>{count}</span>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <span className={`text-[11px] font-mono ${
                                isBest ? 'text-emerald-400 font-bold' : co2 > 0 ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                {co2 > 0 ? fmt(co2, 1) : '—'}
                              </span>
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CO₂ difference summary */}
      {metrics.length === 2 && metrics[0].avg_co2 && metrics[1].avg_co2 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-white">CO₂ Fark Analizi</h3>
          </div>
          {(() => {
            const diff = metrics[1].avg_co2 - metrics[0].avg_co2;
            const pctDiff = ((diff / metrics[0].avg_co2) * 100).toFixed(1);
            const isReduction = diff < 0;
            return (
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: metrics[0].color }}>{fmt(metrics[0].avg_co2, 1)}</div>
                  <div className="text-xs text-slate-400 mt-1">{metrics[0].name}</div>
                </div>
                <div className="text-center px-6">
                  <div className={`text-3xl font-black ${isReduction ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isReduction ? '↓' : '↑'} {Math.abs(diff).toFixed(1)} g/km
                  </div>
                  <div className={`text-sm font-bold ${isReduction ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isReduction ? '' : '+'}{pctDiff}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {isReduction ? 'CO₂ Azalma' : 'CO₂ Artış'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: metrics[1].color }}>{fmt(metrics[1].avg_co2, 1)}</div>
                  <div className="text-xs text-slate-400 mt-1">{metrics[1].name}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
