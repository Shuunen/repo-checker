import { defineConfig } from 'vitest/config'

// eslint-disable-next-line no-anonymous-default-export, no-default-export
export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/server/bin.ts'],
      include: ['src'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        100: true, // eslint-disable-line no-magic-numbers
      },
    },
    globals: true,
    pool: 'threads',
  },
})
