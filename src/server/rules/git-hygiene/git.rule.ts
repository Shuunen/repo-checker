import { defineRule } from '../../engine/define-rule.ts'
import { forbidInFile, requireFile, requireInFile } from '../../engine/file-rules.ts'
import { addIgnoreLine, removeIgnoreLines } from '../../engine/gitignore.ts'

export const avoidMainBranch = defineRule({
  check({ flags, report }) {
    if (flags.hasMainBranch === true) report({ messageId: 'found' })
  },
  meta: { id: 'avoid-main-branch', messages: { found: 'the repo has a "main" branch, use "master" instead and clean the old branch with git bclean' }, severity: 'warning' },
})

/** A .gitignore line that excludes the pnpm lock file, a negation or a comment is not one */
const pnpmLockLine = /^\s*\/?(?:\*\*\/)?pnpm-lock\.yaml\s*$/u

/** A .gitignore line that excludes the .github folder */
const githubLine = /^\s*\/?\.github(?:\/(?:\*\*?)?)?\s*$/u

export const gitignoreRules = [
  requireFile({ content: 'node_modules\n', files: ['.gitignore'], id: 'gitignore-exists', message: 'no {{file}} file', severity: 'error' }),
  requireInFile({ files: ['.gitignore'], fix: text => addIgnoreLine(text, 'node_modules'), id: 'gitignore-node-modules', message: '{{file}} does not list node_modules', pattern: /node_modules/u, severity: 'warning', when: ({ pkg }) => pkg !== undefined }),
  forbidInFile({ files: ['.gitignore'], fix: text => removeIgnoreLines(text, pnpmLockLine), id: 'gitignore-keeps-pnpm-lock', message: '{{file}} excludes pnpm-lock.yaml, the lock file must be committed', pattern: new RegExp(pnpmLockLine.source, 'mu'), severity: 'warning' }),
  forbidInFile({ files: ['.gitignore'], fix: text => removeIgnoreLines(text, githubLine), id: 'gitignore-keeps-github', message: '{{file}} excludes the .github folder, the workflows and the repo config must be committed', pattern: new RegExp(githubLine.source, 'mu'), severity: 'warning' }),
]
