import type { ForkStatus, LocalClone } from '../../shared/project.ts'
import { aFinding, aProject } from '../fixtures.ts'
import { factGroups, findingGroups, fixText, forkFacts, githubUrl, identityBadges, localFacts, offeredActions, slugOf, unarchiveBlocker, unsavedGroups } from './detail.ts'

const clone = aProject('app').project.local as LocalClone
const dirty: LocalClone = {
  ...clone,
  branches: [{ ahead: 2, behind: 0, isGone: false, name: 'master', upstream: 'origin/master' }],
  changedFiles: ['?? notes.txt', ' M a.ts'],
  localOnlyBranches: ['wip'],
  stashes: ['stash@{0}: WIP'],
  unpushed: [{ branch: 'master', subjects: ['fix a', 'fix b'] }],
}
const fork: ForkStatus = {
  branches: [
    { aheadBy: 0, name: 'master' },
    { aheadBy: 3, name: 'patch-1' },
  ],
  failures: [],
  openPullRequests: 1,
  parent: 'them/lib',
}

describe(githubUrl, () => {
  it('links to the repo, with the real case of its name', () => {
    expect.hasAssertions()
    const { project } = aProject('Repo-Checker', [], {})
    expect(githubUrl(project)).toBe('https://github.com/owner/Repo-Checker')
  })

  it('has no link without a GitHub repo', () => {
    expect.hasAssertions()
    expect(githubUrl(aProject('app', [], { github: undefined }).project)).toBeUndefined()
  })
})

describe(slugOf, () => {
  it('is the owner and the name of the repo, or the project name without repo', () => {
    expect.hasAssertions()
    expect(slugOf(aProject('app').project)).toBe('owner/app')
    expect(slugOf(aProject('app', [], { github: undefined }).project)).toBe('app')
  })
})

describe(identityBadges, () => {
  it('has no badge for a plain repo', () => {
    expect.hasAssertions()
    expect(identityBadges(aProject('app').project)).toStrictEqual([])
  })

  it('shows archived, fork, private and other owner', () => {
    expect.hasAssertions()
    const base = aProject('app').project
    const project = { ...base, github: { ...base.github, isArchived: true, isFork: true, isPrivate: true } as never, isOtherOwner: true }
    expect(identityBadges(project).map(badge => badge.label)).toStrictEqual(['archived', 'fork', 'private', 'other owner'])
  })
})

describe(localFacts, () => {
  it('lists everything a safe delete depends on', () => {
    expect.hasAssertions()
    expect(localFacts(dirty)).toStrictEqual([
      { label: 'Path', value: '/projects/app' },
      { label: 'Branch', value: 'master' },
      { label: 'Compared with its upstream', value: '2 ahead, 0 behind origin/master' },
      { label: 'Unpushed commits', value: 'master: fix a · master: fix b' },
      { label: 'Uncommitted files', value: '?? notes.txt,  M a.ts' },
      { label: 'Stashes', value: 'stash@{0}: WIP' },
      { label: 'Local-only branches', value: 'wip' },
    ])
  })

  it('says none for a clean clone, a detached head and a branch without upstream', () => {
    expect.hasAssertions()
    const facts = localFacts({ ...clone, branches: [{ ahead: 0, behind: 0, isGone: false, name: 'master', upstream: undefined }], currentBranch: '' })
    expect(facts.map(fact => fact.value)).toStrictEqual(['/projects/app', 'detached HEAD', '—', 'none', 'none', 'none', 'none'])
  })

  it.each([
    ['master', 'no upstream', { ahead: 0, behind: 0, isGone: false, name: 'master', upstream: undefined }],
    ['master', '0 ahead, 3 behind origin/master (deleted on GitHub)', { ahead: 0, behind: 3, isGone: true, name: 'master', upstream: 'origin/master' }],
  ])('compares the %s branch: %s', (_name, text, branch) => {
    expect.hasAssertions()
    expect(localFacts({ ...clone, branches: [branch] })[2]?.value).toBe(text)
  })

  it('says why a folder cannot be compared, and nothing else', () => {
    expect.hasAssertions()
    expect(localFacts({ ...clone, problem: 'no-git' })).toStrictEqual([
      { label: 'Path', value: '/projects/app' },
      { label: 'Problem', value: 'not a git repository' },
    ])
  })

  it('warns when the fetch failed', () => {
    expect.hasAssertions()
    expect(localFacts({ ...clone, fetchFailed: true })[1]).toStrictEqual({ label: 'git fetch', value: 'failed, so what is known about the remote may be stale' })
  })
})

describe(forkFacts, () => {
  it('says what the fork was compared with', () => {
    expect.hasAssertions()
    expect(forkFacts(fork)).toStrictEqual([
      { label: 'Parent', value: 'them/lib' },
      { label: 'Branches ahead of the parent', value: 'patch-1 (3 ahead)' },
      { label: 'Open pull requests', value: '1' },
    ])
  })

  it('lists the failures and an unknown parent', () => {
    expect.hasAssertions()
    const facts = forkFacts({ branches: [], failures: ['a: 404', 'b: 404'], openPullRequests: 0, parent: '' })
    expect(facts).toStrictEqual([
      { label: 'Parent', value: 'unknown' },
      { label: 'Branches ahead of the parent', value: 'none' },
      { label: 'Open pull requests', value: '0' },
      { label: 'Could not verify', value: 'a: 404; b: 404' },
    ])
  })
})

describe(factGroups, () => {
  it('has a card per thing the project has', () => {
    expect.hasAssertions()
    const base = aProject('lib').project
    const project = { ...base, github: { ...base.github, forkStatus: fork } as never }
    expect(factGroups(project).map(group => group.title)).toStrictEqual(['On disk', 'Fork'])
    expect(factGroups(aProject('finga', [], { local: undefined }).project)).toStrictEqual([])
  })
})

describe(findingGroups, () => {
  it('groups by origin, the worst first, without empty groups', () => {
    expect.hasAssertions()
    const info = aFinding({ scope: 'project', severity: 'info' })
    const error = aFinding({ scope: 'project', severity: 'error' })
    const warning = aFinding()
    expect(findingGroups([info, warning, error])).toStrictEqual([
      { findings: [error, info], title: 'Sync with GitHub' },
      { findings: [warning], title: 'Project files' },
    ])
    expect(findingGroups([])).toStrictEqual([])
  })
})

describe(offeredActions, () => {
  it('lists each action once', () => {
    expect.hasAssertions()
    expect(offeredActions([aFinding({ actions: ['unarchive-push-rearchive', 'discard'] }), aFinding({ actions: ['discard'] }), aFinding()])).toStrictEqual(['unarchive-push-rearchive', 'discard'])
  })
})

describe(fixText, () => {
  it.each([
    [[], undefined],
    [['package.json'], 'fix available in 1 file: package.json'],
    [['package.json', 'README.md'], 'fix available in 2 files: package.json, README.md'],
  ])('describes the fix of %j', (fixFiles, text) => {
    expect.hasAssertions()
    expect(fixText(aFinding({ fixFiles }))).toBe(text)
  })
})

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
    expect(unsavedGroups(clone)).toStrictEqual([])
  })
})

describe(unarchiveBlocker, () => {
  it.each([
    [{ changedFiles: ['?? a'] }, 'The clone has 1 uncommitted file. This action only pushes and never creates a commit: commit or discard them by hand first.'],
    [{ stashes: ['s1', 's2'] }, 'The clone has 2 stashes. This action only pushes: apply or drop them by hand first.'],
    [{}, undefined],
  ])('says why for %j', (fields, reason) => {
    expect.hasAssertions()
    expect(unarchiveBlocker({ ...clone, ...fields })).toBe(reason)
  })
})
