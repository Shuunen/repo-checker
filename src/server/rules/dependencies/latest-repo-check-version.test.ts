import { testRule } from '../../engine/rule-tester.ts'
import { createLatestRepoCheckVersion, isStable } from './latest-repo-check-version.rule.ts'

describe('the stable version check', () => {
  it('tells a release from a prerelease', () => {
    expect.hasAssertions()
    expect(isStable('2.0.0')).toBe(true)
    expect(isStable('2.0.0-rc.1')).toBe(false)
  })
})

testRule(createLatestRepoCheckVersion('2.1.3'), {
  invalid: [
    { errors: ['outdated'], name: 'an old version in devDependencies', output: { devDependencies: { 'repo-check': '^2.1' } }, pkg: { devDependencies: { 'repo-check': '^1.0.0' } } },
    { errors: ['outdated'], name: 'an old version in dependencies', output: { dependencies: { 'repo-check': '^2.1' } }, pkg: { dependencies: { 'repo-check': '0.1' } } },
  ],
  valid: [
    { name: 'the latest version', pkg: { devDependencies: { 'repo-check': '^2.1' } } },
    { name: 'not used', pkg: { devDependencies: { vitest: '^4.0.0' } } },
    { flags: { repoId: 'repo-checker' }, name: 'repo-checker itself', pkg: { devDependencies: { 'repo-check': '^1.0.0' } } },
  ],
})

testRule(createLatestRepoCheckVersion('2.0.0-rc.1'), {
  invalid: [],
  valid: [{ name: 'a prerelease of repo-checker, nothing installable to ask for', pkg: { devDependencies: { 'repo-check': '^1.0.0' } } }],
})
