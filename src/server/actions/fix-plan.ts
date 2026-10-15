import { createHash } from 'node:crypto'
import path from 'node:path'
import type { FixPlan } from '../../shared/action.ts'
import type { LocalClone } from '../../shared/project.ts'
import type { SplitRules } from '../check-project.ts'
import { buildContext } from '../engine/context.ts'
import { diskIo, type Io } from '../engine/io.ts'
import { checkProject, planFixes } from '../engine/runner.ts'
import type { ActionOptions } from './action-options.ts'
import { exists, isRepoName, repoFlags } from './guards.ts'

/** What fixing the files of a project needs */
export interface FixOptions extends ActionOptions {
  /** The rules split by flavor, the file rules plan the fixes */
  rules: SplitRules
}

/** What fixing needs, with the fingerprint of the plan the user confirmed */
export interface ApplyOptions extends FixOptions {
  /** The fingerprint of the plan shown in the dialog */
  fingerprint: string
}

/** The plan of a project: what can be written, what is blocked, and where */
export interface Plan {
  /** The files that have uncommitted changes, never rewritten */
  blocked: { file: string; reason: string }[]
  /** The clone */
  clone: LocalClone
  /** The files the fixes change and that can be written */
  fixable: FixPlan[]
  /** The dev dependencies to install once the files are written, only those of fixes whose files can all be written */
  installs: string[]
  /** The files of the clone */
  io: Io
  /** The flags that do not come from the files: the git user, the Node LTS and what GitHub says of the repo */
  flags: Awaited<ReturnType<typeof repoFlags>>
}

/** Why a file with uncommitted changes is not rewritten */
export const blockedReason = 'it has uncommitted changes: commit or discard them first, so that git diff shows exactly what the fix changed and git can undo it'

/** What git writes between the old and the new name of a renamed file */
const renameArrow = ' -> '

/** The `XY ` that starts each line of `git status --porcelain` */
const statusPrefix = 3

/**
 * The paths git reports as changed, from the `git status --porcelain` lines, like ` M a.ts`, `?? b.txt` or `R  old -> new`
 * @param lines the lines
 * @returns the paths, relative to the clone
 */
function changedPaths(lines: readonly string[]) {
  return new Set(
    lines.map(line => {
      const text = line.slice(statusPrefix)
      const arrow = text.lastIndexOf(renameArrow)
      return (arrow === -1 ? text : text.slice(arrow + renameArrow.length)).replaceAll('"', '')
    }),
  )
}

/**
 * Find the clone of the project: the target itself in single project mode, one of its folders otherwise. Like the scan, only a usable clone of the owner gets file checks
 * @param options the action options
 * @param options.git how the clones are read
 * @param options.name the project name
 * @param options.owner the GitHub owner
 * @param options.target the folder of projects, or the project itself
 * @returns the clone, or the reason there is none
 */
async function findClone({ git, name, owner, target }: Readonly<ActionOptions>): Promise<{ clone: LocalClone } | { reason: string }> {
  const clones = (await exists(path.join(target, '.git'))) ? [await git.readClone(target, { shouldFetch: false })] : await git.readClones(target, { shouldFetch: false })
  const prefix = `${owner.toLowerCase()}/`
  const clone = clones.find(item => item.problem === undefined && (item.slug === `${prefix}${name}`.toLowerCase() || (item.folderName === name && item.slug?.startsWith(prefix) === true)))
  return clone === undefined ? { reason: `no clone of ${owner}/${name} that holds files to fix in ${target}` } : { clone }
}

/**
 * Plan the fixes of a project from scratch: the file checks run on the files as they are now, and what they would change is split into what can be written and what has uncommitted changes
 * @param options what to fix
 * @returns the plan, or the reason there is nothing to do
 */
export async function planOf(options: Readonly<FixOptions>): Promise<Plan | { reason: string }> {
  if (!isRepoName(options.name)) return { reason: `${options.name} is not a repo name` }
  const found = await findClone(options)
  if ('reason' in found) return found
  const io = diskIo(found.clone.path)
  const flags = await repoFlags(options.gh, `${options.owner}/${options.name}`)
  const { findings } = await checkProject(options.rules.fileRules, await buildContext(io, flags))
  const plans = await planFixes(findings, io)
  if (plans.length === 0) return { reason: `no file of ${options.owner}/${options.name} has a fix to apply` }
  const changed = changedPaths(found.clone.changedFiles)
  const installs = findings.filter(finding => finding.edits.every(edit => !changed.has(edit.file))).flatMap(finding => finding.installs)
  return { blocked: plans.filter(plan => changed.has(plan.file)).map(plan => ({ file: plan.file, reason: blockedReason })), clone: found.clone, fixable: plans.filter(plan => !changed.has(plan.file)), flags, installs: [...new Set(installs)].toSorted(), io }
}

/**
 * Fingerprint a plan, so the fix can be refused when it is not the plan the user saw
 * @param plans the files and their new content
 * @param installs the dev dependencies to install
 * @returns a hash of the plan
 */
export function fingerprintOf(plans: readonly FixPlan[], installs: readonly string[]) {
  return createHash('sha256')
    .update(JSON.stringify([plans.map(plan => [plan.file, plan.before, plan.after]), installs]))
    .digest('hex')
}
