import { defineRule } from '../../engine/define-rule.ts'
import { forbidFile } from '../../engine/file-rules.ts'

/** The lockfiles, by package manager, the old and the new bun lockfile are the same manager */
const lockfiles: Readonly<Record<string, string>> = { 'bun.lock': 'bun', 'bun.lockb': 'bun', 'package-lock.json': 'npm', 'pnpm-lock.yaml': 'pnpm', 'yarn.lock': 'yarn' }

export const multipleLockfiles = defineRule({
  async check({ files, report }) {
    const names = Object.keys(lockfiles)
    const texts = await Promise.all(names.map(name => files.readText(name)))
    const found = names.filter((_name, index) => texts[index] !== undefined)
    const managers = new Set(found.map(name => lockfiles[name]))
    if (managers.size > 1) report({ data: { files: found.join(', ') }, messageId: 'found' })
  },
  meta: { id: 'multiple-lockfiles', messages: { found: 'more than one package manager left a lockfile: {{files}}, keep the one of the "packageManager" field and delete the others' }, severity: 'error' },
})

export const oldLockfileFormat = forbidFile({ files: ['bun.lockb', 'shrinkwrap.yaml'], id: 'old-lockfile-format', message: '{{file}} is an obsolete lockfile format, install again with a recent package manager to get the current one, like bun.lock', severity: 'warning' })
