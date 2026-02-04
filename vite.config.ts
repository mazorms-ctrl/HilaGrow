import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // For local development, use '/' as base
  // For GitHub Pages deployment, change to '/Grow/'
  base: process.env.NODE_ENV === 'production' ? '/GROW/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
