import type { SplitRules } from '../check-project.ts'
import type { GhRunner } from '../inventory/github.ts'
import { createActions } from './actions.ts'
import type { ActionOptions, GitReaders } from './action-options.ts'
import { createPreviewedActions } from './previewed-actions.ts'

const rules = { all: [], node: [] } as unknown as SplitRules
const badName = '../x'

describe(createPreviewedActions, () => {
  it('hands the options of the project to each action, which refuses a name that is a path', async () => {
    expect.hasAssertions()
    const options = vi.fn<(name: string) => Promise<ActionOptions>>(name => Promise.resolve({ gh: vi.fn<GhRunner>(), git: { readClone: vi.fn<GitReaders['readClone']>(), readClones: vi.fn<GitReaders['readClones']>() }, name, owner: 'Owner', target: '/nowhere' }))
    const actions = createPreviewedActions(options, rules)
    const results = await Promise.all([
      actions.deleteClone(badName),
      actions.deleteFork(badName),
      actions.deleteProject(badName),
      actions.discard(badName, 'f'),
      actions.fixFiles(badName, 'f'),
      actions.fixGit(badName, 'f'),
      actions.previewDeleteClone(badName),
      actions.previewDeleteFork(badName),
      actions.previewDeleteProject(badName),
      actions.previewDiscard(badName),
      actions.previewFixFiles(badName),
      actions.previewFixGit(badName),
    ])
    expect(results.every(result => !result.ok)).toBe(true)
    expect(options).toHaveBeenCalledTimes(12)
  })
})

describe(createActions, () => {
  it('reads the owner given and runs every action, which refuses a name that is a path', async () => {
    expect.hasAssertions()
    const gh = vi.fn<GhRunner>(() => Promise.resolve({ ok: false, stderr: 'no', stdout: '' }))
    const actions = createActions({ gh, owner: 'Owner', rules, target: '/nowhere' })
    const results = await Promise.all([
      actions.archive(badName),
      actions.checkoutDefault(badName),
      actions.clone(badName),
      actions.rescan(badName),
      actions.syncGithubMetadata(badName, { description: '', homepage: '' }),
      actions.previewSyncGithubMetadata(badName),
      actions.unarchive(badName),
      actions.unarchivePush(badName),
    ])
    expect(results.every(result => !result.ok)).toBe(true)
  })
})
