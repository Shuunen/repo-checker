import { invariant } from 'es-toolkit'
import type { GhRunner } from '../inventory/github.ts'
import { createProjectMemory } from '../project-memory.ts'
import type { GitReaders } from './action-options.ts'
import { rescanProject } from './rescan.ts'

const rules = { fileRules: [], projectRules: [] }
const apiRepo = { archived: false, fork: false, name: 'finga', owner: { login: 'Owner' }, private: false, pushed_at: '2026-01-01T00:00:00Z' }
const git: GitReaders = { readClone: vi.fn<GitReaders['readClone']>(), readClones: vi.fn<GitReaders['readClones']>(() => Promise.resolve([])) }

/**
 * A fake gh that answers the repo of the owner, or a 404
 * @param isMissing true for a 404
 * @returns the fake runner
 */
function fakeGh(isMissing = false) {
  return vi.fn<GhRunner>(() => Promise.resolve(isMissing ? { ok: false, stderr: 'gh: Not Found (HTTP 404)', stdout: '' } : { ok: true, stderr: '', stdout: JSON.stringify(apiRepo) }))
}

describe('rescan with a memory', () => {
  it('remembers the project it scanned, and keeps the pull request counts, the CI status and the last own commit the full scan found', async () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    const options = { gh: fakeGh(), git, memory, name: 'finga', owner: 'Owner', rules, target: '/nowhere' }
    await rescanProject(options)
    const known = memory.entry('finga')
    invariant(known?.result.project.github !== undefined, 'the repo was remembered')
    expect(known.fingerprint).toBe('')
    memory.remember({ ...known.result, project: { ...known.result.project, github: { ...known.result.project.github, ci: 'failing', lastOwnCommitAt: '2024-01-01T00:00:00Z', pullRequests: { other: 2, renovate: 1 } } } }, '')
    await rescanProject(options)
    expect(memory.entry('finga')?.result.project.github).toMatchObject({ ci: 'failing', lastOwnCommitAt: '2024-01-01T00:00:00Z', pullRequests: { other: 2, renovate: 1 } })
  })

  it('forgets the project when it is gone', async () => {
    expect.hasAssertions()
    const memory = createProjectMemory()
    const options = { git, memory, name: 'finga', owner: 'Owner', rules, target: '/nowhere' }
    await rescanProject({ ...options, gh: fakeGh() })
    await rescanProject({ ...options, gh: fakeGh(true) })
    expect(memory.entry('finga')).toBeUndefined()
  })
})
