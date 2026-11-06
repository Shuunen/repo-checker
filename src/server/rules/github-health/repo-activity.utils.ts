import { invariant } from 'es-toolkit'
import { isOlderThan, monthsAgo } from '../../../shared/age.ts'
import type { GithubRepo, Project } from '../../../shared/project.ts'

/** A repo nobody of the account committed to for this many months is idle, the archive candidates and the stale repos that are not cloned */
const idleMonths = 12

/** A repo kept alive by the bots only is a zombie after this many months without a commit of the account, the bots make it look active so it does not need as long */
const zombieMonths = 6

/**
 * Tell if a project is an own repo that is alive: on GitHub, not archived, not a fork, not a clone of someone else
 * @param project the project
 * @returns true when the repo is alive
 */
export function isLiveOwnRepo(project: Readonly<Project>) {
  return project.github !== undefined && !project.github.isArchived && !project.github.isFork && !project.isOtherOwner
}

/**
 * Read the repo of a project in a rule whose appliesTo guarantees a live own repo
 * @param project the project
 * @returns the repo
 */
export function repoOf(project: Readonly<Project>): GithubRepo {
  invariant(project.github !== undefined, 'appliesTo guarantees a repo')
  return project.github
}

/** What `lastOwnCommitAt` holds for a repo the account never committed to */
const never = 'never'

/**
 * Tell if the account did not commit to a repo for a number of months, a repo it never committed to counts. A repo whose last commit was not read is not idle, nothing is known
 * @param repo the repo
 * @param months the number of months
 * @returns true when the last commit of the account is that old
 */
function isIdle(repo: Readonly<GithubRepo>, months: number) {
  return repo.lastOwnCommitAt === never || (repo.lastOwnCommitAt !== undefined && isOlderThan(repo.lastOwnCommitAt, months))
}

/**
 * Say how long the account did not commit to a repo
 * @param repo the repo, its last commit was read
 * @returns like `no commit from you for 14 months`
 */
export function idleText(repo: Readonly<GithubRepo>) {
  const { lastOwnCommitAt } = repo
  invariant(lastOwnCommitAt !== undefined, 'the callers checked the last commit was read')
  return lastOwnCommitAt === never ? 'you never committed to it' : `no commit from you for ${monthsAgo(lastOwnCommitAt)} months`
}

/**
 * Count the open Renovate pull requests of a repo, none when they were not read
 * @param repo the repo
 * @returns the count
 */
export function renovateCount(repo: Readonly<GithubRepo>) {
  return repo.pullRequests?.renovate ?? 0
}

/**
 * Tell if a repo is only kept alive by Renovate: the account did not commit for a while and bot pull requests are open
 * @param repo the repo
 * @returns true for a zombie
 */
export function isZombie(repo: Readonly<GithubRepo>) {
  return isIdle(repo, zombieMonths) && renovateCount(repo) > 0
}

/**
 * Tell if a repo that is cloned could be archived: idle, no star, nothing deployed, and not a zombie, which has its own message
 * @param repo the repo
 * @returns true for an archive candidate
 */
export function isArchiveCandidate(repo: Readonly<GithubRepo>) {
  return isIdle(repo, idleMonths) && repo.stars === 0 && repo.homepage === undefined && repo.hasPages === false && renovateCount(repo) === 0
}

/**
 * Tell if a repo that has no clone is old enough to be archived instead of cloned: alive, idle, and not a zombie, which has its own message. The caller knows the repo has no clone
 * @param project the project
 * @returns true when the repo is alive and idle
 */
export function isStaleUncloned(project: Readonly<Project>) {
  return isLiveOwnRepo(project) && isIdle(repoOf(project), idleMonths) && renovateCount(repoOf(project)) === 0
}
