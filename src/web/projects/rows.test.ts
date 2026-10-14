import { aFinding, aProject } from '../fixtures.ts'
import { toRows } from './rows.ts'

const unsaved = aFinding({ actions: ['unarchive-push-rearchive', 'discard'], message: 'archived on GitHub, but the clone holds work', messageId: 'unsaved', ruleId: 'archived-with-unsaved-work', scope: 'project', severity: 'error' })

describe(toRows, () => {
  it('turns a project into a row', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('jozzo', [unsaved, aFinding({ severity: 'error' }), aFinding(), aFinding(), aFinding({ severity: 'info' })])])
    expect(row).toStrictEqual({
      action: 'unarchive-push-rearchive',
      branch: 'master',
      href: '/project/jozzo',
      id: 'jozzo',
      lastPush: '2026-10',
      name: 'jozzo',
      pills: [
        { color: 'danger', hint: 'archived on GitHub, but the clone holds work', label: 'archived · unsaved work' },
        { color: 'danger', hint: '1 error in the project files', label: '1 error' },
        { color: 'warning', hint: '2 warnings in the project files', label: '2 warnings' },
      ],
      project: expect.objectContaining({ name: 'jozzo' }),
      rank: 0,
    })
  })

  it('says all is good when only info is left', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('app', [aFinding({ severity: 'info' })])])
    expect(row?.pills).toStrictEqual([{ color: 'success', hint: 'no error and no warning', label: 'all good' }])
  })

  it('shows dashes for a repo that is not cloned', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('finga', [aFinding({ actions: ['clone'], messageId: 'missing', ruleId: 'not-cloned', scope: 'project', severity: 'info' })], { local: undefined })])
    expect(row).toMatchObject({ action: 'clone', branch: '—', pills: [{ color: 'accent', label: 'not cloned' }] })
  })

  it.each([
    ['no github repo', { github: undefined }, { lastPush: '—' }],
    ['a detached head', { local: { ...aProject('app').project.local, currentBranch: '' } as never }, { branch: '—' }],
  ])('shows a dash for %s', (_name, project, expected) => {
    expect.hasAssertions()
    expect(toRows([aProject('app', [], project)])[0]).toMatchObject(expected)
  })

  it('names an unknown Sync finding by its rule id', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('app', [aFinding({ messageId: 'new', ruleId: 'some-new-sync-check', scope: 'project' })])])
    expect(row?.pills[0]?.label).toBe('some new sync check')
  })

  it('shows a project whose checks failed as an error pill with the reason on hover', () => {
    expect.hasAssertions()
    const failed = aFinding({ message: 'the checks of this project failed: boom', messageId: 'failed', ruleId: 'checks-failed', scope: 'project', severity: 'error' })
    const [row] = toRows([aProject('bad', [failed])])
    expect(row?.pills).toStrictEqual([{ color: 'danger', hint: 'the checks of this project failed: boom', label: 'checks failed' }])
  })

  it('marks a clone of another owner', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('lib', [], { isOtherOwner: true })])
    expect(row?.pills.map(pill => pill.label)).toStrictEqual(['other owner'])
  })

  it('puts the archived and private flags before the other pills', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('lib', [aFinding({ severity: 'error' })], { github: { ...aProject('lib').project.github, isArchived: true, isPrivate: true } as never })])
    expect(row?.pills.map(pill => pill.label)).toStrictEqual(['archived', 'private', '1 error'])
  })

  it('sorts the worst first, then by name', () => {
    expect.hasAssertions()
    const rows = toRows([aProject('b'), aProject('a'), aProject('c', [aFinding({ severity: 'info' })]), aProject('d', [aFinding()]), aProject('e', [unsaved])])
    expect(rows.map(row => row.name)).toStrictEqual(['e', 'd', 'c', 'a', 'b'])
  })
})
