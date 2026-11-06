import { testRule } from '../../engine/rule-tester.ts'
import { multipleLockfiles, oldLockfileFormat } from './lockfiles.rule.ts'

testRule(multipleLockfiles, {
  invalid: [
    { errors: ['found'], files: { 'package-lock.json': '{}', 'pnpm-lock.yaml': '' }, name: 'npm and pnpm' },
    { errors: ['found'], files: { 'bun.lock': '', 'yarn.lock': '' }, name: 'bun and yarn' },
  ],
  valid: [{ files: { 'pnpm-lock.yaml': '' }, name: 'one lockfile' }, { files: { 'bun.lock': '', 'bun.lockb': '' }, name: 'the two bun formats are one package manager, left to old-lockfile-format' }, { name: 'no lockfile' }],
})

testRule(oldLockfileFormat, {
  invalid: [
    { errors: ['found'], files: { 'bun.lockb': '' }, name: 'a binary bun lockfile' },
    { errors: ['found'], files: { 'shrinkwrap.yaml': '' }, name: 'a pnpm shrinkwrap' },
  ],
  valid: [{ files: { 'bun.lock': '' }, name: 'the text bun lockfile' }, { name: 'no lockfile' }],
})
