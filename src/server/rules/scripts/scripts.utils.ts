import type { Context } from '../../engine/context.ts'
import { defineRule, type Severity } from '../../engine/define-rule.ts'
import { scriptsMatching } from '../../engine/package-json.ts'

/** A condition on the project, the rule is skipped when it returns false */
type When = (context: Readonly<Context>) => boolean

/** The options shared by the script rule factories */
interface ScriptRuleOptions {
  id: string
  /** The full message, can use {{name}} for the script name */
  message: string
  severity: Severity
  /** Only check when it returns true */
  when?: When
}

/**
 * Replace npm run by pnpm, and drop the -- before flags that pnpm does not need
 * @param script the script command
 * @returns the script using pnpm
 */
export function toPnpm(script: string) {
  return script.replaceAll('npm run', 'pnpm').replaceAll(/pnpm (?<task>[\w:]+) -- -/gu, 'pnpm $<task> -')
}

/**
 * Tell if the project uses ESLint
 * @param context the project context
 * @param context.flags the project flags
 * @returns true when it does
 */
export const isUsingEslint: When = ({ flags }) => flags.isUsingEslint === true

/**
 * Tell if the project uses Bun
 * @param context the project context
 * @param context.flags the project flags
 * @returns true when it does
 */
export const isUsingBun: When = ({ flags }) => flags.isUsingBun === true

/**
 * A rule that requires a script, by name
 * @param options the options
 * @param options.id the check id
 * @param options.message the message
 * @param options.name the script name
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 */
export function requireScript({ id, message, name, severity, when = () => true }: Readonly<ScriptRuleOptions & { name: string }>) {
  return defineRule({
    appliesTo: context => context.pkg !== undefined && when(context),
    check({ pkg, report }) {
      if (pkg?.scripts?.[name] === undefined) report({ data: { name }, messageId: 'missing' })
    },
    meta: { id, messages: { missing: message }, severity },
  })
}

/**
 * A rule that reports a script, by name
 * @param options the options
 * @param options.id the check id
 * @param options.message the message
 * @param options.name the script name
 * @param options.severity the severity
 * @returns the rule
 */
export function forbidScript({ id, message, name, severity }: Readonly<ScriptRuleOptions & { name: string }>) {
  return defineRule({
    check({ pkg, report }) {
      if (pkg?.scripts?.[name] !== undefined) report({ data: { name }, messageId: 'found' })
    },
    meta: { id, messages: { found: message }, severity },
  })
}

/**
 * A rule that requires at least one script whose command matches a pattern
 * @param options the options
 * @param options.id the check id
 * @param options.message the message
 * @param options.pattern the pattern, without the `g` flag
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 */
export function requireCommand({ id, message, pattern, severity, when }: Readonly<ScriptRuleOptions & { pattern: RegExp; when: When }>) {
  return defineRule({
    appliesTo: context => context.pkg !== undefined && when(context),
    check({ pkg, report }) {
      if (scriptsMatching(pkg, pattern).length === 0) report({ messageId: 'missing' })
    },
    meta: { id, messages: { missing: message }, severity },
  })
}

/**
 * A rule that reports every script whose command matches a pattern
 * @param options the options
 * @param options.id the check id
 * @param options.message the message, {{name}} is the script name
 * @param options.names only look at these scripts, every script when omitted
 * @param options.pattern the pattern, without the `g` flag
 * @param options.severity the severity
 * @param options.when only check when it returns true
 * @returns the rule
 */
export function forbidCommand({ id, message, names, pattern, severity, when = () => true }: Readonly<ScriptRuleOptions & { names?: string[]; pattern: RegExp }>) {
  return defineRule({
    appliesTo: when,
    check({ pkg, report }) {
      const found = scriptsMatching(pkg, pattern).filter(([name]) => names === undefined || names.includes(name))
      for (const [name] of found) report({ data: { name }, messageId: 'found' })
    },
    meta: { id, messages: { found: message }, severity },
  })
}
