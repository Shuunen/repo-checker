import type { GhRunner } from '../inventory/github.ts'
import { createProjectMemory } from '../project-memory.ts'
import { type ActionOptions, realGit } from './action-options.ts'
import { createWatchActions } from './watch-actions.ts'

describe(createWatchActions, () => {
  it('builds the options of the action from the repo name, for the rescan and for the watch', async () => {
    expect.hasAssertions()
    const options = vi.fn<(name: string) => Promise<ActionOptions>>(name => Promise.resolve({ gh: vi.fn<GhRunner>(), git: realGit, name, owner: 'Owner', target: '/nowhere' }))
    const { live, rescan } = createWatchActions(options, { memory: createProjectMemory(), rules: { fileRules: [], projectRules: [] } })
    await expect(rescan('../x')).resolves.toStrictEqual({ ok: false, reason: '../x is not a repo name' })
    await expect(live('../y', '')).resolves.toStrictEqual({ ok: false, reason: '../y is not a repo name' })
    expect(options).toHaveBeenCalledTimes(2)
  })
})
