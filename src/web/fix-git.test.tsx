import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { GitFixPreview, FixPreview } from '../shared/action.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const noLicense = aFinding({ fixFiles: ['package.json'], message: 'package.json has no license', ruleId: 'package-license' })
const stash = aFinding({ message: '1 stash never reapplied or dropped', ruleId: 'forgotten-stash', scope: 'project' })
const events = (findings = [stash]): ScanEvent[] => [
  { isNitpick: false, target: '/projects', type: 'started' },
  { result: aProject('app', findings), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]
const gitPreview: GitFixPreview = { branches: ['old'], fingerprint: 'def', ok: true, path: '/projects/app', pull: 'master', stashes: ['stash@{0}: WIP'] }
const filesPreview: FixPreview = { fingerprint: 'abc', installs: [], merged: [], ok: true, path: '/projects/app', plans: [{ after: 'b', before: 'a', file: 'package.json' }] }

/**
 * Stub the server: each preview by its route, every post answered with the given answer
 * @param action the answer of the posts
 * @param git the answer of the git preview
 * @param files the answer of the files preview
 * @returns the fetch mock
 */
function stubRoutes(action = Response.json({ message: 'done', ok: true }), git = Response.json(gitPreview), files = Response.json(filesPreview)) {
  const fetchMock = vi.fn<typeof fetch>((url, init) => {
    if (init?.method === 'POST') return Promise.resolve(action.clone())
    if (String(url).endsWith('/rescan')) return Promise.resolve(Response.json({ ok: true }))
    return Promise.resolve(String(url).endsWith('/fix-git') ? git.clone() : files.clone())
  })
  vi.stubGlobal('fetch', fetchMock)
  onTestFinished(() => {
    vi.unstubAllGlobals()
  })
  return fetchMock
}

/**
 * The urls the page posted to
 * @param fetchMock the fetch mock
 * @returns the urls, in order
 */
function postedUrls(fetchMock: ReturnType<typeof stubRoutes>) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').map(([url]) => String(url))
}

describe('fix git', () => {
  it('offers only the git fixes for a project with only git issues', async () => {
    expect.hasAssertions()
    stubRoutes()
    renderApp(scanRequest(events()), '/project/app')
    const card = await screen.findByTestId('fixes')
    expect(card.textContent).toContain('1 git issue can be fixed in the clone.')
    expect(screen.queryByTestId('action-fix-files')).toBeNull()
    expect(screen.queryByTestId('action-fix-all')).toBeNull()
  })

  it('shows what it would do, then fixes with the fingerprint', async () => {
    expect.hasAssertions()
    const fetchMock = stubRoutes()
    renderApp(scanRequest(events()), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-git'))
    await screen.findByTestId('fix-git-preview')
    expect(screen.getByTestId('fix-git-pull').textContent).toBe('Pull master, fast forward only.')
    expect(screen.getByTestId('fix-git-stashes').textContent).toContain('stash@{0}: WIP')
    expect(screen.getByTestId('fix-git-branches').textContent).toContain('old')
    fireEvent.click(screen.getByTestId('fix-git-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/fix-git?fingerprint=def', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
  })

  it('shows only what there is to do', async () => {
    expect.hasAssertions()
    stubRoutes(undefined, Response.json({ ...gitPreview, branches: [], pull: undefined, stashes: [] }))
    renderApp(scanRequest(events()), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-git'))
    await screen.findByTestId('fix-git-preview')
    expect(screen.queryByTestId('fix-git-pull')).toBeNull()
    expect(screen.queryByTestId('fix-git-stashes')).toBeNull()
    expect(screen.queryByTestId('fix-git-branches')).toBeNull()
  })

  it('shows the reason when the server refuses, and why a fix failed', async () => {
    expect.hasAssertions()
    stubRoutes(Response.json({ ok: false, reason: 'git pull failed' }, { status: 409 }), Response.json({ ok: false, reason: 'no git issue' }, { status: 409 }))
    renderApp(scanRequest(events()), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-git'))
    await waitFor(() => expect(screen.getByTestId('fix-git-refused').textContent).toBe('no git issue'))
    expect((screen.getByTestId('fix-git-confirm') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the error of a fix that failed', async () => {
    expect.hasAssertions()
    stubRoutes(Response.json({ ok: false, reason: 'git pull failed' }, { status: 409 }))
    renderApp(scanRequest(events()), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-git'))
    await screen.findByTestId('fix-git-preview')
    fireEvent.click(screen.getByTestId('fix-git-confirm'))
    await waitFor(() => expect(screen.getByTestId('fix-git-error').textContent).toBe('git pull failed'))
  })

  it('shows the error when the server cannot be asked', async () => {
    expect.hasAssertions()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.reject(new Error('offline'))),
    )
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    renderApp(scanRequest(events()), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-git'))
    await waitFor(() => expect(screen.getByTestId('fix-git-refused').textContent).toBe('offline'))
  })
})

describe('fix all', () => {
  it('is the primary button next to the two others when both kinds of issue exist', async () => {
    expect.hasAssertions()
    stubRoutes()
    renderApp(scanRequest(events([noLicense, stash])), '/project/app')
    await screen.findByTestId('action-fix-all')
    expect(screen.getByTestId('action-fix-all').className).toContain('primary')
    expect(screen.getByTestId('action-fix-files')).toBeDefined()
    expect(screen.getByTestId('action-fix-git')).toBeDefined()
    expect(screen.getByTestId('fixes').textContent).toContain('1 finding can be fixed by rewriting 1 file. 1 git issue can be fixed in the clone.')
  })

  it('shows both plans in one dialog, then fixes the git issues and the files', async () => {
    expect.hasAssertions()
    const fetchMock = stubRoutes()
    renderApp(scanRequest(events([noLicense, stash])), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-all'))
    await screen.findByTestId('fix-git-preview')
    await screen.findByTestId('fix-preview')
    fireEvent.click(screen.getByTestId('fix-all-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/fix-files?fingerprint=abc&commit=true', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
    expect(postedUrls(fetchMock)).toStrictEqual(['/api/projects/app/fix-git?fingerprint=def', '/api/projects/app/fix-files?fingerprint=abc&commit=true'])
  })

  it('skips the git fixes when the server has none to do', async () => {
    expect.hasAssertions()
    const fetchMock = stubRoutes(undefined, Response.json({ ok: false, reason: 'no git issue' }, { status: 409 }))
    renderApp(scanRequest(events([noLicense, stash])), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-all'))
    await screen.findByTestId('fix-preview')
    fireEvent.click(screen.getByTestId('fix-all-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/fix-files?fingerprint=abc&commit=true', { headers: { 'x-repo-check': '1' }, method: 'POST' }))
    expect(postedUrls(fetchMock)).toStrictEqual(['/api/projects/app/fix-files?fingerprint=abc&commit=true'])
  })

  it('stops at the first fix that fails and shows why', async () => {
    expect.hasAssertions()
    const fetchMock = stubRoutes(Response.json({ ok: false, reason: 'git pull failed' }, { status: 409 }))
    renderApp(scanRequest(events([noLicense, stash])), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-all'))
    await screen.findByTestId('fix-preview')
    fireEvent.click(screen.getByTestId('fix-all-confirm'))
    await waitFor(() => expect(screen.getByTestId('fix-git-error').textContent).toBe('git pull failed'))
    expect(postedUrls(fetchMock)).toHaveLength(1)
  })

  it('closes without changing anything on cancel', async () => {
    expect.hasAssertions()
    const fetchMock = stubRoutes()
    renderApp(scanRequest(events([noLicense, stash])), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-all'))
    await screen.findByTestId('fix-preview')
    fireEvent.click(screen.getByTestId('fix-all-cancel'))
    await waitFor(() => expect(screen.queryByTestId('fix-all-dialog-body')).toBeNull())
    expect(postedUrls(fetchMock)).toHaveLength(0)
  })

  it('fixes only the git issues when the files have nothing to fix', async () => {
    expect.hasAssertions()
    const fetchMock = stubRoutes(undefined, undefined, Response.json({ ok: false, reason: 'no fix' }, { status: 409 }))
    renderApp(scanRequest(events([noLicense, stash])), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-all'))
    await screen.findByTestId('fix-git-preview')
    await waitFor(() => expect(screen.queryByTestId('fix-checking')).toBeNull())
    fireEvent.click(screen.getByTestId('fix-all-confirm'))
    await waitFor(() => expect(postedUrls(fetchMock)).toStrictEqual(['/api/projects/app/fix-git?fingerprint=def']))
  })
})
