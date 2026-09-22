import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — сборку можно выложить в любую папку (GitHub Pages, Netlify, свой хостинг).
export default defineConfig({
  base: './',
  plugins: [react()],
})
