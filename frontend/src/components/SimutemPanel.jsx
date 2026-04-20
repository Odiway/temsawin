import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';

const CYCLES = [
  { id: 'SORT1', name: 'SORT 1 — Ağır Şehir İçi', desc: '20/30/40 km/h · 520m · 5.8 durak/km', icon: '🏙️' },
  { id: 'SORT2', name: 'SORT 2 — Kolay Şehir İçi', desc: '20/40/50 km/h · 920m · 3.3 durak/km', icon: '🚏' },
  { id: 'SORT3', name: 'SORT 3 — Kolay Banliyö', desc: '30/50/60 km/h · 1450m · 2.1 durak/km', icon: '🛣️' },
  { id: 'BRAUNSCHWEIG', name: 'Braunschweig', desc: 'Avrupa şehir içi · 37 durak · ~1740s', icon: '🇩🇪' },
];

const DEFAULT_PARAMS = {
  cycle: 'SORT1',
  m_curb: 7500,
  n_passengers: 14,
  Cd: 0.6,
  Af: 5.9,
  Cr: 0.0068,
  P_aux: 5000,
  P_hvac: 7000,
  gear_ratio: 6.0,
  r_wheel: 0.391,
  SOC_init: 0.9,
  E_pack_kWh: 170.8,
  V_nom: 730,
  n_series: 192,
  n_parallel: 2,
  T_max: 1700,
  P_max: 125000,
};

const PRESETS = {
  'TEMSA Prestij Elektrik': {
    m_curb: 7500,
    n_passengers: 14,
    Cd: 0.6,
    Af: 5.9,
    Cr: 0.0068,
    P_aux: 5000,
    P_hvac: 7000,
    gear_ratio: 6.0,
    r_wheel: 0.391,
    E_pack_kWh: 170.8,
    V_nom: 730,
    n_series: 192,
    n_parallel: 2,
    T_max: 1700,
    P_max: 125000,
  },
};

const HUD_CSS = `
@keyframes simScan {
  0% { transform: translateY(-100%); opacity: 0; }
  30% { opacity: 0.18; }
  100% { transform: translateY(400%); opacity: 0; }
}

@keyframes simPulse {
  0%,100% { opacity: 0.45; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}

@keyframes simGlow {
  0%,100% { box-shadow: 0 0 0 rgba(34,211,238,0); }
  50% { box-shadow: 0 0 32px rgba(34,211,238,0.06); }
}

@keyframes simRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.sim-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.sim-scrollbar::-webkit-scrollbar-track {
  background: rgba(15,23,42,0.45);
  border-radius: 999px;
}

.sim-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(56,189,248,0.28);
  border-radius: 999px;
}

.sim-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(56,189,248,0.4);
}
`;

const CHART_COLORS = {
  speed: ['#38bdf8', '#fb923c'],
  soc: '#22c55e',
  power: '#f59e0b',
  energy: '#ef4444',
  torque: '#8b5cf6',
  efficiency: '#06b6d4',
  traction: '#ec4899',
  temp: '#f97316',
};

function safeId(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
}

function formatMetricValue(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(digits);
}

function HudFrame({ children, className = '', accent = '#22d3ee' }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.05),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] backdrop-blur-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.30)] ${className}`}
      style={{ animation: 'simGlow 5s ease-in-out infinite' }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 75%)` }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '22px 22px',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.045), transparent)',
          }}
        />
        <div
          className="absolute left-0 right-0 h-24 pointer-events-none"
          style={{
            top: 0,
            background: 'linear-gradient(180deg, rgba(34,211,238,0.08), transparent)',
            animation: 'simScan 5.2s linear infinite',
          }}
        />
      </div>

      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/15 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/15 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/15 rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/15 rounded-br-2xl" />

      <div className="relative">{children}</div>
    </div>
  );
}

function SectionTag({ icon, title, color = 'cyan' }) {
  const cls = {
    cyan: 'bg-cyan-400',
    blue: 'bg-blue-400',
    green: 'bg-emerald-400',
    orange: 'bg-amber-400',
    purple: 'bg-violet-400',
    red: 'bg-red-400',
    pink: 'bg-pink-400',
  }[color] || 'bg-cyan-400';

  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-2 h-2 rounded-full ${cls} shadow-[0_0_16px_rgba(255,255,255,0.08)]`} />
      {icon && <span className="text-sm opacity-90">{icon}</span>}
      <h3 className="text-[11px] font-semibold text-slate-100 tracking-[0.16em] uppercase">
        {title}
      </h3>
      <div className="flex-1 h-px bg-gradient-to-r from-cyan-400/20 to-transparent ml-2" />
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-[11px] font-semibold mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

// Premium Mini Chart
function MiniChart({ data, color = '#06b6d4', height = 120, label, unit, icon }) {
  const chartId = useMemo(() => safeId(label), [label]);
  if (!data || data.length === 0) return null;

  const vals = data;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 100;
  const h = height;

  const points = vals
    .map((v, i) => {
      const x = (i / Math.max(vals.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 18) - 9;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${h} ${points} ${w},${h}`;
  const latest = vals[vals.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 via-slate-900/92 to-slate-950/95 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.28)] hover:border-white/15 transition-all"
    >
      <div
        className="h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${color} 0%, ${color}88 45%, transparent 100%)`,
        }}
      />

      <div className="absolute inset-0 pointer-events-none opacity-[0.055]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-xs border"
                style={{
                  borderColor: `${color}2e`,
                  backgroundColor: `${color}14`,
                  color,
                }}
              >
                {icon}
              </div>
            )}

            <div>
              <div className="text-[11px] font-semibold tracking-wide text-slate-200 uppercase">
                {label}
              </div>
              <div className="text-[10px] text-slate-500">Gerçek zamanlı telemetri</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold leading-none tracking-tight" style={{ color }}>
              {formatMetricValue(latest, 1)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{unit}</div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full rounded-xl"
          style={{ height: `${height}px` }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`area_${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.30" />
              <stop offset="70%" stopColor={color} stopOpacity="0.09" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id={`line_${chartId}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.88" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>

            <filter id={`glow_${chartId}`}>
              <feGaussianBlur stdDeviation="1.7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[20, 45, 70, 95].map((y, i) => (
            <line
              key={i}
              x1="0"
              y1={y}
              x2={w}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.45"
            />
          ))}

          <polygon points={areaPoints} fill={`url(#area_${chartId})`} />

          <polyline
            points={points}
            fill="none"
            stroke={`url(#line_${chartId})`}
            strokeWidth="2.1"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#glow_${chartId})`}
          />

          <polyline
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.65"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>MIN {formatMetricValue(min, 1)}</span>
          <span>MAX {formatMetricValue(max, 1)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// Premium Dual Chart
function DualChart({
  data1,
  data2,
  color1,
  color2,
  height = 120,
  label,
  legend1,
  legend2,
  icon,
}) {
  const chartId = useMemo(() => safeId(label), [label]);

  if (!data1 || data1.length === 0 || !data2 || data2.length === 0) return null;

  const allVals = [...data1, ...data2];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const w = 100;
  const h = height;

  const toPoints = (vals) =>
    vals
      .map((v, i) => {
        const x = (i / Math.max(vals.length - 1, 1)) * w;
        const y = h - ((v - min) / range) * (h - 18) - 9;
        return `${x},${y}`;
      })
      .join(' ');

  const p1 = toPoints(data1);
  const p2 = toPoints(data2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 via-slate-900/92 to-slate-950/95 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.28)] hover:border-white/15 transition-all"
    >
      <div className="h-[2px] bg-gradient-to-r from-sky-400 via-orange-400 to-transparent" />

      <div className="absolute inset-0 pointer-events-none opacity-[0.055]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs border border-white/10 bg-white/[0.04] text-slate-200">
                {icon}
              </div>
            )}

            <div>
              <div className="text-[11px] font-semibold tracking-wide text-slate-200 uppercase">
                {label}
              </div>
              <div className="text-[10px] text-slate-500">Karşılaştırmalı veri görünümü</div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color1, boxShadow: `0 0 0 3px ${color1}20` }}
              />
              <span>{legend1}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color2, boxShadow: `0 0 0 3px ${color2}20` }}
              />
              <span>{legend2}</span>
            </div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full rounded-xl"
          style={{ height: `${height}px` }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`fill1_${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color1} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color1} stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id={`fill2_${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color2} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color2} stopOpacity="0.02" />
            </linearGradient>

            <filter id={`glowDual_${chartId}`}>
              <feGaussianBlur stdDeviation="1.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[20, 45, 70, 95].map((y, i) => (
            <line
              key={i}
              x1="0"
              y1={y}
              x2={w}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.45"
            />
          ))}

          <polygon points={`0,${h} ${p1} ${w},${h}`} fill={`url(#fill1_${chartId})`} />
          <polygon points={`0,${h} ${p2} ${w},${h}`} fill={`url(#fill2_${chartId})`} />

          <polyline
            points={p1}
            fill="none"
            stroke={color1}
            strokeWidth="2.05"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#glowDual_${chartId})`}
          />

          <polyline
            points={p2}
            fill="none"
            stroke={color2}
            strokeWidth="2.05"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#glowDual_${chartId})`}
          />
        </svg>
      </div>
    </motion.div>
  );
}

function ParameterSlider({ label, value, min, max, step, color, onChange, suffixFormatter }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {suffixFormatter ? suffixFormatter(value) : value}
        </span>
      </div>

      <div className="relative">
        <div className="h-2 rounded-full bg-slate-800/90 border border-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(0, Math.min(100, pct))}%`,
              background: `linear-gradient(90deg, ${color}55, ${color})`,
              boxShadow: `0 0 18px ${color}20`,
            }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

export default function SimutemPanel() {
  const { authFetch } = useAuth();
  const [params, setParams] = useState({ ...DEFAULT_PARAMS });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const updateParam = (key, value) => setParams((prev) => ({ ...prev, [key]: value }));

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetcher = authFetch || fetch;
      const res = await fetcher('/simutem-api/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      setResult(await res.json());
    } catch (e) {
      setError(e.message || 'Simülasyon sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [params, authFetch]);

  const applyPreset = (name) => {
    setParams((prev) => ({ ...prev, ...PRESETS[name] }));
    setResult(null);
  };

  const summaryCards = result
    ? [
        {
          label: 'Tüketim',
          value: `${result.summary['Consumption [kWh/100km]']}`,
          unit: 'kWh/100km',
          color: '#fb923c',
          icon: '⚡',
        },
        {
          label: 'Mesafe',
          value: `${result.summary['Total distance [km]']}`,
          unit: 'km',
          color: '#60a5fa',
          icon: '📏',
        },
        {
          label: 'Net Enerji',
          value: `${(result.summary['Net energy [Wh]'] / 1000).toFixed(1)}`,
          unit: 'kWh',
          color: '#fbbf24',
          icon: '🔋',
        },
        {
          label: 'Ort. Hız',
          value: `${result.summary['Average speed [km/h]']}`,
          unit: 'km/h',
          color: '#34d399',
          icon: '◎',
        },
        {
          label: 'Rejenerasyon',
          value: `${result.summary['Regen ratio [%]']}`,
          unit: '%',
          color: '#a78bfa',
          icon: '♻',
        },
        {
          label: 'SOC Kullanım',
          value: `${result.summary['SOC used [%]']}`,
          unit: '%',
          color: '#22d3ee',
          icon: '◈',
        },
        {
          label: 'Motor Verim',
          value: `${result.summary['Avg motor efficiency [%]']}`,
          unit: '%',
          color: '#06b6d4',
          icon: '⚙',
        },
        {
          label: 'Menzil',
          value: `${result.summary['Remaining range [km]']}`,
          unit: 'km',
          color: '#22c55e',
          icon: '🛣️',
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <style>{HUD_CSS}</style>

      {/* ───────────────────────── Command Bar ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <HudFrame accent="#22d3ee">
          <div className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-cyan-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="6" width="18" height="10" rx="2" />
                    <line x1="3" y1="11" x2="21" y2="11" />
                    <rect x="5" y="7.5" width="4" height="3" rx="0.5" />
                    <rect x="10" y="7.5" width="4" height="3" rx="0.5" />
                    <circle cx="7" cy="18" r="1.5" />
                    <circle cx="17" cy="18" r="1.5" />
                  </svg>
                </div>

                <div
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-300"
                  style={{ animation: 'simPulse 2s infinite' }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-white tracking-tight">
                    SiMUTEM Enerji Simülasyonu
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300/80 bg-cyan-400/5 px-2 py-0.5 rounded-full border border-cyan-400/10">
                    v2.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 tracking-wide">
                  TEMSA DIGITAL TWIN • SIMULINK-FREE MULTIMODEL URBAN TRANSIT ENERGY MODEL
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatBadge label="Aktif Çevrim" value={params.cycle} color="#22d3ee" />
              <button
                onClick={runSimulation}
                disabled={loading}
                className={`px-5 py-3 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-2 border ${
                  loading
                    ? 'bg-slate-800/80 text-slate-500 cursor-wait border-white/10'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-300/20 hover:from-cyan-400 hover:to-blue-400 shadow-[0_10px_30px_rgba(34,211,238,0.18)]'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-cyan-300 rounded-full animate-spin" />
                    SİMÜLASYON ÇALIŞIYOR...
                  </>
                ) : (
                  <>
                    <span className="text-sm">▶</span>
                    SİMÜLASYONU BAŞLAT
                  </>
                )}
              </button>
            </div>
          </div>
        </HudFrame>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300 text-sm font-medium flex items-center gap-2"
        >
          <span className="text-base">⚠</span>
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ───────────────────────── Left Panel ───────────────────────── */}
        <div className="space-y-4">
          {/* Drive Cycle */}
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            <HudFrame accent="#06b6d4">
              <div className="p-4">
                <SectionTag icon="🔄" title="Sürüş Çevrimi" color="cyan" />
                <div className="space-y-2 mt-4">
                  {CYCLES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => updateParam('cycle', c.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                        params.cycle === c.id
                          ? 'border-cyan-400/30 bg-cyan-400/10 shadow-[0_8px_24px_rgba(34,211,238,0.08)]'
                          : 'border-white/8 bg-white/[0.02] hover:border-cyan-400/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-base">
                          {c.icon}
                        </div>

                        <div>
                          <div
                            className={`text-[11px] font-semibold ${
                              params.cycle === c.id ? 'text-cyan-300' : 'text-slate-200'
                            }`}
                          >
                            {c.name}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">{c.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </HudFrame>
          </motion.div>

          {/* Presets */}
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
            <HudFrame accent="#3b82f6">
              <div className="p-4">
                <SectionTag icon="🚌" title="Araç Ön Ayarları" color="blue" />
                <div className="space-y-2 mt-4">
                  {Object.keys(PRESETS).map((name) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-medium text-slate-300 hover:text-cyan-300 bg-white/[0.02] hover:bg-white/[0.04] border border-white/8 hover:border-cyan-400/20 transition-all"
                    >
                      ◇ {name}
                    </button>
                  ))}
                </div>
              </div>
            </HudFrame>
          </motion.div>

          {/* Key Parameters */}
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 }}>
            <HudFrame accent="#10b981">
              <div className="p-4">
                <SectionTag icon="⚙" title="Temel Parametreler" color="green" />
                <div className="space-y-4 mt-4">
                  <ParameterSlider
                    label="Boş Ağırlık (kg)"
                    value={params.m_curb}
                    min={5000}
                    max={25000}
                    step={100}
                    color="#06b6d4"
                    onChange={(v) => updateParam('m_curb', v)}
                  />

                  <ParameterSlider
                    label="Yolcu Sayısı"
                    value={params.n_passengers}
                    min={0}
                    max={150}
                    step={1}
                    color="#3b82f6"
                    onChange={(v) => updateParam('n_passengers', v)}
                  />

                  <ParameterSlider
                    label="Batarya Kapasitesi (kWh)"
                    value={params.E_pack_kWh}
                    min={50}
                    max={500}
                    step={10}
                    color="#10b981"
                    onChange={(v) => updateParam('E_pack_kWh', v)}
                  />

                  <ParameterSlider
                    label="Başlangıç SOC"
                    value={params.SOC_init}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    color="#f59e0b"
                    onChange={(v) => updateParam('SOC_init', v)}
                    suffixFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />

                  <ParameterSlider
                    label="Maks Motor Gücü (kW)"
                    value={params.P_max}
                    min={50000}
                    max={400000}
                    step={10000}
                    color="#8b5cf6"
                    onChange={(v) => updateParam('P_max', v)}
                    suffixFormatter={(v) => `${(v / 1000).toFixed(0)} kW`}
                  />

                  <ParameterSlider
                    label="HVAC Gücü (W)"
                    value={params.P_hvac}
                    min={0}
                    max={20000}
                    step={500}
                    color="#ef4444"
                    onChange={(v) => updateParam('P_hvac', v)}
                  />
                </div>
              </div>
            </HudFrame>
          </motion.div>

          {/* Advanced */}
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <HudFrame accent="#64748b">
              <details>
                <summary className="px-4 py-3.5 text-[11px] text-slate-400 cursor-pointer hover:text-cyan-300 transition font-semibold uppercase tracking-wider flex items-center gap-2">
                  <span className="text-xs">◈</span>
                  İleri Düzey Parametreler
                </summary>

                <div className="px-4 pb-4 space-y-2.5 text-xs">
                  {[
                    ['Cd (Sürüklenme)', 'Cd'],
                    ['Af (Ön Alan m²)', 'Af'],
                    ['Cr (Yuvarlanma)', 'Cr'],
                    ['Dişli Oranı', 'gear_ratio'],
                    ['Tekerlek Yarıçapı (m)', 'r_wheel'],
                    ['Maks Tork (Nm)', 'T_max'],
                    ['Seri Hücre', 'n_series'],
                    ['Paralel Hücre', 'n_parallel'],
                  ].map(([label, key]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5"
                    >
                      <span className="text-slate-400 flex-1 text-[11px]">{label}</span>
                      <input
                        type="number"
                        value={params[key]}
                        step="any"
                        onChange={(e) => updateParam(key, parseFloat(e.target.value) || 0)}
                        className="w-28 bg-slate-950/70 border border-white/10 rounded-lg px-2.5 py-1.5 text-cyan-300 text-right text-[11px] font-mono focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/10 outline-none transition"
                      />
                    </div>
                  ))}
                </div>
              </details>
            </HudFrame>
          </motion.div>
        </div>

        {/* ───────────────────────── Right Panel ───────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HudFrame accent="#22d3ee">
                  <div className="p-12 text-center">
                    <div className="relative w-16 h-16 mx-auto mb-5">
                      <div
                        className="absolute inset-0 border-2 border-cyan-400/20 rounded-full"
                        style={{ animation: 'simRing 8s linear infinite' }}
                      />
                      <div
                        className="absolute inset-2 border border-dashed border-cyan-400/10 rounded-full"
                        style={{ animation: 'simRing 12s linear infinite reverse' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-6 h-6 text-cyan-300/50"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        >
                          <rect x="3" y="6" width="18" height="10" rx="2" />
                          <line x1="3" y1="11" x2="21" y2="11" />
                          <circle cx="7" cy="18" r="1.5" />
                          <circle cx="17" cy="18" r="1.5" />
                        </svg>
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-white mb-2">Simülasyon Sonuçları Bekleniyor</h3>
                    <p className="text-[11px] text-slate-500">
                      Parametreleri ayarlayın ve “Simülasyonu Başlat” butonuna basın
                    </p>
                    <p className="text-[10px] text-cyan-400/30 mt-3 font-mono tracking-wide">
                      SiMUTEM — Simulink-free Multimodel Urban Transit Energy Model
                    </p>
                  </div>
                </HudFrame>
              </motion.div>
            )}

            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HudFrame accent="#22d3ee">
                  <div className="p-12 text-center">
                    <div className="relative w-16 h-16 mx-auto mb-5">
                      <div
                        className="absolute inset-0 border-2 border-cyan-400/30 rounded-full"
                        style={{ animation: 'simRing 2s linear infinite' }}
                      />
                      <div
                        className="absolute inset-2 border-2 border-blue-400/20 rounded-full"
                        style={{ animation: 'simRing 3s linear infinite reverse' }}
                      />
                      <div
                        className="absolute inset-4 border-2 border-emerald-400/15 rounded-full"
                        style={{ animation: 'simRing 1.5s linear infinite' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-cyan-300" style={{ animation: 'simPulse 1s infinite' }} />
                      </div>
                    </div>

                    <p className="text-sm text-cyan-300 font-semibold">Simülasyon Motoru Çalışıyor...</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono tracking-wide">
                      Fizik motoru hesaplamaları devam ediyor
                    </p>
                  </div>
                </HudFrame>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {summaryCards.map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 overflow-hidden transition-all hover:border-white/15 hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                    >
                      <div
                        className="h-[2px]"
                        style={{ background: `linear-gradient(90deg, ${card.color}70, transparent)` }}
                      />

                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-xs border"
                            style={{
                              backgroundColor: `${card.color}14`,
                              borderColor: `${card.color}22`,
                              color: card.color,
                            }}
                          >
                            {card.icon}
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                            {card.label}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold tracking-tight" style={{ color: card.color }}>
                            {card.value}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{card.unit}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Telemetry Charts */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <HudFrame
                    className="border-white/10 bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95"
                    accent="#22d3ee"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4 gap-3">
                        <SectionTag icon="📊" title="Telemetri Verileri" color="cyan" />
                        <div className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                          Live Simulation Feed
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DualChart
                          data1={result.charts.v_reference}
                          data2={result.charts.v_actual}
                          color1={CHART_COLORS.speed[0]}
                          color2={CHART_COLORS.speed[1]}
                          label="Hız Profili"
                          legend1="Referans"
                          legend2="Gerçek"
                          height={150}
                          icon="🏎️"
                        />

                        <MiniChart
                          data={result.charts.SOC}
                          color={CHART_COLORS.soc}
                          label="Batarya SOC"
                          unit="%"
                          height={150}
                          icon="🔋"
                        />

                        <MiniChart
                          data={result.charts.P_battery}
                          color={CHART_COLORS.power}
                          label="Batarya Gücü"
                          unit="kW"
                          height={125}
                          icon="⚡"
                        />

                        <MiniChart
                          data={result.charts.E_consumed_Wh}
                          color={CHART_COLORS.energy}
                          label="Kümülatif Enerji"
                          unit="Wh"
                          height={125}
                          icon="📈"
                        />

                        <MiniChart
                          data={result.charts.T_motor}
                          color={CHART_COLORS.torque}
                          label="Motor Torku"
                          unit="Nm"
                          height={125}
                          icon="⚙"
                        />

                        <MiniChart
                          data={result.charts.eta_motor}
                          color={CHART_COLORS.efficiency}
                          label="Motor Verimi"
                          unit="%"
                          height={125}
                          icon="◎"
                        />

                        <MiniChart
                          data={result.charts.F_traction}
                          color={CHART_COLORS.traction}
                          label="Çekiş Kuvveti"
                          unit="kN"
                          height={125}
                          icon="🔧"
                        />

                        <MiniChart
                          data={result.charts.T_battery}
                          color={CHART_COLORS.temp}
                          label="Batarya Sıcaklığı"
                          unit="°C"
                          height={125}
                          icon="🌡️"
                        />
                      </div>
                    </div>
                  </HudFrame>
                </motion.div>

                {/* Detailed Summary */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}>
                  <HudFrame accent="#8b5cf6">
                    <div className="p-4">
                      <SectionTag icon="📋" title="Detaylı Simülasyon Özeti" color="purple" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-xl overflow-hidden bg-white/5 mt-4">
                        {Object.entries(result.summary).map(([key, val], i) => (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.28 + i * 0.015 }}
                            className="bg-slate-950/70 px-4 py-3 flex justify-between items-center hover:bg-cyan-400/[0.03] transition-colors"
                          >
                            <span className="text-[11px] text-slate-400 font-medium">{key}</span>
                            <span className="text-[11px] text-cyan-300 font-semibold font-mono">
                              {typeof val === 'number' ? val.toLocaleString('tr-TR') : val}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </HudFrame>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}