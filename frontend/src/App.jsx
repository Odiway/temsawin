import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import LandingPage from './components/LandingPage';
import VariantList from './components/VariantList';
import VariantDetail from './components/VariantDetail';
import CO2Panel from './components/CO2Panel';
import PdfConverterPanel from './components/PdfConverterPanel';
import VectoCodePanel from './components/VectoCodePanel';
import FleetCalculationPanel from './components/FleetCalculationPanel';

const NAV = [
  { key: 'variants', label: 'Varyantlar', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { key: 'co2', label: 'CO2 Emisyonlar', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'fleet-calculation', label: 'Filo CO2 Hesaplama', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { key: 'pdf-converter', label: 'PDF Rapor', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { key: 'vecto-code', label: 'VECTO Kod Olusturucu', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
];

export default function App() {
  const [mode, setMode] = useState('landing');
  const [page, setPage] = useState('variants');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    try { setStats(await api.getStats()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleSelectVariant = (id) => {
    setSelectedVariant(id);
    setPage('variant-detail');
  };

  const handleBack = () => {
    setSelectedVariant(null);
    setPage('variants');
  };

  const enterApp = (target = 'variants') => {
    setMode('app');
    setPage(target);
    window.scrollTo(0, 0);
  };

  if (mode === 'landing') {
    return <LandingPage onNavigate={enterApp} stats={stats} />;
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex lab-bg">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#161b22] border-r border-[#21262d] flex flex-col h-screen sticky top-0">
        {/* TEMSA Logo */}
        <div className="px-5 py-5 border-b border-[#21262d]">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode('landing')}>
            <div className="w-10 h-10 rounded-lg bg-[#E30613] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold text-white tracking-tight">TEMSA</h1>
              <p className="text-[10px] text-[#8b949e] font-medium tracking-widest uppercase">Digital Twin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => { setPage(n.key); setSelectedVariant(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                page === n.key
                  ? 'bg-[#E30613]/10 text-[#E30613]'
                  : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Stats footer */}
        {stats && (
          <div className="px-5 py-4 border-t border-[#21262d]">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#484f58]">Arac Modelleri</span>
                <span className="text-[#e6edf3] font-semibold">{stats.total_vehicles}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#484f58]">Varyant Sayisi</span>
                <span className="text-[#e6edf3] font-semibold">{stats.total_variants}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#484f58]">Sistem Durumu</span>
                <span className="text-[#3fb950] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#3fb950] rounded-full" /> Aktif
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#21262d]">
              <p className="text-[9px] text-[#484f58]">&copy; 2026 TEMSA Ulasim Araclari A.S.</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-auto">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          {page === 'variants' && (
            <VariantList
              onSelectVariant={handleSelectVariant}
            />
          )}
          {page === 'variant-detail' && selectedVariant && (
            <VariantDetail variantId={selectedVariant} onBack={handleBack} />
          )}
          {page === 'co2' && <CO2Panel onSelectVariant={handleSelectVariant} />}
          {page === 'fleet-calculation' && <FleetCalculationPanel />}
          {page === 'pdf-converter' && <PdfConverterPanel />}
          {page === 'vecto-code' && <VectoCodePanel />}
        </div>
      </main>
    </div>
  );
}
