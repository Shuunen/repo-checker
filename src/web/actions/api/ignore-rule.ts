import { type ActionResult, refused } from '../../../shared/action.ts'

/**
 * Ask the server to ignore a rule on a project for 24 hours. The `x-repo-check` header is required by the server for any request that changes something
 * @param name the repo name
 * @param ruleId the rule to ignore
 * @throws {Error} with the reason when the server refused it or it failed
 * @example await postIgnoreRule('finga', 'deploy-down')
 */
export async function postIgnoreRule(name: string, ruleId: string) {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}/ignore-rule?rule=${encodeURIComponent(ruleId)}`, { headers: { 'x-repo-check': '1' }, method: 'POST' })
  const result = await (response.json().catch((): ActionResult => refused(`the server answered HTTP ${response.status}`)) as Promise<ActionResult>)
  if (!result.ok) throw new Error(result.reason)
}
