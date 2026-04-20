import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './ThemeContext';
import {
  ADANA_ROUTES,
  ROUTE_CATEGORIES,
  TEMSA_VARIANTS,
  simulateRoute,
  simulateAllVariants,
  calculateDailyFleetCost,
} from '../data/adanaRoutes';

/* ───────────── CSS Animasyonlar ───────────── */
const PANEL_CSS = `
@keyframes adanaPulse {
  0%,100% { opacity: 0.45; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}
@keyframes adanaGlow {
  0%,100% { box-shadow: 0 0 0 rgba(34,211,238,0); }
  50% { box-shadow: 0 0 24px rgba(59,130,246,0.06); }
}
@keyframes adanaScan {
  0% { transform: translateY(-100%); opacity: 0; }
  30% { opacity: 0.15; }
  100% { transform: translateY(400%); opacity: 0; }
}
.adana-scroll::-webkit-scrollbar { width: 6px; }
.adana-scroll::-webkit-scrollbar-track { background: rgba(15,23,42,0.4); border-radius: 999px; }
.adana-scroll::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.25); border-radius: 999px; }
.adana-scroll::-webkit-scrollbar-thumb:hover { background: rgba(56,189,248,0.4); }
`;

/* ───────────── HUD Bileşenler ───────────── */
function HudFrame({ children, className = '', accent = '#3b82f6' }) {
  const { isDark } = useTheme();
  return (
    <div
      className={`relative rounded-2xl border overflow-hidden ${
        isDark
          ? 'border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.05),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.30)]'
          : 'border-slate-200 bg-white shadow-sm'
      } ${className}`}
      style={{ animation: isDark ? 'adanaGlow 5s ease-in-out infinite' : undefined }}
    >
      {isDark && (
        <>
          <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent 75%)` }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="absolute left-0 right-0 h-24 pointer-events-none" style={{ top: 0, background: 'linear-gradient(180deg, rgba(59,130,246,0.06), transparent)', animation: 'adanaScan 5.2s linear infinite' }} />
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

function SectionTag({ icon, title, color = 'blue' }) {
  const cls = { blue: 'bg-blue-400', cyan: 'bg-cyan-400', green: 'bg-emerald-400', orange: 'bg-amber-400', purple: 'bg-violet-400', red: 'bg-red-400', pink: 'bg-pink-400' }[color] || 'bg-blue-400';
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-2 h-2 rounded-full ${cls} shadow-[0_0_12px_rgba(255,255,255,0.06)]`} />
      {icon && <span className="text-sm opacity-90">{icon}</span>}
      <h3 className="text-[11px] font-semibold text-slate-100 tracking-[0.16em] uppercase">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-blue-400/20 to-transparent ml-2" />
    </div>
  );
}

function MetricCard({ label, value, unit, color, icon, isDark }) {
  return (
    <div className={`rounded-xl border p-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-sm">{icon}</span>}
        <span className={`text-[9px] uppercase tracking-wider font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold" style={{ color }}>{value}</span>
        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{unit}</span>
      </div>
    </div>
  );
}

/* ───────────── Route Mini Chart ───────────── */
function RouteProfileChart({ route, isDark }) {
  const w = 200, h = 40;
  const stops = route.stops;
  const points = Array.from({ length: stops }, (_, i) => {
    const x = (i / (stops - 1)) * w;
    const elevation = Math.sin((i / stops) * Math.PI) * route.elevation_m;
    const y = h - (elevation / Math.max(route.elevation_m, 1)) * (h - 8) - 4;
    return `${x},${y}`;
  }).join(' ');
  const area = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: '40px' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`route_fill_${route.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ROUTE_CATEGORIES[route.category]?.color || '#3b82f6'} stopOpacity="0.25" />
          <stop offset="100%" stopColor={ROUTE_CATEGORIES[route.category]?.color || '#3b82f6'} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#route_fill_${route.id})`} />
      <polyline points={points} fill="none" stroke={ROUTE_CATEGORIES[route.category]?.color || '#3b82f6'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────────── Suitability Gauge ───────────── */
function SuitabilityGauge({ score, size = 60, isDark }) {
  const circumference = 2 * Math.PI * 24;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Mükemmel' : score >= 60 ? 'Uygun' : 'Sınırlı';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="24" fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth="4" />
        <circle cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <text x="28" y="30" textAnchor="middle" fill={color} fontSize="13" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*         ANA PANEL KOMPONENTİ                   */
/* ═══════════════════════════════════════════════ */
export default function AdanaSimulasyonPanel() {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [fleetSize, setFleetSize] = useState(3);
  const [passengerLoad, setPassengerLoad] = useState(0.65);
  const [hvacActive, setHvacActive] = useState(true);
  const [temperature, setTemperature] = useState(30);

  // Filtreleme
  const filteredRoutes = useMemo(() => {
    let routes = ADANA_ROUTES;
    if (selectedCategory !== 'all') routes = routes.filter(r => r.category === selectedCategory);
    if (search) {
      const s = search.toLowerCase();
      routes = routes.filter(r => r.id.toLowerCase().includes(s) || r.name.toLowerCase().includes(s) || r.start.toLowerCase().includes(s) || r.end.toLowerCase().includes(s));
    }
    return routes;
  }, [selectedCategory, search]);

  // Simülasyon
  const simResult = useMemo(() => {
    if (!selectedRoute || !selectedVariant) return null;
    return simulateRoute(selectedRoute, selectedVariant, {
      passenger_load: passengerLoad,
      hvac_active: hvacActive,
      temperature_c: temperature,
    });
  }, [selectedRoute, selectedVariant, passengerLoad, hvacActive, temperature]);

  // Tüm varyantlar karşılaştırma
  const allVariantResults = useMemo(() => {
    if (!selectedRoute) return [];
    return simulateAllVariants(selectedRoute, {
      passenger_load: passengerLoad,
      hvac_active: hvacActive,
      temperature_c: temperature,
    }).sort((a, b) => b.suitability_score - a.suitability_score);
  }, [selectedRoute, passengerLoad, hvacActive, temperature]);

  // Filo maliyeti
  const fleetCost = useMemo(() => {
    if (!selectedRoute || !selectedVariant) return null;
    return calculateDailyFleetCost(selectedRoute, selectedVariant, fleetSize, {
      passenger_load: passengerLoad,
      hvac_active: hvacActive,
      temperature_c: temperature,
    });
  }, [selectedRoute, selectedVariant, fleetSize, passengerLoad, hvacActive, temperature]);

  // İstatistikler
  const stats = useMemo(() => ({
    totalRoutes: ADANA_ROUTES.length,
    totalDistance: ADANA_ROUTES.reduce((s, r) => s + r.distance_km, 0),
    urbanRoutes: ADANA_ROUTES.filter(r => r.category === 'urban').length,
    avgStops: Math.round(ADANA_ROUTES.reduce((s, r) => s + r.stops, 0) / ADANA_ROUTES.length),
  }), []);

  const handleRunSimulation = useCallback(() => {
    if (selectedRoute && selectedVariant) setShowResults(true);
  }, [selectedRoute, selectedVariant]);

  return (
    <div className="space-y-5">
      <style>{PANEL_CSS}</style>

      {/* ═══════ Header ═══════ */}
      <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <HudFrame accent="#3b82f6">
          <div className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isDark ? 'bg-blue-400/10 border-blue-400/20' : 'bg-blue-50 border-blue-200'}`}>
                  <span className="text-2xl">🗺️</span>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-400" style={{ animation: 'adanaPulse 2s infinite' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-base font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Adana Rota Simülasyonu</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${isDark ? 'text-blue-300/80 bg-blue-400/5 border-blue-400/10' : 'text-blue-600 bg-blue-50 border-blue-200'}`}>v1.0</span>
                </div>
                <p className={`text-[11px] tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  TEMSA DIGITAL TWIN • ADANA BÜYÜKŞEHİR BELEDİYESİ TOPLU TAŞIMA ROTA ANALİZİ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: 'Hatlar', value: stats.totalRoutes, color: '#3b82f6' },
                { label: 'Mesafe', value: `${Math.round(stats.totalDistance)} km`, color: '#10b981' },
                { label: 'Ort. Durak', value: stats.avgStops, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} className={`px-3 py-1.5 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`text-[9px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</div>
                  <div className="text-[12px] font-bold mt-0.5" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </HudFrame>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ═══════ Sol Panel: Rota Listesi ═══════ */}
        <div className="lg:col-span-4 space-y-4">
          {/* Kategori Filtre */}
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            <HudFrame accent="#06b6d4">
              <div className="p-4">
                <SectionTag icon="🏷️" title="Hat Kategorisi" color="cyan" />
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      selectedCategory === 'all'
                        ? (isDark ? 'border-blue-400/30 bg-blue-400/15 text-blue-300' : 'border-blue-300 bg-blue-50 text-blue-700')
                        : (isDark ? 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:border-white/20' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300')
                    }`}
                  >
                    Tümü ({ADANA_ROUTES.length})
                  </button>
                  {Object.entries(ROUTE_CATEGORIES).map(([key, cat]) => {
                    const count = ADANA_ROUTES.filter(r => r.category === key).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          selectedCategory === key
                            ? (isDark ? 'border-white/20 bg-white/10 text-white' : 'border-slate-300 bg-slate-100 text-slate-800')
                            : (isDark ? 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700')
                        }`}
                        style={selectedCategory === key ? { borderColor: `${cat.color}50`, background: `${cat.color}15`, color: cat.color } : {}}
                      >
                        {cat.icon} {cat.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Arama */}
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Hat no veya durak ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-[12px] border outline-none transition-all ${
                      isDark
                        ? 'bg-white/[0.04] border-white/10 text-white placeholder-slate-600 focus:border-blue-400/30'
                        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-400'
                    }`}
                  />
                </div>
              </div>
            </HudFrame>
          </motion.div>

          {/* Hat Listesi */}
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
            <HudFrame accent="#10b981">
              <div className="p-4">
                <SectionTag icon="🚏" title={`Hatlar (${filteredRoutes.length})`} color="green" />
                <div className="mt-3 space-y-2 max-h-[520px] overflow-y-auto adana-scroll pr-1">
                  {filteredRoutes.map(route => {
                    const isActive = selectedRoute?.id === route.id;
                    const cat = ROUTE_CATEGORIES[route.category];
                    return (
                      <button
                        key={route.id}
                        onClick={() => { setSelectedRoute(route); setShowResults(false); }}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                          isActive
                            ? (isDark ? 'border-blue-400/30 bg-blue-400/10 shadow-[0_4px_16px_rgba(59,130,246,0.08)]' : 'border-blue-300 bg-blue-50')
                            : (isDark ? 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50'}`}>
                            <span style={{ color: cat?.color }}>{route.id}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-[11px] font-semibold truncate ${isDark ? (isActive ? 'text-blue-300' : 'text-slate-200') : (isActive ? 'text-blue-700' : 'text-slate-800')}`}>
                              {route.name}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {route.distance_km} km · {route.stops} durak · {route.travel_time_min} dk
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: cat?.color, background: `${cat?.color}15`, border: `1px solid ${cat?.color}25` }}>
                                {cat?.icon} {cat?.label}
                              </span>
                              <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>↗ {route.elevation_m}m</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </HudFrame>
          </motion.div>
        </div>

        {/* ═══════ Orta + Sağ Panel ═══════ */}
        <div className="lg:col-span-8 space-y-4">
          {/* Seçili Rota Detay */}
          {selectedRoute && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <HudFrame accent="#f59e0b">
                <div className="p-5">
                  <SectionTag icon="📍" title="Seçili Rota Detayı" color="orange" />
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Mesafe" value={selectedRoute.distance_km} unit="km" color="#3b82f6" icon="📏" isDark={isDark} />
                    <MetricCard label="Durak Sayısı" value={selectedRoute.stops} unit="durak" color="#10b981" icon="🚏" isDark={isDark} />
                    <MetricCard label="Süre" value={selectedRoute.travel_time_min} unit="dk" color="#f59e0b" icon="⏱️" isDark={isDark} />
                    <MetricCard label="Yükseklik" value={selectedRoute.elevation_m} unit="m" color="#8b5cf6" icon="⛰️" isDark={isDark} />
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                      <span className="text-sm">🅰️</span>
                      <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{selectedRoute.start}</span>
                    </div>
                    <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>→</span>
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
                      <span className="text-sm">🅱️</span>
                      <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{selectedRoute.end}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <RouteProfileChart route={selectedRoute} isDark={isDark} />
                  </div>
                </div>
              </HudFrame>
            </motion.div>
          )}

          {/* Varyant Seçimi + Parametreler */}
          {selectedRoute && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <HudFrame accent="#8b5cf6">
                <div className="p-5">
                  <SectionTag icon="🚌" title="Araç Varyantı Seçimi" color="purple" />
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TEMSA_VARIANTS.map(v => {
                      const isActive = selectedVariant?.id === v.id;
                      const isSuitable = v.suitable_for.includes(selectedRoute.category);
                      return (
                        <button
                          key={v.id}
                          onClick={() => { setSelectedVariant(v); setShowResults(false); }}
                          className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                            isActive
                              ? (isDark ? 'border-violet-400/30 bg-violet-400/10' : 'border-violet-300 bg-violet-50')
                              : (isDark ? 'border-white/8 bg-white/[0.02] hover:border-white/15' : 'border-slate-200 bg-white hover:border-slate-300')
                          } ${!isSuitable ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{v.icon}</span>
                            {isSuitable && <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">✓</span>}
                          </div>
                          <div className={`text-[10px] font-semibold ${isDark ? (isActive ? 'text-violet-300' : 'text-slate-200') : (isActive ? 'text-violet-700' : 'text-slate-700')}`}>{v.name}</div>
                          <div className={`text-[9px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {v.type === 'electric' ? `${v.battery_kwh} kWh` : v.type === 'cng' ? 'CNG' : 'Dizel'} · {v.capacity} kişi
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Simülasyon Parametreleri */}
                  <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Yolcu Doluluk</label>
                        <input type="range" min={0.2} max={1.0} step={0.05} value={passengerLoad} onChange={e => setPassengerLoad(parseFloat(e.target.value))} className="w-full accent-blue-500" />
                        <span className={`text-[11px] font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{Math.round(passengerLoad * 100)}%</span>
                      </div>
                      <div>
                        <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sıcaklık</label>
                        <input type="range" min={0} max={45} step={1} value={temperature} onChange={e => setTemperature(parseInt(e.target.value))} className="w-full accent-orange-500" />
                        <span className={`text-[11px] font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{temperature}°C</span>
                      </div>
                      <div>
                        <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Filo Büyüklüğü</label>
                        <input type="range" min={1} max={20} step={1} value={fleetSize} onChange={e => setFleetSize(parseInt(e.target.value))} className="w-full accent-emerald-500" />
                        <span className={`text-[11px] font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>{fleetSize} araç</span>
                      </div>
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={hvacActive} onChange={e => setHvacActive(e.target.checked)} className="accent-cyan-500" />
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>HVAC Aktif</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Simülasyon Başlat */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleRunSimulation}
                      disabled={!selectedRoute || !selectedVariant}
                      className={`px-6 py-3 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-2 border ${
                        !selectedRoute || !selectedVariant
                          ? (isDark ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border-white/10' : 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200')
                          : (isDark ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-300/20 hover:from-blue-400 hover:to-indigo-400 shadow-[0_10px_30px_rgba(59,130,246,0.18)]' : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-400 hover:from-blue-600 hover:to-indigo-600 shadow-md')
                      }`}
                    >
                      <span className="text-sm">▶</span>
                      SİMÜLASYONU BAŞLAT
                    </button>
                  </div>
                </div>
              </HudFrame>
            </motion.div>
          )}

          {/* ═══════ Simülasyon Sonuçları ═══════ */}
          <AnimatePresence>
            {showResults && simResult && (
              <>
                {/* Özet Kartlar */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.05 }}>
                  <HudFrame accent="#22c55e">
                    <div className="p-5">
                      <SectionTag icon="📊" title="Simülasyon Sonuçları" color="green" />
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {simResult.energy_consumption_kwh_km != null && (
                          <MetricCard label="Enerji Tüketimi" value={simResult.energy_consumption_kwh_km.toFixed(2)} unit="kWh/km" color="#22c55e" icon="⚡" isDark={isDark} />
                        )}
                        {simResult.fuel_consumption_l_km != null && (
                          <MetricCard label="Yakıt Tüketimi" value={(simResult.fuel_consumption_l_km * 100).toFixed(1)} unit="L/100km" color="#f59e0b" icon="⛽" isDark={isDark} />
                        )}
                        <MetricCard label="CO₂ Emisyon" value={simResult.co2_total_kg.toFixed(1)} unit="kg/sefer" color={simResult.co2_total_kg === 0 ? '#22c55e' : '#ef4444'} icon={simResult.co2_total_kg === 0 ? '🌿' : '💨'} isDark={isDark} />
                        <MetricCard label="Sefer Maliyeti" value={simResult.cost_per_trip.toFixed(0)} unit="₺" color="#3b82f6" icon="💰" isDark={isDark} />
                        <MetricCard label="km Maliyeti" value={simResult.cost_per_km.toFixed(1)} unit="₺/km" color="#8b5cf6" icon="📈" isDark={isDark} />
                        <MetricCard label="Ort. Hız" value={simResult.avg_speed_kmh.toFixed(1)} unit="km/h" color="#06b6d4" icon="◎" isDark={isDark} />
                        <MetricCard label="Kalan Menzil" value={Math.round(simResult.remaining_range)} unit="km" color={simResult.range_sufficient ? '#22c55e' : '#ef4444'} icon="🛣️" isDark={isDark} />
                        <MetricCard label="Günlük Sefer" value={simResult.daily_trips} unit="sefer" color="#f59e0b" icon="🔁" isDark={isDark} />
                      </div>

                      {/* Uygunluk ve Menzil */}
                      <div className={`mt-4 pt-4 border-t grid grid-cols-3 gap-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-center">
                          <SuitabilityGauge score={simResult.suitability_score} isDark={isDark} />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${simResult.range_sufficient ? '' : 'grayscale'}`}>{simResult.range_sufficient ? '✅' : '❌'}</span>
                            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              {simResult.range_sufficient ? 'Tek seferde rota tamamlanabilir' : 'Menzil yetersiz — şarj/yakıt gerekli'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${simResult.can_cover_daily ? '' : 'grayscale'}`}>{simResult.can_cover_daily ? '✅' : '⚠️'}</span>
                            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              {simResult.can_cover_daily ? `Günlük operasyon karşılanabilir (${simResult.daily_trips} sefer G/D)` : 'Günlük sefer planı için ara şarj/yakıt ikmali gerekli'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{simResult.variant.suitable_for.includes(simResult.route.category) ? '✅' : '⚠️'}</span>
                            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              {simResult.variant.suitable_for.includes(simResult.route.category) ? 'Araç bu hat tipine uygun' : 'Araç bu hat tipi için ideal değil'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </HudFrame>
                </motion.div>

                {/* Filo Maliyet Analizi */}
                {fleetCost && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.15 }}>
                    <HudFrame accent="#f59e0b">
                      <div className="p-5">
                        <SectionTag icon="🏭" title={`Filo Operasyon Analizi (${fleetSize} Araç)`} color="orange" />
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <MetricCard label="Günlük Maliyet" value={fleetCost.daily_cost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} unit="₺" color="#f59e0b" icon="📅" isDark={isDark} />
                          <MetricCard label="Aylık Maliyet" value={fleetCost.monthly_cost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} unit="₺" color="#ef4444" icon="📆" isDark={isDark} />
                          <MetricCard label="Yıllık Maliyet" value={(fleetCost.yearly_cost / 1000000).toFixed(2)} unit="M₺" color="#8b5cf6" icon="📊" isDark={isDark} />
                          <MetricCard label="Yıllık CO₂" value={fleetCost.yearly_co2_ton.toFixed(1)} unit="ton" color={fleetCost.yearly_co2_ton === 0 ? '#22c55e' : '#ef4444'} icon={fleetCost.yearly_co2_ton === 0 ? '🌿' : '🏭'} isDark={isDark} />
                        </div>
                      </div>
                    </HudFrame>
                  </motion.div>
                )}

                {/* Tüm Varyantlar Karşılaştırma */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.2 }}>
                  <HudFrame accent="#06b6d4">
                    <div className="p-5">
                      <SectionTag icon="⚖️" title="Tüm Varyant Karşılaştırması" color="cyan" />
                      <div className="mt-4 overflow-x-auto adana-scroll">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                              <th className="text-left py-2 px-2 font-semibold">Araç</th>
                              <th className="text-center py-2 px-2 font-semibold">Tip</th>
                              <th className="text-center py-2 px-2 font-semibold">Tüketim</th>
                              <th className="text-center py-2 px-2 font-semibold">CO₂ (kg)</th>
                              <th className="text-center py-2 px-2 font-semibold">Maliyet (₺)</th>
                              <th className="text-center py-2 px-2 font-semibold">₺/km</th>
                              <th className="text-center py-2 px-2 font-semibold">Menzil ✓</th>
                              <th className="text-center py-2 px-2 font-semibold">Puan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allVariantResults.map((r, i) => (
                              <tr key={r.variant.id} className={`border-t transition-colors ${
                                isDark
                                  ? `border-white/5 ${selectedVariant?.id === r.variant.id ? 'bg-blue-400/10' : 'hover:bg-white/[0.03]'}`
                                  : `border-slate-100 ${selectedVariant?.id === r.variant.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`
                              }`}>
                                <td className="py-2.5 px-2">
                                  <div className="flex items-center gap-2">
                                    <span>{r.variant.icon}</span>
                                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{r.variant.name}</span>
                                    {i === 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">EN İYİ</span>}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: r.variant.color, background: `${r.variant.color}15` }}>
                                    {r.variant.type === 'electric' ? 'EV' : r.variant.type === 'cng' ? 'CNG' : 'DİZEL'}
                                  </span>
                                </td>
                                <td className={`text-center py-2 px-2 font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {r.energy_consumption_kwh_km != null
                                    ? `${r.energy_consumption_kwh_km.toFixed(2)} kWh/km`
                                    : `${(r.fuel_consumption_l_km * 100).toFixed(1)} L/100km`}
                                </td>
                                <td className={`text-center py-2 px-2 font-mono ${r.co2_total_kg === 0 ? 'text-emerald-400' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>
                                  {r.co2_total_kg.toFixed(1)}
                                </td>
                                <td className={`text-center py-2 px-2 font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {r.cost_per_trip.toFixed(0)}
                                </td>
                                <td className={`text-center py-2 px-2 font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {r.cost_per_km.toFixed(1)}
                                </td>
                                <td className="text-center py-2 px-2">
                                  {r.range_sufficient ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}
                                </td>
                                <td className="text-center py-2 px-2">
                                  <span className={`font-bold text-[12px] ${
                                    r.suitability_score >= 80 ? 'text-emerald-400' : r.suitability_score >= 60 ? 'text-amber-400' : 'text-red-400'
                                  }`}>
                                    {r.suitability_score}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </HudFrame>
                </motion.div>

                {/* Elektrikli Dönüşüm Fırsatı */}
                {selectedVariant?.type !== 'electric' && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.25 }}>
                    <HudFrame accent="#22c55e">
                      <div className="p-5">
                        <SectionTag icon="🌱" title="Elektrikli Dönüşüm Analizi" color="green" />
                        <div className="mt-4">
                          {(() => {
                            const evVariants = allVariantResults.filter(r => r.variant.type === 'electric' && r.range_sufficient);
                            if (evVariants.length === 0) {
                              return (
                                <div className={`text-[12px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  ⚠️ Bu rota için menzil yeterli elektrikli varyant bulunmamaktadır. Şarj altyapısı ile birlikte değerlendirilmelidir.
                                </div>
                              );
                            }
                            const bestEV = evVariants[0];
                            const currentCost = simResult.cost_per_trip;
                            const evCost = bestEV.cost_per_trip;
                            const savings = currentCost - evCost;
                            const savingsPercent = ((savings / currentCost) * 100).toFixed(0);
                            const co2Saved = simResult.co2_total_kg;

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-4 rounded-xl border ${isDark ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-emerald-200 bg-emerald-50'}`}>
                                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-emerald-400/70' : 'text-emerald-600'}`}>Önerilen EV</div>
                                  <div className={`text-[14px] font-bold mt-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{bestEV.variant.icon} {bestEV.variant.name}</div>
                                  <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Uygunluk: {bestEV.suitability_score}/100</div>
                                </div>
                                <div className={`p-4 rounded-xl border ${isDark ? 'border-blue-400/20 bg-blue-400/5' : 'border-blue-200 bg-blue-50'}`}>
                                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-blue-400/70' : 'text-blue-600'}`}>Sefer Başı Tasarruf</div>
                                  <div className={`text-[14px] font-bold mt-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{savings.toFixed(0)} ₺ ({savingsPercent}%)</div>
                                  <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Yıllık: {(savings * simResult.daily_trips * 2 * 312 / 1000).toFixed(0)}K ₺</div>
                                </div>
                                <div className={`p-4 rounded-xl border ${isDark ? 'border-green-400/20 bg-green-400/5' : 'border-green-200 bg-green-50'}`}>
                                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-green-400/70' : 'text-green-600'}`}>CO₂ Azaltımı</div>
                                  <div className={`text-[14px] font-bold mt-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>{co2Saved.toFixed(1)} kg/sefer</div>
                                  <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Yıllık: {(co2Saved * simResult.daily_trips * 2 * 312 / 1000).toFixed(1)} ton</div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </HudFrame>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>

          {/* Boş Durum */}
          {!selectedRoute && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <HudFrame accent="#64748b">
                <div className="p-12 text-center">
                  <span className="text-5xl mb-4 block">🗺️</span>
                  <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Rota Seçin</h3>
                  <p className={`text-[12px] max-w-md mx-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sol panelden bir Adana otobüs hattı seçerek simülasyonu başlatın.
                    TEMSA araç varyantlarının bu rotadaki performansını analiz edin.
                  </p>
                  <div className={`mt-6 flex justify-center gap-6 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏙️</span>
                      <span>{ADANA_ROUTES.filter(r => r.category === 'urban').length} Şehir İçi Hat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚌</span>
                      <span>{ADANA_ROUTES.filter(r => r.category === 'intercity').length} İlçeler Arası</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔋</span>
                      <span>{TEMSA_VARIANTS.filter(v => v.type === 'electric').length} Elektrikli Varyant</span>
                    </div>
                  </div>
                </div>
              </HudFrame>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
