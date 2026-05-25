import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    proxy: {
      '/api/system/livekit': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/connection-details': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/v1': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
      '/api': 'http://localhost:3001',
    }
  }
})
