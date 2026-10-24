import type { LocalClone } from './project.ts'
import { unsavedGroups } from './unsaved.ts'

const clean: LocalClone = { branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'app', localOnlyBranches: [], origin: undefined, path: '/projects/app', problem: undefined, slug: undefined, stashes: [], unpushed: [] }
const dirty: LocalClone = { ...clean, changedFiles: ['?? notes.txt', ' M a.ts'], localOnlyBranches: ['wip'], stashes: ['stash@{0}: WIP'], unpushed: [{ branch: 'master', subjects: ['fix a', 'fix b'] }] }

describe(unsavedGroups, () => {
  it('lists the unsaved work item by item, in a fixed order', () => {
    expect.hasAssertions()
    expect(unsavedGroups(dirty)).toStrictEqual([
      { items: ['master: fix a', 'master: fix b'], title: 'Unpushed commits' },
      { items: ['wip'], title: 'Local-only branches' },
      { items: ['?? notes.txt', ' M a.ts'], title: 'Uncommitted files' },
      { items: ['stash@{0}: WIP'], title: 'Stashes' },
    ])
  })

  it('has no group for a clean clone', () => {
    expect.hasAssertions()
    expect(unsavedGroups(clean)).toStrictEqual([])
  })
})
