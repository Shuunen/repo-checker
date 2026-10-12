import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
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

export const unitTestingDependency = defineRule({
  appliesTo: hasDependencies,
  check({ pkg, report }) {
    const hasTool = ['mocha', 'uvu', 'vitest'].some(name => hasDependency(pkg, name)) || scriptsMatching(pkg, /\bbun test\b/u).length > 0
    if (!hasTool) report({ messageId: 'missing' })
  },
  meta: { id: 'unit-testing-dependency', messages: { missing: 'no unit testing tool, use vitest, mocha, uvu or bun test' }, severity: 'warning' },
})

export const coverageDependency = defineRule({
  appliesTo: hasDependencies,
  check({ pkg, report }) {
    const hasTool = ['@vitest/coverage-c8', '@vitest/coverage-v8', 'c8', 'nyc'].some(name => hasDependency(pkg, name)) || scriptsMatching(pkg, /\bbun test --coverage\b/u).length > 0
    if (!hasTool) report({ messageId: 'missing' })
  },
  meta: { id: 'coverage-dependency', messages: { missing: 'no coverage tool, use @vitest/coverage-v8, c8, nyc or bun test --coverage' }, severity: 'warning' },
})

export const uvuAssert = defineRule({
  appliesTo: ({ pkg }) => hasDependency(pkg, 'uvu'),
  async check({ files, report }) {
    for (const file of await files.search(/from 'assert'/u, 'tests')) report({ data: { file }, messageId: 'found' })
  },
  meta: { id: 'uvu-assert', messages: { found: "{{file}} imports from assert, use import { equal } from 'uvu/assert' instead" }, severity: 'error' },
})
