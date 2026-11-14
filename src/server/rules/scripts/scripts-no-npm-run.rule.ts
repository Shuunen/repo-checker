import { defineRule } from '../../engine/define-rule.ts'
import { toPnpm } from './scripts.utils.ts'

const npmRun = /\bnpm run\b/u

export const scriptsNoNpmRun = defineRule({
  check({ pkg, report }) {
    const scripts = Object.entries(pkg?.scripts ?? {}).filter(([, script]) => npmRun.test(script))
    for (const [name] of scripts) report({ data: { name }, fix: fixer => fixer.json('package.json').update(['scripts', name], current => toPnpm(String(current))), messageId: 'found' })
  },
  meta: { fixable: true, id: 'scripts-no-npm-run', messages: { found: 'script "{{name}}" uses npm run, use pnpm instead, it is faster' }, severity: 'warning' },
})
