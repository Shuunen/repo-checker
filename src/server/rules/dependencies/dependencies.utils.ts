import type { Context } from '../../engine/context.ts'
import { defineRule, type Severity } from '../../engine/define-rule.ts'
import { hasDependency } from '../../engine/package-json.ts'

interface ForbidDependencyOptions {
  id: string
  /** The dependency names, any of them is reported */
  names: string[]
  /** Why it should go, or what to use instead */
  reason: string
  severity: Severity
  /** Only check when it returns true */
  when?: (context: Context) => boolean
}

/**
 * A rule that reports dependencies, in dependencies or devDependencies
 * @param options the options
 * @param options.id the check id
 * @param options.names the dependency names, any of them is reported
 * @param options.reason why it should go, or what to use instead
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 */
export function forbidDependency({ id, names, reason, severity, when = () => true }: Readonly<ForbidDependencyOptions>) {
  return defineRule({
    appliesTo: context => context.pkg !== undefined && when(context),
    check({ pkg, report }) {
      for (const name of names.filter(item => hasDependency(pkg, item))) report({ data: { name, reason }, messageId: 'found' })
    },
    meta: { id, messages: { found: 'no {{name}} dependency, {{reason}}' }, severity },
  })
}
