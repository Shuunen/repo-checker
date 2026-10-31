import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { realCheck } from './check-script.ts'

/**
 * Create a folder with the given files
 * @param files the file names and their text
 * @returns the folder
 */
async function makeFolder(files: Readonly<Record<string, string>>) {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-script-'))
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  await mkdir(folder, { recursive: true })
  await Promise.all(Object.entries(files).map(([file, text]) => writeFile(path.join(folder, file), text)))
  return folder
}

describe(realCheck, () => {
  it.each([
    ['no package.json', {}],
    ['a package.json that is not json', { 'package.json': 'oops' }],
    ['a package.json without scripts', { 'package.json': '{}' }],
    ['a package.json without a check script', { 'package.json': '{"scripts":{"test":"x"}}' }],
  ])('has nothing to run with %s', async (_name, files) => {
    expect.hasAssertions()
    const onStart = vi.fn<() => void>()
    await expect(realCheck(await makeFolder(files), onStart)).resolves.toBeUndefined()
    expect(onStart).not.toHaveBeenCalled()
  })

  it('runs the check script with pnpm and reports a failure', async () => {
    expect.hasAssertions()
    const onStart = vi.fn<() => void>()
    const result = await realCheck(await makeFolder({ 'package.json': '{"scripts":{"check":"exit 1"}}' }), onStart)
    expect(result?.ok).toBe(false)
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('runs the check script with bun when the project has a bun lockfile', async () => {
    expect.hasAssertions()
    const result = await realCheck(await makeFolder({ 'bun.lock': '', 'package.json': '{"scripts":{"check":"exit 1"}}' }), vi.fn<() => void>())
    expect(result?.ok).toBe(false)
  })
})
