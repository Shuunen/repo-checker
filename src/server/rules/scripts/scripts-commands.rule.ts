import { defineRule } from '../../engine/define-rule.ts'
import { hasDependency, scriptsMatching } from '../../engine/package-json.ts'
import { isUsingEslint } from './scripts.utils.ts'

const echoTasks = ['build', 'check', 'lint', 'test']

export const scriptsFinalEcho = defineRule({
  check({ pkg, report }) {
    const scripts = pkg?.scripts ?? {}
    const missing = echoTasks.filter(task => scripts[task] !== undefined && !new RegExp(`.+ && echo [\\w\\s]*${task} \\w+`, 'u').test(scripts[task]))
    for (const task of missing) report({ data: { task }, messageId: 'missing' })
  },
  meta: { id: 'scripts-final-echo', messages: { missing: 'script "{{task}}" has no final echo, like "{{task}}": "... && echo {{task}} success"' }, severity: 'warning' },
})

export const scriptsEslintCache = defineRule({
  appliesTo: isUsingEslint,
  check({ pkg, report }) {
    for (const [name] of scriptsMatching(pkg, /\beslint (?!.*--cache)/u)) report({ data: { name }, fix: fixer => fixer.json('package.json').update(['scripts', name], current => String(current).replace('eslint ', 'eslint --cache ')), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'scripts-eslint-cache', messages: { missing: 'script "{{name}}" runs eslint without --cache, like "eslint --cache ..."' }, severity: 'warning' },
})

export const scriptsTsNodeTranspileOnly = defineRule({
  appliesTo: ({ pkg }) => hasDependency(pkg, 'ts-node') || scriptsMatching(pkg, /\bts-node\b/u).length > 0,
  async check({ files, report }) {
    for (const file of await files.search(/ts-node(?:-esm)? (?:(?!transpileOnly).)*$/mu)) report({ data: { file }, messageId: 'found' })
  },
  meta: { id: 'scripts-ts-node-transpile-only', messages: { found: 'ts-node runs without --transpileOnly in {{file}}' }, severity: 'warning' },
})
