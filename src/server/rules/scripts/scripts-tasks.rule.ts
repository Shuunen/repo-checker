import { defineRule } from '../../engine/define-rule.ts'
import { hasDependency, type PackageJson, scriptsMatching } from '../../engine/package-json.ts'
import { checkTasks, convexTypes, dropReferences, duplicateOf, exampleScript, lintTasks, missingCommand, parseTask, requiredTasks, stepNames, taskCommands, taskScript } from './tasks.utils.ts'

/** The version range written when bun is added, the install that follows picks the latest */
const bunRange = '^1.3.0'

/**
 * Add `bun: true` to the `allowBuilds` of a pnpm-workspace.yaml, so pnpm runs its install script
 * @param text the current text, empty when the file does not exist
 * @returns the new text
 * @example allowBun('') // 'allowBuilds:\n  bun: true\n'
 */
function allowBun(text: string) {
  if (/^\s+bun:/mu.test(text)) return text.replace(/^(?<key>\s+bun:\s*)\S+/mu, '$<key>true')
  if (/^allowBuilds:/mu.test(text)) return text.replace(/^allowBuilds:.*$/mu, match => `${match}\n  bun: true`)
  return `${text.trim() === '' ? '' : `${text.trimEnd()}\n`}allowBuilds:\n  bun: true\n`
}

export const scriptsRequiredTasks = defineRule({
  appliesTo: ({ pkg }) => pkg?.scripts !== undefined,
  async check(context) {
    const scripts = (context.pkg as PackageJson).scripts as Record<string, string>
    const required = await requiredTasks(context)
    const missing = required.filter(task => scripts[task] === undefined)
    const found = await Promise.all(missing.map(async task => ({ command: await missingCommand(context, task), example: await exampleScript(context, task), task })))
    for (const { command, example, task } of found) context.report({ data: { example, task }, ...(command !== undefined && { fix: fixer => fixer.json('package.json').set(['scripts', task], taskScript(task, command)) }), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'scripts-required-tasks', messages: { missing: 'no "{{task}}" script, every project has the same tasks, like "{{task}}": "{{example}}"' }, severity: 'warning' },
})

export const scriptsCommands = defineRule({
  appliesTo: ({ pkg }) => pkg?.scripts !== undefined,
  async check(context) {
    const entries = await Promise.all(Object.entries((context.pkg as PackageJson).scripts as Record<string, string>).map(async ([task, script]) => ({ accepted: await taskCommands(context, task), script, task })))
    for (const { accepted, script, task } of entries) {
      const { command } = parseTask(script)
      const convex = task === 'lint:types' && command.endsWith(convexTypes) ? convexTypes : ''
      if (accepted.length === 0 || accepted.includes(command.slice(0, command.length - convex.length))) continue
      if (task === 'lint:repo' && !command.includes('repo-check')) {
        context.report({ data: { actual: command }, messageId: 'custom' })
        continue
      }
      const expected = `${String(accepted[0])}${convex}`
      context.report({ data: { actual: command, expected, task }, fix: fixer => fixer.json('package.json').update(['scripts', task], current => taskScript(task, expected, parseTask(String(current)).hint)), messageId: 'wrong' })
    }
  },
  meta: {
    fixable: true,
    id: 'scripts-commands',
    messages: {
      custom: 'script "lint:repo" runs "{{actual}}" but the name is for "repo-check", rename your script (like "lint:sources") then add "lint:repo": "repo-check"',
      wrong: 'script "{{task}}" runs "{{actual}}", it should run "{{expected}}"',
    },
    severity: 'warning',
  },
})

/** The scripts that only wrap other tasks, so a `pnpm <name>` step to them is already covered by the tasks run by turbo */
const wrapperNames = new Set(['check', 'lint', 'test'])

/**
 * List the tasks the old steps of a script ran, to keep running them with turbo: the `pnpm <task>` steps to a script that is neither a wrapper, nor a leftover
 * @param scripts the scripts
 * @param command the command of the `check` or `lint` script
 * @returns the task names
 * @example carriedTasks({ 'lint:cli': 'bun cli.ts' }, 'pnpm lint:cli && pnpm lint:format') // ['lint:cli']
 */
function carriedTasks(scripts: Readonly<Record<string, string>>, command: string) {
  const hasBuildTasks = Object.keys(scripts).some(name => name.startsWith('build:'))
  return stepNames(command).filter(name => {
    const script = scripts[name]
    return script !== undefined && !wrapperNames.has(name) && !script.startsWith('turbo run ') && !(name === 'build' && hasBuildTasks) && duplicateOf(name, script) === undefined
  })
}

/**
 * Get the tasks `check` or `lint` must run through turbo: the agreed ones the project has, the steps it ran before (`check` also runs the steps of `lint`), and for `check` its build tasks
 * @param task `check` or `lint`
 * @param scripts the scripts
 * @returns the task names
 */
function wantedTasks(task: 'check' | 'lint', scripts: Readonly<Record<string, string>>) {
  const agreed = (task === 'check' ? checkTasks : lintTasks).filter(name => scripts[name] !== undefined)
  const builds = task === 'check' ? Object.keys(scripts).filter(name => name.startsWith('build:')) : []
  const carried = [scripts[task], ...(task === 'check' ? [scripts.lint] : [])].flatMap(script => (script === undefined ? [] : carriedTasks(scripts, parseTask(script).command)))
  return [...new Set([...agreed, ...builds, ...carried])]
}

/** The flag of the `turbo run` of `check`, so only the errors fill the output */
const quietLogs = '--output-logs=errors-only'

/**
 * Put the missing tasks in a `turbo run` command: `lint:install` first, the others last. A script that has no `turbo run` yet gets one, built from the tasks. The `check` command also gets `--output-logs=errors-only`, right after `turbo run`
 * @param script the script text
 * @param missing the tasks to add
 * @param task the script name, `check` or `lint`
 * @returns the script text
 */
function withTurbo(script: string, missing: readonly string[], task: string) {
  const steps = parseTask(script).command.split(' && ')
  const index = steps.findIndex(step => step.startsWith('turbo run '))
  const given = (index === -1 ? [] : String(steps[index]).slice('turbo run '.length).split(' ')).filter(argument => task !== 'check' || !argument.startsWith('--output-logs'))
  const added = missing.filter(name => !given.includes(name))
  const logs = task === 'check' ? [quietLogs] : []
  const turbo = `turbo run ${[...logs, ...added.filter(name => name === 'lint:install'), ...given, ...added.filter(name => name !== 'lint:install')].join(' ')}`
  return (index === -1 ? [turbo] : steps.with(index, turbo)).join(' && ')
}

export const scriptsCheckTurbo = defineRule({
  appliesTo: ({ pkg }) => pkg?.scripts !== undefined,
  check({ pkg, report }) {
    const scripts = (pkg as PackageJson).scripts as Record<string, string>
    for (const task of ['check', 'lint'] as const) {
      if (scripts[task] === undefined) continue
      const steps = parseTask(scripts[task]).command.split(' && ')
      const turboStep = steps.find(step => step.startsWith('turbo run ')) ?? ''
      const missing = wantedTasks(task, scripts).filter(name => !turboStep.split(' ').includes(name))
      const rewrite = (current: unknown) => taskScript(task, withTurbo(String(current), missing, task), parseTask(String(current)).hint)
      if (missing.length > 0) report({ data: { expected: rewrite(scripts[task]), missing: missing.join(' '), task }, fix: fixer => fixer.json('package.json').update(['scripts', task], rewrite), messageId: 'missing' })
      if (task === 'check' && turboStep !== '' && !turboStep.split(' ').includes(quietLogs)) report({ data: { task }, fix: fixer => fixer.json('package.json').update(['scripts', task], rewrite), messageId: 'logs' })
      if (parseTask(String(scripts['lint:repo'])).command === 'repo-check' && steps.includes('repo-check'))
        report({
          data: { task },
          fix: fixer =>
            fixer.json('package.json').update(['scripts', task], current =>
              taskScript(
                task,
                parseTask(String(current))
                  .command.split(' && ')
                  .filter(step => step !== 'repo-check')
                  .join(' && '),
                parseTask(String(current)).hint,
              ),
            ),
          messageId: 'repoCheck',
        })
    }
  },
  meta: {
    fixable: true,
    id: 'scripts-check-turbo',
    messages: {
      logs: 'script "check" should only show the errors, like "check": "turbo run --output-logs=errors-only ..."',
      missing: 'script "{{task}}" does not go through "turbo run" for: {{missing}}, like "{{task}}": "{{expected}}"',
      repoCheck: 'script "{{task}}" runs repo-check itself, delete that step: lint:repo runs it after the build',
    },
    severity: 'warning',
  },
})

export const scriptsLintTasksListed = defineRule({
  appliesTo: ({ pkg }) => pkg?.scripts !== undefined,
  check({ pkg, report }) {
    const scripts = (pkg as PackageJson).scripts as Record<string, string>
    const lintNames = Object.keys(scripts).filter(name => name.startsWith('lint:') && !name.endsWith(':fix'))
    for (const task of ['check', 'lint'] as const) {
      const turboStep = parseTask(scripts[task] ?? '')
        .command.split(' && ')
        .find(step => step.startsWith('turbo run '))
      if (turboStep === undefined) continue
      const missing = lintNames.filter(name => !turboStep.split(' ').includes(name))
      const rewrite = (current: unknown) => taskScript(task, withTurbo(String(current), missing, task), parseTask(String(current)).hint)
      if (missing.length > 0) report({ data: { expected: rewrite(scripts[task]), missing: missing.join(' '), task }, fix: fixer => fixer.json('package.json').update(['scripts', task], rewrite), messageId: 'missing' })
    }
  },
  meta: {
    fixable: true,
    id: 'scripts-lint-tasks-listed',
    messages: { missing: 'script "{{task}}" does not run {{missing}}, every lint:* task runs in both lint and check, like "{{task}}": "{{expected}}"' },
    severity: 'warning',
  },
})

/** The build tools we know how to name, by the start of their command */
const buildNames: readonly (readonly [RegExp, string])[] = [
  [/^tsc\b/u, 'build:tsc'],
  [/^tsdown\b/u, 'build:tsdown'],
  [/^vite build\b/u, 'build:vite'],
]

/**
 * Split a build command into one `build:*` task per step, when every step is a tool we know
 * @param command the command of the `build` script
 * @returns the task names with their command, undefined when a step is unknown
 * @example buildPlan('tsc -b && vite build') // [['build:tsc', 'tsc -b'], ['build:vite', 'vite build']]
 */
function buildPlan(command: string) {
  const steps = command.split(' && ').map(step => ({ name: buildNames.find(([pattern]) => pattern.test(step))?.[1], step }))
  return steps.every(({ name }) => name !== undefined) ? steps.map(({ name, step }) => [String(name), step] as const) : undefined
}

export const scriptsBuildTasks = defineRule({
  appliesTo: ({ pkg }) => pkg?.scripts?.build !== undefined && !parseTask(pkg.scripts.build).command.startsWith('turbo run '),
  check({ pkg, report }) {
    const { command } = parseTask(String((pkg as PackageJson).scripts?.build))
    const plan = buildPlan(command)
    const example = (plan ?? [['build:app', command]]).map(([name, step]) => `"${name}": "${step}"`).join(', ')
    report({
      data: { command, example, names: (plan ?? [['build:app']]).map(([name]) => name).join(' ') },
      ...(plan !== undefined && {
        fix: fixer => [
          ...plan.map(([name, step]) => fixer.json('package.json').set(['scripts', name], taskScript(name, step))),
          fixer.json('package.json').update(['scripts', 'build'], current => taskScript('build', `turbo run ${plan.map(([name]) => name).join(' ')}`, parseTask(String(current)).hint)),
        ],
      }),
      messageId: 'found',
    })
  },
  meta: {
    fixable: true,
    id: 'scripts-build-tasks',
    messages: { found: 'script "build" runs "{{command}}" itself, split it in build:* tasks so turbo can run lint:repo after them, like "build": "turbo run {{names}}", {{example}}' },
    severity: 'warning',
  },
})

export const scriptsNoDuplicateLint = defineRule({
  appliesTo: ({ pkg }) => pkg?.scripts !== undefined,
  check({ pkg, report }) {
    const scripts = (pkg as PackageJson).scripts as Record<string, string>
    for (const [name, script] of Object.entries(scripts)) {
      const instead = duplicateOf(name, script)
      if (instead === undefined) continue
      const callers = Object.keys(scripts).filter(other => other !== name && dropReferences(String(scripts[other]), name) !== scripts[other])
      report({
        data: { instead, name },
        fix: fixer => [fixer.json('package.json').remove(['scripts', name]), ...callers.map(other => fixer.json('package.json').update(['scripts', other], current => dropReferences(String(current), name)))],
        messageId: 'found',
      })
    }
  },
  meta: { fixable: true, id: 'scripts-no-duplicate-lint', messages: { found: 'script "{{name}}" runs a tool that {{instead}} already runs, delete it' }, severity: 'warning' },
})

export const scriptsBun = defineRule({
  appliesTo: ({ pkg }) => scriptsMatching(pkg, /\bbun\b/u).length > 0,
  async check({ files, pkg, report }) {
    if (!hasDependency(pkg, 'bun')) report({ fix: fixer => fixer.json('package.json').set(['devDependencies', 'bun'], bunRange), installs: ['bun'], messageId: 'dependency' })
    const workspace = await files.readText('pnpm-workspace.yaml')
    if (workspace === undefined || !/^\s+bun:\s*true/mu.test(workspace)) report({ fix: fixer => fixer.text('pnpm-workspace.yaml', allowBun), messageId: 'allowBuilds' })
  },
  meta: {
    fixable: true,
    id: 'scripts-bun',
    messages: { allowBuilds: 'a script runs bun, pnpm-workspace.yaml needs "allowBuilds: bun: true" so its install script runs', dependency: 'a script runs bun, but bun is not a dependency, like "devDependencies": { "bun": "^1.3" }' },
    severity: 'warning',
  },
})
