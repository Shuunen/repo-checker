import type { LocalClone } from '../../shared/project.ts'
import type { GitReaders } from './action-options.ts'
import { createClaudeSessions, type SpawnClaude } from './claude-session.ts'
import { createUpdateActions, startUpdateProject } from './update-project.ts'

const clone = { branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'finga', localOnlyBranches: [], origin: undefined, path: '/projects/finga', problem: undefined, slug: 'owner/finga', stashes: [], unpushed: [] } satisfies LocalClone
const readers = (clones: LocalClone[]): GitReaders => ({ listClones: () => Promise.resolve(clones), readClone: () => Promise.resolve(clone) })
const options = (name: string, clones = [clone]) => ({ gh: vi.fn<() => never>(), git: readers(clones), name, owner: 'Owner', target: '/nowhere' })

/**
 * Sessions on a fake claude
 * @returns the sessions and the folders claude was started in
 */
function sessionsOnFakeClaude() {
  const folders: string[] = []
  const spawn: SpawnClaude = cwd => {
    folders.push(cwd)
    return { kill: () => undefined, write: () => undefined }
  }
  return { folders, sessions: createClaudeSessions(spawn) }
}

describe(startUpdateProject, () => {
  it('starts Claude in the clone of the project', async () => {
    expect.hasAssertions()
    const { folders, sessions } = sessionsOnFakeClaude()
    await expect(startUpdateProject(options('finga'), sessions)).resolves.toMatchObject({ ok: true })
    expect(folders).toStrictEqual(['/projects/finga'])
  })

  it.each([['a project without usable clone', options('finga', []), 'no clone of Owner/finga']])('refuses %s', async (_name, given, reason) => {
    expect.hasAssertions()
    const { folders, sessions } = sessionsOnFakeClaude()
    await expect(startUpdateProject(given, sessions)).resolves.toMatchObject({ ok: false, reason: expect.stringContaining(reason) as string })
    expect(folders).toStrictEqual([])
  })

  it('refuses a second session, and gives the reason when something throws', async () => {
    expect.hasAssertions()
    const { sessions } = sessionsOnFakeClaude()
    await startUpdateProject(options('finga'), sessions)
    await expect(startUpdateProject(options('finga'), sessions)).resolves.toMatchObject({ ok: false, reason: expect.stringContaining('already updating') as string })
    const failing = { ...options('finga'), git: { listClones: () => Promise.reject(new Error('boom')), readClone: () => Promise.reject(new Error('boom')) } }
    await expect(startUpdateProject(failing, sessions)).resolves.toStrictEqual({ ok: false, reason: 'boom' })
    // oxlint-disable-next-line prefer-promise-reject-errors
    const odd = { ...options('finga'), git: { listClones: () => Promise.reject('plain text'), readClone: () => Promise.reject(new TypeError('odd')) } }
    await expect(startUpdateProject(odd, sessions)).resolves.toStrictEqual({ ok: false, reason: 'plain text' })
  })
})

describe(createUpdateActions, () => {
  it('starts, follows, talks to and closes the session of a project, and stops them all', async () => {
    expect.hasAssertions()
    const { sessions } = sessionsOnFakeClaude()
    const actions = createUpdateActions(name => Promise.resolve(options(name)), sessions)
    await expect(actions.startUpdateProject('finga')).resolves.toMatchObject({ ok: true })
    const seen: string[] = []
    const unwatch = actions.watchUpdateProject('finga', event => seen.push(event.type))
    await expect(actions.sendUpdateMessage('finga', 'go')).resolves.toMatchObject({ ok: true })
    unwatch?.()
    expect(seen).toStrictEqual(['user', 'user'])
    await expect(actions.closeUpdateProject('finga')).resolves.toMatchObject({ ok: true })
    await actions.startUpdateProject('finga')
    actions.stopSessions()
    expect(actions.watchUpdateProject('finga', vi.fn<() => void>())).toBeUndefined()
  })
})
