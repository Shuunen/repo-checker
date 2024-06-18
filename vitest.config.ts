import { defineConfig } from 'vitest/config'

/* eslint-disable import/no-anonymous-default-export, import/no-unused-modules */
// biome-ignore lint/style/noDefaultExport: <explanation>
export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/index.ts', 'src/mocks/*'],
      include: ['src'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        100: true,
      },
    },
  },
})
/* eslint-enable import/no-anonymous-default-export, import/no-unused-modules */
