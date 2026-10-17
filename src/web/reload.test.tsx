import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const events: ScanEvent[] = [
  { target: '/projects', type: 'started' },
  { result: aProject('finga'), type: 'project' },
  { result: aProject('other'), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]

describe('a reload on a project page', () => {
  it('scans only that project, then every project once the list is opened', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ rescan: Response.json({ ok: true, project: aProject('finga'), target: '/projects' }) })
    const request = renderApp(scanRequest(events), '/project/finga', true)
    await screen.findByTestId('back')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/rescan'))
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('back'))
    await screen.findByTestId('row-other')
    expect(request).toHaveBeenCalledOnce()
  })

  it('says when the scan has no such project', async () => {
    expect.hasAssertions()
    stubApi({ rescan: Response.json({ ok: true, target: '/projects' }) })
    const request = renderApp(scanRequest(events), '/project/gone', true)
    await waitFor(() => expect(screen.getByTestId('project-missing').textContent).toBe('No project named gone in this scan'))
    expect(request).not.toHaveBeenCalled()
  })

  it('scans every project when the project cannot be scanned alone', async () => {
    expect.hasAssertions()
    stubApi({ rescan: Response.json({ ok: false, reason: 'the target is a single project' }, { status: 409 }) })
    const request = renderApp(scanRequest(events), '/project/finga', true)
    await waitFor(() => expect(request).toHaveBeenCalledOnce())
    await screen.findByTestId('back')
    expect(request).toHaveBeenCalledOnce()
  })
})
