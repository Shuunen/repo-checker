import { writeFile } from 'node:fs/promises'
import { invariant } from 'es-toolkit'
import path from 'node:path'
import type { LocalClone, Project } from '../shared/project.ts'
import type { ProjectResult } from './check-projects.ts'
import { makeRepo } from './git-fixtures.ts'
import { createProjectMemory, fingerprintClone, pauseMs, remoteTtlMs } from './project-memory.ts'

/**
 * A checked project
 * @param local the clone of the project
 * @returns the result
 */
function aResult(local: LocalClone | undefined): ProjectResult {
  const project: Project = { github: undefined, isOtherOwner: false, local, name: 'finga' }
  return { findings: [], outcomes: [], project }
}

/**
 * A clone in a folder
 * @param folder the folder
 * @returns the clone
 */
function aClone(folder: string): LocalClone {
  return { branches: [], changedFiles: [], currentBranch: 'main', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: undefined, path: folder, problem: undefined, slug: undefined, stashes: [], unpushed: [] }
}

describe(fingerprintClone, () => {
  it('is empty for a project that is not cloned', async () => {
    expect.hasAssertions()
    await expect(fingerprintClone(undefined)).resolves.toBe('')
  })
})

describe(createProjectMemory, () => {
  it('remembers nothing at first', async () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    expect(memory.entry('finga')).toBeUndefined()
    await expect(memory.recall(aResult(undefined).project, true)).resolves.toStrictEqual({ fingerprint: '', hit: undefined })
  })

  it('gives back the result of a project that did not change while its GitHub side is recent', async () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    const result = aResult(undefined)
    memory.remember(result, '')
    await expect(memory.recall(result.project, true)).resolves.toStrictEqual({ fingerprint: '', hit: result })
  })

  it('checks again when the scan must be fresh', async () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    const result = aResult(undefined)
    memory.remember(result, '')
    await expect(memory.recall(result.project, false)).resolves.toStrictEqual({ fingerprint: '', hit: undefined })
  })

  it('checks again once the GitHub side is older than the time to live', async () => {
    expect.hasAssertions()
    let time = 0
    const memory = createProjectMemory(() => time)
    const result = aResult(undefined)
    memory.remember(result, '')
    time = remoteTtlMs - 1
    await expect(memory.recall(result.project, true)).resolves.toMatchObject({ hit: result })
    time = remoteTtlMs
    await expect(memory.recall(result.project, true)).resolves.toMatchObject({ hit: undefined })
  })

  it('checks again when the clone changed since the result was remembered', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    const memory = createProjectMemory()
    const result = aResult(aClone(folder))
    const { fingerprint } = await memory.recall(result.project, true)
    memory.remember(result, fingerprint)
    await expect(memory.recall(result.project, true)).resolves.toMatchObject({ hit: result })
    await writeFile(path.join(folder, 'notes.txt'), 'hello')
    await expect(memory.recall(result.project, true)).resolves.toMatchObject({ hit: undefined })
  })

  it('forgets a project', () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    memory.remember(aResult(undefined), '')
    memory.forget('finga')
    expect(memory.entry('finga')).toBeUndefined()
  })

  it('pauses a project for a minute, keeping its result', () => {
    expect.hasAssertions()
    let time = 1_000_000
    const memory = createProjectMemory(() => time)
    const result = aResult(undefined)
    memory.remember(result, 'abc')
    time += remoteTtlMs
    const entry = memory.entry('finga')
    invariant(entry !== undefined, 'the result was remembered')
    expect(memory.isStale(entry)).toBe(true)
    const paused = memory.pause(entry)
    expect(paused).toMatchObject({ fingerprint: 'abc', isPaused: true, result })
    expect(memory.isStale(paused)).toBe(false)
    time += pauseMs
    expect(memory.isStale(paused)).toBe(true)
    expect(memory.entry('finga')).toBe(paused)
  })

  it('keeps the GitHub side of an entry when only the clone is checked again', () => {
    expect.hasAssertions()
    const memory = createProjectMemory(() => 5)
    memory.remember(aResult(undefined), 'abc', { isPaused: true, remoteAt: 2 })
    expect(memory.entry('finga')).toMatchObject({ isPaused: true, remoteAt: 2 })
  })
})
