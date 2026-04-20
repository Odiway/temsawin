import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import VariantList from './components/VariantList';
import VariantDetail from './components/VariantDetail';
import MaterialsPanel from './components/MaterialsPanel';
import BomProjectsPanel from './components/BomProjectsPanel';
import BomProjectDetail from './components/BomProjectDetail';
import VariantOutputsPanel from './components/VariantOutputsPanel';
import SustainabilityPanel from './components/SustainabilityPanel';
import RangeCalculationPanel from './components/RangeCalculationPanel';

/* ═══ Grouped Navigation ═══ */
const NAV_GROUPS = [
  {
    label: 'Genel',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { key: 'variants', label: 'Varyantlar', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { key: 'variant-outputs', label: 'VECTO Çıktıları', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
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
    label: 'Entegrasyon',
    items: [
      { key: 'bom', label: 'BOM & Entegrasyon', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { key: 'materials', label: 'Malzeme Listesi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    ],
  },
];

function AppInner() {
  const { user, loading: authLoading, logout } = useAuth();
  const [mode, setMode] = useState('landing');
  const [page, setPage] = useState('dashboard');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedBomProject, setSelectedBomProject] = useState(null);
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
    setSelectedBomProject(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex lab-bg">
      {/* ═══ Premium Sidebar ═══ */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 h-screen sticky top-0 flex flex-col transition-all duration-300`}
        style={{ background: 'linear-gradient(180deg, #0d1b3e 0%, #0a1628 50%, #091320 100%)' }}>

        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-[15px] font-extrabold text-white tracking-tight">TEMSA</h1>
                <p className="text-[9px] text-blue-300/50 font-semibold tracking-[0.18em] uppercase">Digital Twin</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(n => !n.adminOnly || user?.role === 'admin');
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-1">
                {!sidebarCollapsed && (
                  <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-blue-400/40 uppercase tracking-[0.16em]">{group.label}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-400/10 to-transparent" />
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
                          ? 'bg-blue-500/15 text-white shadow-sm shadow-blue-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-400 rounded-r-full" />}
                      <svg viewBox="0 0 24 24" className={`w-[16px] h-[16px] flex-shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
          className="mx-2.5 mb-2 p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition"
        >
          <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* User info + logout */}
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-blue-500/20">
              {(user?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-semibold text-slate-200 truncate">{user?.full_name}</div>
                <div className="text-[9px] text-slate-500 truncate">{user?.role === 'admin' ? 'Yönetici' : user?.role === 'manager' ? 'Müdür' : user?.role === 'analyst' ? 'Analist' : 'İzleyici'}</div>
              </div>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0"
              title="Çıkış Yap"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" /></svg>
            </button>
          </div>
        </div>

        {/* Stats footer */}
        {stats && !sidebarCollapsed && (
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Araç Modelleri</span>
                <span className="text-slate-300 font-semibold tabular-nums">{stats.total_vehicles}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Varyant Sayısı</span>
                <span className="text-slate-300 font-semibold tabular-nums">{stats.total_variants}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Sistem Durumu</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Aktif
                </span>
              </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.04]">
              <p className="text-[8px] text-slate-600">&copy; 2026 TEMSA Ulaşım Araçları A.Ş.</p>
            </div>
          </div>
        )}
      </aside>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 min-h-screen overflow-auto">
        <div className={`mx-auto ${page === 'dashboard' ? '' : 'max-w-[1600px] px-8 py-6'}`}>
          {page === 'dashboard' && <DashboardPage onNavigate={navigateTo} />}
          {page === 'variants' && <VariantList onSelectVariant={handleSelectVariant} />}
          {page === 'variant-detail' && selectedVariant && <VariantDetail variantId={selectedVariant} onBack={handleBack} />}
          {page === 'variant-outputs' && <VariantOutputsPanel />}
          {page === 'sustainability' && <SustainabilityPanel />}
          {page === 'range-calculation' && <RangeCalculationPanel />}
          {page === 'materials' && <MaterialsPanel />}
          {page === 'bom' && !selectedBomProject && <BomProjectsPanel onOpenProject={(id) => setSelectedBomProject(id)} />}
          {page === 'bom' && selectedBomProject && <BomProjectDetail projectId={selectedBomProject} onBack={() => setSelectedBomProject(null)} />}
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
