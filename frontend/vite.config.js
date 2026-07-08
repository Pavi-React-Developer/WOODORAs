import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,   // fail instead of silently bumping to 5174
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,       // always point HMR WS at the same port
    },
  },
})
