import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-anonymous-default-export, import/no-unused-modules
export default defineConfig({
  test: {
    coverage: {
      100: true,
      exclude: ['tests'],
      reporter: ['text', 'lcov', 'html'],
    },
  },
})
