import type { ActionKind } from '../../shared/action.ts'
import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { checkProjectRules } from '../engine/runner.ts'
import { readClone, readClones } from '../inventory/git.ts'
import { type GhRunner, getRepo } from '../inventory/github.ts'
import { archivedClone, archivedWithUnsavedWork } from '../rules/sync/archived.rule.ts'
import { checkFolderOfProjects, isRepoName } from './guards.ts'

/** How the clones are read, replaced by fakes in tests */
export interface GitReaders {
  /** Read one clone, with a `git fetch` when asked */
  readClone: typeof readClone
  /** Read every clone of a folder */
  readClones: typeof readClones
}

/** What an action on the clone of an archived repo needs */
export interface ArchivedOptions {
  /** Runs gh */
  gh: GhRunner
  /** How the clones are read, the real git in the server, a fake in tests */
  git: GitReaders
  /** The repo name, as asked by the page */
  name: string
  /** The GitHub owner the scan compares with */
  owner: string
  /** The folder of projects */
  target: string
}

/** The proof of an action: the clone to act on, or the reason to refuse */
export type Proof = { clone: LocalClone; ok: true } | { ok: false; reason: string }

/** The real git, the default of every action */
export const realGit: GitReaders = { readClone, readClones }

/**
 * Prove the repo is still archived on GitHub and not a fork, the only case `archived-clone` offers a delete for
 * @param gh runs gh
 * @param slug `owner/name`
 * @returns the repo, or the reason to refuse
 * @throws {Error} when gh fails for a reason other than a 404
 */
async function findRepo(gh: GhRunner, slug: string): Promise<{ repo: GithubRepo } | { reason: string }> {
  const repo = await getRepo(gh, slug)
  if (repo === undefined) return { reason: `${slug} does not exist on GitHub any more` }
  if (repo.slug !== slug.toLowerCase()) return { reason: `${slug} was renamed or moved to ${repo.slug}, scan again` }
  if (!repo.isArchived) return { reason: `${slug} is not archived, this only applies to the clone of an archived repo` }
  return repo.isFork ? { reason: `${slug} is a fork, its delete is the fork delete` } : { repo }
}

/**
 * Find the one clone of the repo in the folder of projects, and read it again with a fresh `git fetch`, so what is unpushed is measured against the real remote
 * @param target the folder of projects
 * @param repo the repo
 * @param git how the clones are read
 * @returns the fresh clone, or the reason to refuse
 */
async function findClone(target: string, repo: Readonly<GithubRepo>, git: GitReaders): Promise<{ clone: LocalClone } | { reason: string }> {
  const clones = await git.readClones(target, { shouldFetch: false })
  const matches = clones.filter(clone => clone.slug === repo.slug)
  const [match] = matches
  if (match === undefined) return { reason: `no clone of ${repo.slug} in ${target}` }
  if (matches.length > 1) return { reason: `${matches.length} clones of ${repo.slug} in ${target}, delete the extra ones by hand` }
  return { clone: await git.readClone(match.path, { shouldFetch: true }) }
}

/**
 * Ask the Sync rules, the ones that offered the action, if it is still offered on the freshly fetched clone
 * @param repo the repo
 * @param clone the freshly fetched clone
 * @param action the action asked for
 * @returns the reason to refuse, undefined when a rule still offers the action
 */
async function refusalOf(repo: Readonly<GithubRepo>, clone: Readonly<LocalClone>, action: ActionKind) {
  const { findings } = await checkProjectRules([archivedWithUnsavedWork, archivedClone], { github: repo, isOtherOwner: false, local: clone, name: repo.name })
  if (findings.some(finding => finding.actions.includes(action))) return undefined
  return `${repo.slug}: ${findings[0]?.message ?? `the clone does not qualify for ${action}`}`
}

/**
 * Prove the action is still right, from scratch: a folder of projects, a repo still archived on GitHub, one clone, fetched again, on which a Sync rule still offers the action. Nothing the page said is trusted
 * @param options what to act on
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.target the folder of projects
 * @param action the action asked for, a Sync rule must still offer it
 * @returns the clone to act on, or the reason to refuse
 * @throws {Error} when gh fails for a reason other than a 404
 * @example const proof = await proveArchived({ gh: ghCli, name: 'jozzo', owner: 'Shuunen', target }, 'delete-clone')
 */
export async function proveArchived({ gh, git, name, owner, target }: Readonly<ArchivedOptions>, action: ActionKind): Promise<Proof> {
  if (!isRepoName(name)) return { ok: false, reason: `${name} is not a repo name` }
  const single = await checkFolderOfProjects(target)
  if (single !== undefined) return { ok: false, reason: single }
  const found = await findRepo(gh, `${owner}/${name}`)
  if ('reason' in found) return { ok: false, reason: found.reason }
  const located = await findClone(target, found.repo, git)
  if ('reason' in located) return { ok: false, reason: located.reason }
  const reason = await refusalOf(found.repo, located.clone, action)
  return reason === undefined ? { clone: located.clone, ok: true } : { ok: false, reason }
}
