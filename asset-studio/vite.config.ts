import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 57002,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 57002,
    strictPort: true,
  },
})
