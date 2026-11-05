import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// the web app lives in src/web and is built next to the server, which serves it: `pnpm dev` and `pnpm ui --watch` proxy the api to `pnpm ui`
export default defineConfig({
  build: { emptyOutDir: true, outDir: '../../dist/web', reportCompressedSize: false },
  plugins: [react(), tailwindcss()],
  // dedicated ports, so apps never collide when running together
  preview: { port: 4109, strictPort: true },
  root: 'src/web',
  server: { port: 5109, proxy: { '/api': `http://127.0.0.1:${process.env.REPO_CHECK_PORT ?? '4747'}` }, strictPort: true },
})
