/**
 * The second flavor of rule: a project rule sees the whole project, cloned or not, and offers actions instead of file edits.
 * File rules only run on usable clones, project rules run on every project.
 * @module
 */
import type { ActionKind } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import type { Rule, RuleMeta } from './define-rule.ts'

/** Everything a project rule can know */
export interface ProjectContext {
  /** The project: its local clone and its GitHub repo, either can be missing */
  project: Project
}

/**
 * What a project rule sends to `context.report` when it finds a problem
 * @template MessageId the keys of the rule's `meta.messages`
 */
export interface ProjectReport<MessageId extends string> {
  /** The actions to offer, in display order. The server re-checks their safety right before running one */
  actions?: ActionKind[]
  /** Values for the `{{placeholders}}` of the message */
  data?: Record<string, number | string>
  /** Which message of `meta.messages` to show */
  messageId: MessageId
}

/**
 * What a project rule's `check` receives: the project plus a way to report
 * @template MessageId the keys of the rule's `meta.messages`
 */
interface ProjectRuleContext<MessageId extends string> extends ProjectContext {
  /** Report one problem, call it once per problem found */
  report: (report: ProjectReport<MessageId>) => void
}

/**
 * A check on a whole project, run once per project of the scan
 * @template MessageId the keys of `meta.messages`, inferred by `defineProjectRule`
 */
export interface ProjectRule<MessageId extends string = string> {
  /** When it returns false the rule is skipped, not passed. Leave it out when the rule always applies */
  appliesTo?: (context: ProjectContext) => boolean
  /** Look at the project and call `context.report` for each problem. Must not touch the disk, run commands or log */
  check: (context: ProjectRuleContext<MessageId>) => Promise<void> | void
  /** The id, severity and messages of the rule, `scope` tells it apart from a file rule */
  meta: Omit<RuleMeta<MessageId>, 'fixable'> & { scope: 'project' }
}

/** A rule of either flavor, what `loadRules` returns */
export type AnyRule = ProjectRule | Rule

/**
 * Define a project rule. It marks the rule as a project rule and lets TypeScript infer the message ids and check every `report` against `meta.messages`
 * @template MessageId the keys of `meta.messages`, inferred
 * @param rule the rule, without `meta.scope`
 * @param rule.meta the id, severity and messages
 * @returns the project rule
 * @example
 * export const notCloned = defineProjectRule({
 *   check({ project, report }) {
 *     if (project.local === undefined) report({ actions: ['clone'], messageId: 'missing' })
 *   },
 *   meta: { id: 'not-cloned', messages: { missing: 'not cloned' }, severity: 'info' },
 * })
 */
export function defineProjectRule<MessageId extends string>({ meta, ...rule }: Readonly<Omit<ProjectRule<MessageId>, 'meta'> & { meta: Omit<RuleMeta<MessageId>, 'fixable'> }>): ProjectRule<MessageId> {
  return { ...rule, meta: { ...meta, scope: 'project' } }
}

/**
 * Tell a project rule from a file rule
 * @param rule a rule of either flavor
 * @returns true for a project rule
 */
export function isProjectRule(rule: Readonly<AnyRule>): rule is ProjectRule {
  return 'scope' in rule.meta
}
