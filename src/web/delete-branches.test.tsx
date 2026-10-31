import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { DeleteBranchesPreview } from '../shared/action.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const branch = (name: string) => ({ ahead: 0, behind: 0, isGone: false, name, upstream: `origin/${name}` })
const eventsOf = (project: Parameters<typeof aProject>[2], currentBranch = 'master'): ScanEvent[] => {
  const scanned = aProject('app', [], project)
  const local = scanned.project.local === undefined ? undefined : { ...scanned.project.local, currentBranch }
  return [
    { isNitpick: false, target: '/projects', type: 'started' },
    { result: { ...scanned, project: { ...scanned.project, local } }, type: 'project' },
    { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
  ]
}
const withBranches = (...names: string[]) => eventsOf({ local: { ...aProject('app').project.local, branches: names.map(name => branch(name)) } as never })
const preview: DeleteBranchesPreview = { branches: ['feature (no upstream)', 'wip'], fingerprint: 'ghi', ok: true, path: '/projects/app' }

describe('delete local branches', () => {
  it('is offered when a branch other than the default one exists, lists them, then deletes with the fingerprint', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(withBranches('master', 'feature', 'wip')), '/project/app')
    fireEvent.click(await screen.findByTestId('action-delete-branches'))
    await screen.findByTestId('delete-branches-preview')
    expect(screen.getByTestId('delete-branches-list').textContent).toContain('feature (no upstream)')
    fireEvent.click(screen.getByTestId('delete-branches-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/delete-branches?fingerprint=ghi', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
  })

  it('is offered in the menu of the list too', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(withBranches('master', 'feature')), '/')
    fireEvent.click(await screen.findByTestId('actions-app'))
    const item = await screen.findByTestId('menu-delete-branches')
    expect(item.textContent).toBe('Delete local branches')
    fireEvent.click(item)
    await expect(screen.findByTestId('delete-branches-preview')).resolves.toBeInstanceOf(HTMLElement)
  })

  it.each([
    { events: withBranches('master'), title: 'only the default branch exists' },
    { events: eventsOf({ local: { ...aProject('app').project.local, branches: [branch('master'), branch('feat')] } as never }, 'feat'), title: 'the only other branch is checked out' },
    { events: eventsOf({ local: undefined }), title: 'there is no clone' },
    { events: eventsOf({ github: undefined }), title: 'there is no GitHub repo' },
    { events: eventsOf({ isOtherOwner: true, local: { ...aProject('app').project.local, branches: [branch('master'), branch('feat')] } as never }), title: 'the clone belongs to someone else' },
  ])('is not offered when $title', async ({ events }) => {
    expect.hasAssertions()
    stubApi()
    renderApp(scanRequest(events), '/project/app')
    await screen.findByTestId('actions')
    expect(screen.queryByTestId('action-delete-branches')).toBeNull()
  })

  it('shows the reason when the server refuses, and why a delete failed', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json({ ok: false, reason: 'no branch' }, { status: 409 }) })
    renderApp(scanRequest(withBranches('master', 'feature')), '/project/app')
    fireEvent.click(await screen.findByTestId('action-delete-branches'))
    await waitFor(() => expect(screen.getByTestId('delete-branches-refused').textContent).toBe('no branch'))
    expect((screen.getByTestId('delete-branches-confirm') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the error of a delete that failed', async () => {
    expect.hasAssertions()
    stubApi({ action: Response.json({ ok: false, reason: 'boom' }, { status: 409 }), preview: Response.json(preview) })
    renderApp(scanRequest(withBranches('master', 'feature')), '/project/app')
    fireEvent.click(await screen.findByTestId('action-delete-branches'))
    await screen.findByTestId('delete-branches-preview')
    fireEvent.click(screen.getByTestId('delete-branches-confirm'))
    await waitFor(() => expect(screen.getByTestId('delete-branches-error').textContent).toBe('boom'))
  })

  it('shows the error when the server cannot be asked', async () => {
    expect.hasAssertions()
    stubApi({ preview: new Error('offline') })
    renderApp(scanRequest(withBranches('master', 'feature')), '/project/app')
    fireEvent.click(await screen.findByTestId('action-delete-branches'))
    await waitFor(() => expect(screen.getByTestId('delete-branches-refused').textContent).toBe('offline'))
  })
})
