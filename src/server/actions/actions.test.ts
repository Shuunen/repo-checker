import type { SplitRules } from '../check-project.ts'
import type { GhRunner } from '../inventory/github.ts'
import { createProjectMemory } from '../project-memory.ts'
import { createActions } from './actions.ts'
import type { ActionOptions, GitReaders } from './action-options.ts'
import { createPreviewedActions } from './previewed-actions.ts'

const rules = { all: [], node: [] } as unknown as SplitRules
const badName = '../x'
const repo = 'finga'

describe(createPreviewedActions, () => {
  it('hands the options of the project to each action', async () => {
    expect.hasAssertions()
    const options = vi.fn<(name: string) => Promise<ActionOptions>>(name => Promise.resolve({ gh: vi.fn<GhRunner>(), git: { listClones: vi.fn<GitReaders['listClones']>(), readClone: vi.fn<GitReaders['readClone']>() }, name, owner: 'Owner', target: '/nowhere' }))
    const actions = createPreviewedActions(options, rules)
    const results = await Promise.all([
      actions.deleteBranches(repo, 'f'),
      actions.deleteClone(repo),
      actions.deleteFork(repo),
      actions.deleteProject(repo),
      actions.discard(repo, 'f'),
      actions.fixFiles(repo, 'f'),
      actions.fixGit(repo, 'f'),
      actions.previewDeleteBranches(repo),
      actions.previewDeleteClone(repo),
      actions.previewDeleteFork(repo),
      actions.previewDeleteProject(repo),
      actions.previewDiscard(repo),
      actions.previewFixFiles(repo),
      actions.previewFixGit(repo),
    ])
    expect(results.every(result => !result.ok)).toBe(true)
    expect(options).toHaveBeenCalledTimes(14)
  })
})

describe(createActions, () => {
  it('reads the owner given and runs every action, each one refuses when GitHub cannot be asked', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.resolve({ ok: false, stderr: 'no', stdout: '' }))
    const actions = createActions({ gh, memory: createProjectMemory(), owner: 'Owner', rules, target: '/nowhere' })
    const results = await Promise.all([
      actions.archive('finga'),
      actions.checkoutDefault('finga'),
      actions.clone('finga'),
      actions.rescan('finga'),
      actions.syncGithubMetadata('finga', { description: '', homepage: '' }),
      actions.previewSyncGithubMetadata('finga'),
      actions.unarchive('finga'),
      actions.unarchivePush('finga'),
    ])
    expect(results.every(result => !result.ok)).toBe(true)
  })

  it('never runs an action on a name that is a path', async () => {
    expect.hasAssertions()
    const actions = createActions({ gh: vi.fn<GhRunner>(), memory: createProjectMemory(), owner: 'Owner', rules, target: '/nowhere' })
    await expect(actions.deleteClone(badName)).rejects.toThrow(`${badName} is not a repo name`)
  })

  it('asks GitHub who the user is only once, and again after a failure', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>().mockResolvedValueOnce({ ok: false, stderr: 'offline', stdout: '' }).mockResolvedValue({ ok: true, stderr: '', stdout: '{"login":"Me"}' })
    const { rescan } = createActions({ gh, memory: createProjectMemory(), owner: undefined, rules, target: '/nowhere' })
    await expect(rescan('finga')).rejects.toThrow('offline')
    await rescan('finga')
    await rescan('finga')
    expect(gh.mock.calls.filter(([args]) => args.at(-1) === 'user')).toHaveLength(2)
  })
})
