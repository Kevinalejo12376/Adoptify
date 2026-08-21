import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Escucha solo en localhost/127.0.0.1. Evita que Vite muestre
    // direcciones de red (LAN) en la consola y no expone el server.
    host: 'localhost',
    // Puerto fijo: evita que Vite salte a 5174 si el 5173 esta ocupado.
    port: 5173,
    strictPort: true,
    allowedHosts: true
  }
})
