import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/repo-check.ts', 'src/mocks/*'],
      include: ['src'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        100: true,
      },
    },
  },
})
