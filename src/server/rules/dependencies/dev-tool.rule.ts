import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'

/** The tools a project only needs to build, check or test, never to run: they belong in `devDependencies`, the bundler already inlines what the app uses */
const devTools = new Set(['@tailwindcss/vite', 'knip', 'oxfmt', 'oxlint', 'tailwindcss', 'turbo', 'typescript', 'vite', 'vitest'])

/**
 * Tell if a dependency is a tool that belongs in `devDependencies`
 * @param name the dependency name
 * @returns true for a build, check or test tool, and for the `@types/*` packages
 * @example isDevTool('@types/node') // true
 */
function isDevTool(name: string) {
  return devTools.has(name) || name.startsWith('@types/')
}

export const devToolInDependencies = defineRule({
  appliesTo: ({ flags, pkg }) => pkg?.dependencies !== undefined && flags.isPublishedPackage !== true,
  check({ pkg, report }) {
    invariant(pkg?.dependencies !== undefined, 'appliesTo guarantees dependencies')
    for (const [name, version] of Object.entries(pkg.dependencies).filter(([dependency]) => isDevTool(dependency)))
      report({
        data: { name },
        fix: fixer => [
          fixer.json('package.json').update(['devDependencies', name], current => current ?? version),
          fixer.json('package.json').update(['dependencies'], current => {
            const rest = Object.entries(current as Record<string, string>).filter(([dependency]) => dependency !== name)
            return rest.length === 0 ? undefined : Object.fromEntries(rest)
          }),
        ],
        messageId: 'found',
      })
  },
  meta: { fixable: true, id: 'dev-tool-in-dependencies', messages: { found: '{{name}} is a build, check or test tool, move it from dependencies to devDependencies' }, severity: 'warning' },
})
