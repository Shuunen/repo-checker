import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { forbiddenDependencyRules } from './forbidden.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = forbiddenDependencyRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

testRule(byId('no-fat-color-dependency'), {
  invalid: [
    { errors: ['found'], name: 'in dependencies', pkg: { dependencies: { chalk: '5.0.0' } } },
    { errors: ['found', 'found'], name: 'two of them in devDependencies', pkg: { devDependencies: { colorette: '2.0.0', colors: '1.4.0' } } },
  ],
  valid: [{ name: 'other dependencies', pkg: { dependencies: { shuutils: '11.0.0' } } }, { name: 'no package.json' }],
})

testRule(byId('no-sass-dependency'), {
  invalid: [{ errors: ['found'], name: 'sass, avoided by default', pkg: { devDependencies: { sass: '1.0.0' } } }],
  valid: [{ files: { '.repo-checker.json': '{ "shouldAvoidSass": false }' }, name: 'sass allowed by .repo-checker.json', pkg: { devDependencies: { sass: '1.0.0' } } }],
})

// biome-ignore format: one case per line
const tableCases = [
  ['esbuild-plugin-run-alternative', 'esbuild-plugin-run'],
  ['no-cross-var-dependency', 'cross-var'],
  ['no-fs-extra-dependency', 'fs-extra'],
  ['no-jsdom-dependency', 'jsdom'],
  ['no-npm-run-all-dependency', 'npm-run-all'],
  ['no-shuunen-stack-dependency', 'shuunen-stack'],
  ['no-tslint-dependency', 'tslint'],
] as const

describe('forbidden dependency table', () => {
  it('has a case for every rule', () => {
    expect.hasAssertions()
    expect(tableCases.length + ['no-fat-color-dependency', 'no-sass-dependency'].length).toBe(forbiddenDependencyRules.length)
  })
})

for (const [id, dependency] of tableCases) testRule(byId(id), { invalid: [{ errors: ['found'], name: dependency, pkg: { devDependencies: { [dependency]: '1.0.0' } } }], valid: [{ name: 'without it', pkg: { devDependencies: { vitest: '4.0.0' } } }] })
