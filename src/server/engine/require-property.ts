/**
 * A rule factory for the package.json properties a project must have, with an optional fixed value.
 * @module
 */
import type { Context } from './context.ts'
import type { Severity } from '../../shared/scan-event.ts'
import { defineRule } from './define-rule.ts'
import type { PackageJson } from './package-json.ts'

/** The options of `requireProperty` */
interface RequirePropertyOptions {
  /** The value the property must have, makes the rule fixable */
  expected?: string
  /** The check id from docs/checks.md */
  id: string
  /** Insert the property first when it is fixed, like `$schema` */
  isFirst?: boolean
  /** The property name */
  key: keyof PackageJson
  /** Get the value to set when the property is missing, makes the rule fixable, undefined means nothing is known to fill it */
  value?: (context: Readonly<Context>) => unknown
  /** The severity of the rule */
  severity: Severity
}

/**
 * A rule that requires a package.json property, with a given value when `expected` is set. Skipped when the project has no package.json
 * @param options the options
 * @param options.expected the value the property must have, makes the rule fixable
 * @param options.id the check id
 * @param options.isFirst insert the property first when it is fixed
 * @param options.key the property name
 * @param options.value get the value to set when the property is missing
 * @param options.severity the severity
 * @returns the rule
 * @example export const packageName = requireProperty({ id: 'package-name', key: 'name', severity: 'error' })
 */
export function requireProperty({ expected, id, isFirst = false, key, severity, value: getValue }: Readonly<RequirePropertyOptions>) {
  return defineRule({
    appliesTo: ({ pkg }) => pkg !== undefined,
    check(context) {
      const value = context.pkg?.[key]
      if (value !== undefined && (expected === undefined || value === expected)) return
      const base = { data: { expected: expected ?? '', key }, messageId: value === undefined ? ('missing' as const) : ('wrong' as const) }
      const fixed = expected ?? getValue?.(context)
      context.report(fixed === undefined ? base : { ...base, fix: fixer => fixer.json('package.json').set([key], fixed, { isFirst }) })
    },
    meta: { fixable: expected !== undefined || getValue !== undefined, id, messages: { missing: 'package.json has no "{{key}}" property', wrong: 'package.json "{{key}}" should be "{{expected}}"' }, severity },
  })
}
