import { defineRule, type Severity } from '../../engine/define-rule.ts'

interface ForbidDependencyOptions {
  id: string
  name: string
  reason: string
  severity: Severity
}

/**
 * A rule that reports a dependency, in dependencies or devDependencies
 * @param options the options
 * @param options.id the check id
 * @param options.name the dependency name
 * @param options.reason why it should go
 * @param options.severity the severity
 * @returns the rule
 */
export function forbidDependency({ id, name, reason, severity }: Readonly<ForbidDependencyOptions>) {
  return defineRule({
    appliesTo: ({ pkg }) => pkg !== undefined,
    check({ pkg, report }) {
      const isFound = pkg?.dependencies?.[name] !== undefined || pkg?.devDependencies?.[name] !== undefined
      if (isFound) report({ data: { name, reason }, messageId: 'found' })
    },
    meta: { id, messages: { found: 'no {{name}} dependency, {{reason}}' }, severity },
  })
}
