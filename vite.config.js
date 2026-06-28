import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Served from https://<user>.github.io/trackfit/ — assets need this base.
  base: '/trackfit/',
  plugins: [react()],
  server: { host: true, port: 5173 },
})
