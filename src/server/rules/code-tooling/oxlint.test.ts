import { testRule } from '../../test/rule-tester.ts'
import { lintToolchain, oxlintCategories, oxlintConfigExists, oxlintHouseRules, oxlintPlugins, oxlintPluginsStack, oxlintSchema, oxlintTestOverride, oxlintTypeAware } from './oxlint.rule.ts'

const pkg = { devDependencies: { oxlint: '1.0.0' } }
const typed = { devDependencies: { oxlint: '1.0.0', typescript: '7.0.0' } }
const schema = './node_modules/oxlint/configuration_schema.json'
const json = (value: unknown) => ({ '.oxlintrc.json': `${JSON.stringify(value, undefined, 2)}\n` })
const text = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`
const categories = { correctness: 'error', nursery: 'warn', pedantic: 'warn', perf: 'warn', restriction: 'warn', style: 'warn', suspicious: 'warn' }
const plugins = ['import', 'jsdoc', 'oxc', 'typescript', 'unicorn']
const testOverride = { files: ['**/*.test.{js,ts,tsx}'], rules: { 'max-lines': 'off', 'max-statements': 'off', 'no-magic-numbers': 'off' } }

testRule(oxlintConfigExists, {
  invalid: [
    { errors: ['missing'], name: 'oxlint without config', output: text({ $schema: schema, categories, plugins }), pkg },
    { errors: ['missing'], name: 'oxlint with typescript without config', output: text({ $schema: schema, categories, options: { typeAware: true, typeCheck: true }, plugins }), pkg: typed },
  ],
  valid: [{ files: { '.oxlintrc.jsonc': '{}' }, name: 'an .oxlintrc.jsonc', pkg }, { name: 'oxlint not used' }],
})

testRule(oxlintSchema, {
  invalid: [{ errors: ['missing'], files: json({ plugins }), name: 'no schema', output: text({ $schema: schema, plugins }), pkg }],
  valid: [{ files: json({ $schema: schema }), name: 'the schema', pkg }],
})

testRule(oxlintCategories, {
  invalid: [{ errors: ['wrong', 'wrong'], files: json({ categories: { ...categories, correctness: 'warn', style: 'off' } }), name: 'two wrong categories', output: text({ categories }), pkg }],
  valid: [
    { files: json({ categories }), name: 'the categories', pkg },
    { files: json({}), name: 'oxlint not used' },
  ],
})

const houseRules = { curly: ['error', 'multi'], 'func-style': ['error', 'declaration', { allowArrowFunctions: true }], 'no-default-export': 'error', 'unicorn/filename-case': ['error', { case: 'kebabCase' }] }

testRule(oxlintHouseRules, {
  invalid: [{ errors: ['wrong', 'wrong', 'wrong', 'wrong'], files: json({}), name: 'nothing set', output: text({ rules: houseRules }), pkg }],
  valid: [
    { files: json({ rules: houseRules }), name: 'the house rules', pkg },
    { files: json({ rules: { ...houseRules, 'func-style': ['error', 'declaration'] } }), name: 'other func-style options', pkg },
    { files: json({ rules: { ...houseRules, 'no-default-export': ['error'] } }), name: 'no-default-export with options', pkg },
  ],
})

testRule(oxlintPlugins, {
  invalid: [
    { errors: ['missing'], files: { '.oxlintrc.json': '' }, name: 'an empty config', output: text({ plugins }).trimEnd(), pkg },
    { errors: ['missing'], files: json({}), name: 'no plugins key', output: text({ plugins }), pkg },
    { errors: ['missing'], files: json({ plugins: ['react', 'oxc'] }), name: 'missing plugins are added', output: text({ plugins: ['import', 'jsdoc', 'oxc', 'react', 'typescript', 'unicorn'] }), pkg },
  ],
  valid: [
    { files: json({ plugins }), name: 'the plugins', pkg },
    { files: json({ plugins: [...plugins, 'vitest'] }), name: 'more plugins', pkg },
    { files: json({}), name: 'oxlint not used' },
    { name: 'no config', pkg },
  ],
})

testRule(oxlintPluginsStack, {
  invalid: [
    { errors: ['missing'], files: json({ plugins }), name: 'no promise plugin', output: text({ plugins: [...plugins, 'promise'].toSorted() }), pkg },
    {
      errors: ['missing'],
      files: json({ plugins: [...plugins, 'promise'] }),
      name: 'vitest and react plugins',
      output: text({ plugins: [...plugins, 'promise', 'react', 'vitest'].toSorted() }),
      pkg: { devDependencies: { oxlint: '1.0.0', react: '20.0.0', vitest: '5.0.0' } },
    },
  ],
  valid: [
    { files: json({ plugins: [...plugins, 'promise'] }), name: 'promise alone is enough without vitest and react', pkg },
    { files: json({ overrides: [{ files: ['*.test.ts'], plugins: ['vitest'] }, { files: ['*.ts'] }], plugins: [...plugins, 'promise'] }), name: 'vitest enabled by an override for the tests', pkg: { devDependencies: { oxlint: '1.0.0', vitest: '5.0.0' } } },
    { files: json({}), name: 'oxlint not used' },
    { name: 'no config', pkg },
  ],
})

testRule(oxlintTestOverride, {
  invalid: [
    { errors: ['missing'], files: json({}), name: 'no override', output: text({ overrides: [testOverride] }), pkg },
    { errors: ['missing'], files: json({ overrides: [{ files: ['src/**'], rules: {} }] }), name: 'an override for other files', output: text({ overrides: [{ files: ['src/**'], rules: {} }, testOverride] }), pkg },
  ],
  valid: [
    { files: json({ overrides: [{ files: ['*.test.ts'], rules: { 'no-magic-numbers': 'off' } }] }), name: 'a test override', pkg },
    { files: json({ overrides: [{ files: ['*.test.ts'], rules: { 'no-magic-numbers': ['off'] } }] }), name: 'a test override with options', pkg },
    { name: 'no config', pkg },
    { files: json({}), name: 'oxlint not used' },
  ],
})

testRule(oxlintTypeAware, {
  invalid: [{ errors: ['wrong', 'wrong'], files: json({}), name: 'typescript without type aware options', output: text({ options: { typeAware: true, typeCheck: true } }), pkg: typed }],
  valid: [
    { files: json({ options: { typeAware: true, typeCheck: true } }), name: 'type aware', pkg: typed },
    { files: json({}), name: 'no typescript', pkg },
  ],
})

testRule(lintToolchain, {
  invalid: [
    { errors: ['missing'], installs: ['oxfmt', 'oxlint-tsgolint'], name: 'oxlint with typescript alone', pkg: typed },
    { errors: ['missing'], installs: ['oxfmt'], name: 'no oxfmt', pkg },
    { errors: ['missing'], installs: ['oxlint-tsgolint'], name: 'typescript alone', pkg: { devDependencies: { typescript: '7.0.0' } } },
    { errors: ['missing'], installs: ['oxlint-tsgolint'], name: 'typescript without oxlint-tsgolint', pkg: { devDependencies: { oxfmt: '1.0.0', oxlint: '1.0.0', typescript: '7.0.0' } } },
  ],
  valid: [{ name: 'the whole toolchain', pkg: { devDependencies: { oxfmt: '1.0.0', oxlint: '1.0.0', 'oxlint-tsgolint': '1.0.0', typescript: '7.0.0' } } }, { name: 'nothing used' }],
})
