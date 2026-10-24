import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { partition } from 'es-toolkit'
import type { BranchState, LastTag, LocalClone, RemoteBranch } from '../../shared/project.ts'
import { mapLimit } from './map-limit.ts'
import { run } from './shell.ts'

/** How many clones are read at the same time, fetches are network bound */
const parallelClones = 8

/**
 * Get the `owner/name` of a GitHub url
 * @param url an ssh or https remote url
 * @returns `owner/name` lowercase, undefined when it is not a GitHub url
 * @example githubSlug('git@github.com:Shuunen/repo-checker.git') // 'shuunen/repo-checker'
 */
export function githubSlug(url: string) {
  const groups = /github\.com[:/](?<owner>[\w.-]+)\/(?<name>[\w.-]+?)(?:\.git)?\/?$/u.exec(url.trim())?.groups
  return groups === undefined ? undefined : `${groups.owner}/${groups.name}`.toLowerCase()
}

/**
 * Run git in a folder and split its output in lines
 * @param folder the folder
 * @param args the git arguments
 * @returns the non empty output lines, none when the command failed
 */
async function gitLines(folder: string, args: readonly string[]) {
  const { stdout } = await run('git', args, folder)
  return stdout.split('\n').filter(line => line.trim() !== '')
}

/** The fields `parseBranch` and `parseRemoteBranch` read, separated by tabs: the full ref, its short name, the upstream, the track and the date */
const refFormat = '--format=%(refname)%09%(refname:short)%09%(upstream:short)%09%(upstream:track)%09%(committerdate:iso-strict)'

/**
 * Split one line of `git for-each-ref` in the `refFormat`
 * @param line like `refs/heads/master\tmaster\torigin/master\t[ahead 1]\t2026-01-01T10:00:00+00:00`
 * @returns the fields
 */
function splitRef(line: string) {
  const [ref = '', name = '', upstream = '', track = '', lastCommitAt = ''] = line.split('\t')
  return { lastCommitAt, name, ref, track, upstream }
}

/**
 * Parse one local branch line of `git for-each-ref` in the `refFormat`
 * @param line like `refs/heads/master\tmaster\torigin/master\t[ahead 1, behind 2]\t2026-01-01T10:00:00+00:00`
 * @param merged the full refs merged into the default branch of the remote
 * @returns the branch state
 */
function parseBranch(line: string, merged: ReadonlySet<string>): BranchState {
  const { lastCommitAt, name, ref, track, upstream } = splitRef(line)
  const ahead = Number(/ahead (?<count>\d+)/u.exec(track)?.groups?.count ?? 0)
  const behind = Number(/behind (?<count>\d+)/u.exec(track)?.groups?.count ?? 0)
  return { ahead, behind, isGone: track === '[gone]', isMerged: merged.has(ref), lastCommitAt, name, upstream: upstream === '' ? undefined : upstream }
}

/** The remote name of a clone, the checks only know `origin` */
const remote = 'origin'

/**
 * Parse one remote branch line of `git for-each-ref` in the `refFormat`
 * @param line like `refs/remotes/origin/feature\torigin/feature\t\t\t2026-01-01T10:00:00+00:00`
 * @param merged the full refs merged into the default branch of the remote
 * @returns the remote branch, undefined for the `HEAD` pointer of the remote
 */
function parseRemoteBranch(line: string, merged: ReadonlySet<string>): RemoteBranch | undefined {
  const { lastCommitAt, name: short, ref } = splitRef(line)
  const name = short.replace(`${remote}/`, '')
  return name === remote || name === 'HEAD' ? undefined : { isMerged: merged.has(ref), lastCommitAt, name }
}

/**
 * Read the most recent tag and how many commits came after it
 * @param folder the clone folder
 * @returns the tag, undefined when the clone has none
 */
async function readLastTag(folder: string): Promise<LastTag | undefined> {
  const [line] = await gitLines(folder, ['for-each-ref', '--sort=-creatordate', '--count=1', '--format=%(refname:short)%09%(creatordate:iso-strict)', 'refs/tags'])
  if (line === undefined) return undefined
  const [name = '', at = ''] = line.split('\t')
  const [count = '0'] = await gitLines(folder, ['rev-list', '--count', `${name}..HEAD`])
  return { at, commitsSince: Number(count), name }
}

/**
 * List the commits of each branch that are ahead of its upstream
 * @param folder the clone folder
 * @param branches the branch states
 * @returns the unpushed commit subjects, per branch
 */
function readUnpushed(folder: string, branches: readonly BranchState[]) {
  const ahead = branches.filter(branch => branch.ahead > 0 && branch.upstream !== undefined)
  return Promise.all(ahead.map(async branch => ({ branch: branch.name, subjects: await gitLines(folder, ['log', '--format=%s', `${branch.upstream}..${branch.name}`]) })))
}

/**
 * Read the local state of a usable clone: branches, changes, stash and unpushed commits
 * @param folder the clone folder
 * @returns the local state
 */
async function readState(folder: string) {
  const refs = ['refs/heads', `refs/remotes/${remote}`]
  const [[currentBranch = ''], lines, changedFiles, stashes, mergedRefs, lastTag] = await Promise.all([
    gitLines(folder, ['branch', '--show-current']),
    gitLines(folder, ['for-each-ref', refFormat, ...refs]),
    gitLines(folder, ['status', '--porcelain=v1']),
    gitLines(folder, ['stash', 'list']),
    gitLines(folder, ['for-each-ref', '--format=%(refname)', `--merged=${remote}/HEAD`, ...refs]),
    readLastTag(folder),
  ])
  const merged = new Set(mergedRefs)
  const [localLines, remoteLines] = partition(lines, line => line.startsWith('refs/heads/'))
  const branches = localLines.map(line => parseBranch(line, merged))
  const localOnlyBranches = branches.filter(branch => branch.upstream === undefined || branch.isGone).map(branch => branch.name)
  const remoteBranches = remoteLines.map(line => parseRemoteBranch(line, merged)).filter(branch => branch !== undefined)
  return { branches, changedFiles, currentBranch, lastTag, localOnlyBranches, remoteBranches, stashes, unpushed: await readUnpushed(folder, branches) }
}

/**
 * Tell if a folder is the top of a git repo, a folder inside another repo is not
 * @param folder the absolute folder path
 * @returns true when it is a git repo root
 */
async function isGitRoot(folder: string) {
  const { ok, stdout } = await run('git', ['rev-parse', '--show-toplevel'], folder)
  return ok && path.resolve(stdout.trim()) === path.resolve(folder)
}

/** Where a clone is and which repo it is, without its git state: what finding one clone among many needs */
type ClonePointer = Pick<LocalClone, 'folderName' | 'origin' | 'path' | 'problem' | 'slug'>

/**
 * Point to one local folder: whether it is a usable clone and its origin, two git calls, its git state is not read
 * @param folder the absolute folder path
 * @returns where the folder is and which repo it is
 * @example const pointer = await pointTo('/projects/finga')
 */
async function pointTo(folder: string): Promise<ClonePointer> {
  const base = { folderName: path.basename(folder), origin: undefined, path: folder, slug: undefined }
  if (!(await isGitRoot(folder))) return { ...base, problem: 'no-git' }
  const url = await run('git', ['remote', 'get-url', remote], folder)
  if (!url.ok) return { ...base, problem: 'no-origin' }
  const origin = url.stdout.trim()
  return { ...base, origin, problem: undefined, slug: githubSlug(origin) }
}

/**
 * Read one local folder: whether it is a usable clone, its origin, then its git state after an optional fetch
 * @param folder the absolute folder path
 * @param options the options
 * @param options.shouldFetch run `git fetch --prune` first, so the comparison with the remote is current
 * @returns what the scan knows about the folder
 */
export async function readClone(folder: string, { shouldFetch }: Readonly<{ shouldFetch: boolean }>): Promise<LocalClone> {
  const pointer = await pointTo(folder)
  const base = { branches: [], changedFiles: [], currentBranch: '', fetchFailed: false, lastTag: undefined, localOnlyBranches: [], remoteBranches: [], stashes: [], unpushed: [], ...pointer }
  if (pointer.problem !== undefined) return base
  const fetched = shouldFetch ? await run('git', ['fetch', '--prune', '--quiet', remote], folder) : { ok: true }
  return { ...base, ...(await readState(folder)), fetchFailed: !fetched.ok }
}

/**
 * The folders a target holds: the target itself when it is a git repo (single project mode), else every visible sub folder (folder mode)
 * @param target the absolute path of the target folder
 * @returns the folders, sorted
 */
async function foldersOf(target: string) {
  if (await isGitRoot(target)) return [target]
  const entries = await readdir(target, { withFileTypes: true })
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => path.join(target, entry.name))
    .toSorted()
}

/**
 * Read the clones of a target: the target itself when it is a git repo (single project mode), else every visible sub folder (folder mode)
 * @param target the absolute path of the target folder
 * @param options the options
 * @param options.shouldFetch run `git fetch --prune` in each clone first
 * @returns the clones, sorted by folder name
 */
export async function readClones(target: string, options: Readonly<{ shouldFetch: boolean }>) {
  return mapLimit(await foldersOf(target), parallelClones, folder => readClone(folder, options))
}

/**
 * Point to the clones of a target without reading their git state, the cheap way to find one clone among many: two git calls per folder instead of a dozen
 * @param target the absolute path of the target folder
 * @returns where each clone is and which repo it is, sorted by folder name
 * @example const [match] = (await listClones(target)).filter(clone => clone.slug === 'shuunen/finga')
 */
export async function listClones(target: string) {
  return mapLimit(await foldersOf(target), parallelClones, pointTo)
}

/** How the clones are read, replaced by fakes in tests */
export interface GitReaders {
  /** Point to every clone of a folder, without reading their git state */
  listClones: typeof listClones
  /** Read one clone, with a `git fetch` when asked */
  readClone: typeof readClone
}
