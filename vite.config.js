// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // GitHub repository name, including leading/trailing slash
  base: '/Bible-Reader/',

  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
})