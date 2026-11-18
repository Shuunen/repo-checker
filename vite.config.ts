import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { uniqueMark } from 'shuutils/plugins'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// the web app lives in src/web and is built next to the server, which serves it: `pnpm dev` and `pnpm start:ui --watch` proxy the api to `pnpm start:ui`
export default defineConfig({
  build: { emptyOutDir: true, outDir: '../../dist/web', reportCompressedSize: false },
  plugins: [
    uniqueMark(),
    react(),
    tailwindcss(),
    // the dashboard needs the live local api, so the worker (src/web/sw.js) caches nothing and only makes the app installable, hence no precache injection
    // oxlint-disable-next-line new-cap
    VitePWA({
      filename: 'sw.js',
      injectManifest: { injectionPoint: '' },
      manifest: {
        background_color: '#012c67',
        description: 'Repo maintenance made easy',
        display: 'standalone',
        icons: [
          { sizes: '64x64', src: '/pwa-64x64.png', type: 'image/png' },
          { sizes: '192x192', src: '/pwa-192x192.png', type: 'image/png' },
          { sizes: '512x512', src: '/pwa-512x512.png', type: 'image/png' },
          { purpose: 'maskable', sizes: '512x512', src: '/maskable-icon-512x512.png', type: 'image/png' },
        ],
        id: '/',
        name: 'repo-checker',
        scope: '/',
        short_name: 'repo-checker',
        start_url: '/',
        theme_color: '#024eb8',
      },
      srcDir: '.',
      strategies: 'injectManifest',
    }),
  ],
  // dedicated ports, so apps never collide when running together
  preview: { port: 4109, strictPort: true },
  root: 'src/web',
  server: { port: 5109, proxy: { '/api': `http://127.0.0.1:${process.env.REPO_CHECK_PORT ?? '4747'}` }, strictPort: true },
})
