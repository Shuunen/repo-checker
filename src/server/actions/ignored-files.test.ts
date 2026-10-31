import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { run } from '../inventory/shell.ts'
import { listIgnoredFiles } from './ignored-files.ts'

/**
 * Create a folder, removed when the test ends
 * @returns the folder path
 */
async function makeFolder() {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-ignored-'))
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  return folder
}

describe(listIgnoredFiles, () => {
  it('lists the ignored files that are not rebuildable, a folder once', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await run('git', ['init', '--quiet'], folder)
    await writeFile(path.join(folder, '.gitignore'), '.env\nnode_modules/\ndist/\ndata/\n')
    await writeFile(path.join(folder, '.env'), 'SECRET=1')
    await writeFile(path.join(folder, 'tracked.txt'), 'hello')
    await Promise.all(['node_modules/a', 'dist', 'data'].map(ignored => mkdir(path.join(folder, ignored), { recursive: true })))
    await writeFile(path.join(folder, 'data', 'local.db'), 'x')
    await expect(listIgnoredFiles(folder)).resolves.toStrictEqual(['.env', 'data/'])
  })

  it('lists nothing for a clone without ignored files, and ignores nested rebuildable folders', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await run('git', ['init', '--quiet'], folder)
    await writeFile(path.join(folder, '.gitignore'), 'node_modules/\n')
    await mkdir(path.join(folder, 'packages', 'a', 'node_modules'), { recursive: true })
    await writeFile(path.join(folder, 'packages', 'a', 'node_modules', 'index.js'), 'x')
    await expect(listIgnoredFiles(folder)).resolves.toStrictEqual([])
  })

  it('fails when git cannot list them', async () => {
    expect.hasAssertions()
    const missing = path.join(await makeFolder(), 'missing')
    await expect(listIgnoredFiles(missing)).rejects.toThrow('git ls-files failed in')
  })
})
