import { readdir } from 'node:fs/promises'
import path from 'node:path'
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

/**
 * Parse one line of `git for-each-ref` with the name, upstream, track and date fields separated by tabs
 * @param line like `master\torigin/master\t[ahead 1, behind 2]\t2026-01-01T10:00:00+00:00`
 * @param merged the names of the branches merged into the default branch of the remote
 * @returns the branch state
 */
function parseBranch(line: string, merged: ReadonlySet<string>): BranchState {
  const [name = '', upstream = '', track = '', lastCommitAt = ''] = line.split('\t')
  const ahead = Number(/ahead (?<count>\d+)/u.exec(track)?.groups?.count ?? 0)
  const behind = Number(/behind (?<count>\d+)/u.exec(track)?.groups?.count ?? 0)
  return { ahead, behind, isGone: track === '[gone]', isMerged: merged.has(name), lastCommitAt, name, upstream: upstream === '' ? undefined : upstream }
}

/** The remote name of a clone, the checks only know `origin` */
const remote = 'origin'

/**
 * Parse one line of `git for-each-ref refs/remotes/origin` with the name and date fields separated by a tab
 * @param line like `origin/feature\t2026-01-01T10:00:00+00:00`
 * @param merged the names of the remote refs merged into the default branch of the remote
 * @returns the remote branch, undefined for the `HEAD` pointer of the remote
 */
function parseRemoteBranch(line: string, merged: ReadonlySet<string>): RemoteBranch | undefined {
  const [ref = '', lastCommitAt = ''] = line.split('\t')
  const name = ref.replace(`${remote}/`, '')
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
  const [[currentBranch = ''], refs, changedFiles, stashes, mergedLocal, remoteRefs, mergedRemote, lastTag] = await Promise.all([
    gitLines(folder, ['branch', '--show-current']),
    gitLines(folder, ['for-each-ref', '--format=%(refname:short)%09%(upstream:short)%09%(upstream:track)%09%(committerdate:iso-strict)', 'refs/heads']),
    gitLines(folder, ['status', '--porcelain=v1']),
    gitLines(folder, ['stash', 'list']),
    gitLines(folder, ['for-each-ref', '--format=%(refname:short)', `--merged=${remote}/HEAD`, 'refs/heads']),
    gitLines(folder, ['for-each-ref', '--format=%(refname:short)%09%(committerdate:iso-strict)', `refs/remotes/${remote}`]),
    gitLines(folder, ['for-each-ref', '--format=%(refname:short)', `--merged=${remote}/HEAD`, `refs/remotes/${remote}`]),
    readLastTag(folder),
  ])
  const branches = refs.map(line => parseBranch(line, new Set(mergedLocal)))
  const localOnlyBranches = branches.filter(branch => branch.upstream === undefined || branch.isGone).map(branch => branch.name)
  const remoteBranches = remoteRefs.map(line => parseRemoteBranch(line, new Set(mergedRemote))).filter(branch => branch !== undefined)
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

/**
 * Read one local folder: whether it is a usable clone, its origin, then its git state after an optional fetch
 * @param folder the absolute folder path
 * @param options the options
 * @param options.shouldFetch run `git fetch --prune` first, so the comparison with the remote is current
 * @returns what the scan knows about the folder
 */
export async function readClone(folder: string, { shouldFetch }: Readonly<{ shouldFetch: boolean }>): Promise<LocalClone> {
  const base = { branches: [], changedFiles: [], currentBranch: '', fetchFailed: false, folderName: path.basename(folder), lastTag: undefined, localOnlyBranches: [], origin: undefined, path: folder, remoteBranches: [], slug: undefined, stashes: [], unpushed: [] }
  if (!(await isGitRoot(folder))) return { ...base, problem: 'no-git' }
  const url = await run('git', ['remote', 'get-url', remote], folder)
  if (!url.ok) return { ...base, problem: 'no-origin' }
  const fetched = shouldFetch ? await run('git', ['fetch', '--prune', '--quiet', remote], folder) : { ok: true }
  const origin = url.stdout.trim()
  return { ...base, ...(await readState(folder)), fetchFailed: !fetched.ok, origin, problem: undefined, slug: githubSlug(origin) }
}

/**
 * Read the clones of a target: the target itself when it is a git repo (single project mode), else every visible sub folder (folder mode)
 * @param target the absolute path of the target folder
 * @param options the options
 * @param options.shouldFetch run `git fetch --prune` in each clone first
 * @returns the clones, sorted by folder name
 */
export async function readClones(target: string, options: Readonly<{ shouldFetch: boolean }>) {
  if (await isGitRoot(target)) return [await readClone(target, options)]
  const entries = await readdir(target, { withFileTypes: true })
  const folders = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.')).map(entry => path.join(target, entry.name))
  return mapLimit(folders.toSorted(), parallelClones, folder => readClone(folder, options))
}
