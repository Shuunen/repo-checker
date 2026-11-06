import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../shared/project.ts'
import type { GhRunner } from '../inventory/github.ts'
import { readClone } from '../inventory/git.ts'
import { run } from '../inventory/shell.ts'
import type { GitReaders } from './action-options.ts'
import { previewDiscard } from './discard.ts'

const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false']
export const apiRepo = { archived: true, fork: false, name: 'old', owner: { login: 'Owner' }, private: false, pushed_at: '2025-01-01T00:00:00Z' }

/**
 * Run git in a folder, failing the test when git fails
 * @param folder the folder
 * @param args the git arguments
 * @returns the output
 */
export async function git(folder: string, ...args: readonly string[]) {
  const result = await run('git', [...identity, ...args], folder)
  if (!result.ok) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout.trim()
}

/** A real clone with every kind of unsaved work, and the fake git readers that read it */
export interface Workspace {
  /** The clone */
  folder: string
  /** The folder of projects */
  target: string
  /** The readers: the real git, with the slug the origin url would give on GitHub */
  git: GitReaders
}

/**
 * Give a clone read from disk the slug its origin url would give on GitHub
 * @param clone the clone
 * @returns the clone
 */
function withSlug(clone: LocalClone): LocalClone {
  return { ...clone, slug: 'owner/old' }
}

/**
 * Create a bare origin and a real clone that holds every kind of unsaved work: commits ahead on master and on feature, a local-only branch wip with a commit, a modified file, an untracked file, a stash, and an ignored `.env`
 * @returns the workspace
 */
export async function makeWorkspace(): Promise<Workspace> {
  const target = await mkdtemp(path.join(tmpdir(), 'repo-check-discard-'))
  onTestFinished(() => rm(target, { force: true, recursive: true }))
  const [bare, seed, folder] = ['origin.git', 'seed', 'old'].map(name => path.join(target, name))
  await git(target, 'init', '--quiet', '--bare', '--initial-branch=master', 'origin.git')
  await git(target, 'init', '--quiet', '--initial-branch=master', 'seed')
  await writeFile(path.join(seed ?? '', '.gitignore'), '.env\n')
  await writeFile(path.join(seed ?? '', 'a.txt'), 'a')
  await git(seed ?? '', 'add', '.')
  await git(seed ?? '', 'commit', '--quiet', '-m', 'init')
  await git(seed ?? '', 'remote', 'add', 'origin', bare ?? '')
  await git(seed ?? '', 'push', '--quiet', 'origin', 'master')
  await git(seed ?? '', 'push', '--quiet', 'origin', 'master:feature')
  await git(target, 'clone', '--quiet', bare ?? '', 'old')
  const dir = folder ?? ''
  await git(dir, 'branch', 'feature', 'origin/feature')
  await git(dir, 'commit', '--quiet', '--allow-empty', '-m', 'unpushed on master')
  await git(dir, 'checkout', '--quiet', 'feature')
  await git(dir, 'commit', '--quiet', '--allow-empty', '-m', 'unpushed on feature')
  await git(dir, 'checkout', '--quiet', '-b', 'wip')
  await git(dir, 'commit', '--quiet', '--allow-empty', '-m', 'wip work')
  await git(dir, 'checkout', '--quiet', 'master')
  await writeFile(path.join(dir, 'a.txt'), 'stashed')
  await git(dir, 'stash', 'push', '--quiet', '-m', 'saved for later')
  await writeFile(path.join(dir, 'a.txt'), 'changed')
  await writeFile(path.join(dir, 'notes.txt'), 'untracked')
  await writeFile(path.join(dir, '.env'), 'SECRET=1')
  const reader: GitReaders = { listClones: () => Promise.resolve([{ folderName: 'old', origin: bare, path: dir, problem: undefined, slug: 'owner/old' }]), readClone: async (file, options) => withSlug(await readClone(file, options)) }
  return { folder: dir, git: reader, target }
}

/**
 * A fake gh that answers the repo
 * @param repo the API repo
 * @returns the fake runner
 */
export function fakeGh(repo: Readonly<Record<string, unknown>> = apiRepo) {
  return vi.fn<GhRunner>(() => Promise.resolve({ ok: true, stderr: '', stdout: JSON.stringify(repo) }))
}

/**
 * The preview of what a discard would throw away now, when it is offered
 * @param readers the git readers
 * @param target the folder of projects
 * @returns the preview
 * @throws {Error} when the preview is refused
 */
export async function okPreview(readers: GitReaders, target: string) {
  const preview = await previewDiscard({ gh: fakeGh(), git: readers, name: 'old', owner: 'Owner', target })
  if (!preview.ok) throw new Error(preview.reason)
  return preview
}

/**
 * Make git forget which branch is the default of GitHub, when asked
 * @param folder the clone
 * @param isForgotten true to forget it
 */
export async function forgetDefaultBranch(folder: string, isForgotten: boolean) {
  if (!isForgotten) return
  await git(folder, 'remote', 'set-head', 'origin', '--delete')
  // git 2.48+ creates origin/HEAD again on the next fetch unless told not to
  await git(folder, 'config', 'remote.origin.followRemoteHEAD', 'never')
}

/** How many times a discard reads the clone before the check that it is clean: the preview, the proof, the fresh proof */
const readsBeforeLeftover = 2

/**
 * A clone that still holds an uncommitted file after a number of reads, to fake a discard that leaves something behind
 * @param clone the clone as read
 * @param reads how many times the clone was read
 * @returns the clone
 */
export function leftBehindAfter(clone: LocalClone, reads: number): LocalClone {
  return reads > readsBeforeLeftover ? { ...clone, changedFiles: ['?? left-behind.txt'] } : clone
}

/**
 * The fingerprint of what a discard would throw away now
 * @param readers the git readers
 * @param target the folder of projects
 * @returns the fingerprint
 * @throws {Error} when the preview is refused
 */
export async function fingerprintFor(readers: GitReaders, target: string) {
  const preview = await okPreview(readers, target)
  return preview.fingerprint
}

/**
 * The fingerprint of what a discard would throw away now, for a workspace
 * @param workspace the workspace
 * @param workspace.git the git readers
 * @param workspace.target the folder of projects
 * @returns the fingerprint
 */
export function fingerprintOf({ git: readers, target }: Readonly<Workspace>) {
  return fingerprintFor(readers, target)
}
