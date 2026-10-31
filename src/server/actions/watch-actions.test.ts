import type { GhRunner } from '../inventory/github.ts'
import { createProjectMemory } from '../project-memory.ts'
import { type ActionOptions, realGit } from './action-options.ts'
import { createWatchActions } from './watch-actions.ts'

describe(createWatchActions, () => {
  it('builds the options of the action from the repo name, for the rescan and for the watch', async () => {
    expect.hasAssertions()
    const options = vi.fn<(name: string) => Promise<ActionOptions>>(name => Promise.resolve({ gh: vi.fn<GhRunner>(), git: realGit, name, owner: 'Owner', target: '/nowhere' }))
    const { live, rescan } = createWatchActions(options, { memory: createProjectMemory(), rules: { fileRules: [], projectRules: [] } })
    await expect(rescan('finga')).resolves.toMatchObject({ ok: false })
    await expect(live('lib', '')).resolves.toMatchObject({ ok: false })
    expect(options.mock.calls).toStrictEqual([['finga'], ['lib']])
  })
})
