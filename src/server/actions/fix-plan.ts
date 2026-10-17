import { createHash } from 'node:crypto'
import path from 'node:path'
import type { FixPlan, FixStage } from '../../shared/action.ts'
import type { LocalClone } from '../../shared/project.ts'
import type { SplitRules } from '../check-project.ts'
import { diskIo, type Io } from '../engine/io.ts'
import { planAllFixes } from '../engine/runner.ts'
import type { ActionOptions } from './action-options.ts'
import { exists, isRepoName, repoFlags } from './guards.ts'

/** What fixing the files of a project needs */
export interface FixOptions extends ActionOptions {
  /** The rules split by flavor, the file rules plan the fixes */
  rules: SplitRules
}

/** What fixing needs, with the fingerprint of the plan the user confirmed */
export interface ApplyOptions extends FixOptions {
  /** True to commit the written files and push them once the fixes are applied */
  commit?: boolean
  /** The fingerprint of the plan shown in the dialog */
  fingerprint: string
  /** Called when the fix enters a step, for the dialog to say what is going on */
  onStage?: ((stage: FixStage) => void) | undefined
}

/** The plan of a project: what can be written, which files already have uncommitted changes, and where */
export interface Plan {
  /** The clone */
  clone: LocalClone
  /** The files the fixes change */
  fixable: FixPlan[]
  /** The dev dependencies to install once the files are written */
  installs: string[]
  /** The files of the clone */
  io: Io
  /** The files of the fixes that have uncommitted changes: the fix is made on the file as it is now, so it is merged into those changes */
  merged: string[]
  /** The flags that do not come from the files: the git user, the Node LTS and what GitHub says of the repo */
  flags: Awaited<ReturnType<typeof repoFlags>>
}

/** What git writes between the old and the new name of a renamed file */
const renameArrow = ' -> '

/** The `XY ` that starts each line of `git status --porcelain` */
const statusPrefix = 3

/**
 * The paths git reports as changed, from the `git status --porcelain` lines, like ` M a.ts`, `?? b.txt` or `R  old -> new`
 * @param lines the lines
 * @returns the paths, relative to the clone
 */
export function changedPaths(lines: readonly string[]) {
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
 * Plan the fixes of a project from scratch: the file checks run on the files as they are now, and what they would change is planned on them, files with uncommitted changes included, which are listed as merged
 * @param options what to fix
 * @returns the plan, or the reason there is nothing to do
 */
export async function planOf(options: Readonly<FixOptions>): Promise<Plan | { reason: string }> {
  if (!isRepoName(options.name)) return { reason: `${options.name} is not a repo name` }
  const found = await findClone(options)
  if ('reason' in found) return found
  const io = diskIo(found.clone.path)
  const flags = await repoFlags(options.gh, `${options.owner}/${options.name}`)
  const { findings, plans } = await planAllFixes(options.rules.fileRules, io, flags)
  if (plans.length === 0) return { reason: `no file of ${options.owner}/${options.name} has a fix to apply` }
  const changed = changedPaths(found.clone.changedFiles)
  const installs = findings.flatMap(finding => finding.installs)
  return { clone: found.clone, fixable: plans, flags, installs: [...new Set(installs)].toSorted(), io, merged: plans.filter(plan => changed.has(plan.file)).map(plan => plan.file) }
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
