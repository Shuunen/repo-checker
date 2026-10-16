import { repoFlags } from './guards.ts'

describe(repoFlags, () => {
  it('reads the repo on GitHub', async () => {
    expect.hasAssertions()
    const body = JSON.stringify({ archived: false, default_branch: 'master', description: 'A tool', fork: false, homepage: 'https://t.app', name: 'tool', open_issues_count: 0, owner: { login: 'me' }, private: true, pushed_at: '2026-01-01T00:00:00Z' })
    const flags = await repoFlags(() => Promise.resolve({ ok: true, stderr: '', stdout: body }), 'me/tool')
    expect(flags).toMatchObject({ githubDescription: 'A tool', isPrivate: true })
  })

  it('falls back when GitHub cannot say', async () => {
    expect.hasAssertions()
    const flags = await repoFlags(() => Promise.resolve({ ok: false, stderr: 'boom', stdout: '' }), 'me/tool')
    expect(flags).toMatchObject({ isPrivate: false })
  })
})
