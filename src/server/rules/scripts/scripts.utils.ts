/**
 * Replace npm run by pnpm, and drop the -- before flags that pnpm does not need
 * @param script the script command
 * @returns the script using pnpm
 */
export function toPnpm(script: string) {
  return script.replaceAll('npm run', 'pnpm').replaceAll(/pnpm (?<task>[\w:]+) -- -/gu, 'pnpm $<task> -')
}
