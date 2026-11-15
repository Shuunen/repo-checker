import type { LocalClone } from '../../../shared/project.ts'
import { unsavedWork } from './sync.utils.ts'

const clean: LocalClone = { branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'app', localOnlyBranches: [], origin: 'git@github.com:owner/app.git', path: '/projects/app', problem: undefined, slug: 'owner/app', stashes: [], unpushed: [] }

describe('unsaved work', () => {
  it('is empty for a clean clone', () => {
    expect.hasAssertions()
    expect(unsavedWork(clean)).toStrictEqual([])
  })

  it('counts each kind, singular and plural', () => {
    expect.hasAssertions()
    const local = { ...clean, changedFiles: ['?? a', '?? b'], localOnlyBranches: ['x'], stashes: ['s1', 's2', 's3'], unpushed: [{ branch: 'master', subjects: ['one'] }] }
    expect(unsavedWork(local)).toStrictEqual(['1 unpushed commit', '2 changed files', '3 stashes', '1 local-only branch'])
  })

  it('adds up the unpushed commits of every branch', () => {
    expect.hasAssertions()
    const local = {
      ...clean,
      localOnlyBranches: ['x', 'y'],
      unpushed: [
        { branch: 'master', subjects: ['one'] },
        { branch: 'dev', subjects: ['two', 'three'] },
      ],
    }
    expect(unsavedWork(local)).toStrictEqual(['3 unpushed commits', '2 local-only branches'])
  })
})
