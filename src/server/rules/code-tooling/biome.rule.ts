import { invariant } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { requireFile, requireJsonSchema, requireJsonValues } from '../../engine/file-rules.ts'
import { hasDependency } from '../../engine/package-json.ts'

const files = ['biome.json', 'biome.jsonc']
const minLineWidth = 80

/**
 * Tell if the project uses Biome
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it depends on @biomejs/biome
 */
function usesBiome({ pkg }: Readonly<Context>) {
  return hasDependency(pkg, '@biomejs/biome')
}

/**
 * Read and parse the Biome config, in a rule whose appliesTo guarantees it exists
 * @param context the project context
 * @returns the file name and the parsed config
 */
async function readBiome(context: Readonly<Context>) {
  const [json, jsonc] = await Promise.all(files.map(file => context.files.readText(file)))
  const text = json ?? jsonc
  invariant(text !== undefined, 'appliesTo guarantees a Biome config')
  return { file: json === undefined ? 'biome.jsonc' : 'biome.json', value: (parse(text) as Record<string, unknown> | undefined) ?? {} }
}

/**
 * Tell if the project uses Biome and has its config
 * @param context the project context
 * @returns true when the content rules apply
 */
async function hasBiomeConfig(context: Readonly<Context>) {
  const texts = await Promise.all(files.map(file => context.files.readText(file)))
  return usesBiome(context) && texts.some(text => text !== undefined)
}

export const biomeConfigExists = requireFile({ files, id: 'biome-config-exists', message: 'no Biome config, like {{file}}', severity: 'error', when: usesBiome })

export const biomeSchema = requireJsonSchema({ files, id: 'biome-schema', schema: './node_modules/@biomejs/biome/configuration_schema.json', severity: 'warning', when: usesBiome })

export const biomeSections = defineRule({
  appliesTo: hasBiomeConfig,
  async check(context) {
    const { file, value } = await readBiome(context)
    const sections = [...['assist', 'formatter', 'javascript', 'json', 'linter', 'vcs'].map(key => ({ empty: {}, key })), { empty: [], key: 'overrides' }]
    for (const { empty, key } of sections.filter(section => value[section.key] === undefined)) context.report({ data: { file, key }, fix: fixer => fixer.json(file).set([key], empty), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'biome-sections', messages: { missing: '{{file}} has no "{{key}}" section' }, severity: 'warning' },
})

export const biomeValueRules = [
  requireJsonValues({
    files,
    id: 'biome-formatter',
    section: 'formatter',
    severity: 'warning',
    values: [
      { expected: 'space', path: ['formatter', 'indentStyle'] },
      { expected: 2, path: ['formatter', 'indentWidth'] },
      { expected: 'lf', path: ['formatter', 'lineEnding'] },
      { expected: 120, isValid: current => typeof current === 'number' && current > minLineWidth, path: ['formatter', 'lineWidth'] },
    ],
    when: usesBiome,
  }),
  requireJsonValues({
    files,
    id: 'biome-javascript-formatter',
    section: 'javascript',
    severity: 'warning',
    values: [
      { expected: 'asNeeded', path: ['javascript', 'formatter', 'arrowParentheses'] },
      { expected: true, path: ['javascript', 'formatter', 'bracketSpacing'] },
      { expected: 'single', path: ['javascript', 'formatter', 'quoteStyle'] },
      { expected: 'asNeeded', path: ['javascript', 'formatter', 'semicolons'] },
    ],
    when: usesBiome,
  }),
  requireJsonValues({
    files,
    id: 'biome-json-parser',
    section: 'json',
    severity: 'warning',
    values: [
      { expected: false, path: ['json', 'parser', 'allowComments'] },
      { expected: false, path: ['json', 'parser', 'allowTrailingCommas'] },
    ],
    when: usesBiome,
  }),
  requireJsonValues({
    files,
    id: 'biome-linter',
    section: 'linter',
    severity: 'warning',
    values: [
      { expected: true, path: ['linter', 'enabled'] },
      { expected: true, path: ['linter', 'rules', 'recommended'] },
      { expected: 'off', path: ['linter', 'rules', 'style', 'useBlockStatements'] },
      { expected: 'all', path: ['linter', 'domains', 'project'] },
      { expected: 'all', path: ['linter', 'domains', 'react'], when: ({ pkg }) => hasDependency(pkg, 'react') },
      { expected: 'all', path: ['linter', 'domains', 'test'] },
    ],
    when: usesBiome,
  }),
  requireJsonValues({ files, id: 'biome-assist', section: 'assist', severity: 'warning', values: [{ expected: 'on', path: ['assist', 'actions', 'source', 'organizeImports'] }], when: usesBiome }),
  requireJsonValues({
    files,
    id: 'biome-vcs',
    section: 'vcs',
    severity: 'warning',
    values: [
      { expected: true, path: ['vcs', 'enabled'] },
      { expected: 'git', path: ['vcs', 'clientKind'] },
      { expected: true, path: ['vcs', 'useIgnoreFile'] },
    ],
    when: usesBiome,
  }),
]

/** The override that lets tests use template literals without placeholders */
const testOverride = { includes: ['**/*.test.ts'], linter: { rules: { style: { noUnusedTemplateLiteral: 'off' } } } }

export const biomeTestOverride = defineRule({
  async appliesTo(context) {
    if (!(await hasBiomeConfig(context))) return false
    const { value } = await readBiome(context)
    return Array.isArray(value.overrides)
  },
  async check(context) {
    const { file, value } = await readBiome(context)
    const overrides = value.overrides as { includes?: string[] }[]
    if (overrides.some(override => override.includes?.includes('**/*.test.ts') === true)) return
    context.report({ data: { file }, fix: fixer => fixer.json(file).update(['overrides'], current => [...(current as unknown[]), testOverride]), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'biome-test-override', messages: { missing: '{{file}} has no override for **/*.test.ts that turns noUnusedTemplateLiteral off' }, severity: 'warning' },
})
