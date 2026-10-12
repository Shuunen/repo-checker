import { testRule } from '../../engine/rule-tester.ts'
import { forbiddenDependencyRules } from './forbidden.rule.ts'

const [noCrossVar] = forbiddenDependencyRules

if (noCrossVar === undefined) throw new Error('forbidden dependency rules are missing')

// the factory is tested once, through the first rule of the table
testRule(noCrossVar, {
  invalid: [
    { errors: ['found'], name: 'in dependencies', pkg: { dependencies: { 'cross-var': '1.0.0' } } },
    { errors: ['found'], name: 'in devDependencies', pkg: { devDependencies: { 'cross-var': '1.0.0' } } },
  ],
  valid: [
    { name: 'other dependencies', pkg: { dependencies: { 'cross-env': '7.0.0' } } },
    { name: 'no dependencies', pkg: { name: 'foo' } },
  ],
})

describe('forbidden dependency table', () => {
  it.each(forbiddenDependencyRules)('$meta.id says which dependency and why', rule => {
    expect.hasAssertions()
    expect(rule.meta.messages.found).toContain('{{name}}')
  })
})
