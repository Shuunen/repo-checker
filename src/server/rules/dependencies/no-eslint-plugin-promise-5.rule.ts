import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { dependencyVersion, hasDependency } from '../../engine/package-json.ts'

const name = 'eslint-plugin-promise'

export const noEslintPluginPromise5 = defineRule({
  appliesTo: ({ pkg }) => hasDependency(pkg, name),
  check({ pkg, report }) {
    const version = dependencyVersion(pkg, name)
    invariant(version !== undefined, 'appliesTo guarantees the dependency')
    if (/^[\^~]?5\./u.test(version)) report({ messageId: 'found' })
  },
  meta: { id: 'no-eslint-plugin-promise-5', messages: { found: 'no eslint-plugin-promise 5 dependency, it requires eslint 7' }, severity: 'error' },
})
