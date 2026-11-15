import { invariant } from 'es-toolkit'
import type { ForkStatus, LocalClone } from '../../../shared/project.ts'
import { defineProjectRule } from '../../engine/define-project-rule.ts'
import { unsavedWork } from './sync.utils.ts'

/**
 * List what keeps a fork from being deleted: work that is not in the parent, or a local clone that is not clean
 * @param status the fork status
 * @param local the local clone, undefined when the fork is not cloned
 * @returns the reasons, empty for a pristine fork
 */
function forkBlockers(status: Readonly<ForkStatus>, local: Readonly<LocalClone> | undefined) {
  const ahead = status.branches.filter(branch => branch.aheadBy > 0).map(branch => `${branch.name} is ${branch.aheadBy} ahead`)
  const pulls = status.openPullRequests > 0 ? [`${status.openPullRequests} open pull request${status.openPullRequests > 1 ? 's' : ''}`] : []
  const clone = local === undefined ? [] : [...(local.fetchFailed ? ['the local clone could not be fetched'] : []), ...unsavedWork(local).map(work => `local clone has ${work}`)]
  return [...ahead, ...pulls, ...clone]
}

export const pristineFork = defineProjectRule({
  appliesTo: ({ project }) => project.github?.isFork === true,
  check({ project: { github, local }, report }) {
    invariant(github !== undefined, 'appliesTo guarantees a fork')
    const status = github.forkStatus
    if (status === undefined) return report({ messageId: 'notChecked' })
    if (status.failures.length > 0) return report({ data: { reason: status.failures.join('; ') }, messageId: 'cannotVerify' })
    const blockers = forkBlockers(status, local)
    if (blockers.length > 0) return report({ data: { parent: status.parent, reasons: blockers.join(', ') }, messageId: 'kept' })
    return report({ actions: ['delete-fork'], data: { parent: status.parent }, messageId: local === undefined ? 'pristine' : 'pristineWithClone' })
  },
  meta: {
    id: 'pristine-fork',
    messages: {
      cannotVerify: 'a fork that cannot be verified, so it is never offered for deletion: {{reason}}',
      kept: 'a fork of {{parent}} with work to keep: {{reasons}}',
      notChecked: 'a fork that was not compared with its parent yet, so it is never offered for deletion',
      pristine: 'a pristine fork of {{parent}}: every branch is in the parent and no pull request is open',
      pristineWithClone: 'a pristine fork of {{parent}}: every branch is in the parent and no pull request is open, its clean local clone is deleted with it',
    },
    severity: 'info',
  },
})
