import { invariant } from 'es-toolkit'
import { defineProjectRule, type ProjectContext } from '../../engine/define-project-rule.ts'
import { hasUsableClone, isArchivedRepo, unsavedWork } from './sync.utils.ts'

/**
 * Tell if the archive rules apply: an archived repo, not a fork, with a usable clone
 * @param context the project context
 * @param context.project the project
 * @returns true when they apply
 */
function isArchivedClone({ project }: Readonly<ProjectContext>) {
  return isArchivedRepo(project) && hasUsableClone(project)
}

export const archivedWithUnsavedWork = defineProjectRule({
  appliesTo: isArchivedClone,
  check({ project: { local }, report }) {
    invariant(local !== undefined, 'appliesTo guarantees a usable clone')
    const work = unsavedWork(local).join(', ')
    if (work === '') return
    if (local.fetchFailed) report({ data: { work }, messageId: 'unsavedNoFetch' })
    else report({ actions: ['unarchive-push', 'discard'], data: { work }, messageId: 'unsaved' })
  },
  meta: {
    id: 'archived-with-unsaved-work',
    messages: { unsaved: 'archived on GitHub, but the clone holds work that exists nowhere else: {{work}}', unsavedNoFetch: 'archived on GitHub, but the clone holds work that exists nowhere else: {{work}}. The fetch failed, nothing is offered until it works' },
    severity: 'error',
  },
})

export const archivedClone = defineProjectRule({
  appliesTo: isArchivedClone,
  check({ project: { local }, report }) {
    invariant(local !== undefined, 'appliesTo guarantees a usable clone')
    if (unsavedWork(local).length > 0) return
    if (local.fetchFailed) report({ messageId: 'cannotVerify' })
    else report({ actions: ['delete-clone'], messageId: 'safe' })
  },
  meta: {
    id: 'archived-clone',
    messages: { cannotVerify: 'archived on GitHub, but the fetch failed so the clone cannot be proved safe to delete', safe: 'archived on GitHub, and the clone holds nothing that is not on GitHub' },
    severity: 'info',
  },
})
