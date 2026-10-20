import { aFinding, aProject } from '../fixtures.ts'
import { toRows } from './rows.ts'

const now = new Date('2026-10-14T12:00:00Z')

const unsaved = aFinding({ actions: ['unarchive-push-rearchive', 'discard'], message: 'archived on GitHub, but the clone holds work', messageId: 'unsaved', ruleId: 'archived-with-unsaved-work', scope: 'project', severity: 'error' })

describe(toRows, () => {
  it('turns a project into a row', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('jozzo', [unsaved, aFinding({ severity: 'error' }), aFinding(), aFinding(), aFinding({ severity: 'info' })])], now)
    expect(row).toStrictEqual({
      actions: ['unarchive-push-rearchive', 'discard'],
      branch: 'master',
      branchPill: undefined,
      hasMajorUpdate: false,
      health: { color: 'danger', hint: expect.any(String), label: '2 errors' },
      href: '/project/jozzo',
      id: 'jozzo',
      isStale: false,
      lastPush: '2026-10',
      lastPushAge: 'this month',
      name: 'jozzo',
      project: expect.objectContaining({ name: 'jozzo' }),
      rank: 0,
      state: expect.objectContaining({ label: 'active' }),
      visibility: expect.objectContaining({ label: expect.stringMatching(/^(?:private|public)$/u) }),
    })
  })

  it('says all good without finding', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('app')])
    expect(row?.health).toStrictEqual({ color: 'success', hint: 'nothing to report', label: 'all good' })
  })

  it.each([
    ['warning', 'warning', '2 warnings'],
    ['info', 'accent', '2 infos'],
  ] as const)('counts the %s findings when it is the worst', (severity, color, label) => {
    expect.hasAssertions()
    const [row] = toRows([aProject('app', [aFinding({ severity }), aFinding({ severity })])])
    expect(row?.health).toMatchObject({ color, label })
  })

  it('shows dashes for a repo that is not cloned', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('finga', [aFinding({ actions: ['clone'], messageId: 'missing', ruleId: 'not-cloned', scope: 'project', severity: 'info' })], { local: undefined })])
    expect(row).toMatchObject({ actions: ['clone'], branch: '—', health: { color: 'accent', label: '1 info' } })
  })

  it.each([
    ['no github repo', { github: undefined }, { lastPush: '—' }],
    ['a detached head', { local: { ...aProject('app').project.local, currentBranch: '' } as never }, { branch: '—' }],
  ])('shows a dash for %s', (_name, project, expected) => {
    expect.hasAssertions()
    expect(toRows([aProject('app', [], project)])[0]).toMatchObject(expected)
  })

  it('shows a project whose checks failed as an error pill with the reason on hover', () => {
    expect.hasAssertions()
    const failed = aFinding({ message: 'the checks of this project failed: boom', messageId: 'failed', ruleId: 'checks-failed', scope: 'project', severity: 'error' })
    const [row] = toRows([aProject('bad', [failed])])
    expect(row?.health).toStrictEqual({ color: 'danger', hint: 'the checks of this project failed: boom', label: '1 error' })
  })

  it('shows private and archived for a private archived repo, dashes without GitHub', () => {
    expect.hasAssertions()
    const [row] = toRows([aProject('lib', [], { github: { ...aProject('lib').project.github, isArchived: true, isPrivate: true } as never })])
    const [bare] = toRows([aProject('bare', [], { github: undefined })])
    expect([row?.visibility?.label, row?.state?.label, bare?.visibility, bare?.state]).toStrictEqual(['private', 'archived', undefined, undefined])
  })

  it('tells a project not cloned and a clone off its default branch with a pill', () => {
    expect.hasAssertions()
    const [offDefault] = toRows([aProject('folio', [], { local: { ...aProject('folio').project.local, currentBranch: 'feat/astro' } as never })], now)
    const [notCloned] = toRows([aProject('finga', [], { local: undefined })], now)
    const [bare] = toRows([aProject('bare', [], { github: undefined })], now)
    expect(offDefault?.branchPill).toStrictEqual({ color: 'warning', hint: 'the default branch is master', label: 'feat/astro' })
    expect(notCloned?.branchPill).toMatchObject({ color: 'accent', label: 'not cloned' })
    expect(bare?.branchPill).toBeUndefined()
  })

  it('says how long ago the last push was and flags a stale one', () => {
    expect.hasAssertions()
    const github = { ...aProject('old').project.github, pushedAt: '2022-04-01T00:00:00Z' } as never
    const [old] = toRows([aProject('old', [], { github })], now)
    const [bare] = toRows([aProject('bare', [], { github: undefined })], now)
    expect([old?.lastPushAge, old?.isStale, bare?.lastPushAge, bare?.isStale]).toStrictEqual(['4 years ago', true, '—', false])
  })

  it('marks public and active as the usual values, private and archived are exceptions', () => {
    expect.hasAssertions()
    const [usual] = toRows([aProject('app')])
    const [exception] = toRows([aProject('lib', [], { github: { ...aProject('lib').project.github, isArchived: true, isPrivate: true } as never })])
    expect([usual?.visibility?.isUsual, usual?.state?.isUsual, exception?.visibility?.isUsual, exception?.state?.isUsual]).toStrictEqual([true, true, undefined, undefined])
  })

  it('sorts the worst first, then by name', () => {
    expect.hasAssertions()
    const rows = toRows([aProject('b'), aProject('a'), aProject('c', [aFinding({ severity: 'info' })]), aProject('d', [aFinding()]), aProject('e', [unsaved])])
    expect(rows.map(row => row.name)).toStrictEqual(['e', 'd', 'c', 'a', 'b'])
  })
})
