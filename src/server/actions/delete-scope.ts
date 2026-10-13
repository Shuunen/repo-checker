import type { GhRunner } from '../inventory/github.ts'

/** What to run to give the gh token the right to delete a repo */
export const refreshCommand = 'gh auth refresh -s delete_repo'

/**
 * Tell if the gh token is known to lack the `delete_repo` scope, from the `X-OAuth-Scopes` header GitHub sends back. Fine-grained tokens and anything GitHub does not describe this way give no header: the answer is then unknown, and the delete is tried
 * @param gh runs gh
 * @returns the reason with the command to run when the scope is missing, undefined when it is there or unknown
 * @example const missing = await missingDeleteScope(ghCli)
 */
export async function missingDeleteScope(gh: GhRunner) {
  const { ok, stdout } = await gh(['api', '-i', 'user'])
  const header = ok ? stdout.split('\n').find(line => line.toLowerCase().startsWith('x-oauth-scopes:')) : undefined
  if (header === undefined) return undefined
  const scopes = header
    .slice(header.indexOf(':') + 1)
    .split(',')
    .map(scope => scope.trim())
  return scopes.includes('delete_repo') ? undefined : `the gh token has no delete_repo scope, run: ${refreshCommand}`
}
