import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/bom-api': {
        target: 'http://bom-backend:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bom-api/, '/api'),
      },
      '/simutem-api': {
        target: 'http://simutem-backend:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/simutem-api/, ''),
      },
      '/homolog-api': {
        target: 'http://homolog-backend:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/homolog-api/, ''),
      },
    },
  },
})
