import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/cli.ts', 'src/server/http/watch.ts', 'src/web/main.tsx', 'src/**/*fixtures.ts', 'src/web/test/render-app.tsx', 'src/server/test/vitest.setup.ts'],
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        100: true,
      },
    },
    globals: true,
    pool: 'threads',
    projects: [
      { extends: true, test: { environment: 'node', include: ['src/server/**/*.test.ts', 'src/shared/**/*.test.ts', 'demo/**/*.test.mjs'], name: 'server', setupFiles: ['src/server/test/vitest.setup.ts'] } },
      { extends: true, test: { environment: 'happy-dom', include: ['src/web/**/*.test.{ts,tsx}'], name: 'web' } },
    ],
    reporters: ['dot'],
    silent: true,
    // git is slow to start on Windows when many tests run at once
    testTimeout: 30_000,
  },
})
