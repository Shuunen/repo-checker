import { invariant } from 'es-toolkit'
import type { ForkStatus, GithubRepo, LocalClone } from '../../shared/project.ts'
import { checkProjectRules } from '../engine/runner.ts'
import { readForkStatus } from '../inventory/forks.ts'
import { getRepo } from '../inventory/github.ts'
import { pristineFork } from '../rules/sync/pristine-fork.rule.ts'
import type { ActionOptions } from './action-options.ts'
import { missingDeleteScope } from './delete-scope.ts'
import { checkFolderOfProjects, findCloneOf } from './guards.ts'
import { refused } from '../../shared/action.ts'

/** The proof of a fork delete: the fork and its clean clone if it has one, or the reason to refuse */
export type ForkProof = { clone: LocalClone | undefined; ok: true; repo: GithubRepo; status: ForkStatus } | { ok: false; reason: string }

/**
 * Prove the fork delete is still safe, from scratch: it is still a fork of the owner, every branch is compared with the parent again, no pull request is open, every comparison worked, its clone if any is fetched again and clean, and the gh token may delete. The strict `pristine-fork` rule has the last word. Nothing the page said is trusted
 * @param options what to act on
 * @returns the fork and its clean clone, or the reason to refuse
 * @throws {Error} when gh fails for a reason other than a 404
 * @example const proof = await proveFork({ gh: ghCli, git: realGit, name: 'qbt-theme', owner: 'Shuunen', target })
 */
export async function proveFork(options: Readonly<ActionOptions>): Promise<ForkProof> {
  const { gh, git, name, owner, target } = options
  const single = await checkFolderOfProjects(target)
  if (single !== undefined) return refused(single)
  const slug = `${owner}/${name}`
  const found = await getRepo(gh, slug)
  if (found === undefined) return refused(`${slug} does not exist on GitHub any more`)
  if (found.slug !== slug.toLowerCase()) return refused(`${slug} was renamed or moved to ${found.slug}, scan again`)
  if (!found.isFork) return refused(`${slug} is not a fork, this only applies to a fork`)
  const located = await findCloneOf({ git, target }, found.slug, { shouldFetch: true })
  if ('reason' in located) return refused(located.reason)
  const status = await readForkStatus(gh, found)
  const repo = { ...found, forkStatus: status }
  const { findings } = await checkProjectRules([pristineFork], { github: repo, isOtherOwner: false, local: located.clone, name })
  const [finding] = findings
  invariant(finding !== undefined, 'the pristine-fork rule reports once on every fork')
  if (!finding.actions.includes('delete-fork')) return refused(`${slug}: ${finding.message}`)
  const scope = await missingDeleteScope(gh)
  return scope === undefined ? { clone: located.clone, ok: true, repo, status } : refused(scope)
}
