import packageJson from '../../../../package.json' with { type: 'json' }
import { testRule } from '../../engine/rule-tester.ts'
import { latestRepoCheckVersion } from './latest-repo-check-version.rule.ts'

const [major, minor] = packageJson.version.split('.')
const latest = `^${major}.${minor}`

testRule(latestRepoCheckVersion, {
  invalid: [
    { errors: ['outdated'], name: 'an old version in devDependencies', output: { devDependencies: { 'repo-check': latest } }, pkg: { devDependencies: { 'repo-check': '^1.0.0' } } },
    { errors: ['outdated'], name: 'an old version in dependencies', output: { dependencies: { 'repo-check': latest } }, pkg: { dependencies: { 'repo-check': '0.1' } } },
  ],
  valid: [
    { name: 'the latest version', pkg: { devDependencies: { 'repo-check': latest } } },
    { name: 'not used', pkg: { devDependencies: { vitest: '^4.0.0' } } },
    { flags: { repoId: 'repo-checker' }, name: 'repo-checker itself', pkg: { devDependencies: { 'repo-check': '^1.0.0' } } },
  ],
})
