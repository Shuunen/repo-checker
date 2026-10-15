import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import type { Fixer } from '../../engine/fixer.ts'
import { hasDependency, scriptsMatching } from '../../engine/package-json.ts'

/**
 * Tell if the package.json has a dependency section, the old tool only looked at testing tools then
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when the testing rules apply
 */
function hasDependencies({ pkg }: Readonly<Context>) {
  return pkg?.dependencies !== undefined || pkg?.devDependencies !== undefined
}

/** The vitest config files, the first one that exists is the config of the project */
const vitestConfigFiles = ['vitest.config.mts', 'vitest.config.ts', 'vitest.config.mjs', 'vitest.config.js']

/** The vite config files, a vitest config merges with them so the plugins of the project still apply */
const viteConfigFiles = ['vite.config.mts', 'vite.config.ts', 'vite.config.mjs', 'vite.config.js']

/**
 * Get the test script that runs vitest: a missing script or a placeholder `echo` becomes the vitest one, a vitest script gets the coverage flag when asked, anything else is left as it is
 * @param current the current script, undefined when absent
 * @param hasCoverage true when the script must collect the coverage
 * @returns the new script
 */
function toTestScript(current: unknown, hasCoverage: boolean) {
  const script = typeof current === 'string' ? current : undefined
  if (script === undefined || script.startsWith('echo ')) return `vitest --run${hasCoverage ? ' --coverage' : ''} && echo test success`
  return hasCoverage && /\bvitest\b/u.test(script) && !script.includes('--coverage') ? script.replace(/\bvitest\b/u, 'vitest --coverage') : script
}

/**
 * The text of a new vitest config with the pool and the 100% coverage threshold, merged with the vite config of the project when it has one so its plugins still apply
 * @param viteConfig the vite config file of the project, undefined when it has none
 * @returns the text
 */
function newVitestConfig(viteConfig: string | undefined) {
  const test = "test: {\n    coverage: { thresholds: { 100: true } },\n    pool: 'threads',\n  }"
  if (viteConfig === undefined) return `import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  ${test},\n})\n`
  return `import { defineConfig, mergeConfig } from 'vitest/config'\nimport viteConfig from './${viteConfig}'\n\nexport default mergeConfig(\n  viteConfig,\n  defineConfig({\n    ${test.replaceAll('\n', '\n  ')},\n  }),\n)\n`
}

/**
 * Tell if the project already runs its tests with another tool than vitest, then vitest is not forced on it
 * @param pkg the package.json
 * @returns true for mocha, uvu or bun test
 */
function usesOtherTestTool(pkg: Context['pkg']) {
  return ['mocha', 'uvu'].some(name => hasDependency(pkg, name)) || scriptsMatching(pkg, /\bbun test\b/u).length > 0
}

export const unitTestingDependency = defineRule({
  appliesTo: hasDependencies,
  check({ pkg, report }) {
    const hasTool = ['mocha', 'uvu', 'vitest'].some(name => hasDependency(pkg, name)) || scriptsMatching(pkg, /\bbun test\b/u).length > 0
    if (!hasTool) report({ fix: fixer => fixer.json('package.json').update(['scripts', 'test'], current => toTestScript(current, false)), installs: ['vitest'], messageId: 'missing' })
  },
  meta: { fixable: true, id: 'unit-testing-dependency', messages: { missing: 'no unit testing tool, use vitest, mocha, uvu or bun test' }, severity: 'warning' },
})

export const coverageDependency = defineRule({
  appliesTo: hasDependencies,
  async check({ files, pkg, report }) {
    const hasTool = ['@vitest/coverage-c8', '@vitest/coverage-v8', 'c8', 'nyc'].some(name => hasDependency(pkg, name)) || scriptsMatching(pkg, /\bbun test --coverage\b/u).length > 0
    if (hasTool) return
    if (usesOtherTestTool(pkg)) {
      report({ messageId: 'missing' })
      return
    }
    const [configs, vites] = await Promise.all([Promise.all(vitestConfigFiles.map(file => files.readText(file))), Promise.all(viteConfigFiles.map(file => files.readText(file)))])
    const config = vitestConfigFiles.find((_file, index) => configs[index] !== undefined)
    const viteConfig = viteConfigFiles.find((_file, index) => vites[index] !== undefined)
    const configEdit = (fixer: Fixer) =>
      config === undefined
        ? fixer.text('vitest.config.ts', () => newVitestConfig(viteConfig))
        : fixer.config(config, options => {
            options.test ??= {}
            options.test.coverage = { thresholds: { 100: true } }
          })
    report({ fix: fixer => [fixer.json('package.json').update(['scripts', 'test'], current => toTestScript(current, true)), configEdit(fixer)], installs: hasDependency(pkg, 'vitest') ? ['@vitest/coverage-v8'] : ['@vitest/coverage-v8', 'vitest'], messageId: 'missing' })
  },
  meta: { fixable: true, id: 'coverage-dependency', messages: { missing: 'no coverage tool, use @vitest/coverage-v8, c8, nyc or bun test --coverage' }, severity: 'warning' },
})

export const uvuAssert = defineRule({
  appliesTo: ({ pkg }) => hasDependency(pkg, 'uvu'),
  async check({ files, report }) {
    for (const file of await files.search(/from 'assert'/u, 'tests')) report({ data: { file }, messageId: 'found' })
  },
  meta: { id: 'uvu-assert', messages: { found: "{{file}} imports from assert, use import { equal } from 'uvu/assert' instead" }, severity: 'error' },
})
