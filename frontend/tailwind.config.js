/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        temsa: {
          bg: '#0a0d12',
          card: '#0f1318',
          border: '#1a2030',
          accent: '#3b82f6',
          warm: '#f97316',
        },
        v: {
          red: '#ef4444',
          blue: '#3b82f6',
          green: '#10b981',
          orange: '#f97316',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          pink: '#ec4899',
          yellow: '#eab308',
        },
      },
    },
  },
  plugins: [],
}
