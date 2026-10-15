/**
 * Run rules on one project, in phases: check (nothing written), plan the fixes (one before/after per file), then apply after confirmation and check again.
 * Project rules only check: their actions are run by the server, not here.
 * @module
 */
import { invariant } from 'es-toolkit'
import type { Project } from '../../shared/project.ts'
import type { RuleOutcome } from '../../shared/scan-event.ts'
import { buildContext, type Context } from './context.ts'
import type { ProjectReport, ProjectRule } from './define-project-rule.ts'
import { type Finding, formatMessage, type Report, type Rule, type RuleMeta } from './define-rule.ts'
import { type Edit, fixer } from './fixer.ts'
import type { ProjectFlags } from './flags.ts'
import { type FileReader, type Io, overlayIo } from './io.ts'

/** The planned change of one file, what the confirm dialog shows as a diff */
export interface FilePlan {
  /** The text once every edit of this file is applied */
  after: string
  /** The current text, empty when the file does not exist yet */
  before: string
  /** The file path, relative to the project folder */
  file: string
}

/**
 * The parts of a rule the runner needs, common to both flavors
 * @template RuleContext what the rule receives, without `report`
 * @template Reported what the rule reports
 */
interface Runnable<RuleContext, Reported> {
  /** When it returns false the rule is skipped */
  appliesTo?: (context: RuleContext) => boolean | Promise<boolean>
  /** Check and report */
  check: (context: RuleContext & { report: (report: Reported) => void }) => Promise<void> | void
}

/**
 * Get the message template of a report
 * @param meta the rule meta
 * @param messageId the reported message id
 * @returns the template
 * @throws {Error} when the message id is not in `meta.messages`
 */
function messageTemplate(meta: Readonly<Pick<RuleMeta<string>, 'id' | 'messages'>>, messageId: string) {
  const template = meta.messages[messageId]
  invariant(template !== undefined, `rule ${meta.id} reported an unknown message id ${messageId}`)
  return template
}

/**
 * Turn a file rule report into a finding, building the edits of its fix
 * @param rule the rule that reported
 * @param report the report
 * @returns the finding
 * @throws {Error} when the report has a fix but `meta.fixable` is not true
 * @throws {Error} when the message id is not in `meta.messages`
 */
function toFinding(rule: Readonly<Rule>, report: Readonly<Report<string>>): Finding {
  const { fixable = false, id, severity } = rule.meta
  if (report.fix !== undefined && !fixable) throw new Error(`rule ${id} reported a fix but its meta.fixable is not true`)
  const edits = report.fix === undefined ? [] : [report.fix(fixer)].flat()
  return { actions: [], edits, installs: report.fix === undefined ? [] : (report.installs ?? []), message: formatMessage(messageTemplate(rule.meta, report.messageId), report.data), messageId: report.messageId, ruleId: id, scope: 'file', severity }
}

/**
 * Turn a project rule report into a finding, with its actions
 * @param rule the rule that reported
 * @param report the report
 * @returns the finding
 * @throws {Error} when the message id is not in `meta.messages`
 */
function toProjectFinding(rule: Readonly<ProjectRule>, report: Readonly<ProjectReport<string>>): Finding {
  const { id, severity } = rule.meta
  return { actions: report.actions ?? [], edits: [], installs: [], message: formatMessage(messageTemplate(rule.meta, report.messageId), report.data), messageId: report.messageId, ruleId: id, scope: 'project', severity }
}

/** What running rules on one project gives */
export interface CheckResult {
  /** The findings, in rule order then report order */
  findings: Finding[]
  /** One outcome per rule, in rule order */
  outcomes: RuleOutcome[]
}

/**
 * Run rules of one flavor in parallel, skipping those whose `appliesTo` returns false
 * @param rules the rules
 * @param context what each rule receives, `report` is added
 * @param makeFinding turn a report into a finding
 * @returns the findings and one outcome per rule
 */
async function runRules<RuleContext extends object, Reported, Item extends Runnable<RuleContext, Reported> & { meta: { id: string } }>(rules: readonly Item[], context: Readonly<RuleContext>, makeFinding: (rule: Item, report: Reported) => Finding): Promise<CheckResult> {
  const perRule = await Promise.all(
    rules.map(async rule => {
      if ((await rule.appliesTo?.(context)) === false) return { findings: [], outcome: { ruleId: rule.meta.id, status: 'skipped' as const } }
      const findings: Finding[] = []
      await rule.check({ ...context, report: (report: Reported) => findings.push(makeFinding(rule, report)) })
      return { findings, outcome: { ruleId: rule.meta.id, status: findings.length > 0 ? ('failed' as const) : ('passed' as const) } }
    }),
  )
  return { findings: perRule.flatMap(item => item.findings), outcomes: perRule.map(item => item.outcome) }
}

/**
 * Run the file rules on one project, nothing is written. Rules whose `appliesTo` returns false are skipped
 * @param rules the file rules to run
 * @param context the project context
 * @returns the findings, in rule order then report order, and one outcome per rule
 * @throws {Error} when a rule reports a fix without `meta.fixable`, or an unknown message id
 * @example const { findings } = await checkProject(rules, await buildContext(diskIo(folder)))
 */
export function checkProject(rules: readonly Rule[], context: Readonly<Context>) {
  return runRules(rules, context, toFinding)
}

/**
 * Run the project rules on one project, cloned or not. Nothing is changed, the findings carry the actions to offer
 * @param rules the project rules to run
 * @param project the project
 * @returns the findings, in rule order then report order, and one outcome per rule
 * @throws {Error} when a rule reports an unknown message id
 * @example const { findings } = await checkProjectRules(projectRules, project)
 */
export function checkProjectRules(rules: readonly ProjectRule[], project: Readonly<Project>) {
  return runRules(rules, { project }, toProjectFinding)
}

/**
 * Apply edits one after the other, each one gets the text left by the previous one
 * @param text the starting text
 * @param edits the edits to apply, in order
 * @returns the final text
 */
function applyAll(text: string, edits: readonly Edit[]) {
  let result = text
  for (const edit of edits) result = edit.apply(result)
  return result
}

/**
 * Plan the change of one file
 * @param files the reader of the project files
 * @param file the file path, relative to the project folder
 * @param edits the edits of that file, in order
 * @returns the plan, `before` is empty when the file does not exist yet
 */
async function planFile(files: Readonly<FileReader>, file: string, edits: readonly Edit[]): Promise<FilePlan> {
  const before = (await files.readText(file)) ?? ''
  return { after: applyAll(before, edits), before, file }
}

/**
 * Chain the edits of the findings per file, in finding order, nothing is written
 * @param findings the findings with their edits
 * @param files the reader of the project files
 * @returns one plan per file that would change, files whose edits change nothing are left out
 * @example const plans = await planFixes(findings, io) // show plans[0].before and plans[0].after as a diff
 */
export async function planFixes(findings: readonly Finding[], files: Readonly<FileReader>) {
  const editsPerFile = Map.groupBy(
    findings.flatMap(finding => finding.edits),
    edit => edit.file,
  )
  const plans = await Promise.all([...editsPerFile].map(([file, edits]) => planFile(files, file, edits)))
  return plans.filter(plan => plan.after !== plan.before)
}

/** The most rounds of checks and fixes `planAllFixes` chains, a safety net against fixes that keep undoing each other */
const maxRounds = 5

/** What the rounds of `planAllFixes` gather */
interface Rounds {
  /** The text of each file the rounds changed, as of the last round */
  files: Map<string, string>
  /** The findings of every round */
  findings: Finding[]
}

/** The options of `runRounds` */
interface RoundsOptions {
  /** The project flags */
  flags: ProjectFlags
  /** What the previous rounds found and changed */
  gathered: Rounds
  /** The rounds left */
  left: number
  /** The project files with the fixes of the previous rounds */
  overlay: Io
  /** The file rules to run */
  rules: readonly Rule[]
}

/**
 * Check and fix in memory, then again on the result, until a round has nothing to fix or the rounds run out
 * @param options the options
 * @param options.flags the project flags
 * @param options.gathered what the previous rounds found and changed
 * @param options.left the rounds left
 * @param options.overlay the project files with the fixes of the previous rounds
 * @param options.rules the file rules to run
 * @returns what all the rounds found and changed
 */
async function runRounds({ flags, gathered, left, overlay, rules }: Readonly<RoundsOptions>): Promise<Rounds> {
  if (left === 0) return gathered
  const { findings } = await checkProject(rules, await buildContext(overlay, flags))
  const plans = await planFixes(findings, overlay)
  const next = { files: new Map([...gathered.files, ...plans.map(plan => [plan.file, plan.after] as const)]), findings: [...gathered.findings, ...findings] }
  if (plans.length === 0) return next
  await Promise.all(plans.map(plan => overlay.writeText(plan.file, plan.after)))
  return runRounds({ flags, gathered: next, left: left - 1, overlay, rules })
}

/**
 * Plan the fixes until the checks have nothing more to fix: a fix can make another rule apply, like a new README section the next rule fills. Fixes are applied in memory between rounds, nothing is written
 * @param rules the file rules to run
 * @param io the project files as they are
 * @param flags the project flags
 * @returns the findings of every round, and one plan per file that would change, from its text now to its text after every round
 * @example const { findings, plans } = await planAllFixes(rules, diskIo(folder), flags)
 */
export async function planAllFixes(rules: readonly Rule[], io: Readonly<FileReader>, flags: ProjectFlags = {}) {
  const overlay = overlayIo(io)
  const { files, findings } = await runRounds({ flags, gathered: { files: new Map(), findings: [] }, left: maxRounds, overlay, rules })
  const plans = await Promise.all([...files].map(async ([file, after]) => ({ after, before: (await io.readText(file)) ?? '', file })))
  return { findings, plans: plans.filter(plan => plan.after !== plan.before) }
}

/** The options of `fixProject` */
interface FixOptions {
  /** Show the plans to the user, nothing is written unless it resolves to true. Not called when there is nothing to fix */
  confirm: (plans: readonly FilePlan[]) => Promise<boolean>
  /** The project flags, used to build the context before and after the fixes */
  flags?: ProjectFlags | undefined
  /** The project files, read to check and written to fix */
  io: Io
  /** The rules to run */
  rules: readonly Rule[]
}

/**
 * Check, plan the fixes, ask for confirmation, apply, then check again to prove the fixes worked
 * @param options the options
 * @param options.confirm show the plans to the user, nothing is written unless it resolves to true
 * @param options.flags the project flags
 * @param options.io the project files
 * @param options.rules the rules to run
 * @returns `applied`, the plans written (empty when nothing was written), and `findings`, the findings left: after the fixes when they were applied, before otherwise
 * @throws {Error} when a rule reports a fix without `meta.fixable`, or an unknown message id
 * @example
 * const { applied, findings } = await fixProject({ confirm: plans => askUser(plans), io: diskIo(folder), rules })
 */
export async function fixProject({ confirm, flags = {}, io, rules }: Readonly<FixOptions>) {
  const { findings } = await checkProject(rules, await buildContext(io, flags))
  const plans = await planFixes(findings, io)
  if (plans.length === 0 || !(await confirm(plans))) return { applied: [], findings }
  await Promise.all(plans.map(plan => io.writeText(plan.file, plan.after)))
  const recheck = await checkProject(rules, await buildContext(io, flags))
  return { applied: plans, findings: recheck.findings }
}
