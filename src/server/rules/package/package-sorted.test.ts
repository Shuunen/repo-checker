import type { PackageJson } from '../../engine/package-json.ts'
import { testRule } from '../../test/rule-tester.ts'
import { packageDependenciesSorted, packageKeysSorted, packageScriptsSorted } from './package-sorted.rule.ts'

/**
 * Build an object with its keys in the given order, the way a test needs an unsorted package.json
 * @param entries the keys with their values
 * @returns the object
 */
function unsorted(...entries: readonly (readonly [string, unknown])[]) {
  return Object.fromEntries(entries) as PackageJson
}

const exportsOfApp = unsorted(['.', unsorted(['types', './index.d.ts'], ['import', './index.js'])]) as unknown as Record<string, { import: string; types: string }>

testRule(packageKeysSorted, {
  invalid: [
    { errors: ['unsorted'], name: 'version before name', output: { name: 'app', version: '1.0.0' }, pkg: unsorted(['version', '1.0.0'], ['name', 'app']) },
    { errors: ['unsorted'], name: '$schema goes first', output: { $schema: 'x', name: 'app' }, pkg: unsorted(['name', 'app'], ['$schema', 'x']) },
    {
      errors: ['unsorted'],
      name: 'the conditions of the exports keep their order, types must stay before import',
      output: unsorted(['exports', exportsOfApp], ['name', 'app'], ['version', '1.0.0']),
      pkg: unsorted(['version', '1.0.0'], ['exports', exportsOfApp], ['name', 'app']),
    },
  ],
  valid: [{ name: 'sorted', pkg: { $schema: 'x', name: 'app', version: '1.0.0' } }, { name: 'no package.json' }],
})

testRule(packageScriptsSorted, {
  invalid: [{ errors: ['unsorted'], name: 'test before build', output: { scripts: { build: 'tsc', test: 'vitest' } }, pkg: { scripts: unsorted(['test', 'vitest'], ['build', 'tsc']) as Record<string, string> } }],
  valid: [
    { name: 'sorted', pkg: { scripts: { build: 'tsc', test: 'vitest' } } },
    { name: 'no scripts', pkg: { name: 'app' } },
  ],
})

/**
 * Build dependencies in the given order
 * @param names the dependency names
 * @returns the dependencies, all at version 1
 */
function deps(...names: readonly string[]) {
  return unsorted(...names.map(name => [name, '1'] as const)) as Record<string, string>
}

testRule(packageDependenciesSorted, {
  invalid: [
    { errors: ['unsorted'], name: 'dependencies', output: { dependencies: deps('alpha', 'beta') }, pkg: { dependencies: deps('beta', 'alpha') } },
    { errors: ['unsorted', 'unsorted'], name: 'dependencies and devDependencies', output: { dependencies: deps('alpha', 'beta'), devDependencies: deps('delta', 'gamma') }, pkg: { dependencies: deps('beta', 'alpha'), devDependencies: deps('gamma', 'delta') } },
    { errors: ['unsorted'], name: 'peerDependencies', output: { peerDependencies: deps('alpha', 'beta') }, pkg: { peerDependencies: deps('beta', 'alpha') } },
  ],
  valid: [
    { name: 'sorted', pkg: { dependencies: deps('alpha', 'beta'), devDependencies: deps('gamma') } },
    { name: 'no dependencies', pkg: { name: 'app' } },
  ],
})
