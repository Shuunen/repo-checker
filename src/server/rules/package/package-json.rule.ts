import { defineRule } from '../../engine/define-rule.ts'

export const packageJsonExists = defineRule({
  appliesTo: ({ flags }) => flags.isNotNode !== true,
  check({ pkg, report }) {
    if (pkg === undefined) report({ messageId: 'missing' })
  },
  meta: { id: 'package-json-exists', messages: { missing: 'no package.json file' }, severity: 'error' },
})

export const packageDependenciesSections = defineRule({
  appliesTo: ({ pkg }) => pkg !== undefined,
  check({ pkg, report }) {
    if (pkg?.dependencies === undefined && pkg?.devDependencies === undefined) report({ messageId: 'missing' })
  },
  meta: { id: 'package-dependencies-sections', messages: { missing: 'package.json has no dependencies nor devDependencies section, the dependency checks have nothing to look at' }, severity: 'info' },
})
