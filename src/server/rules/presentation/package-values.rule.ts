import { isEqual } from 'es-toolkit'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { repoUrl } from '../../engine/flags.ts'

/** The package.json properties whose value is derived, not only present */
type ValueKey = 'author' | 'bugs' | 'homepage'

/** The options of `requireValue` */
interface RequireValueOptions {
  /** The check id */
  id: string
  /** The property name */
  key: ValueKey
  /** The value the property must have, undefined when it cannot be known (no git user, no GitHub origin) and the rule is skipped */
  expected: (context: Readonly<Context>) => unknown
}

/**
 * A rule that requires a package.json property that is already there to have the derived value. A missing property is left to the `package-*` rule of the same name
 * @param options the options
 * @param options.expected get the value the property must have
 * @param options.id the check id
 * @param options.key the property name
 * @returns the rule
 * @example requireValue({ expected: ({ flags }) => flags.gitAuthor?.name, id: 'package-author-value', key: 'author' })
 */
function requireValue({ expected, id, key }: Readonly<RequireValueOptions>) {
  return defineRule({
    appliesTo: context => context.pkg?.[key] !== undefined && expected(context) !== undefined,
    check(context) {
      const wanted = expected(context)
      const current = context.pkg?.[key]
      if (!isEqual(current, wanted)) context.report({ data: { current: JSON.stringify(current), expected: JSON.stringify(wanted), key }, fix: fixer => fixer.json('package.json').set([key], wanted), messageId: 'wrong' })
    },
    meta: { fixable: true, id, messages: { wrong: 'package.json "{{key}}" is {{current}}, it should be {{expected}}' }, severity: 'warning' },
  })
}

/**
 * The author of the git config, written like the `author` property
 * @param flags the project flags
 * @param flags.gitAuthor the git user
 * @returns `Name <mail>`, or just the name without a mail, undefined without a git user
 */
function authorOf({ gitAuthor }: Readonly<Context['flags']>) {
  return gitAuthor === undefined ? undefined : `${gitAuthor.name}${gitAuthor.email === undefined ? '' : ` <${gitAuthor.email}>`}`
}

export const packageValueRules = [
  requireValue({ expected: ({ flags }) => authorOf(flags), id: 'package-author-value', key: 'author' }),
  requireValue({ expected: ({ flags }) => (repoUrl(flags) === undefined ? undefined : `${repoUrl(flags)}/issues`), id: 'package-bugs-value', key: 'bugs' }),
  requireValue({ expected: ({ flags }) => repoUrl(flags), id: 'package-homepage-value', key: 'homepage' }),
]
