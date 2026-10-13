import { aFinding, aProject } from '../fixtures.ts'
import { describeScan, initialScanState, reduceScan, replaceProject } from './scan-state.ts'

describe(reduceScan, () => {
  it('builds the state event by event', () => {
    expect.hasAssertions()
    const app = aProject('app')
    const done = { durationMs: 8300, isSingle: false, owner: 'owner', type: 'done' } as const
    const events = [{ target: '/projects', type: 'started' } as const, { line: 'checking 1 project', type: 'progress' } as const, { result: app, type: 'project' } as const, done]
    let state = initialScanState
    for (const event of events) state = reduceScan(state, event)
    expect(state).toStrictEqual({ done, failure: undefined, progress: 'checking 1 project', projects: [app], target: '/projects' })
  })

  it('keeps the failure message', () => {
    expect.hasAssertions()
    expect(reduceScan(initialScanState, { message: 'gh is not logged in', type: 'failed' }).failure).toBe('gh is not logged in')
  })
})

describe(describeScan, () => {
  const started = { ...initialScanState, progress: 'checking 3 projects', target: '/projects' }

  it('shows the progress while scanning', () => {
    expect.hasAssertions()
    expect(describeScan(started, true)).toBe('/projects · checking 3 projects')
  })

  it('shows the owner and the duration once done', () => {
    expect.hasAssertions()
    expect(describeScan({ ...started, done: { durationMs: 8260, isSingle: false, owner: 'owner', type: 'done' } }, false)).toBe('/projects · owner · scanned in 8.3s')
  })

  it('shows nothing before the scan starts', () => {
    expect.hasAssertions()
    expect(describeScan(initialScanState, false)).toBe('')
  })
})

describe(replaceProject, () => {
  const state = { ...initialScanState, projects: [aProject('a'), aProject('b'), aProject('c')] }

  it('puts the project as it is now in place of its old entry, the others untouched', () => {
    expect.hasAssertions()
    const now = aProject('b', [aFinding()])
    const next = replaceProject(state, 'b', now)
    expect(next.projects.map(item => item.project.name)).toStrictEqual(['a', 'b', 'c'])
    expect(next.projects[1]).toBe(now)
    expect(next.projects[0]).toBe(state.projects[0])
  })

  it('removes a project that is gone', () => {
    expect.hasAssertions()
    expect(replaceProject(state, 'b', undefined).projects.map(item => item.project.name)).toStrictEqual(['a', 'c'])
  })

  it('adds a project the scan did not have', () => {
    expect.hasAssertions()
    expect(replaceProject(state, 'd', aProject('d')).projects.map(item => item.project.name)).toStrictEqual(['a', 'b', 'c', 'd'])
  })
})
