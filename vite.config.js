import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use "/" for enochchiu.xyz. Set VITE_BASE_PATH=/Bible-Reader/
  // only when publishing at username.github.io/Bible-Reader/.
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
