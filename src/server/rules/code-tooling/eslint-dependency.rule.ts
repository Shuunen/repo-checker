import { defineRule } from '../../engine/define-rule.ts'
import { dependencyVersion } from '../../engine/package-json.ts'

export const eslintDependency = defineRule({
  appliesTo: ({ flags }) => flags.isUsingEslint === true,
  check({ pkg, report }) {
    const version = dependencyVersion(pkg, 'eslint')
    if (version === undefined) report({ messageId: 'missing' })
    else if (/^[\^~]?8\./u.test(version)) report({ messageId: 'outdated' })
  },
  meta: { id: 'eslint-dependency', messages: { missing: 'no eslint dependency', outdated: 'eslint 8 is outdated, use a recent eslint with the flat config' }, severity: 'error' },
})
