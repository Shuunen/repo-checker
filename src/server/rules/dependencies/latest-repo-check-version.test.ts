import { expect, it } from 'vitest'
import packageJson from '../../../../package.json' with { type: 'json' }
import { testRule } from '../../engine/rule-tester.ts'
import { isStable, latestRepoCheckVersion } from './latest-repo-check-version.rule.ts'

const [major, minor] = packageJson.version.split('.')
const latest = `^${major}.${minor}`
// while repo-checker is a prerelease, the rule stays silent: ^2.0 would match nothing on npm
const isReleased = isStable(packageJson.version)

it('isStable tells a release from a prerelease', () => {
  expect(isStable('2.0.0')).toBe(true)
  expect(isStable('2.0.0-rc.1')).toBe(false)
})

testRule(latestRepoCheckVersion, {
  invalid: isReleased
    ? [
        { errors: ['outdated'], name: 'an old version in devDependencies', output: { devDependencies: { 'repo-check': latest } }, pkg: { devDependencies: { 'repo-check': '^1.0.0' } } },
        { errors: ['outdated'], name: 'an old version in dependencies', output: { dependencies: { 'repo-check': latest } }, pkg: { dependencies: { 'repo-check': '0.1' } } },
      ]
    : [],
  valid: [
    { name: 'the latest version', pkg: { devDependencies: { 'repo-check': latest } } },
    { name: 'not used', pkg: { devDependencies: { vitest: '^4.0.0' } } },
    { flags: { repoId: 'repo-checker' }, name: 'repo-checker itself', pkg: { devDependencies: { 'repo-check': '^1.0.0' } } },
    ...(isReleased ? [] : [{ name: 'a prerelease of repo-checker, nothing installable to ask for', pkg: { devDependencies: { 'repo-check': '^1.0.0' } } }]),
  ],
})
