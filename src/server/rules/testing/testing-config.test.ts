import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { testingConfigRules } from './testing-config.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = testingConfigRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const vitest = { devDependencies: { vitest: '^4.0.0' } }
const nyc = { devDependencies: { nyc: '^17.0.0' } }

testRule(byId('vitest-pool-threads'), {
  invalid: [
    { errors: ['missing'], files: { 'vitest.config.ts': 'export default {}' }, name: 'no pool, a test section is added', output: 'export default {\n  test: {\n    pool: "threads"\n  }\n};', pkg: vitest },
    {
      errors: ['missing'],
      files: { 'vitest.config.ts': "import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: { globals: true },\n})\n" },
      name: 'no pool, kept in the test section',
      output: "import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: {\n    globals: true,\n    pool: 'threads',\n  },\n})\n",
      pkg: vitest,
    },
    { errors: ['missing'], files: { 'vitest.config.ts': 'export const config = {}' }, name: 'a config that cannot be read, not fixed', pkg: vitest },
  ],
  valid: [
    { files: { 'vitest.config.mts': "export default { test: { pool: 'threads' } }" }, name: 'threads', pkg: vitest },
    { files: { 'vitest.config.ts': 'export default {}' }, name: 'vitest not used', pkg: { name: 'app' } },
  ],
})
testRule(byId('nycrc-exists'), { invalid: [{ errors: ['missing'], name: 'no nyc config', pkg: nyc }], valid: [{ files: { '.nycrc.json': '{}' }, name: 'a .nycrc.json', pkg: nyc }] })
testRule(byId('nycrc-schema'), {
  invalid: [{ errors: ['missing'], files: { '.nycrc': '{}' }, name: 'no schema, added', output: '{\n  "$schema": "https://json.schemastore.org/nycrc"\n}', pkg: nyc }],
  valid: [{ files: { '.nycrc': '{}' }, name: 'nyc not used', pkg: { name: 'app' } }],
})
