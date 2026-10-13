import type { ActionResult, FixPreview } from '../../shared/action.ts'
import { plural } from '../../shared/text.ts'
import { buildContext } from '../engine/context.ts'
import { diskIo } from '../engine/io.ts'
import { checkProject } from '../engine/runner.ts'
import { type ApplyOptions, blockedReason, fingerprintOf, type FixOptions, planOf } from './fix-plan.ts'

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
    return { blocked: plan.blocked, fingerprint: fingerprintOf(plan.fixable), ok: true, path: plan.clone.path, plans: plan.fixable }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Apply the file fixes of a project: the plan is made again from the files as they are now and refused unless it is exactly the plan the user confirmed, then each file is written and the checks run again to say what is left. A file with uncommitted changes is never written. Nothing is committed: git shows the change and can undo it
 * @param options what to fix, with the fingerprint of the confirmed plan
 * @returns the result, refused with the reason when the plan changed
 * @example const result = await fixFiles({ fingerprint: preview.fingerprint, gh: ghCli, git: realGit, name: 'app', owner: 'Shuunen', rules, target })
 */
export async function fixFiles(options: Readonly<ApplyOptions>): Promise<ActionResult> {
  try {
    const plan = await planOf(options)
    if ('reason' in plan) return { ok: false, reason: plan.reason }
    if (plan.fixable.length === 0 || fingerprintOf(plan.fixable) !== options.fingerprint) return { ok: false, reason: 'the fixes are not what the dialog listed any more, nothing was written, open the dialog again' }
    await Promise.all(plan.fixable.map(item => plan.io.writeText(item.file, item.after)))
    const { findings } = await checkProject(options.rules.fileRules, await buildContext(diskIo(plan.clone.path)))
    const left = findings.filter(finding => finding.edits.length > 0).length
    return { message: `fixed ${plural(plan.fixable.length, 'file')} (${plan.fixable.map(item => item.file).join(', ')}), ${left === 0 ? 'no fix left' : `${plural(left, 'finding')} left with a fix`}, check git diff`, ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
