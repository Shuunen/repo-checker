import { testRule } from '../../engine/rule-tester.ts'
import { outdatedPackageManager } from './package-manager.rule.ts'

const registry = (name: string, latest: string) => ({ registry: { packages: { [name]: { latest } } } })

testRule(outdatedPackageManager, {
  invalid: [
    { errors: ['behind'], flags: registry('pnpm', '12.10.0'), name: 'pnpm behind, the hash goes away with the old version', output: { packageManager: 'pnpm@12.10.0' }, pkg: { packageManager: 'pnpm@12.9.1+sha512.abc' } },
    { errors: ['behind'], flags: registry('bun', '1.5.0'), name: 'bun behind', output: { packageManager: 'bun@1.5.0' }, pkg: { packageManager: 'bun@1.4.2' } },
  ],
  valid: [
    { flags: registry('pnpm', '12.9.1'), name: 'up to date', pkg: { packageManager: 'pnpm@12.9.1' } },
    { flags: registry('npm', '11.0.0'), name: 'the latest version of another package manager', pkg: { packageManager: 'pnpm@12.9.1' } },
    { name: 'the registry could not be reached', pkg: { packageManager: 'pnpm@12.9.1' } },
    { flags: registry('pnpm', '12.10.0'), name: 'no package manager', pkg: { name: 'foo' } },
    { flags: registry('yarn', '4.1.0'), name: 'a package manager the registry cannot tell the latest of', pkg: { packageManager: 'yarn@4.0.0' } },
  ],
})
