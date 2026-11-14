import { testRule } from '../../test/rule-tester.ts'
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

testRule(createLatestRepoCheckVersion('2.0.0'), {
  invalid: [
    { errors: ['outdated'], flags: { repoCheckVersion: '2.0.0-rc.1' }, name: 'the own version is not published yet, npm only has the rc', output: { devDependencies: { 'repo-check': '^2.0.0-rc.1' } }, pkg: { devDependencies: { 'repo-check': '^1.46' } } },
    { errors: ['outdated'], name: 'npm could not be read, the own version is used', output: { devDependencies: { 'repo-check': '^2.0' } }, pkg: { devDependencies: { 'repo-check': '^1.46' } } },
  ],
  valid: [{ flags: { repoCheckVersion: '2.0.0-rc.1' }, name: 'already on the published rc', pkg: { devDependencies: { 'repo-check': '^2.0.0-rc.1' } } }],
})

testRule(createLatestRepoCheckVersion('2.0.0-rc.1'), {
  invalid: [
    { errors: ['outdated'], name: 'a stable range while repo-checker is a prerelease', output: { devDependencies: { 'repo-check': '^2.0.0-rc.1' } }, pkg: { devDependencies: { 'repo-check': '^1.0.0' } } },
    { errors: ['outdated'], name: 'an older prerelease', output: { devDependencies: { 'repo-check': '^2.0.0-rc.1' } }, pkg: { devDependencies: { 'repo-check': '^2.0.0-rc.0' } } },
    { errors: ['outdated'], name: 'a longer prerelease number', output: { devDependencies: { 'repo-check': '^2.0.0-rc.1' } }, pkg: { devDependencies: { 'repo-check': '^2.0.0-rc.10' } } },
  ],
  valid: [{ name: 'the same prerelease', pkg: { devDependencies: { 'repo-check': '^2.0.0-rc.1' } } }],
})
