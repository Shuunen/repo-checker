import { defineRule } from '../../engine/define-rule.ts'
import { forbidInFile, requireFile, requireInFile } from '../../engine/file-rules.ts'

export const avoidMainBranch = defineRule({
  check({ flags, report }) {
    if (flags.hasMainBranch === true) report({ messageId: 'found' })
  },
  meta: { id: 'avoid-main-branch', messages: { found: 'the repo has a "main" branch, use "master" instead and clean the old branch with git bclean' }, severity: 'warning' },
})

export const gitignoreRules = [
  requireFile({ files: ['.gitignore'], id: 'gitignore-exists', message: 'no {{file}} file', severity: 'error' }),
  requireInFile({ files: ['.gitignore'], id: 'gitignore-node-modules', message: '{{file}} does not list node_modules', pattern: /node_modules/u, severity: 'warning' }),
  forbidInFile({ files: ['.gitignore'], id: 'gitignore-keeps-pnpm-lock', message: '{{file}} excludes pnpm-lock.yaml, the lock file must be committed', pattern: /pnpm-lock\.yaml/u, severity: 'warning' }),
]
