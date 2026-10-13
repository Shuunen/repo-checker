import { defineConfig } from 'vitest/config'

// eslint-disable-next-line no-anonymous-default-export, no-default-export
export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/server/bin.ts', 'src/web/main.tsx'],
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        100: true, // eslint-disable-line no-magic-numbers
      },
    },
    globals: true,
    pool: 'threads',
    projects: [
      { extends: true, test: { environment: 'node', include: ['src/server/**/*.test.ts', 'src/shared/**/*.test.ts'], name: 'server' } },
      { extends: true, test: { environment: 'happy-dom', include: ['src/web/**/*.test.{ts,tsx}'], name: 'web' } },
    ],
  },
})
