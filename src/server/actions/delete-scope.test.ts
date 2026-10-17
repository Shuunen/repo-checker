import type { GhRunner } from '../inventory/github.ts'
import { missingDeleteScope, refreshCommand } from './delete-scope.ts'

/**
 * A gh that answers `gh api -i user` with the given raw output
 * @param stdout the output, headers then body
 * @param ok whether the call works
 * @returns the fake runner
 */
function ghAnswering(stdout: string, ok = true) {
  return vi.fn<GhRunner>(() => Promise.resolve({ ok, stderr: ok ? '' : 'gh: not logged in', stdout }))
}

describe(missingDeleteScope, () => {
  it('says to refresh the token when the scopes have no delete_repo', async () => {
    expect.hasAssertions()
    const gh = ghAnswering('HTTP/2.0 200 OK\nX-Oauth-Scopes: gist, repo\n\n{"login":"me"}')
    await expect(missingDeleteScope(gh)).resolves.toBe(`the gh token has no delete_repo scope, run: ${refreshCommand}`)
    expect(gh).toHaveBeenCalledWith(['api', '-i', 'user'])
  })

  it.each([
    ['the scope is there', 'HTTP/2.0 200 OK\nx-oauth-scopes: repo, delete_repo, gist\n\n{}'],
    ['the token has no scopes header, a fine-grained token', 'HTTP/2.0 200 OK\ncontent-type: application/json\n\n{}'],
  ])('says nothing when %s', async (_name, stdout) => {
    expect.hasAssertions()
    await expect(missingDeleteScope(ghAnswering(stdout))).resolves.toBeUndefined()
  })

  it('says nothing when gh cannot tell, the delete is tried and GitHub answers', async () => {
    expect.hasAssertions()
    await expect(missingDeleteScope(ghAnswering('', false))).resolves.toBeUndefined()
  })
})
