// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-anonymous-default-export, import/no-unused-modules
export default defineConfig({
  test: {
    coverage: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      100: true,
      reporter: ['text', 'lcov', 'html'],
      exclude: ['tests'],
    },
  },
})
