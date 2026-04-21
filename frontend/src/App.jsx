import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import VariantList from './components/VariantList';
import VariantDetail from './components/VariantDetail';
import ImportPanel from './components/ImportPanel';
import SustainabilityPanel from './components/SustainabilityPanel';
import RangeCalculationPanel from './components/RangeCalculationPanel';

/* ═══ Grouped Navigation ═══ */
const NAV_GROUPS = [
  {
    label: 'Genel',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { key: 'variants', label: 'Varyantlar', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    ],
  },
  {
    label: 'Sürdürülebilirlik',
    items: [
      { key: 'sustainability', label: 'Filo & Karşılaştırma', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { key: 'range-calculation', label: 'Menzil Hesaplama', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    ],
  },
  {
    label: 'Dokuman',
    items: [
      { key: 'xml-pdf', label: 'XML → EC PDF', icon: 'M12 16V4m0 12l-4-4m4 4l4-4M4 20h16' },
    ],
  },
];

function AppInner() {
  const { user, loading: authLoading, logout } = useAuth();
  const [mode, setMode] = useState('landing');
  const [page, setPage] = useState('dashboard');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [stats, setStats] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadStats = useCallback(async () => {
    try { setStats(await api.getStats()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="w-8 h-8 border-2 border-blue-900 border-t-blue-400 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSelectVariant = (id) => {
    setSelectedVariant(id);
    setPage('variant-detail');
  };

  const handleBack = () => {
    setSelectedVariant(null);
    setPage('variants');
  };

  const enterApp = (target = 'dashboard') => {
    setMode('app');
    setPage(target);
    window.scrollTo(0, 0);
  };

  if (mode === 'landing') {
    return <LandingPage onNavigate={enterApp} stats={stats} />;
  }

  const navigateTo = (key) => {
    setPage(key);
    setSelectedVariant(null);
  };

  return (
    <div className="min-h-screen bg-[#f4f9ff] flex lab-bg">
      {/* ═══ Premium Sidebar ═══ */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 h-screen sticky top-0 flex flex-col transition-all duration-300 border-r border-[#d8e7ff]`}
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,245,255,0.98) 52%, rgba(229,240,255,0.98) 100%)',
          backdropFilter: 'blur(8px)',
          boxShadow: '6px 0 24px rgba(37,99,235,0.08)'
        }}>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(239,246,255,0.82)), url(/slider-1.jpg) center 22% / cover no-repeat',
            opacity: 0.42
          }}
        />

        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#dce9ff] relative z-10">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-[15px] font-extrabold text-[#12366f] tracking-tight">TEMSA</h1>
                <p className="text-[9px] text-blue-600/60 font-semibold tracking-[0.18em] uppercase">Digital Twin</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin relative z-10">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(n => !n.adminOnly || user?.role === 'admin');
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-1">
                {!sidebarCollapsed && (
                  <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-blue-700/50 uppercase tracking-[0.16em]">{group.label}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-600/20 to-transparent" />
                  </div>
                )}
                {visibleItems.map(n => {
                  const active = page === n.key;
                  return (
                    <button
                      key={n.key}
                      onClick={() => navigateTo(n.key)}
                      title={sidebarCollapsed ? n.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-200 group relative ${
                        active
                          ? 'bg-gradient-to-r from-blue-600/15 to-cyan-500/10 text-[#0f2f66] shadow-sm shadow-blue-500/15'
                          : 'text-[#38598d] hover:text-[#143f86] hover:bg-white/70'
                      }`}
                    >
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-500 rounded-r-full" />}
                      <svg viewBox="0 0 24 24" className={`w-[16px] h-[16px] flex-shrink-0 transition-colors ${active ? 'text-blue-500' : 'text-[#5677ad] group-hover:text-blue-600'}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={n.icon} />
                      </svg>
                      {!sidebarCollapsed && <span className="truncate">{n.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-2.5 mb-2 p-2 rounded-lg text-[#6787b8] hover:text-[#1f4b92] hover:bg-white/70 transition relative z-10"
        >
          <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* User info + logout */}
        <div className="px-3 py-3 border-t border-[#dce9ff] relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-blue-500/20">
              {(user?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-semibold text-[#1c3f79] truncate">{user?.full_name}</div>
                <div className="text-[9px] text-[#5f7cad] truncate">{user?.role === 'admin' ? 'Yönetici' : user?.role === 'manager' ? 'Müdür' : user?.role === 'analyst' ? 'Analist' : 'İzleyici'}</div>
              </div>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-[#6d8abc] hover:text-blue-600 hover:bg-blue-500/10 transition flex-shrink-0"
              title="Çıkış Yap"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" /></svg>
            </button>
          </div>
        </div>

        {/* Stats footer */}
        {stats && !sidebarCollapsed && (
          <div className="px-4 py-3 border-t border-[#dce9ff] relative z-10">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#6581af]">Araç Modelleri</span>
                <span className="text-[#18396f] font-semibold tabular-nums">{stats.total_vehicles}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-[#6581af]">Varyant Sayısı</span>
                <span className="text-[#18396f] font-semibold tabular-nums">{stats.total_variants}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-[#6581af]">Sistem Durumu</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Aktif
                </span>
              </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-[#dce9ff]">
              <p className="text-[8px] text-[#7891ba]">&copy; 2026 TEMSA Ulaşım Araçları A.Ş.</p>
            </div>
          </div>
        )}
      </aside>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 min-h-screen overflow-auto relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_7%,rgba(37,99,235,0.16)_0%,transparent_32%),radial-gradient(circle_at_8%_88%,rgba(14,165,233,0.12)_0%,transparent_28%)]" />
        <div className={`mx-auto ${page === 'dashboard' ? '' : 'max-w-[1600px] px-8 py-6'}`}>
          {page === 'dashboard' && <DashboardPage onNavigate={navigateTo} />}
          {page === 'variants' && <VariantList onSelectVariant={handleSelectVariant} />}
          {page === 'variant-detail' && selectedVariant && <VariantDetail variantId={selectedVariant} onBack={handleBack} />}
          {page === 'sustainability' && <SustainabilityPanel />}
          {page === 'range-calculation' && <RangeCalculationPanel />}
          {page === 'xml-pdf' && <ImportPanel onImportComplete={loadStats} />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
