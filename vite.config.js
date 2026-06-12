import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://crm.skch.cz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/ajax0/kvizapi.php'),
      }
    }
  }
})