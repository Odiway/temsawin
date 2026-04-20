import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import VariantList from './components/VariantList';
import VariantDetail from './components/VariantDetail';
import CO2Panel from './components/CO2Panel';
import FleetCalculationPanel from './components/FleetCalculationPanel';
import AdminPanel from './components/AdminPanel';


import HomologasyonPanel from './components/HomologasyonPanel';
import MaterialsPanel from './components/MaterialsPanel';
import WeightCalcPanel from './components/WeightCalcPanel';
import EnerjiAnaliziPanel from './components/EnerjiAnaliziPanel';
import MLPredictionPanel from './components/MLPredictionPanel';

import BomProjectsPanel from './components/BomProjectsPanel';
import BomProjectDetail from './components/BomProjectDetail';
import DigitalTwinPanel from './components/DigitalTwinPanel';
import InsightsPanel from './components/InsightsPanel';
import RankingsPanel from './components/RankingsPanel';
import BenchmarkPanel from './components/BenchmarkPanel';
import FleetTrackingPanel from './components/FleetTrackingPanel';
import VirtualTestPanel from './components/VirtualTestPanel';
import VariantOutputsPanel from './components/VariantOutputsPanel';
import ImportPanel from './components/ImportPanel';

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
    label: 'Mühendislik',
    items: [
      { key: 'co2', label: 'CO₂ Emisyonlar', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { key: 'fleet-calculation', label: 'Filo CO₂ Hesaplama', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
      { key: 'digital-twin', label: 'Digital Twin', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
      { key: 'weight', label: 'Ağırlık Hesaplama', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
      { key: 'enerji', label: 'Enerji Analizi', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { key: 'benchmark', label: 'Benchmark', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ],
  },
  {
    label: 'Entegrasyon',
    items: [
      { key: 'bom', label: 'BOM & Entegrasyon', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { key: 'materials', label: 'Malzeme Listesi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { key: 'import', label: 'VECTO İçe Aktarma', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    ],
  },
  {
    label: 'Simülasyon & Test',
    items: [
      { key: 'virtual-test', label: 'Sanal Test', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    ],
  },
  {
    label: 'Filo & Analiz',
    items: [
      { key: 'fleet-tracking', label: 'Filo Takip', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
      { key: 'insights', label: 'Bulgular', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
      { key: 'rankings', label: 'Sıralamalar', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
      { key: 'ml-prediction', label: 'ML Tahmin', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    ],
  },
  {
    label: 'Homologasyon',
    items: [
      { key: 'homologasyon', label: 'Regülasyon Takip', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { key: 'admin', label: 'Yönetim Paneli', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', adminOnly: true },
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
          {page === 'co2' && <CO2Panel onSelectVariant={handleSelectVariant} />}
          {page === 'fleet-calculation' && <FleetCalculationPanel />}
          {page === 'digital-twin' && <DigitalTwinPanel />}
          {page === 'weight' && <WeightCalcPanel />}
          {page === 'enerji' && <EnerjiAnaliziPanel />}
          {page === 'benchmark' && <BenchmarkPanel />}
          {page === 'materials' && <MaterialsPanel />}
          {page === 'bom' && !selectedBomProject && <BomProjectsPanel onOpenProject={(id) => setSelectedBomProject(id)} />}
          {page === 'bom' && selectedBomProject && <BomProjectDetail projectId={selectedBomProject} onBack={() => setSelectedBomProject(null)} />}
          {page === 'import' && <ImportPanel onImportComplete={loadStats} />}
          {page === 'virtual-test' && <VirtualTestPanel />}
          {page === 'fleet-tracking' && <FleetTrackingPanel />}
          {page === 'insights' && <InsightsPanel />}
          {page === 'rankings' && <RankingsPanel />}
          {page === 'ml-prediction' && <MLPredictionPanel />}
          {page === 'homologasyon' && <HomologasyonPanel />}
          {page === 'admin' && <AdminPanel />}
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
