import { testRule } from '../../engine/rule-tester.ts'
import { deprecatedDependency, outdatedDependency, securityAdvisory } from './registry.rule.ts'
import { versionDrift } from './version-drift.rule.ts'

const registry = (packages: Record<string, { deprecated?: string; latest: string }>, advisories?: Record<string, { severity: string; title: string; url: string }[]>) => ({ registry: { ...(advisories === undefined ? {} : { advisories }), packages } })

testRule(outdatedDependency, {
  invalid: [
    { errors: ['behind'], flags: registry({ knip: { latest: '6.1.0' } }), name: 'a minor update is fixed, the prefix is kept', output: { devDependencies: { knip: '~6.1.0' } }, pkg: { devDependencies: { knip: '~6.0.0' } } },
    { errors: ['behind'], flags: registry({ knip: { latest: '6.0.4' } }), name: 'a patch update in dependencies', output: { dependencies: { knip: '6.0.4' } }, pkg: { dependencies: { knip: '6.0.0' } } },
    { errors: ['behind'], flags: registry({ alpha: { latest: '2.0.0' } }), name: 'a major update is reported and left alone', pkg: { dependencies: { alpha: '^1.0.0' } } },
    { errors: ['behind', 'behind'], flags: registry({ alpha: { latest: '1.1.0' }, beta: { latest: '2.1.0' } }), name: 'two updates, one per dependency', output: { dependencies: { alpha: '~1.1.0', beta: '~2.1.0' } }, pkg: { dependencies: { alpha: '~1.0.0', beta: '~2.0.0' } } },
  ],
  valid: [
    { flags: registry({ knip: { latest: '6.0.0' } }), name: 'up to date', pkg: { devDependencies: { knip: '~6.0.0' } } },
    { flags: registry({ knip: { latest: '6.0.4' } }), name: 'a newer patch the tilde admits', pkg: { devDependencies: { knip: '~6.0.0' } } },
    { flags: registry({ knip: { latest: '6.4.0' } }), name: 'a newer minor the caret admits', pkg: { devDependencies: { knip: '^6.0.0' } } },
    { flags: registry({ knip: { latest: '5.0.0' } }), name: 'ahead of the registry', pkg: { devDependencies: { knip: '~6.0.0' } } },
    { flags: registry({}), name: 'a package the registry did not give', pkg: { devDependencies: { knip: '~6.0.0' } } },
    { name: 'the registry could not be reached', pkg: { devDependencies: { knip: '~6.0.0' } } },
    { flags: registry({ knip: { latest: '6.1.0' } }), name: 'no package.json' },
    { flags: registry({ knip: { latest: '6.1.0' } }), name: 'a version that is not a plain one', pkg: { devDependencies: { knip: 'workspace:*' } } },
  ],
})

testRule(deprecatedDependency, {
  invalid: [{ errors: ['deprecated'], flags: registry({ request: { deprecated: 'request has been deprecated, see https://github.com/request/request/issues/3142', latest: '2.88.2' } }), name: 'a deprecated package', pkg: { dependencies: { request: '~2.88.0' } } }],
  valid: [
    { flags: registry({ request: { latest: '2.88.2' } }), name: 'a package that is not deprecated', pkg: { dependencies: { request: '~2.88.0' } } },
    { name: 'no registry', pkg: { dependencies: { request: '~2.88.0' } } },
  ],
})

const advisory = { severity: 'moderate', title: 'Denial of service', url: 'https://github.com/advisories/GHSA-a' }
const worse = { severity: 'critical', title: 'Remote code execution', url: 'https://github.com/advisories/GHSA-b' }

testRule(securityAdvisory, {
  invalid: [{ errors: ['found'], flags: registry({}, { 'lodash@4.17.0': [advisory, worse] }), name: 'two advisories, the worst is shown', pkg: { dependencies: { lodash: '~4.17.0' } } }],
  valid: [
    { flags: registry({}, { 'lodash@4.17.0': [advisory] }), name: 'the advisory was for another version', pkg: { dependencies: { lodash: '~4.17.21' } } },
    { flags: registry({}, {}), name: 'no advisory', pkg: { dependencies: { lodash: '~4.17.0' } } },
    { flags: registry({}), name: 'the advisories could not be read', pkg: { dependencies: { lodash: '~4.17.0' } } },
    { name: 'no registry', pkg: { dependencies: { lodash: '~4.17.0' } } },
  ],
})

testRule(versionDrift, {
  invalid: [
    { errors: ['behind'], flags: { drift: { knip: { common: '6.0.0', projects: 9 } } }, name: 'behind most of the other projects', output: { devDependencies: { knip: '~6.0.0' } }, pkg: { devDependencies: { knip: '~5.0.0' } } },
    { errors: ['behind'], flags: { drift: { vite: { common: '8.0.0', projects: 3 } } }, name: 'in dependencies', output: { dependencies: { vite: '8.0.0' } }, pkg: { dependencies: { vite: '7.0.0' } } },
  ],
  valid: [
    { flags: { drift: { knip: { common: '6.0.0', projects: 9 } } }, name: 'already fixed since the scan', pkg: { devDependencies: { knip: '~6.0.0' } } },
    { flags: { drift: { knip: { common: '6.0.0', projects: 9 } } }, name: 'a package that does not drift', pkg: { devDependencies: { vite: '~5.0.0' } } },
    { flags: { drift: {} }, name: 'no drift', pkg: { devDependencies: { knip: '~5.0.0' } } },
    { name: 'no fleet', pkg: { devDependencies: { knip: '~5.0.0' } } },
    { flags: { drift: { knip: { common: '6.0.0', projects: 9 } } }, name: 'no package.json' },
  ],
})
