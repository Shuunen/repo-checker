import type { FileReader } from '../../engine/io.ts'
import { isPublishable } from '../../engine/package-json.ts'
import { requireProperty } from '../../engine/require-property.ts'
import { requireCommand, requireScript } from './scripts.utils.ts'

/** The vite config files, one of them using the unique-mark plugin means the build already marks the files */
const viteConfigFiles = ['vite.config.mts', 'vite.config.ts', 'vite.config.mjs', 'vite.config.js']

/**
 * Tell if a vite config of the project uses the unique-mark plugin
 * @param files the reader of the project files
 * @returns true when it does
 */
async function isMarkedByVite(files: FileReader) {
  const texts = await Promise.all(viteConfigFiles.map(file => files.readText(file)))
  return texts.some(text => text?.includes('unique-mark') === true)
}

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
  requireCommand({
    id: 'scripts-unique-mark',
    message: 'no unique-mark task, like "mark": "unique-mark public/my-file && echo mark success"',
    pattern: /\bunique-mark\b/u,
    severity: 'warning',
    when: async ({ files, flags, pkg }) => flags.isUsingShuutils === true && pkg?.scripts?.build !== undefined && !(await isMarkedByVite(files)),
  }),
]
