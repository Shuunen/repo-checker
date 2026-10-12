import type { PackageJson } from '../../engine/context.ts'
import { defineRule, type Severity } from '../../engine/define-rule.ts'

interface RequirePropertyOptions {
  /** The value the property must have, makes the rule fixable */
  expected?: string
  id: string
  /** Insert the property first when it is fixed, like $schema */
  isFirst?: boolean
  key: keyof PackageJson
  severity: Severity
}

/**
 * A rule that requires a package.json property, with a given value when expected is set
 * @param options the options
 * @param options.expected the value the property must have, makes the rule fixable
 * @param options.id the check id
 * @param options.isFirst insert the property first when it is fixed
 * @param options.key the property name
 * @param options.severity the severity
 * @returns the rule
 */
export function requireProperty({ expected, id, isFirst = false, key, severity }: Readonly<RequirePropertyOptions>) {
  return defineRule({
    appliesTo: ({ pkg }) => pkg !== undefined,
    check({ pkg, report }) {
      const value = pkg?.[key]
      if (value !== undefined && (expected === undefined || value === expected)) return
      const base = { data: { expected: expected ?? '', key }, messageId: value === undefined ? ('missing' as const) : ('wrong' as const) }
      report(expected === undefined ? base : { ...base, fix: fixer => fixer.json('package.json').set([key], expected, { isFirst }) })
    },
    meta: { fixable: expected !== undefined, id, messages: { missing: 'package.json has no "{{key}}" property', wrong: 'package.json "{{key}}" should be "{{expected}}"' }, severity },
  })
}
