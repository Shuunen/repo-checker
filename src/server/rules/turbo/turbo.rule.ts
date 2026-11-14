import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { requireInFile } from '../../engine/file-rules.ts'
import { addIgnoreLine } from '../../engine/gitignore.ts'
import { hasDependency } from '../../engine/package-json.ts'
import { buildTurboJson, defaultInputs, collapseArrays, defaultTask, findTask, outputTasks, prefixed, readTurbo, rootPrefix, turboSchema, turboTasks } from './turbo.utils.ts'

export const turboInstalled = defineRule({
  appliesTo: ({ pkg }) => pkg !== undefined,
  async check({ files, pkg, report }) {
    if (!hasDependency(pkg, 'turbo')) report({ fix: () => [], installs: ['turbo'], messageId: 'dependency' })
    if ((await readTurbo(files)) === undefined) report({ fix: fixer => fixer.text('turbo.json', () => buildTurboJson(turboTasks(pkg), pkg)), messageId: 'file' })
  },
  meta: {
    fixable: true,
    id: 'turbo-installed',
    messages: {
      dependency: 'turbo is not a dependency, like "devDependencies": { "turbo": "^2.5" }',
      file: 'no turbo.json, turbo caches the tasks declared in it, like { "$schema": "https://turborepo.dev/schema.json", "tasks": { "lint:types": { "inputs": ["src/**", "tsconfig*.json"] } } }',
    },
    severity: 'warning',
  },
})

export const turboConfig = defineRule({
  appliesTo: async ({ files }) => (await readTurbo(files)) !== undefined,
  async check({ files, pkg, report }) {
    const turbo = await readTurbo(files)
    invariant(turbo !== undefined, 'appliesTo guarantees a turbo.json')
    const prefix = rootPrefix(turbo.tasks)
    if (turbo.$schema !== turboSchema) report({ fix: fixer => [fixer.json('turbo.json').set(['$schema'], turboSchema, { isFirst: true }), fixer.text('turbo.json', collapseArrays)], messageId: 'schema' })
    for (const name of turboTasks(pkg)) {
      const found = findTask(turbo.tasks, name)
      if (found === undefined) continue
      const { key, task } = found
      const wanted = prefixed(defaultTask(name, pkg), prefix)
      const inputs = task.inputs ?? []
      const handWritten = inputs.length > 0 && name !== 'lint:install' && !inputs.includes(defaultInputs)
      if (handWritten || (inputs.length === 0 && wanted.inputs !== undefined)) {
        const example = handWritten ? [defaultInputs, ...inputs] : wanted.inputs
        report({ data: { example: JSON.stringify(example), task: name }, fix: fixer => [fixer.json('turbo.json').set(['tasks', key, 'inputs'], example), fixer.text('turbo.json', collapseArrays)], messageId: 'inputs' })
      }
      const missingDependencies = (wanted.dependsOn ?? []).filter(dependency => task.dependsOn?.includes(dependency) !== true)
      if (missingDependencies.length > 0)
        report({
          data: { example: JSON.stringify(wanted.dependsOn), missing: missingDependencies.join(', '), task: name },
          fix: fixer => [fixer.json('turbo.json').set(['tasks', key, 'dependsOn'], [...(task.dependsOn ?? []), ...missingDependencies]), fixer.text('turbo.json', collapseArrays)],
          messageId: 'dependsOn',
        })
      if (outputTasks.includes(name) && (task.outputs?.length ?? 0) === 0)
        report({ data: { example: JSON.stringify(wanted.outputs), task: name }, fix: fixer => [fixer.json('turbo.json').set(['tasks', key, 'outputs'], wanted.outputs), fixer.text('turbo.json', collapseArrays)], messageId: 'outputs' })
    }
  },
  meta: {
    fixable: true,
    id: 'turbo-config',
    messages: {
      dependsOn: 'turbo.json task "{{task}}" does not depend on {{missing}}: every task needs the install first, and repo-check looks at the build output, like "dependsOn": {{example}}',
      inputs: 'turbo.json task "{{task}}" has inputs that miss files, without "inputs" turbo hashes every tracked file ("$TURBO_DEFAULT$"), a hand-written list must start from it and the install and repo-check tasks need their own, like "inputs": {{example}}',
      outputs: 'turbo.json task "{{task}}" has no outputs, so a cache hit does not restore its files, like "outputs": {{example}}',
      schema: `turbo.json should declare the "$schema": "${turboSchema}"`,
    },
    severity: 'warning',
  },
})

export const turboTasksDeclared = defineRule({
  appliesTo: async ({ files }) => (await readTurbo(files)) !== undefined,
  async check({ files, pkg, report }) {
    const turbo = await readTurbo(files)
    invariant(turbo !== undefined, 'appliesTo guarantees a turbo.json')
    const prefix = rootPrefix(turbo.tasks)
    for (const task of turboTasks(pkg).filter(name => findTask(turbo.tasks, name) === undefined)) {
      const declaration = prefixed(defaultTask(task, pkg), prefix)
      report({ data: { example: JSON.stringify(declaration), task }, fix: fixer => [fixer.json('turbo.json').set(['tasks', `${prefix}${task}`], declaration), fixer.text('turbo.json', collapseArrays)], messageId: 'missing' })
    }
  },
  meta: { fixable: true, id: 'turbo-tasks-declared', messages: { missing: 'the task "{{task}}" is run by "turbo run" or is a dependency of one, but is not declared in turbo.json, like "tasks": { "{{task}}": {{example}} }' }, severity: 'warning' },
})

export const gitignoreTurbo = requireInFile({
  files: ['.gitignore'],
  fix: text => addIgnoreLine(text, '.turbo'),
  id: 'gitignore-turbo',
  message: '{{file}} does not list .turbo, the turbo cache',
  pattern: /^\/?\.turbo\/?$/mu,
  severity: 'warning',
  when: ({ pkg }) => hasDependency(pkg, 'turbo'),
})
