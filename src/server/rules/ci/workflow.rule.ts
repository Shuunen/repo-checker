import type { Context } from '../../engine/context.ts'
import { forbidInFile, requireInFile } from '../../engine/file-rules.ts'

const files = ['.github/workflows/ci.yml']

/**
 * Tell if Bun is the project's package manager, its workflow then sets up bun instead of pnpm. The packageManager field wins, a project can depend on bun and still install with pnpm
 * @param context the project context
 * @param context.flags the project flags
 * @param context.pkg the package.json
 * @returns true when Bun installs the dependencies
 */
function usesBun({ flags, pkg }: Readonly<Context>) {
  const manager = pkg?.packageManager
  return manager === undefined ? flags.isUsingBun === true : manager.startsWith('bun@')
}

/**
 * Tell if the workflow must pin the pnpm version itself: a pnpm project without packageManager, pnpm/action-setup reads it otherwise
 * @param context the project context
 * @returns true when the version must be in the workflow
 */
function pinsPnpmInWorkflow(context: Readonly<Context>) {
  return !usesBun(context) && context.pkg?.packageManager === undefined
}

export const workflowRules = [
  requireInFile({ files, id: 'ci-checkout-step', message: '{{file}} has no checkout step, like uses: actions/checkout@v7', pattern: /actions\/checkout/u, severity: 'error' }),
  requireInFile({ files, id: 'ci-checkout-version', message: '{{file}} uses an old checkout action, use actions/checkout@v7', onlyIf: /actions\/checkout/u, pattern: /uses: actions\/checkout@v(?:[5-9]|\d{2,})\b/u, severity: 'error' }),
  requireInFile({ files, id: 'ci-node-step', message: '{{file}} has no setup-node step, like uses: actions/setup-node@v6', pattern: /actions\/setup-node/u, severity: 'error' }),
  requireInFile({ files, id: 'ci-node-version', message: '{{file}} does not run a recent Node version, like node-version: 24', pattern: /node: \[24\]|node-version: 24/u, severity: 'warning' }),
  forbidInFile({ files, id: 'ci-no-main-branch', message: '{{file}} references a main branch, use master', pattern: /- main\b/u, severity: 'warning' }),
  requireInFile({ files, id: 'ci-pnpm-step', message: '{{file}} has no pnpm setup step, like uses: pnpm/action-setup@v5', pattern: /pnpm\/action-setup/u, severity: 'warning', when: context => !usesBun(context) }),
  requireInFile({
    files,
    fix: text => text.replace(/(?<step>uses: pnpm\/action-setup@v[\d.]+\n +with:\n +version:) \d+/u, '$<step> 12'),
    id: 'ci-pnpm-version',
    message: '{{file}} does not pin pnpm 12, like version: 12 under pnpm/action-setup, or declare "packageManager": "pnpm@12..." in package.json',
    onlyIf: /pnpm\/action-setup/u,
    pattern: /uses: pnpm\/action-setup@v[\d.]+\n +with:\n +version: 12\b/u,
    severity: 'warning',
    when: pinsPnpmInWorkflow,
  }),
  forbidInFile({ files, fix: text => text.replaceAll(' --no-frozen-lockfile', ''), id: 'ci-no-frozen-lockfile-flag', message: '{{file}} installs with --no-frozen-lockfile, the CI must use the committed lock file', pattern: /--no-frozen-lockfile/u, severity: 'error' }),
  forbidInFile({ files, id: 'ci-bun-step', message: '{{file}} still uses pnpm, the project uses Bun, use oven-sh/setup-bun and bun run check', pattern: /pnpm/u, severity: 'warning', when: usesBun }),
  requireInFile({
    files,
    fix: text => text.replace(/(?<=uses: oven-sh\/setup-bun@)\w+/u, 'v2'),
    id: 'ci-bun-version',
    message: '{{file}} uses an old setup-bun action, use oven-sh/setup-bun@v2',
    onlyIf: /oven-sh\/setup-bun/u,
    pattern: /uses: oven-sh\/setup-bun@v[2-9]\b/u,
    severity: 'warning',
    when: usesBun,
  }),
]
