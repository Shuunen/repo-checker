import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ScanEvent } from '../../../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from '../../test/fixtures.ts'
import { renderApp } from '../../test/render-app.tsx'

const settings = { allowMergeCommit: true, allowRebaseMerge: true, allowSquashMerge: true, deleteBranchOnMerge: false, hasPushProtection: true, hasSecretScanning: true }

/**
 * A GitHub repo like the one of the fixtures, with settings
 * @returns the repo
 */
function repoWithSettings() {
  return { ...aProject('finga').project.github, settings } as never
}

/**
 * The scan events of one project whose finding offers to fix the GitHub settings
 * @param hasGithub false for a project that is not on GitHub
 * @returns the events
 */
function eventsOf(hasGithub: boolean): ScanEvent[] {
  const github = hasGithub ? repoWithSettings() : undefined
  const finding = aFinding({ actions: ['fix-github-settings'], message: 'the repo keeps merged branches', messageId: 'missing', ruleId: 'repo-delete-branch-on-merge', scope: 'project', severity: 'info' })
  return [
    { isNitpick: false, target: '/projects', type: 'started' },
    { result: aProject('finga', [finding], { github }), type: 'project' },
    { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
  ]
}

/**
 * Show the page of the project whose finding offers to fix the settings
 * @param hasGithub false for a project that is not on GitHub
 * @returns nothing
 */
function openProject(hasGithub = true) {
  const events = scanRequest(eventsOf(hasGithub))
  renderApp(events, '/project/finga')
}

describe('fix github settings', () => {
  it('lists the settings it will set, and runs only once confirmed, then scans only that project again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'fixed', ok: true }) })
    openProject()
    fireEvent.click(await screen.findByTestId('action-fix-github-settings'))
    const list = await screen.findByTestId('fix-github-settings-list')
    expect(list.textContent).toBe('delete the branch of a pull request once it is mergedforbid the merge commits, squash or rebase remain')
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByTestId('fix-github-settings-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/fix-github-settings', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/finga/rescan'))
  })

  it('does nothing on cancel', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'fixed', ok: true }) })
    openProject()
    fireEvent.click(await screen.findByTestId('action-fix-github-settings'))
    fireEvent.click(await screen.findByTestId('fix-github-settings-cancel'))
    await waitFor(() => expect(screen.queryByTestId('fix-github-settings-dialog-body')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the reason when GitHub refuses', async () => {
    expect.hasAssertions()
    stubApi({ action: Response.json({ ok: false, reason: 'Must have admin rights' }, { status: 409 }) })
    openProject()
    fireEvent.click(await screen.findByTestId('action-fix-github-settings'))
    fireEvent.click(await screen.findByTestId('fix-github-settings-confirm'))
    await waitFor(() => expect(screen.getByTestId('fix-github-settings-error').textContent).toBe('Must have admin rights'))
  })

  it('lists nothing for a project that is not on GitHub', async () => {
    expect.hasAssertions()
    openProject(false)
    fireEvent.click(await screen.findByTestId('action-fix-github-settings'))
    const list = await screen.findByTestId('fix-github-settings-list')
    expect(list.textContent).toBe('')
  })
})
