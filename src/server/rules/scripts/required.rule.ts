import { isPublishable } from '../../engine/package-json.ts'
import { requireProperty } from '../../engine/require-property.ts'
import { requireCommand, requireScript } from './scripts.utils.ts'

export const requiredScriptRules = [
  requireProperty({ id: 'scripts-section', key: 'scripts', severity: 'error' }),
  requireScript({ id: 'scripts-check', message: 'no "check" script, like "check": "pnpm build && pnpm lint && pnpm test"', name: 'check', severity: 'warning' }),
  requireScript({ fix: ({ pkg }) => (pkg?.scripts?.check === undefined ? undefined : 'pnpm check'), id: 'scripts-preversion', message: 'no "preversion" script for version automation, like "preversion": "pnpm check"', name: 'preversion', severity: 'warning', when: ({ pkg }) => isPublishable(pkg) }),
  requireScript({
    fix: () => 'git push && git push --tags',
    id: 'scripts-postversion',
    message: 'no "postversion" script for version automation, like "postversion": "git push && git push --tags", plus "&& npm publish" for a published package',
    name: 'postversion',
    severity: 'warning',
    when: ({ pkg }) => isPublishable(pkg),
  }),
  requireCommand({ id: 'scripts-depcruise', message: 'no script runs depcruise, like "lint:dep": "depcruise src --config"', pattern: /\bdepcruise\s/u, severity: 'error', when: ({ flags }) => flags.isUsingDependencyCruiser === true }),
  requireCommand({ id: 'scripts-typescript-check', message: 'no script runs tsc, like "build": "tsc" or "check": "tsc --noEmit"', pattern: /\btsc\b/u, severity: 'error', when: ({ flags }) => flags.isUsingTypescript === true }),
  requireCommand({ id: 'scripts-unique-mark', message: 'no unique-mark task, like "mark": "unique-mark public/my-file && echo mark success"', pattern: /\bunique-mark\b/u, severity: 'warning', when: ({ flags, pkg }) => flags.isUsingShuutils === true && pkg?.scripts?.build !== undefined }),
]
