import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { packageManagerOf, updateKind } from '../../engine/versions.ts'

export const outdatedPackageManager = defineRule({
  appliesTo: ({ flags, pkg }) => packageManagerOf(pkg) !== undefined && flags.registry !== undefined,
  check({ flags, pkg, report }) {
    const manager = packageManagerOf(pkg)
    invariant(manager !== undefined, 'appliesTo guarantees a package manager')
    const latest = flags.registry?.packages[manager.name]?.latest
    if (latest === undefined || updateKind(manager.version, latest) !== 'major') return
    report({ data: { latest, mine: manager.version, name: manager.name }, fix: fixer => fixer.json('package.json').set(['packageManager'], `${manager.name}@${latest}`), messageId: 'behind' })
  },
  meta: { fixable: true, id: 'outdated-package-manager', messages: { behind: 'packageManager pins {{name}} {{mine}}, the latest is {{latest}}, a major update' }, severity: 'warning' },
})
