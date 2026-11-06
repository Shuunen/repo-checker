import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { run } from './inventory/shell.ts'

/**
 * Create a throwaway git repo with one commit, removed when the test ends
 * @returns the folder path
 */
export async function makeRepo() {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-repo-'))
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  await run('git', ['init', '--quiet', '--initial-branch=main'], folder)
  await writeFile(path.join(folder, 'package.json'), '{}')
  await run('git', ['add', '.'], folder)
  await run('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.t', 'commit', '--quiet', '-m', 'init'], folder)
  return folder
}
