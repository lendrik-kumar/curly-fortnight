import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Read PORT= from ../server/.env so the dev proxy stays in sync (override with VITE_API_PORT). */
function readServerPortFromDotenv() {
  const p = resolve(__dirname, '../server/.env')
  if (!existsSync(p)) return '3001'
  const raw = readFileSync(p, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !trimmed) continue
    const m = trimmed.match(/^PORT\s*=\s*(\d+)\s*$/)
    if (m) return m[1]
  }
  return '3001'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.VITE_API_PORT || readServerPortFromDotenv()
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
