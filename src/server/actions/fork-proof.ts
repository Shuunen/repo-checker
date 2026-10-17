import { invariant } from 'es-toolkit'
import type { ForkStatus, GithubRepo, LocalClone } from '../../shared/project.ts'
import { checkProjectRules } from '../engine/runner.ts'
import { readForkStatus } from '../inventory/forks.ts'
import { getRepo } from '../inventory/github.ts'
import { pristineFork } from '../rules/sync/pristine-fork.rule.ts'
import type { ActionOptions } from './action-options.ts'
import { missingDeleteScope } from './delete-scope.ts'
import { checkFolderOfProjects, isRepoName } from './guards.ts'

/** The proof of a fork delete: the fork and its clean clone if it has one, or the reason to refuse */
export type ForkProof = { clone: LocalClone | undefined; ok: true; repo: GithubRepo; status: ForkStatus } | { ok: false; reason: string }

/**
 * Find the clone of the fork in the folder of projects, if there is one, and read it again with a fresh `git fetch`
 * @param options the action options
 * @param options.git how the clones are read
 * @param options.target the folder of projects
 * @param repo the fork
 * @returns the fresh clone, undefined when the fork is not cloned, or the reason to refuse
 */
async function findCloneOfFork({ git, target }: Readonly<ActionOptions>, repo: Readonly<GithubRepo>): Promise<{ clone: LocalClone | undefined } | { reason: string }> {
  const clones = await git.readClones(target, { shouldFetch: false })
  const matches = clones.filter(clone => clone.slug === repo.slug)
  const [match] = matches
  if (match === undefined) return { clone: undefined }
  if (matches.length > 1) return { reason: `${matches.length} clones of ${repo.slug} in ${target}, delete the extra ones by hand` }
  return { clone: await git.readClone(match.path, { shouldFetch: true }) }
}

/**
 * Prove the fork delete is still safe, from scratch: it is still a fork of the owner, every branch is compared with the parent again, no pull request is open, every comparison worked, its clone if any is fetched again and clean, and the gh token may delete. The strict `pristine-fork` rule has the last word. Nothing the page said is trusted
 * @param options what to act on
 * @returns the fork and its clean clone, or the reason to refuse
 * @throws {Error} when gh fails for a reason other than a 404
 * @example const proof = await proveFork({ gh: ghCli, git: realGit, name: 'qbt-theme', owner: 'Shuunen', target })
 */
export async function proveFork(options: Readonly<ActionOptions>): Promise<ForkProof> {
  const { gh, name, owner, target } = options
  if (!isRepoName(name)) return { ok: false, reason: `${name} is not a repo name` }
  const single = await checkFolderOfProjects(target)
  if (single !== undefined) return { ok: false, reason: single }
  const slug = `${owner}/${name}`
  const found = await getRepo(gh, slug)
  if (found === undefined) return { ok: false, reason: `${slug} does not exist on GitHub any more` }
  if (found.slug !== slug.toLowerCase()) return { ok: false, reason: `${slug} was renamed or moved to ${found.slug}, scan again` }
  if (!found.isFork) return { ok: false, reason: `${slug} is not a fork, this only applies to a fork` }
  const located = await findCloneOfFork(options, found)
  if ('reason' in located) return { ok: false, reason: located.reason }
  const status = await readForkStatus(gh, found)
  const repo = { ...found, forkStatus: status }
  const { findings } = await checkProjectRules([pristineFork], { github: repo, isOtherOwner: false, local: located.clone, name })
  const [finding] = findings
  invariant(finding !== undefined, 'the pristine-fork rule reports once on every fork')
  if (!finding.actions.includes('delete-fork')) return { ok: false, reason: `${slug}: ${finding.message}` }
  const scope = await missingDeleteScope(gh)
  return scope === undefined ? { clone: located.clone, ok: true, repo, status } : { ok: false, reason: scope }
}
