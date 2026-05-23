import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    host: true, // Listen on all local IPs (needed for Docker)
    port: 5173,
    watch: {
      usePolling: true
    }
  }
})
