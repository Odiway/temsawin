import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('temsa-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try { localStorage.setItem('temsa-theme', theme); } catch {}
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Reusable Recharts tooltip/axis/grid styles that adapt to theme */
export function useChartTheme() {
  const { isDark } = useTheme();
  return {
    tooltip: {
      contentStyle: {
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
        border: `1px solid ${isDark ? 'rgba(148,163,184,0.15)' : '#e2e8f0'}`,
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        backdropFilter: 'blur(12px)',
        fontSize: 12,
        color: isDark ? '#e2e8f0' : '#1e293b',
      },
      labelStyle: { color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: 4 },
      itemStyle: { color: isDark ? '#e2e8f0' : '#334155', padding: '2px 0' },
    },
    grid: { strokeDasharray: '3 3', stroke: isDark ? '#1e293b' : '#e2e8f0', strokeOpacity: 0.6 },
    axis: { stroke: isDark ? '#475569' : '#94a3b8', fontSize: 11, tickLine: false },
    isDark,
  };
}
