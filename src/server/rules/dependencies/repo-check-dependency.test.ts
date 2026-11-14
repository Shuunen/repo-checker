import { testRule } from '../../test/rule-tester.ts'
import { createRepoCheckDependency } from './repo-check-dependency.rule.ts'

testRule(createRepoCheckDependency('2.1.3'), {
  invalid: [{ errors: ['missing'], installs: ['repo-check'], name: 'a package.json without repo-check', output: { devDependencies: { 'repo-check': '^2.1', vitest: '^4.0.0' } }, pkg: { devDependencies: { vitest: '^4.0.0' } }, remaining: 0 }],
  valid: [
    { name: 'repo-check in devDependencies', pkg: { devDependencies: { 'repo-check': '^1.0' } } },
    { name: 'repo-check in dependencies', pkg: { dependencies: { 'repo-check': '^1.0' } } },
    { name: 'no package.json' },
    { flags: { repoId: 'repo-checker' }, name: 'repo-checker itself', pkg: { name: 'repo-check' } },
  ],
})

testRule(createRepoCheckDependency('2.0.0'), {
  invalid: [{ errors: ['missing'], flags: { repoCheckVersion: '2.0.0-rc.1' }, installs: ['repo-check'], name: 'the own version is not published, npm only has the rc', output: { devDependencies: { 'repo-check': '^2.0.0-rc.1' } }, pkg: { devDependencies: {} }, remaining: 0 }],
  valid: [],
})

testRule(createRepoCheckDependency('2.0.0-rc.1'), {
  invalid: [{ errors: ['missing'], installs: ['repo-check'], name: 'a prerelease is asked for as it is, ^2.0 would not match it', output: { devDependencies: { 'repo-check': '^2.0.0-rc.1', vitest: '^4.0.0' } }, pkg: { devDependencies: { vitest: '^4.0.0' } }, remaining: 0 }],
  valid: [],
})
