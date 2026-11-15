import type { Context } from '../../engine/context.ts'
import { forbidInFile, requireInFile } from '../../engine/file-rules.ts'
import { hasDependency } from '../../engine/package-json.ts'
import { appendRunStep, moveStepBefore, setStepOption } from './workflow-steps.utils.ts'
import { usesBun } from './workflow.rule.ts'

const files = ['.github/workflows/ci.yml']

/** Both the pnpm setup and the node setup are in the workflow */
const hasPnpmAndNode = /(?=[\s\S]*actions\/setup-node)(?=[\s\S]*pnpm\/action-setup)/u

/**
 * Tell if the project runs Playwright tests
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it depends on `@playwright/test`
 */
function usesPlaywright({ pkg }: Readonly<Context>) {
  return hasDependency(pkg, '@playwright/test')
}

/**
 * Build the pattern of the step that runs a command
 * @param command the start of the command, like `pnpm run check`
 * @returns the pattern, which matches from the start of the step
 */
function stepRunning(command: string) {
  return new RegExp(String.raw`^(?<indent>[ \t]*)- (?:name:[^\n]*\n[ \t]+)?run: ${command}`, 'mu')
}

/**
 * Add a step before the first step that runs one of the commands, at the end of the workflow when none does
 * @param text the workflow text
 * @param step the lines of the step, without indentation
 * @param commands the start of the commands to go before, tried in order
 * @returns the new text
 */
function addStepBefore(text: string, step: readonly string[], commands: readonly string[]) {
  const anchor = commands.map(command => stepRunning(command).exec(text)).find(match => match !== null)
  const indent = anchor?.groups?.indent ?? /^(?<indent>[ \t]*)- /mu.exec(text.slice(text.indexOf('steps:')))?.groups?.indent ?? '      '
  const block = step.map((line, index) => `${indent}${index === 0 ? '- ' : '  '}${line}`).join('\n')
  const position = anchor?.index
  if (position === undefined) return `${text.trimEnd()}\n\n${block}\n`
  return `${text.slice(0, position)}${block}\n\n${text.slice(position)}`
}

export const workflowQualityRules = [
  requireInFile({
    files,
    fix: (text, context) => {
      const tool = usesBun(context) ? 'bun' : 'pnpm'
      return /\brun:\s*(?:pnpm|bun) check(?![\w:-])/u.test(text) ? text.replace(/(?<=\brun:\s*)(?<tool>pnpm|bun) check(?![\w:-])/u, '$<tool> run check') : appendRunStep(text, 'Run check 👀', `${tool} run check`)
    },
    id: 'ci-runs-check',
    message: '{{file}} does not run the check script, like run: pnpm run check',
    pattern: context => (usesBun(context) ? /\brun:\s*bun run check(?![\w:-])/u : /\brun:\s*pnpm run check(?![\w:-])/u),
    severity: 'warning',
  }),
  requireInFile({
    files,
    fix: text => (/^on:[ \t]*\[/mu.test(text) ? text.replace(/^on:[ \t]*\[/mu, 'on: [push, ') : text.replace(/^on:[ \t]*(?:\S.*)?$/mu, match => (match.trimEnd() === 'on:' ? 'on:\n  push:' : 'on: push'))),
    id: 'ci-on-push',
    message: '{{file}} does not run on every push, like on: push',
    pattern: /^on:(?:[^\n]*\bpush\b|[ \t]*\n(?:[ \t]+[^\n]*\n|[ \t]*\n)*?[ \t]+push\b)/mu,
    severity: 'warning',
  }),
  forbidInFile({
    files,
    fix: text => text.replaceAll(/\b(?<tool>pnpm|bun) install(?! --frozen-lockfile)/gu, '$<tool> install --frozen-lockfile'),
    id: 'ci-frozen-lockfile',
    message: '{{file}} installs without --frozen-lockfile, the CI must install exactly what the lock file says',
    pattern: /\b(?:pnpm|bun) install(?! --frozen-lockfile)/u,
    severity: 'warning',
  }),
  requireInFile({
    files,
    fix: text => setStepOption(moveStepBefore(text, 'pnpm/action-setup', 'actions/setup-node'), 'actions/setup-node', { key: 'cache', value: 'pnpm' }),
    id: 'ci-node-pnpm-cache',
    message: '{{file}} does not cache the pnpm store, like cache: pnpm under actions/setup-node, after the pnpm/action-setup step',
    onlyIf: hasPnpmAndNode,
    pattern: /uses: pnpm\/action-setup[\s\S]*uses: actions\/setup-node[\s\S]*cache:\s*['"]?pnpm['"]?/u,
    severity: 'info',
    when: context => !usesBun(context),
  }),
  requireInFile({
    files,
    fix: (text, context) => addStepBefore(text, ['name: Install Playwright', `run: ${usesBun(context) ? 'bunx' : 'pnpm exec'} playwright install --with-deps chromium-headless-shell`], ['(?:pnpm|bun) (?:run )?check']),
    id: 'ci-playwright-install',
    message: '{{file}} does not install the Playwright browsers, like run: pnpm exec playwright install --with-deps chromium-headless-shell',
    pattern: /playwright install/u,
    severity: 'warning',
    when: usesPlaywright,
  }),
  requireInFile({
    files,
    fix: (text, context) =>
      addStepBefore(
        text,
        ['name: Cache Playwright browsers', 'uses: actions/cache@v6', 'id: playwright-cache', 'with:', '  path: ~/.cache/ms-playwright', `  key: playwright-\${{ hashFiles('${usesBun(context) ? 'bun.lock' : 'pnpm-lock.yaml'}') }}`],
        ['(?:pnpm exec|bunx) playwright install', '(?:pnpm|bun) (?:run )?check'],
      ),
    id: 'ci-playwright-cache',
    message: '{{file}} does not cache the Playwright browsers, like actions/cache on ~/.cache/ms-playwright keyed on the lock file',
    pattern: /~\/\.cache\/ms-playwright/u,
    severity: 'info',
    when: usesPlaywright,
  }),
]
