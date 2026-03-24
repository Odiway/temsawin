/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        temsa: {
          bg: '#0b0f19',
          card: '#111827',
          border: '#1e293b',
          accent: '#3b82f6',
          warm: '#d4a054',
        },
      },
    },
  },
  plugins: [],
}
