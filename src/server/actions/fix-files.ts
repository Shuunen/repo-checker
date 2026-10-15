import type { ActionResult, FixPreview, FixStage } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'
import { buildContext } from '../engine/context.ts'
import { diskIo } from '../engine/io.ts'
import { checkProject } from '../engine/runner.ts'
import { run } from '../inventory/shell.ts'
import { realCheck } from './check-script.ts'
import { realInstall } from './install.ts'
import { type ApplyOptions, blockedReason, changedPaths, fingerprintOf, type FixOptions, type Plan, planOf } from './fix-plan.ts'

/**
 * Say what applying the file fixes would change, read fresh: a before and after per file, the files that cannot be written because they have uncommitted changes, and the fingerprint of that plan
 * @param options what to fix
 * @returns the plan, or the reason there is nothing to apply
 * @example const preview = await previewFixFiles({ gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', rules, target })
 */
export async function previewFixFiles(options: Readonly<FixOptions>): Promise<FixPreview> {
  try {
    const plan = await planOf(options)
    if ('reason' in plan) return { ok: false, reason: plan.reason }
    if (plan.fixable.length === 0) return { ok: false, reason: `every file with a fix has uncommitted changes (${plan.blocked.map(item => item.file).join(', ')}): ${blockedReason}` }
    return { blocked: plan.blocked, fingerprint: fingerprintOf(plan.fixable, plan.installs), installs: plan.installs, ok: true, path: plan.clone.path, plans: plan.fixable }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/** The message of the commit of the fixes */
const commitMessage = 'chore: apply the repo-checker fixes'

/** How many lines of the output of a failing check are kept */
const keptLines = 40

/**
 * Keep the end of a command output, where the errors are
 * @param output the output
 * @returns the last lines
 */
function tail(output: string) {
  return output.trim().split('\n').slice(-keptLines).join('\n')
}

/**
 * Say in the result what happened to the commit
 * @param wanted true when the commit was asked
 * @param blocked the output of the failing check, undefined when the check did not prevent the commit
 * @returns the end of the message
 */
function commitSummary(wanted: boolean, blocked: string | undefined) {
  if (!wanted) return 'check git diff'
  return blocked === undefined ? 'committed and pushed' : 'not committed because the check failed, check git diff'
}

/**
 * Commit what the fixes changed, then push it: the files written and the ones the install touched, never the work that was already uncommitted
 * @param folder the clone
 * @param before the paths that were already changed before the fixes
 * @param onStage called when the commit is prepared and when it is pushed
 * @returns the reason the commit or the push failed, undefined when it worked
 */
async function commitFixes(folder: string, before: ReadonlySet<string>, onStage: (stage: FixStage) => void) {
  onStage('committing')
  const status = await run('git', ['status', '--porcelain'], folder)
  const files = [...changedPaths(status.stdout.split('\n').filter(Boolean))].filter(file => !before.has(file))
  const added = await run('git', ['add', '--', ...files], folder)
  if (!added.ok) return `not committed, git add failed: ${added.stderr.trim()}`
  const committed = await run('git', ['commit', '-m', commitMessage, '--', ...files], folder)
  if (!committed.ok) return `not committed, git commit failed: ${committed.stderr.trim()}`
  onStage('pushing')
  const pushed = await run('git', ['push'], folder)
  return pushed.ok ? undefined : `committed but not pushed, git push failed: ${pushed.stderr.trim()}`
}

/**
 * Commit and push the fixes when asked, but only if the check of the project passes, or when it has none
 * @param options what to fix
 * @param plan the plan that was written
 * @param onStage called when the fix enters a step
 * @returns the output of the failing check when it prevented the commit, the reason the commit or the push failed, or nothing when it worked or was not asked
 */
async function commitIfAsked(options: Readonly<ApplyOptions>, plan: Readonly<Plan>, onStage: (stage: FixStage) => void): Promise<{ blocked?: string; failure?: string }> {
  if (options.commit !== true) return {}
  const checked = await (options.check ?? realCheck)(plan.clone.path, () => onStage('checking'))
  if (checked?.ok === false) return { blocked: tail(`${checked.stdout}\n${checked.stderr}`) }
  const failure = await commitFixes(plan.clone.path, changedPaths(plan.clone.changedFiles), onStage)
  return failure === undefined ? {} : { failure }
}

/**
 * Apply the file fixes of a project: the plan is made again from the files as they are now and refused unless it is exactly the plan the user confirmed, then each file is written and the checks run again to say what is left. A file with uncommitted changes is never written. Nothing is committed unless asked: git shows the change and can undo it
 * @param options what to fix, with the fingerprint of the confirmed plan
 * @returns the result, refused with the reason when the plan changed
 * @example const result = await fixFiles({ fingerprint: preview.fingerprint, gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', rules, target })
 */
export async function fixFiles(options: Readonly<ApplyOptions>): Promise<ActionResult> {
  const onStage = options.onStage ?? (() => undefined)
  try {
    const plan = await planOf(options)
    if ('reason' in plan) return { ok: false, reason: plan.reason }
    if (plan.fixable.length === 0 || fingerprintOf(plan.fixable, plan.installs) !== options.fingerprint) return { ok: false, reason: 'the fixes are not what the dialog listed any more, nothing was written, open the dialog again' }
    onStage('writing')
    await Promise.all(plan.fixable.map(item => plan.io.writeText(item.file, item.after)))
    if (plan.installs.length > 0) onStage('installing')
    const installed = plan.installs.length === 0 ? undefined : await (options.install ?? realInstall)(plan.clone.path, plan.installs)
    if (installed?.ok === false) return { ok: false, reason: `the files were written but installing ${plan.installs.join(', ')} failed: ${installed.stderr.trim()}` }
    const { blocked: commitBlocked, failure } = await commitIfAsked(options, plan, onStage)
    if (failure !== undefined) return { ok: false, reason: `the files were written but ${failure}` }
    const { findings } = await checkProject(options.rules.fileRules, await buildContext(diskIo(plan.clone.path), plan.flags))
    const left = findings.filter(finding => finding.edits.length > 0).length
    return {
      message: `fixed ${plural(plan.fixable.length, 'file')} (${plan.fixable.map(item => item.file).join(', ')})${plan.installs.length === 0 ? '' : `, installed ${plan.installs.join(', ')}`}, ${left === 0 ? 'no fix left' : `${plural(left, 'finding')} left with a fix`}, ${commitSummary(options.commit === true, commitBlocked)}`,
      ok: true,
      ...(commitBlocked === undefined ? {} : { commitBlocked }),
    }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
