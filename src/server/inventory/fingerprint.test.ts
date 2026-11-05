import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { makeRepo } from '../git-fixtures.ts'
import { fingerprintFolder } from './fingerprint.ts'
import { run } from './shell.ts'

describe('fingerprint of a folder', () => {
  it('stays the same while nothing changes', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    await expect(fingerprintFolder(folder)).resolves.toBe(await fingerprintFolder(folder))
  })

  it('changes when a tracked file is edited, and again when it is edited a second time', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    const clean = await fingerprintFolder(folder)
    await writeFile(path.join(folder, 'package.json'), '{"a":1}')
    const first = await fingerprintFolder(folder)
    await writeFile(path.join(folder, 'package.json'), '{"a":2}')
    await utimes(path.join(folder, 'package.json'), new Date(), new Date(Date.now() + 5000))
    const second = await fingerprintFolder(folder)
    expect(new Set([clean, first, second]).size).toBe(3)
  })

  it('changes when a file is added, then removed', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    const clean = await fingerprintFolder(folder)
    await writeFile(path.join(folder, 'notes.txt'), 'hello')
    const added = await fingerprintFolder(folder)
    await rm(path.join(folder, 'notes.txt'))
    expect(added).not.toBe(clean)
    await expect(fingerprintFolder(folder)).resolves.toBe(clean)
  })

  it('changes when a tracked file is deleted from the disk', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    const clean = await fingerprintFolder(folder)
    await rm(path.join(folder, 'package.json'))
    await expect(fingerprintFolder(folder)).resolves.not.toBe(clean)
  })

  it('changes with a commit, a new branch and a stash', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    const clean = await fingerprintFolder(folder)
    await run('git', ['branch', 'other'], folder)
    const branched = await fingerprintFolder(folder)
    await writeFile(path.join(folder, 'package.json'), '{"a":1}')
    await run('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.t', 'commit', '--quiet', '-am', 'second'], folder)
    const committed = await fingerprintFolder(folder)
    await writeFile(path.join(folder, 'package.json'), '{"a":3}')
    await run('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.t', 'stash'], folder)
    const stashed = await fingerprintFolder(folder)
    expect(new Set([clean, branched, committed, stashed]).size).toBe(4)
  })

  it('does not see a file that git ignores', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    await writeFile(path.join(folder, '.gitignore'), 'built.js\n')
    await run('git', ['add', '.'], folder)
    await run('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.t', 'commit', '--quiet', '-m', 'ignore'], folder)
    const clean = await fingerprintFolder(folder)
    await writeFile(path.join(folder, 'built.js'), 'x')
    await expect(fingerprintFolder(folder)).resolves.toBe(clean)
  })

  it('gives a fingerprint for a folder that is not a repo', async () => {
    expect.hasAssertions()
    const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-fingerprint-'))
    onTestFinished(() => rm(folder, { force: true, recursive: true }))
    await expect(fingerprintFolder(folder)).resolves.toMatch(/^[\da-f]{40}$/u)
  })
})
