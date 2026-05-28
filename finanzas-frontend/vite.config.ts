import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Añade este bloque para tu entorno de desarrollo
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        //target: 'http://127.0.0.0:3000', // Apunta a tu servidor Rust local
        changeOrigin: true,
      }
    }
  }
})