import { defineRule } from '../../engine/define-rule.ts'
import { compareVersions, declaredDependencies, withVersion } from '../../engine/versions.ts'

export const versionDrift = defineRule({
  appliesTo: ({ flags, pkg }) => pkg !== undefined && flags.drift !== undefined,
  check({ flags, pkg, report }) {
    for (const { name, section, version } of declaredDependencies(pkg)) {
      const common = flags.drift?.[name]
      // the version may have been fixed since the scan, the others are the reference
      if (common === undefined || compareVersions(common.common, version) <= 0) continue
      report({ data: { common: common.common, mine: version, name, projects: common.projects }, fix: fixer => fixer.json('package.json').update([section, name], current => withVersion(String(current), common.common)), messageId: 'behind' })
    }
  },
  meta: { fixable: true, id: 'version-drift', messages: { behind: '{{name}} is {{mine}} here but {{common}} in {{projects}} of your other projects' }, severity: 'info' },
})
