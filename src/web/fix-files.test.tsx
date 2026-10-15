import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { FixPreview } from '../shared/action.ts'
import type { ScanEvent } from '../shared/scan-event.ts'
import { aFinding, aProject, scanRequest, stubApi } from './fixtures.ts'
import { renderApp } from './render-app.tsx'

const noLicense = aFinding({ fixFiles: ['package.json'], message: 'package.json has no license', ruleId: 'package-license' })
const noBadge = aFinding({ fixFiles: ['README.md', 'package.json'], message: 'the README has no badge', ruleId: 'readme-badges' })
const noFix = aFinding({ message: 'no .nvmrc', ruleId: 'nvmrc-exists' })
const events = (findings = [noLicense, noBadge, noFix]): ScanEvent[] => [
  { target: '/projects', type: 'started' },
  { result: aProject('app', findings), type: 'project' },
  { durationMs: 1000, isSingle: false, owner: 'owner', type: 'done' },
]
const preview: FixPreview = {
  blocked: [{ file: 'README.md', reason: 'it has uncommitted changes' }],
  fingerprint: 'abc123',
  installs: ['knip', 'vitest'],
  ok: true,
  path: '/projects/app',
  plans: [
    { after: '{\n  "license": "MIT",\n  "name": "app"\n}\n', before: '{\n  "name": "app"\n}\n', file: 'package.json' },
    { after: '# new\n', before: '', file: 'docs/new.md' },
  ],
}

/**
 * Open the project and the fix dialog, once the server has planned the fixes
 * @param request answers the scan request
 * @returns the scan request
 */
async function openConfirmation(request = scanRequest(events())) {
  renderApp(request, '/project/app')
  fireEvent.click(await screen.findByTestId('action-fix-files'))
  await waitFor(() => expect(screen.queryByTestId('fix-checking')).toBeNull())
  return request
}

describe('fix files', () => {
  it('counts the findings that have a fix and the files they rewrite, and only shows when there are some', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events()), '/project/app')
    const card = await screen.findByTestId('fixes')
    expect(card.textContent).toContain('2 findings can be fixed by rewriting 2 files.')
  })

  it('has no fix card for a project without fix', async () => {
    expect.hasAssertions()
    renderApp(scanRequest(events([noFix])), '/project/app')
    await screen.findByTestId('findings')
    expect(screen.queryByTestId('fixes')).toBeNull()
  })

  it('plans again first, then shows a diff per file, and the files that are left alone', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    renderApp(scanRequest(events()), '/project/app')
    fireEvent.click(await screen.findByTestId('action-fix-files'))
    await screen.findByTestId('fix-checking')
    await screen.findByTestId('fix-preview')
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/fix-files')
    expect(within(screen.getByTestId('diff-package.json')).getByText('+ "license": "MIT",')).toBeDefined()
    expect(screen.getByTestId('diff-docs/new.md').textContent).toContain('docs/new.md (new file)+ # new')
    expect(screen.getByTestId('fix-blocked-README.md').textContent).toBe('README.md is left alone, it has uncommitted changes.')
    expect((screen.getByTestId('fix-confirm') as HTMLButtonElement).disabled).toBe(false)
  })

  it('says which dev dependencies are installed after the files are written', async () => {
    expect.hasAssertions()
    stubApi({ preview: Response.json(preview) })
    await openConfirmation()
    expect(screen.getByTestId('fix-installs').textContent).toBe('Then installs knip, vitest with the package manager of the project.')
  })

  it.each([
    ['the reason the server refuses', Response.json({ ok: false, reason: 'no file of owner/app has a fix to apply' }, { status: 409 }), 'no file of owner/app has a fix to apply'],
    ['the status of an answer that is not json', new Response('oops', { status: 500 }), 'the server answered HTTP 500'],
    ['why the server could not be asked', new Error('Failed to fetch'), 'Failed to fetch'],
  ])('shows %s and cannot apply', async (_name, response, reason) => {
    expect.hasAssertions()
    stubApi({ preview: response })
    await openConfirmation()
    expect(screen.getByTestId('fix-refused').textContent).toBe(reason)
    expect((screen.getByTestId('fix-confirm') as HTMLButtonElement).disabled).toBe(true)
  })

  it('closes without writing on cancel', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ preview: Response.json(preview) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('fix-cancel'))
    await waitFor(() => expect(screen.queryByTestId('fix-dialog-body')).toBeNull())
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
  })

  it('writes when confirmed, with the fingerprint of the plan shown and the action header, then scans only that project again', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'fixed 2 files', ok: true }), preview: Response.json(preview) })
    const request = await openConfirmation()
    fireEvent.click(screen.getByTestId('fix-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/rescan'))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/fix-files?fingerprint=abc123&commit=true', { headers: { 'x-repo-check': '1' }, method: 'POST' })
    expect(request).toHaveBeenCalledOnce()
  })

  it('offers a checked Auto commit fixes toggle, and does not ask for a commit once it is unchecked', async () => {
    expect.hasAssertions()
    const fetchMock = stubApi({ action: Response.json({ message: 'fixed 2 files', ok: true }), preview: Response.json(preview) })
    await openConfirmation()
    const toggle = screen.getByLabelText('Auto commit fixes') as HTMLInputElement
    expect(toggle.checked).toBe(true)
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle.checked).toBe(false))
    fireEvent.click(screen.getByTestId('fix-confirm'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/rescan'))
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/app/fix-files?fingerprint=abc123', { headers: { 'x-repo-check': '1' }, method: 'POST' })
  })

  it('replaces the diffs and the toggle with the step the fix is in while it runs, then closes', async () => {
    expect.hasAssertions()
    const encoder = new TextEncoder()
    const { readable, writable } = new TransformStream<Uint8Array>()
    const writer = writable.getWriter()
    const send = (text: string) => writer.write(encoder.encode(text))
    stubApi({ action: new Response(readable, { headers: { 'content-type': 'application/x-ndjson' } }), preview: Response.json(preview) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('fix-confirm'))
    await screen.findByTestId('fix-stage-writing')
    expect(screen.queryByTestId('fix-preview')).toBeNull()
    expect(screen.queryByTestId('fix-commit')).toBeNull()
    await send('{"stage":"checking"}\n{"stage":"comm')
    await screen.findByTestId('fix-stage-checking')
    await send('itting"}\n')
    await screen.findByTestId('fix-stage-committing')
    await send('{"stage":"pushing"}\n')
    await screen.findByTestId('fix-stage-pushing')
    await send('{"result":{"message":"fixed 2 files","ok":true}}\n')
    await writer.close()
    await waitFor(() => expect(screen.queryByTestId('fix-dialog-body')).toBeNull())
  })

  it('shows why when the stream ends without a result, and gives the diffs and the toggle back', async () => {
    expect.hasAssertions()
    stubApi({ action: new Response('{"stage":"checking"}\n', { headers: { 'content-type': 'application/x-ndjson' } }), preview: Response.json(preview) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('fix-confirm'))
    const error = await screen.findByTestId('fix-error')
    expect(error.textContent).toBe('the server stopped answering before the end of the action')
    expect(screen.getByTestId('fix-commit')).toBeDefined()
  })

  it('tells with a modal that the auto commit was prevented when the check failed, even once no fix is left', async () => {
    expect.hasAssertions()
    stubApi({ action: Response.json({ commitBlocked: 'lint exploded', message: 'fixed 2 files', ok: true }), preview: Response.json(preview), rescan: Response.json({ ok: true, project: aProject('app', [noFix]), target: '/projects' }) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('fix-confirm'))
    const output = await screen.findByTestId('commit-blocked-output')
    expect(output.textContent).toBe('lint exploded')
    expect(screen.getByTestId('commit-blocked-body').textContent).toContain('nothing was committed or pushed because pnpm check failed')
    fireEvent.click(screen.getByTestId('commit-blocked-close'))
    await waitFor(() => expect(screen.queryByTestId('commit-blocked-body')).toBeNull())
  })

  it('keeps the dialog open and shows why when the plan changed', async () => {
    expect.hasAssertions()
    const reason = 'the fixes are not what the dialog listed any more, nothing was written, open the dialog again'
    stubApi({ action: Response.json({ ok: false, reason }, { status: 409 }), preview: Response.json(preview) })
    await openConfirmation()
    fireEvent.click(screen.getByTestId('fix-confirm'))
    const error = await screen.findByTestId('fix-error')
    expect(error.textContent).toBe(reason)
  })
})
