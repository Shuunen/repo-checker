import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// the web app lives in src/web and is built next to the server, which serves it: `bun dev` proxies the api to `bun ui`
export default defineConfig({
  build: { emptyOutDir: true, outDir: '../../dist/web', reportCompressedSize: false },
  plugins: [react(), tailwindcss()],
  root: 'src/web',
  server: { proxy: { '/api': 'http://127.0.0.1:4747' } },
})
