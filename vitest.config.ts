// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-anonymous-default-export, import/no-unused-modules
export default defineConfig({
  test: {
    coverage: {
      // rollback to 100: true,
      lines: 95,
      statements: 95,
      functions: 95,
      branches: 95,
      reporter: ['text', 'lcov', 'html'],
      exclude: ['tests'],
    },
  },
})
