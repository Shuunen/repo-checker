import { fireEvent, screen } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, sseResponse } from './fixtures.ts'
import { renderApp } from './render-app.tsx'
import type { FetchScan } from './scan/scan-query.ts'

const base = aProject('jozzo')
const unsaved = aFinding({ actions: ['unarchive-push-rearchive', 'discard'], message: 'archived on GitHub, but the clone holds work', messageId: 'unsaved', ruleId: 'archived-with-unsaved-work', scope: 'project', severity: 'error' })
const noLicense = aFinding({ fixFiles: ['package.json'], message: 'no license field', ruleId: 'license-exists' })
const jozzo = aProject('jozzo', [noLicense, unsaved], {
  github: { ...base.project.github, isArchived: true } as never,
  local: { ...base.project.local, changedFiles: ['?? notes.txt'], unpushed: [{ branch: 'master', subjects: ['one more'] }] } as never,
})
const lib = aProject('lib', [], { github: { ...base.project.github, forkStatus: { branches: [{ aheadBy: 2, name: 'patch-1' }], failures: [], openPullRequests: 0, parent: 'them/lib' }, isFork: true } as never, local: undefined })
const listEvents: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: jozzo, type: 'project' },
  { result: lib, type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]
const singleEvents: ScanEvent[] = [
  { target: '/projects/jozzo', type: 'started' },
  { result: jozzo, type: 'project' },
  { durationMs: 1000, isSingle: true, owner: 'owner', type: 'done' },
]

/**
 * The text of an element found by test id
 * @param testId the test id
 * @returns the text content
 */
function textOf(testId: string) {
  return screen.getByTestId(testId).textContent
}

describe('project view', () => {
  it('opens from the name of a row, with its identity and findings', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(listEvents))
    fireEvent.click(await screen.findByTestId('archived-toggle'))
    fireEvent.click(await screen.findByTestId('open-jozzo'))
    await screen.findByTestId('findings')
    expect(textOf('badges')).toBe('archived')
    expect(textOf('identity-line')).toContain('GitHub')
    expect(textOf('findings')).toContain('archived on GitHub, but the clone holds work')
    expect(textOf('finding-license-exists')).toContain('fix available in 1 file: package.json')
  })

  it('shows the local state and the actions of a project', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(listEvents), '/project/jozzo')
    await screen.findByTestId('facts-on-disk')
    expect(textOf('fact-uncommitted-files')).toBe('?? notes.txt')
    expect(textOf('fact-unpushed-commits')).toBe('master: one more')
    expect(textOf('action-discard')).toBe('Discard')
  })

  it('shows the fork comparison and no action for a fork that keeps work', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(listEvents), '/project/lib')
    await screen.findByTestId('facts-fork')
    expect(textOf('fact-branches-ahead-of-the-parent')).toBe('patch-1 (2 ahead)')
    expect(screen.queryByTestId('action-delete-fork')).toBeNull()
    expect(screen.queryByTestId('facts-on-disk')).toBeNull()
  })

  it('says there is nothing to report for a project without finding', async () => {
    expect.hasAssertions()
    renderApp(scanRequest([...listEvents, { result: aProject('quiet'), type: 'project' }]), '/project/quiet')
    await screen.findByTestId('findings')
    expect(textOf('all-clear')).toContain('All good')
  })

  it('counts the findings in the header and folds the empty facts of a clean clone', async () => {
    expect.hasAssertions()
    renderApp(scanRequest([...listEvents, { result: aProject('quiet'), type: 'project' }]), '/project/quiet')
    await screen.findByTestId('facts-on-disk')
    expect(textOf('finding-counts')).toBe('')
    expect(screen.queryByTestId('quiet-on-disk')).toBeNull()
    expect(screen.queryByTestId('fact-stashes')).toBeNull()
  })

  it('counts the findings by severity in the header', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(listEvents), '/project/jozzo')
    await screen.findByTestId('findings')
    expect(textOf('finding-counts')).toMatch(/error|warning|info/u)
  })

  it('opens on a project address, and finds the project once the scan has it', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(listEvents), '/project/jozzo')
    expect(textOf('project-missing')).toBe('Looking for jozzo…')
    await screen.findByTestId('findings')
    expect(screen.queryByTestId('project-missing')).toBeNull()
  })

  it('says when the scan has no such project', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(listEvents), '/project/nope')
    await screen.findByText('No project named nope in this scan')
    expect(textOf('project-missing')).toBe('No project named nope in this scan')
  })

  it('goes back to the list with the back link', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(listEvents), '/project/jozzo')
    fireEvent.click(await screen.findByTestId('back'))
    const row = await screen.findByTestId('row-lib')
    expect(row.textContent).toContain('all good')
    expect(globalThis.location.pathname).toBe('/')
  })

  it('goes back to the list when a filter tab is picked', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(listEvents), '/project/jozzo')
    fireEvent.click(await screen.findByTestId('filter-forks'))
    await screen.findByTestId('row-lib')
    expect(screen.queryByTestId('row-jozzo')).toBeNull()
  })

  it('opens straight on the project of a single project scan, once', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(singleEvents))
    await screen.findByTestId('findings')
    expect(globalThis.location.pathname).toBe('/project/jozzo')
    fireEvent.click(screen.getByTestId('back'))
    await screen.findByTestId('archived-toggle')
    expect(globalThis.location.pathname).toBe('/')
  })

  it('shows why the scan failed on the project page', async () => {
    expect.hasAssertions()
    renderApp(
      vi.fn<FetchScan>(() => Promise.resolve(sseResponse([{ message: 'gh api user failed', type: 'failed' }]))),
      '/project/jozzo',
    )
    await screen.findByTestId('scan-failure')
    expect(textOf('scan-failure')).toContain('gh api user failed')
  })
})
