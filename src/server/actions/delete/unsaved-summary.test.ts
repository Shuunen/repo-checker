import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone } from '../../../shared/project.ts'
import { run } from '../../inventory/shell.ts'
import { lostWith } from './unsaved-summary.ts'

const aClone = (fields: Partial<LocalClone> = {}) =>
  ({ branches: [], changedFiles: [], currentBranch: 'main', fetchFailed: false, folderName: 'lib', localOnlyBranches: [], origin: undefined, path: '/nowhere/lib', problem: undefined, slug: 'owner/lib', stashes: [], unpushed: [], ...fields }) satisfies LocalClone

/**
 * Make an empty git repo, removed when the test ends
 * @returns its path
 */
async function makeRepo() {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-unsaved-'))
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  await run('git', ['init', folder])
  return folder
}

describe(lostWith, () => {
  it('lists nothing for a clean clone', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    await expect(lostWith(aClone({ path: folder }))).resolves.toStrictEqual({ ignoredFiles: [], path: folder, unsaved: [] })
  })

  it.each([
    { fields: { unpushed: [{ branch: 'main', subjects: ['one'] }] }, unsaved: ['1 unpushed commit'] },
    { fields: { changedFiles: ['?? a'] }, unsaved: ['1 uncommitted or untracked file'] },
    { fields: { stashes: ['stash@{0}: x'] }, unsaved: ['1 stash entry'] },
    { fields: { localOnlyBranches: ['wip'] }, unsaved: ['1 local-only branch (wip)'] },
  ])('lists only $unsaved', async ({ fields, unsaved }) => {
    expect.hasAssertions()
    const folder = await makeRepo()
    await expect(lostWith(aClone({ ...fields, path: folder }))).resolves.toMatchObject({ unsaved })
  })

  it.each(['no-git', 'unreadable'] as const)('does not look for ignored files in a %s folder, and says everything in it is lost', async problem => {
    expect.hasAssertions()
    const lost = await lostWith(aClone({ problem }))
    expect(lost.ignoredFiles).toStrictEqual([])
    expect(lost.unsaved).toHaveLength(1)
  })

  // Value: protects=a repo with no origin lists its ignored files and says its whole history is lost; fails_when=lostWith treats no-origin as clean again; why_new=the old test only checked the ignored files were skipped; seam=none; no_claim=none beyond protects
  it('lists the ignored files of a repo with no origin and says its history is lost', async () => {
    expect.hasAssertions()
    const folder = await makeRepo()
    await expect(lostWith(aClone({ path: folder, problem: 'no-origin' }))).resolves.toStrictEqual({ ignoredFiles: [], path: folder, unsaved: ['its whole git history, the repo has no origin remote'] })
  })
})
