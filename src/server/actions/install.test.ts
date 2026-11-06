import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { writeArgsRecorder } from '../fake-command-fixtures.ts'
import { realInstall } from './install.ts'

/**
 * Make a project folder and a bin folder with a fake package manager that writes its arguments in `args.txt`, put first in the PATH
 * @param manager the package manager to fake
 * @param lockfile the lockfile of the project, none when omitted
 * @returns the project folder
 */
async function makeProject(manager: 'bun' | 'pnpm', lockfile?: string) {
  const root = await mkdtemp(path.join(tmpdir(), 'repo-check-install-'))
  onTestFinished(() => rm(root, { force: true, recursive: true }))
  const folder = path.join(root, 'app')
  const bin = path.join(root, 'bin')
  await Promise.all([mkdir(folder), mkdir(bin)])
  await writeArgsRecorder(bin, manager, path.join(folder, 'args.txt'))
  if (lockfile !== undefined) await writeFile(path.join(folder, lockfile), '')
  return folder
}

describe(realInstall, () => {
  it.each([
    { args: 'add --save-dev --save-prefix=~ knip vitest', lockfile: undefined, manager: 'pnpm' as const, name: 'a project without lockfile' },
    { args: 'add --save-dev --save-prefix=~ knip vitest', lockfile: 'pnpm-lock.yaml', manager: 'pnpm' as const, name: 'a pnpm project' },
    { args: 'add --dev --tilde knip vitest', lockfile: 'bun.lock', manager: 'bun' as const, name: 'a bun project' },
    { args: 'add --dev --tilde knip vitest', lockfile: 'bun.lockb', manager: 'bun' as const, name: 'an old bun project' },
  ])('installs with the right package manager for $name', async ({ args, lockfile, manager }) => {
    expect.hasAssertions()
    const folder = await makeProject(manager, lockfile)
    await expect(realInstall(folder, ['knip', 'vitest'])).resolves.toMatchObject({ ok: true })
    await expect(readFile(path.join(folder, 'args.txt'), 'utf8')).resolves.toBe(`${args}\n`)
  })
})
