import { parse } from 'jsonc-parser'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { requireFile, requireJsonSchema, requireJsonValues } from '../../engine/file-rules.ts'
import { hasDependency } from '../../engine/package-json.ts'

const files = ['.oxlintrc.json', '.oxlintrc.jsonc']
const schema = './node_modules/oxlint/configuration_schema.json'
const indent = 2
const requiredPlugins = ['import', 'jsdoc', 'oxc', 'typescript', 'unicorn']
const warnCategories = ['nursery', 'pedantic', 'perf', 'restriction', 'style', 'suspicious']

const baseConfig = { $schema: schema, categories: { correctness: 'error', ...Object.fromEntries(warnCategories.map(category => [category, 'warn'])) }, plugins: requiredPlugins }

/**
 * Build the oxlint config to create, type aware for a TypeScript project
 * @param context the project context
 * @returns the config text
 */
function oxlintConfigContent(context: Readonly<Context>) {
  const config = hasDependency(context.pkg, 'typescript') ? { ...baseConfig, options: { typeAware: true, typeCheck: true } } : baseConfig
  return `${JSON.stringify(config, undefined, indent)}
`
}

/**
 * Tell if the project uses oxlint
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it depends on oxlint
 */
function usesOxlint({ pkg }: Readonly<Context>) {
  return hasDependency(pkg, 'oxlint')
}

/**
 * Tell if the project uses TypeScript
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it depends on typescript
 */
function usesTypescript({ pkg }: Readonly<Context>) {
  return hasDependency(pkg, 'typescript')
}

/**
 * Read the oxlint config of the project
 * @param context the project context
 * @param context.files the project files reader
 * @returns the file and its parsed config, undefined when there is none
 */
async function readOxlintConfig({ files: reader }: Readonly<Context>) {
  const texts = await Promise.all(files.map(file => reader.readText(file)))
  const index = texts.findIndex(text => text !== undefined)
  return index === -1 ? undefined : { config: (parse(String(texts[index])) ?? {}) as Record<string, unknown>, file: String(files[index]) }
}

/**
 * Tell if a rule is turned off, alone or followed by options
 * @param setting the value in the config, like `'off'`
 * @returns true when it is off
 */
function isOff(setting: unknown) {
  return (Array.isArray(setting) ? setting[0] : setting) === 'off'
}

/**
 * Tell if a rule is set with the error severity and a first option
 * @param setting the value in the config, like `['error', 'multi']`
 * @param option the expected first option, undefined to only check the severity
 * @returns true when the setting has the error severity and the option
 */
function isErrorWith(setting: unknown, option?: string) {
  return Array.isArray(setting) && setting[0] === 'error' && (option === undefined || setting[1] === option)
}

export const oxlintConfigExists = requireFile({ content: oxlintConfigContent, files, id: 'oxlint-config-exists', message: 'no oxlint config, like {{file}}', severity: 'error', when: usesOxlint })

export const oxlintSchema = requireJsonSchema({ files, id: 'oxlint-schema', schema, severity: 'warning', when: usesOxlint })

export const oxlintCategories = requireJsonValues({
  files,
  id: 'oxlint-categories',
  severity: 'warning',
  values: [{ expected: 'error', path: ['categories', 'correctness'] }, ...warnCategories.map(category => ({ expected: 'warn', path: ['categories', category] }))],
  when: usesOxlint,
})

export const oxlintHouseRules = requireJsonValues({
  files,
  id: 'oxlint-house-rules',
  severity: 'warning',
  values: [
    { expected: ['error', 'multi'], isValid: setting => isErrorWith(setting, 'multi'), path: ['rules', 'curly'] },
    { expected: ['error', 'declaration', { allowArrowFunctions: true }], isValid: setting => isErrorWith(setting, 'declaration'), path: ['rules', 'func-style'] },
    { expected: 'error', isValid: setting => (Array.isArray(setting) ? setting[0] : setting) === 'error', path: ['rules', 'no-default-export'] },
    { expected: ['error', { case: 'kebabCase' }], isValid: setting => isErrorWith(setting), path: ['rules', 'unicorn/filename-case'] },
  ],
  when: usesOxlint,
})

/**
 * Build a rule that asks for oxlint plugins
 * @param options the rule options
 * @param options.id the check id
 * @param options.severity the severity
 * @param options.wanted the plugins the project should enable
 * @param options.countOverrides true when a plugin enabled by an override, like vitest for the tests only, is enough
 * @returns the rule
 */
function pluginsRule({ countOverrides = false, id, severity, wanted }: Readonly<{ countOverrides?: boolean; id: string; severity: 'info' | 'warning'; wanted: (context: Readonly<Context>) => string[] }>) {
  return defineRule({
    appliesTo: usesOxlint,
    async check(context) {
      const found = await readOxlintConfig(context)
      if (found === undefined) return
      const overrides = countOverrides && Array.isArray(found.config.overrides) ? (found.config.overrides as { plugins?: unknown }[]) : []
      const declared = new Set([found.config.plugins, ...overrides.map(override => override.plugins)].flatMap(list => (Array.isArray(list) ? (list as unknown[]) : [])))
      const missing = wanted(context).filter(plugin => !declared.has(plugin))
      if (missing.length === 0) return
      context.report({
        data: { file: found.file, plugins: missing.join(', ') },
        fix: fixer => fixer.json(found.file).update(['plugins'], (current: unknown) => [...(Array.isArray(current) ? (current as string[]) : []), ...missing].toSorted((first, second) => first.localeCompare(second))),
        messageId: 'missing',
      })
    },
    meta: { fixable: true, id, messages: { missing: '{{file}} should enable the plugins {{plugins}}' }, severity },
  })
}

export const oxlintPlugins = pluginsRule({ id: 'oxlint-plugins', severity: 'warning', wanted: () => requiredPlugins })

export const oxlintPluginsStack = pluginsRule({
  countOverrides: true,
  id: 'oxlint-plugins-stack',
  severity: 'info',
  wanted: ({ pkg }) => ['promise', ...(hasDependency(pkg, 'vitest') ? ['vitest'] : []), ...(hasDependency(pkg, 'react') ? ['react'] : [])],
})

export const oxlintTestOverride = defineRule({
  appliesTo: usesOxlint,
  async check(context) {
    const found = await readOxlintConfig(context)
    if (found === undefined) return
    const overrides = Array.isArray(found.config.overrides) ? (found.config.overrides as { files?: unknown; rules?: Record<string, unknown> }[]) : []
    const hasTestOverride = overrides.some(override => Array.isArray(override.files) && override.files.some(glob => typeof glob === 'string' && glob.includes('.test.')) && isOff(override.rules?.['no-magic-numbers']))
    if (hasTestOverride) return
    const testOverride = { files: ['**/*.test.{js,ts,tsx}'], rules: { 'max-lines': 'off', 'max-statements': 'off', 'no-magic-numbers': 'off' } }
    context.report({ data: { file: found.file }, fix: fixer => fixer.json(found.file).update(['overrides'], (current: unknown) => [...(Array.isArray(current) ? (current as unknown[]) : []), testOverride]), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'oxlint-test-override', messages: { missing: '{{file}} has no override for the test files that turns off no-magic-numbers, max-lines and max-statements' }, severity: 'warning' },
})

export const oxlintTypeAware = requireJsonValues({
  files,
  id: 'oxlint-type-aware',
  severity: 'warning',
  values: [
    { expected: true, path: ['options', 'typeAware'] },
    { expected: true, path: ['options', 'typeCheck'] },
  ],
  when: context => usesOxlint(context) && usesTypescript(context),
})

export const lintToolchain = defineRule({
  appliesTo: context => usesOxlint(context) || usesTypescript(context),
  check(context) {
    const { pkg, report } = context
    const missing = [...(usesOxlint(context) ? ['oxfmt'] : []), ...(usesTypescript(context) ? ['oxlint-tsgolint'] : [])].filter(name => !hasDependency(pkg, name))
    if (missing.length > 0) report({ data: { missing: missing.join(', ') }, fix: () => [], installs: missing, messageId: 'missing' })
  },
  meta: { fixable: true, id: 'lint-toolchain', messages: { missing: 'the lint toolchain needs {{missing}}: oxfmt with oxlint, oxlint-tsgolint with typescript' }, severity: 'warning' },
})
