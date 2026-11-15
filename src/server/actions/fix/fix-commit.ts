import type { FixStage } from '../../../shared/action.ts'
import { type GitRunner, realRunGit } from '../action-options.ts'
import { realCheck } from './check-script.ts'
import { type ApplyOptions, changedPaths, type Plan } from './fix-plan.ts'

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
 * Commit what the fixes changed, then push it: the files written and the ones the install touched, never the work that was already uncommitted
 * @param where the clone
 * @param where.before the paths that were already changed before the fixes
 * @param where.folder the clone
 * @param where.runGit runs git
 * @param onStage called when the commit is prepared and when it is pushed
 * @returns the reason the commit or the push failed, undefined when it worked
 */
async function commitFixes(where: Readonly<{ before: ReadonlySet<string>; folder: string; runGit: GitRunner }>, onStage: (stage: FixStage) => void) {
  const { before, folder, runGit } = where
  onStage('committing')
  const status = await runGit(['status', '--porcelain'], folder)
  const files = [...changedPaths(status.stdout.split('\n').filter(Boolean))].filter(file => !before.has(file))
  const added = await runGit(['add', '--', ...files], folder)
  if (!added.ok) return `not committed, git add failed: ${added.stderr.trim()}`
  if (files.length === 0) return undefined
  const committed = await runGit(['commit', '-m', commitMessage, '--', ...files], folder)
  if (!committed.ok) return `not committed, git commit failed: ${committed.stderr.trim()}`
  onStage('pushing')
  const pushed = await runGit(['push'], folder)
  return pushed.ok ? undefined : `committed but not pushed, git push failed: ${pushed.stderr.trim()}`
}

/**
 * Commit and push the fixes when asked, but only if the check of the project passes, or when it has none
 * @param options what to fix
 * @param plan the plan that was written
 * @param onStage called when the fix enters a step
 * @returns the output of the failing check when it prevented the commit, the reason the commit or the push failed, or nothing when it worked or was not asked
 */
export async function commitIfAsked(options: Readonly<ApplyOptions>, plan: Readonly<Plan>, onStage: (stage: FixStage) => void): Promise<{ blocked?: string; failure?: string }> {
  if (options.commit !== true) return {}
  const checked = await (options.check ?? realCheck)(plan.clone.path, () => onStage('checking'))
  if (checked?.ok === false) return { blocked: tail(`${checked.stdout}\n${checked.stderr}`) }
  const failure = await commitFixes({ before: changedPaths(plan.clone.changedFiles), folder: plan.clone.path, runGit: options.runGit ?? realRunGit }, onStage)
  return failure === undefined ? {} : { failure }
}
