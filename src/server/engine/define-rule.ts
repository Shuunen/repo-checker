/**
 * The shape of a rule, ESLint style: `defineRule({ meta, appliesTo, check })`, and what the runner turns its reports into.
 * @module
 */
import type { ActionKind } from '../../shared/action.ts'
import type { Severity } from '../../shared/scan-event.ts'
import type { Context } from './context.ts'
import type { Edit, Fixer } from './fixer.ts'

/**
 * What a rule sends to `context.report` when it finds a problem
 * @template MessageId the keys of the rule's `meta.messages`
 */
export interface Report<MessageId extends string> {
  /** Values for the `{{placeholders}}` of the message */
  data?: Record<string, number | string>
  /** Describe the fix with the given fixer, nothing is written here: the runner decides if and when the edits are applied. Only allowed when `meta.fixable` is true */
  fix?: (fixer: Fixer) => Edit | Edit[]
  /** Which message of `meta.messages` to show */
  messageId: MessageId
}

/**
 * What a rule's `check` receives: the project context plus a way to report
 * @template MessageId the keys of the rule's `meta.messages`
 */
interface RuleContext<MessageId extends string> extends Context {
  /** Report one problem, call it once per problem found */
  report: (report: Report<MessageId>) => void
}

/**
 * The static description of a rule
 * @template MessageId the keys of `messages`
 */
export interface RuleMeta<MessageId extends string> {
  /** Must be true for the rule to report a fix, the runner throws otherwise */
  fixable?: boolean
  /** The check id from docs/checks.md, kebab-case, unique */
  id: string
  /** The messages the rule can report, by message id, with optional `{{placeholders}}` filled from `Report.data` */
  messages: Record<MessageId, string>
  /** The severity of every finding of this rule */
  severity: Severity
}

/**
 * A check, run once per project
 * @template MessageId the keys of `meta.messages`, inferred by `defineRule`
 */
export interface Rule<MessageId extends string = string> {
  /** When it returns false the rule is skipped, not passed, so the report can tell both apart. It may be async, to look at the disk. Leave it out when the rule always applies */
  appliesTo?: (context: Context) => boolean | Promise<boolean>
  /** Look at the context and call `context.report` for each problem. Must not touch the disk, run commands or log */
  check: (context: RuleContext<MessageId>) => Promise<void> | void
  /** The id, severity and messages of the rule, and whether it can fix */
  meta: RuleMeta<MessageId>
}

/** One problem found by a rule, ready to be shown, with the edits or the actions that would fix it */
export interface Finding {
  /** The actions offered by a project rule, empty for a file rule */
  actions: ActionKind[]
  /** The edits of the fix, empty when the rule gave no fix or is a project rule */
  edits: Edit[]
  /** The final message, placeholders filled */
  message: string
  /** The message id the rule reported, stable for tests and for the UI */
  messageId: string
  /** The id of the rule that reported it */
  ruleId: string
  /** The severity of the rule that reported it */
  severity: Severity
}

/**
 * Define a rule. It returns the rule as is, it only exists so TypeScript infers the message ids and checks every `report` against `meta.messages`
 * @template MessageId the keys of `meta.messages`, inferred
 * @param rule the rule
 * @returns the same rule
 * @example
 * export const scriptsNoCi = defineRule({
 *   check({ pkg, report }) {
 *     if (pkg?.scripts?.ci !== undefined) report({ messageId: 'found' })
 *   },
 *   meta: { id: 'scripts-no-ci', messages: { found: 'no "ci" script, use "check" instead' }, severity: 'warning' },
 * })
 */
export function defineRule<MessageId extends string>(rule: Rule<MessageId>) {
  return rule
}

/**
 * Fill the `{{placeholders}}` of a message, unknown placeholders are kept as they are
 * @param template the message with placeholders
 * @param data the values to put in
 * @returns the final message
 * @example formatMessage('{{name}} is {{size}}Ko', { name: 'a.js', size: 3 }) // 'a.js is 3Ko'
 */
export function formatMessage(template: string, data: Readonly<Record<string, number | string>> = {}) {
  return template.replaceAll(/\{\{(?<key>\w+)\}\}/gu, (match, key: string) => String(data[key] ?? match))
}
