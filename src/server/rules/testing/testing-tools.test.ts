import { testRule } from '../../engine/rule-tester.ts'
import { coverageDependency, unitTestingDependency, uvuAssert } from './testing-tools.rule.ts'

const uvu = { devDependencies: { uvu: '^0.5.0' } }

testRule(unitTestingDependency, {
  invalid: [
    { errors: ['missing'], installs: ['vitest'], name: 'no testing tool, vitest is installed with a test script', output: { devDependencies: { typescript: '^6.0.0' }, scripts: { test: 'vitest --run && echo test success' } }, pkg: { devDependencies: { typescript: '^6.0.0' } } },
    { errors: ['missing'], installs: ['vitest'], name: 'a placeholder test script is replaced', output: { devDependencies: { typescript: '^6.0.0' }, scripts: { test: 'vitest --run && echo test success' } }, pkg: { devDependencies: { typescript: '^6.0.0' }, scripts: { test: 'echo no tests yet' } } },
  ],
  valid: [
    { name: 'vitest', pkg: { devDependencies: { vitest: '^4.0.0' } } },
    { name: 'bun test', pkg: { dependencies: { zod: '^4.0.0' }, scripts: { test: 'bun test' } } },
    { name: 'no dependency section', pkg: { name: 'foo' } },
  ],
})

testRule(coverageDependency, {
  invalid: [
    {
      errors: ['missing'],
      installs: ['@vitest/coverage-v8'],
      name: 'vitest without coverage, the script and a new config',
      output: [{ devDependencies: { vitest: '^4.0.0' }, scripts: { test: 'vitest --coverage --run' } }, "import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: {\n    coverage: { thresholds: { 100: true } },\n    pool: 'threads',\n  },\n})\n"],
      pkg: { devDependencies: { vitest: '^4.0.0' }, scripts: { test: 'vitest --run' } },
    },
    {
      errors: ['missing'],
      files: { 'vitest.config.ts': "import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: { globals: true },\n})\n" },
      installs: ['@vitest/coverage-v8'],
      name: 'an existing vitest config gets the threshold',
      output: [
        { devDependencies: { vitest: '^4.0.0' }, scripts: { test: 'vitest --run --coverage && echo test success' } },
        "import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: {\n    globals: true,\n\n    coverage: {\n      thresholds: {\n        '100': true,\n      },\n    },\n  },\n})\n",
      ],
      pkg: { devDependencies: { vitest: '^4.0.0' } },
    },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': 'export default {}' },
      installs: ['@vitest/coverage-v8', 'vitest'],
      name: 'no test tool at all, both are installed, merged with the vite config',
      output: [
        { dependencies: { preact: '^11.0.0' }, scripts: { test: 'vitest --run --coverage && echo test success' } },
        "import { defineConfig, mergeConfig } from 'vitest/config'\nimport viteConfig from './vite.config.ts'\n\nexport default mergeConfig(\n  viteConfig,\n  defineConfig({\n    test: {\n      coverage: { thresholds: { 100: true } },\n      pool: 'threads',\n    },\n  }),\n)\n",
      ],
      pkg: { dependencies: { preact: '^11.0.0' }, scripts: { test: 'echo no tests yet' } },
    },
    {
      errors: ['missing'],
      installs: ['@vitest/coverage-v8'],
      name: 'a test script that already collects the coverage, or runs something else, is kept',
      output: ["import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: {\n    coverage: { thresholds: { 100: true } },\n    pool: 'threads',\n  },\n})\n"],
      pkg: { devDependencies: { vitest: '^4.0.0' }, scripts: { test: 'vitest --coverage' } },
    },
    {
      errors: ['missing'],
      installs: ['@vitest/coverage-v8'],
      name: 'a test script running another tool is kept',
      output: ["import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: {\n    coverage: { thresholds: { 100: true } },\n    pool: 'threads',\n  },\n})\n"],
      pkg: { devDependencies: { vitest: '^4.0.0' }, scripts: { test: 'node --test' } },
    },
    { errors: ['missing'], name: 'mocha is not replaced by vitest', pkg: { devDependencies: { mocha: '^11.0.0' } } },
  ],
  valid: [
    { name: 'v8 coverage', pkg: { devDependencies: { '@vitest/coverage-v8': '^4.0.0' } } },
    { name: 'bun test --coverage', pkg: { devDependencies: { bun: '^1.0.0' }, scripts: { test: 'bun test --coverage' } } },
  ],
})

testRule(uvuAssert, {
  invalid: [{ errors: ['found'], files: { 'tests/a.test.js': "import { equal } from 'assert'\n" }, name: 'assert in tests', pkg: uvu }],
  valid: [
    { files: { 'src/a.js': "import { equal } from 'assert'\n", 'tests/a.test.js': "import { equal } from 'uvu/assert'\n" }, name: 'uvu/assert in tests, assert outside', pkg: uvu },
    { name: 'uvu not used', pkg: { devDependencies: { vitest: '^4.0.0' } } },
  ],
})
