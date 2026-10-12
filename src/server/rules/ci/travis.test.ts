import { testRule } from '../../engine/rule-tester.ts'
import { travisRules } from './travis.rule.ts'

const good = { '.travis.yml': 'language: node_js\ninstall: npm ci\nscript: npm run ci\n' }

describe('travis rules', () => {
  it('has the three travis checks', () => {
    expect.hasAssertions()
    expect(travisRules.map(rule => rule.meta.id)).toStrictEqual(['travis-language', 'travis-install-task', 'travis-ci-task'])
  })
})

for (const rule of travisRules) testRule(rule, { invalid: [{ errors: ['missing'], files: { '.travis.yml': 'os: linux\n' }, name: 'an empty travis config' }], valid: [{ files: good, name: 'a complete travis config' }, { name: 'no travis config' }] })
